import assert from "node:assert/strict";
import test from "node:test";

import {
  findSelectionPolicy,
  requireSelectionPolicy
} from "../../src/materialization/selection/policies/index.js";

test("keeps one complete selection policy beside every supported mark", () => {
  for (const mark of ["point", "bar", "line", "area", "rule"]) {
    const policy = requireSelectionPolicy(mark);
    assert.equal(typeof policy.resolveItems, "function");
    assert.equal(typeof policy.normalizeHighlightStyle, "function");
    assert.equal(typeof policy.applyHighlightOp, "string");
    assert.equal(typeof policy.rematerializeOp, "string");
    assert.equal(policy.supportedGrains.includes("item"), true);
  }
  assert.deepEqual(barGrains(), ["item", "stack"]);
  assert.equal(findSelectionPolicy("unknown"), undefined);
  assert.throws(() => requireSelectionPolicy("unknown"), /no selection policy/);
});

function barGrains() {
  return [...requireSelectionPolicy("bar").supportedGrains];
}
