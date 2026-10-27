import { getPositionChannelDefinition } from "../core/vocabulary.js";
import { cloneAndFreeze, isPlainObject } from "../core/immutable.js";
import { validateOptionObject } from "../core/validation.js";

const COORDINATE_TYPES = new Set(["cartesian", "polar", "parallel"]);
const ASPECT_MODES = new Set(["frame", "data"]);
const ASPECT_ALIGNMENTS = new Set(["start", "center", "end"]);
const ASPECT_OPTIONS = Object.freeze(["mode", "ratio", "alignX", "alignY"]);

export function validateCoordinateType(value) {
  if (!COORDINATE_TYPES.has(value)) {
    throw new Error(`Unknown coordinate type "${value}".`);
  }

  return value;
}

export function getPositionCoordinateDefaults(channel) {
  const coordinate = getPositionChannelDefinition(channel)?.coordinate;

  if (coordinate === undefined) {
    throw new Error(`Unknown positional channel "${channel}".`);
  }

  return coordinate;
}

function validateAspectAlignment(value, property) {
  if (!ASPECT_ALIGNMENTS.has(value)) {
    throw new Error(`Unknown coordinate aspect ${property} "${value}".`);
  }
  return value;
}

export function normalizeCoordinateAspect(value) {
  if (value === "auto") return value;
  if (!isPlainObject(value)) {
    throw new TypeError(
      'Coordinate aspect must be "auto" or a plain object.'
    );
  }
  validateOptionObject(value, ASPECT_OPTIONS, "coordinate aspect", {
    allowEmpty: false,
    emptyError: TypeError
  });
  if (!ASPECT_MODES.has(value.mode)) {
    throw new Error(`Unknown coordinate aspect mode "${value.mode}".`);
  }
  if (!Number.isFinite(value.ratio) || value.ratio <= 0) {
    throw new RangeError("Coordinate aspect ratio must be a positive finite number.");
  }
  return cloneAndFreeze({
    mode: value.mode,
    ratio: value.ratio,
    alignX: validateAspectAlignment(value.alignX ?? "center", "alignX"),
    alignY: validateAspectAlignment(value.alignY ?? "center", "alignY")
  });
}
