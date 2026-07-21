import assert from "node:assert/strict";
import test from "node:test";

import {
  normalizeExpectedColor,
  pixelDiffersFromBackground,
  pixelMatchesColor
} from "../../support/png.js";

test("treats a non-white Canvas background as blank", () => {
  const background = [15, 23, 42, 255];
  assert.equal(pixelDiffersFromBackground(background, background), false);
  assert.equal(pixelDiffersFromBackground([21, 23, 42, 255], background), true);
});

test("matches expected colors with explicit tolerance and pixel thresholds", () => {
  const color = normalizeExpectedColor({
    value: "#4c78a8",
    tolerance: 3,
    minimumPixels: 4
  });
  assert.equal(pixelMatchesColor([78, 120, 170, 255], color), true);
  assert.equal(pixelMatchesColor([90, 120, 170, 255], color), false);
  assert.equal(color.minimumPixels, 4);
});

test("rejects malformed expected color contracts", () => {
  assert.throws(() => normalizeExpectedColor({ value: "#fff", tolerance: -1 }));
  assert.throws(() => normalizeExpectedColor({ value: "#fff", unknown: true }));
  assert.throws(() => normalizeExpectedColor({ tolerance: 2 }));
});
