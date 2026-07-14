import { freezeOwned, isPlainObject } from "../core/immutable.js";
import { buildLinearPathCommands } from "./pathCommands.js";

export const CURVE_INTERPOLATIONS = Object.freeze([
  "linear",
  "step",
  "step-before",
  "step-after",
  "basis",
  "cardinal",
  "monotone",
  "natural"
]);

const SMOOTH_CURVES = new Set([
  "basis",
  "cardinal",
  "monotone",
  "natural"
]);

function ownCommands(commands) {
  return freezeOwned(commands.map(command => freezeOwned(command)));
}

function validatePoints(points) {
  if (
    !Array.isArray(points) ||
    points.length < 2 ||
    !points.every(point =>
      isPlainObject(point) &&
      Object.keys(point).length === 2 &&
      Number.isFinite(point.x) &&
      Number.isFinite(point.y)
    )
  ) {
    throw new TypeError(
      "Curve points must contain at least two finite { x, y } objects."
    );
  }
  return points;
}

export function validateCurveInterpolation(curve) {
  if (!CURVE_INTERPOLATIONS.includes(curve)) {
    throw new Error(`Unsupported curve interpolation "${curve}".`);
  }
  return curve;
}

function buildStepCommands(points, mode) {
  const commands = [{ op: "M", x: points[0].x, y: points[0].y }];
  for (let index = 1; index < points.length; index += 1) {
    const previous = points[index - 1];
    const current = points[index];
    if (mode === "step") {
      const midpoint = (previous.x + current.x) / 2;
      commands.push(
        { op: "L", x: midpoint, y: previous.y },
        { op: "L", x: midpoint, y: current.y },
        { op: "L", x: current.x, y: current.y }
      );
    } else if (mode === "step-before") {
      commands.push(
        { op: "L", x: previous.x, y: current.y },
        { op: "L", x: current.x, y: current.y }
      );
    } else {
      commands.push(
        { op: "L", x: current.x, y: previous.y },
        { op: "L", x: current.x, y: current.y }
      );
    }
  }
  return ownCommands(commands);
}

function cubicLine(from, to) {
  return {
    op: "C",
    x1: from.x + (to.x - from.x) / 3,
    y1: from.y + (to.y - from.y) / 3,
    x2: from.x + (to.x - from.x) * 2 / 3,
    y2: from.y + (to.y - from.y) * 2 / 3,
    x: to.x,
    y: to.y
  };
}

function buildBasisCommands(points) {
  const commands = [{ op: "M", x: points[0].x, y: points[0].y }];
  let previous = points[0];
  let current = points[1];
  let endpoint = {
    x: (5 * previous.x + current.x) / 6,
    y: (5 * previous.y + current.y) / 6
  };
  commands.push(cubicLine(previous, endpoint));

  for (let index = 2; index < points.length; index += 1) {
    const next = points[index];
    endpoint = {
      x: (previous.x + 4 * current.x + next.x) / 6,
      y: (previous.y + 4 * current.y + next.y) / 6
    };
    commands.push({
      op: "C",
      x1: (2 * previous.x + current.x) / 3,
      y1: (2 * previous.y + current.y) / 3,
      x2: (previous.x + 2 * current.x) / 3,
      y2: (previous.y + 2 * current.y) / 3,
      x: endpoint.x,
      y: endpoint.y
    });
    previous = current;
    current = next;
  }

  endpoint = {
    x: (previous.x + 5 * current.x) / 6,
    y: (previous.y + 5 * current.y) / 6
  };
  commands.push({
    op: "C",
    x1: (2 * previous.x + current.x) / 3,
    y1: (2 * previous.y + current.y) / 3,
    x2: (previous.x + 2 * current.x) / 3,
    y2: (previous.y + 2 * current.y) / 3,
    x: endpoint.x,
    y: endpoint.y
  });
  commands.push(cubicLine(endpoint, current));
  return ownCommands(commands);
}

