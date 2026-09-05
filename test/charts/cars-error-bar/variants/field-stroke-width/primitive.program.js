import { chart } from "../../../../../src/index.js";

const WIDTH = 520;
const HEIGHT = 320;
const MARGIN = Object.freeze({ top: 40, right: 160, bottom: 40, left: 40 });
const X_DOMAIN = Object.freeze([5, 50]);
const Y_DOMAIN = Object.freeze([40, 240]);
const WEIGHT_DOMAIN = Object.freeze([1500, 5200]);
const WEIGHT_RANGE = Object.freeze([1, 8]);

function map(value, domain, range) {
  return range[0] + (value - domain[0]) /
    (domain[1] - domain[0]) * (range[1] - range[0]);
}

export function weightedRuleRows(cars) {
  return cars.filter(row => [
    row.Acceleration,
    row.Miles_per_Gallon,
    row.Horsepower,
    row.Weight_in_lbs
  ].every(Number.isFinite)).slice(0, 8);
}

export function createCarsWeightedRulePrimitives(cars) {
  const rows = weightedRuleRows(cars);
  const xRange = [MARGIN.left, WIDTH - MARGIN.right];
  const yRange = [HEIGHT - MARGIN.bottom, MARGIN.top];
  const legendValues = Array.from(
    { length: 5 },
    (_, index) => WEIGHT_DOMAIN[0] + index / 4 *
      (WEIGHT_DOMAIN[1] - WEIGHT_DOMAIN[0])
  );
  const legendY = legendValues.map((_, index) => MARGIN.top + 52 + index * 32);
  const legendX = WIDTH - MARGIN.right + 30;

  return chart()
    .createCanvas({ width: WIDTH, height: HEIGHT, margin: MARGIN })
    .createData({ values: rows })
    .editSemantic({ property: "layer[cars].mark.type", value: "rule" })
    .editSemantic({ property: "layer[cars].data", value: "data" })
    .editSemantic({ property: "layer[cars].coordinate", value: "main" })
    .editSemantic({ property: "layer[cars].encoding.x.field", value: "Acceleration" })
    .editSemantic({ property: "layer[cars].encoding.x.fieldType", value: "quantitative" })
    .editSemantic({ property: "layer[cars].encoding.x.scale", value: "x" })
    .editSemantic({ property: "layer[cars].encoding.x2.field", value: "Miles_per_Gallon" })
    .editSemantic({ property: "layer[cars].encoding.x2.fieldType", value: "quantitative" })
    .editSemantic({ property: "layer[cars].encoding.x2.scale", value: "x" })
    .editSemantic({ property: "layer[cars].encoding.y.field", value: "Horsepower" })
    .editSemantic({ property: "layer[cars].encoding.y.fieldType", value: "quantitative" })
    .editSemantic({ property: "layer[cars].encoding.y.scale", value: "y" })
    .editSemantic({ property: "layer[cars].encoding.strokeWidth.field", value: "Weight_in_lbs" })
    .editSemantic({ property: "layer[cars].encoding.strokeWidth.fieldType", value: "quantitative" })
    .editSemantic({ property: "layer[cars].encoding.strokeWidth.scale", value: "strokeWidth" })
    .editSemantic({ property: "scale[x].type", value: "linear" })
    .editSemantic({ property: "scale[x].domain", value: X_DOMAIN })
    .editSemantic({ property: "scale[x].range", value: "auto" })
    .editSemantic({ property: "scale[y].type", value: "linear" })
    .editSemantic({ property: "scale[y].domain", value: Y_DOMAIN })
    .editSemantic({ property: "scale[y].range", value: "auto" })
    .editSemantic({ property: "scale[strokeWidth].type", value: "linear" })
    .editSemantic({ property: "scale[strokeWidth].domain", value: WEIGHT_DOMAIN })
    .editSemantic({ property: "scale[strokeWidth].range", value: WEIGHT_RANGE })
    .editSemantic({ property: "coordinate[main].type", value: "cartesian" })
    .editSemantic({ property: "guide.legend.strokeWidth.scale", value: "strokeWidth" })
    .editSemantic({ property: "guide.legend.strokeWidth.title", value: "Weight_in_lbs" })
    .createGraphics({ id: "cars", parent: "plot-main", type: "line", length: rows.length })
    .editGraphics({
      target: "cars",
      property: "x1",
      value: rows.map(row => map(row.Acceleration, X_DOMAIN, xRange))
    })
    .editGraphics({
      target: "cars",
      property: "x2",
      value: rows.map(row => map(row.Miles_per_Gallon, X_DOMAIN, xRange))
    })
    .editGraphics({
      target: "cars",
      property: "y1",
      value: rows.map(row => map(row.Horsepower, Y_DOMAIN, yRange))
    })
    .editGraphics({
      target: "cars",
      property: "y2",
      value: rows.map(row => map(row.Horsepower, Y_DOMAIN, yRange))
    })
    .editGraphics({ target: "cars", property: "stroke", value: "#4c78a8" })
    .editGraphics({
      target: "cars",
      property: "strokeWidth",
      value: rows.map(row => map(row.Weight_in_lbs, WEIGHT_DOMAIN, WEIGHT_RANGE))
    })
    .editGraphics({ target: "cars", property: "strokeDash", value: rows.map(() => []) })
    .editGraphics({ target: "cars", property: "opacity", value: 1 })
    .createGraphics({ id: "strokeWidthLegendSymbols", parent: "canvas", type: "line", length: 5 })
    .editGraphics({ target: "strokeWidthLegendSymbols", property: "x1", value: legendValues.map(() => legendX + 4) })
    .editGraphics({ target: "strokeWidthLegendSymbols", property: "x2", value: legendValues.map(() => legendX + 4 + 32) })
    .editGraphics({ target: "strokeWidthLegendSymbols", property: "y1", value: legendY })
    .editGraphics({ target: "strokeWidthLegendSymbols", property: "y2", value: legendY })
    .editGraphics({ target: "strokeWidthLegendSymbols", property: "stroke", value: "#4c78a8" })
    .editGraphics({
      target: "strokeWidthLegendSymbols",
      property: "strokeWidth",
      value: legendValues.map(value => map(value, WEIGHT_DOMAIN, WEIGHT_RANGE))
    })
    .createGraphics({ id: "strokeWidthLegendLabels", parent: "canvas", type: "text", length: 5 })
    .editGraphics({ target: "strokeWidthLegendLabels", property: "x", value: legendValues.map(() => legendX + 32 + 8 + 12) })
    .editGraphics({ target: "strokeWidthLegendLabels", property: "y", value: legendY })
    .editGraphics({
      target: "strokeWidthLegendLabels",
      property: "text",
      value: legendValues.map(value => String(+value.toPrecision(3)))
    })
    .editGraphics({ target: "strokeWidthLegendLabels", property: "fill", value: "#334155" })
    .editGraphics({ target: "strokeWidthLegendLabels", property: "fontSize", value: 12 })
    .editGraphics({ target: "strokeWidthLegendLabels", property: "fontFamily", value: "sans-serif" })
    .editGraphics({ target: "strokeWidthLegendLabels", property: "fontWeight", value: "normal" })
    .editGraphics({ target: "strokeWidthLegendLabels", property: "textAlign", value: "left" })
    .editGraphics({ target: "strokeWidthLegendLabels", property: "textBaseline", value: "middle" })
    .createGraphics({ id: "strokeWidthLegendTitle", parent: "canvas", type: "text" })
    .editGraphics({ target: "strokeWidthLegendTitle", property: "x", value: legendX })
    .editGraphics({ target: "strokeWidthLegendTitle", property: "y", value: MARGIN.top + 20 })
    .editGraphics({ target: "strokeWidthLegendTitle", property: "text", value: "Weight_in_lbs" })
    .editGraphics({ target: "strokeWidthLegendTitle", property: "fill", value: "#0f172a" })
    .editGraphics({ target: "strokeWidthLegendTitle", property: "fontSize", value: 13 })
    .editGraphics({ target: "strokeWidthLegendTitle", property: "fontFamily", value: "sans-serif" })
    .editGraphics({ target: "strokeWidthLegendTitle", property: "fontWeight", value: 600 })
    .editGraphics({ target: "strokeWidthLegendTitle", property: "textAlign", value: "left" })
    .editGraphics({ target: "strokeWidthLegendTitle", property: "textBaseline", value: "middle" });
}
