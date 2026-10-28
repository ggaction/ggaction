import { cloneAndFreeze } from "../core/immutable.js";
import { ownArray, ownRecord } from "../core/ownData.js";
import { validateKeys, validatePositiveFinite, validateUnitInterval, validateWorkLimit } from "../core/validation.js";
import { interpolateNumber } from "./numeric.js";
import { validateGradientStops } from "./gradientStops.js";

function point(value, label) {
  ownRecord(value, label);
  if (Object.keys(value).length !== 2 || !Object.hasOwn(value, "x") || !Object.hasOwn(value, "y") ||
      !Number.isFinite(value.x) || !Number.isFinite(value.y)) {
    throw new TypeError(`${label} requires finite { x, y } coordinates.`);
  }
  return { x: value.x === 0 ? 0 : value.x, y: value.y === 0 ? 0 : value.y };
}

// Private geometry: coordinates and radius use one explicit, common unit.
// No bounds mapping, public paint tag, resource lookup or renderer state.
export function normalizeRadialGradient(options) {
  ownRecord(options, "Radial gradient options");
  options = Object.assign(Object.create(null), options);
  validateKeys(options, ["center", "focal", "radius", "stops"], "Radial gradient");
  if (Object.values(options).some(value => value === undefined)) {
    throw new TypeError("Radial gradient options cannot contain explicit undefined.");
  }
  for (const key of ["center", "radius", "stops"]) {
    if (!Object.hasOwn(options, key)) throw new TypeError(`Radial gradient requires ${key}.`);
  }
  const center = point(options.center, "Radial gradient center");
  const focal = Object.hasOwn(options, "focal") ? point(options.focal, "Radial gradient focal") : center;
  validatePositiveFinite(options.radius, "Radial gradient radius");
  const dx = focal.x - center.x, dy = focal.y - center.y;
  const scale = Math.max(Math.abs(dx), Math.abs(dy), options.radius);
  if (!Number.isFinite(scale) || Math.hypot(dx / scale, dy / scale) > options.radius / scale) {
    throw new RangeError("Radial gradient focal must lie inside or on the end circle.");
  }
  if (Array.isArray(options.stops)) validateWorkLimit(options.stops.length, "Radial gradient stop count");
  ownArray(options.stops, "Radial gradient stops");
  options.stops.forEach((stop, index) => ownRecord(stop, `Radial gradient stops[${index}]`));
  validateGradientStops(options.stops, "Radial gradient");
  let work = options.stops.length;
  for (const stop of options.stops) {
    work += stop.color.length;
    validateWorkLimit(work, "Radial gradient stops work");
  }
  return cloneAndFreeze({ center, focal, radius: options.radius, stops: options.stops });
}

// A stop offset describes one circle of the radial cone; no color interpolation.
export function radialGradientCircle(options, offset) {
  const gradient = normalizeRadialGradient(options);
  validateUnitInterval(offset, "Radial gradient circle offset");
  return Object.freeze({ x: interpolateNumber(gradient.focal.x, gradient.center.x, offset),
    y: interpolateNumber(gradient.focal.y, gradient.center.y, offset), radius: gradient.radius * offset });
}
