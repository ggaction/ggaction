import test from "node:test";
import assert from "node:assert/strict";
import { chart } from "../../../src/index.js";
import { chart as basicChart } from "../../../src/basic.js";
import { serializeProgram, deserializeProgram } from "../../../src/persistence.js";
import { encodeValue, decodeValue } from "../../../src/persistence/codec.js";
import { contourDensityInput } from "../../../src/grammar/contour/input.js";
import { resolveContourResource } from "../../../src/selectors/contours.js";

const grid = { origin: [0, 0], dx: 1, dy: 1, width: 3, height: 3, values: [0, 0, 0, 0, 2, 0, 0, 0, 0] };
const rows = [{ id: "a", x: 0, y: 0, w: 1 }, { id: "b", x: 1, y: 1, w: 2 }];
const frame = { origin: [0, 0], dx: 1, dy: 1, width: 2, height: 2 };
const get = (p, id = "contour") => p.semanticSpec.resources.find(resource => resource.kind === "geometry" && resource.id === id);
const density = () => chart().createData({ id: "points", values: rows, keyField: "id" }).createDensityContourData({ id: "contour",
  x: "x", y: "y", weight: "w", grid: frame, estimator: "histogram", normalization: "count", thresholds: [0, 1, 2] });

test("inline contours store one authoritative grid and preserve exact rings through offline restore", () => {
  const input = structuredClone(grid), before = chart(), snapshot = serializeProgram(before);
  const program = before.createContourData({ id: "contour", grid: input, thresholds: [0, 1, 2] }), resource = get(program);
  assert.deepEqual(resource.inputs, []); assert.deepEqual(resource.provenance.sourceRows, []);
  assert.deepEqual(resource.result.contours.thresholds[1].polygons[0], { outer: [[0.5, 1], [1, 0.5], [1.5, 1], [1, 1.5], [0.5, 1]], holes: [] });
  assert.deepEqual(resource.options, { method: "contour", source: "grid", thresholds: [0, 1, 2] });
  input.values[4] = 99;
  assert.equal(resource.result.contours.grid.values[4], 2);
  assert.equal(program.graphicSpec, before.graphicSpec);
  assert.equal(serializeProgram(before), snapshot);
  const restored = deserializeProgram(serializeProgram(program));
  assert.deepEqual(restored.semanticSpec, program.semanticSpec);
  assert.equal(get(restored.editContourData({ thresholds: [1, 2] })).revision, 1);
  assert.equal(program.trace.children.at(-1).op, "createContourData");
  assert.equal(program.trace.children.at(-1).children[0].op, "editSemantic");
  for (const name of ["createContourData", "createDensityContourData", "editContourData"]) assert.equal(basicChart()[name], undefined);
});

test("density contours retain all row keys and source revisions recompute their scalar values", () => {
  const program = density(), resource = get(program), before = serializeProgram(program);
  assert.deepEqual(resource.result.contours.grid.values, [1, 0, 0, 2]);
  assert.deepEqual(resource.result.density, { totalWeight: 3, sourceCount: 2 });
  assert.equal(resource.inputs[0].id, "points");
  assert.deepEqual(resource.provenance.sourceRows.map(row => row.rowKey), program.semanticSpec.datasets[0].rowKeys);
  const revised = program.reviseData({ source: "points", id: "revised", values: rows.map(row => ({ ...row, w: row.w * 2 })) });
  assert.equal(get(revised).revision, 1);
  assert.equal(get(revised).inputs[0].id, "revised");
  assert.deepEqual(get(revised).result.contours.grid.values, [2, 0, 0, 4]);
  assert.deepEqual(deserializeProgram(serializeProgram(revised)).semanticSpec, revised.semanticSpec);
  assert.equal(serializeProgram(program), before);
});

test("density and inline edits preserve source kind and fail without changing data or traces", () => {
  const program = density(), before = serializeProgram(program), trace = program.trace;
  for (const run of [
    () => program.editContourData({}), () => program.editContourData({ grid }),
    () => program.editContourData({ definition: {} }), () => program.editContourData({ thresholds: undefined }),
    () => program.editContourData({ thresholds: [1, 0] }),
    () => program.reviseData({ source: "points", id: "bad", values: rows.map(row => ({ ...row, w: -1 })) }),
    () => program.reviseData({ source: "points", id: "bad", values: [{ id: "a", x: null, y: 0, w: 1 }] }),
    () => program.removeData({ id: "points" }),
    () => program.createContourData({ id: "contour", grid, thresholds: [1] })
  ]) { assert.throws(run); assert.equal(serializeProgram(program), before); assert.equal(program.trace, trace); }
  const inline = chart().createContourData({ id: "contour", grid, thresholds: [1] });
  assert.throws(() => inline.editContourData({ definition: { estimator: "kde" } }));
  const zero = program.editContourData({ definition: { normalization: "unit" } });
  assert.deepEqual(get(zero).result.contours.grid.values, [1 / 3, 0, 0, 2 / 3]);
});

