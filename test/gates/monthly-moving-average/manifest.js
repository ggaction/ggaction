import { defineVisualVariant } from "../../support/visual-variants.js";

import { createMonthlyMovingAveragePrimitives } from "./primitive.program.js";
import { MONTHLY_MOVING_LAYOUT } from "./reference-values.js";

export const targetCallChain = `chart()
  .createCanvas({ width: 760, height: 420 })
  .createData({ id: "events", values })
  .createTimeUnitData({
    id: "monthlyEvents",
    source: "events",
    field: "date",
    unit: "month",
    as: "month"
  })
  .createWindowData({
    id: "monthlyMoving",
    source: "monthlyEvents",
    sortBy: [{ field: "month" }],
    operations: [{
      op: "movingMean",
      field: "value",
      as: "movingMean",
      frame: { preceding: 2 }
    }]
  });`;

export const visualVariants = Object.freeze([
  defineVisualVariant({
    chart: "monthly-moving-average",
    variant: "raw-and-three-month-mean",
    title: "Monthly Values and 3-Month Moving Mean",
    callChain: targetCallChain,
    artifact: { scope: "review" },
    primitive: createMonthlyMovingAveragePrimitives,
    width: MONTHLY_MOVING_LAYOUT.width,
    height: MONTHLY_MOVING_LAYOUT.height,
    colors: ["#f59e0b", "#2563eb"],
    regions: [{
      name: "raw and moving lines",
      x: MONTHLY_MOVING_LAYOUT.margin.left,
      y: MONTHLY_MOVING_LAYOUT.margin.top,
      width: MONTHLY_MOVING_LAYOUT.width -
        MONTHLY_MOVING_LAYOUT.margin.left - MONTHLY_MOVING_LAYOUT.margin.right,
      height: MONTHLY_MOVING_LAYOUT.height -
        MONTHLY_MOVING_LAYOUT.margin.top - MONTHLY_MOVING_LAYOUT.margin.bottom,
      minimumInkPixels: 900
    }]
  })
]);
