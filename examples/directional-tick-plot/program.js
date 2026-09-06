import { chart, hconcat } from "../../src/index.js";

import {
  ANCHORS,
  COMPASS_RING,
  DIRECTION_ROWS,
  DIRECTION_LAYOUT,
  DIRECTIONAL_TRIANGLE_AREA,
  LABELS,
  RUG_LAYOUT,
  prepareHorsepowerRug
} from "./fixture.js";

function panelBase({ title, subtitle }) {
  return chart()
    .createCanvas({
      width: DIRECTION_LAYOUT.panelWidth,
      height: DIRECTION_LAYOUT.panelHeight,
      margin: { top: 130, right: 90, bottom: 70, left: 90 },
      background: "#ffffff"
    })
    .createData({
      id: "directions",
      values: DIRECTION_ROWS.map(row => ({ ...row, area: 0.5 }))
    })
    .createGraphics({ id: "compassRing", parent: "plot-main", type: "path" })
    .editGraphics({ target: "compassRing", property: "commands", value: COMPASS_RING })
    .editGraphics({ target: "compassRing", property: "stroke", value: "#e2e8f0" })
    .editGraphics({ target: "compassRing", property: "strokeWidth", value: 1 })
    .createGraphics({ id: "crosshair", parent: "plot-main", type: "line", length: 2 })
    .editGraphics({
      target: "crosshair",
      property: "x1",
      value: [90, DIRECTION_LAYOUT.center.x]
    })
    .editGraphics({
      target: "crosshair",
      property: "y1",
      value: [DIRECTION_LAYOUT.center.y, 130]
    })
    .editGraphics({
      target: "crosshair",
      property: "x2",
      value: [250, DIRECTION_LAYOUT.center.x]
    })
    .editGraphics({
      target: "crosshair",
      property: "y2",
      value: [DIRECTION_LAYOUT.center.y, 290]
    })
    .editGraphics({ target: "crosshair", property: "stroke", value: "#f1f5f9" })
    .editGraphics({ target: "crosshair", property: "strokeWidth", value: 1 })
    .createGraphics({
      id: "anchors",
      parent: "plot-main",
      type: "circle",
      length: ANCHORS.length
    })
    .editGraphics({ target: "anchors", property: "x", value: ANCHORS.map(point => point.x) })
    .editGraphics({ target: "anchors", property: "y", value: ANCHORS.map(point => point.y) })
    .editGraphics({ target: "anchors", property: "radius", value: 3 })
    .editGraphics({ target: "anchors", property: "fill", value: "#cbd5e1" })
    .createGraphics({
      id: "directionLabels",
      parent: "plot-main",
      type: "text",
      length: LABELS.length
    })
    .editGraphics({ target: "directionLabels", property: "x", value: LABELS.map(label => label.x) })
    .editGraphics({ target: "directionLabels", property: "y", value: LABELS.map(label => label.y) })
    .editGraphics({ target: "directionLabels", property: "text", value: LABELS.map(label => label.text) })
    .editGraphics({ target: "directionLabels", property: "fill", value: "#475569" })
    .editGraphics({ target: "directionLabels", property: "fontSize", value: 11 })
    .editGraphics({ target: "directionLabels", property: "fontFamily", value: "sans-serif" })
    .editGraphics({ target: "directionLabels", property: "fontWeight", value: 500 })
    .editGraphics({ target: "directionLabels", property: "textAlign", value: "center" })
    .editGraphics({ target: "directionLabels", property: "textBaseline", value: "middle" })
    .createGraphics({ id: "panelTitle", parent: "canvas", type: "text" })
    .editGraphics({ target: "panelTitle", property: "x", value: 170 })
    .editGraphics({ target: "panelTitle", property: "y", value: 24 })
    .editGraphics({ target: "panelTitle", property: "text", value: title })
    .editGraphics({ target: "panelTitle", property: "fill", value: "#0f172a" })
    .editGraphics({ target: "panelTitle", property: "fontSize", value: 16 })
    .editGraphics({ target: "panelTitle", property: "fontFamily", value: "sans-serif" })
    .editGraphics({ target: "panelTitle", property: "fontWeight", value: 600 })
    .editGraphics({ target: "panelTitle", property: "textAlign", value: "center" })
    .editGraphics({ target: "panelTitle", property: "textBaseline", value: "middle" })
    .createGraphics({ id: "panelSubtitle", parent: "canvas", type: "text" })
    .editGraphics({ target: "panelSubtitle", property: "x", value: 170 })
    .editGraphics({ target: "panelSubtitle", property: "y", value: 49 })
    .editGraphics({ target: "panelSubtitle", property: "text", value: subtitle })
    .editGraphics({ target: "panelSubtitle", property: "fill", value: "#64748b" })
    .editGraphics({ target: "panelSubtitle", property: "fontSize", value: 11 })
    .editGraphics({ target: "panelSubtitle", property: "fontFamily", value: "sans-serif" })
    .editGraphics({ target: "panelSubtitle", property: "fontWeight", value: "normal" })
    .editGraphics({ target: "panelSubtitle", property: "textAlign", value: "center" })
    .editGraphics({ target: "panelSubtitle", property: "textBaseline", value: "middle" });
}

