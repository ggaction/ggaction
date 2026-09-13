import test from "node:test";
import assert from "node:assert/strict";
import {
  normalizeDisplayLabelMap,
  resolveDisplayLabel,
  sameDisplayLabelValue
} from "../../../src/grammar/displayLabels.js";

test("normalizes typed display labels without collapsing display text", () => {
  const source = Object.freeze([
    Object.freeze({ value: 1, label: "one" }),
    Object.freeze({ value: "1", label: "one" }),
    Object.freeze({ value: null, label: "" })
  ]);
  const normalized = normalizeDisplayLabelMap(source, "test labelMap");

  assert.notEqual(normalized, source);
  assert.notEqual(normalized[0], source[0]);
  assert.ok(Object.isFrozen(normalized));
  assert.ok(normalized.every(Object.isFrozen));
  assert.equal(resolveDisplayLabel(1, normalized, String), "one");
  assert.equal(resolveDisplayLabel("1", normalized, String), "one");
  assert.equal(resolveDisplayLabel(null, normalized, () => "fallback"), "");
  assert.equal(resolveDisplayLabel("future", normalized, String), "future");
  assert.equal(sameDisplayLabelValue(0, -0), true);
  assert.equal(sameDisplayLabelValue(1, "1"), false);
});

test("accepts an empty display map and rejects malformed or duplicate entries", () => {
  assert.deepEqual(normalizeDisplayLabelMap([]), []);
  for (const value of [undefined, null, {}, "auto"]) {
    assert.throws(() => normalizeDisplayLabelMap(value), /array/);
  }
  for (const entry of [
    null,
    { value: "A" },
    { label: "A" },
    { value: "A", label: "A", extra: true },
    { value: NaN, label: "A" },
    { value: Infinity, label: "A" },
    { value: {}, label: "A" },
    { value: "A", label: 1 }
  ]) {
    assert.throws(() => normalizeDisplayLabelMap([entry]));
  }
  const symbolEntry = { value: "A", label: "A" };
  symbolEntry[Symbol("extra")] = true;
  assert.throws(() => normalizeDisplayLabelMap([symbolEntry]), /exactly value and label/);
  const hiddenEntry = { value: "A", label: "A" };
  Object.defineProperty(hiddenEntry, "extra", { value: true });
  assert.throws(() => normalizeDisplayLabelMap([hiddenEntry]), /exactly value and label/);
  assert.throws(
    () => normalizeDisplayLabelMap([
      { value: 0, label: "zero" },
      { value: -0, label: "negative zero" }
    ]),
    /duplicate typed value/
  );
});

test("requires a string fallback result only when no typed entry matches", () => {
  const map = normalizeDisplayLabelMap([{ value: true, label: "yes" }]);
  assert.equal(resolveDisplayLabel(true, map, () => 12), "yes");
  assert.throws(() => resolveDisplayLabel(false, map, () => 12), /return a string/);
});
