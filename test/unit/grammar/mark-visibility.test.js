import assert from "node:assert/strict";
import test from "node:test";
import { normalizeMarkVisibility, updateVisibilityCategories, visibilityCategories } from "../../../src/grammar/markVisibility.js";
import { validateMarkFilterTransform } from "../../../src/grammar/markFilter.js";

const recipe = extra => ({ channels: ["color"], field: "category", hidden: [1, "1"], scaleDomain: "all-data", ...extra });

test("visibility keeps typed sets, exact boolean edits and previous absent categories immutable", () => {
  const values = [1, "1", false], hidden = ["old", 1], next = updateVisibilityCategories(values, hidden, ["1"], false);
  assert.deepEqual(next, ["old", 1, "1"]);
  assert.deepEqual(updateVisibilityCategories(values, next, [1], true), ["old", "1"]);
  assert.deepEqual(hidden, ["old", 1]); assert.deepEqual(values, [1, "1", false]); assert.ok(Object.isFrozen(next));
  const input = recipe(), normalized = normalizeMarkVisibility(input); input.hidden.push(false);
  assert.deepEqual(normalized.hidden, [1, "1"]); assert.ok(Object.isFrozen(normalized.channels));
  validateMarkFilterTransform({ type: "markFilter", target: "points", visibility: normalized });
});

test("visibility rejects unknown, duplicate, sparse, null, non-finite and executable input before use", () => {
  for (const hidden of [[], [null], [NaN], [Infinity], [1, 1], [0, -0], new Array(2), "auto", [{}]]) {
    assert.throws(() => normalizeMarkVisibility(recipe({ hidden })));
  }
  for (const extra of [{ channel: "color" }, { field: "" }, { field: 1 }, { channels: [] }, { channels: ["color", "color"] }, { channels: ["x"] }, { scaleDomain: "auto" }]) {
    assert.throws(() => normalizeMarkVisibility(recipe(extra)));
  }
  assert.throws(() => updateVisibilityCategories([1], [], ["1"], false), /original category domain/);
  assert.throws(() => updateVisibilityCategories([1], [], [1], "false"), /boolean/);
  assert.throws(() => validateMarkFilterTransform({ type: "markFilter", target: "points", visibility: recipe(), selectors: [{ items: [] }] }));
  let reads = 0; const input = recipe(); Object.defineProperty(input, "hidden", { get() { reads++; return [1]; } });
  assert.throws(() => normalizeMarkVisibility(input)); assert.equal(reads, 0);
  assert.throws(() => visibilityCategories(["x".repeat(10_000_001)]), /work|limit|exceed/i);
});
