import { freezeOwned, isPlainObject } from "../core/immutable.js";
import { buildLinearPathCommands, validatePathCommandCount } from "./pathCommands.js";

export const CURVE_INTERPOLATIONS = Object.freeze([
  "linear",
  "step",
  "step-before",
  "step-after",
  "basis",
  "cardinal",
  "monotone",
  "monotone-steffen",
  "natural"
]);

const SMOOTH_CURVES = new Set([
  "basis",
  "cardinal",
  "monotone",
  "monotone-steffen",
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

export function validateCardinalTension(tension, curve) {
  if (tension === undefined) return 0;
  if (curve !== "cardinal") throw new Error("Line tension requires cardinal interpolation.");
  if (!Number.isFinite(tension) || tension < 0 || tension > 1) {
    throw new RangeError("Cardinal tension must be between 0 and 1.");
  }
  return tension;
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

function buildCardinalCommands(points, tension = 0) {
  const commands = [{ op: "M", x: points[0].x, y: points[0].y }];
  for (let index = 0; index < points.length - 1; index += 1) {
    const before = points[index - 1] ?? points[index];
    const current = points[index];
    const next = points[index + 1];
    const after = points[index + 2] ?? next;
    commands.push({
      op: "C",
      x1: current.x + (next.x - before.x) / 6 * (1 - tension),
      y1: current.y + (next.y - before.y) / 6 * (1 - tension),
      x2: next.x - (after.x - current.x) / 6 * (1 - tension),
      y2: next.y - (after.y - current.y) / 6 * (1 - tension),
      x: next.x,
      y: next.y
    });
  }
  return ownCommands(commands);
}

function monotoneTangents(points) {
  const direction = Math.sign(points[1].x - points[0].x);
  const intervals = points.slice(1).map((point, index) => {
    const previous = points[index];
    const width = point.x - previous.x;
    if (width === 0 || Math.sign(width) !== direction) {
      throw new Error("Monotone curve requires strictly monotonic x values.");
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

function steffenTangents(points) {
  const widths = points.slice(1).map((point, index) => point.x - points[index].x);
  const direction = Math.sign(widths.find(width => width !== 0) ?? 0);
  if (widths.some(width => width !== 0 && Math.sign(width) !== direction)) {
    throw new Error("Steffen curve requires monotonic x values.");
  }
  const slopes = widths.map((width, i) =>
    (points[i + 1].y - points[i].y) / (width || (direction < 0 ? -0 : 0)));
  const tangents = Array(points.length);
  for (let i = 1; i < points.length - 1; i += 1) {
    const a = slopes[i - 1], b = slopes[i];
    const mean = (a * widths[i] + b * widths[i - 1]) / (widths[i - 1] + widths[i]);
    // A zero-width turn has no finite secant estimate; its Hermite limit is flat.
    const sign = value => value < 0 ? -1 : 1;
    const slope = (sign(a) + sign(b)) * Math.min(Math.abs(a), Math.abs(b), Math.abs(mean) / 2);
    tangents[i] = Number.isNaN(slope) && (widths[i - 1] === 0 || widths[i] === 0) ? 0 : slope;
  }
  tangents[0] = widths[0] === 0 ? tangents[1] : (3 * slopes[0] - tangents[1]) / 2;
  tangents[points.length - 1] = widths.at(-1) === 0 ? tangents.at(-2) :
    (3 * slopes.at(-1) - tangents.at(-2)) / 2;
  return tangents;
}

function buildSteffenCommands(points, preserveCoincidentPoints = false) {
  const distinct = preserveCoincidentPoints ? points : points.filter((point, i) => i === 0 ||
    point.x !== points[i - 1].x || point.y !== points[i - 1].y);
  if (distinct.length === 1) return ownCommands([{ op: "M", ...distinct[0] }]);
  if (distinct.length === 2) return buildLinearPathCommands(distinct);
  return buildMonotoneCommands(distinct, steffenTangents(distinct));
}

function buildMonotoneCommands(points, tangents = monotoneTangents(points)) {
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

function buildValidatedCurvePathCommands(points, curve, tension, preserveCoincidentPoints) {
  if (curve === "monotone-steffen") return buildSteffenCommands(points, preserveCoincidentPoints);
  if (curve === "linear" ||
      (SMOOTH_CURVES.has(curve) &&
        curve !== "monotone" &&
        points.length < 3)) {
    return buildLinearPathCommands(points);
  }
  if (curve.startsWith("step")) {
    return buildStepCommands(points, curve);
  }
  if (curve === "basis") return buildBasisCommands(points);
  if (curve === "cardinal") {
    return buildCardinalCommands(points, tension);
  }
  if (curve === "monotone") {
    return buildMonotoneCommands(points);
  }
  return buildNaturalCommands(points);
}

function finiteCommands(commands) {
  return commands.every(command => Object.values(command).every(value =>
    typeof value !== "number" || Number.isFinite(value)
  ));
}

function curveCommandCount(pointCount, curve) {
  if (curve === "step") return pointCount * 3 - 2;
  if (curve === "step-before" || curve === "step-after") {
    return pointCount * 2 - 1;
  }
  return curve === "basis" && pointCount > 2
    ? pointCount + 2
    : pointCount;
}

function buildCurveCommands(points, curve, tension, preserveCoincidentPoints = false) {
  validateCardinalTension(tension, curve);
  const validatedPoints = validatePoints(points);
  const validatedCurve = validateCurveInterpolation(curve);
  validatePathCommandCount(
    curveCommandCount(validatedPoints.length, validatedCurve),
    "Curve path command count"
  );
  const direct = buildValidatedCurvePathCommands(
    validatedPoints,
    validatedCurve, tension, preserveCoincidentPoints
  );
  validatePathCommandCount(direct.length, "Curve path command count");
  if (finiteCommands(direct)) return direct;

  let xScale = 0;
  let yScale = 0;
  for (const point of validatedPoints) {
    xScale = Math.max(xScale, Math.abs(point.x));
    yScale = Math.max(yScale, Math.abs(point.y));
  }
  xScale ||= 1;
  yScale ||= 1;
  const normalized = buildValidatedCurvePathCommands(
    validatedPoints.map(point => ({
      x: point.x / xScale,
      y: point.y / yScale
    })),
    validatedCurve, tension, preserveCoincidentPoints
  );
  const restored = normalized.map(command => {
    const copy = {};
    for (const [key, value] of Object.entries(command)) {
      copy[key] = typeof value === "number"
        ? value * (key[0] === "x" ? xScale : yScale)
        : value;
    }
    return copy;
  });
  if (!finiteCommands(restored)) {
    throw new RangeError("Curve interpolation exceeds the finite numeric range.");
  }
  validatePathCommandCount(restored.length, "Curve path command count");
  return ownCommands(restored);
}

export function buildCurvePathCommands(points, curve = "linear", tension) {
  return buildCurveCommands(points, curve, tension);
}

// A scalar attached to each centerline knot must use exactly the same retained
// knots and command topology. Steffen's coincident-point removal belongs to the
// geometric path, never independently to the companion scalar values.
export function buildPairedCurvePathCommands(points, values, curve = "linear", tension) {
  const validated = validatePoints(points);
  if (!Array.isArray(values) || values.length !== validated.length || values.some(value => !Number.isFinite(value))) {
    throw new TypeError("Paired curve values require one finite value per point.");
  }
  const indices = validated.map((_, index) => index).filter(index => curve !== "monotone-steffen" || index === 0 ||
    validated[index].x !== validated[index - 1].x || validated[index].y !== validated[index - 1].y);
  if (indices.length === 1) return freezeOwned({ commands: ownCommands([{ op: "M", ...validated[0] }]),
    valueCommands: ownCommands([{ op: "M", x: validated[0].x, y: values[0] }]) });
  return freezeOwned({
    commands: buildCurveCommands(indices.map(index => validated[index]), curve, tension),
    valueCommands: buildCurveCommands(indices.map(index => ({ x: validated[index].x, y: values[index] })), curve, tension, true)
  });
}

function reverseOpenPathCommands(commands) {
  const endpoints = commands.map(command => ({ x: command.x, y: command.y }));
  const reversed = [
    { op: "M", x: endpoints.at(-1).x, y: endpoints.at(-1).y }
  ];
  for (let index = commands.length - 1; index > 0; index -= 1) {
    const command = commands[index];
    const endpoint = endpoints[index - 1];
    if (command.op === "C") {
      reversed.push({
        op: "C",
        x1: command.x2,
        y1: command.y2,
        x2: command.x1,
        y2: command.y1,
        x: endpoint.x,
        y: endpoint.y
      });
    } else {
      reversed.push({ op: "L", x: endpoint.x, y: endpoint.y });
    }
  }
  return reversed;
}

function transposeCommands(commands) {
  return commands.map(command => command.op === "C"
    ? {
        op: "C",
        x1: command.y1,
        y1: command.x1,
        x2: command.y2,
        y2: command.x2,
        x: command.y,
        y: command.x
      }
    : command.op === "Z"
      ? command
      : { op: command.op, x: command.y, y: command.x });
}

function buildOrientedCurvePathCommands(points, curve, independentAxis) {
  if (independentAxis === "x") return buildCurvePathCommands(points, curve);
  if (independentAxis !== "y") {
    throw new Error(`Unsupported curve independent axis "${independentAxis}".`);
  }
  const transposed = points.map(point => ({ x: point.y, y: point.x }));
  return ownCommands(transposeCommands(buildCurvePathCommands(transposed, curve)));
}

export function buildAreaCurvePathCommands(
  lowerPoints,
  upperPoints,
  curve = "linear",
  { independentAxis = "x" } = {}
) {
  const validatedCurve = validateCurveInterpolation(curve);
  const validatedLower = validatePoints(lowerPoints);
  const validatedUpper = validatePoints(upperPoints);
  validatePathCommandCount(
    curveCommandCount(validatedLower.length, validatedCurve) +
      curveCommandCount(validatedUpper.length, validatedCurve) + 1,
    "Area path command count"
  );
  const lower = buildOrientedCurvePathCommands(
    validatedLower,
    validatedCurve,
    independentAxis
  );
  const upper = reverseOpenPathCommands(
    buildOrientedCurvePathCommands(validatedUpper, validatedCurve, independentAxis)
  );
  const commands = [
    ...lower,
    { op: "L", x: upper[0].x, y: upper[0].y },
    ...upper.slice(1),
    { op: "Z" }
  ];
  validatePathCommandCount(commands.length, "Area path command count");
  return ownCommands(commands);
}
