import { chart } from "../../../src/index.js";
import {
  ERROR_BAR_COLOR,
  ERROR_BAR_FIELDS,
  ERROR_BAR_LAYOUT,
  ERROR_BAR_VARIANT_STYLE,
  createExplicitIntervalReferenceValues,
  createHorizontalErrorBarReferenceValues,
  createStyledErrorBarReferenceValues
} from "./reference-values.js";

const AXIS_COLOR = "#334155";
const TICK_COLOR = "#64748b";
const GRID_COLOR = "#e2e8f0";

function editSemantic(program, property, value) {
  return program.editSemantic({ property, value });
}

function editGraphicProperties(program, target, properties) {
  let next = program;
  for (const [property, value] of Object.entries(properties)) {
    if (value === undefined) continue;
    next = next.editGraphics({ target, property, value });
  }
  return next;
}

function addLineCollection(program, id, lines, style) {
  let next = program.createGraphics({ id, type: "line", length: lines.length });
  return editGraphicProperties(next, id, {
    x1: lines.map(line => line.x1),
    y1: lines.map(line => line.y1),
    x2: lines.map(line => line.x2),
    y2: lines.map(line => line.y2),
    stroke: style.stroke,
    strokeWidth: style.strokeWidth,
    strokeDash: lines.map(() => [...style.strokeDash]),
    opacity: style.opacity
  });
}

function addTextCollection(program, id, { x, y, text, ...style }) {
  const next = Array.isArray(text)
    ? program.createGraphics({ id, type: "text", length: text.length })
    : program.createGraphics({ id, type: "text" });
  return editGraphicProperties(next, id, { x, y, text, ...style });
}

function addAxes(program, axes, { xTitle, yTitle }) {
  let next = program;
  for (const [channel, title] of [["x", xTitle], ["y", yTitle]]) {
    const axis = axes[channel];
    const horizontal = channel === "x";
    next = editSemantic(next, `guide.axis.${channel}.scale`, channel);
    next = editSemantic(next, `guide.axis.${channel}.coordinate`, "main");
    next = editSemantic(next, `guide.axis.${channel}.title`, title);
    next = next.createGraphics({ id: `${channel}AxisLine`, type: "line" });
    next = editGraphicProperties(next, `${channel}AxisLine`, {
      ...axis.line,
      stroke: AXIS_COLOR,
      strokeWidth: 1
    });
    next = next.createGraphics({
      id: `${channel}AxisTicks`,
      type: "line",
      length: axis.values.length
    });
    next = editGraphicProperties(next, `${channel}AxisTicks`, horizontal
      ? {
          x1: axis.positions,
          y1: axis.line.y1,
          x2: axis.positions,
          y2: axis.line.y1 + 6,
          stroke: TICK_COLOR,
          strokeWidth: 1
        }
      : {
          x1: axis.line.x1 - 6,
          y1: axis.positions,
          x2: axis.line.x1,
          y2: axis.positions,
          stroke: TICK_COLOR,
          strokeWidth: 1
        });
    next = addTextCollection(next, `${channel}AxisLabels`, {
      x: horizontal ? axis.positions : axis.line.x1 - 12,
      y: horizontal ? axis.line.y1 + 18 : axis.positions,
      text: axis.values.map(String),
      fill: AXIS_COLOR,
      fontSize: 12,
      fontFamily: "sans-serif",
      fontWeight: "normal",
      textAlign: horizontal ? "center" : "right",
      textBaseline: horizontal ? "top" : "middle"
    });
    next = addTextCollection(next, `${channel}AxisTitle`, {
      x: axis.title.x,
      y: axis.title.y,
      text: title,
      fill: AXIS_COLOR,
      fontSize: 13,
      fontFamily: "sans-serif",
      fontWeight: 600,
      textAlign: "center",
      textBaseline: "middle",
      rotation: horizontal ? 0 : -Math.PI / 2
    });
  }
  return next;
}

function addRuleLayer(program, {
  id,
  data,
  channels,
  style
}) {
  let next = editSemantic(program, `layer[${id}].mark.type`, "rule");
  next = editSemantic(next, `layer[${id}].data`, data);
  next = editSemantic(next, `layer[${id}].coordinate`, "main");
  for (const [channel, encoding] of Object.entries(channels)) {
    next = editSemantic(next, `layer[${id}].encoding.${channel}.field`, encoding.field);
    next = editSemantic(
      next,
      `layer[${id}].encoding.${channel}.fieldType`,
      encoding.fieldType
    );
    next = editSemantic(next, `layer[${id}].encoding.${channel}.scale`, encoding.scale);
  }
  next = editSemantic(
    next,
    `layer[${id}].encoding.strokeDash.datum`,
    style.semanticStrokeDash ?? [...style.strokeDash]
  );
  return next;
}

