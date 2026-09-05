import assert from "node:assert/strict";
import test from "node:test";

import {
  HORIZONTAL_LEGEND_BLOCK_GAP,
  HORIZONTAL_LEGEND_TITLE_ELEMENT_GAP,
  SIDE_LEGEND_BLOCK_GAP,
  resolveHorizontalLegendLane,
  resolveHorizontalLegendGroup,
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

function horizontalGroup({
  id,
  x,
  y,
  width = 160,
  titleY = y + 8,
  titleHeight = 16,
  elementTop = y + 28,
  contentBottom = y + 60,
  inset = 0,
  inline = false
}) {
  return {
    id,
    inline,
    title: {
      y: titleY,
      bounds: {
        left: x,
        right: x + 72,
        top: titleY - titleHeight / 2,
        bottom: titleY + titleHeight / 2
      }
    },
    element: { left: x, right: x + width, top: elementTop, bottom: elementTop + 12 },
    content: { left: x, right: x + width, top: elementTop, bottom: contentBottom },
    horizontal: { left: x, right: x + width, top: y, bottom: contentBottom },
    inset,
    padding: 0
  };
}

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

test("packs bottom groups from the plot left with a fixed gap", () => {
  const plan = resolveHorizontalLegendLane({
    edge: "bottom",
    plot,
    canvas: { ...canvas, height: 600 },
    groups: [
      horizontalGroup({ id: "color", x: 80, y: 410 }),
      horizontalGroup({
        id: "opacity",
        x: 250,
        y: 410,
        titleY: 420,
        titleHeight: 20,
        elementTop: 446,
        contentBottom: 480
      })
    ]
  });

  assert.equal(plan.rowCount, 1);
  const titleY = 418 + plan.placements[0].titleDy;
  const elementTop = 438 + plan.placements[0].contentDy;
  assert.equal(titleY, 420 + plan.placements[1].titleDy);
  assert.equal(elementTop, 446 + plan.placements[1].contentDy);
  assert.equal(elementTop - (titleY + 10), HORIZONTAL_LEGEND_TITLE_ELEMENT_GAP);
  assert.equal(plan.placements[0].occupied.left, plot.x);
  assert.equal(
    plan.placements[1].occupied.left - plan.placements[0].occupied.right,
    HORIZONTAL_LEGEND_BLOCK_GAP
  );
});

test("aligns fully inline blocks on one graphical center line", () => {
  const plan = resolveHorizontalLegendLane({
    edge: "top",
    plot,
    canvas,
    groups: [
      horizontalGroup({ id: "color", x: 80, y: 160, inline: true }),
      horizontalGroup({
        id: "opacity",
        x: 260,
        y: 160,
        elementTop: 166,
        inline: true
      })
    ]
  });
  const centers = plan.placements.map((placement, index) => {
    const element = index === 0
      ? { top: 188, bottom: 200 }
      : { top: 166, bottom: 178 };
    return (element.top + element.bottom) / 2 + placement.contentDy;
  });
  assert.equal(centers[0], centers[1]);
  assert.deepEqual(
    plan.placements.map(placement => placement.titleDy),
    plan.placements.map(placement => placement.contentDy)
  );
});

test("wraps a top group only when the packed row exceeds plot width", () => {
  const plan = resolveHorizontalLegendLane({
    edge: "top",
    plot,
    canvas,
    groups: [
      horizontalGroup({ id: "color", x: 80, y: 160, width: 220 }),
      horizontalGroup({ id: "opacity", x: 180, y: 160, width: 220 })
    ]
  });

  assert.equal(plan.rowCount, 2);
  assert.deepEqual(
    plan.placements.map(placement => placement.occupied.left),
    [plot.x, plot.x]
  );
  assert.equal(
    plan.placements[0].occupied.top - plan.placements[1].occupied.bottom,
    HORIZONTAL_LEGEND_BLOCK_GAP
  );
});

test("rejects one horizontal block wider than the plot", () => {
  assert.throws(
    () => resolveHorizontalLegendLane({
      edge: "top",
      plot,
      canvas,
      groups: [
        horizontalGroup({ id: "color", x: 80, y: 160, width: 440 }),
        horizontalGroup({ id: "opacity", x: 300, y: 160 })
      ]
    }),
    /requires more plot width/
  );
});

test("rejects horizontal overflow and guide collisions atomically", () => {
  const groups = [
    horizontalGroup({ id: "color", x: 80, y: -20 }),
    horizontalGroup({ id: "opacity", x: 300, y: -20 })
  ];
  assert.throws(
    () => resolveHorizontalLegendLane({ edge: "top", plot, canvas, groups }),
    /requires more top-margin or Canvas space/
  );
  assert.throws(
    () => resolveHorizontalLegendLane({
      edge: "bottom",
      plot,
      canvas,
      groups: [
        horizontalGroup({ id: "color", x: 80, y: 350 }),
        horizontalGroup({ id: "opacity", x: 300, y: 350 })
      ],
      collisionBounds: [
        { left: 0, right: 760, top: 405, bottom: 520 }
      ]
    }),
    /x-axis guides require more margin space/
  );
});


test("combined horizontal groups reject intersecting reserved bounds but permit touching edges", () => {
  for (const edge of ["top", "bottom"]) {
    const options = { edge, plot: { x: 100, y: 300, width: 600, height: 200 },
      canvas: { width: 800, height: 800 }, align: "center", offset: 40,
      border: { padding: 10, lineWidth: 2 },
      groups: [horizontalGroup({ id: "color", x: 0, y: 0 }),
        horizontalGroup({ id: "size", x: 200, y: 0 })] };
    const result = resolveHorizontalLegendGroup(options);
    const { left, right, top, bottom } = result.occupied;
    assert.equal(edge === "top" ? bottom : top, edge === "top" ? 260 : 540);
    assert.deepEqual(resolveHorizontalLegendGroup({ ...options,
      collisionBounds: [{ left: right, right: right + 10, top, bottom }] }), result);
    assert.throws(() => resolveHorizontalLegendGroup({ ...options,
      collisionBounds: [{ left, right: left + 1, top, bottom }] }), /require more margin space/);
  }
});
