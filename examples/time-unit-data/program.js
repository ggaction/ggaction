import { chart, hconcat } from "../../src/index.js";

export const timeUnitExampleRows = Object.freeze([
  Object.freeze({ event: "A", date: "2024-01-05T12:00:00Z", order: 1 }),
  Object.freeze({ event: "B", date: "2024-01-17T12:00:00Z", order: 2 }),
  Object.freeze({ event: "C", date: "2024-01-29T12:00:00Z", order: 3 }),
  Object.freeze({ event: "D", date: "2024-02-04T12:00:00Z", order: 4 }),
  Object.freeze({ event: "E", date: "2024-02-15T12:00:00Z", order: 5 }),
  Object.freeze({ event: "F", date: "2024-02-27T12:00:00Z", order: 6 }),
  Object.freeze({ event: "G", date: "2024-03-06T12:00:00Z", order: 7 }),
  Object.freeze({ event: "H", date: "2024-03-18T12:00:00Z", order: 8 }),
  Object.freeze({ event: "I", date: "2024-03-29T12:00:00Z", order: 9 })
]);

const ticks = Object.freeze([
  Date.UTC(2024, 0, 1),
  Date.UTC(2024, 1, 1),
  Date.UTC(2024, 2, 1),
  Date.UTC(2024, 3, 1)
]);
const domain = Object.freeze([
  Date.UTC(2023, 11, 25),
  Date.UTC(2024, 3, 7)
]);
const margin = Object.freeze({ top: 82, right: 32, bottom: 70, left: 58 });

export function createTimeUnitComparison(rows = timeUnitExampleRows) {
  const raw = chart()
    .createCanvas({ width: 440, height: 360, margin })
    .createData({ id: "events", values: rows })
    .createScatterPlot({
      id: "rawEvents",
      data: "events",
      x: {
        field: "date",
        fieldType: "temporal",
        scale: { domain, nice: false }
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
            ticksAndLabels: { values: ticks },
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
    .createCanvas({ width: 440, height: 360, margin })
    .createData({ id: "events", values: rows })
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
        scale: { domain, nice: false }
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
            ticksAndLabels: { values: ticks },
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
    gap: 24,
    padding: 12,
    align: "start"
  });
}
