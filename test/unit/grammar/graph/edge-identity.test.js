import assert from "node:assert/strict";
import test from "node:test";
import { inferredGraphEdgeIdentity } from "../../../../src/grammar/graph/edgeIdentity.js";
import { encodeRowKey } from "../../../../src/core/itemIdentity.js";
const identity = (sourceKey, targetKey, directed = false, ruleId = "neighbors") =>
  inferredGraphEdgeIdentity({ sourceKey, targetKey, directed, ruleId });

test("inferred edge identity preserves surviving endpoints and distinguishes rule and direction", () => {
  assert.deepEqual(identity("a", "b"), identity("b", "a"));
  assert.notEqual(identity("a", "b").key, identity("a", "b", true).key);
  assert.notEqual(identity("a", "b", true).key, identity("b", "a", true).key);
  assert.notEqual(identity("a", "b").key, identity("a", "b", false, "other").key);
  assert.equal(identity("a", "b").sourceKey, encodeRowKey("a"));
  assert.equal(identity("a", "b").targetKey, encodeRowKey("b"));
  assert.ok(Object.isFrozen(identity("a", "b")));
});
test("undirected endpoints use typed scalar and tuple order without delimiter collisions", () => {
  for (const [a, b] of [[false, 0], [1, 1n], [1n, "1"], ["1", new Date(1)], [[1, "a"], [1, "b"]]]) {
    const expected = identity(a, b), reverse = identity(b, a);
    assert.deepEqual(reverse, expected);
    assert.equal(expected.sourceKey, encodeRowKey(a));
  }
  assert.notEqual(identity("a|b", "c").key, identity("a", "b|c").key);
  const source = new Date(1), target = new Date(2), result = identity(source, target);
  source.setTime(99);target.setTime(98);
  assert.equal(result.sourceKey, encodeRowKey(new Date(1)));
  assert.equal(result.targetKey, encodeRowKey(new Date(2)));
});
test("inferred identity rejects self keys, invalid ids, malformed endpoints and nonboolean direction", () => {
  for (const [a, b] of [[-0, 0], [new Date(1), new Date(1)], [[1, "a"], [1, "a"]]]) {
    assert.throws(() => identity(a, b), /self edges/);
  }
  assert.throws(() => identity(null, 1), /Row keys/);
  assert.throws(() => identity(1, 2, false, ""), /ruleId/);
  for (const directed of [null, 1, "false"]) assert.throws(() => identity(1, 2, directed), /boolean/);
  assert.throws(() => inferredGraphEdgeIdentity({ ruleId: "r", sourceKey: 1, targetKey: 2 }), /boolean/);
  assert.throws(() => inferredGraphEdgeIdentity({ ruleId: "r", sourceKey: 1, targetKey: 2, directed: false, extra: 1 }), /Unknown/);
});
