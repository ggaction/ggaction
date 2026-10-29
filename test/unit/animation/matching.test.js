import assert from "node:assert/strict";
import test from "node:test";
import { matchItemIdentities } from "../../../src/grammar/animation/matching.js";
import { chart } from "../../../src/index.js";

const item = (key, role = "body") => ({ key, role });

test("stable item keys classify reordering, insertion and deletion without positional matching", () => {
  const from = [item("a"), item("b"), item("c")];
  const to = [item("c"), item("a"), item("d")];
  assert.deepEqual(matchItemIdentities(from, to), {
    matches: [
      { sourceIndex: 2, targetIndex: 0, key: "c", role: "body" },
      { sourceIndex: 0, targetIndex: 1, key: "a", role: "body" }
    ], enters: [2], exits: [1]
  });
});

test("primitive roles and complete child namespaces distinguish components of one semantic item", () => {
  const from = [item("row", "body"), item("row", "wick"), item('["left","row"]')];
  const to = [item("row", "wick"), item("row", "label"), item('["right","row"]')];
  assert.deepEqual(matchItemIdentities(from, to), {
    matches: [{ sourceIndex: 1, targetIndex: 0, key: "row", role: "wick" }],
    enters: [1, 2], exits: [0, 2]
  });
  // Delimiter concatenation would alias these two identities.
  assert.equal(matchItemIdentities([item("a|b", "c")], [item("a", "b|c")]).matches.length, 0);
});

test("anonymous primitives always enter or exit and empty endpoints remain valid", () => {
  assert.deepEqual(matchItemIdentities([undefined], [undefined]), { matches: [], enters: [0], exits: [0] });
  assert.deepEqual(matchItemIdentities([], []), { matches: [], enters: [], exits: [] });
  assert.deepEqual(matchItemIdentities([], [item("a")]), { matches: [], enters: [0], exits: [] });
  assert.deepEqual(matchItemIdentities([item("a")], []), { matches: [], enters: [], exits: [0] });
});

test("materialized keyed points keep matching when values and row order change", () => {
  const before = chart().createCanvas({ width: 300, height: 220, margin: 30 })
    .createData({ id: "rows", keyField: "id", values: [
      { id: "a", x: 1, y: 2 }, { id: "b", x: 2, y: 3 }, { id: "c", x: 3, y: 4 }
    ] })
    .createScatterPlot({ id: "points", data: "rows", x: "x", y: "y", guides: false });
  const after = before.reviseData({ source: "rows", id: "next", values: [
    { id: "c", x: 8, y: 9 }, { id: "a", x: 2, y: 8 }, { id: "d", x: 5, y: 6 }
  ] });
  const identities = program => program.graphicSpec.objects.points.items.map(({ identity }) =>
    ({ key: identity.key, role: identity.role }));
  const result = matchItemIdentities(identities(before), identities(after));
  assert.deepEqual(result.matches.map(({ sourceIndex, targetIndex }) => [sourceIndex, targetIndex]), [[2, 0], [0, 1]]);
  assert.deepEqual(result.enters, [2]); assert.deepEqual(result.exits, [1]);
  assert.notDeepEqual(before.graphicSpec.objects.points.items[0].properties, after.graphicSpec.objects.points.items[1].properties);
  assert.deepEqual(before.semanticSpec.datasets[0].values.map(row => row.id), ["a", "b", "c"]);
});

test("large reversals preserve a bijection and admit prototype-like keys as ordinary data", () => {
  const keys = ["__proto__", "constructor", "toString", ...Array.from({ length: 2000 }, (_, i) => `row:${i}`)];
  const result = matchItemIdentities(keys.map(key => item(key)), [...keys].reverse().map(key => item(key)));
  assert.equal(result.matches.length, keys.length);
  assert.deepEqual(result.enters, []); assert.deepEqual(result.exits, []);
  result.matches.forEach(({ sourceIndex, targetIndex, key }) => {
    assert.equal(sourceIndex, keys.length - targetIndex - 1);
    assert.equal(key, keys[sourceIndex]);
  });
});

test("matching copies identity values into immutable results without retaining caller objects", () => {
  const from = [item("a")], to = [item("a")];
  const result = matchItemIdentities(from, to);
  from[0].key = "changed"; to[0].role = "changed";
  assert.deepEqual(result.matches, [{ sourceIndex: 0, targetIndex: 0, key: "a", role: "body" }]);
  for (const value of [result, result.matches, result.matches[0], result.enters, result.exits]) assert.ok(Object.isFrozen(value));
  assert.deepEqual(structuredClone(result), result);
});

test("ambiguous or malformed identities fail at either endpoint without exposing keys or executing accessors", () => {
  const duplicate = [item("private-row-key"), item("private-row-key")];
  for (const [from, to] of [[duplicate, []], [[], duplicate]]) {
    assert.throws(() => matchItemIdentities(from, to), error =>
      /ambiguous/.test(error.message) && !error.message.includes("private-row-key"));
  }
  const invalid = [null, {}, { key: "a" }, { role: "body" }, item(""), item("a", ""), item(1),
    { key: "a", role: "body", extra: true }, new Date()];
  for (const identity of invalid) {
    assert.throws(() => matchItemIdentities([identity], []));
    assert.throws(() => matchItemIdentities([], [identity]));
  }
  for (const endpoint of [null, {}, Array(1), Object.assign([], { extra: true })]) {
    assert.throws(() => matchItemIdentities(endpoint, []));
    assert.throws(() => matchItemIdentities([], endpoint));
  }
  let calls = 0;
  const identity = Object.defineProperty({ role: "body" }, "key", {
    enumerable: true, get() { calls++; return "a"; }
  });
  const endpoint = Object.defineProperty([item("a")], "0", {
    enumerable: true, get() { calls++; return item("a"); }
  });
  assert.throws(() => matchItemIdentities([identity], []), /accessors/);
  assert.throws(() => matchItemIdentities([], endpoint), /accessors/);
  assert.equal(calls, 0);
});
