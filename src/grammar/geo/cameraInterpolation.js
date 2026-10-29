import { cloneAndFreeze } from "../../core/immutable.js";
import { canonicalJSON } from "../../core/contentDigest.js";
import { finiteProjectionNumber, normalizeProjectionOptions } from "./projectionOptions.js";
import { interpolateNumber, interpolatePositiveScale } from "../animation/values.js";

const RADIANS = Math.PI / 180;

function quaternion([longitude, latitude, roll]) {
  const a = longitude * RADIANS / 2, b = -latitude * RADIANS / 2, c = roll * RADIANS / 2;
  const ca = Math.cos(a), sa = Math.sin(a), cb = Math.cos(b), sb = Math.sin(b), cc = Math.cos(c), sc = Math.sin(c);
  // Spherical projection rotation is Rx(roll) Ry(-latitude) Rz(longitude).
  return [cc * cb * ca - sc * sb * sa, sc * cb * ca + cc * sb * sa,
    cc * sb * ca - sc * cb * sa, cc * cb * sa + sc * sb * ca];
}

function rotation(from, to, progress) {
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

// This sampler describes the current projection or a two-endpoint crossfade.
// It does not write resources, run a player, or change renderer state.
export function interpolateGeoCamera(inputFrom, inputTo, progress) {
  const from = normalizeProjectionOptions(inputFrom), to = normalizeProjectionOptions(inputTo);
  finiteProjectionNumber(progress, "Camera progress");
  if (progress < 0 || progress > 1) throw new RangeError("Camera progress must be in [0, 1].");
  const reason = from.type !== to.type ? "projection-type"
    : canonicalJSON(staticParameters(from)) !== canonicalJSON(staticParameters(to)) ? "projection-parameters" : undefined;
  if (reason !== undefined) return cloneAndFreeze({ mode: "crossfade", from, to, progress, reason, weights: [1 - progress, progress] });
  if (progress === 0 || progress === 1) return cloneAndFreeze({ mode: "camera", parameters: progress === 0 ? from : to, progress });
  const parameters = normalizeProjectionOptions({ ...from,
    scalePx: interpolatePositiveScale(from.scalePx, to.scalePx, progress),
    translatePx: from.translatePx.map((value, index) => interpolateNumber(value, to.translatePx[index], progress)),
    ...(from.rotateDeg === undefined ? {} : { rotateDeg: rotation(from.rotateDeg, to.rotateDeg, progress) }) });
  return cloneAndFreeze({ mode: "camera", parameters, progress });
}
