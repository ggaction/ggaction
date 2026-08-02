import { chart, hconcat } from "../../../src/index.js";

import {
  AIRLINE_PASSENGER_ROWS,
  AIRLINE_PASSENGER_EVENTS,
  CENTERED_MEAN_ROWS,
  CENTERED_MEAN_TRANSFORM,
  MONTH_TICKS,
  MOVING_WINDOW_LAYOUT,
  TRAILING_MEAN_ROWS,
  TRAILING_MEAN_TRANSFORM,
  TRAILING_SUM_ROWS,
  TRAILING_SUM_TRANSFORM,
  TIME_UNIT_TRANSFORM
} from "./reference-values.js";

function basePanel({ id, values, transform, field, domain, stroke }) {
  return chart()
    .createCanvas({
      width: MOVING_WINDOW_LAYOUT.panelWidth,
      height: MOVING_WINDOW_LAYOUT.panelHeight,
      margin: MOVING_WINDOW_LAYOUT.margin
    })
    .createData({ id: "airlinePassengerEvents", values: AIRLINE_PASSENGER_EVENTS })
    .createDerivedData({
      id: "monthlyPassengers",
      source: "airlinePassengerEvents",
      transform: [TIME_UNIT_TRANSFORM]
    })
    .editSemantic({
      property: "dataset[monthlyPassengers].values",
      value: AIRLINE_PASSENGER_ROWS
    })
    .createDerivedData({
      id,
      source: "monthlyPassengers",
      transform: [transform]
    })
    .editSemantic({
      property: `dataset[${id}].values`,
      value: values
    })
    .createLineMark({
      id: "moving",
      data: id,
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
          ticksAndLabels: { values: MONTH_TICKS },
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

export function createAirlinePassengerMovingWindowPrimitives() {
  const trailingMean = finishPanel(addRawLine(basePanel({
    id: "trailingMean",
    values: TRAILING_MEAN_ROWS,
    transform: TRAILING_MEAN_TRANSFORM,
    field: "movingMean",
    domain: [60, 100],
    stroke: "#2563eb"
  })), {
    title: "movingMean · trailing 3 months",
    subtitle: "BTS U.S. passengers, 2024–2025",
    yTitle: "Passengers (millions)"
  });

  const centeredMean = finishPanel(addRawLine(basePanel({
    id: "centeredMean",
    values: CENTERED_MEAN_ROWS,
    transform: CENTERED_MEAN_TRANSFORM,
    field: "movingMean",
    domain: [60, 100],
    stroke: "#059669"
  })), {
    title: "movingMean · centered 5 months",
    subtitle: "BTS U.S. passengers, 2024–2025",
    yTitle: "Passengers (millions)"
  });

  const trailingSum = finishPanel(basePanel({
    id: "trailingSum",
    values: TRAILING_SUM_ROWS,
    transform: TRAILING_SUM_TRANSFORM,
    field: "movingSum",
    domain: [0, 280],
    stroke: "#7c3aed"
  }), {
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
    gap: MOVING_WINDOW_LAYOUT.gap,
    padding: MOVING_WINDOW_LAYOUT.padding,
    align: "start"
  });
}
