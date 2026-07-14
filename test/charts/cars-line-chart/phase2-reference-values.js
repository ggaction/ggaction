import { createCarsLineChartValues } from "./reference-values.js";

function freezeCommands(commands) {
  return Object.freeze(commands.map(command => Object.freeze(command)));
}

function requirePoints(points, label) {
  if (
    !Array.isArray(points) ||
    points.length < 2 ||
    !points.every(point =>
      point !== null &&
      typeof point === "object" &&
      Number.isFinite(point.x) &&
      Number.isFinite(point.y)
    )
  ) {
    throw new TypeError(`${label} requires at least two finite points.`);
  }
  return points;
}

export function createStepReferenceCommands(points) {
  requirePoints(points, "Step reference");
  const commands = [{ op: "M", x: points[0].x, y: points[0].y }];

  for (let index = 1; index < points.length; index += 1) {
    const previous = points[index - 1];
    const current = points[index];
    const midpoint = (previous.x + current.x) / 2;
    commands.push(
      { op: "L", x: midpoint, y: previous.y },
      { op: "L", x: midpoint, y: current.y },
      { op: "L", x: current.x, y: current.y }
    );
  }

  return freezeCommands(commands);
}

function monotoneTangents(points) {
  const intervals = points.slice(1).map((point, index) => {
    const previous = points[index];
    const width = point.x - previous.x;
    if (!(width > 0)) {
      throw new Error("Monotone reference requires strictly increasing x values.");
    }
    return {
      width,
      slope: (point.y - previous.y) / width
    };
  });
  const tangents = [intervals[0].slope];

  for (let index = 1; index < points.length - 1; index += 1) {
    const previous = intervals[index - 1];
    const next = intervals[index];
    if (previous.slope === 0 || next.slope === 0 ||
        Math.sign(previous.slope) !== Math.sign(next.slope)) {
      tangents.push(0);
      continue;
    }
    const previousWeight = 2 * next.width + previous.width;
    const nextWeight = next.width + 2 * previous.width;
    tangents.push(
      (previousWeight + nextWeight) /
      (previousWeight / previous.slope + nextWeight / next.slope)
    );
  }

  tangents.push(intervals.at(-1).slope);
  return tangents;
}

export function createMonotoneReferenceCommands(points) {
  requirePoints(points, "Monotone reference");
  const tangents = monotoneTangents(points);
  const commands = [{ op: "M", x: points[0].x, y: points[0].y }];

  for (let index = 1; index < points.length; index += 1) {
    const previous = points[index - 1];
    const current = points[index];
    const third = (current.x - previous.x) / 3;
    commands.push({
      op: "C",
      x1: previous.x + third,
      y1: previous.y + tangents[index - 1] * third,
      x2: current.x - third,
      y2: current.y - tangents[index] * third,
      x: current.x,
      y: current.y
    });
  }

  return freezeCommands(commands);
}

export function createCarsLineCurvePrimitiveValues(
  cars,
  {
    width = 720,
    height = 460,
    margin = { top: 80, right: 170, bottom: 60, left: 80 }
  } = {}
) {
  const baseline = createCarsLineChartValues(cars, { width, height, margin });
  return Object.freeze({
    baseline,
    stepCommands: Object.freeze(
      baseline.series.map(series => createStepReferenceCommands(series.points))
    ),
    monotoneCommands: Object.freeze(
      baseline.series.map(series => createMonotoneReferenceCommands(series.points))
    )
  });
}
