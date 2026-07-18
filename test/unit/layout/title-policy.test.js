import assert from "node:assert/strict";
import test from "node:test";

import {
  alignedTextAnchor,
  alignedTitleAnchor,
  buildTitleReadingBlock,
  layoutBoundsIntersect,
  resolveTitleComponentBounds,
  unionTitleBounds
} from "../../../src/layout/title.js";

const style = Object.freeze({ fontSize: 10, fontWeight: 400 });

test("builds deterministic title reading blocks and anchors", () => {
  const block = buildTitleReadingBlock(
    { text: "Main", subtitle: "Sub" },
    {
      maxWidth: 100,
      wrap: "word",
      gap: 4,
      titleStyle: style,
      subtitleStyle: style
    }
  );
  assert.deepEqual(block.titleLines, ["Main"]);
  assert.deepEqual(block.subtitleLines, ["Sub"]);
  assert.deepEqual(block.titleCenters, [5]);
  assert.deepEqual(block.subtitleCenters, [19]);
  assert.equal(block.height, 24);
  assert.equal(alignedTitleAnchor(10, 100, 30, "left"), 25);
  assert.equal(alignedTitleAnchor(10, 100, 30, "center"), 60);
  assert.equal(alignedTitleAnchor(10, 100, 30, "right"), 95);
  assert.equal(alignedTextAnchor(10, 100, "left"), 10);
  assert.equal(alignedTextAnchor(10, 100, "center"), 60);
  assert.equal(alignedTextAnchor(10, 100, "right"), 110);
});

test("resolves rotated component bounds, unions, and strict intersections", () => {
  const first = resolveTitleComponentBounds({
    lines: ["AB"],
    x: 20,
    y: 30,
    textAlign: "center",
    rotation: 0
  }, style);
  const second = { left: 19, right: 30, top: 29, bottom: 40 };
  assert.equal(layoutBoundsIntersect(first, second), true);
  assert.deepEqual(unionTitleBounds([first, second]), {
    left: Math.min(first.left, second.left),
    right: Math.max(first.right, second.right),
    top: Math.min(first.top, second.top),
    bottom: Math.max(first.bottom, second.bottom)
  });
  assert.equal(layoutBoundsIntersect(first, {
    left: first.right,
    right: first.right + 5,
    top: first.top,
    bottom: first.bottom
  }), false);
});
