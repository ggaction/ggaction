import { cloneAndFreeze, freezeOwned } from "../../core/immutable.js";
import { ownArray, ownRecord } from "../../core/ownData.js";
import { rejectUnknownProperties, validateUnitInterval } from "../../core/validation.js";
import { mapContinuousScaleValues, prepareContinuousScaleScalar, mapPreparedContinuousScaleValue } from "../scales/mapping.js";
import { normalizeTransformParameters } from "../scales/transformed.js";
import { interpolateNumber, interpolatePositiveScale } from "./values.js";

export const ANIMATION_POSITION_VERSION = "semantic-continuous-position@1";
const types = new Set(["linear", "time", "log", "pow", "sqrt", "symlog"]);
const fade = reason => Object.freeze({ kind: "crossfade", reason });
const preparedPositions = new WeakSet();
const preparationContexts = new WeakMap();
const sharedScales = new WeakSet();
const sampledScales = new WeakMap();

// One planner assembly owns this opaque, short-lived four-entry context. It is
// never stored in a plan, frame or transport payload.
export function createPositionPreparationContext() {
  const context = Object.freeze({});
  preparationContexts.set(context, { scales: [], cursor: 0 });
  return context;
}

function sameScale(a, b) {
  if (a.type !== b.type || a.clamp !== b.clamp) return false;
  for (let index = 0; index < 2; index++) {
    if (!Object.is(a.domain[index], b.domain[index]) || !Object.is(a.range[index], b.range[index])) return false;
  }
  for (const key of ["base", "exponent", "constant"]) {
    if (Object.hasOwn(a, key) !== Object.hasOwn(b, key) || (Object.hasOwn(a, key) && !Object.is(a[key], b[key]))) return false;
  }
  return true;
}

function shareScale(scale, context) {
  for (const previous of context.scales) if (sameScale(previous, scale)) return previous;
  const owned = cloneAndFreeze(scale);
  sharedScales.add(owned);
  if (context.scales.length < 4) context.scales.push(owned);
  else {
    context.scales[context.cursor] = owned;
    context.cursor = (context.cursor + 1) % 4;
  }
  return owned;
}

function rememberedScale(from, to, progress) {
  const previous = sampledScales.get(from)?.get(to);
  return previous !== undefined && Object.is(previous.progress, progress) ? previous : undefined;
}

function rememberScale(from, to, progress, scale, mapper) {
  let targets = sampledScales.get(from);
  if (targets === undefined) sampledScales.set(from, targets = new WeakMap());
  targets.set(to, { progress, scale, mapper });
}

function pair(value, label) {
  ownArray(value, label);
  if (value.length !== 2 || !value.every(Number.isFinite)) throw new TypeError(`${label} requires two finite numbers.`);
  return value;
}

