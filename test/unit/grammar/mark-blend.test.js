import assert from "node:assert/strict";
import test from "node:test";
import { MARK_BLEND_TYPES, validateMarkBlend, validateRequestedMarkBlend } from "../../../src/grammar/markBlend.js";
import { compositeRGBA, readBlendMode } from "../../../src/grammar/compositing.js";
test("mark blend policy is closed and accepts only own option values", () => {
  assert.deepEqual(MARK_BLEND_TYPES, ["point", "bar", "rect", "area", "arc", "text", "line", "rule", "tick"]);
  assert.ok(Object.isFrozen(MARK_BLEND_TYPES));
  for (const type of MARK_BLEND_TYPES) for (const mode of ["normal", "multiply", "screen", "difference"]) {
    assert.equal(validateMarkBlend(mode, type), mode);
    assert.equal(validateRequestedMarkBlend({ blend: mode }, type), undefined);
  }
  for (const type of [undefined, "image", "tree", "unknown"]) assert.throws(() => validateMarkBlend("screen", type), /support blend/);
  for (const mode of [undefined, null, "source-over", "overlay", {}, 1]) assert.throws(() => validateMarkBlend(mode, "point"), /Mark blend/);
  let reads = 0;
  assert.throws(() => validateRequestedMarkBlend({ get blend() { reads++; return "screen"; } }, "point"), /accessors/);
  Object.defineProperty(Object.prototype, "blend", { configurable: true, get() { reads++; return "screen"; } });
  try { validateRequestedMarkBlend({}, "point"); assert.equal(readBlendMode({}), undefined); } finally { delete Object.prototype.blend; }
  assert.equal(reads, 0);
  assert.equal(readBlendMode(undefined), undefined); assert.equal(readBlendMode({blend:"screen"}), "screen");
});
test("omitted composite options never execute inherited getters", () => {
  let reads = 0;
  for (const key of ["mode", "opacity"]) Object.defineProperty(Object.prototype, key, { configurable: true, get() { reads++; return key === "mode" ? "screen" : .2; } });
  let actual;
  try { actual = compositeRGBA([1, 0, 0, 1], [0, 0, 1, 1], {}); }
  finally { delete Object.prototype.mode; delete Object.prototype.opacity; }
  assert.deepEqual(actual, [1, 0, 0, 1]); assert.equal(reads, 0);
});
