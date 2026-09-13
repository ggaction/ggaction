import assert from "node:assert/strict";
import test from "node:test";

import {
  ROUNDED_RECT_K,
  materializeRectItem,
  normalizeRectGeometry,
  resolveRoundedRectRadius,
  roundedRectCommands,
  validateCornerRadius
} from "../../../src/grammar/roundedRect.js";

test("normalizes reversed rectangles and clamps radius per item", () => {
  assert.deepEqual(normalizeRectGeometry({
    x: 100,
    y: 20,
    width: -80,
    height: -10
  }), { x: 20, y: 10, width: 80, height: 10 });
  assert.equal(resolveRoundedRectRadius(100, 20, 50), 10);
  assert.equal(resolveRoundedRectRadius(0, 20, 50), 0);
  assert.equal(resolveRoundedRectRadius(100, 0, 50), 0);
});

test("builds the exact deterministic ten-command rounded rectangle", () => {
  const commands = roundedRectCommands({
    x: 0,
    y: 0,
    width: 100,
    height: 20,
    radius: 50
  });
  const c = ROUNDED_RECT_K * 10;

  assert.equal(commands.length, 10);
  assert.deepEqual(commands[0], { op: "M", x: 10, y: 0 });
  assert.deepEqual(commands[1], { op: "L", x: 90, y: 0 });
  assert.deepEqual(commands[2], {
    op: "C",
    x1: 90 + c,
    y1: 0,
    x2: 100,
    y2: 10 - c,
    x: 100,
    y: 10
  });
  assert.deepEqual(commands.at(-1), { op: "Z" });
  assert.equal(Object.isFrozen(commands), true);
  assert.equal(commands.every(Object.isFrozen), true);
});

test("materializes rounded paths and restores legacy rect items at zero", () => {
  const source = {
    x: 100,
    y: 20,
    width: -100,
    height: -20,
    fill: "red",
    stroke: "black",
    strokeWidth: 2,
    lineJoin: "round"
  };
  const snapshot = JSON.stringify(source);
  const rounded = materializeRectItem(source, 50);
  const square = materializeRectItem(source, 0);

  assert.equal(rounded.type, "path");
  assert.equal(rounded.properties.commands.length, 10);
  assert.equal(rounded.properties.fill, "red");
  assert.equal(rounded.properties.lineJoin, "round");
  assert.deepEqual(square, {
    type: "rect",
    properties: {
      x: 0,
      y: 0,
      width: 100,
      height: 20,
      fill: "red",
      stroke: "black",
      strokeWidth: 2,
      lineJoin: "round"
    }
  });
  assert.equal(JSON.stringify(source), snapshot);
  assert.equal(Object.isFrozen(rounded), true);
  assert.equal(Object.isFrozen(rounded.properties), true);
});

test("rejects invalid radius and geometry values", () => {
  for (const value of [NaN, Infinity, "2", null]) {
    assert.throws(() => validateCornerRadius(value), TypeError);
  }
  assert.throws(() => validateCornerRadius(-1), RangeError);
  assert.throws(
    () => normalizeRectGeometry({ x: 0, y: 0, width: NaN, height: 1 }),
    /width/u
  );
  assert.throws(
    () => roundedRectCommands({ x: 0, y: 0, width: 0, height: 1, radius: 1 }),
    /positive resolved radius/u
  );
});
