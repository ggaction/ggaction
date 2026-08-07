import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";

import { createCanvas as createNativeCanvas } from "@napi-rs/canvas";
import { render } from "ggaction";
import { renderToPDF } from "ggaction/pdf";
import { renderToPNG } from "ggaction/png";
import { renderToSVG } from "ggaction/svg";

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
  if (id === "legend:count:2") return legendEntries(programs).length === 2;
  if (id === "legend:color" || id === "legend:continuous-color") {
    return programs.some(program => program.semanticSpec?.guides?.legend?.color !== undefined) ||
      legendEntries(programs).some(legend => legend.channels?.includes("color"));
  }
  if (id === "legend:series") return legendEntries(programs).length > 0;
  if (id === "legend:position:top") return hasDeepPair(deep, "position", "top") || hasDeepPair(deep, "side", "top");
  if (id === "legend:order:left-to-right") return hasDeepPair(deep, "direction", "horizontal") || hasDeepPair(deep, "orientation", "horizontal");
  if (id === "legend:titles-aligned") return alignedOn(guideObjects(graphics, /LegendTitle$/u), "y") || legendEntries(programs).length >= 2;
  if (id === "legend:symbols-aligned") return alignedOn(guideObjects(graphics, /LegendSymbol/u), "y") || legendEntries(programs).length >= 2;
  if (id === "legend:label-gaps-aligned") return guideObjects(graphics, /LegendLabels$/u).length >= 2;
  if (id === "legend:inter-block-gap") return guideObjects(graphics, /LegendTitle$/u).length >= 2;
  if (id === "legend:plot-offset") return guideObjects(graphics, /Legend/u).length >= 3;

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
  if (id === "outliers:visible") return !hasDeepPair(deep, "outliers", false);
  if (id === "whisker:tukey") return !hasDeepPair(deep, "whisker", "minmax");
  if (id === "parallel:dimensions:4") return hasDeepPair(deep, "dimensionsCount", 4) || deep.filter(entry => entry.key === "field" && ["Horsepower", "Weight_in_lbs", "Acceleration", "Miles_per_Gallon"].includes(entry.value)).length >= 4;
  if (id.startsWith("facet:field:")) return hasDeepPair(deep, "field", id.split(":")[2]);
  if (id === "facet:columns:2") return hasDeepPair(deep, "columns", 2);
  if (id === "facet:headers") return graphics.some(graphic => /facet.*header/i.test(graphic.id));
  if (id === "facet:shared-scales") return !hasDeepPair(deep, "scales", "independent");
  if (id === "composition:facet") return programs.some(program => program.compositionSpec?.type === "facet");
  if (id === "composition:hconcat") return programs.some(program =>
    program.compositionSpec?.type === "hconcat" || program.compositionSpec?.direction === "horizontal"
  );
  if (id === "composition:gap:24") return programs.some(program => program.compositionSpec?.gap === 24 || program.compositionSpec?.padding === 24);
  if (id === "composition:replace-child") return nodes.some(node => node.op === "replaceCompositionChild");
  if (id === "composition:slot-identity-preserved") return nodes.some(node => node.op === "replaceCompositionChild");
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
  if (id === "tick:one-per-valid-row") return semanticMark(layers, "tick") && datasets.some(dataset => Array.isArray(dataset.values) && dataset.values.length > 0);
  if (id.startsWith("selection:")) return nodes.some(node => node.op === "selectMarks") && id.split(":").slice(1).every(value => JSON.stringify(nodes).includes(value));
  if (id.startsWith("highlight:")) return nodes.some(node => node.op === "highlightMarks");
  if (id === "style:highlight:orange-no-stroke") return nodes.some(node => node.op === "highlightMarks") && deep.some(entry => entry.key === "fill" && typeof entry.value === "string" && /orange|#(?:[d-f][4-9a-f][0-9a-f]{4})/iu.test(entry.value));
  if (id === "style:regression:black") return deep.some(entry => entry.key === "stroke" && ["black", "#000", "#000000"].includes(String(entry.value).toLowerCase()));
  if (id === "annotation:r-squared:black") return graphics.some(graphic => graphic.type === "text" && JSON.stringify(graphic).match(/r(?:²|\^2|2)/iu));
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

export function actionFunctionsFromSource(source, actionNames) {
  const candidates = new Set(
    [...source.matchAll(/\.([A-Za-z][A-Za-z0-9]*)\s*\(/gu)].map(match => match[1])
  );
  return [...actionNames].filter(name => candidates.has(name)).sort();
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

export async function evaluateGeneratedProgram({ source, task, datasets, artifactRoot }) {
  validateGeneratedSource(source);
  await mkdir(artifactRoot, { recursive: true });
  const programFile = path.join(artifactRoot, "program.mjs");
  await writeFile(programFile, source);
  const module = await import(`${pathToFileURL(programFile).href}?v=${Date.now()}`);
  const program = await module.buildChart(datasets);
  const actionIndex = JSON.parse(await readFile(new URL("../../agent_docs/contract/ACTION_INDEX.json", import.meta.url), "utf8"));
  return evaluatePreparedProgram({
    program,
    task,
    artifactRoot,
    runtimeFunctions: runtimeFunctionsFromSource(source),
    programFile,
    programSha256: createHash("sha256").update(source).digest("hex"),
    workflowActions: actionFunctionsFromSource(source, actionIndex.actions.map(action => action.name))
  });
}
