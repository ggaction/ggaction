import { chart } from "../../../src/index.js";

import {
  CONTINUOUS_BAR_COUNTRIES,
  CONTINUOUS_BAR_LAYOUT,
  createContinuousColorBarReference
} from "./reference-values.js";

const AXIS = "#334155";
const GRID = "#e2e8f0";
const FONT = "sans-serif";

function properties(program, target, values) {
  let next = program;
  for (const [property, value] of Object.entries(values)) {
    next = next.editGraphics({ target, property, value });
  }
  return next;
}

function text(program, target, values, style = {}) {
  return properties(program, target, {
    ...values,
    fill: style.fill ?? AXIS,
    fontSize: style.fontSize ?? 11,
    fontFamily: style.fontFamily ?? FONT,
    fontWeight: style.fontWeight ?? "normal",
    textAlign: style.textAlign ?? "center",
    textBaseline: style.textBaseline ?? "middle",
    ...(style.rotation === undefined ? {} : { rotation: style.rotation })
  });
}

export function createGapminderContinuousColorBarPrimitives(gapminder, variant) {
  const reference = createContinuousColorBarReference(gapminder, variant);
  const { width, height, margin } = CONTINUOUS_BAR_LAYOUT;
  const { bounds, axes, legend, title } = reference;
  const recentRows = gapminder.filter(row => row.year >= 1995 && row.year <= 2005);
  const x = axes.x.positions;
  const y = axes.y.positions;
  const colorField = reference.color.sourceField;
  const colorAggregate = reference.color.aggregate;

  let program = chart()
    .editSemantic({ property: "dataset[gapminder].values", value: gapminder })
    .editSemantic({ property: "dataset[recent].source", value: "gapminder" })
    .editSemantic({
      property: "dataset[recent].transform",
      value: [{
        type: "filter",
        field: "year",
        range: { min: 1995, max: 2005, inclusive: true }
      }]
    })
    .editSemantic({ property: "dataset[recent].values", value: recentRows })
    .editSemantic({ property: "dataset[focus].source", value: "recent" })
    .editSemantic({
      property: "dataset[focus].transform",
      value: [{
        type: "filter",
        field: "country",
        oneOf: CONTINUOUS_BAR_COUNTRIES
      }]
    })
    .editSemantic({ property: "dataset[focus].values", value: reference.rows })
    .editSemantic({ property: "layer[bar].mark.type", value: "bar" })
    .editSemantic({ property: "layer[bar].data", value: "focus" })
    .editSemantic({ property: "layer[bar].coordinate", value: "main" })
    .editSemantic({ property: "layer[bar].encoding.x.field", value: "country" })
    .editSemantic({
      property: "layer[bar].encoding.x.fieldType",
      value: "nominal"
    })
    .editSemantic({ property: "layer[bar].encoding.x.scale", value: "x" })
    .editSemantic({ property: "layer[bar].encoding.y.field", value: "pop" })
    .editSemantic({
      property: "layer[bar].encoding.y.fieldType",
      value: "quantitative"
    })
    .editSemantic({ property: "layer[bar].encoding.y.aggregate", value: "sum" })
    .editSemantic({ property: "layer[bar].encoding.y.stack", value: null })
    .editSemantic({ property: "layer[bar].encoding.y.scale", value: "y" })
    .editSemantic({
      property: "layer[bar].encoding.color.field",
      value: colorField
    })
    .editSemantic({
      property: "layer[bar].encoding.color.fieldType",
      value: "quantitative"
    })
    .editSemantic({
      property: "layer[bar].encoding.color.aggregate",
      value: colorAggregate
    })
    .editSemantic({ property: "layer[bar].encoding.color.scale", value: "color" })
    .editSemantic({ property: "scale[x].type", value: "band" })
    .editSemantic({ property: "scale[x].domain", value: "auto" })
    .editSemantic({ property: "scale[x].range", value: "auto" })
    .editSemantic({ property: "scale[x].paddingInner", value: 0 })
    .editSemantic({ property: "scale[x].paddingOuter", value: 0 })
    .editSemantic({ property: "scale[x].align", value: 0.5 })
    .editSemantic({ property: "scale[y].type", value: "linear" })
    .editSemantic({ property: "scale[y].domain", value: reference.domains.y })
    .editSemantic({ property: "scale[y].range", value: "auto" })
    .editSemantic({ property: "scale[color].type", value: "sequential" })
    .editSemantic({ property: "scale[color].domain", value: "auto" })
    .editSemantic({
      property: "scale[color].range",
      value: { palette: "viridis" }
    })
    .editSemantic({ property: "scale[color].interpolate", value: "rgb" });
  if (reference.color.reverse) {
    program = program.editSemantic({
      property: "scale[color].reverse",
      value: true
    });
  }
  program = program
    .editSemantic({ property: "coordinate[main].type", value: "cartesian" })
    .editSemantic({ property: "guide.axis.x.scale", value: "x" })
    .editSemantic({ property: "guide.axis.x.coordinate", value: "main" })
    .editSemantic({ property: "guide.axis.x.title", value: "Country" })
    .editSemantic({ property: "guide.axis.y.scale", value: "y" })
    .editSemantic({ property: "guide.axis.y.coordinate", value: "main" })
    .editSemantic({
      property: "guide.axis.y.title",
      value: "sum(pop), 1995–2005"
    })
    .editSemantic({ property: "guide.grid.horizontal.scale", value: "y" })
    .editSemantic({
      property: "guide.grid.horizontal.coordinate",
      value: "main"
    })
    .editSemantic({ property: "guide.legend.color.scale", value: "color" })
    .editSemantic({
      property: "guide.legend.color.title",
      value: legend.title
    })
    .editSemantic({ property: "title.text", value: title.text })
    .editSemantic({ property: "title.subtitle", value: title.subtitle })
    .createGraphics({ id: "canvas", type: "canvas" });
  program = properties(program, "canvas", {
    width,
    height,
    background: "white"
  });

  program = program.createGraphics({
    id: "horizontalGridLines",
    type: "line",
    length: y.length
  });
  program = properties(program, "horizontalGridLines", {
    x1: bounds.left,
    y1: y,
    x2: bounds.right,
    y2: y,
    stroke: GRID,
    strokeWidth: 1,
    strokeDash: y.map(() => [])
  });

  program = program.createGraphics({
    id: "bar",
    type: "rect",
    length: reference.bars.length
  });
  program = properties(program, "bar", {
    x: reference.bars.map(item => item.x),
    y: reference.bars.map(item => item.y),
    width: reference.bars.map(item => item.width),
    height: reference.bars.map(item => item.height),
    fill: reference.bars.map(item => item.fill),
    stroke: "white",
    strokeWidth: 0.5
  });

  for (const [channel, line] of [
    ["x", { x1: bounds.left, y1: bounds.bottom, x2: bounds.right, y2: bounds.bottom }],
    ["y", { x1: bounds.left, y1: bounds.bottom, x2: bounds.left, y2: bounds.top }]
  ]) {
    program = program.createGraphics({ id: `${channel}AxisLine`, type: "line" });
    program = properties(program, `${channel}AxisLine`, {
      ...line,
      stroke: AXIS,
      strokeWidth: 1
    });
  }
  program = program.createGraphics({ id: "xAxisTicks", type: "line", length: x.length });
  program = properties(program, "xAxisTicks", {
    x1: x,
    y1: bounds.bottom,
    x2: x,
    y2: bounds.bottom + 4,
    stroke: AXIS,
    strokeWidth: 1
  });
  program = program.createGraphics({ id: "yAxisTicks", type: "line", length: y.length });
  program = properties(program, "yAxisTicks", {
    x1: bounds.left - 4,
    y1: y,
    x2: bounds.left,
    y2: y,
    stroke: AXIS,
    strokeWidth: 1
  });
  program = program.createGraphics({ id: "xAxisLabels", type: "text", length: x.length });
  program = text(program, "xAxisLabels", {
    x,
    y: bounds.bottom + 10,
    text: axes.x.labels
  }, { fontSize: 10, textBaseline: "top" });
  program = program.createGraphics({ id: "yAxisLabels", type: "text", length: y.length });
  program = text(program, "yAxisLabels", {
    x: bounds.left - 8,
    y,
    text: axes.y.labels
  }, { fontSize: 10, textAlign: "right" });
  program = program.createGraphics({ id: "xAxisTitle", type: "text" });
  program = text(program, "xAxisTitle", {
    x: (bounds.left + bounds.right) / 2,
    y: height - 16,
    text: "Country",
    rotation: 0
  }, { fontSize: 12, fontWeight: 600 });
  program = program.createGraphics({ id: "yAxisTitle", type: "text" });
  program = text(program, "yAxisTitle", {
    x: 16,
    y: (bounds.top + bounds.bottom) / 2,
    text: "sum(pop), 1995–2005",
    rotation: -Math.PI / 2
  }, { fontSize: 12, fontWeight: 600 });

  program = program.createGraphics({
    id: "colorGradientStrips",
    type: "rect",
    length: legend.strips.length
  });
  program = properties(program, "colorGradientStrips", {
    x: legend.strips.map(item => item.x),
    y: legend.strips.map(item => item.y),
    width: legend.strips.map(item => item.width),
    height: legend.strips.map(item => item.height),
    fill: legend.strips.map(item => item.fill),
    stroke: legend.strips.map(item => item.fill),
    strokeWidth: 0
  });
  program = program.createGraphics({
    id: "colorGradientTicks",
    type: "line",
    length: legend.positions.length
  });
  program = properties(program, "colorGradientTicks", {
    x1: legend.x + legend.thickness,
    y1: legend.positions,
    x2: legend.x + legend.thickness + 6,
    y2: legend.positions,
    stroke: AXIS,
    strokeWidth: 1
  });
  program = program.createGraphics({
    id: "colorGradientLabels",
    type: "text",
    length: legend.positions.length
  });
  program = text(program, "colorGradientLabels", {
    x: legend.x + legend.thickness + 13,
    y: legend.positions,
    text: legend.labels
  }, { fontSize: 10, textAlign: "left" });
  program = program.createGraphics({ id: "colorGradientTitle", type: "text" });
  program = text(program, "colorGradientTitle", {
    x: legend.x,
    y: bounds.top + 20,
    text: legend.title
  }, { fontSize: 10, fontWeight: 600, textAlign: "left" });

  program = program.createGraphics({ id: "chartTitle", type: "text" });
  program = text(program, "chartTitle", {
    x: bounds.left,
    y: 18,
    text: title.text
  }, {
    fill: "#0f172a",
    fontSize: 16,
    fontWeight: 700,
    textAlign: "left"
  });
  program = program.createGraphics({ id: "chartSubtitle", type: "text" });
  return text(program, "chartSubtitle", {
    x: bounds.left,
    y: 37,
    text: title.subtitle
  }, { fill: "#64748b", fontSize: 10, textAlign: "left" });
}
