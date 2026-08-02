import { chart, hconcat } from "../../../src/index.js";

import {
  EVENT_ROWS,
  MONTH_TICKS,
  TIME_DOMAIN,
  TIME_UNIT_LAYOUT
} from "./reference-values.js";

export function createTimeUnitComparison() {
  const raw = chart()
    .createCanvas({
      width: TIME_UNIT_LAYOUT.panelWidth,
      height: TIME_UNIT_LAYOUT.panelHeight,
      margin: TIME_UNIT_LAYOUT.margin
    })
    .createData({ id: "events", values: EVENT_ROWS })
    .createScatterPlot({
      id: "rawEvents",
      data: "events",
      x: {
        field: "date",
        fieldType: "temporal",
        scale: { domain: TIME_DOMAIN, nice: false }
      },
      y: {
        field: "order",
        fieldType: "quantitative",
        scale: { domain: [0.5, 9.5], nice: false, zero: false }
      },
      point: {
        fill: "#f59e0b",
        opacity: 1,
        stroke: "#ffffff",
        strokeWidth: 1
      },
      guides: {
        axes: {
          x: {
            ticksAndLabels: { values: MONTH_TICKS },
            title: { text: "Actual event time (UTC)" }
          },
          y: {
            ticksAndLabels: { values: [1, 3, 5, 7, 9] },
            title: { text: "Event order" }
          }
        },
        grid: { horizontal: false, vertical: true }
      }
    })
    .encodePointRadius({ target: "rawEvents", value: 7 })
    .createTitle({
      text: "Before",
      subtitle: "Events stay on their original dates",
      align: "center"
    });

  const bucketed = chart()
    .createCanvas({
      width: TIME_UNIT_LAYOUT.panelWidth,
      height: TIME_UNIT_LAYOUT.panelHeight,
      margin: TIME_UNIT_LAYOUT.margin
    })
    .createData({ id: "events", values: EVENT_ROWS })
    .createTimeUnitData({
      id: "monthlyEvents",
      field: "date",
      unit: "month",
      as: "month"
    })
    .createScatterPlot({
      id: "bucketedEvents",
      data: "monthlyEvents",
      x: {
        field: "month",
        fieldType: "temporal",
        scale: { domain: TIME_DOMAIN, nice: false }
      },
      y: {
        field: "order",
        fieldType: "quantitative",
        scale: { domain: [0.5, 9.5], nice: false, zero: false }
      },
      point: {
        fill: "#2563eb",
        opacity: 1,
        stroke: "#ffffff",
        strokeWidth: 1
      },
      guides: {
        axes: {
          x: {
            ticksAndLabels: { values: MONTH_TICKS },
            title: { text: "UTC month start" }
          },
          y: {
            ticksAndLabels: { values: [1, 3, 5, 7, 9] },
            title: { text: "Event order" }
          }
        },
        grid: { horizontal: false, vertical: true }
      }
    })
    .encodePointRadius({ target: "bucketedEvents", value: 7 })
    .createTitle({
      text: "After",
      subtitle: "Each event snaps to its UTC month start",
      align: "center"
    });

  return hconcat({
    id: "timeUnitComparison",
    programs: [
      { id: "raw", program: raw },
      { id: "bucketed", program: bucketed }
    ],
    gap: TIME_UNIT_LAYOUT.gap,
    padding: TIME_UNIT_LAYOUT.padding,
    align: "start"
  });
}
