import test from "node:test";
import assert from "node:assert/strict";
import { encodeRowKey } from "../../../src/core/itemIdentity.js";
import { getErrorDetails } from "../../../src/core/diagnostics.js";
import { resolveGeoLevels } from "../../../src/grammar/geo/levels.js";

const levels = () => [
  { id: "state", keys: ["west", "east", "island"] },
  { id: "county", keys: [1, "1", ["north", 2]], enterZoom: 4.2, exitZoom: 3.8,
    parents: [{ key: "1", parent: "east" }, { key: ["north", 2], parent: "west" }, { key: 1, parent: "west" }] },
  { id: "district", keys: ["a", "b", "c"], enterZoom: 7, exitZoom: 6,
    parents: [{ key: "a", parent: "1" }, { key: "b", parent: 1 }, { key: "c", parent: 1 }] }
];
const entry = (result, level, key) => result.mapping.find(item => item.level === level).regions.find(item => item.key === encodeRowKey(key)).representations;

test("geographic levels keep exact typed parent identity and source region order", () => {
  const input = levels(), before = structuredClone(input), result = resolveGeoLevels(input, { zoom: 0 });
  assert.equal(result.level, "state"); assert.equal(result.levelIndex, 0);
  assert.deepEqual(entry(result, "county", 1), [encodeRowKey("west")]);
  assert.deepEqual(entry(result, "county", "1"), [encodeRowKey("east")]);
  assert.deepEqual(entry(result, "district", "a"), [encodeRowKey("east")]);
  assert.deepEqual(entry(result, "district", "c"), [encodeRowKey("west")]);
  assert.deepEqual(result.mapping[1].regions.map(item => item.key), [1, "1", ["north", 2]].map(encodeRowKey));
  assert.deepEqual(input, before); assert(Object.isFrozen(result.mapping[1].regions[0].representations));
});

test("LOD hysteresis enters at 4.2 and exits strictly below 3.8 without oscillation", () => {
  const input = levels(); let previousLevel = "state";
  const actual = [3.9, 4.1, 4.2, 4.1, 3.9, 3.8, 3.79, 4, 4.2].map(zoom => {
    previousLevel = resolveGeoLevels(input, { zoom, previousLevel }).level; return previousLevel;
  });
  assert.deepEqual(actual, ["state", "state", "county", "county", "county", "county", "state", "state", "county"]);
  assert.equal(resolveGeoLevels(input, { zoom: 8 }).level, "district");
  assert.equal(resolveGeoLevels(input, { zoom: 0, previousLevel: "district" }).level, "state");
  assert.equal(resolveGeoLevels(input, { zoom: 6, previousLevel: "district" }).level, "district");
  assert.equal(resolveGeoLevels(input, { zoom: 5.99, previousLevel: "district" }).level, "county");
});

test("coarse regions map to ordered visible descendants without changing logical county keys", () => {
  const input = levels(), fine = resolveGeoLevels(input, { zoom: 7 }), county = resolveGeoLevels(input, { zoom: 5 });
  assert.deepEqual(entry(fine, "state", "west"), [encodeRowKey("b"), encodeRowKey("c")]);
  assert.deepEqual(entry(fine, "state", "island"), []);
  assert.deepEqual(entry(fine, "county", ["north", 2]), []);
  assert.deepEqual(entry(county, "state", "west"), [encodeRowKey(1), encodeRowKey(["north", 2])]);
  assert.deepEqual(entry(county, "district", "a"), [encodeRowKey("1")]);
  const coarse = resolveGeoLevels(input, { zoom: 0, previousLevel: "district" });
  assert.deepEqual(fine.mapping[1].regions.map(item => item.key), coarse.mapping[1].regions.map(item => item.key));
});

