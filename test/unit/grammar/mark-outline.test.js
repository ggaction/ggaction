import assert from "node:assert/strict";
import test from "node:test";
import { normalizeMarkOutline, requestedMarkOutline } from "../../../src/grammar/markOutline.js";

test("outline values are closed immutable complete replacements with explicit zero and removal", () => {
  const input = { color: "rgba(12,34,56,.5)", width: 0 };
  const output = normalizeMarkOutline(input);
  assert.deepEqual(output, input); assert.ok(Object.isFrozen(output));
  input.width = 9; assert.equal(output.width, 0);
  assert.equal(normalizeMarkOutline(false), false);
  assert.deepEqual(requestedMarkOutline({}), {});
  assert.deepEqual(requestedMarkOutline({ outline: false, stroke: "black" }), { outline: false });
  assert.deepEqual(requestedMarkOutline({ outline: output, stroke: false }), { outline: output });
  assert.throws(() => requestedMarkOutline({ outline: output, stroke: "black" }), /stroke and outline/);
});

test("invalid outline data is rejected before caller accessors are invoked", () => {
  for (const input of [undefined, null, true, [], {}, { color: "red" }, { width: 2 },
    { color: "currentColor", width: 2 }, { color: "none", width: 2 },
    { color: "red", width: -1 }, { color: "red", width: NaN }, { color: "red", width: Infinity },
    { color: "red", width: 2, extra: false }, Object.create({ color: "red", width: 2 })]) {
    assert.throws(() => normalizeMarkOutline(input));
  }
  let reads = 0;
  assert.throws(() => normalizeMarkOutline({ get color() { reads++; return "red"; }, width: 2 }), /accessors/);
  assert.throws(() => requestedMarkOutline({ get outline() { reads++; return { color: "red", width: 2 }; } }), /accessors/);
  assert.equal(reads, 0);
});
