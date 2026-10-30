import { cloneAndFreeze } from "../../core/immutable.js";
import { ownArray, ownRecord } from "../../core/ownData.js";
import { rejectUnknownProperties, validateUnitInterval } from "../../core/validation.js";
import { resolveDiscretePositionScale, resolveOrdinalPositionScale, resolveOrdinalOffsetScale, mapOrdinalPositionValues, mapOrdinalOffsetValues } from "../scales/ordinal.js";
import { mapContinuousScaleValues } from "../scales/mapping.js";
import { normalizePositionEndpoint, preparePositionInterpolation, samplePositionInterpolation } from "./positions.js";
import { interpolateNumber } from "./values.js";
import { applyOffsetPositionValues } from "../positionOffset.js";

const own=(value,key)=>Object.hasOwn(value,key)?value[key]:undefined;
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
  rejectUnknownProperties(input, ["value", "scale", "offset"], "Cartesian animation position");
  if(!Object.hasOwn(input,"value")||!Object.hasOwn(input,"scale"))throw new TypeError("Cartesian position requires own value and scale.");
  const main=normalizeBase({value:input.value,scale:input.scale});
  if (!Object.hasOwn(input,"offset")) return main;
  ownRecord(input.offset,"Cartesian position offset");
  rejectUnknownProperties(input.offset,["value","scale"],"Cartesian position offset");
  const offset=normalizeBase(input.offset);
  if(offset.scale.type!=="ordinal-offset")throw new TypeError("Cartesian position offset requires its ordinal offset scale.");
  return cloneAndFreeze({...main,offset});
}

function normalizeBase(input) {
  if(!Object.hasOwn(input,"value")||!Object.hasOwn(input,"scale"))throw new TypeError("Cartesian position requires own value and scale.");
  const raw = ownRecord(input.scale, "Cartesian animation scale");
  if(["type","domain","range"].some(key=>!Object.hasOwn(raw,key)))throw new TypeError("Cartesian scale requires own type, domain and range.");
  const scale=Object.assign(Object.create(null),raw);
  input={value:input.value,scale};
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
  return resolve(Object.assign(Object.create(null),scale,{values:[value],channel:"x",parentBandwidth:1}));
}

export function resolveCartesianPosition(input) {
  const normalized = normalizeCartesianPosition(input);
  const resolved=resolveBase(normalized);
  if(own(normalized,"offset")===undefined)return resolved;
  const offset=resolveBase(own(normalized,"offset"));
  return {...resolved,offset:own(normalized,"offset"),position:applyOffsetPositionValues({base:[resolved.position],offset:[offset.position],
    parentScale:resolved.resolvedScale,offsetScale:offset.resolvedScale,channel:"Cartesian"})[0]};
}

function resolveBase(normalized) {
  if (discrete.has(normalized.scale.type)) {
    const scale = resolveDiscrete(normalized.scale, normalized.value);
    return { ...normalized, resolvedScale: scale, position: (normalized.scale.type === "ordinal-offset" ? mapOrdinalOffsetValues : mapOrdinalPositionValues)([normalized.value], scale)[0] };
  }
  return { kind: "position", ...normalized, resolvedScale: normalized.scale,
    position: mapContinuousScaleValues([normalized.value], normalized.scale)[0] };
}

export function prepareCartesianPosition(fromInput, toInput) {
  const from = normalizeCartesianPosition(fromInput), to = normalizeCartesianPosition(toInput);
  if((own(from,"offset")===undefined)!==(own(to,"offset")===undefined))return fade("geometry-policy");
  const offset=own(from,"offset")===undefined?undefined:prepareBase(own(from,"offset"),own(to,"offset"));
  if(offset?.kind==="crossfade")return offset;
  const main=prepareBase({value:from.value,scale:from.scale},{value:to.value,scale:to.scale});
  return main.kind==="crossfade"||offset===undefined?main:cloneAndFreeze({kind:"offset-position",from,to,main,offset});
}

function prepareBase(from, to) {
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
  if(!Object.hasOwn(plan,"kind"))throw new TypeError("Prepared Cartesian position requires kind.");
  if(plan.kind==="offset-position") {
    rejectUnknownProperties(plan,["kind","from","to","main","offset"],"prepared Cartesian offset position");
    const verified=prepareCartesianPosition(plan.from,plan.to);
    if(verified.kind!=="offset-position"||JSON.stringify(verified)!==JSON.stringify(plan))throw new TypeError("Invalid prepared Cartesian offset position.");
    const main=sampleCartesianPosition(verified.main,progress),offset=sampleCartesianPosition(verified.offset,progress);
    if(main.kind==="crossfade"||offset.kind==="crossfade")return main.kind==="crossfade"?main:offset;
    return resolveCartesianPosition({value:main.value,scale:main.scale,offset:{value:offset.value,scale:offset.scale}});
  }
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
