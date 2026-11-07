import { cloneAndFreeze } from "../../core/immutable.js";
import { canonicalJSON } from "../../core/contentDigest.js";
import { ownRecord } from "../../core/ownData.js";
import { rejectUnknownProperties } from "../../core/validation.js";
import { finiteProjectionNumber, normalizeProjectionOptions } from "./projectionOptions.js";
import { interpolateNumber, interpolatePositiveScale } from "../animation/values.js";

const RADIANS = Math.PI / 180;
export const GEO_CAMERA_INTERPOLATION_VERSION = 1;

function quaternion([longitude, latitude, roll]) {
  const a = longitude * RADIANS / 2, b = -latitude * RADIANS / 2, c = roll * RADIANS / 2;
  const ca = Math.cos(a), sa = Math.sin(a), cb = Math.cos(b), sb = Math.sin(b), cc = Math.cos(c), sc = Math.sin(c);
  // Spherical projection rotation is Rx(roll) Ry(-latitude) Rz(longitude).
  return [cc * cb * ca - sc * sb * sa, sc * cb * ca + cc * sb * sa,
    cc * sb * ca - sc * cb * sa, cc * cb * sa + sc * sb * ca];
}

function rotation(from, to, progress) {
  if (from.every((value, index) => value === to[index])) return from;
  const a = quaternion(from), b = quaternion(to);
  let dot = a.reduce((sum, value, index) => sum + value * b[index], 0);
  if (dot < 0) { for (let index = 0; index < 4; index++) b[index] = -b[index]; dot = -dot; }
  dot = Math.max(-1, Math.min(1, dot));
  const angle = Math.acos(dot), sine = Math.sin(angle);
  const weights = dot > 0.9995 ? [1 - progress, progress]
    : [Math.sin((1 - progress) * angle) / sine, Math.sin(progress * angle) / sine];
  const values = a.map((value, index) => value * weights[0] + b[index] * weights[1]);
  const norm = Math.hypot(...values), [w, x, y, z] = values.map(value => value / norm);
  const r00 = 1 - 2 * (y * y + z * z), r01 = 2 * (x * y - w * z), r02 = 2 * (x * z + w * y);
  // atan2 avoids the precision loss of asin near an Euler pole.
  const latitude = Math.atan2(-r02, Math.hypot(r00, r01));
  const singular = Math.abs(Math.cos(latitude)) < 1e-8;
  const longitude = singular ? Math.atan2(2 * (x * y + w * z), 1 - 2 * (x * x + z * z)) : Math.atan2(-r01, r00);
  const roll = singular ? 0 : Math.atan2(-2 * (y * z - w * x), 1 - 2 * (x * x + y * y));
  return [longitude, latitude, roll].map(value => value / RADIANS);
}

function staticParameters(options) {
  const { scalePx, translatePx, rotateDeg, ...parameters } = options;
  return parameters;
}

export function prepareGeoCameraInterpolation(inputFrom, inputTo) {
  const from = normalizeProjectionOptions(inputFrom), to = normalizeProjectionOptions(inputTo);
  const reason = from.type !== to.type ? "projection-type"
    : canonicalJSON(staticParameters(from)) !== canonicalJSON(staticParameters(to)) ? "projection-parameters" : undefined;
  return cloneAndFreeze({ kind: "geo-camera", version: GEO_CAMERA_INTERPOLATION_VERSION,
    mode: reason === undefined ? "camera" : "crossfade", from, to, ...(reason === undefined ? {} : { reason }) });
}

// Admission is value based so offline tracks need no process-local authority.
function validateTrack(input) {
  ownRecord(input, "Geo camera track");
  rejectUnknownProperties(input, ["kind", "version", "mode", "from", "to", "reason"], "geo camera track");
  if (input.kind !== "geo-camera" || input.version !== GEO_CAMERA_INTERPOLATION_VERSION) {
    throw new TypeError("Geo camera track kind or version is not supported.");
  }
  const expected = prepareGeoCameraInterpolation(input.from, input.to);
  if (input.mode !== expected.mode || Object.hasOwn(input, "reason") !== Object.hasOwn(expected, "reason") || input.reason !== expected.reason ||
      canonicalJSON(input.from) !== canonicalJSON(expected.from) || canonicalJSON(input.to) !== canonicalJSON(expected.to)) {
    throw new TypeError("Geo camera track must contain normalized endpoints and their exact compatibility decision.");
  }
  return expected;
}

function sampleTrack({ from, to, reason }, progress) {
  finiteProjectionNumber(progress, "Camera progress");
  if (progress < 0 || progress > 1) throw new RangeError("Camera progress must be in [0, 1].");
  if (reason !== undefined) return cloneAndFreeze({ mode: "crossfade", from, to, progress, reason, weights: [1 - progress, progress] });
  if (progress === 0 || progress === 1) return cloneAndFreeze({ mode: "camera", parameters: progress === 0 ? from : to, progress });
  const parameters = normalizeProjectionOptions({ ...from,
    scalePx: interpolatePositiveScale(from.scalePx, to.scalePx, progress),
    translatePx: from.translatePx.map((value, index) => interpolateNumber(value, to.translatePx[index], progress)),
    ...(from.rotateDeg === undefined ? {} : { rotateDeg: rotation(from.rotateDeg, to.rotateDeg, progress) }) });
  return cloneAndFreeze({ mode: "camera", parameters, progress });
}

// Neither entry writes resources, fits geometry, runs a clock, or reads pixels.
export function sampleGeoCameraInterpolation(track, progress) {
  return sampleTrack(validateTrack(track), progress);
}

export function interpolateGeoCamera(inputFrom, inputTo, progress) {
  return sampleTrack(prepareGeoCameraInterpolation(inputFrom, inputTo), progress);
}
