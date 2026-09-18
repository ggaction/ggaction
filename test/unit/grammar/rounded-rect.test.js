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

test("resolves independent corner overrides against the global radius", () => {
  const item = materializeRectItem({ x: 0, y: 0, width: 100, height: 40 }, {
    cornerRadius: 16, cornerRadiusTopRight: 0, cornerRadiusBottomLeft: 0
  });
  const c = item.properties.commands;
  assert.deepEqual(c[0], { op: "M", x: 16, y: 0 });
  assert.deepEqual(c[2], { op: "C", x1: 100, y1: 0, x2: 100, y2: 0, x: 100, y: 0 });
  assert.deepEqual(c[4], { op: "C", x1: 100, y1: 24 + 16 * ROUNDED_RECT_K,
    x2: 84 + 16 * ROUNDED_RECT_K, y2: 40, x: 84, y: 40 });
  assert.deepEqual(c[6], { op: "C", x1: 0, y1: 40, x2: 0, y2: 40, x: 0, y: 40 });
});

test("clamps each visual corner after normalizing reversed bounds", () => {
  const item = materializeRectItem({ x: 100, y: 40, width: -100, height: -40 }, {
    cornerRadiusTopLeft: 100, cornerRadiusTopRight: 3,
    cornerRadiusBottomRight: 9, cornerRadiusBottomLeft: 5
  });
  const c = item.properties.commands;
  assert.deepEqual(c[0], { op: "M", x: 20, y: 0 });
  assert.deepEqual(c[1], { op: "L", x: 97, y: 0 });
  assert.deepEqual(c[3], { op: "L", x: 100, y: 31 });
  assert.deepEqual(c[5], { op: "L", x: 5, y: 40 });
  for (const corner of ["TopLeft", "TopRight", "BottomRight", "BottomLeft"]) {
    for (const invalid of [-1, Infinity, NaN, "3", null]) {
      assert.throws(() => materializeRectItem({ x: 0, y: 0, width: 100, height: 40 }, {
        [`cornerRadius${corner}`]: invalid
      }));
    }
  }
  assert.equal(materializeRectItem({ x: 0, y: 0, width: 0, height: 40 }, {
    cornerRadiusTopLeft: 100
  }).type, "rect");
});
