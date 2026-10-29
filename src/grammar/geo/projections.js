import { cloneAndFreeze } from "../../core/immutable.js";
import { ownRecord } from "../../core/ownData.js";
import { rejectUnknownProperties } from "../../core/validation.js";
import { normalizeProjectionOptions, projectionDescriptor, projectionTuple, longitudeDegrees } from "./projectionOptions.js";
import { buildProjectionMath, rawProjectionMath } from "./projectionMath.js";

const RADIANS = Math.PI / 180;
function finitePoint(point) { return point?.length === 2 && point.every(Number.isFinite); }
function result(point, reason = null, component = null) { return cloneAndFreeze({ point, reason, component }); }
function sourcePoint(value, spherical) {
  const point = projectionTuple(value, [2], "Projection point");
  if (spherical) {
    if (Math.abs(point[1]) > 90) throw new RangeError("Projection latitude must be in [-90, 90].");
    point[0] = longitudeDegrees(point[0]);
  }
  return point;
}
function streamedPoint(projection, input) {
  let point = null;
  projection.stream({ point(x, y) { point = [x, y]; } }).point(...input);
  return finitePoint(point) ? point : null;
}
function inExtent(point, extent) { return point.every((value, index) => value >= extent[0][index] && value < extent[1][index]); }

export function createProjectionKernel(input) {
  const options = normalizeProjectionOptions(input), descriptor = projectionDescriptor(options.type);
  const { parts, rotate } = buildProjectionMath(options);
  function forward(value) {
    const point = sourcePoint(value, descriptor.spherical);
    if (options.type === "orthographic") {
      const rotated = rotate(point);
      if (Math.cos(rotated[0] * RADIANS) * Math.cos(rotated[1] * RADIANS) < -1e-14) return result(null, "outside-visible-domain");
    }
    let nonFinite = false;
    for (const part of parts) {
      if (!finitePoint(part.projection(point))) { nonFinite = true; continue; }
      const projected = streamedPoint(part.projection, point);
      if (projected) return result(projected, null, part.id);
    }
    return result(null, nonFinite ? "non-finite-projection" : "outside-visible-domain");
  }
  function inverse(value, settings = {}) {
    const point = projectionTuple(value, [2], "Inverse screen point");
    ownRecord(settings, "Inverse options");
    rejectUnknownProperties(settings, ["component"], "projection inverse");
    if (Object.hasOwn(settings, "component") && (!descriptor.composite || !parts.some(part => part.id === settings.component))) throw new TypeError("Inverse component is not supported by this projection.");
    const part = descriptor.composite ? [...parts.slice(1), parts[0]].find(candidate => inExtent(point, candidate.extent)) : parts[0];
    if (!part || settings.component !== undefined && settings.component !== part.id) return result(null, "outside-visible-domain");
    const candidate = part.projection.invert(point);
    if (!finitePoint(candidate) || descriptor.spherical && Math.abs(candidate[1]) > 90 + 1e-9) return result(null, "outside-invertible-domain");
    if (descriptor.spherical) { candidate[0] = longitudeDegrees(candidate[0]); candidate[1] = Math.max(-90, Math.min(90, candidate[1])); }
    const projected = forward(candidate);
    if (!projected.point || projected.component !== part.id || Math.hypot(projected.point[0] - point[0], projected.point[1] - point[1]) > Math.min(0.25, Math.max(1, options.scalePx) * 1e-8)) return result(null, "outside-visible-domain");
    return result(candidate, null, part.id);
  }
  return Object.freeze({ options, descriptor, forward, inverse });
}

// Raw mathematics uses radians and y-up, without camera or screen clipping.
export function projectRaw(input, value) {
  const options = normalizeProjectionOptions(input), descriptor = projectionDescriptor(options.type);
  if (descriptor.composite) throw new TypeError("Composite projection has no single raw coordinate system.");
  const point = projectionTuple(value, [2], "Raw projection point");
  if (descriptor.spherical && Math.abs(point[1]) > Math.PI / 2) throw new RangeError("Raw projection latitude must be in [-pi/2, pi/2].");
  const cosine = Math.cos(point[0]) * Math.cos(point[1]);
  if (options.type === "orthographic" && cosine < -1e-14 || options.type === "gnomonic" && cosine <= 1e-14) return result(null, "outside-visible-domain");
  if (options.type === "mercator" && Math.abs(point[1]) === Math.PI / 2 || ["stereographic", "azimuthal-equal-area", "azimuthal-equidistant"].includes(options.type) && cosine <= -1 + 1e-14) return result(null, "singular-point");
  if (options.type === "transverse-mercator" && Math.abs(Math.cos(point[1]) * Math.sin(point[0])) >= 1 - 1e-14) return result(null, "singular-point");
  const projected = rawProjectionMath(options)(...point);
  return finitePoint(projected) ? result(projected) : result(null, "singular-point");
}
