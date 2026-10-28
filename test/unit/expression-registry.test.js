import test from "node:test";
import assert from "node:assert/strict";
import { getExpressionFunctions } from "../../src/inspection.js";

test("expression registry inspection exposes a closed immutable data-only catalog", () => {
  const descriptors = getExpressionFunctions();
  assert.equal(descriptors, getExpressionFunctions({ registry: "standard@1" }));
  assert.equal(descriptors.length, 30);
  assert.equal(new Set(descriptors.map(descriptor => descriptor.name)).size, 30);
  assert.deepEqual(descriptors.find(descriptor => descriptor.name === "abs"), {
    name: "abs", min: 1, max: 1, inputs: ["number"], output: "number"
  });
  assert.equal(descriptors.find(descriptor => descriptor.name === "coalesce").lazy, true);
  assert.ok(Object.isFrozen(descriptors));
  for (const descriptor of descriptors) {
    assert.ok(Object.isFrozen(descriptor));
    assert.ok(Object.isFrozen(descriptor.inputs));
    assert.ok(Object.values(descriptor).every(value => typeof value !== "function"));
  }
  assert.throws(() => descriptors.push({ name: "custom" }), TypeError);
  assert.throws(() => { descriptors[0].name = "custom"; }, TypeError);
  assert.throws(() => descriptors[0].inputs.push("custom"), TypeError);
});

test("expression registry rejects unsupported revisions and executable option accessors", () => {
  for (const options of [{ registry: "standard@2" }, { registry: undefined }, { registry: "custom@1" }, { extra: true }, null, []]) {
    assert.throws(() => getExpressionFunctions(options));
  }
  let reads = 0;
  const options = { get registry() { reads++; return "standard@1"; } };
  assert.throws(() => getExpressionFunctions(options), /own data/);
  assert.equal(reads, 0);
});