function createErrorBarVariant({
  sourceRows,
  values,
  sourceData = "data",
  intervalData,
  orientation,
  fields,
  caps,
  style,
  title,
  subtitle,
  xTitle,
  yTitle
}) {
  const horizontal = orientation === "horizontal";
  const categoricalChannel = horizontal ? "y" : "x";
  const quantitativeChannel = horizontal ? "x" : "y";
  const secondaryChannel = horizontal ? "x2" : "y2";
  const data = intervalData ? "errorBarIntervalData" : sourceData;
  const categorical = { field: "Origin", fieldType: "nominal", scale: categoricalChannel };
  const lower = {
    field: fields.lower,
    fieldType: "quantitative",
    scale: quantitativeChannel
  };
  const upper = {
    field: fields.upper,
    fieldType: "quantitative",
    scale: quantitativeChannel
  };

  let program = chart()
    .createCanvas({
      width: ERROR_BAR_LAYOUT.width,
      height: ERROR_BAR_LAYOUT.height,
      margin: ERROR_BAR_LAYOUT.margin
    })
    .createData({ values: sourceRows });
  if (intervalData) {
    program = editSemantic(program, "dataset[errorBarIntervalData].source", sourceData);
    program = editSemantic(
      program,
      "dataset[errorBarIntervalData].transform",
      [values.transform]
    );
    program = editSemantic(program, "dataset[errorBarIntervalData].values", values.rows);
  }
  program = editSemantic(program, "coordinate[main].type", "cartesian");
  for (const channel of horizontal ? ["y", "x"] : ["x", "y"]) {
    const quantitative = channel === quantitativeChannel;
    program = editSemantic(
      program,
      `scale[${channel}].type`,
      quantitative ? "linear" : "ordinal"
    );
    program = editSemantic(program, `scale[${channel}].domain`, "auto");
    program = editSemantic(program, `scale[${channel}].range`, "auto");
  }
  program = editSemantic(program, `scale[${quantitativeChannel}].nice`, true);
  program = editSemantic(program, `scale[${quantitativeChannel}].zero`, false);
  program = addRuleLayer(program, {
    id: "errorBar",
    data,
    channels: {
      [categoricalChannel]: categorical,
      [quantitativeChannel]: lower,
      [secondaryChannel]: upper
    },
    style
  });
  if (!intervalData) {
    program = editSemantic(
      program,
      `layer[errorBar].encoding.${quantitativeChannel}.title`,
      fields.center
    );
  }
  if (caps) {
    program = addRuleLayer(program, {
      id: "errorBarLowerCap",
      data,
      channels: {
        [categoricalChannel]: categorical,
        [quantitativeChannel]: lower
      },
      style
    });
    program = addRuleLayer(program, {
      id: "errorBarUpperCap",
      data,
      channels: {
        [categoricalChannel]: categorical,
        [quantitativeChannel]: upper
      },
      style
    });
  }
  const gridChannel = horizontal ? "vertical" : "horizontal";
  program = editSemantic(
    program,
    `guide.grid.${gridChannel}.scale`,
    quantitativeChannel
  );
  program = editSemantic(
    program,
    `guide.grid.${gridChannel}.coordinate`,
    "main"
  );
  program = addLineCollection(program, `${gridChannel}GridLines`, values.grid, {
    stroke: GRID_COLOR,
    strokeWidth: 1,
    strokeDash: []
  });
  program = addLineCollection(program, "errorBar", values.mainRules, style);
  if (caps) {
    program = addLineCollection(program, "errorBarLowerCap", values.lowerCaps, style);
    program = addLineCollection(program, "errorBarUpperCap", values.upperCaps, style);
  }
  program = addAxes(program, values.axes, { xTitle, yTitle });
  return program.createTitle({ text: title, subtitle });
}

export function createHorizontalErrorBarPrimitives(cars) {
  const values = createHorizontalErrorBarReferenceValues(cars);
  return createErrorBarVariant({
    sourceRows: cars,
    values,
    intervalData: true,
    orientation: "horizontal",
    fields: ERROR_BAR_FIELDS,
    caps: true,
    style: {
      stroke: ERROR_BAR_COLOR,
      strokeWidth: 2,
      strokeDash: [],
      semanticStrokeDash: "solid",
      opacity: 1
    },
    title: "Mean Horsepower by Origin",
    subtitle: "95% confidence intervals",
    xTitle: "mean(Horsepower)",
    yTitle: "Origin"
  });
}

export function createExplicitIntervalPrimitives(cars) {
  const values = createExplicitIntervalReferenceValues(cars);
  return createErrorBarVariant({
    sourceRows: values.sourceRows,
    values: { ...values, grid: values.horizontalGrid },
    orientation: "vertical",
    fields: values.fields,
    caps: false,
    style: {
      stroke: ERROR_BAR_COLOR,
      strokeWidth: 2,
      strokeDash: [],
      semanticStrokeDash: "solid",
      opacity: 1
    },
    title: "Explicit Acceleration Intervals",
    subtitle: "Existing lower and upper fields; caps disabled",
    xTitle: "Origin",
    yTitle: "meanAcceleration"
  });
}

export function createStyledCapsPrimitives(cars) {
  const values = createStyledErrorBarReferenceValues(cars);
  return createErrorBarVariant({
    sourceRows: cars,
    values: { ...values, grid: values.horizontalGrid },
    intervalData: true,
    orientation: "vertical",
    fields: ERROR_BAR_FIELDS,
    caps: true,
    style: ERROR_BAR_VARIANT_STYLE,
    title: "Styled Acceleration Intervals",
    subtitle: "16px caps with custom rule appearance",
    xTitle: "Origin",
    yTitle: "mean(Acceleration)"
  });
}
