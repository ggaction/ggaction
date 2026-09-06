import test from "node:test";
import assert from "node:assert/strict";
import { mapSequentialColors, CONTINUOUS_COLOR_INTERPOLATIONS, interpolateColorStops, validateSequentialMidpoint } from "../../../../src/grammar/scales/index.js";
const stops = ["blue", "white", "red"];
test("maps asymmetric domains through a numeric midpoint and preserves descending direction", () => {
  assert.deepEqual(mapSequentialColors([-2, -1, 0, 4, 8], [-2, 8], stops, { midpoint: 0 }),
    ["#0000ff", "#8080ff", "#ffffff", "#ff8080", "#ff0000"]);
  assert.deepEqual(mapSequentialColors([8, 4, 0, -1, -2], [8, -2], stops, { midpoint: 0 }),
    ["#0000ff", "#8080ff", "#ffffff", "#ff8080", "#ff0000"]);
});
test("uses each interpolation's central palette sample without assuming white", () => {
  for (const interpolation of CONTINUOUS_COLOR_INTERPOLATIONS) {
    const palette = ["#14365c", "#42895f", "#eb9318"];
    assert.equal(mapSequentialColors([0], [-2, 8], palette, { midpoint: 0, interpolation })[0],
      interpolateColorStops(palette, 0.5, interpolation));
  }
});
test("keeps midpoint mapping finite over extreme domains and tiny distinct endpoints", () => {
  assert.deepEqual(mapSequentialColors([-1e308, 0, 1e308], [-1e308, 1e308], stops, { midpoint: 0 }),
    ["#0000ff", "#ffffff", "#ff0000"]);
  assert.deepEqual(mapSequentialColors([0, Number.MIN_VALUE, Number.MIN_VALUE * 2], [0, Number.MIN_VALUE * 2], stops, { midpoint: Number.MIN_VALUE }),
    ["#0000ff", "#ffffff", "#ff0000"]);
});
test("preserves clamping, unknown fallback and monotonic segments", () => {
  assert.deepEqual(mapSequentialColors([-20, NaN, 80], [-2, 8], stops, { midpoint: 0, clamp: true, unknown: "gray" }),
    ["#0000ff", "gray", "#ff0000"]);
  const colors = mapSequentialColors(Array.from({ length: 101 }, (_, i) => -2 + i / 10), [-2, 8], stops, { midpoint: 0 });
  const channel = (color, i) => parseInt(color.slice(i, i + 2), 16);
  for (let i = 1; i <= 20; i++) assert.ok(channel(colors[i], 1) >= channel(colors[i - 1], 1));
  for (let i = 21; i < colors.length; i++) assert.ok(channel(colors[i], 3) <= channel(colors[i - 1], 3));
});
test("rejects non-finite and boundary midpoints and incompatible scale families", () => {
  for (const midpoint of [NaN, Infinity, -Infinity, "0", null, -2, 8, -3, 9]) {
    assert.throws(() => mapSequentialColors([0], [-2, 8], stops, { midpoint }), /midpoint/);
  }
  for (const type of ["linear", "time", "ordinal", "quantize", "quantile", "threshold"]) {
    assert.throws(() => validateSequentialMidpoint(0, type), /midpoint/);
  }
  assert.throws(() => mapSequentialColors([0], [0, 0], stops, { midpoint: 0 }), /strictly/);
  assert.equal(validateSequentialMidpoint(0, "sequential"), 0);
});
test("auto and omitted midpoint preserve the existing constant-domain behavior", () => {
  assert.deepEqual(mapSequentialColors([0], [0, 0], stops), ["#ffffff"]);
  assert.deepEqual(mapSequentialColors([0, 4], [-2, 8], stops, { midpoint: "auto" }),
    mapSequentialColors([0, 4], [-2, 8], stops));
});
