import test from "node:test";
import assert from "node:assert/strict";
import { chart } from "../../../../src/index.js";
import { serializeProgram, deserializeProgram } from "../../../../src/persistence.js";
import { resolveMarkItems } from "../../../../src/materialization/selection/policies/index.js";

const rows = [
  { x: 1, y: 2, category: "A", group: "one" },
  { x: 2, y: 4, category: "A", group: "one" },
  { x: 3, y: 6, category: "B", group: "two" },
  { x: 4, y: 8, category: "B", group: "two" }
];
function source(kind) {
  const p = chart().createCanvas({ plot: { width: 240, height: 200 }, margin: 100 })
    .createData({ id: "data", values: rows });
  return kind === "point"
    ? p.createScatterPlot({ id: "source", x: "x", y: "y", color: "group", guides: false })
    : p.createBarPlot({ id: "source", x: kind === "histogram" ? { field: "x", bin: { maxBins: 4 } } : "category",
      y: { field: "y", aggregate: "sum" }, color: { field: "group", layout: "stack" }, guides: false });
}
const mappings = [
  ["encodeSize", { field: "y", scale: { range: [0, 100] } }],
  ["encodeOpacity", { field: "y" }],
  ["encodeColor", { field: "group" }],
  ["encodeStroke", { field: "group" }],
  ["encodeShape", { field: "group" }]
];
function assertOverlayValues(p, type) {
  const items = resolveMarkItems(p, "overlay");
  assert.ok(items.length > 0);
  assert.equal(items.length, p.graphicSpec.objects.overlay.items.length);
  assert.ok(items.flatMap(item => item.members).every(row => row.group === "one"));
  if (type === "point") {
    const points = p.graphicSpec.objects.overlay.items;
    assert.ok(points.every(point => Number.isFinite(point.properties.x) && Number.isFinite(point.properties.y)));
  }
}
for (const kind of ["point", "aggregate", "histogram"]) {
  for (const [method, options] of mappings) {
    test(`${kind} overlay ${method} rematerializes filtered facet results`, () => {
      const before = source(kind).createOverlay({ id: "overlay", source: "source", type: "point" })
        [method]({ target: "overlay", ...options });
      const snapshot = serializeProgram(before);
      const facets = before.facet({ field: "group", data: "data", columns: 2 });
      const children = Object.values(facets.children);
      assert.equal(children.length, 2);
      assertOverlayValues(children[0], "point");
      const scale = before.semanticSpec.layers.find(layer => layer.id === "overlay").encoding[
        { encodeSize: "size", encodeOpacity: "opacity", encodeColor: "color", encodeStroke: "stroke", encodeShape: "shape" }[method]
      ].scale;
      assert.ok(children.every(child => child.resolvedScales[scale]));
      assert.deepEqual(deserializeProgram(serializeProgram(facets)).graphicSpec, facets.graphicSpec);
      assert.equal(serializeProgram(before), snapshot);
    });
  }
}
for (const type of ["line", "point"]) {
  test(`source filter recomputes ${type} overlay color values before graphics`, () => {
    const before = source("point").createOverlay({ id: "overlay", source: "source", type, orderBy: "x" })
      .encodeColor({ target: "overlay", field: "group", scale: { palette: "set1" } });
    const p = before.filterMarks({ target: "source", field: "group", op: "eq", value: "one" });
    assertOverlayValues(p, type);
    const restored = p.removeMarkFilter({ target: "source" });
    assert.deepEqual(restored.graphicSpec.objects.overlay, before.graphicSpec.objects.overlay);
    assert.deepEqual(deserializeProgram(serializeProgram(p)).graphicSpec, p.graphicSpec);
  });
}
