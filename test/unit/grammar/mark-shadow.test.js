import assert from "node:assert/strict";
import test from "node:test";
import { normalizeMarkShadow, requestedMarkShadow, MARK_SHADOW_TYPES } from "../../../src/grammar/markShadow.js";

test("normalizes one closed immutable shadow style and preserves explicit zero removal", () => {
  assert.deepEqual(MARK_SHADOW_TYPES, ["point", "bar", "rect", "area", "arc", "text", "line", "rule", "tick"]);
  const source = { color: "rgba(20,40,60,.5)" };
  const style = normalizeMarkShadow(source);
  assert.deepEqual(style, { color: source.color, offsetX: 0, offsetY: 0, blurRadius: 0 });
  assert.deepEqual(source, { color: "rgba(20,40,60,.5)" });
  assert.ok(Object.isFrozen(style));
  assert.deepEqual(normalizeMarkShadow({ color: "transparent", offsetX: -2, offsetY: 4, blurRadius: 3 }),
    { color: "transparent", offsetX: -2, offsetY: 4, blurRadius: 3 });
  assert.equal(normalizeMarkShadow(false), false);
  assert.deepEqual(requestedMarkShadow({}), {});
  assert.deepEqual(requestedMarkShadow({ shadow: false }), { shadow: false });
  assert.deepEqual(requestedMarkShadow({ shadow: source }), { shadow: style });
  assert.equal(Object.is(normalizeMarkShadow({ color: "red", offsetX: -0, offsetY: -0, blurRadius: -0 }).blurRadius, -0), false);
});

test("rejects malformed, accessor and environment-dependent shadow input without reads", () => {
  for (const value of [undefined, null, true, 1, [], {}, { color: "currentColor" }, { color: "red", extra: 1 },
    { color: "red", offsetX: NaN }, { color: "red", offsetY: Infinity }, { color: "red", blurRadius: -1 },
    { color: "red", blurRadius: undefined }]) assert.throws(() => normalizeMarkShadow(value));
  let reads = 0;
  assert.throws(() => requestedMarkShadow({ get shadow() { reads++; return false; } }), /accessors/);
  assert.throws(() => normalizeMarkShadow({ get color() { reads++; return "red"; } }), /accessors/);
  const saved = Object.getOwnPropertyDescriptor(Object.prototype, "offsetX");
  Object.defineProperty(Object.prototype, "offsetX", { configurable: true, get() { reads++; return 20; } });
  try {
    assert.equal(normalizeMarkShadow({ color: "red" }).offsetX, 0);
    assert.equal(reads, 0);
  } finally {
    if (saved) Object.defineProperty(Object.prototype, "offsetX", saved);
    else delete Object.prototype.offsetX;
  }
});
