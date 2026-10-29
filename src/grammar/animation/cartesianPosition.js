import { cloneAndFreeze } from "../../core/immutable.js";
import { ownArray, ownRecord } from "../../core/ownData.js";
import { rejectUnknownProperties, validateUnitInterval } from "../../core/validation.js";
import { resolveDiscretePositionScale, resolveOrdinalPositionScale, resolveOrdinalOffsetScale, mapOrdinalPositionValues, mapOrdinalOffsetValues } from "../scales/ordinal.js";
import { mapContinuousScaleValues } from "../scales/mapping.js";
import { normalizePositionEndpoint, preparePositionInterpolation, samplePositionInterpolation } from "./positions.js";
import { interpolateNumber } from "./values.js";

const discrete = new Set(["ordinal", "band", "point", "ordinal-offset"]);
const fade = reason => Object.freeze({ kind: "crossfade", reason });
const parameters = type => ["band", "ordinal-offset"].includes(type) ? ["paddingInner", "paddingOuter", "align"] : type === "point" ? ["padding", "align"] : [];

// Store mapping intent, never the redundant start/step/bandwidth cache. Native
// ordinal resolution owns those values for every sampled range as well.
export function cartesianPosition(value, scale) {
  const keys = ["type", "domain", "range", ...(discrete.has(scale?.type) ? parameters(scale.type)
    : ["clamp", ...(scale?.type === "log" ? ["base"] : scale?.type === "pow" ? ["exponent"] : scale?.type === "symlog" ? ["constant"] : [])])];
  const input = { value, scale: Object.fromEntries(keys.filter(key => Object.hasOwn(scale, key)).map(key => [key, scale[key]])) };
  return normalizeCartesianPosition(input);
}

export function normalizeCartesianPosition(input) {
  ownRecord(input, "Cartesian animation position");
  rejectUnknownProperties(input, ["value", "scale"], "Cartesian animation position");
  const scale = ownRecord(input.scale, "Cartesian animation scale");
  if (!discrete.has(scale.type)) return cloneAndFreeze(normalizePositionEndpoint(input));
  rejectUnknownProperties(scale, ["type", "domain", "range", ...parameters(scale.type)], "Cartesian animation scale");
  ownArray(scale.domain, "Cartesian animation domain");
  ownArray(scale.range, "Cartesian animation range");
  if (scale.range.length !== 2 || !scale.range.every(Number.isFinite)) throw new TypeError("Cartesian animation range requires two finite numbers.");
  if (Object.values(scale).some(value => value === undefined)) throw new TypeError("Cartesian animation scale values cannot be undefined.");
  const resolved = resolveDiscrete(scale, input.value);
  return cloneAndFreeze({ value: input.value, scale: Object.fromEntries(["type", "domain", "range", ...parameters(scale.type)].map(key => [key, key === "type" ? scale.type : resolved[key]])) });
}

function resolveDiscrete(scale, value) {
  const resolve = scale.type === "ordinal-offset" ? resolveOrdinalOffsetScale : scale.type === "ordinal" ? resolveOrdinalPositionScale : resolveDiscretePositionScale;
  return resolve({ ...scale, values: [value], channel: "x", parentBandwidth: 1 });
}

export function resolveCartesianPosition(input) {
  const normalized = normalizeCartesianPosition(input);
  if (discrete.has(normalized.scale.type)) {
    const scale = resolveDiscrete(normalized.scale, normalized.value);
    return { ...normalized, resolvedScale: scale, position: (normalized.scale.type === "ordinal-offset" ? mapOrdinalOffsetValues : mapOrdinalPositionValues)([normalized.value], scale)[0] };
  }
  return { kind: "position", ...normalized, resolvedScale: normalized.scale,
    position: mapContinuousScaleValues([normalized.value], normalized.scale)[0] };
}

export function prepareCartesianPosition(fromInput, toInput) {
  const from = normalizeCartesianPosition(fromInput), to = normalizeCartesianPosition(toInput);
  if (from.scale.type !== to.scale.type) return fade("scale-type");
  if (!discrete.has(from.scale.type)) return preparePositionInterpolation(from, to);
  if (!Object.is(from.value, to.value) || from.scale.domain.length !== to.scale.domain.length ||
      from.scale.domain.some((value, i) => !Object.is(value, to.scale.domain[i]))) return fade("ordinal-domain");
  if (parameters(from.scale.type).some(key => from.scale[key] !== to.scale[key])) return fade("scale-parameters");
  if (Math.sign(from.scale.range[1] - from.scale.range[0]) !== Math.sign(to.scale.range[1] - to.scale.range[0])) return fade("scale-direction");
  return cloneAndFreeze({ kind: "discrete-position", from, to });
}

export function sampleCartesianPosition(plan, progress) {
  validateUnitInterval(progress, "Cartesian animation progress");
  ownRecord(plan, "Prepared Cartesian animation position");
  if (plan.kind === "position") {
    const sampled = samplePositionInterpolation(plan, progress);
    return sampled.kind === "crossfade" ? sampled : { ...sampled, resolvedScale: sampled.scale };
  }
  rejectUnknownProperties(plan, ["kind", "from", "to"], "prepared Cartesian animation position");
  if (plan.kind !== "discrete-position" || prepareCartesianPosition(plan.from, plan.to).kind !== "discrete-position") throw new TypeError("Invalid prepared Cartesian discrete position.");
  const scale = { ...plan.from.scale, range: plan.from.scale.range.map((v, i) => interpolateNumber(v, plan.to.scale.range[i], progress)) };
  try { return resolveCartesianPosition({ value: plan.from.value, scale }); }
  catch (error) {
    if (!(error instanceof RangeError)) throw error;
    return fade("nonfinite-position");
  }
}
