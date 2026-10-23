import assert from "node:assert/strict";
import test from "node:test";
import { chart } from "../../../../src/index.js";
import { chart as basicChart } from "../../../../src/basic.js";
import { deserializeProgram, serializeProgram } from "../../../../src/persistence.js";

const rows = Object.freeze([
  Object.freeze({ group: "A", x: -4.89, y: -4.67 }),
  Object.freeze({ group: "A", x: 0.6, y: 0.6 }),
  Object.freeze({ group: "B", x: 0.6, y: 0.6 }),
  Object.freeze({ group: "B", x: 4.94, y: 4.67 })
]);
const options = Object.freeze({ id: "cells", x: "x", y: "y", bins: Object.freeze({ x: 50, y: 48 }),
  extent: Object.freeze({ x: Object.freeze([-5, 5]), y: Object.freeze([-4.8, 4.8]) }), members: true });
const base = () => chart().createCanvas({ width: 400, height: 300, margin: 40 }).createData({ id: "raw", values: rows });
const current = program => program.semanticSpec.datasets.find(({ id }) => id === program.materializationConfigs.data.bin2d.cells.current);

test("roundtrips, preserves and resets assignment through immutable edits", () => {
  const source = base();
  const first = source.createBin2DData({ ...options, assignment: "step" });
  const before = serializeProgram(first);
  const restored = deserializeProgram(before);
  assert.deepEqual(restored.semanticSpec, first.semanticSpec);
  assert.equal(current(restored).transform[0].assignment, "step");
  const second = restored.editBin2DData({ includeEmpty: true });
  assert.equal(current(second).transform[0].assignment, "step");
  const reset = second.editBin2DData({ assignment: "edges" });
  assert.equal(Object.hasOwn(current(reset).transform[0], "assignment"), false);
  assert.equal(serializeProgram(first), before);
  assert.equal(source.semanticSpec.datasets.length, 1);
  assert.equal(current(first).values.find(row => row.__cells_count === 2).__cells_x0, 0.6000000000000005);
  assert.equal(current(reset).values.find(row => row.__cells_count === 2).__cells_x0, 0.40000000000000036);
  assert.throws(() => first.editBin2DData({ assignment: "step" }), /actual transform or source change/);
  assert.throws(() => reset.editBin2DData({ assignment: "edges" }), /actual transform or source change/);
  for (const assignment of [null, "approximate", false]) {
    assert.throws(() => first.editBin2DData({ assignment }), /assignment must/);
    assert.equal(serializeProgram(first), before);
  }
  assert.deepEqual(rows.map(row => row.x), [-4.89, 0.6, 0.6, 4.94]);
});

test("recomputes dependent members when assignment changes", () => {
  const first = base().createBin2DData(options).filterData({ id: "occupied", source: "cells", field: "__cells_count", predicate: { op: "gt", value: 0 } });
  assert.throws(() => first.editBin2DData({ target: "cells", assignment: "step" }), /depends on it/);
  const next = first.editBin2DData({ target: "cells", assignment: "step", dependents: "recompute" });
  const derived = next.semanticSpec.datasets.find(dataset => dataset.transform?.[0]?.type === "filter");
  assert.equal(derived.source, current(next).id);
  assert.deepEqual(derived.values, current(next).values);
  assert.equal(current(first).transform[0].assignment, undefined);
  assert.deepEqual(current(next).values.flatMap(row => row.__cells_members).sort(), [0, 1, 2, 3]);
});

