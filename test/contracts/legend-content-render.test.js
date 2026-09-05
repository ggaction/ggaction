import assert from "node:assert/strict";
import test from "node:test";
import { chart } from "../../src/index.js";
import { assertRenderedPNG } from "../support/png.js";
import { assertChartProgramsEquivalent } from "../support/chart-equivalence.js";

function contentBase() {
  return chart().createCanvas({ width: 800, height: 700, margin: { right: 300 } })
    .createData({ values: [
      { x: 1, y: 2, g: "A", m: 4 }, { x: 2, y: 3, g: "B", m: 9 },
      { x: 3, y: 4, g: "A", m: 16 }, { x: 4, y: 5, g: "B", m: 25 }
    ] }).createPointMark({ id: "points" }).encodeX({ field: "x" }).encodeY({ field: "y" })
    .encodeColor({ field: "g" }).encodeShape({ field: "g" }).encodeSize({ field: "m" });
}

function colorPrimitive(base, size) {
  const color = base
    .createGraphics({ id: "colorLegendSymbols", type: "rect", length: 2, parent: "canvas" })
    .editGraphics({ target: "colorLegendSymbols", property: "x", value: 508 })
    .editGraphics({ target: "colorLegendSymbols", property: "y", value: [76, 104] })
    .editGraphics({ target: "colorLegendSymbols", property: "width", value: 14 })
    .editGraphics({ target: "colorLegendSymbols", property: "height", value: 12 })
    .editGraphics({ target: "colorLegendSymbols", property: "fill", value: ["#4c78a8", "#f58518"] })
    .editGraphics({ target: "colorLegendSymbols", property: "stroke", value: "white" })
    .editGraphics({ target: "colorLegendSymbols", property: "strokeWidth", value: 0.5 })
    .createGraphics({ id: "colorLegendLabels", type: "text", length: 2, parent: "canvas" })
    .editGraphics({ target: "colorLegendLabels", property: "x", value: 530 })
    .editGraphics({ target: "colorLegendLabels", property: "y", value: [82, 110] })
    .editGraphics({ target: "colorLegendLabels", property: "text", value: ["A", "B"] })
    .editGraphics({ target: "colorLegendLabels", property: "fill", value: "#334155" })
    .editGraphics({ target: "colorLegendLabels", property: "fontSize", value: 12 })
    .editGraphics({ target: "colorLegendLabels", property: "fontFamily", value: "sans-serif" })
    .editGraphics({ target: "colorLegendLabels", property: "fontWeight", value: "normal" })
    .editGraphics({ target: "colorLegendLabels", property: "textAlign", value: "left" })
    .editGraphics({ target: "colorLegendLabels", property: "textBaseline", value: "middle" })
    .createGraphics({ id: "colorLegendTitle", type: "text", parent: "canvas" })
    .editGraphics({ target: "colorLegendTitle", property: "x", value: 508 })
    .editGraphics({ target: "colorLegendTitle", property: "y", value: 50 })
    .editGraphics({ target: "colorLegendTitle", property: "text", value: "g" })
    .editGraphics({ target: "colorLegendTitle", property: "fill", value: "#334155" })
    .editGraphics({ target: "colorLegendTitle", property: "fontSize", value: 13 })
    .editGraphics({ target: "colorLegendTitle", property: "fontFamily", value: "sans-serif" })
    .editGraphics({ target: "colorLegendTitle", property: "fontWeight", value: 600 })
    .editGraphics({ target: "colorLegendTitle", property: "textAlign", value: "left" })
    .editGraphics({ target: "colorLegendTitle", property: "textBaseline", value: "middle" });
  if (!size) return color;
  return color
    .editGraphics({ target: "colorLegendSymbols", property: "x", value: 539 })
    .editGraphics({ target: "colorLegendLabels", property: "x", value: 574 })
    .editGraphics({ target: "colorLegendTitle", property: "x", value: 530 })
    .createGraphics({ id: "sizeLegendSymbols", type: "circle", length: 3, parent: "canvas" })
    .editGraphics({ target: "sizeLegendSymbols", property: "x", value: 546 })
    .editGraphics({ target: "sizeLegendSymbols", property: "y", value: [181, 221, 261] })
    .editGraphics({ target: "sizeLegendSymbols", property: "radius", value: [Math.sqrt(24 / Math.PI), Math.sqrt(110 / Math.PI), Math.sqrt(196 / Math.PI)] })
    .editGraphics({ target: "sizeLegendSymbols", property: "fill", value: "#94a3b8" })
    .editGraphics({ target: "sizeLegendSymbols", property: "opacity", value: 0.7 })
    .createGraphics({ id: "sizeLegendLabels", type: "text", length: 3, parent: "canvas" })
    .editGraphics({ target: "sizeLegendLabels", property: "x", value: 574 })
    .editGraphics({ target: "sizeLegendLabels", property: "y", value: [181, 221, 261] })
    .editGraphics({ target: "sizeLegendLabels", property: "text", value: ["4", "14.5", "25"] })
    .editGraphics({ target: "sizeLegendLabels", property: "fill", value: "#334155" })
    .editGraphics({ target: "sizeLegendLabels", property: "fontSize", value: 12 })
    .editGraphics({ target: "sizeLegendLabels", property: "fontFamily", value: "sans-serif" })
    .editGraphics({ target: "sizeLegendLabels", property: "fontWeight", value: "normal" })
    .editGraphics({ target: "sizeLegendLabels", property: "textAlign", value: "left" })
    .editGraphics({ target: "sizeLegendLabels", property: "textBaseline", value: "middle" })
    .createGraphics({ id: "sizeLegendTitle", type: "text", parent: "canvas" })
    .editGraphics({ target: "sizeLegendTitle", property: "x", value: 530 })
    .editGraphics({ target: "sizeLegendTitle", property: "y", value: 147 })
    .editGraphics({ target: "sizeLegendTitle", property: "text", value: "m" })
    .editGraphics({ target: "sizeLegendTitle", property: "fill", value: "#0f172a" })
    .editGraphics({ target: "sizeLegendTitle", property: "fontSize", value: 13 })
    .editGraphics({ target: "sizeLegendTitle", property: "fontFamily", value: "sans-serif" })
    .editGraphics({ target: "sizeLegendTitle", property: "fontWeight", value: 600 })
    .editGraphics({ target: "sizeLegendTitle", property: "textAlign", value: "left" })
    .editGraphics({ target: "sizeLegendTitle", property: "textBaseline", value: "middle" });
}

