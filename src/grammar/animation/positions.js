import { cloneAndFreeze } from "../../core/immutable.js";
import { ownArray, ownRecord } from "../../core/ownData.js";
import { rejectUnknownProperties, validateUnitInterval } from "../../core/validation.js";
import { mapContinuousScaleValues } from "../scales/mapping.js";
import { normalizeTransformParameters } from "../scales/transformed.js";
import { interpolateNumber, interpolatePositiveScale } from "./values.js";

export const ANIMATION_POSITION_VERSION = "semantic-continuous-position@1";
const types = new Set(["linear", "time", "log", "pow", "sqrt", "symlog"]);
const fade = reason => Object.freeze({ kind: "crossfade", reason });

function pair(value, label) {
  ownArray(value, label);
  if (value.length !== 2 || !value.every(Number.isFinite)) throw new TypeError(`${label} requires two finite numbers.`);
  return value;
}

function endpoint(input) {
  ownRecord(input, "Animation position endpoint");
  rejectUnknownProperties(input, ["value", "scale"], "animation position endpoint");
  if (!Number.isFinite(input.value)) throw new TypeError("Animation position value must be finite.");
  const scale = ownRecord(input.scale, "Animation position scale");
  if (!types.has(scale.type)) throw new TypeError("Animation position requires a supported continuous scale type.");
  const parameter = scale.type === "log" ? "base" : scale.type === "pow" ? "exponent" : scale.type === "symlog" ? "constant" : undefined;
  rejectUnknownProperties(scale, ["type", "domain", "range", "clamp", ...(parameter === undefined ? [] : [parameter])], "animation position scale");
  if (Object.values(scale).some(value => value === undefined)) throw new TypeError("Animation position scale values cannot be undefined.");
  if (Object.hasOwn(scale, "clamp") && typeof scale.clamp !== "boolean") throw new TypeError("Animation position clamp must be boolean.");
  const parameters = normalizeTransformParameters(scale.type === "time" ? "linear" : scale.type,
    parameter !== undefined && Object.hasOwn(scale, parameter) ? { [parameter]: scale[parameter] } : {});
  // sqrt's exponent is an internal mapping parameter, not an authored option.
  const normalized = { type: scale.type, domain: pair(scale.domain, "Animation position domain"),
    range: pair(scale.range, "Animation position range"), clamp: scale.clamp ?? false,
    ...(parameter === undefined ? {} : { [parameter]: parameters[parameter] }) };
  const position = mapContinuousScaleValues([input.value], normalized)[0];
  if (!Number.isFinite(position)) throw new RangeError("Animation position endpoint must map to a finite position.");
  return { value: input.value, scale: normalized };
}

function compatibility(from, to) {
  const a = from.scale, b = to.scale;
  if (a.type !== b.type) return "scale-type";
  if (a.clamp !== b.clamp) return "scale-clamp";
  for (const key of ["base", "exponent", "constant"]) if (a[key] !== b[key]) return "scale-parameters";
  const directionA = Math.sign(a.domain[1] - a.domain[0]);
  const directionB = Math.sign(b.domain[1] - b.domain[0]);
  if (directionA === 0 || directionB === 0) return "degenerate-domain";
  if (directionA !== directionB) return "scale-direction";
  if (a.type === "log" && Math.sign(a.domain[0]) !== Math.sign(b.domain[0])) return "log-sign";
  return undefined;
}

// A planner supplies resolved semantic values and scale decisions. Never infer
// a semantic track by inverting already drawn pixel positions.
export function preparePositionInterpolation(fromInput, toInput) {
  const from = endpoint(fromInput), to = endpoint(toInput);
  const reason = compatibility(from, to);
  return reason === undefined ? cloneAndFreeze({ kind: "position", version: ANIMATION_POSITION_VERSION, from, to }) : fade(reason);
}

export function samplePositionInterpolation(plan, progress) {
  validateUnitInterval(progress, "Animation position progress");
  ownRecord(plan, "Prepared animation position");
  rejectUnknownProperties(plan, ["kind", "version", "from", "to"], "prepared animation position");
  if (plan.kind !== "position" || plan.version !== ANIMATION_POSITION_VERSION) throw new TypeError("Animation position sampling requires a supported prepared position.");
  const prepared = preparePositionInterpolation(plan.from, plan.to);
  if (prepared.kind !== "position") throw new TypeError("Prepared animation position endpoints are incompatible.");
  const { from, to } = prepared;
  if (progress === 0 || progress === 1) {
    const exact = progress === 0 ? from : to;
    return cloneAndFreeze({ kind: "position", ...exact,
      position: mapContinuousScaleValues([exact.value], exact.scale)[0] });
  }
  const value = interpolateNumber(from.value, to.value, progress);
  const at = (a, b) => interpolateNumber(a, b, progress);
  const domainAt = from.scale.type === "log"
    ? (a, b) => Math.sign(a) * interpolatePositiveScale(Math.abs(a), Math.abs(b), progress) : at;
  const scale = { ...from.scale, domain: from.scale.domain.map((v, i) => domainAt(v, to.scale.domain[i])),
    range: from.scale.range.map((v, i) => at(v, to.scale.range[i])) };
  if (scale.domain[0] === scale.domain[1]) return fade("collapsed-domain");
  let position;
  try { position = mapContinuousScaleValues([value], scale)[0]; }
  catch (error) {
    if (!(error instanceof RangeError)) throw error;
    return fade("nonfinite-position");
  }
  return Number.isFinite(position) ? cloneAndFreeze({ kind: "position", value, scale, position }) : fade("nonfinite-position");
}
