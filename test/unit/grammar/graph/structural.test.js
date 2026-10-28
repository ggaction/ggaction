import assert from "node:assert/strict";
import test from "node:test";
import { inferGraphGroups, inferGraphSequence } from "../../../../src/grammar/graph/structural.js";

import { structuralKeys as keys, structuralGroups as groups, structuralFixtures } from "../../../oracles/graphStructural.js";
const pairs = result => result.edges.map(({ sourceIndex, targetIndex, weight }) => [keys[sourceIndex], keys[targetIndex], weight]);

test("group clique keeps typed partitions and canonical endpoint identities", () => {
  const result = inferGraphGroups(keys, groups, { ruleId: "group" });
  assert.deepEqual(pairs(result), structuralFixtures[0].expected);
  const reverse = inferGraphGroups([...keys].reverse(), [...groups].reverse(), { ruleId: "group" });
  assert.deepEqual(reverse.edges.map(edge => edge.key), result.edges.map(edge => edge.key));
  assert.ok(Object.isFrozen(result.edges[0]));
});
test("group star uses explicit per-group hubs without cross-group edges", () => {
  const result = inferGraphGroups(keys, groups, { ruleId: "group", mode: "star", hubs: [{ group: [1], key: "b" }, { group: ["1"], key: "e" }] });
  assert.deepEqual(pairs(result), structuralFixtures[1].expected);
  assert.deepEqual(pairs(inferGraphGroups(keys.slice(0, 3), groups.slice(0, 3), { ruleId: "g", mode: "star", hubKey: "c" })), [["a", "c", 1], ["b", "c", 1]]);
  assert.throws(() => inferGraphGroups(keys, groups, { ruleId: "g", mode: "star", hubKey: "b" }), /hub/);
});
test("sequence sorts typed keys on ties and honors grouped lag and inclusive maximum gap", () => {
  const order = [3, 1, 1, 7, 4];
  assert.deepEqual(pairs(inferGraphSequence(keys, groups, order, { ruleId: "seq" })), [["b", "c", 1], ["c", "a", 1], ["e", "d", 1]]);
  assert.deepEqual(pairs(inferGraphSequence(keys, groups, order, { ruleId: "seq", lag: 2, maxGap: 2 })), [["b", "a", 1]]);
  assert.deepEqual(pairs(inferGraphSequence(keys, groups, order, { ruleId: "seq", maxGap: 0 })), [["b", "c", 1]]);
  assert.deepEqual(inferGraphSequence(keys, groups, order, { ruleId: "seq", lag: 20 }).edges, []);
});
test("sequence supports ordinal and explicit temporal order without inferring units", () => {
  assert.deepEqual(pairs(inferGraphSequence(keys.slice(0, 3), groups.slice(0, 3), ["z", "a", "m"], { ruleId: "s" })), [["b", "c", 1], ["c", "a", 1]]);
  assert.deepEqual(pairs(inferGraphSequence(keys.slice(0, 3), groups.slice(0, 3), [1578009600000, 1577836800000, 1577923200000], { ruleId: "s", temporalUnit: "timestamp", maxGap: 86400000 })), [["b", "c", 1], ["c", "a", 1]]);
  assert.throws(() => inferGraphSequence(keys.slice(0, 2), groups.slice(0, 2), ["a", "b"], { ruleId: "s", maxGap: 1 }), /maxGap/);
  assert.throws(() => inferGraphSequence(keys.slice(0, 2), groups.slice(0, 2), [1, "b"], { ruleId: "s" }), /mixed/);
});
test("missing groups and orders have explicit error, inclusion and omission policies", () => {
  const missingGroups = [[null], [null], [undefined], [undefined], [1]];
  assert.throws(() => inferGraphGroups(keys, missingGroups, { ruleId: "g" }), /missing/);
  assert.deepEqual(pairs(inferGraphGroups(keys, missingGroups, { ruleId: "g", missing: "include" })), [["a", "b", 1], ["c", "d", 1]]);
  const result = inferGraphGroups(keys, missingGroups, { ruleId: "g", missing: "omit-node" });
  assert.deepEqual(result.sourceIndices, [4]); assert.equal(result.omitted.length, 4);
  assert.throws(() => inferGraphSequence(keys, groups, [1, null, 2, 3, 4], { ruleId: "s" }), /missing/);
  assert.deepEqual(pairs(inferGraphSequence(keys, groups, [1, null, 2, 3, 4], { ruleId: "s", missing: "omit-node" })), [["a", "c", 1], ["d", "e", 1]]);
});
test("empty and singleton structural graphs do not invent edges or require unnecessary hubs", () => {
  assert.deepEqual(inferGraphGroups([], [], { ruleId: "g", mode: "star" }).edges, []);
  assert.deepEqual(inferGraphGroups(["a"], [[]], { ruleId: "g", mode: "star" }).edges, []);
  assert.deepEqual(inferGraphSequence([], [], [], { ruleId: "s" }).edges, []);
});
test("structural graph invalid choices and inconsistent hubs fail atomically", () => {
  const before = structuredClone(groups);
  for (const options of [{ ruleId: "" }, { ruleId: "g", mode: "x" }, { ruleId: "g", metric: "euclidean" }, { ruleId: "g", missing: null }, { ruleId: "g", hubKey: "a" },
    { ruleId: "g", mode: "star", hubKey: "missing" }, { ruleId: "g", mode: "star", hubs: [] },
    { ruleId: "g", mode: "star", hubKey: "a", hubs: [] }, { ruleId: "g", mode: "star", hubs: [{ group: [1], key: "e" }] },
    { ruleId: "g", mode: "star", hubs: [{ group: [7], key: "a" }] },
    { ruleId: "g", mode: "star", hubs: [{ group: [1], key: "a" }, { group: [1], key: "b" }] }]) assert.throws(() => inferGraphGroups(keys, groups, options));
  for (const options of [{ ruleId: "s", lag: 0 }, { ruleId: "s", lag: null }, { ruleId: "s", maxGap: -1 }, { ruleId: "s", missing: "include" },
    { ruleId: "s", metric: "euclidean" }, { ruleId: "s", temporalUnit: "day" }]) assert.throws(() => inferGraphSequence(keys, groups, [1, 2, 3, 4, 5], options));
  assert.deepEqual(groups, before);
});
test("structural graph inputs are dense, unique, bounded and accessor-safe", () => {
  assert.throws(() => inferGraphGroups(["a", "a"], [[1], [1]], { ruleId: "g" }), /unique/);
  for (const value of [null, [], Array(5), [[1], [1]], [[{}], [1], [1], [1], [1]], [[1], [1, 2], [1], [1], [1]]]) assert.throws(() => inferGraphGroups(keys, value, { ruleId: "g" }));
  assert.throws(() => inferGraphSequence(keys, groups, [], { ruleId: "s" }), /length/);
  const many = Array.from({ length: 150 }, (_, i) => i);
  assert.throws(() => inferGraphGroups(many, many.map(() => [1]), { ruleId: "g" }), /edges/);
  assert.throws(() => inferGraphGroups(Array(10001), [], { ruleId: "g" }), /nodes/);
  let reads = 0;
  const malicious = Object.defineProperty({ ruleId: "g" }, "mode", { enumerable: true, get() { reads++; return "clique"; } });
  assert.throws(() => inferGraphGroups(keys, groups, malicious));
  assert.equal(reads, 0);
});

