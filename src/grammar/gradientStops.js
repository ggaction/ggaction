import { isPlainObject } from "../core/immutable.js";

const STOP_KEYS = Object.freeze(["offset", "color"]);

function validateStop(stop, index, gradientLabel) {
  const label = `${gradientLabel} stops[${index}]`;
  if (!isPlainObject(stop) || !(Object.keys(stop).length === STOP_KEYS.length && STOP_KEYS.every(key => Object.hasOwn(stop, key)))) {
    throw new TypeError(`${label} must be a plain { offset, color } object.`);
  }
  if (!Number.isFinite(stop.offset) || stop.offset < 0 || stop.offset > 1) {
    throw new RangeError(`${label}.offset must be a finite number from 0 to 1.`);
  }
  if (typeof stop.color !== "string" || stop.color.length === 0) {
    throw new TypeError(`${label}.color must be a non-empty string.`);
  }
}

// Shared stop policy. Callers own descriptor safety and allocation budgets.
export function validateGradientStops(stops, label = "Linear gradient") {
  if (!Array.isArray(stops) || stops.length < 2) {
    throw new TypeError(`${label} stops must contain at least two entries.`);
  }
  stops.forEach((stop, index) => validateStop(stop, index, label));
  for (let index = 1; index < stops.length; index += 1) {
    if (stops[index].offset < stops[index - 1].offset) {
      throw new Error(`${label} stop offsets must be nondecreasing.`);
    }
  }
  return stops;
}

