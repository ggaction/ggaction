import { chart, hconcat } from "../../../src/index.js";
import { linearPathCommands } from "../../support/path.js";

import {
  CENTER_AREA_LAYOUT,
  createCenterAreaReferenceValues
} from "./reference-values.js";

function addText(program, {
  id,
  parent = "canvas",
  x,
  y,
  text,
  fill = "#475569",
  fontSize = 11,
  fontWeight = "normal",
  textAlign = "left",
  textBaseline = "middle"
}) {
  return program
    .createGraphics({ id, parent, type: "text", length: Array.isArray(text) ? text.length : 1 })
    .editGraphics({ target: id, property: "x", value: x })
    .editGraphics({ target: id, property: "y", value: y })
    .editGraphics({ target: id, property: "text", value: text })
    .editGraphics({ target: id, property: "fill", value: fill })
    .editGraphics({ target: id, property: "fontSize", value: fontSize })
    .editGraphics({ target: id, property: "fontFamily", value: "sans-serif" })
    .editGraphics({ target: id, property: "fontWeight", value: fontWeight })
    .editGraphics({ target: id, property: "textAlign", value: textAlign })
    .editGraphics({ target: id, property: "textBaseline", value: textBaseline });
}

function createPanel(values, { title, subtitle }) {
  const { panelWidth, panelHeight, plot } = CENTER_AREA_LAYOUT;
  const x = values.xTicks.map(tick => tick.x);
  const y = values.yTicks.map(tick => tick.y);
  let program = chart()
    .createData({ id: "jobs", values: values.rows })
    .createGraphics({ id: "canvas", type: "canvas" })
    .editGraphics({ target: "canvas", property: "width", value: panelWidth })
    .editGraphics({ target: "canvas", property: "height", value: panelHeight })
    .editGraphics({ target: "canvas", property: "background", value: "#ffffff" })
    .createGraphics({ id: "plot-main", parent: "canvas", type: "collection" })
    .createGraphics({
      id: "occupations",
      parent: "plot-main",
      type: "path",
      length: values.series.length
    })
    .editGraphics({
      target: "occupations",
      property: "commands",
      value: values.series.map(series => linearPathCommands(series.points, { close: true }))
    })
    .editGraphics({
      target: "occupations",
      property: "fill",
      value: values.series.map(series => series.color)
    })
    .editGraphics({ target: "occupations", property: "opacity", value: 1 })
    .createGraphics({
      id: "horizontalGrid",
      parent: "plot-main",
      type: "line",
      length: values.yTicks.length,
      before: "occupations"
    })
    .editGraphics({ target: "horizontalGrid", property: "x1", value: plot.left })
    .editGraphics({ target: "horizontalGrid", property: "y1", value: y })
    .editGraphics({ target: "horizontalGrid", property: "x2", value: plot.right })
    .editGraphics({ target: "horizontalGrid", property: "y2", value: y })
    .editGraphics({ target: "horizontalGrid", property: "stroke", value: "#e2e8f0" })
    .editGraphics({ target: "horizontalGrid", property: "strokeWidth", value: 1 })
    .createGraphics({ id: "zeroRule", parent: "plot-main", type: "line" })
    .editGraphics({ target: "zeroRule", property: "x1", value: plot.left })
    .editGraphics({ target: "zeroRule", property: "y1", value: values.zeroY })
    .editGraphics({ target: "zeroRule", property: "x2", value: plot.right })
    .editGraphics({ target: "zeroRule", property: "y2", value: values.zeroY })
    .editGraphics({ target: "zeroRule", property: "stroke", value: "#475569" })
    .editGraphics({ target: "zeroRule", property: "strokeWidth", value: 1.2 })
    .createGraphics({ id: "xAxis", parent: "plot-main", type: "line" })
    .editGraphics({ target: "xAxis", property: "x1", value: plot.left })
    .editGraphics({ target: "xAxis", property: "y1", value: plot.bottom })
    .editGraphics({ target: "xAxis", property: "x2", value: plot.right })
    .editGraphics({ target: "xAxis", property: "y2", value: plot.bottom })
    .editGraphics({ target: "xAxis", property: "stroke", value: "#94a3b8" })
    .editGraphics({ target: "xAxis", property: "strokeWidth", value: 1 })
    .createGraphics({ id: "xTicks", parent: "plot-main", type: "line", length: x.length })
    .editGraphics({ target: "xTicks", property: "x1", value: x })
    .editGraphics({ target: "xTicks", property: "y1", value: plot.bottom })
    .editGraphics({ target: "xTicks", property: "x2", value: x })
    .editGraphics({ target: "xTicks", property: "y2", value: plot.bottom + 5 })
    .editGraphics({ target: "xTicks", property: "stroke", value: "#94a3b8" })
    .editGraphics({ target: "xTicks", property: "strokeWidth", value: 1 });

  program = addText(program, {
    id: "title",
    x: plot.left,
    y: 25,
    text: title,
    fill: "#0f172a",
    fontSize: 17,
    fontWeight: 600
  });
  program = addText(program, {
    id: "subtitle",
    x: plot.left,
    y: 50,
    text: subtitle,
    fill: "#64748b",
    fontSize: 11
  });
  program = addText(program, {
    id: "xLabels",
    parent: "plot-main",
    x,
    y: plot.bottom + 19,
    text: values.xTicks.map(tick => tick.label),
    textAlign: "center"
  });
  program = addText(program, {
    id: "yLabels",
    parent: "plot-main",
    x: plot.left - 10,
    y,
    text: values.yTicks.map(tick => tick.label),
    textAlign: "right"
  });
  program = addText(program, {
    id: "seriesLabels",
    parent: "plot-main",
    x: values.series.map(series => series.label.x),
    y: values.series.map(series => series.label.y),
    text: values.series.map(series => series.label.text),
    fill: values.series.map(series => series.color),
    fontSize: 11,
    fontWeight: 600
  });
  return program;
}

export function createCenteredAreaStreamPrimitives(jobs) {
  const values = createCenterAreaReferenceValues(jobs);
  const zero = createPanel({ ...values.zero, rows: values.rows }, {
    title: "Zero stack",
    subtitle: "Actual U.S. occupation counts · baseline starts at 0"
  });
  const center = createPanel({ ...values.center, rows: values.rows }, {
    title: "Center stack",
    subtitle: "Same values and order · baseline = -total / 2"
  });
  return hconcat({
    id: "centeredAreaStreamComparison",
    programs: [
      { id: "zero", program: zero },
      { id: "center", program: center }
    ],
    gap: CENTER_AREA_LAYOUT.gap,
    padding: CENTER_AREA_LAYOUT.padding,
    align: "start"
  });
}
