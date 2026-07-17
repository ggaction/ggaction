import assert from "node:assert/strict";
import test from "node:test";

import {
  CARTESIAN_POSITION_CHANNELS,
  CATEGORICAL_LEGEND_CHANNELS,
  COLOR_LAYOUTS,
  ENCODING_CHANNELS,
  LEGEND_CONFIG_KINDS,
  MARK_TYPES,
  POLAR_POSITION_CHANNELS,
  POSITION_CHANNELS,
  SCALED_ENCODING_CHANNELS,
  STACK_MODES
} from "../../../src/core/vocabulary.js";

test("owns the implemented semantic and legend vocabularies in one module", () => {
  assert.deepEqual(MARK_TYPES, ["point", "line", "bar", "area", "rule"]);
  assert.deepEqual(CARTESIAN_POSITION_CHANNELS, ["x", "y"]);
  assert.deepEqual(POLAR_POSITION_CHANNELS, ["theta", "radius"]);
  assert.deepEqual(POSITION_CHANNELS, ["x", "y", "theta", "radius"]);
  assert.deepEqual(CATEGORICAL_LEGEND_CHANNELS, [
    "color", "strokeDash", "shape"
  ]);
  assert.deepEqual(LEGEND_CONFIG_KINDS, [
    "series", "color", "size", "gradient", "interval", "opacity"
  ]);
  assert.deepEqual(COLOR_LAYOUTS, [
    "stack", "fill", "group", "overlay", "diverging"
  ]);
  assert.deepEqual(STACK_MODES, ["zero", "normalize"]);
  assert.equal(ENCODING_CHANNELS.includes("group"), true);
  assert.equal(ENCODING_CHANNELS.includes("x2"), true);
  assert.equal(SCALED_ENCODING_CHANNELS.includes("group"), false);
  for (const vocabulary of [
    MARK_TYPES,
    CARTESIAN_POSITION_CHANNELS,
    POLAR_POSITION_CHANNELS,
    POSITION_CHANNELS,
    CATEGORICAL_LEGEND_CHANNELS,
    LEGEND_CONFIG_KINDS,
    ENCODING_CHANNELS,
    SCALED_ENCODING_CHANNELS,
    COLOR_LAYOUTS,
    STACK_MODES
  ]) {
    assert.equal(Object.isFrozen(vocabulary), true);
  }
});
