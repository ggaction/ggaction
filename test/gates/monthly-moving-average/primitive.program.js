import { chart } from "../../../src/index.js";

import {
  MONTHLY_MOVING_LAYOUT,
  MONTHLY_MOVING_ROWS,
  MONTHLY_ROWS,
  MONTH_TICKS
} from "./reference-values.js";

export function createMonthlyMovingAveragePrimitives() {
  return chart()
    .createCanvas({
      width: MONTHLY_MOVING_LAYOUT.width,
      height: MONTHLY_MOVING_LAYOUT.height,
      margin: MONTHLY_MOVING_LAYOUT.margin
    })
    .createData({ id: "monthlyEvents", values: MONTHLY_ROWS })
    .createData({ id: "monthlyMoving", values: MONTHLY_MOVING_ROWS })
    .createLineMark({
      id: "monthly",
      data: "monthlyEvents",
      stroke: "#f59e0b",
      strokeWidth: 2,
      opacity: 1
    })
    .encodeX({
      target: "monthly",
      field: "month",
      fieldType: "temporal",
      scale: { id: "x", nice: true }
    })
    .encodeY({
      target: "monthly",
      field: "value",
      fieldType: "quantitative",
      aggregate: "mean",
      scale: { id: "y", domain: [0, 60], nice: false, zero: true }
    })
    .createLineMark({
      id: "moving",
      data: "monthlyMoving",
      stroke: "#2563eb",
      strokeWidth: 4,
      opacity: 1
    })
    .encodeX({
      target: "moving",
      field: "month",
      fieldType: "temporal",
      scale: { id: "x" }
    })
    .encodeY({
      target: "moving",
      field: "movingMean",
      fieldType: "quantitative",
      aggregate: "mean",
      scale: { id: "y" }
    })
    .createGuides({
      axes: {
        x: {
          ticksAndLabels: { values: MONTH_TICKS },
          title: { text: "Month (UTC)" }
        },
        y: { title: { text: "Monthly value" } }
      },
      grid: { horizontal: true, vertical: false }
    })
    .createTitle({
      text: "Monthly Values and 3-Month Moving Mean",
      subtitle: "Orange: monthly value  ·  Blue: current month plus two preceding months",
      align: "center"
    });
}
