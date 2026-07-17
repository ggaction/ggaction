import { freezeOwned } from "../core/immutable.js";

const KAPPA = 0.5522847498307936;
const MAX_ARC_SEGMENT = 90;

function validateFrame(frame) {
  if (
    frame === null ||
    typeof frame !== "object" ||
    ![frame.centerX, frame.centerY, frame.availableRadius].every(Number.isFinite) ||
    frame.availableRadius < 0
  ) {
    throw new TypeError(
      "Polar path frame requires finite centerX, centerY, and non-negative availableRadius."
    );
  }
  return frame;
}

function validateRadius(value, label, frame) {
  if (!Number.isFinite(value) || value < 0) {
    throw new RangeError(`${label} must be a non-negative finite number.`);
  }
  if (value > frame.availableRadius) {
    throw new RangeError(`${label} must fit inside the Polar frame.`);
  }
  return value;
}

function pointAt(frame, theta, radius) {
  const radians = theta * Math.PI / 180;
  return {
    x: frame.centerX + radius * Math.sin(radians),
    y: frame.centerY - radius * Math.cos(radians)
  };
}

function arcCommands(frame, radius, startTheta, endTheta) {
  const sweep = endTheta - startTheta;
  const segments = Math.ceil(Math.abs(sweep) / MAX_ARC_SEGMENT);
  const delta = sweep / segments;
  const commands = [];
  for (let index = 0; index < segments; index += 1) {
    const start = startTheta + delta * index;
    const end = start + delta;
    const startRadians = start * Math.PI / 180;
    const endRadians = end * Math.PI / 180;
    const deltaRadians = endRadians - startRadians;
    const control = 4 / 3 * Math.tan(deltaRadians / 4);
    const from = pointAt(frame, start, radius);
    const to = pointAt(frame, end, radius);
    const fromDerivative = {
      x: radius * Math.cos(startRadians),
      y: radius * Math.sin(startRadians)
    };
    const toDerivative = {
      x: radius * Math.cos(endRadians),
      y: radius * Math.sin(endRadians)
    };
    commands.push({
      op: "C",
      x1: from.x + control * fromDerivative.x,
      y1: from.y + control * fromDerivative.y,
      x2: to.x - control * toDerivative.x,
      y2: to.y - control * toDerivative.y,
      x: to.x,
      y: to.y
    });
  }
  return commands;
}

export function buildPolarCircleCommands(frame, radius) {
  validateFrame(frame);
  validateRadius(radius, "Polar circle radius", frame);
  const control = radius * KAPPA;
  const { centerX: cx, centerY: cy } = frame;
  return freezeOwned([
    { op: "M", x: cx, y: cy - radius },
    {
      op: "C",
      x1: cx + control,
      y1: cy - radius,
      x2: cx + radius,
      y2: cy - control,
      x: cx + radius,
      y: cy
    },
    {
      op: "C",
      x1: cx + radius,
      y1: cy + control,
      x2: cx + control,
      y2: cy + radius,
      x: cx,
      y: cy + radius
    },
    {
      op: "C",
      x1: cx - control,
      y1: cy + radius,
      x2: cx - radius,
      y2: cy + control,
      x: cx - radius,
      y: cy
    },
    {
      op: "C",
      x1: cx - radius,
      y1: cy - control,
      x2: cx - control,
      y2: cy - radius,
      x: cx,
      y: cy - radius
    },
    { op: "Z" }
  ]);
}

export function buildAnnularSectorCommands({
  frame,
  startTheta,
  endTheta,
  innerRadius = 0,
  outerRadius,
  padAngle = 0
}) {
  validateFrame(frame);
  if (![startTheta, endTheta].every(Number.isFinite)) {
    throw new TypeError("Polar sector angles must be finite numbers.");
  }
  validateRadius(innerRadius, "Polar sector innerRadius", frame);
  validateRadius(outerRadius, "Polar sector outerRadius", frame);
  if (outerRadius <= innerRadius) {
    throw new RangeError("Polar sector outerRadius must be greater than innerRadius.");
  }
  const sweep = endTheta - startTheta;
  if (sweep === 0 || Math.abs(sweep) > 360) {
    throw new RangeError("Polar sector sweep must be non-zero and at most 360 degrees.");
  }
  if (!Number.isFinite(padAngle) || padAngle < 0 || padAngle >= Math.abs(sweep)) {
    throw new RangeError(
      "Polar sector padAngle must be non-negative and smaller than its sweep."
    );
  }
  const direction = Math.sign(sweep);
  const start = startTheta + direction * padAngle / 2;
  const end = endTheta - direction * padAngle / 2;
  const commands = [
    { op: "M", ...pointAt(frame, start, outerRadius) },
    ...arcCommands(frame, outerRadius, start, end)
  ];
  if (innerRadius === 0) {
    commands.push({ op: "L", x: frame.centerX, y: frame.centerY });
  } else {
    commands.push({ op: "L", ...pointAt(frame, end, innerRadius) });
    commands.push(...arcCommands(frame, innerRadius, end, start));
  }
  commands.push({ op: "Z" });
  return freezeOwned(commands);
}
