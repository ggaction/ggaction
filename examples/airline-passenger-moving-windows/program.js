import { chart, hconcat } from "../../src/index.js";

export const airlinePassengerRows = Object.freeze([
  Object.freeze({ date: "2024-01-01T00:00:00.000Z", passengers: 70.1 }),
  Object.freeze({ date: "2024-02-01T00:00:00.000Z", passengers: 70.4 }),
  Object.freeze({ date: "2024-03-01T00:00:00.000Z", passengers: 84.9 }),
  Object.freeze({ date: "2024-04-01T00:00:00.000Z", passengers: 81.2 }),
  Object.freeze({ date: "2024-05-01T00:00:00.000Z", passengers: 87.1 }),
  Object.freeze({ date: "2024-06-01T00:00:00.000Z", passengers: 89.7 }),
  Object.freeze({ date: "2024-07-01T00:00:00.000Z", passengers: 91.8 }),
  Object.freeze({ date: "2024-08-01T00:00:00.000Z", passengers: 86.8 }),
  Object.freeze({ date: "2024-09-01T00:00:00.000Z", passengers: 77.5 }),
  Object.freeze({ date: "2024-10-01T00:00:00.000Z", passengers: 82.8 }),
  Object.freeze({ date: "2024-11-01T00:00:00.000Z", passengers: 77.1 }),
  Object.freeze({ date: "2024-12-01T00:00:00.000Z", passengers: 83.3 }),
  Object.freeze({ date: "2025-01-01T00:00:00.000Z", passengers: 70.7 }),
  Object.freeze({ date: "2025-02-01T00:00:00.000Z", passengers: 67.2 }),
  Object.freeze({ date: "2025-03-01T00:00:00.000Z", passengers: 83.7 }),
  Object.freeze({ date: "2025-04-01T00:00:00.000Z", passengers: 80.4 }),
  Object.freeze({ date: "2025-05-01T00:00:00.000Z", passengers: 85.3 }),
  Object.freeze({ date: "2025-06-01T00:00:00.000Z", passengers: 88.7 }),
  Object.freeze({ date: "2025-07-01T00:00:00.000Z", passengers: 92.2 }),
  Object.freeze({ date: "2025-08-01T00:00:00.000Z", passengers: 86.8 }),
  Object.freeze({ date: "2025-09-01T00:00:00.000Z", passengers: 76.8 }),
  Object.freeze({ date: "2025-10-01T00:00:00.000Z", passengers: 84.2 }),
  Object.freeze({ date: "2025-11-01T00:00:00.000Z", passengers: 74.8 }),
  Object.freeze({ date: "2025-12-01T00:00:00.000Z", passengers: 81.2 })
]);

const margin = Object.freeze({ top: 74, right: 14, bottom: 50, left: 70 });
const ticks = Object.freeze([
  Date.UTC(2024, 0, 1),
  Date.UTC(2024, 6, 1),
  Date.UTC(2025, 0, 1),
  Date.UTC(2025, 6, 1)
]);

function monthlyProgram(rows) {
  return chart()
    .createCanvas({ width: 380, height: 360, margin })
    .createData({ id: "airlinePassengerEvents", values: rows })
    .createTimeUnitData({
      id: "monthlyPassengers",
      field: "date",
      unit: "month",
      as: "month"
    });
}

function addMovingLine(program, { field, domain, stroke }) {
  return program
    .createLineMark({
      id: "moving",
      data: "movingPassengers",
      stroke,
      strokeWidth: 4,
      opacity: 1
    })
    .encodeX({
      target: "moving",
      field: "month",
      fieldType: "temporal",
      scale: { id: "x", nice: true }
    })
    .encodeY({
      target: "moving",
      field,
      fieldType: "quantitative",
      aggregate: "mean",
      scale: { id: "y", domain, nice: false, zero: domain[0] === 0 }
    });
}

function addRawLine(program) {
  return program
    .createLineMark({
      id: "raw",
      data: "monthlyPassengers",
      stroke: "#f59e0b",
      strokeWidth: 2,
      opacity: 1
    })
    .encodeX({
      target: "raw",
      field: "month",
      fieldType: "temporal",
      scale: { id: "x" }
    })
    .encodeY({
      target: "raw",
      field: "passengers",
      fieldType: "quantitative",
      aggregate: "mean",
      scale: { id: "y" }
    });
}

function finishPanel(program, { title, subtitle, yTitle }) {
  return program
    .createGuides({
      axes: {
        x: {
          ticksAndLabels: { values: ticks },
          title: { text: "Month" }
        },
        y: { title: { text: yTitle } }
      },
      grid: { horizontal: true, vertical: false }
    })
    .createTitle({
      text: title,
      subtitle,
      align: "center",
      titleStyle: { fontSize: 16 },
      subtitleStyle: { fontSize: 11 }
    });
}

export function createAirlinePassengerMovingWindows(
  rows = airlinePassengerRows
) {
  const trailingMean = finishPanel(addRawLine(addMovingLine(
    monthlyProgram(rows).createWindowData({
      id: "movingPassengers",
      source: "monthlyPassengers",
      sortBy: [{ field: "month" }],
      operations: [{
        op: "movingMean",
        field: "passengers",
        as: "movingMean",
        frame: { preceding: 2 }
      }]
    }),
    { field: "movingMean", domain: [60, 100], stroke: "#2563eb" }
  )), {
    title: "movingMean · trailing 3 months",
    subtitle: "BTS U.S. passengers, 2024–2025",
    yTitle: "Passengers (millions)"
  });

  const centeredMean = finishPanel(addRawLine(addMovingLine(
    monthlyProgram(rows).createWindowData({
      id: "movingPassengers",
      source: "monthlyPassengers",
      sortBy: [{ field: "month" }],
      operations: [{
        op: "movingMean",
        field: "passengers",
        as: "movingMean",
        frame: { preceding: 2, following: 2 }
      }]
    }),
    { field: "movingMean", domain: [60, 100], stroke: "#059669" }
  )), {
    title: "movingMean · centered 5 months",
    subtitle: "BTS U.S. passengers, 2024–2025",
    yTitle: "Passengers (millions)"
  });

  const trailingSum = finishPanel(addMovingLine(
    monthlyProgram(rows).createWindowData({
      id: "movingPassengers",
      source: "monthlyPassengers",
      sortBy: [{ field: "month" }],
      operations: [{
        op: "movingSum",
        field: "passengers",
        as: "movingSum",
        frame: { preceding: 2 }
      }]
    }),
    { field: "movingSum", domain: [0, 280], stroke: "#7c3aed" }
  ), {
    title: "movingSum · trailing 3 months",
    subtitle: "BTS U.S. passengers, 2024–2025",
    yTitle: "Passenger total (millions)"
  });

  return hconcat({
    id: "airlinePassengerMovingWindows",
    programs: [
      { id: "trailingMean", program: trailingMean },
      { id: "centeredMean", program: centeredMean },
      { id: "trailingSum", program: trailingSum }
    ],
    gap: 20,
    padding: 6,
    align: "start"
  });
}
