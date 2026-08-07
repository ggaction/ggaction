import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";

import { createCanvas as createNativeCanvas } from "@napi-rs/canvas";
import { render } from "ggaction";
import { renderToPDF } from "ggaction/pdf";
import { renderToPNG } from "ggaction/png";
import { renderToSVG } from "ggaction/svg";
import { ChartProgram as RuntimeChartProgram } from "../../src/ChartProgram.js";
import {
  resolveConcreteGraphicBounds,
  unionConcreteGraphicBounds
} from "../../src/grammar/schemas/graphicBounds.js";

const allowedImports = new Set([
  "ggaction",
  "ggaction/basic",
  "ggaction/pdf",
  "ggaction/png",
  "ggaction/svg"
]);
const forbiddenSourcePatterns = [
  [/\b(?:process|globalThis|require|eval|Function|fetch|XMLHttpRequest|WebSocket|Deno|Bun)\b/u, "forbidden global"],
  [/\bimport\s*\(/u, "dynamic import"],
  [/\b(?:while|for)\s*\(\s*;\s*;/u, "unbounded loop"]
];

function flattenTrace(node, output = []) {
  for (const child of node?.children ?? []) {
    output.push(child);
    flattenTrace(child, output);
  }
  return output;
}

function collectPrograms(program, output = []) {
  output.push(program);
  for (const child of Object.values(program?.children ?? {})) collectPrograms(child, output);
  return output;
}

function everyLayer(programs) {
  return programs.flatMap(program => program.semanticSpec?.layers ?? []);
}

function everyDataset(programs) {
  return programs.flatMap(program => program.semanticSpec?.datasets ?? []);
}

function everyCoordinate(programs) {
  return programs.flatMap(program => program.semanticSpec?.coordinates ?? []);
}

function everyGraphic(programs) {
  return programs.flatMap(program => Object.entries(program.graphicSpec?.objects ?? {})
    .map(([id, graphic]) => ({ id, ...graphic })));
}

function deepValues(value, output = []) {
  if (Array.isArray(value)) {
    for (const item of value) deepValues(item, output);
  } else if (value !== null && typeof value === "object") {
    for (const [key, item] of Object.entries(value)) {
      output.push({ key, value: item });
      deepValues(item, output);
    }
  }
  return output;
}

function sameValue(left, right) {
  if (typeof left === "string" && typeof right === "string") {
    return left.toLowerCase() === right.toLowerCase();
  }
  return left === right;
}

function hasDeepPair(values, key, expected) {
  return values.some(entry => entry.key.toLowerCase() === key.toLowerCase() && sameValue(entry.value, expected));
}

function hasEncoding(layers, channel, field, temporal = false) {
  const aliases = channel === "group" ? ["group", "color", "shape", "xOffset", "yOffset"] : [channel];
  return layers.some(layer => aliases.some(alias => {
    const encoding = layer.encoding?.[alias];
    return encoding?.field === field && (!temporal || encoding.fieldType === "temporal");
  }));
}

function hasTraceEncoding(nodes, channel, field, temporal = false) {
  return nodes.some(node => {
    const encoding = node.args?.[channel];
    const directEncodingAction = node.op.toLowerCase() === `encode${channel.toLowerCase()}` && node.args?.field === field;
    if (!directEncodingAction && encoding !== field && encoding?.field !== field) return false;
    return !temporal || encoding?.fieldType === "temporal" || encoding?.type === "temporal" || node.args?.fieldType === "temporal";
  });
}

function hasGraphicInk(graphics, types) {
  return graphics.some(graphic => types.includes(graphic.type) && (
    (Number.isInteger(graphic.length) && graphic.length > 0) ||
    (Array.isArray(graphic.items) && graphic.items.length > 0) ||
    Object.keys(graphic.properties ?? {}).length > 0
  ));
}

function legendEntries(programs) {
  return programs.flatMap(program => Object.values(program.semanticSpec?.guides?.legend ?? {}));
}

function guideObjects(graphics, pattern) {
  return graphics.filter(graphic => pattern.test(graphic.id));
}

function alignedOn(objects, property) {
  const values = objects.map(object => object.properties?.[property]).filter(Number.isFinite);
  return values.length >= 2 && new Set(values.map(value => Math.round(value))).size === 1;
}

function closeEnough(values, tolerance = 0.5) {
  return values.length >= 2 && Math.max(...values) - Math.min(...values) <= tolerance;
}

function primitiveCenterY(type, properties = {}) {
  if (type === "rect") return Number.isFinite(properties.y) && Number.isFinite(properties.height)
    ? properties.y + properties.height / 2
    : undefined;
  if (type === "line") return Number.isFinite(properties.y1) && Number.isFinite(properties.y2)
    ? (properties.y1 + properties.y2) / 2
    : undefined;
  return properties.y;
}

function primitiveRight(type, properties = {}) {
  if (type === "rect") return Number.isFinite(properties.x) && Number.isFinite(properties.width)
    ? properties.x + properties.width
    : undefined;
  if (type === "circle") return Number.isFinite(properties.x) && Number.isFinite(properties.radius)
    ? properties.x + properties.radius
    : undefined;
  if (type === "line") return Number.isFinite(properties.x1) && Number.isFinite(properties.x2)
    ? Math.max(properties.x1, properties.x2)
    : undefined;
  return properties.x;
}

function legendBlocks(programs) {
  return programs.flatMap(program => Object.keys(program.semanticSpec?.guides?.legend ?? {}).flatMap(channel => {
    const title = `${channel}LegendTitle`;
    const symbols = `${channel}LegendSymbols`;
    const labels = `${channel}LegendLabels`;
    const objects = program.graphicSpec?.objects ?? {};
    if (![title, symbols, labels].every(id => objects[id] !== undefined)) return [];
    const bounds = unionConcreteGraphicBounds(program.graphicSpec, [title, symbols, labels]);
    if (bounds === undefined) return [];
    return [{ program, channel, title: objects[title], symbols: objects[symbols], labels: objects[labels], bounds }];
  }));
}

function blockLineValues(block) {
  const titleY = primitiveCenterY(block.title.type, block.title.properties);
  const symbolY = (block.symbols.items ?? []).map(item =>
    primitiveCenterY(item.type ?? block.symbols.type, item.properties)
  );
  const labelY = (block.labels.items ?? []).map(item =>
    primitiveCenterY(item.type ?? block.labels.type, item.properties)
  );
  return { titleY, symbolY, labelY };
}

function legendLabelGaps(blocks) {
  return blocks.flatMap(block => {
    const symbols = block.symbols.items ?? [];
    const labels = block.labels.items ?? [];
    if (symbols.length === 0 || symbols.length !== labels.length) return [];
    return symbols.map((item, index) => {
      const right = primitiveRight(item.type ?? block.symbols.type, item.properties);
      const x = labels[index].properties?.x;
      return Number.isFinite(right) && Number.isFinite(x) ? x - right : Number.NaN;
    });
  });
}

function nestedCanvasGap(program, expected) {
  if (program.compositionSpec?.direction !== "horizontal") return false;
  const canvases = Object.values(program.graphicSpec?.objects ?? {})
    .filter(graphic => graphic.type === "canvas" && Number.isFinite(graphic.properties?.x))
    .map(graphic => graphic.properties)
    .sort((left, right) => left.x - right.x);
  if (canvases.length !== program.compositionSpec.children?.length || canvases.length < 2) return false;
  return canvases.slice(1).every((canvas, index) =>
    Math.abs(canvas.x - (canvases[index].x + canvases[index].width) - expected) <= 0.5
  );
}

function graphicHasInk(graphic) {
  return graphic !== undefined && (
    (Array.isArray(graphic.items) && graphic.items.length > 0) ||
    (Number.isInteger(graphic.length) && graphic.length > 0) ||
    (graphic.properties !== undefined && Object.keys(graphic.properties).length > 0)
  );
}

function programHasLayerInk(program) {
  return (program.semanticSpec?.layers ?? []).some(layer => graphicHasInk(program.graphicSpec?.objects?.[layer.id]));
}

function compositionChildrenHaveInk(programs) {
  const compositions = programs.filter(program => (program.compositionSpec?.children?.length ?? 0) > 1);
  return compositions.length > 0 && compositions.every(program =>
    program.compositionSpec.children.every(id => program.children?.[id] && programHasLayerInk(program.children[id]))
  );
}

function boxPlotConfigs(programs) {
  return programs.flatMap(program => Object.values(program.materializationConfigs?.marks ?? {})
    .map(config => config?.boxPlot)
    .filter(Boolean)
    .map(config => ({ program, config })));
}

function tickCountMatchesData(programs) {
  return programs.some(program => (program.semanticSpec?.layers ?? []).filter(layer => layer.mark?.type === "tick")
    .some(layer => {
      const values = (program.semanticSpec?.datasets ?? []).find(dataset => dataset.id === layer.data)?.values;
      const graphic = program.graphicSpec?.objects?.[layer.id];
      return Array.isArray(values) && values.length > 0 && graphic?.items?.length === values.length;
    }));
}

function isBlack(value) {
  return ["black", "#000", "#000000", "#111111"].includes(String(value).toLowerCase());
}

function isOrange(value) {
  const normalized = String(value).toLowerCase();
  if (["orange", "darkorange"].includes(normalized)) return true;
  const match = normalized.match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/u);
  if (!match) return false;
  const hex = match[1].length === 3
    ? [...match[1]].map(character => character.repeat(2)).join("")
    : match[1];
  const [red, green, blue] = [0, 2, 4].map(index => Number.parseInt(hex.slice(index, index + 2), 16) / 255);
  const maximum = Math.max(red, green, blue);
  const minimum = Math.min(red, green, blue);
  const delta = maximum - minimum;
  if (delta === 0 || maximum < 0.4) return false;
  let hue = maximum === red
    ? 60 * (((green - blue) / delta) % 6)
    : maximum === green
      ? 60 * ((blue - red) / delta + 2)
      : 60 * ((red - green) / delta + 4);
  if (hue < 0) hue += 360;
  return hue >= 15 && hue <= 45;
}

function regressionLinePrimitives(programs) {
  return programs.flatMap(program => Object.entries(program.graphicSpec?.objects ?? {}).flatMap(([id, graphic]) => {
    if (!/RegressionLines?$/iu.test(id)) return [];
    return graphic.items === undefined
      ? [{ type: graphic.type, properties: graphic.properties }]
      : graphic.items.map(item => ({ type: item.type ?? graphic.type, properties: item.properties }));
  }));
}

function textPrimitives(programs) {
  return programs.flatMap(program => Object.values(program.graphicSpec?.objects ?? {}).flatMap(graphic => {
    if (graphic.type !== "text") return [];
    return graphic.items === undefined
      ? [{ type: "text", properties: graphic.properties }]
      : graphic.items.map(item => ({ type: item.type ?? "text", properties: item.properties }));
  }));
}

function segmentDistance(point, start, end) {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  if (dx === 0 && dy === 0) return Math.hypot(point.x - start.x, point.y - start.y);
  const t = Math.max(0, Math.min(1, ((point.x - start.x) * dx + (point.y - start.y) * dy) / (dx ** 2 + dy ** 2)));
  return Math.hypot(point.x - (start.x + t * dx), point.y - (start.y + t * dy));
}

function primitiveSegments(primitive) {
  const properties = primitive.properties ?? {};
  if (primitive.type === "line" && [properties.x1, properties.y1, properties.x2, properties.y2].every(Number.isFinite)) {
    return [[{ x: properties.x1, y: properties.y1 }, { x: properties.x2, y: properties.y2 }]];
  }
  if (primitive.type !== "path" || !Array.isArray(properties.commands)) return [];
  const points = properties.commands.flatMap(command =>
    ["M", "L", "C"].includes(command.op) && Number.isFinite(command.x) && Number.isFinite(command.y)
      ? [{ x: command.x, y: command.y }]
      : []
  );
  return points.slice(1).map((point, index) => [points[index], point]);
}

function rSquaredAnnotationNearLine(programs) {
  const segments = regressionLinePrimitives(programs).flatMap(primitiveSegments);
  if (segments.length === 0) return false;
  return textPrimitives(programs).some(({ properties }) => {
    if (!/\bR(?:²|\^2|2)\s*=/iu.test(String(properties?.text)) || !isBlack(properties?.fill)) return false;
    if (![properties?.x, properties?.y].every(Number.isFinite)) return false;
    return Math.min(...segments.map(([start, end]) => segmentDistance(properties, start, end))) <= 48;
  });
}

function traceHas(nodes, op, pairs = {}) {
  return nodes.some(node => node.op === op && Object.entries(pairs)
    .every(([key, value]) => hasDeepPair(deepValues(node.args), key, value)));
}

function semanticMark(layers, type) {
  const normalizedType = type.replace(/:(?:vertical|horizontal)$/u, "");
  const aliases = {
    "regression-line": "line",
    "error-band": "area",
    "error-bar": "rule",
    "gradient-plot": "rect",
    "parallel-coordinates": "line",
    "box-plot": "rect",
    density: "area",
    violin: "area",
    histogram: "bar",
    bin2d: "rect",
    horizon: "area"
  };
  return layers.some(layer => layer.mark?.type === (aliases[normalizedType] ?? normalizedType));
}

function semanticAction(nodes, type) {
  const actions = {
    "box-plot": "createBoxPlot",
    "error-band": "createErrorBand",
    "error-bar": "createErrorBar",
    "gradient-plot": "createGradientPlot",
    histogram: "createHistogram",
    horizon: "encodeHorizon",
    "parallel-coordinates": "createParallelCoordinates",
    violin: "createViolinPlot"
  };
  return actions[type] !== undefined && nodes.some(node => node.op === actions[type]);
}

function validationPassed(id, context) {
  const { programs, layers, datasets, coordinates, graphics, nodes, deep, renderEvidence } = context;
  if (id === "program:builds") return true;
  if (id === "program:immutable-across-renderers") return renderEvidence.immutable === true;
  if (id === "renderer:canvas:non-empty") return renderEvidence.canvas === true;
  if (id === "renderer:svg:valid") return renderEvidence.svg === true;
  if (id === "renderer:png:pixel-ratio:2") return renderEvidence.png === true;
  if (id === "renderer:pdf:one-page-vector") return renderEvidence.pdf === true;
  if (id === "renderer:logical-dimensions-equal") return renderEvidence.logicalDimensionsEqual === true;

  if (id.startsWith("semantic:")) {
    const type = id.slice("semantic:".length);
    return semanticMark(layers, type) || semanticAction(nodes, type);
  }
  if (id.startsWith("encoding:")) {
    const [, channel, field, modifier] = id.split(":");
    if (field === "constant-baseline") {
      return layers.some(layer => {
        const encoding = layer.encoding?.[channel];
        if (encoding?.value !== undefined || encoding?.datum !== undefined) return true;
        if (typeof encoding?.field !== "string") return false;
        const dataset = datasets.find(candidate => candidate.id === layer.data);
        const values = (dataset?.values ?? []).map(row => row[encoding.field]).filter(value => value !== undefined);
        return values.length > 0 && new Set(values).size === 1;
      });
    }
    if (field === "derived-year") {
      return hasEncoding(layers, channel, "year", modifier === "temporal") &&
        nodes.some(node => node.op === "createTimeUnitData" && node.args?.unit === "year");
    }
    if (["category", "profile"].includes(channel)) {
      const create = nodes.find(node => node.op === "createGradientPlot");
      const roles = [create?.args?.x, create?.args?.y].filter(Boolean);
      const expectedTypes = channel === "category" ? ["nominal", "ordinal"] : ["quantitative"];
      if (roles.some(role => role?.field === field && expectedTypes.includes(role?.fieldType ?? "quantitative"))) return true;
    }
    return hasEncoding(layers, channel, field, modifier === "temporal") ||
      hasTraceEncoding(nodes, channel, field, modifier === "temporal");
  }
  if (id === "coordinate:polar") return coordinates.some(coordinate => coordinate.type === "polar");
  if (id === "guides:cartesian") return programs.some(program => {
    const axes = program.semanticSpec?.guides?.axis ?? {};
    return axes.x !== undefined && axes.y !== undefined;
  });
  if (id === "guides:polar") return coordinates.some(coordinate => coordinate.type === "polar") && nodes.some(node => node.op === "createGuides");
  if (id === "axis:y:absent") return programs.every(program => program.semanticSpec?.guides?.axis?.y === undefined);
  if (id === "axis:x:quantitative") return programs.some(program => {
    const axis = program.semanticSpec?.guides?.axis?.x;
    const scale = (program.semanticSpec?.scales ?? []).find(candidate => candidate.id === axis?.scale);
    return axis !== undefined && ["linear", "log", "pow", "sqrt", "symlog"].includes(scale?.type);
  });
  if (id === "legend:absent") return legendEntries(programs).length === 0;
  if (id === "legend:count:2") return legendEntries(programs).length === 2 && legendBlocks(programs).length === 2;
  if (id === "legend:color" || id === "legend:continuous-color") {
    return programs.some(program => program.semanticSpec?.guides?.legend?.color !== undefined) ||
      legendEntries(programs).some(legend => legend.channels?.includes("color"));
  }
  if (id === "legend:series") return legendEntries(programs).length > 0;
  if (id === "legend:position:top") return hasDeepPair(deep, "position", "top") || hasDeepPair(deep, "side", "top");
  if (id === "legend:order:left-to-right") {
    const blocks = legendBlocks(programs);
    return blocks.length >= 2 && blocks.slice(1).every((block, index) => block.bounds.left > blocks[index].bounds.right);
  }
  if (id === "legend:titles-aligned") {
    const values = legendBlocks(programs).map(block => blockLineValues(block).titleY).filter(Number.isFinite);
    return values.length >= 2 && closeEnough(values);
  }
  if (id === "legend:symbols-aligned") {
    const blocks = legendBlocks(programs);
    const values = blocks.flatMap(block => blockLineValues(block).symbolY).filter(Number.isFinite);
    return blocks.length >= 2 && values.length >= blocks.length && closeEnough(values);
  }
  if (id === "legend:label-gaps-aligned") {
    const blocks = legendBlocks(programs);
    const gaps = legendLabelGaps(blocks);
    return blocks.length >= 2 && gaps.length >= blocks.length && gaps.every(gap => Number.isFinite(gap) && gap >= 4) && closeEnough(gaps);
  }
  if (id === "legend:inter-block-gap") {
    const blocks = legendBlocks(programs).toSorted((left, right) => left.bounds.left - right.bounds.left);
    return blocks.length >= 2 && blocks.slice(1).every((block, index) => block.bounds.left - blocks[index].bounds.right >= 24);
  }
  if (id === "legend:plot-offset") {
    const blocks = legendBlocks(programs);
    if (blocks.length < 2) return false;
    return blocks.every(block => {
      const plot = resolveConcreteGraphicBounds(block.program.graphicSpec, "plot-main");
      const position = block.program.materializationConfigs?.guides?.legend?.[block.channel]?.position;
      if (plot === undefined) return false;
      if (position === "top") return plot.top - block.bounds.bottom >= 10;
      if (position === "bottom") return block.bounds.top - plot.bottom >= 10;
      if (position === "left") return plot.left - block.bounds.right >= 10;
      if (position === "right") return block.bounds.left - plot.right >= 10;
      return false;
    });
  }

  const inkTypes = {
    "graphic:plot-ink": ["circle", "rect", "line", "path", "text"],
    "graphic:multi-panel-ink": ["circle", "rect", "line", "path"],
    "graphic:path-ink": ["path", "line"],
    "graphic:area-ink": ["path"],
    "graphic:bar-ink": ["rect"],
    "graphic:box-ink": ["rect", "line"],
    "graphic:rect-ink": ["rect"],
    "graphic:gradient-ink": ["rect", "path"],
    "graphic:rule-ink": ["line", "path"],
    "graphic:text-ink": ["text"],
    "graphic:tick-ink": ["line", "path"]
  };
  if (id === "graphic:multi-panel-ink") return compositionChildrenHaveInk(programs);
  if (id === "graphic:tick-ink") return tickCountMatchesData(programs);
  if (id === "graphic:box-ink") return boxPlotConfigs(programs).some(({ program, config }) =>
    [config.whiskerId, config.medianId].every(target => graphicHasInk(program.graphicSpec?.objects?.[target])) &&
    graphicHasInk(program.graphicSpec?.objects?.[Object.keys(program.materializationConfigs?.marks ?? {})
      .find(id => program.materializationConfigs.marks[id]?.boxPlot === config)])
  );
  if (inkTypes[id]) return hasGraphicInk(graphics, inkTypes[id]);

  if (id.startsWith("filter:")) {
    const [, field, value] = id.split(":");
    return traceHas(nodes, "filterData", { field }) && (value === "explicit" || hasDeepPair(deep, "value", value));
  }
  if (id.startsWith("density:bandwidth:")) return hasDeepPair(deep, "bandwidth", Number(id.split(":")[2]));
  if (id.startsWith("density:field:")) return hasDeepPair(deep, "field", id.split(":")[2]);
  if (id.startsWith("density:group:")) return hasDeepPair(deep, "group", id.split(":")[2]) || hasEncoding(layers, "group", id.split(":")[2]);
  if (id.startsWith("bin:count:")) {
    const count = Number(id.split(":")[2]);
    return hasDeepPair(deep, "bins", count) || hasDeepPair(deep, "binCount", count) || hasDeepPair(deep, "maxBins", count);
  }
  if (id.startsWith("bin:x:")) {
    const count = Number(id.split(":")[2]);
    return hasDeepPair(deep, "xBins", count) || nodes.some(node => node.args?.bin?.bins?.x === count);
  }
  if (id.startsWith("bin:y:")) {
    const count = Number(id.split(":")[2]);
    return hasDeepPair(deep, "yBins", count) || nodes.some(node => node.args?.bin?.bins?.y === count);
  }
  if (id === "interval:ci95") return (
    hasDeepPair(deep, "interval", "ci95") ||
    hasDeepPair(deep, "confidence", 0.95) ||
    (hasDeepPair(deep, "extent", "ci") && hasDeepPair(deep, "level", 0.95))
  );
  if (id === "curve:monotone") return hasDeepPair(deep, "curve", "monotone") || hasDeepPair(deep, "type", "monotone");
  if (id === "boundary:visible") return nodes.some(node => /Boundary/u.test(node.op));
  if (id === "outliers:visible") return boxPlotConfigs(programs).some(({ program, config }) => {
    const data = (program.semanticSpec?.datasets ?? []).find(dataset => dataset.id === config.outlierDataId);
    return config.outliers === true && Array.isArray(data?.values) && data.values.length > 0 &&
      program.graphicSpec?.objects?.[config.outlierId]?.items?.length === data.values.length;
  });
  if (id === "whisker:tukey") return boxPlotConfigs(programs).some(({ config }) =>
    config.whisker?.type === "tukey" && Number.isFinite(config.whisker.factor)
  );
  if (id === "parallel:dimensions:4") return hasDeepPair(deep, "dimensionsCount", 4) || deep.filter(entry => entry.key === "field" && ["Horsepower", "Weight_in_lbs", "Acceleration", "Miles_per_Gallon"].includes(entry.value)).length >= 4;
  if (id.startsWith("facet:field:")) return hasDeepPair(deep, "field", id.split(":")[2]);
  if (id === "facet:columns:2") return hasDeepPair(deep, "columns", 2);
  if (id === "facet:headers") return graphics.some(graphic => /facet.*header/i.test(graphic.id));
  if (id === "facet:shared-scales") return !hasDeepPair(deep, "scales", "independent");
  if (id === "composition:facet") return programs.some(program => program.compositionSpec?.type === "facet");
  if (id === "composition:hconcat") return programs.some(program =>
    program.compositionSpec?.type === "hconcat" || program.compositionSpec?.direction === "horizontal"
  );
  if (id === "composition:gap:24") return programs.some(program =>
    program.compositionSpec?.gap === 24 && nestedCanvasGap(program, 24)
  );
  if (id === "composition:replace-child") return nodes.some(node => node.op === "replaceCompositionChild");
  if (id === "composition:slot-identity-preserved") return nodes.some(node => {
    if (node.op !== "replaceCompositionChild" || typeof node.args?.target !== "string") return false;
    return programs.some(program =>
      program.compositionSpec?.children?.includes(node.args.target) && program.children?.[node.args.target] !== undefined
    );
  });
  if (id.startsWith("horizon:bands:")) return hasDeepPair(deep, "bands", Number(id.split(":")[2]));
  if (id.startsWith("horizon:baseline:")) return hasDeepPair(deep, "baseline", Number(id.split(":")[2]));
  if (id === "horizon:negative:red") return deep.some(entry => typeof entry.value === "string" && /red|#(?:[89a-f][0-9a-f]{5})/iu.test(entry.value));
  if (id === "horizon:positive:blue") return deep.some(entry => typeof entry.value === "string" && /blue|#(?:[0-7][0-9a-f]{5})/iu.test(entry.value));
  if (id === "window:frame:-1:1") return hasDeepPair(deep, "frameCount", 2) ||
    (hasDeepPair(deep, "start", -1) && hasDeepPair(deep, "end", 1)) ||
    (hasDeepPair(deep, "preceding", 1) && hasDeepPair(deep, "following", 1));
  if (id === "window:mean:life_expect") return (
    (hasDeepPair(deep, "operation", "mean") || hasDeepPair(deep, "op", "movingMean")) &&
    hasDeepPair(deep, "field", "life_expect")
  );
  if (id === "window:order:year") return hasDeepPair(deep, "field", "year");
  if (id === "series:original-and-moving") return layers.filter(layer => layer.mark?.type === "line").length >= 2;
  if (id === "time-unit:year") return hasDeepPair(deep, "unit", "year") || hasDeepPair(deep, "timeUnit", "year");
  if (id === "tick:one-per-valid-row") return tickCountMatchesData(programs);
  if (id.startsWith("selection:")) return nodes.some(node => node.op === "selectMarks") && id.split(":").slice(1).every(value => JSON.stringify(nodes).includes(value));
  if (id.startsWith("highlight:")) return nodes.some(node => node.op === "highlightMarks");
  if (id === "style:highlight:orange-no-stroke") return programs.some(program =>
    Object.values(program.materializationConfigs?.highlights ?? {}).some(config =>
      isOrange(config.style?.fill) && config.style?.stroke === undefined && config.style?.strokeWidth === undefined
    )
  );
  if (id === "style:regression:black") {
    const primitives = regressionLinePrimitives(programs);
    return primitives.length > 0 && primitives.every(primitive => isBlack(primitive.properties?.stroke));
  }
  if (id === "annotation:r-squared:black") return rSquaredAnnotationNearLine(programs);
  if (id === "layout:labels") return nodes.some(node => node.op === "layoutLabels");
  if (id === "layout:leader-lines") return nodes.some(node => /Leader/u.test(node.op)) || graphics.some(graphic => /leader/i.test(graphic.id));
  if (id === "order:descending-total") return nodes.some(node => node.op === "orderCategories") &&
    (hasDeepPair(deep, "order", "descending") || hasDeepPair(deep, "direction", "descending")) &&
    hasDeepPair(deep, "aggregate", "sum");

  return false;
}

function importsFromSource(source) {
  return [...source.matchAll(/\bimport\s+(?:[\s\S]*?\s+from\s+)?["']([^"']+)["']/gu)].map(match => match[1]);
}

export function validateGeneratedSource(source) {
  if (typeof source !== "string" || source.trim().length === 0) throw new Error("Submitted program must be non-empty JavaScript.");
  if (source.length > 30_000) throw new Error("Submitted program exceeds the 30,000-character limit.");
  const imports = importsFromSource(source);
  if (imports.length === 0) throw new Error("Submitted program must import ggaction.");
  for (const specifier of imports) {
    if (!allowedImports.has(specifier)) throw new Error(`Import "${specifier}" is not allowed in evaluation programs.`);
  }
  for (const [pattern, label] of forbiddenSourcePatterns) {
    if (pattern.test(source)) throw new Error(`Submitted program uses a ${label}.`);
  }
  if (!/\bexport\s+(?:async\s+)?function\s+buildChart\s*\(/u.test(source)) {
    throw new Error("Submitted program must export function buildChart(datasets).");
  }
  return true;
}

export function runtimeFunctionsFromSource(source) {
  const names = new Set();
  for (const match of source.matchAll(/\bimport\s*\{([^}]+)\}\s*from\s*["']ggaction(?:\/(?:basic|svg|png|pdf))?["']/gu)) {
    for (const item of match[1].split(",")) {
      const name = item.trim().split(/\s+as\s+/u)[0];
      if (name) names.add(name);
    }
  }
  return [...names].sort();
}

export async function captureProgramWorkflow(createProgram, actionNames) {
  const executed = new Set();
  const descriptors = new Map();
  for (const name of actionNames) {
    const descriptor = Object.getOwnPropertyDescriptor(RuntimeChartProgram.prototype, name);
    if (descriptor?.value === undefined || typeof descriptor.value !== "function") continue;
    descriptors.set(name, descriptor);
    Object.defineProperty(RuntimeChartProgram.prototype, name, {
      ...descriptor,
      value: function (...args) {
        if ((this.actionStack?.length ?? 0) === 0) executed.add(name);
        return descriptor.value.apply(this, args);
      }
    });
  }
  try {
    return Object.freeze({
      program: await createProgram(),
      actions: Object.freeze([...executed].sort())
    });
  } finally {
    for (const [name, descriptor] of descriptors) {
      Object.defineProperty(RuntimeChartProgram.prototype, name, descriptor);
    }
  }
}

function rootCanvas(program) {
  return Object.values(program.graphicSpec?.objects ?? {}).find(graphic => graphic.type === "canvas");
}

async function renderProgram(program, task, artifactRoot) {
  await mkdir(artifactRoot, { recursive: true });
  const before = JSON.stringify(program);
  const evidence = { immutable: true, logicalDimensionsEqual: true };
  const files = [];
  const canvasGraphic = rootCanvas(program);
  const width = canvasGraphic?.properties?.width;
  const height = canvasGraphic?.properties?.height;
  if (!Number.isFinite(width) || !Number.isFinite(height)) throw new Error("Program has no concrete Canvas dimensions.");

  if (task.oracle.renderers.includes("canvas")) {
    const canvas = createNativeCanvas(width * 2, height * 2);
    render(program, canvas.getContext("2d"), { pixelRatio: 2 });
    const output = path.join(artifactRoot, "canvas.png");
    const buffer = canvas.toBuffer("image/png");
    await writeFile(output, buffer);
    evidence.canvas = buffer.length > 100;
    files.push(output);
  }
  if (task.oracle.renderers.includes("svg")) {
    const output = path.join(artifactRoot, "chart.svg");
    const svg = renderToSVG(program, { title: task.id });
    await writeFile(output, svg);
    evidence.svg = /^<svg[\s>]/u.test(svg) && svg.includes(`width="${width}"`) && svg.includes(`height="${height}"`);
    files.push(output);
  }
  if (task.oracle.renderers.includes("png")) {
    const output = path.join(artifactRoot, "chart.png");
    const result = await renderToPNG(program, { output, pixelRatio: 2 });
    evidence.png = result.bytes > 100 && result.width === width * 2 && result.height === height * 2;
    evidence.logicalDimensionsEqual &&= result.width / result.pixelRatio === width && result.height / result.pixelRatio === height;
    files.push(result.output);
  }
  if (task.oracle.renderers.includes("pdf")) {
    const output = path.join(artifactRoot, "chart.pdf");
    const result = await renderToPDF(program, { output, metadata: { title: task.id } });
    const pdf = await readFile(result.output);
    evidence.pdf = result.pages === 1 && result.bytes > 100 && pdf.subarray(0, 4).toString() === "%PDF" && !pdf.includes(Buffer.from("/Subtype /Image"));
    evidence.logicalDimensionsEqual &&= result.width === width && result.height === height;
    files.push(result.output);
  }
  evidence.immutable = before === JSON.stringify(program);
  return { evidence, files };
}

export async function evaluatePreparedProgram({
  program,
  task,
  artifactRoot,
  runtimeFunctions,
  programFile,
  programSha256,
  workflowActions = []
}) {
  if (program === null || typeof program !== "object" || program.graphicSpec === undefined || program.semanticSpec === undefined) {
    throw new Error("Evaluation requires a ChartProgram.");
  }
  await mkdir(artifactRoot, { recursive: true });
  let evidenceProgramFile = programFile;
  let evidenceProgramSha256 = programSha256;
  if (evidenceProgramFile === undefined) {
    const snapshot = `${JSON.stringify(program, null, 2)}\n`;
    evidenceProgramFile = path.join(artifactRoot, "program.json");
    evidenceProgramSha256 = createHash("sha256").update(snapshot).digest("hex");
    await writeFile(evidenceProgramFile, snapshot);
  }

  const programs = collectPrograms(program);
  const nodes = programs.flatMap(candidate => flattenTrace(candidate.trace));
  const actionIndex = JSON.parse(await readFile(new URL("../../agent_docs/contract/ACTION_INDEX.json", import.meta.url), "utf8"));
  const layersByAction = new Map(actionIndex.actions.map(action => [action.name, action.layer]));
  const directPrimitiveActions = programs.flatMap(candidate => (candidate.trace?.children ?? []))
    .filter(node => layersByAction.get(node.op) === "primitive")
    .map(node => node.op);
  const actions = [...new Set([
    ...nodes.filter(node => ["user-facing", "advanced"].includes(layersByAction.get(node.op))).map(node => node.op),
    ...directPrimitiveActions,
    ...workflowActions.filter(action => layersByAction.has(action))
  ])].sort();
  const renderResult = await renderProgram(program, task, artifactRoot);
  const context = {
    programs,
    layers: everyLayer(programs),
    datasets: everyDataset(programs),
    coordinates: everyCoordinate(programs),
    graphics: everyGraphic(programs),
    nodes,
    deep: deepValues(programs.map(candidate => ({
      semanticSpec: candidate.semanticSpec,
      materializationConfigs: candidate.materializationConfigs,
      compositionSpec: candidate.compositionSpec,
      trace: candidate.trace
    }))),
    renderEvidence: renderResult.evidence
  };
  const validations = task.oracle.requiredValidations.map(id => ({ id, passed: validationPassed(id, context) }));
  return Object.freeze({
    program,
    actions,
    runtimeFunctions: [...runtimeFunctions].sort(),
    validations,
    renderers: task.oracle.renderers.filter(renderer => renderResult.evidence[renderer] === true),
    artifacts: {
      programFile: evidenceProgramFile,
      programSha256: evidenceProgramSha256,
      rendererFiles: renderResult.files
    }
  });
}

export function inspectPreparedProgramValidation(program, id) {
  const programs = collectPrograms(program);
  const nodes = programs.flatMap(candidate => flattenTrace(candidate.trace));
  return validationPassed(id, {
    programs,
    layers: everyLayer(programs),
    datasets: everyDataset(programs),
    coordinates: everyCoordinate(programs),
    graphics: everyGraphic(programs),
    nodes,
    deep: deepValues(programs.map(candidate => ({
      semanticSpec: candidate.semanticSpec,
      materializationConfigs: candidate.materializationConfigs,
      compositionSpec: candidate.compositionSpec,
      trace: candidate.trace
    }))),
    renderEvidence: {}
  });
}

export async function evaluateGeneratedProgram({ source, task, datasets, artifactRoot }) {
  validateGeneratedSource(source);
  await mkdir(artifactRoot, { recursive: true });
  const programFile = path.join(artifactRoot, "program.mjs");
  await writeFile(programFile, source);
  const module = await import(`${pathToFileURL(programFile).href}?v=${Date.now()}`);
  const actionIndex = JSON.parse(await readFile(new URL("../../agent_docs/contract/ACTION_INDEX.json", import.meta.url), "utf8"));
  const captured = await captureProgramWorkflow(
    () => module.buildChart(datasets),
    actionIndex.actions.map(action => action.name)
  );
  return evaluatePreparedProgram({
    program: captured.program,
    task,
    artifactRoot,
    runtimeFunctions: runtimeFunctionsFromSource(source),
    programFile,
    programSha256: createHash("sha256").update(source).digest("hex"),
    workflowActions: captured.actions
  });
}
