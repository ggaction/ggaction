import { cloneAndFreeze } from "../../core/immutable.js";
import { POSITION_CHANNELS } from "../../core/vocabulary.js";
import { validateCompleteScaleType } from "./types.js";

export function validateFiniteScaleArray(value, label, minimumLength = 1) {
  if (
    !Array.isArray(value) ||
    value.length < minimumLength ||
    !value.every(Number.isFinite)
  ) {
    throw new TypeError(`${label} must contain finite numbers.`);
  }
  return value;
}

export function validateIncreasingScaleArray(value, label) {
  validateFiniteScaleArray(value, label);
  if (value.some((item, index) => index > 0 && item <= value[index - 1])) {
    throw new RangeError(`${label} must be strictly increasing.`);
  }
  return value;
}

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
  if (!POSITION_CHANNELS.includes(channel)) {
    throw new Error(`Unknown position channel "${channel}".`);
  }
  return channel;
}

export function validateScaleType(type) {
  return validateCompleteScaleType(type);
}

export function validateSemanticScaleType(type) {
  return validateCompleteScaleType(type);
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