test("empty hierarchy levels and single levels preserve empty representations explicitly", () => {
  const single = resolveGeoLevels([{ id: "empty", keys: [] }], { zoom: 0 });
  assert.deepEqual(single.mapping, [{ level: "empty", regions: [] }]);
  const empty = [{ id: "state", keys: [] }, { id: "county", keys: [], parents: [], enterZoom: 1, exitZoom: 0 }];
  assert.equal(resolveGeoLevels(empty, { zoom: 1 }).level, "county");
  assert.equal(resolveGeoLevels(empty, { zoom: 0, previousLevel: "county" }).level, "county");
  assert.deepEqual(resolveGeoLevels(empty, { zoom: 1 }).mapping.map(level => level.regions), [[], []]);
});

test("invalid thresholds, levels and explicit previous levels are rejected", () => {
  for (const zoom of [-1, NaN, Infinity, "4", undefined]) assert.throws(() => resolveGeoLevels(levels(), { zoom }));
  for (const previousLevel of [undefined, null, "missing", ""]) assert.throws(() => resolveGeoLevels(levels(), { zoom: 0, previousLevel }));
  for (const patch of [{ enterZoom: 3.8 }, { exitZoom: 4.2 }, { enterZoom: NaN }, { exitZoom: -1 }, { enterZoom: undefined }]) {
    const input = levels(); Object.assign(input[1], patch); assert.throws(() => resolveGeoLevels(input, { zoom: 0 }));
  }
  for (const patch of [{ enterZoom: 4 }, { exitZoom: 3 }]) {
    const input = levels(); Object.assign(input[2], patch); assert.throws(() => resolveGeoLevels(input, { zoom: 0 }));
  }
  assert.throws(() => resolveGeoLevels([], { zoom: 0 }));
  assert.throws(() => resolveGeoLevels({}, { zoom: 0 }));
  assert.throws(() => resolveGeoLevels([{ id: "a", keys: [], enterZoom: 1 }], { zoom: 0 }));
  assert.throws(() => resolveGeoLevels([{ id: "a", keys: [] }], { zoom: 0, nearest: true }));
});

test("missing, duplicate, wrong-level and ambiguous typed parent keys fail closed", () => {
  for (const mutate of [
    a => { a[1].id = "state"; }, a => { a[1].keys = [0, -0]; }, a => { a[1].keys = [null]; },
    a => { a[1].parents.pop(); }, a => { a[1].parents[0].key = 1; },
    a => { a[1].parents[0].parent = "absent"; }, a => { a[1].parents[0].key = "absent"; },
    a => { a[1].parents[0].parent = 1; }, a => { a[1].parents[0].extra = true; },
    a => { a[1].keys = {}; }, a => { a[1].parents = {}; }, a => { a[1].parents[0] = null; }
  ]) {
    const input = levels(); mutate(input); const before = structuredClone(input);
    assert.throws(() => resolveGeoLevels(input, { zoom: 4 })); assert.deepEqual(input, before);
  }
});

test("own data and bounded region/output work are checked before getters or partial mappings", () => {
  let calls = 0;
  const hostile = Object.defineProperty({}, "zoom", { enumerable: true, get() { calls++; return 4; } });
  assert.throws(() => resolveGeoLevels(levels(), hostile), /accessors/);
  const input = levels(); Object.defineProperty(input[1].parents[0], "parent", { enumerable: true, get() { calls++; return "west"; } });
  assert.throws(() => resolveGeoLevels(input, { zoom: 0 }), /accessors/); assert.equal(calls, 0);
  assert.throws(() => resolveGeoLevels(Array(1), { zoom: 0 }), /dense/);
  assert.throws(() => resolveGeoLevels(Array(129).fill({}), { zoom: 0 }), error => getErrorDetails(error).code === "resource-limit");
  assert.throws(() => resolveGeoLevels([{ id: "a", keys: Array(100001).fill(1) }], { zoom: 0 }), error => getErrorDetails(error).code === "resource-limit");
  assert.throws(() => resolveGeoLevels([{ id: "a", keys: ["x".repeat(10_000_001)] }], { zoom: 0 }), error => getErrorDetails(error).code === "resource-limit");
  const tooMany = levels(); tooMany[1].parents = Array(100001).fill({});
  assert.throws(() => resolveGeoLevels(tooMany, { zoom: 0 }), error => getErrorDetails(error).code === "resource-limit");
});
