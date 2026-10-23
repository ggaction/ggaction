import assert from "node:assert/strict";
import test from "node:test";
import { chart } from "../../../../src/index.js";
import { measureFacetContentChildren } from "../../../../src/materialization/facets.js";
import { resolveFacetContentFlow } from "../../../../src/layout/facetContentFlow.js";
import { serializeProgram } from "../../../../src/persistence.js";

function base() {
  return chart().createCanvas({ plot: { width: 100, height: 80 },
    margin: { left: 80, right: 80, top: 80, bottom: 80 } })
    .createData({ values: [{ group: "A", x: 0, y: 10 }, { group: "B", x: 10, y: 100 }, { group: "C", x: 20, y: 1000 }] })
    .createScatterPlot({ x: "x", y: "y", guides: false });
}

test("native facet measurement preserves plots, caller state and logical ragged order", () => {
  const program = base().facet({ field: "group", columns: 2 });
  const before = serializeProgram(program), result = measureFacetContentChildren(program);
  assert.deepEqual(result.map(r => [r.row, r.column]), [[0, 0], [0, 1], [1, 0]]);
  for (const r of result) assert(r.bounds.left <= 0 && r.bounds.right >= 100 && r.bounds.top <= 0 && r.bounds.bottom >= 80);
  assert.equal(serializeProgram(program), before);
  assert(Object.isFrozen(result) && Object.isFrozen(result[0].bounds));
  const packed = resolveFacetContentFlow({ children: result, columns: 2, gap: 7 });
  assert.equal(packed.children.length, 3);
  assert(packed.children[1].bounds.left >= packed.children[0].bounds.right + 7);
});

test("sparse observed grids retain occupied coordinates without phantom cells", () => {
  const program = base().facetGrid({ rows: { field: "group" }, columns: { field: "x" }, combinations: "observed" });
  assert.deepEqual(measureFacetContentChildren(program).map(r => [r.row, r.column]), [[0, 0], [1, 1], [2, 2]]);
});

test("outer bottom guides are separate footers and removed guides do not occupy cells", () => {
  const source = base().createAxes({ x: { title: { text: "Bottom caption" } }, y: { title: { text: "Retained side" } } });
  const each = measureFacetContentChildren(source.facet({ field: "group", columns: 2, guides: { axes: "each" } }));
  const outer = measureFacetContentChildren(source.facet({ field: "group", columns: 2, guides: { axes: "outer" } }));
  assert(each.every(r => !r.footerBounds && r.bounds.bottom > 80));
  assert(!outer[0].footerBounds);
  assert(outer[1].footerBounds && outer[2].footerBounds);
  assert(outer[1].bounds.left > each[1].bounds.left);
  assert(outer[0].bounds.bottom < each[0].bounds.bottom);
  assert(outer[1].footerBounds.bottom > outer[1].bounds.bottom);
});

test("native concrete rotated headers contribute only to their observed owner", () => {
  const program = base().facet({ field: "group" });
  const first = program.compositionSpec.children[0];
  const p = { x: 130, y: 30, text: "Owned header", fill: "black", fontSize: 12,
    fontFamily: "sans-serif", textAlign: "center", textBaseline: "middle", rotation: Math.PI / 2 };
  const headers = [{ ownerId: first, type: "text", properties: p }], before = structuredClone(headers);
  const result = measureFacetContentChildren(program, { headerItems: headers });
  assert(result[0].bounds.top < result[1].bounds.top);
  assert.deepEqual(headers, before);
  for (const extra of [[], [{ ...headers[0], properties: { ...p, text: "" } }],
    [{ ...headers[0], properties: { ...p, opacity: 0 } }]]) {
    assert.deepEqual(measureFacetContentChildren(program, { headerItems: extra }), measureFacetContentChildren(program));
  }
});

test("named and mixed-side axes retain component ownership", () => {
  const source = base().createXAxis({ position: "top" }).createYAxis({ title: { text: "Left" } })
    .createXAxis({ id: "lower", scale: "x", coordinate: "main", position: "bottom", title: { text: "Footer" } });
  const program = source.facet({ field: "group", columns: 2, guides: { axes: "outer" } });
  const result = measureFacetContentChildren(program);
  assert(!result[0].footerBounds);
  assert(result[1].footerBounds && result[2].footerBounds);
  assert(result[0].bounds.top < 0 && result[1].bounds.top < 0);
});

test("measurements follow final child guide styles and measured text widths", () => {
  const source = base().createAxes({ x: { title: false }, y: { ticksAndLabels: { values: [10, 1000] }, title: false } });
  const program = source.facet({ field: "group", guides: { axes: "outer" } });
  const before = measureFacetContentChildren(program);
  const changed = source.editYAxisLabels({ fontSize: 18 }).facet({ field: "group", guides: { axes: "outer" } });
  const after = measureFacetContentChildren(changed);
  assert(after[0].bounds.left < before[0].bounds.left);
  assert.deepEqual(measureFacetContentChildren(program), before);
  const measured = source.applyTextMetrics({ profile: { schemaVersion: 1, id: "measured-label",
    measurements: [{ text: "1000", fontFamily: "sans-serif", fontSize: 12,
      fontWeight: 400, fontStyle: "normal", width: 50 }] } })
    .facet({ field: "group", guides: { axes: "outer" } });
  assert(measureFacetContentChildren(measured)[0].bounds.left < before[0].bounds.left);
});

test("translated and clipped native descendants contribute their visible bounds", () => {
  const program = base().facet({ field: "group" }), id = program.compositionSpec.children[0];
  let child = program.children[id].createGraphics({ id: "nested", type: "canvas", parent: "canvas" });
  for (const [property, value] of Object.entries({ x: 30, y: 10, width: 30, height: 30, background: "transparent" })) {
    child = child.editGraphics({ target: "nested", property, value });
  }
  child = child.createGraphics({ id: "nested-dot", type: "circle", parent: "nested" });
  for (const [property, value] of Object.entries({ x: 25, y: 5, radius: 10, fill: "black" })) {
    child = child.editGraphics({ target: "nested-dot", property, value });
  }
  const revised = program._withCompositionState({ compositionSpec: program.compositionSpec,
    children: { ...program.children, [id]: child } });
  const result = measureFacetContentChildren(revised);
  assert.equal(result[0].bounds.left, -35);
  assert.equal(result[0].bounds.top, -70);
  assert.deepEqual(measureFacetContentChildren(program)[0].bounds, { left: -3, right: 100, top: 0, bottom: 83 });
});

test("promoted shared legends do not expand native child packing bounds", () => {
  const source = base().encodeColor({ field: "group" }).createLegend({ labels: { fontSize: 8 } });
  const each = source.facet({ field: "group", guides: { legend: false } });
  const shared = source.facet({ field: "group", guides: { legend: "shared" } });
  const local = measureFacetContentChildren(each), promoted = measureFacetContentChildren(shared);
  assert(local.some((r, i) => r.bounds.right > promoted[i].bounds.right));
  assert(promoted.every(r => r.bounds.right <= 103));
});

test("missing owners and non-facet inputs reject before changing any program", () => {
  assert.throws(() => measureFacetContentChildren(base()), /requires a facet/);
  const program = base().facet({ field: "group" }), before = serializeProgram(program);
  for (const headerItems of [null, [{ ownerId: "missing", type: "text", properties: {} }],
    [{ ownerId: program.compositionSpec.children[0], type: "rect", properties: {} }]]) {
    assert.throws(() => measureFacetContentChildren(program, { headerItems }), /observed child owner/);
  }
  assert.equal(serializeProgram(program), before);
});