export function normalizePositionEndpoint(input) {
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
export function preparePositionInterpolation(fromInput, toInput, context) {
  const preparation = context === undefined ? undefined : preparationContexts.get(context);
  if (context !== undefined && preparation === undefined) throw new TypeError("Animation position preparation requires its exact private context.");
  const from = normalizePositionEndpoint(fromInput), to = normalizePositionEndpoint(toInput);
  const reason = compatibility(from, to);
  if (reason !== undefined) return fade(reason);
  if (preparation !== undefined) {
    from.scale = shareScale(from.scale, preparation);
    to.scale = shareScale(to.scale, preparation);
  }
  const plan = cloneAndFreeze({ kind: "position", version: ANIMATION_POSITION_VERSION, from, to });
  preparedPositions.add(plan);
  return plan;
}

export function samplePositionInterpolation(plan, progress) {
  validateUnitInterval(progress, "Animation position progress");
  // Only this module's exact deeply owned result can reuse closed-record and
  // endpoint validation.
  // Structural copies and caller-frozen records retain the full data boundary.
  let prepared = plan;
  if (!preparedPositions.has(plan)) {
    ownRecord(plan, "Prepared animation position");
    rejectUnknownProperties(plan, ["kind", "version", "from", "to"], "prepared animation position");
    if (plan.kind !== "position" || plan.version !== ANIMATION_POSITION_VERSION) throw new TypeError("Animation position sampling requires a supported prepared position.");
    prepared = preparePositionInterpolation(plan.from, plan.to);
  }
  if (prepared.kind !== "position") throw new TypeError("Prepared animation position endpoints are incompatible.");
  const { from, to } = prepared;
  if (progress === 0 || progress === 1) {
    const exact = progress === 0 ? from : to;
    return freezeOwned({ kind: "position", ...exact,
      position: mapContinuousScaleValues([exact.value], exact.scale)[0] });
  }
  const value = interpolateNumber(from.value, to.value, progress);
  const at = (a, b) => interpolateNumber(a, b, progress);
  const domainAt = from.scale.type === "log"
    ? (a, b) => Math.sign(a) * interpolatePositiveScale(Math.abs(a), Math.abs(b), progress) : at;
  const share = sharedScales.has(from.scale) && sharedScales.has(to.scale);
  const remembered = share ? rememberedScale(from.scale, to.scale, progress) : undefined;
  let scale = remembered?.scale;
  let mapper = remembered?.mapper;
  const retain = share && scale === undefined;
  if (scale === undefined) {
    scale = { ...from.scale, domain: from.scale.domain.map((v, i) => domainAt(v, to.scale.domain[i])),
      range: from.scale.range.map((v, i) => at(v, to.scale.range[i])) };
    if (scale.domain[0] === scale.domain[1]) return fade("collapsed-domain");
    // Only these newly-created arrays and closed scale are owned here.
    freezeOwned(scale.domain); freezeOwned(scale.range); freezeOwned(scale);
  }
  let position;
  try { mapper ??= prepareContinuousScaleScalar(scale); position = mapPreparedContinuousScaleValue(mapper, value); }
  catch (error) {
    if (!(error instanceof RangeError)) throw error;
    return fade("nonfinite-position");
  }
  if (!Number.isFinite(position)) return fade("nonfinite-position");
  // A failed mapping or collapsed domain never publishes a partial cache entry.
  if (retain) rememberScale(from.scale, to.scale, progress, scale, mapper);
  return freezeOwned({ kind: "position", value, scale, position });
}

const preparedBatches = new WeakMap();
// A closed set of exact scalar kernels shares one scale calculation. Numeric
// results still use the same scalar mapper and interpolation operation order.
export function preparePositionBatch(plans) {
  ownArray(plans, 'Prepared position batch');
  if (!plans.length || plans.length > 10000) throw new RangeError('Position batches require 1..10000 rows.');
  const first = plans[0];
  for (const plan of plans) if (!preparedPositions.has(plan) || plan.from.scale !== first.from.scale || plan.to.scale !== first.to.scale) throw new TypeError('Position batches require exact prepared shared scales.');
  const token = Object.freeze({}); preparedBatches.set(token, Object.freeze(plans.slice())); return token;
}
export function samplePositionBatch(token, progress) {
  const plans = preparedBatches.get(token);
  if (plans === undefined) throw new TypeError('Position batch sampling requires its private prepared token.');
  const first = samplePositionInterpolation(plans[0], progress);
  if (first.kind !== 'position') return first;
  const mapper = prepareContinuousScaleScalar(first.scale), values = new Array(plans.length), positions = new Array(plans.length);
  values[0] = first.value; positions[0] = first.position;
  for (let index = 1; index < plans.length; index++) {
    const plan = plans[index], value = progress === 0 ? plan.from.value : progress === 1 ? plan.to.value : interpolateNumber(plan.from.value, plan.to.value, progress);
    let position;
    try { position = mapPreparedContinuousScaleValue(mapper, value); }
    catch (error) { if (!(error instanceof RangeError)) throw error; return fade('nonfinite-position'); }
    if (!Number.isFinite(position)) return fade('nonfinite-position');
    values[index] = value; positions[index] = position;
  }
  return freezeOwned({ kind: 'position-batch', values: freezeOwned(values), positions: freezeOwned(positions), scale: first.scale });
}