function shapePrimitive(base) {
  return base
    .createGraphics({ id: "seriesLegendSymbolPoints", type: "collection", parent: "canvas" })
    .editGraphics({ target: "seriesLegendSymbolPoints", property: "items", value: [
      { type: "circle", properties: { x: 512.5135166683821, y: 82, radius: 4.51351666838205,
        fill: "#4c78a8", stroke: "white", strokeWidth: 0 } },
      { type: "rect", properties: { x: 508.51351666838207, y: 106, width: 7.999999999999999,
        height: 7.999999999999999, fill: "#4c78a8", stroke: "white", strokeWidth: 0 } }
    ] })
    .createGraphics({ id: "seriesLegendLabels", type: "text", length: 2, parent: "canvas" })
    .editGraphics({ target: "seriesLegendLabels", property: "items", value: [
      { type: "text", properties: { x: 527.0270333367641, y: 82, text: "A", fill: "#334155",
        fontSize: 12, fontFamily: "sans-serif", fontWeight: "normal", textAlign: "left", textBaseline: "middle" } },
      { type: "text", properties: { x: 527.0270333367641, y: 110, text: "B", fill: "#334155",
        fontSize: 12, fontFamily: "sans-serif", fontWeight: "normal", textAlign: "left", textBaseline: "middle" } }
    ] })
    .createGraphics({ id: "seriesLegendTitle", type: "text", parent: "canvas" })
    .editGraphics({ target: "seriesLegendTitle", property: "x", value: 508 })
    .editGraphics({ target: "seriesLegendTitle", property: "y", value: 50 })
    .editGraphics({ target: "seriesLegendTitle", property: "text", value: "g" })
    .editGraphics({ target: "seriesLegendTitle", property: "fill", value: "#334155" })
    .editGraphics({ target: "seriesLegendTitle", property: "fontSize", value: 13 })
    .editGraphics({ target: "seriesLegendTitle", property: "fontFamily", value: "sans-serif" })
    .editGraphics({ target: "seriesLegendTitle", property: "fontWeight", value: 600 })
    .editGraphics({ target: "seriesLegendTitle", property: "textAlign", value: "left" })
    .editGraphics({ target: "seriesLegendTitle", property: "textBaseline", value: "middle" });
}

test("matches exact point legend content to independent graphic primitives", async () => {
  for (const variant of ["color-only", "color-size", "shape-only"]) {
    const base = contentBase();
    const size = variant === "color-size";
    const options = { channels: size ? ["color", "size"] : variant === "shape-only" ? ["shape"] : ["color"],
      ...(size ? { count: 3 } : {}) };
    const primitive = variant === "shape-only" ? shapePrimitive(base) : colorPrimitive(base, size);
    const publicProgram = base.createLegend(options);
    assertChartProgramsEquivalent({ primitiveProgram: primitive, publicProgram, compareSemanticSpec: false });
    const artifact = { scope: "charts", capability: "legend-layout", chart: "legend-content",
      variant, title: `Explicit ${variant} content`,
      userFacingCallChain: `base.createLegend(${JSON.stringify(options)})` };
    const png = { width: 800, height: 700, colors: ["#4c78a8", "#f58518"],
      regions: [{ name: "plot", x: 60, y: 20, width: 450, height: 630, minimumInkPixels: 150 }] };
    const expected = await assertRenderedPNG(primitive, { ...png, artifact: { ...artifact, kind: "primitive" } });
    const actual = await assertRenderedPNG(publicProgram, { ...png, artifact: { ...artifact, kind: "user-facing" } });
    assert.equal(actual.pixelHash, expected.pixelHash);
  }
});
