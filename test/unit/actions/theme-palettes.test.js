import assert from "node:assert/strict";
import test from "node:test";
import { chart, hconcat } from "../../../src/index.js";
import { getMarkItems } from "../../../src/inspection.js";
import { serializeProgram, deserializeProgram } from "../../../src/persistence.js";
const values = [{ id: "a", x: 1, y: 2, group: 1 }, { id: "b", x: 2, y: 4, group: "1" }, { id: "c", x: 3, y: 1, group: true }];
const base = () => chart().createCanvas({ width: 640, height: 400, margin: 70 }).createData({ id: "raw", values, keyField: "id" })
  .createPointMark({ id: "points" }).encodeX({ field: "x" }).encodeY({ field: "y" });
const palette = ["red", "blue"];
const patterns = [{ type: "pattern", style: "diagonal", foreground: "red" }, { type: "pattern", style: "dots", foreground: "blue" }];
const theme = { base: "light", tokens: { palette } };
const fills = p => p.graphicSpec.objects.points.items.map(item => item.properties.fill);

test("automatic categorical scales use the active palette without changing authored meaning or positions", () => {
  const p = base().encodeColor({ field: "group" }).createLegend({ position: "bottom" }), saved = serializeProgram(p);
  const q = p.applyTheme({ theme });
  assert.deepEqual(fills(q), ["red", "blue", "red"]);
  assert.equal(q.semanticSpec, p.semanticSpec);
  assert.equal(q.resolvedScales.x, p.resolvedScales.x);
  assert.equal(q.resolvedScales.y, p.resolvedScales.y);
  assert.deepEqual(q.graphicSpec.objects.points.items.map(item => [item.identity, item.properties.x, item.properties.y]),
    p.graphicSpec.objects.points.items.map(item => [item.identity, item.properties.x, item.properties.y]));
  assert.deepEqual(q.removeTheme().graphicSpec, p.graphicSpec);
  assert.deepEqual(fills(base().applyTheme({ theme }).encodeColor({ field: "group" })), fills(q));
  assert.deepEqual(fills(deserializeProgram(serializeProgram(q))), fills(q));
  assert.equal(serializeProgram(p), saved);
});

test("authored ranges and continuous color remain independent of categorical theme palettes", () => {
  for (const encoding of [{ field: "group", scale: { range: ["green", "pink"] } }, { field: "y", fieldType: "quantitative" }]) {
    const p = base().encodeColor(encoding), q = p.applyTheme({ theme });
    assert.deepEqual(fills(q), fills(p));
    assert.equal(q.resolvedScales.color, p.resolvedScales.color);
  }
});

test("pattern category identity survives typed keys, legend order, highlight reorder and source revision", () => {
  const p = base().encodeColor({ field: "group" }).createLegend({ position: "bottom" });
  const q = p.applyTheme({ theme: { base: "light", tokens: { palette, patternPalette: patterns } } });
  assert.deepEqual(fills(q).map(fill => fill.style), ["diagonal", "dots", "diagonal"]);
  assert.ok(q.graphicSpec.objects.colorLegendSymbols.items.every(item => item.properties.fill.type === "pattern"));
  assert.deepEqual(q.resolvedScales.color.range, palette);
  const highlighted = q.highlightMarks({ id: "chosen", select: { field: "id", value: "a", op: "eq" }, fill: "lime", bringToFront: true });
  const byId = Object.fromEntries(getMarkItems(highlighted, { target: "points" }).map(item => [item.fields.id, item.geometry[0].properties.fill]));
  assert.equal(byId.a, "lime"); assert.equal(byId.b.style, "dots");
  const restored = highlighted.removeMarkHighlight({ selection: "chosen" });
  assert.deepEqual(fills(restored).map(fill => fill.style), ["diagonal", "dots", "diagonal"]);
  const revised = q.reviseData({ source: "raw", id: "revised", values: [...values].reverse() });
  assert.deepEqual(Object.fromEntries(getMarkItems(revised, { target: "points" }).map(item => [item.fields.id, item.geometry[0].properties.fill.style])), { a: "diagonal", b: "dots", c: "diagonal" });
  assert.deepEqual(q.removeTheme().graphicSpec, p.graphicSpec);
});

test("conditional field branches use their exact selected scale while literal colors retain precedence", () => {
  const p = base().encodeColor({ conditions: [{ when: { version: 2, registry: "standard@1", root: { type: "binary", op: "gte", left: { type: "field", name: "x" }, right: { type: "literal", value: 2 } } },
    value: { field: "group", scale: { id: "branch" } } }], otherwise: { value: "pink" } });
  const q = p.applyTheme({ theme: { base: "light", tokens: { palette, patternPalette: patterns } } });
  assert.equal(fills(q)[0], "pink");
  assert.deepEqual(fills(q).slice(1).map(fill => fill.style), ["dots", "diagonal"]);
});

test("palette inputs are descriptor-safe, copied and bounded; nested descendants restore independently", () => {
  const p = base().encodeColor({ field: "group" });
  const colors = [...palette], copied = p.applyTheme({ theme: { base: "light", tokens: { palette: colors } } });
  colors[0] = "orange"; assert.equal(fills(copied)[0], "red");
  for (const token of ["palette", "patternPalette"]) for (const bad of [[], null, [undefined], Array(2), { 0: "red" }]) {
    assert.throws(() => p.applyTheme({ theme: { base: "light", tokens: { [token]: bad } } }));
  }
  let reads = 0; const bad = ["red"]; Object.defineProperty(bad, "0", { get() { reads++; return "red"; }, enumerable: true });
  assert.throws(() => p.applyTheme({ theme: { base: "light", tokens: { palette: bad } } })); assert.equal(reads, 0);
  const composed = hconcat({ programs: [{ id: "a", program: p }, { id: "b", program: p }] });
  const q = composed.applyTheme({ theme }); assert.deepEqual(fills(q.children.a), ["red", "blue", "red"]);
  assert.deepEqual(q.removeTheme().graphicSpec, composed.graphicSpec);
});
