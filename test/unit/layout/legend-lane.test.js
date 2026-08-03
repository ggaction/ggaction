import assert from "node:assert/strict";
import test from "node:test";

import {
  SIDE_LEGEND_BLOCK_GAP,
  resolveSideLegendLane
} from "../../../src/layout/legendLane.js";

function block({ id, x, y, width = 72, height = 80, offset = 30 }) {
  return {
    id,
    offset,
    bounds: { left: x, right: x + width, top: y, bottom: y + height },
    title: { x, y: y + 10, fontSize: 14, width: 48 },
    symbol: { centerX: x + 12, left: x + 4, right: x + 20 },
    labels: { x: x + 32, width: 40 }
  };
}

const plot = Object.freeze({ x: 80, y: 40, width: 420, height: 360 });
const canvas = Object.freeze({ width: 760, height: 520 });

test("resolves one shared right-side title, symbol, and label column", () => {
  const plan = resolveSideLegendLane({
    side: "right",
    plot,
    canvas,
    groups: [
      { blocks: [block({ id: "color", x: 508, y: 40 })], border: false },
      { blocks: [block({ id: "opacity", x: 530, y: 40 })], border: false }
    ]
  });

  assert.equal(plan.titleStartX, 530);
  assert.equal(plan.symbolCenterX, 546);
  assert.equal(plan.labelStartX, 574);
  assert.equal(
    plan.placements[1].bounds.top - plan.placements[0].bounds.bottom,
    SIDE_LEGEND_BLOCK_GAP
  );
});

test("keeps symbol-before-label reading order on a left-side lane", () => {
  const plan = resolveSideLegendLane({
    side: "left",
    plot: { ...plot, x: 200, width: 300 },
    canvas,
    groups: [
      { blocks: [block({ id: "color", x: 20, y: 40 })], border: false },
      { blocks: [block({ id: "size", x: 42, y: 40 })], border: false }
    ]
  });

  assert.equal(plan.titleStartX, 86);
  assert.equal(plan.symbolCenterX, 102);
  assert.equal(plan.labelStartX, 130);
  assert.ok(plan.titleStartX < plan.symbolCenterX);
  assert.ok(plan.symbolCenterX < plan.labelStartX);
});

test("rejects a lane that cannot fit without changing the Canvas", () => {
  assert.throws(
    () => resolveSideLegendLane({
      side: "right",
      plot,
      canvas: { width: 590, height: 150 },
      groups: [
        { blocks: [block({ id: "color", x: 508, y: 40 })], border: false },
        { blocks: [block({ id: "size", x: 530, y: 40 })], border: false }
      ]
    }),
    /requires more right-margin or vertical Canvas space/
  );
});
