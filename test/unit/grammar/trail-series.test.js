import assert from "node:assert/strict";
import test from "node:test";
import { deriveTrailSeries, normalizeTrailWidth, validateTrailMeaning } from "../../../src/grammar/trailSeries.js";
const layer = (patch = {}) => ({ id: "t", mark: { type: "trail" }, trail: { width: { field: "w" }, missing: "error" },
  encoding: { x: { field: "x", fieldType: "quantitative", scale: "x" }, y: { field: "y", fieldType: "quantitative", scale: "y" } }, ...patch });
const rows = [{ x: 2, y: 3, w: 6, g: "a" }, { x: 0, y: 1, w: 2, g: "a" }, { x: 1, y: 2, w: 4, g: "a" }];

test("Trail shares direct path ordering and preserves original width-to-row identity", () => {
  const source = structuredClone(rows), result = deriveTrailSeries(rows, layer());
  assert.deepEqual(result.series[0].values, [{ x: 0, y: 1, width: 2 }, { x: 1, y: 2, width: 4 }, { x: 2, y: 3, width: 6 }]);
  assert.deepEqual(result.series[0].sourceIndices, [1, 2, 0]);
  assert.deepEqual(result.series[0].vertexSourceIndices, [[1], [2], [0]]);
  assert.equal(result.series[0].hasGaps, false);
  assert.deepEqual(rows, source);
  assert.ok(Object.isFrozen(result.series[0].values));
  const original = layer(), ordered = layer({ encoding: { ...original.encoding, pathOrder: { field: "w", order: "descending" } } });
  assert.deepEqual(deriveTrailSeries(rows, ordered).series[0].sourceIndices, [0, 2, 1]);
});

test("Trail grouping and per-series appearance share the existing path grain", () => {
  const original = layer(), colored = layer({ encoding: { ...original.encoding, color: { field: "g", fieldType: "nominal", scale: "color" } } });
  const values = [...rows, { x: 0, y: 0, w: 0, g: "b" }];
  const result = deriveTrailSeries(values, colored);
  assert.deepEqual(result.series.map(series => series.key), [{ g: "a" }, { g: "b" }]);
  assert.equal(result.series[1].values[0].width, 0);
  const explicit = layer({ encoding: { ...original.encoding, group: { field: "g", fieldType: "nominal" }, color: { field: "w", fieldType: "quantitative", scale: "c" } } });
  assert.throws(() => deriveTrailSeries(rows, explicit), /one value within each series/);
});

test("Trail missing width and position split the same ordered runs without changing group values", () => {
  const input = [{ x: 0, y: 1, w: 2 }, { x: 1, y: 3, w: null }, { x: 2, y: 5, w: 4 }, { x: 3, y: null, w: 0 }, { x: 4, y: 9, w: 6 }];
  const original = layer(), target = layer({ trail: { width: { field: "w" }, missing: "break" } });
  const result = deriveTrailSeries(input, target);
  assert.deepEqual(result.series.map(series => series.sourceIndices), [[0], [2], [4]]);
  assert.ok(result.series.every(series => series.hasGaps));
  assert.deepEqual(result.yValues, [1, 5, 9]);
  assert.deepEqual(result.xValues, [0, 2, 4]);
  assert.throws(() => deriveTrailSeries(input, original), /width/);
  assert.throws(() => deriveTrailSeries([{ x: null, y: null, w: -1 }], target), /width/);
  const grouped = { ...target, encoding: { ...target.encoding, group: { field: "y", fieldType: "nominal" } } };
  const groupRows = [{ x: 0, y: 3, w: null, "\0trail-width-gap": 1 }, { x: 1, y: 3, w: 4 }];
  assert.deepEqual(deriveTrailSeries(groupRows, grouped).series[0].key, { y: 3 });
  assert.equal(Object.hasOwn(groupRows[1], "\0trail-width-gap\0"), false);
});

test("Polar Trail uses shared theta ordering, categorical domains and missing separators", () => {
  const original = layer(), target = layer({ encoding: { theta: original.encoding.x, radius: original.encoding.y } });
  const result = deriveTrailSeries(rows, target);
  assert.equal(result.polar, true);
  assert.deepEqual(result.series[0].sourceIndices, [1, 2, 0]);
  const categorical = { ...target, encoding: { ...target.encoding, theta: { ...target.encoding.theta, fieldType: "ordinal" } } };
  const categories = [{ x: "left", y: 1, w: 2 }, { x: "right", y: 2, w: 4 }];
  assert.deepEqual(deriveTrailSeries(categories, categorical, { thetaDomain: ["right", "left"] }).series[0].sourceIndices, [1, 0]);
  const broken = { ...target, trail: { ...target.trail, missing: "break" } };
  assert.deepEqual(deriveTrailSeries([{ x: 350, y: 2, w: 4 }, { x: null, y: 1, w: 2 }, { x: 10, y: 3, w: 4 }], broken).series.map(series => series.sourceIndices), [[0], [2]]);
  assert.throws(() => deriveTrailSeries(categories, { ...categorical, trail: broken.trail }), /quantitative\/temporal/);
});

test("Trail rejects topology-changing positions and ambiguous width bindings", () => {
  assert.deepEqual(normalizeTrailWidth(0), { datum: 0 }); assert.deepEqual(normalizeTrailWidth("w"), { field: "w" });
  assert.equal(deriveTrailSeries(rows, layer({ trail: { width: { datum: 8 }, missing: "error" } })).series[0].values[0].width, 8);
  for (const width of [{}, { field: "w", datum: 2 }, { datum: -1 }, { field: "" }]) assert.throws(() => validateTrailMeaning({ width, missing: "error" }));
  let accessed = false;
  assert.throws(() => validateTrailMeaning({ get width() { accessed = true; return { datum: 2 }; } }), /own data/);
  assert.equal(accessed, false);
  const original = layer();
  for (const positions of [{ x: { ...original.encoding.x, aggregate: "sum" }, y: original.encoding.y }, { x: original.encoding.x }, { theta: original.encoding.x, radius: { ...original.encoding.y, fieldType: "nominal" } }, { ...original.encoding, theta: original.encoding.x, radius: original.encoding.y }, { theta: original.encoding.x, radius: original.encoding.y, pathOrder: { field: "w" } }]) assert.throws(() => deriveTrailSeries(rows, layer({ encoding: positions })));
  assert.throws(() => deriveTrailSeries(rows, layer({ mark: { type: "line" } })), /semantic Trail/);
  assert.throws(() => deriveTrailSeries(rows, layer({ trail: { width: { field: "absent" }, missing: "error" } })), /does not exist/);
  assert.throws(() => deriveTrailSeries([], original));
});
