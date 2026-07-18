import { chart } from "../../../src/index.js";

import { createHeatmapReference } from "./reference-values.js";

const AXIS = "#334155";
const MUTED = "#64748b";
const FONT = "sans-serif";

function editProperties(program, target, properties) {
  let next = program;
  for (const [property, value] of Object.entries(properties)) {
    next = next.editGraphics({ target, property, value });
  }
  return next;
}

function editText(program, target, properties, style = {}) {
  return editProperties(program, target, {
    ...properties,
    fill: style.fill ?? AXIS,
    fontSize: style.fontSize ?? 11,
    fontFamily: style.fontFamily ?? FONT,
    fontWeight: style.fontWeight ?? "normal",
    textAlign: style.textAlign ?? "center",
    textBaseline: style.textBaseline ?? "middle",
    ...(style.opacity === undefined ? {} : { opacity: style.opacity }),
    ...(style.rotation === undefined ? {} : { rotation: style.rotation })
  });
}

export function createGapminderHeatmapPrimitives(gapminder) {
  const values = createHeatmapReference(gapminder);
  const { bounds, axes, legend, title } = values;
  const x = axes.x.positions;
  const y = axes.y.positions;

  let program = chart()
    .editSemantic({ property: "dataset[data].values", value: values.rows })
    .editSemantic({ property: "layer[rect].mark.type", value: "rect" })
    .editSemantic({ property: "layer[rect].data", value: "data" })
    .editSemantic({ property: "layer[rect].coordinate", value: "main" })
    .editSemantic({ property: "layer[rect].encoding.x.field", value: "year" })
    .editSemantic({ property: "layer[rect].encoding.x.fieldType", value: "ordinal" })
    .editSemantic({ property: "layer[rect].encoding.x.scale", value: "x" })
    .editSemantic({ property: "layer[rect].encoding.y.field", value: "country" })
    .editSemantic({ property: "layer[rect].encoding.y.fieldType", value: "nominal" })
    .editSemantic({ property: "layer[rect].encoding.y.scale", value: "y" })
    .editSemantic({ property: "layer[rect].encoding.color.field", value: "life_expect" })
    .editSemantic({ property: "layer[rect].encoding.color.fieldType", value: "quantitative" })
    .editSemantic({ property: "layer[rect].encoding.color.scale", value: "color" })
    .editSemantic({ property: "layer[text].mark.type", value: "text" })
    .editSemantic({ property: "layer[text].data", value: "data" })
    .editSemantic({ property: "layer[text].source", value: "rect" })
    .editSemantic({ property: "layer[text].coordinate", value: "main" })
    .editSemantic({ property: "layer[text].encoding.x.field", value: "year" })
    .editSemantic({ property: "layer[text].encoding.x.fieldType", value: "ordinal" })
    .editSemantic({ property: "layer[text].encoding.x.scale", value: "x" })
    .editSemantic({ property: "layer[text].encoding.y.field", value: "country" })
    .editSemantic({ property: "layer[text].encoding.y.fieldType", value: "nominal" })
    .editSemantic({ property: "layer[text].encoding.y.scale", value: "y" })
    .editSemantic({ property: "layer[text].encoding.text.field", value: "life_expect" })
    .editSemantic({ property: "layer[text].encoding.text.format", value: ".0f" })
    .editSemantic({ property: "scale[x].type", value: "band" })
    .editSemantic({ property: "scale[x].domain", value: "auto" })
    .editSemantic({ property: "scale[x].range", value: "auto" })
    .editSemantic({ property: "scale[x].paddingInner", value: 0 })
    .editSemantic({ property: "scale[x].paddingOuter", value: 0 })
    .editSemantic({ property: "scale[x].align", value: 0.5 })
    .editSemantic({ property: "scale[y].type", value: "band" })
    .editSemantic({ property: "scale[y].domain", value: "auto" })
    .editSemantic({ property: "scale[y].range", value: "auto" })
    .editSemantic({ property: "scale[y].paddingInner", value: 0 })
    .editSemantic({ property: "scale[y].paddingOuter", value: 0 })
    .editSemantic({ property: "scale[y].align", value: 0.5 })
    .editSemantic({ property: "scale[color].type", value: "sequential" })
    .editSemantic({ property: "scale[color].domain", value: "auto" })
    .editSemantic({
      property: "scale[color].range",
      value: { palette: { name: "viridis" } }
    })
    .editSemantic({ property: "scale[color].interpolate", value: "rgb" })
    .editSemantic({ property: "coordinate[main].type", value: "cartesian" })
    .editSemantic({ property: "guide.axis.x.scale", value: "x" })
    .editSemantic({ property: "guide.axis.x.coordinate", value: "main" })
    .editSemantic({ property: "guide.axis.x.title", value: axes.x.title })
    .editSemantic({ property: "guide.axis.y.scale", value: "y" })
    .editSemantic({ property: "guide.axis.y.coordinate", value: "main" })
    .editSemantic({ property: "guide.axis.y.title", value: axes.y.title })
    .editSemantic({ property: "guide.legend.color.scale", value: "color" })
    .editSemantic({ property: "guide.legend.color.title", value: legend.title.text })
    .editSemantic({ property: "title.text", value: title.text })
    .createGraphics({ id: "canvas", type: "canvas" })
    .createGraphics({ id: "plot-main", type: "collection", parent: "canvas" });

  program = editProperties(program, "canvas", {
    width: values.width,
    height: values.height,
    background: "white"
  });

  program = program.createGraphics({
    id: "rect",
    parent: "plot-main",
    type: "rect",
    length: values.cells.length
  });
  program = editProperties(program, "rect", {
    x: values.cells.map(cell => cell.x),
    y: values.cells.map(cell => cell.y),
    width: values.cells.map(cell => cell.width),
    height: values.cells.map(cell => cell.height),
    fill: values.cells.map(cell => cell.fill),
    opacity: 1,
    stroke: "white",
    strokeWidth: 1
  });

  program = program.createGraphics({
    id: "text",
    parent: "plot-main",
    type: "text",
    length: values.cells.length
  });
  program = editText(program, "text", {
    x: values.cells.map(cell => cell.x + cell.width / 2),
    y: values.cells.map(cell => cell.y + cell.height / 2),
    text: values.cells.map(cell => cell.label)
  }, {
    fill: values.cells.map(cell => cell.labelFill),
    opacity: 1,
    fontSize: 10,
    fontWeight: 600,
    rotation: 0
  });

  for (const [channel, line] of [
    ["x", { x1: bounds.left, y1: bounds.bottom, x2: bounds.right, y2: bounds.bottom }],
    ["y", { x1: bounds.left, y1: bounds.top, x2: bounds.left, y2: bounds.bottom }]
  ]) {
    program = program.createGraphics({
      id: `${channel}AxisLine`,
      parent: "plot-main",
      type: "line"
    });
    program = editProperties(program, `${channel}AxisLine`, {
      ...line,
      stroke: AXIS,
      strokeWidth: 1
    });
  }

  program = program.createGraphics({
    id: "xAxisTicks",
    parent: "plot-main",
    type: "line",
    length: x.length,
    before: "yAxisLine"
  });
  program = editProperties(program, "xAxisTicks", {
    x1: x,
    y1: bounds.bottom,
    x2: x,
    y2: bounds.bottom + 6,
    stroke: MUTED,
    strokeWidth: 1
  });
  program = program.createGraphics({
    id: "yAxisTicks",
    parent: "plot-main",
    type: "line",
    length: y.length
  });
  program = editProperties(program, "yAxisTicks", {
    x1: bounds.left - 6,
    y1: y,
    x2: bounds.left,
    y2: y,
    stroke: MUTED,
    strokeWidth: 1
  });

  program = program.createGraphics({
    id: "xAxisLabels",
    parent: "plot-main",
    type: "text",
    length: x.length,
    before: "yAxisLine"
  });
  program = editText(program, "xAxisLabels", {
    x,
    y: bounds.bottom + 18,
    text: axes.x.labels
  }, { fontSize: 12, textBaseline: "top" });
  program = program.createGraphics({
    id: "yAxisLabels",
    parent: "plot-main",
    type: "text",
    length: y.length
  });
  program = editText(program, "yAxisLabels", {
    x: bounds.left - 12,
    y,
    text: axes.y.labels
  }, { fontSize: 12, textAlign: "right" });

  program = program.createGraphics({
    id: "xAxisTitle",
    parent: "plot-main",
    type: "text",
    before: "yAxisLine"
  });
  program = editText(program, "xAxisTitle", {
    x: bounds.left + bounds.width / 2,
    y: bounds.bottom + 42,
    text: axes.x.title
  }, { fontSize: 13, fontWeight: 600, rotation: 0 });
  program = program.createGraphics({ id: "yAxisTitle", parent: "plot-main", type: "text" });
  program = editText(program, "yAxisTitle", {
    x: bounds.left - 52,
    y: bounds.top + bounds.height / 2,
    text: axes.y.title
  }, { fontSize: 13, fontWeight: 600, rotation: -Math.PI / 2 });

  program = program.createGraphics({
    id: "colorGradientStrips",
    parent: "canvas",
    type: "rect",
    length: legend.strips.length
  });
  program = editProperties(program, "colorGradientStrips", {
    x: legend.strips.map(strip => strip.x),
    y: legend.strips.map(strip => strip.y),
    width: legend.strips.map(strip => strip.width),
    height: legend.strips.map(strip => strip.height),
    fill: legend.strips.map(strip => strip.fill),
    stroke: legend.strips.map(strip => strip.stroke),
    strokeWidth: legend.strips.map(strip => strip.strokeWidth)
  });
  program = program.createGraphics({
    id: "colorGradientTicks",
    parent: "canvas",
    type: "line",
    length: legend.ticks.length
  });
  program = editProperties(program, "colorGradientTicks", {
    x1: legend.ticks.map(tick => tick.x1),
    y1: legend.ticks.map(tick => tick.y1),
    x2: legend.ticks.map(tick => tick.x2),
    y2: legend.ticks.map(tick => tick.y2),
    stroke: MUTED,
    strokeWidth: 1
  });
  program = program.createGraphics({
    id: "colorGradientLabels",
    parent: "canvas",
    type: "text",
    length: legend.labels.length
  });
  program = editText(program, "colorGradientLabels", {
    x: legend.labels.map(label => label.x),
    y: legend.labels.map(label => label.y),
    text: legend.labels.map(label => label.text)
  }, { fontSize: 12, textAlign: "left" });
  program = program.createGraphics({
    id: "colorGradientTitle",
    parent: "canvas",
    type: "text"
  });
  program = editText(program, "colorGradientTitle", legend.title, {
    fontSize: 13,
    fontWeight: 600,
    textAlign: "left"
  });

  program = program.createGraphics({ id: "chartTitle", parent: "canvas", type: "text" });
  return editText(program, "chartTitle", { ...title, y: bounds.top - 43 }, {
    fill: "#0f172a",
    fontSize: 22,
    fontWeight: 600
  });
}