function positions(program, target) {
  return program
    .encodeX({
      target,
      field: "x",
      scale: { domain: [-1, 1] }
    })
    .encodeY({
      target,
      field: "y",
      scale: { domain: [-1, 1] }
    });
}

export function createDirectionalTickPointComparison() {
  const baseline = positions(panelBase({
    title: "Tick · 0° baseline",
    subtitle: "All centered glyphs stay vertical"
  }).createTickMark({
    id: "ticks",
    length: DIRECTION_LAYOUT.tickLength,
    stroke: "#64748b",
    strokeWidth: 4
  }), "ticks");

  const directionalTicks = positions(panelBase({
    title: "Tick · direction field",
    subtitle: "0° up · clockwise positive"
  }).createTickMark({
    id: "ticks",
    length: DIRECTION_LAYOUT.tickLength,
    stroke: "#2563eb",
    strokeWidth: 4
  }), "ticks").encodeAngle({ target: "ticks", field: "direction" });

  const directionalPoints = positions(panelBase({
    title: "Point · direction field",
    subtitle: "Same angles · triangle-up"
  }).createPointMark({
    id: "points",
    shape: "triangle-up",
    fill: "#f97316",
    stroke: "#ffffff",
    strokeWidth: 1
  }), "points")
    .encodeSize({
      target: "points",
      field: "area",
      scale: {
        domain: [0, 1],
        range: [DIRECTIONAL_TRIANGLE_AREA, DIRECTIONAL_TRIANGLE_AREA]
      }
    })
    .encodeAngle({ target: "points", field: "direction" });

  return hconcat({
    id: "directionalTickPointComparison",
    programs: [
      { id: "baseline", program: baseline },
      { id: "directionalTicks", program: directionalTicks },
      { id: "directionalPoints", program: directionalPoints }
    ],
    gap: DIRECTION_LAYOUT.gap,
    padding: DIRECTION_LAYOUT.padding,
    align: "start"
  });
}

