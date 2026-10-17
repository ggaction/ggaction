// Independent scenes derived from authored domains, plot geometry and guide style
// constants. Do not import a chart, materializer, renderer or public example here.
const lineStyle = { stroke: "#334155", strokeWidth: 1 };
const tickStyle = { stroke: "#64748b", strokeWidth: 1 };
const labelStyle = { fill: "#334155", fontSize: 12, fontFamily: "sans-serif", fontWeight: "normal" };
const titleStyle = { ...labelStyle, fontSize: 13, fontWeight: 600 };
const round2 = value => Math.round(value * 100) / 100;
const item = (type, properties) => ({ type, properties });

export function axisOwnerScene() {
  const plot = { left: 65, top: 55, width: 310, height: 140 };
  const bottom = plot.top + plot.height;
  const x = value => plot.left + value / 10 * plot.width;
  const y = value => bottom - value / 100 * plot.height;
  const quantityFrame = plot.left - 20;
  const shareFrame = plot.left + plot.width + 20;
  const values = [0, 50, 100];
  const scene = {
    canvas: { type: "canvas", properties: { width: 470, height: 270, background: "white" } },
    "plot-main": { type: "collection", parent: "canvas" },
    horizontalGridLines: { type: "line", parent: "plot-main", items: values.map(value => item("line", {
      x1: plot.left, y1: y(value), x2: plot.left + plot.width, y2: y(value),
      stroke: "#e2e8f0", strokeWidth: 1, strokeDash: value === 50 ? [] : [2, 2]
    })) },
    scatterPlot: { type: "circle", parent: "plot-main", items: [[1, 10], [5, 50], [9, 90]].map(([a, b]) =>
      item("circle", { x: x(a), fill: "#4c78a8", y: y(b), radius: 3 })) },
    xAxisLine: { type: "line", parent: "plot-main", properties: {
      x1: plot.left, y1: bottom, x2: plot.left + plot.width, y2: bottom, ...lineStyle } },
    xAxisTitle: { type: "text", parent: "plot-main", properties: {
      x: plot.left + plot.width / 2 + 145, y: bottom - 20, text: "Inside title", ...titleStyle,
      textAlign: "right", textBaseline: "middle", rotation: 0 } }
  };
  for (const [id, frame, side] of [["quantity", quantityFrame, -1], ["share", shareFrame, 1]]) {
    const prefix = `axis_${id}__`;
    scene[prefix + "Line"] = { type: "line", parent: "plot-main", properties: {
      x1: frame, y1: bottom, x2: frame, y2: plot.top, ...lineStyle } };
    scene[prefix + "Ticks"] = { type: "line", parent: "plot-main", items: values.map(value => item("line", {
      x1: side < 0 ? frame - 6 : frame, y1: y(value), x2: side < 0 ? frame : frame + 6, y2: y(value),
      ...tickStyle, ...(side < 0 ? { strokeDash: value === 50 ? [] : [2, 2] } : {}) })) };
    scene[prefix + "Labels"] = { type: "text", parent: "plot-main", items: values.map(value => item("text", {
      x: frame + side * 12, y: y(value), text: side < 0 ? String(value) : (value / 100).toFixed(1),
      ...labelStyle, textAlign: side < 0 ? "right" : "left", textBaseline: "middle" })) };
    scene[prefix + "Title"] = { type: "text", parent: "plot-main", properties: {
      x: frame + (side < 0 ? 10 : 0), y: plot.top + plot.height / 2 - 85,
      text: side < 0 ? "Quantity" : "Share", ...titleStyle, textAlign: "left", textBaseline: "alphabetic", rotation: 0 } };
  }
  return scene;
}

