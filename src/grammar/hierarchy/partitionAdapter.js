import { cloneAndFreeze } from "../../core/immutable.js";
import { ownArray, ownRecord } from "../../core/ownData.js";
import { rejectUnknownProperties } from "../../core/validation.js";
import { interpolateNumber } from "../numeric.js";
import { partitionRadius } from "./partitionMapping.js";
import { bendPartitionPoint } from "./partitionBend.js";

const RECTANGLE = ["x", "y", "width", "height", "orientation", "reverseU", "reverseV"];
const POLAR = ["centerX", "centerY", "innerRadius", "outerRadius", "startAngle", "sweep", "direction", "reverseU", "reverseV", "radiusPolicy"];
function record(value, keys, label) {
  ownRecord(value, label); rejectUnknownProperties(value, keys, label);
  if (keys.some(key => !Object.hasOwn(value, key))) throw new TypeError(`${label} requires every resolved field.`);
}
function boolean(value) { if (typeof value !== "boolean") throw new TypeError("Partition direction flags must be boolean."); }

// Closed screen adapter. Canonical bend uses a positive-handed (u, depth) basis.
// A reflection cannot continuously become a rotation without collapsing area.
export function createPartitionBendAdapter(rectangle, polar) {
  record(rectangle, RECTANGLE, "Partition rectangular endpoint"); record(polar, POLAR, "Partition polar endpoint");
  if (![rectangle.x, rectangle.y, rectangle.width, rectangle.height, polar.centerX, polar.centerY, polar.startAngle, polar.sweep].every(Number.isFinite) ||
      rectangle.width <= 0 || rectangle.height <= 0 || polar.sweep <= 0 || polar.sweep > 360) throw new RangeError("Partition endpoint frames and angles must be finite and positive.");
  if (!["horizontal", "vertical"].includes(rectangle.orientation) || !["clockwise", "counterclockwise"].includes(polar.direction)) throw new TypeError("Invalid partition endpoint orientation.");
  [rectangle.reverseU, rectangle.reverseV, polar.reverseU, polar.reverseV].forEach(boolean);
  partitionRadius(.5, { innerRadius: polar.innerRadius, outerRadius: polar.outerRadius, radiusPolicy: polar.radiusPolicy });
  const horizontal = rectangle.orientation === "horizontal", uSign = rectangle.reverseU ? -1 : 1;
  const depthSign = (rectangle.reverseV ? -1 : 1) * (polar.reverseV ? -1 : 1);
  const handedness = (horizontal ? 1 : -1) * uSign * depthSign;
  const turn = (polar.direction === "clockwise" ? 1 : -1) * (polar.reverseU ? -1 : 1);
  if (handedness !== -turn) return cloneAndFreeze({ compatible: false, reason: "handedness" });
  const angle0 = horizontal ? Math.atan2(0, uSign) : Math.atan2(uSign, 0);
  const centerAngle = (polar.startAngle + (polar.direction === "clockwise" ? 1 : -1) * polar.sweep / 2) * Math.PI / 180;
  const angle1 = Math.atan2(turn * Math.sin(centerAngle), turn * Math.cos(centerAngle));
  const rotation = Math.atan2(Math.sin(angle1 - angle0), Math.cos(angle1 - angle0));
  const depthStart = rectangle.reverseV !== polar.reverseV ? 1 : 0;
  const origin = horizontal ? [rectangle.x + rectangle.width / 2, rectangle.y + rectangle.height * depthStart]
    : [rectangle.x + rectangle.width * depthStart, rectangle.y + rectangle.height / 2];
  return cloneAndFreeze({ compatible: true, handedness, angle0, rotation, origin, center: [polar.centerX, polar.centerY], reverseV: polar.reverseV,
    kernel: { width: horizontal ? rectangle.width : rectangle.height, height: horizontal ? rectangle.height : rectangle.width,
      innerRadius: polar.innerRadius, outerRadius: polar.outerRadius, radiusPolicy: polar.radiusPolicy, sweep: polar.sweep * Math.PI / 180 } });
}

export function samplePartitionBendPoint(adapter, point) {
  if (adapter?.compatible !== true) throw new TypeError("Partition bend requires compatible endpoint handedness.");
  const b = point.bend;
  return mapPartitionBendPoint({ kernel: adapter.kernel, handedness: adapter.handedness,
    angle: adapter.angle0 + adapter.rotation * b,
    origin: adapter.origin.map((value, index) => interpolateNumber(value, adapter.center[index], b)) }, point);
}

export function mapPartitionBendPoint(frame, point) {
  record(frame, ["kernel", "handedness", "angle", "origin"], "Partition bend frame");
  ownArray(frame.origin, "Partition frame origin");
  if (frame.origin.length !== 2 || !frame.origin.every(Number.isFinite) || !Number.isFinite(frame.angle) || ![1, -1].includes(frame.handedness)) throw new TypeError("Partition bend frame requires finite origin, angle and handedness.");
  const canonical = bendPartitionPoint(point, frame.kernel), x = Math.cos(frame.angle), y = Math.sin(frame.angle);
  const result = { x: frame.origin[0] + x * canonical.x - frame.handedness * y * canonical.y,
    y: frame.origin[1] + y * canonical.x + frame.handedness * x * canonical.y };
  if (!Object.values(result).every(Number.isFinite)) throw new RangeError("Partition screen coordinates exceed finite values.");
  return cloneAndFreeze(result);
}

// One conservative chord count for the entire frame. The bound evaluates R*theta²
// directly, avoiding the divergent canonical radius when bend approaches zero.
export function partitionBendSegments(adapter, bend, tolerance = .2) {
  if (adapter?.compatible !== true || !Number.isFinite(bend) || bend < 0 || bend > 1 || !Number.isFinite(tolerance) || tolerance <= 0) throw new RangeError("Invalid partition tessellation request.");
  const { width, height, outerRadius, sweep } = adapter.kernel;
  const curvature = (1 - bend) * width * sweep * bend + (height + outerRadius) * (sweep * bend) ** 2;
  const count = Math.max(1, Math.ceil(Math.sqrt(curvature / (8 * tolerance))));
  if (!Number.isSafeInteger(count) || count > 4096) throw new RangeError("Partition tessellation exceeds the segment budget.");
  return count;
}