function buildCardinalCommands(points) {
  const commands = [{ op: "M", x: points[0].x, y: points[0].y }];
  for (let index = 0; index < points.length - 1; index += 1) {
    const before = points[index - 1] ?? points[index];
    const current = points[index];
    const next = points[index + 1];
    const after = points[index + 2] ?? next;
    commands.push({
      op: "C",
      x1: current.x + (next.x - before.x) / 6,
      y1: current.y + (next.y - before.y) / 6,
      x2: next.x - (after.x - current.x) / 6,
      y2: next.y - (after.y - current.y) / 6,
      x: next.x,
      y: next.y
    });
  }
  return ownCommands(commands);
}

function monotoneTangents(points) {
  const intervals = points.slice(1).map((point, index) => {
    const previous = points[index];
    const width = point.x - previous.x;
    if (!(width > 0)) {
      throw new Error("Monotone curve requires strictly increasing x values.");
    }
    return { width, slope: (point.y - previous.y) / width };
  });
  const tangents = [intervals[0].slope];

  for (let index = 1; index < points.length - 1; index += 1) {
    const previous = intervals[index - 1];
    const next = intervals[index];
    if (
      previous.slope === 0 ||
      next.slope === 0 ||
      Math.sign(previous.slope) !== Math.sign(next.slope)
    ) {
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

function buildMonotoneCommands(points) {
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
  return ownCommands(commands);
}

function solveFirstControlPoints(values) {
  const segmentCount = values.length - 1;
  const diagonal = Array(segmentCount).fill(4);
  const right = Array(segmentCount);
  diagonal[0] = 2;
  diagonal[segmentCount - 1] = 7;
  right[0] = values[0] + 2 * values[1];
  for (let index = 1; index < segmentCount - 1; index += 1) {
    right[index] = 4 * values[index] + 2 * values[index + 1];
  }
  right[segmentCount - 1] =
    8 * values[segmentCount - 1] + values[segmentCount];

  for (let index = 1; index < segmentCount; index += 1) {
    const lower = index === segmentCount - 1 ? 2 : 1;
    const factor = lower / diagonal[index - 1];
    diagonal[index] -= factor;
    right[index] -= factor * right[index - 1];
  }

  const controls = Array(segmentCount);
  controls[segmentCount - 1] =
    right[segmentCount - 1] / diagonal[segmentCount - 1];
  for (let index = segmentCount - 2; index >= 0; index -= 1) {
    controls[index] = (right[index] - controls[index + 1]) / diagonal[index];
  }
  return controls;
}

function buildNaturalCommands(points) {
  const x = points.map(point => point.x);
  const y = points.map(point => point.y);
  const firstX = solveFirstControlPoints(x);
  const firstY = solveFirstControlPoints(y);
  const commands = [{ op: "M", x: points[0].x, y: points[0].y }];
  const last = points.length - 2;

  for (let index = 0; index < points.length - 1; index += 1) {
    const secondX = index === last
      ? (x[index + 1] + firstX[index]) / 2
      : 2 * x[index + 1] - firstX[index + 1];
    const secondY = index === last
      ? (y[index + 1] + firstY[index]) / 2
      : 2 * y[index + 1] - firstY[index + 1];
    commands.push({
      op: "C",
      x1: firstX[index],
      y1: firstY[index],
      x2: secondX,
      y2: secondY,
      x: x[index + 1],
      y: y[index + 1]
    });
  }
  return ownCommands(commands);
}

export function buildCurvePathCommands(points, curve = "linear") {
  const validatedPoints = validatePoints(points);
  const validatedCurve = validateCurveInterpolation(curve);
  if (validatedCurve === "linear" ||
      (SMOOTH_CURVES.has(validatedCurve) && points.length < 3)) {
    return buildLinearPathCommands(validatedPoints);
  }
  if (validatedCurve.startsWith("step")) {
    return buildStepCommands(validatedPoints, validatedCurve);
  }
  if (validatedCurve === "basis") return buildBasisCommands(validatedPoints);
  if (validatedCurve === "cardinal") {
    return buildCardinalCommands(validatedPoints);
  }
  if (validatedCurve === "monotone") {
    return buildMonotoneCommands(validatedPoints);
  }
  return buildNaturalCommands(validatedPoints);
}