test("facet replay preserves assignment and source member indexes", () => {
  const program = base().createBin2DData({ ...options, assignment: "step" })
    .createPointMark({ id: "points", data: "cells" })
    .encodeX({ field: "__cells_x0" }).encodeY({ field: "__cells_y0" });
  const faceted = program.facet({ field: "group", data: "raw", guides: { legend: false } });
  for (const id of faceted.compositionSpec.children) {
    const child = faceted.children[id];
    const dataset = child.semanticSpec.datasets.find(dataset => dataset.transform?.[0]?.type === "bin2d" && dataset.id !== "cells");
    assert.equal(dataset.transform[0].assignment, "step");
    assert.equal(dataset.values.reduce((n, row) => n + row.__cells_count, 0), 2);
    assert.deepEqual(dataset.values.flatMap(row => row.__cells_members).sort(), [0, 1]);
  }
});

test("basic and direct derived authoring share canonical step provenance", () => {
  const basic = basicChart().createData({ id: "raw", values: rows }).createBin2DData({ ...options, assignment: "step" });
  const full = base().createBin2DData({ ...options, assignment: "step" });
  assert.deepEqual(current(basic).values, current(full).values);
  const { resolved: _resolved, ...transform } = current(full).transform[0];
  const direct = base().createDerivedData({ id: "direct", source: "raw", transform: [transform] });
  assert.equal(direct.semanticSpec.datasets.at(-1).transform[0].assignment, "step");
  assert.throws(() => base().createDerivedData({ id: "bad", source: "raw", transform: [{ ...transform, assignment: "edges" }] }), /Stored 2D bin assignment/);
});

test("heatmap policy matches its explicit action decomposition and legacy defaults", () => {
  for (const assignment of ["edges", "step"]) {
    const source = base();
    const bin = { bins: options.bins, extent: options.extent, includeEmpty: false, assignment };
    const facade = source.createHeatmap({ x: "x", y: "y", bin, guides: false });
    const data = facade.semanticSpec.datasets.at(-1);
    const t = data.transform[0];
    const explicit = source.createBin2DData({ id: "heatmapBin2DData", x: "x", y: "y", ...bin })
      .createRectMark({ id: "heatmap", data: "heatmapBin2DData" })
      .encodeX({ target: "heatmap", field: t.as.x0, fieldType: "quantitative", scale: { type: "linear", nice: false, zero: false, domain: t.resolved.extent.x } })
      .encodeX2({ target: "heatmap", field: t.as.x1, fieldType: "quantitative" })
      .encodeY({ target: "heatmap", field: t.as.y0, fieldType: "quantitative", scale: { type: "linear", nice: false, zero: false, domain: t.resolved.extent.y } })
      .encodeY2({ target: "heatmap", field: t.as.y1, fieldType: "quantitative" })
      .encodeColor({ target: "heatmap", field: t.as.count, fieldType: "quantitative" });
    assert.deepEqual(facade.semanticSpec, explicit.semanticSpec);
    assert.deepEqual(facade.graphicSpec, explicit.graphicSpec);
    if (assignment === "edges") {
      const legacy = source.createHeatmap({ x: "x", y: "y", bin: { bins: bin.bins, extent: bin.extent, includeEmpty: false }, guides: false });
      assert.equal(JSON.stringify(legacy.semanticSpec), JSON.stringify(facade.semanticSpec));
      assert.equal(JSON.stringify(legacy.graphicSpec), JSON.stringify(facade.graphicSpec));
    }
  }
});

test("source revision replays step assignment without mutating the previous program", () => {
  const first = base().createBin2DData({ ...options, assignment: "step" });
  const before = serializeProgram(first);
  const revised = first.reviseData({ source: "raw", id: "updated", values: rows.map(row => ({ ...row, x: row.x === 0.6 ? row.x - 1e-12 : row.x })) });
  const dataset = revised.semanticSpec.datasets.find(d => d.transform?.[0]?.type === "bin2d");
  assert.equal(dataset.transform[0].assignment, "step");
  assert.equal(dataset.values.find(row => row.__cells_count === 2).__cells_x0, 0.40000000000000036);
  assert.deepEqual(dataset.values.flatMap(row => row.__cells_members).sort(), [0, 1, 2, 3]);
  assert.equal(serializeProgram(first), before);
});
