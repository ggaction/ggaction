import { cloneAndFreeze } from "../../core/immutable.js";

const POSITION_CHANNELS = new Set(["x", "y"]);

export function validatePair(value, label) {
  if (
    !Array.isArray(value) ||
    value.length !== 2 ||
    !value.every(Number.isFinite)
  ) {
    throw new TypeError(`${label} must be "auto" or two finite numbers.`);
  }
  return cloneAndFreeze(value);
}

export function validatePositionChannel(channel) {
  if (!POSITION_CHANNELS.has(channel)) {
    throw new Error(`Unknown position channel "${channel}".`);
  }
  return channel;
}

export function validateScaleType(type) {
  if (!['linear', 'ordinal', 'time'].includes(type)) {
    throw new Error(`Unsupported scale type "${type}".`);
  }
  return type;
}

export function validateSemanticScaleType(type) {
  if (type === "sequential") return type;
  return validateScaleType(type);
}

export function validateLinearScaleType(type) {
  if (type !== "linear") {
    throw new Error(`Unsupported position scale type "${type}".`);
  }
  return type;
}

export function validateTimeScaleType(type) {
  if (type !== "time") {
    throw new Error(`Unsupported temporal scale type "${type}".`);
  }
  return type;
}

export function validateOrdinalScaleType(type) {
  if (type !== "ordinal") {
    throw new Error(`Unsupported color scale type "${type}".`);
  }
  return type;
}

export function validateScaleDomain(domain) {
  return domain === "auto" ? domain : validatePair(domain, "Scale domain");
}

export function validateScaleRange(range) {
  return range === "auto" ? range : validatePair(range, "Scale range");
}

export function validateSemanticScaleDomain(domain) {
  if (domain === "auto") return domain;
  if (!Array.isArray(domain) || domain.length === 0) {
    throw new TypeError("Scale domain must be \"auto\" or a non-empty array.");
  }
  return cloneAndFreeze(domain);
}