// The resource identity is independently encoded from the authored facet/cell
// names, not read from an existing program's generated graphic IDs.
function cellId(index, role) {
  return "g" + [...`facet-facet-cell-${index}`].map(character =>
    character.codePointAt(0).toString(16).padStart(6, "0")).join("") + "_" + role;
}
export function sharedFacetOwnerScene() {
  const plotWidth = 60, plotHeight = 120, gap = 45;
  const margin = { left: 35, right: 35, top: 33, bottom: 30 };
  const headerBand = 22, width = 4 * plotWidth + 3 * gap + margin.left + margin.right;
  const union = { left: margin.left, top: headerBand + margin.top, width: 4 * plotWidth + 3 * gap, height: plotHeight };
  const symbolRadius = 4, labelFontSize = 12, labelWidth = labelFontSize * 0.61;
  const symbolLabelGap = 8, itemGap = 87.52, padding = 12, borderWidth = 1;
  const itemWidth = 2 * symbolRadius + symbolLabelGap + labelWidth;
  const legendWidth = round2(3 * itemWidth + 2 * itemGap + 2 * padding + borderWidth);
  const legendHeight = labelFontSize + 2 * padding + borderWidth;
  const legendLeft = union.left + (union.width - legendWidth) / 2;
  const legendTop = union.top + union.height + 8;
  const height = legendTop + legendHeight;
  const scene = { canvas: { type: "canvas", properties: { width, height, background: "white" } } };
  const colors = ["#4c78a8", "#f58518", "#54a24b", "#4c78a8"];
  for (let i = 0; i < 4; i += 1) {
    const canvas = cellId(i + 1, "canvas"), plot = cellId(i + 1, "plot-main");
    scene[canvas] = { type: "canvas", parent: "canvas", properties: {
      width: plotWidth + margin.left + margin.right, height: plotHeight + margin.top + margin.bottom,
      background: "transparent", x: i * (plotWidth + gap), y: headerBand } };
    scene[cellId(i + 1, "plot-background")] = { type: "rect", parent: canvas, properties: {
      x: margin.left, y: margin.top, width: plotWidth, height: plotHeight, stroke: "none", strokeWidth: 0, fill: "white" } };
    scene[plot] = { type: "collection", parent: canvas };
    scene[cellId(i + 1, "scatterPlot")] = { type: "circle", parent: plot, items: [item("circle", {
      x: margin.left + (i + 1) / 5 * plotWidth, fill: colors[i],
      y: margin.top + plotHeight - (i + 1) / 5 * plotHeight, radius: 3 })] };
    scene[cellId(i + 1, "plotBorder")] = { type: "rect", parent: plot, properties: {
      x: margin.left + 0.5, y: margin.top + 0.5, width: plotWidth - 1, height: plotHeight - 1,
      fill: "transparent", stroke: "#dddddd", strokeWidth: 1 } };
  }
  scene["facet-headers"] = { type: "collection", parent: "canvas", items: ["One", "Two", "Three", "Four"].map((text, i) => item("text", {
    x: margin.left + plotWidth / 2 + i * (plotWidth + gap), textAlign: "center", y: union.top - 10 - labelFontSize / 2,
    textBaseline: "middle", text, fill: "#0f172a", fontSize: labelFontSize, fontFamily: "sans-serif", fontWeight: 600 })) };
  scene["facet-shared-legend"] = { type: "canvas", parent: "canvas", properties: { x: 0, y: 0, width, height, background: "transparent" } };
  scene.colorLegendBackground = { type: "rect", parent: "facet-shared-legend", properties: {
    x: legendLeft + borderWidth / 2, y: legendTop + borderWidth / 2, width: legendWidth - borderWidth,
    height: legendHeight - borderWidth, fill: "none", stroke: "#999999", strokeWidth: borderWidth } };
  const symbolX = index => round2(legendLeft + padding + borderWidth / 2 + symbolRadius + index * (itemWidth + itemGap));
  const centerY = legendTop + legendHeight / 2;
  scene.colorLegendSymbolPoints = { type: "circle", parent: "facet-shared-legend", items: colors.slice(0, 3).map((fill, i) => item("circle", {
    x: symbolX(i), y: centerY, radius: symbolRadius, fill, stroke: "white", strokeWidth: 0 })) };
  scene.colorLegendLabels = { type: "text", parent: "facet-shared-legend", items: ["A", "B", "C"].map((text, i) => item("text", {
    x: round2(symbolX(i) + symbolRadius + symbolLabelGap), y: centerY, text, ...labelStyle, textAlign: "left", textBaseline: "middle" })) };
  return scene;
}
