import assert from "node:assert/strict";
import test from "node:test";

import {
  createGraphicBounds,
  DEFAULT_CANVAS,
  DEFAULT_MARGIN,
  normalizeMargin,
  validateCanvasState
} from "../../src/layout/canvas.js";

test("defines immutable canvas defaults", () => {
  assert.deepEqual(DEFAULT_CANVAS, {
    width: 640,
    height: 400,
    background: "white",
    margin: { top: 30, right: 30, bottom: 60, left: 70 }
  });
  assert.equal(Object.isFrozen(DEFAULT_CANVAS), true);
  assert.equal(Object.isFrozen(DEFAULT_MARGIN), true);
});

test("normalizes scalar and partial object margins", () => {
  assert.deepEqual(normalizeMargin(40), {
    top: 40,
    right: 40,
    bottom: 40,
    left: 40
  });
  assert.deepEqual(normalizeMargin({ left: 80 }), {
    top: 30,
    right: 30,
    bottom: 60,
    left: 80
  });
});

test("validates the resolved canvas and computes graphical bounds", () => {
  const state = {
    width: 640,
    height: 400,
    background: "white",
    margin: DEFAULT_MARGIN
  };

  assert.doesNotThrow(() => validateCanvasState(state));
  assert.deepEqual(createGraphicBounds(state), {
    x: 70,
    y: 30,
    width: 540,
    height: 310
  });
});

test("rejects invalid margin and canvas values", () => {
  assert.throws(() => normalizeMargin(-1), /must not be negative/);
  assert.throws(() => normalizeMargin({}), /at least one side/);
  assert.throws(() => normalizeMargin({ start: 1 }), /Unknown canvas margin/);
  assert.throws(() => normalizeMargin({ left: Infinity }), /non-negative number/);
  assert.throws(
    () =>
      validateCanvasState({
        width: 100,
        height: 100,
        background: "white",
        margin: { top: 10, right: 50, bottom: 10, left: 50 }
      }),
    /horizontal margins/
  );
});
