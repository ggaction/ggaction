import { ownArray, ownRecord } from "../../core/ownData.js";
import { cloneAndFreeze } from "../../core/immutable.js";
import { rejectUnknownProperties } from "../../core/validation.js";

const PLANE = { scalePx: "positive-number", translatePx: "point", reflectX: "boolean", reflectY: "boolean", clipExtentPx: "extent-or-null" };
const SPHERE = { ...PLANE, centerDeg: "longitude-latitude", rotateDeg: "rotation", precisionPx: "positive-number", clipAngleDeg: "angle-or-null" };
const CONIC = { ...SPHERE, parallelsDeg: "parallels" };
const COMPOSITE = { scalePx: "positive-number", translatePx: "point", precisionPx: "positive-number" };
const CIRCLES = { orthographic: 90, gnomonic: 60, stereographic: 142, "azimuthal-equal-area": 179.999, "azimuthal-equidistant": 179.999 };
const TYPES = ["mercator", "equirectangular", "equal-earth", "natural-earth", "orthographic", "stereographic", "gnomonic", "azimuthal-equal-area", "azimuthal-equidistant", "conic-equal-area", "conic-conformal", "conic-equidistant", "transverse-mercator", "albers-usa", "identity"];
export const PROJECTION_DESCRIPTORS = cloneAndFreeze(TYPES.map(type => {
  const spherical = type !== "identity", composite = type === "albers-usa";
  const parameterSchema = composite ? COMPOSITE : !spherical ? PLANE : type.startsWith("conic-") ? CONIC : SPHERE;
  const defaultClip = composite ? { type: "insets" } : !spherical ? { type: "none" } : CIRCLES[type] ? { type: "circle", angleDeg: CIRCLES[type] } : { type: "antimeridian", ...(type.includes("mercator") ? { finiteWorldExtent: true } : {}) };
  return { type, supportsInverse: true, spherical, composite, parameterSchema, defaultClip };
}));

export function projectionDescriptor(type) {
  const value = PROJECTION_DESCRIPTORS.find(candidate => candidate.type === type);
  if (!value) throw new TypeError("Projection type is not supported.");
  return value;
}

export function finiteProjectionNumber(value, label) {
  if (typeof value !== "number" || !Number.isFinite(value)) throw new TypeError(`${label} must be finite.`);
  return value;
}

export function projectionTuple(value, sizes, label) {
  ownArray(value, label);
  if (!sizes.includes(value.length)) throw new TypeError(`${label} has an invalid length.`);
  return value.map(number => finiteProjectionNumber(number, label));
}

export function longitudeDegrees(value) { return ((value % 360) + 540) % 360 - 180; }

export function normalizeProjectionOptions(input) {
  ownRecord(input, "Projection options");
  const descriptor = projectionDescriptor(input.type), schema = descriptor.parameterSchema;
  rejectUnknownProperties(input, ["type", ...Object.keys(schema)], "projection");
  const output = { type: input.type, scalePx: descriptor.spherical ? 150 : 1, translatePx: [0, 0] };
  if (schema.reflectX) Object.assign(output, { reflectX: false, reflectY: false, clipExtentPx: null });
  if (schema.precisionPx) output.precisionPx = 0.5;
  if (schema.centerDeg) Object.assign(output, { centerDeg: [0, 0], rotateDeg: [0, 0, 0], clipAngleDeg: CIRCLES[input.type] ?? null });
  if (schema.parallelsDeg) output.parallelsDeg = [30, 60];
  for (const key of Object.keys(input)) {
    if (key === "type") continue;
    const value = input[key];
    if (key === "scalePx" || key === "precisionPx") {
      finiteProjectionNumber(value, key);
      if (value <= 0) throw new RangeError(`${key} must be positive.`);
      output[key] = value;
    } else if (key === "reflectX" || key === "reflectY") {
      if (typeof value !== "boolean") throw new TypeError(`${key} must be boolean.`);
      output[key] = value;
    } else if (key === "clipAngleDeg") {
      if (value !== null) {
        finiteProjectionNumber(value, key);
        if (value <= 0 || value > 180) throw new RangeError("clipAngleDeg must be in (0, 180].");
      }
      output[key] = value;
    } else if (key === "clipExtentPx") {
      if (value === null) output[key] = null;
      else {
        ownArray(value, key);
        if (value.length !== 2) throw new TypeError("clipExtentPx requires two corners.");
        const corners = value.map(point => projectionTuple(point, [2], key));
        if (corners[0].some((number, index) => number >= corners[1][index])) throw new RangeError("clipExtentPx requires increasing finite bounds.");
        output[key] = corners;
      }
    } else {
      const tuple = projectionTuple(value, key === "rotateDeg" ? [2, 3] : [2], key);
      if (key === "centerDeg") {
        if (Math.abs(tuple[1]) > 90) throw new RangeError("centerDeg latitude must be in [-90, 90].");
        tuple[0] = longitudeDegrees(tuple[0]);
      } else if (key === "rotateDeg") {
        while (tuple.length < 3) tuple.push(0);
        for (let index = 0; index < tuple.length; index++) tuple[index] = longitudeDegrees(tuple[index]);
      } else if (key === "parallelsDeg" && tuple.some(number => Math.abs(number) >= 90)) throw new RangeError("parallelsDeg cannot contain singular polar parallels.");
      output[key] = tuple;
    }
  }
  const angle = output.clipAngleDeg;
  if (input.type in CIRCLES && (angle === null || angle > (input.type === "orthographic" ? 90 : 180) || (input.type === "gnomonic" && angle >= 90) || (input.type !== "orthographic" && angle >= 180))) {
    throw new RangeError("clipAngleDeg exceeds the projection's invertible domain.");
  }
  return cloneAndFreeze(output);
}
