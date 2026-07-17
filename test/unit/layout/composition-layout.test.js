import assert from "node:assert/strict";
import test from "node:test";

import {
  DEFAULT_COMPOSITION_LAYOUT,
  normalizeCompositionPadding,
  resolveCompositionLayout
} from "../../../src/layout/composition.js";
import { expectedConcatLayout } from "../../oracles/composition.js";

const children = Object.freeze([
  Object.freeze({ id: "main", width: 420, height: 300 }),
  Object.freeze({ id: "detail", width: 260, height: 220 }),
  Object.freeze({ id: "context", width: 320, height: 180 })
]);

test("uses the documented concat defaults", () => {
  assert.deepEqual(DEFAULT_COMPOSITION_LAYOUT, {
    gap: 16,
    align: "center",
    padding: { top: 0, right: 0, bottom: 0, left: 0 }
  });
  assert.deepEqual(
    resolveCompositionLayout({ direction: "horizontal", children }),
    {
      direction: "horizontal",
      gap: 16,
      align: "center",
      padding: { top: 0, right: 0, bottom: 0, left: 0 },
      width: 1032,
      height: 300,
      children: [
        { id: "main", width: 420, height: 300, x: 0, y: 0 },
        { id: "detail", width: 260, height: 220, x: 436, y: 40 },
        { id: "context", width: 320, height: 180, x: 712, y: 60 }
      ]
    }
  );
});

test("matches an independent oracle for both directions and every alignment", () => {
  const padding = { top: 11, right: 13, bottom: 17, left: 19 };
  for (const direction of ["horizontal", "vertical"]) {
    for (const align of ["start", "center", "end"]) {
      const actual = resolveCompositionLayout({
        direction,
        children,
        gap: 23,
        align,
        padding
      });
      const expected = expectedConcatLayout({
        direction,
        children,
        gap: 23,
        align,
        padding
      });
      assert.equal(actual.width, expected.width);
      assert.equal(actual.height, expected.height);
      assert.deepEqual(actual.children, expected.children);
    }
  }
});

test("normalizes scalar and partial padding without mutating its base", () => {
  const base = Object.freeze({ top: 1, right: 2, bottom: 3, left: 4 });
  assert.deepEqual(normalizeCompositionPadding(8), {
    top: 8,
    right: 8,
    bottom: 8,
    left: 8
  });
  assert.deepEqual(normalizeCompositionPadding({ left: 12 }, base), {
    top: 1,
    right: 2,
    bottom: 3,
    left: 12
  });
  assert.deepEqual(base, { top: 1, right: 2, bottom: 3, left: 4 });
});

test("preserves order, gaps, outer bounds, and frozen ownership", () => {
  const result = resolveCompositionLayout({
    direction: "vertical",
    children,
    gap: 9,
    align: "end",
    padding: 7
  });
  assert.deepEqual(result.children.map(child => child.id), [
    "main", "detail", "context"
  ]);
  for (let index = 1; index < result.children.length; index += 1) {
    const previous = result.children[index - 1];
    const current = result.children[index];
    assert.equal(current.y - (previous.y + previous.height), 9);
  }
  assert.equal(result.width, 434);
  assert.equal(result.height, 732);
  assert.ok(Object.isFrozen(result));
  assert.ok(Object.isFrozen(result.children));
  assert.ok(Object.isFrozen(result.padding));
});

test("rejects malformed composition layout inputs", () => {
  assert.throws(
    () => resolveCompositionLayout({ direction: "diagonal", children }),
    /expected horizontal or vertical/
  );
  assert.throws(
    () => resolveCompositionLayout({ direction: "horizontal", children: [] }),
    /non-empty children array/
  );
  assert.throws(
    () => resolveCompositionLayout({
      direction: "horizontal",
      children: [...children, { ...children[0] }]
    }),
    /Duplicate composition child id/
  );
  assert.throws(
    () => resolveCompositionLayout({
      direction: "horizontal",
      children: [{ id: "bad", width: 0, height: 10 }]
    }),
    /width must be a positive finite number/
  );
  assert.throws(
    () => resolveCompositionLayout({ direction: "horizontal", children, gap: -1 }),
    /gap must be a non-negative finite number/
  );
  assert.throws(
    () => resolveCompositionLayout({ direction: "horizontal", children, align: "stretch" }),
    /expected start, center, or end/
  );
  assert.throws(() => normalizeCompositionPadding({}), /at least one side/);
  assert.throws(() => normalizeCompositionPadding({ inline: 2 }), /Unknown composition padding/);
  assert.throws(() => normalizeCompositionPadding({ top: -2 }), /must be a non-negative/);
});

