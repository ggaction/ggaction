import assert from "node:assert/strict";
import test from "node:test";

import {
  normalizeAreaHighlightStyle,
  normalizeBarHighlightStyle,
  normalizeDimOthers,
  normalizePointHighlightStyle,
  normalizeStrokeHighlightStyle
} from "../../../src/materialization/selection/styles.js";

test("normalizes default and explicit highlight recipes by mark family", () => {
  assert.deepEqual(normalizeDimOthers(true), { opacity: 0.25 });
  assert.equal(normalizeDimOthers(false), false);
  assert.deepEqual(normalizePointHighlightStyle({
    color: "red",
    stroke: "white",
    strokeWidth: 1,
    shape: "diamond",
    size: 5,
    offset: { x: 2 }
  }), {
    fill: "red",
    stroke: "white",
    strokeWidth: 1,
    shape: "diamond",
    size: 5,
    offset: { x: 2, y: 0 }
  });
  assert.deepEqual(normalizeBarHighlightStyle({ fill: "blue", opacity: 0.5 }), {
    fill: "blue",
    opacity: 0.5
  });
  assert.deepEqual(normalizeStrokeHighlightStyle({
    color: "black",
    strokeWidth: 2,
    strokeDash: "dashed",
    offset: { y: -1 }
  }, "Line"), {
    stroke: "black",
    strokeWidth: 2,
    strokeDash: [6, 4],
    offset: { x: 0, y: -1 }
  });
  assert.deepEqual(normalizeAreaHighlightStyle({
    color: "green",
    stroke: "black",
    strokeWidth: 1
  }), {
    fill: "green",
    stroke: "black",
    strokeWidth: 1,
    offset: { x: 0, y: 0 }
  });
});

test("rejects options that are invalid for a concrete mark recipe", () => {
  assert.throws(
    () => normalizePointHighlightStyle({ fill: "red", color: "blue" }),
    /color or fill/
  );
  assert.throws(
    () => normalizeBarHighlightStyle({ shape: "circle" }),
    /does not support shape/
  );
  assert.throws(
    () => normalizeStrokeHighlightStyle({ fill: "red" }, "Rule"),
    /does not support fill/
  );
  assert.throws(
    () => normalizeAreaHighlightStyle({ strokeWidth: 2 }),
    /requires stroke/
  );
});