test("structural tuple keys and hub descriptors retain typed identity", () => {
  const result = inferGraphGroups([[1, "a"], [1, "b"]], [[1], [1]], { ruleId: "g", mode: "star", hubKey: [1, "b"] });
  assert.equal(result.edges.length, 1);
  for (const hubs of [null, [{}], [{ group: [], key: "a" }], [{ group: [1], key: "a", extra: 1 }]]) {
    assert.throws(() => inferGraphGroups(keys, groups, { ruleId: "g", mode: "star", hubs }));
  }
  assert.throws(() => inferGraphGroups([Array(65)], [[1]], { ruleId: "g" }), /wide/);
  assert.throws(() => inferGraphGroups(["a"], [Array(65)], { ruleId: "g" }), /64/);
  assert.throws(() => inferGraphGroups(["a".repeat(1300000)], [[1]], { ruleId: "g" }), /work/);
});

test("structural nested descriptors and edge identity expansion remain bounded", () => {
  const wide = Array(65).fill(0);
  assert.throws(() => inferGraphGroups(keys, groups, { ruleId: "g", mode: "star", hubKey: wide }), /wide/);
  assert.throws(() => inferGraphGroups(["a"], [[[1]]], { ruleId: "g" }), /scalar/);
  let reads = 0;
  const tuple = Object.defineProperty([1], "0", { enumerable: true, get() { reads++; return 1; } });
  assert.throws(() => inferGraphGroups(keys, groups, { ruleId: "g", mode: "star", hubKey: tuple }));
  assert.throws(() => inferGraphGroups(keys, [tuple, ...groups.slice(1)], { ruleId: "g" }));
  assert.throws(() => inferGraphSequence(["a"], [[1]], tuple, { ruleId: "s" }));
  assert.equal(reads, 0);
  const longKeys = Array.from({ length: 100 }, (_, index) => `${index}:${"k".repeat(1000)}`);
  assert.throws(() => inferGraphGroups(longKeys, longKeys.map(() => [1]), { ruleId: "g" }), /work/);
  assert.throws(() => inferGraphSequence(["a"], [[1]], ["v".repeat(1300000)], { ruleId: "s" }), /work/);
});

test("sequence omission provenance is sorted by source after group and order omissions", () => {
  const result = inferGraphSequence(keys, [[1], [1], [1], [null], [1]], [1, null, 2, 3, 4], { ruleId: "s", missing: "omit-node" });
  assert.deepEqual(result.omitted, [{ index: 1, reason: "missing-order" }, { index: 3, reason: "missing-group" }]);
  assert.deepEqual(result.sourceIndices, [0, 2, 4]);
  assert.deepEqual(pairs(result), [["a", "c", 1], ["c", "e", 1]]);
});
