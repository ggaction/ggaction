import { chart, hconcat } from "../../../src/index.js";

import {
  ANCHORS,
  BASELINE_TICKS,
  COMPASS_RING,
  DIRECTION_ROWS,
  DIRECTIONAL_TICKS,
  DIRECTIONAL_TRIANGLES,
  DIRECTION_LAYOUT,
  LABELS
} from "./reference-values.js";

function panelBase({ title, subtitle }) {
  return chart()
    .createData({ id: "directions", values: DIRECTION_ROWS })
    .createGraphics({ id: "canvas", type: "canvas" })
    .editGraphics({ target: "canvas", property: "width", value: DIRECTION_LAYOUT.panelWidth })
    .editGraphics({ target: "canvas", property: "height", value: DIRECTION_LAYOUT.panelHeight })
    .editGraphics({ target: "canvas", property: "background", value: "#ffffff" })
    .createGraphics({ id: "plot", parent: "canvas", type: "collection" })
    .createGraphics({ id: "compassRing", parent: "plot", type: "path" })
    .editGraphics({ target: "compassRing", property: "commands", value: COMPASS_RING })
    .editGraphics({ target: "compassRing", property: "stroke", value: "#e2e8f0" })
    .editGraphics({ target: "compassRing", property: "strokeWidth", value: 1 })
    .createGraphics({ id: "crosshair", parent: "plot", type: "line", length: 2 })
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
    .createGraphics({ id: "anchors", parent: "plot", type: "circle", length: ANCHORS.length })
    .editGraphics({ target: "anchors", property: "x", value: ANCHORS.map(point => point.x) })
    .editGraphics({ target: "anchors", property: "y", value: ANCHORS.map(point => point.y) })
    .editGraphics({ target: "anchors", property: "radius", value: 3 })
    .editGraphics({ target: "anchors", property: "fill", value: "#cbd5e1" })
    .createGraphics({ id: "directionLabels", parent: "plot", type: "text", length: LABELS.length })
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

function addTicks(program, { id, values, stroke }) {
  return program
    .createGraphics({ id, parent: "plot", type: "line", length: values.length })
    .editGraphics({ target: id, property: "x1", value: values.map(line => line.x1) })
    .editGraphics({ target: id, property: "y1", value: values.map(line => line.y1) })
    .editGraphics({ target: id, property: "x2", value: values.map(line => line.x2) })
    .editGraphics({ target: id, property: "y2", value: values.map(line => line.y2) })
    .editGraphics({ target: id, property: "stroke", value: stroke })
    .editGraphics({ target: id, property: "strokeWidth", value: 4 });
}

export function createDirectionalTickPointPrimitives() {
  const baseline = addTicks(panelBase({
    title: "Tick · 0° baseline",
    subtitle: "All centered glyphs stay vertical"
  }), {
    id: "ticks",
    values: BASELINE_TICKS,
    stroke: "#64748b"
  });

  const directionalTicks = addTicks(panelBase({
    title: "Tick · direction field",
    subtitle: "0° up · clockwise positive"
  }), {
    id: "ticks",
    values: DIRECTIONAL_TICKS,
    stroke: "#2563eb"
  });

  const directionalPoints = panelBase({
    title: "Point · direction field",
    subtitle: "Same angles · triangle-up"
  })
    .createGraphics({
      id: "points",
      parent: "plot",
      type: "path",
      length: DIRECTIONAL_TRIANGLES.length
    })
    .editGraphics({
      target: "points",
      property: "commands",
      value: DIRECTIONAL_TRIANGLES
    })
    .editGraphics({ target: "points", property: "fill", value: "#f97316" })
    .editGraphics({ target: "points", property: "stroke", value: "#ffffff" })
    .editGraphics({ target: "points", property: "strokeWidth", value: 1 });

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