export function createHorsepowerRug(cars) {
  const values = prepareHorsepowerRug(cars);
  return chart()
    .createCanvas({
      width: RUG_LAYOUT.width,
      height: RUG_LAYOUT.height,
      margin: { top: 76, right: 40, bottom: 90, left: 60 },
      background: "#ffffff"
    })
    .createData({ id: "cars", values: values.rows })
    .createGraphics({
      id: "grid",
      parent: "plot-main",
      type: "line",
      length: values.axisX.length
    })
    .editGraphics({ target: "grid", property: "x1", value: values.axisX })
    .editGraphics({ target: "grid", property: "y1", value: 76 })
    .editGraphics({ target: "grid", property: "x2", value: values.axisX })
    .editGraphics({ target: "grid", property: "y2", value: RUG_LAYOUT.axisY })
    .editGraphics({ target: "grid", property: "stroke", value: "#e2e8f0" })
    .editGraphics({ target: "grid", property: "strokeWidth", value: 1 })
    .createGraphics({ id: "axis", parent: "plot-main", type: "line" })
    .editGraphics({ target: "axis", property: "x1", value: RUG_LAYOUT.left })
    .editGraphics({ target: "axis", property: "y1", value: RUG_LAYOUT.axisY })
    .editGraphics({ target: "axis", property: "x2", value: RUG_LAYOUT.right })
    .editGraphics({ target: "axis", property: "y2", value: RUG_LAYOUT.axisY })
    .editGraphics({ target: "axis", property: "stroke", value: "#94a3b8" })
    .editGraphics({ target: "axis", property: "strokeWidth", value: 1 })
    .createRugPlot({
      id: "ticks",
      data: "cars",
      x: {
        field: "Horsepower",
        scale: { domain: RUG_LAYOUT.domain }
      },
      edge: "bottom",
      tick: {
        length: RUG_LAYOUT.tickLength,
        stroke: "#2563eb",
        strokeWidth: 1.4,
        opacity: 0.28
      },
      guides: false
    })
    .createGraphics({
      id: "axisLabels",
      parent: "plot-main",
      type: "text",
      length: values.labels.length
    })
    .editGraphics({ target: "axisLabels", property: "x", value: values.axisX })
    .editGraphics({ target: "axisLabels", property: "y", value: 169 })
    .editGraphics({ target: "axisLabels", property: "text", value: values.labels })
    .editGraphics({ target: "axisLabels", property: "fill", value: "#64748b" })
    .editGraphics({ target: "axisLabels", property: "fontSize", value: 11 })
    .editGraphics({ target: "axisLabels", property: "fontFamily", value: "sans-serif" })
    .editGraphics({ target: "axisLabels", property: "textAlign", value: "center" })
    .editGraphics({ target: "axisLabels", property: "textBaseline", value: "middle" })
    .createGraphics({ id: "axisTitle", parent: "canvas", type: "text" })
    .editGraphics({ target: "axisTitle", property: "x", value: 410 })
    .editGraphics({ target: "axisTitle", property: "y", value: 205 })
    .editGraphics({ target: "axisTitle", property: "text", value: "Horsepower" })
    .editGraphics({ target: "axisTitle", property: "fill", value: "#475569" })
    .editGraphics({ target: "axisTitle", property: "fontSize", value: 12 })
    .editGraphics({ target: "axisTitle", property: "fontFamily", value: "sans-serif" })
    .editGraphics({ target: "axisTitle", property: "fontWeight", value: 500 })
    .editGraphics({ target: "axisTitle", property: "textAlign", value: "center" })
    .editGraphics({ target: "axisTitle", property: "textBaseline", value: "middle" })
    .createGraphics({ id: "title", parent: "canvas", type: "text" })
    .editGraphics({ target: "title", property: "x", value: 400 })
    .editGraphics({ target: "title", property: "y", value: 25 })
    .editGraphics({ target: "title", property: "text", value: "Cars · Horsepower distribution" })
    .editGraphics({ target: "title", property: "fill", value: "#0f172a" })
    .editGraphics({ target: "title", property: "fontSize", value: 16 })
    .editGraphics({ target: "title", property: "fontFamily", value: "sans-serif" })
    .editGraphics({ target: "title", property: "fontWeight", value: 600 })
    .editGraphics({ target: "title", property: "textAlign", value: "center" })
    .editGraphics({ target: "title", property: "textBaseline", value: "middle" })
    .createGraphics({ id: "subtitle", parent: "canvas", type: "text" })
    .editGraphics({ target: "subtitle", property: "x", value: 400 })
    .editGraphics({ target: "subtitle", property: "y", value: 49 })
    .editGraphics({
      target: "subtitle",
      property: "text",
      value: `${values.rows.length} observations · one Tick per car`
    })
    .editGraphics({ target: "subtitle", property: "fill", value: "#64748b" })
    .editGraphics({ target: "subtitle", property: "fontSize", value: 11 })
    .editGraphics({ target: "subtitle", property: "fontFamily", value: "sans-serif" })
    .editGraphics({ target: "subtitle", property: "textAlign", value: "center" })
    .editGraphics({ target: "subtitle", property: "textBaseline", value: "middle" });
}