test("contour restore rejects consistent-looking finite rings and grids that disagree with their source", () => {
  for (const program of [density(), chart().createContourData({ id: "contour", grid, thresholds: [0, 1, 2] })]) {
    const envelope = JSON.parse(serializeProgram(program)), state = decodeValue(envelope.payload);
    const mutations = [
      state => { get(state).result.contours.thresholds[0].polygons = []; },
      state => { get(state).result.contours.bands[0].upperInclusive = true; },
      state => { get(state).result.contours.thresholds[0].polygons[0].outer.reverse(); },
      state => { get(state).options.thresholds = [0, 0, 2]; },
      state => { get(state).options.method = "unknown"; }
    ];
    if (get(program).options.source === "density") mutations.push(
      state => { get(state).result.contours.grid.values[0] += 1; },
      state => { get(state).result.density.totalWeight = 99; },
      state => { get(state).provenance.sourceRows.pop(); },
      state => { get(state).inputs[0].revision += 1; },
      state => { state.semanticSpec.datasets[0].values[0].w = 99; }
    );
    for (const mutate of mutations) {
      const changed = structuredClone(state); mutate(changed);
      assert.throws(() => deserializeProgram(JSON.stringify({ ...envelope, payload: encodeValue(changed) })));
    }
  }
});

test("contour target inference uses current or unique eligible resources and inline removal stays local", () => {
  const program = chart().createContourData({ id: "one", grid, thresholds: [1] }).createContourData({ id: "two", grid, thresholds: [1] });
  assert.equal(get(program.editContourData({ thresholds: [0, 1] }), "two").revision, 1);
  const ambiguous = program._clone({ context: { ...program.context, currentResources: {} } });
  assert.throws(() => ambiguous.editContourData({ thresholds: [0, 1] }), /explicit contour/);
  assert.throws(() => chart().editContourData({ thresholds: [1] }), /explicit contour/);
  const removed = program.removeResource({ kind: "geometry", id: "one" });
  assert.equal(get(removed, "one"), undefined); assert.equal(get(removed, "two"), get(program, "two"));
  const unique = removed._clone({ context: { ...removed.context, currentResources: {} } });
  assert.equal(get(unique.editContourData({ thresholds: [0, 1] }), "two").revision, 1);
  const foreign = { ...unique, semanticSpec: { ...unique.semanticSpec, resources: [{ ...get(unique, "two"), options: { method: "other" } }] } };
  assert.throws(() => resolveContourResource(foreign, "two"), /not a contour/);
});

test("density field and bounded-row preflight rejects missing values without invoking accessors", () => {
  const program = chart().createData({ id: "points", values: [{ x: 0, y: 0 }] });
  const options = { id: "density", x: "x", y: "y", grid: frame, estimator: "histogram", normalization: "unit", thresholds: [0, 1] };
  const ordinary = program.createDensityContourData(options);
  assert.deepEqual(get(ordinary, "density").result.contours.grid.values, [1, 0, 0, 0]);
  const empty = chart().createData({ id: "empty", values: [] }).createDensityContourData(options);
  assert.deepEqual(get(empty, "density").result.contours.grid.values, [0, 0, 0, 0]);
  for (const patch of [{ x: "missing" }, { y: "missing" }, { weight: "missing" }, { weight: undefined }, { x: "" }]) {
    assert.throws(() => program.createDensityContourData({ ...options, ...patch }));
  }
  let reads = 0;
  const oversized = Array(10001); Object.defineProperty(oversized, "0", { get() { reads++; return {}; } });
  assert.throws(() => contourDensityInput(oversized, { x: "x", y: "y" }), /exceed/);
  assert.throws(() => contourDensityInput(null, { x: "x", y: "y" }), /array/);
  const row = {}; Object.defineProperty(row, "x", { enumerable: true, get() { reads++; return 0; } });
  assert.throws(() => contourDensityInput([row], { x: "x", y: "y" }), /accessor|data propert/);
  assert.equal(reads, 0);
  assert.throws(() => program.createContourData({ id: "invalid", grid: { ...grid, origin: [0, Infinity] }, thresholds: [0] }), /finite/);
});

test("stored contour verification rejects structural expansion and malformed bounded rings", () => {
  const original = chart().createContourData({ id: "contour", grid, thresholds: [0, 1, 2] });
  const resource = get(original);
  const change = mutate => { const next = structuredClone(resource); mutate(next); return next; };
  const malformed = [
    r => { r.result.contours.algorithm = "other"; },
    r => { r.result.contours.thresholds.push(r.result.contours.thresholds[0]); },
    r => { r.result.contours.thresholds[0].polygons = Array(10001).fill({ outer: [], holes: [] }); },
    r => { r.result.contours.thresholds[0].polygons[0].holes = Array(10001).fill([]); },
    r => { r.result.contours.thresholds[0].polygons[0].outer = Array(10002).fill([0, 0]); },
    r => { r.result.contours.thresholds[0].polygons[0].outer = [[0, 0], [1, 1]]; },
    r => { r.result.contours.thresholds[0].polygons[0].outer[0] = [0, 0, 1]; },
    r => { r.result.contours.thresholds[0].polygons[0].outer[0] = [null, 0]; },
    r => { r.result.contours.thresholds[0].extra = true; },
    r => { r.result.contours.grid = { ...grid, width: 10001 }; },
    r => { r.inputs = [{ kind: "data", id: "missing", logicalId: "missing", revision: 0 }]; },
    r => { r.provenance.sourceRows = [{ data: "missing", logicalDataId: "missing", revision: 0, rowKey: "key", role: "density-point" }]; }
  ];
  const before = serializeProgram(original), trace = original.trace;
  for (const mutate of malformed) {
    assert.throws(() => original.editSemantic({ property: "resource[geometry:contour]", value: change(mutate) }));
    assert.equal(serializeProgram(original), before); assert.equal(original.trace, trace);
  }
});
