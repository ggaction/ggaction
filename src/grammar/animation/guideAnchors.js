import { cloneAndFreeze } from "../../core/immutable.js";
import { ownArray, ownRecord } from "../../core/ownData.js";
import { encodeValue } from "../../core/valueEncoding.js";
import { rejectUnknownProperties, validateGeneratedItemLimit, validateUnitInterval, validateWorkLimit } from "../../core/validation.js";
import { resolveAxisTitleAlong, resolveAxisTitleGeometry } from "../axisGeometry.js";
import { resolveBandGridBoundaries, resolveGridLineGeometry } from "../gridGeometry.js";
import { parallelAxisPosition, resolveParallelGuideGeometry } from "../parallelGuides.js";
import { resolveThetaAxisTitle, resolveRadialAxisTitle } from "../polarGuides.js";
import { normalizeCartesianPosition, resolveCartesianPosition, prepareCartesianPosition, sampleCartesianPosition } from "./cartesianPosition.js";
import { interpolateNumber } from "./values.js";
import { interpolatePolarAngle } from "./polarState.js";

const same = (a, b) => JSON.stringify(encodeValue(a)) === JSON.stringify(encodeValue(b));
const fade = reason => Object.freeze({ kind: "crossfade", reason });
const cartesian = channel => channel === "x" || channel === "y";
class BoundaryMembershipError extends TypeError {
  constructor() { super("Band boundary members do not describe one native edge."); }
}
function record(value, keys, label) {
  ownRecord(value, label);
  rejectUnknownProperties(value, keys, label);
  if (keys.some(key => !Object.hasOwn(value, key))) throw new TypeError(`${label} requires every field.`);
}
function finite(value, label, nonnegative = false) {
  if (!Number.isFinite(value)) throw new TypeError(`${label} must be finite.`);
  if (nonnegative && value < 0) throw new RangeError(`${label} must be nonnegative.`);
}
function frame(value, polar) {
  record(value, polar ? ["centerX", "centerY", "availableRadius"] : ["x", "y", "width", "height"], "Guide anchor frame");
  for (const [key, number] of Object.entries(value)) finite(number, "Guide anchor frame", ["width", "height", "availableRadius"].includes(key));
}
function textPolicy(policy, keys) {
  record(policy, keys, "Guide anchor text policy");
  if (![null, "left", "center", "right"].includes(policy.align)) throw new TypeError("Guide anchor alignment must be native or explicit.");
  if (keys.includes("baseline") && !["top", "middle", "bottom", "alphabetic", "hanging", "ideographic"].includes(policy.baseline)) throw new TypeError("Guide anchor baseline must be explicit.");
  finite(policy.offset, "Guide anchor offset", !keys.includes("side"));
}
function normalizeMapping(input) {
  ownRecord(input, "Guide anchor mapping");
  ownRecord(input.scale, "Guide anchor scale");
  ownArray(input.scale.domain, "Guide anchor domain");
  validateGeneratedItemLimit(input.scale.domain.length, "Guide anchor domain");
  let work = input.scale.domain.length;
  for (const value of input.scale.domain) validateWorkLimit(work += typeof value === "string" ? value.length : 1, "Guide anchor scale work");
  return normalizeCartesianPosition(input);
}
function rangeAnchor(input) {
  ownRecord(input, "Title range anchor");
  if (input.kind === "value") {
    record(input, ["kind", "mapping", "alongOffset"], "Title value anchor");
    finite(input.alongOffset, "Title along offset");
    const mapping = normalizeMapping(input.mapping);
    // Authored title `at` is numeric, even when its scale is discrete.
    finite(mapping.value, "Title value");
    resolveAxisTitleAlong(resolveCartesianPosition(mapping).resolvedScale, { at: mapping.value });
    return { ...input, mapping };
  }
  record(input, ["kind", "range", "at", "alongOffset"], "Title range anchor");
  ownArray(input.range, "Title anchor range");
  if (input.kind !== "range" || !["start", "center", "end"].includes(input.at) || input.range.length !== 2 || !input.range.every(Number.isFinite)) throw new TypeError("Title anchor requires a native range role.");
  finite(input.alongOffset, "Title along offset");
  return input;
}
export function normalizeBandBoundaryMembers(input) {
  ownArray(input, "Band boundary members");
  validateGeneratedItemLimit(input.length, "Band boundary members");
  if (input.length === 0) throw new RangeError("A band boundary requires members.");
  const members = new Map();
  let work = input.length;
  for (const member of input) {
    record(member, ["value", "edge"], "Band boundary member");
    if (!(typeof member.value === "string" || typeof member.value === "boolean" || Number.isFinite(member.value)) || !["start", "end"].includes(member.edge)) throw new TypeError("A band boundary requires typed values and native edges.");
    validateWorkLimit(work += typeof member.value === "string" ? member.value.length : 1, "Band boundary member work");
    const normalized = { value: member.value, edge: member.edge };
    members.set(JSON.stringify(encodeValue([normalized.value, normalized.edge])), normalized);
  }
  return cloneAndFreeze([...members].sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0).map(([, member]) => member));
}
function boundaryPosition(state) {
  const values = [...new Map(state.members.map(member => [JSON.stringify(encodeValue(member.value)), member.value])).values()];
  const scale = resolveCartesianPosition({ value: values[0], scale: state.scale }).resolvedScale;
  const boundaries = resolveBandGridBoundaries(values, scale);
  const match = boundaries.find(boundary => same(normalizeBandBoundaryMembers(boundary.members), state.members));
  if (match === undefined) throw new BoundaryMembershipError();
  return match.position;
}

// These are prepared native anchors, not inverse projections of Text/Line x/y.
// The caller owns correspondence and text/appearance compatibility separately.
export function normalizeGuideAnchor(input) {
  ownRecord(input, "Guide anchor");
  if (input.kind === "title") {
    record(input, ["kind", "channel", "frame", "anchor", "policy"], "Title guide anchor");
    if (!["x", "y", "theta", "radius"].includes(input.channel)) throw new TypeError("Title anchor requires a native axis channel.");
    frame(input.frame, !cartesian(input.channel));
    if (cartesian(input.channel)) {
      textPolicy(input.policy, ["side", "offset", "align", "baseline"]);
      if (!(input.channel === "x" ? ["top", "bottom"] : ["left", "right"]).includes(input.policy.side)) throw new TypeError("Title side differs from its channel.");
      return cloneAndFreeze({ ...input, anchor: rangeAnchor(input.anchor) });
    }
    if (input.anchor !== null) throw new TypeError("Polar title anchors use the native frame role.");
    textPolicy(input.policy, input.channel === "theta" ? ["offset", "align"] : ["offset", "align", "angle", "position"]);
    if (input.channel === "radius") {
      finite(input.policy.angle, "Radial title angle");
      if (!["inside", "outside"].includes(input.policy.position)) throw new TypeError("Radial title position must be inside or outside.");
    }
  } else if (input.kind === "band-boundary") {
    record(input, ["kind", "channel", "frame", "scale", "members", "alongOffset"], "Band boundary anchor");
    if (!cartesian(input.channel)) throw new TypeError("Band boundaries require a Cartesian channel.");
    frame(input.frame, false);
    finite(input.alongOffset, "Band boundary along offset");
    const members = normalizeBandBoundaryMembers(input.members);
    ownRecord(input.scale, "Band boundary scale");
    ownArray(input.scale.domain, "Band boundary domain");
    validateWorkLimit(input.scale.domain.length + members.length, "Band boundary mapping work");
    if (input.scale.type !== "band") throw new TypeError("Band boundaries require a band scale.");
    const scale = normalizeMapping({ value: members[0].value, scale: input.scale }).scale;
    const state = { ...input, scale, members };
    boundaryPosition(state);
    return cloneAndFreeze(state);
  } else if (input.kind === "parallel") {
    record(input, ["kind", "component", "field", "frame", "slot", "mapping", "policy"], "Parallel guide anchor");
    if (!["line", "ticks", "labels", "title"].includes(input.component) || typeof input.field !== "string" || !input.field.length) throw new TypeError("Parallel anchor requires an exact field and component.");
    validateWorkLimit(input.field.length, "Parallel anchor field");
    frame(input.frame, false);
    record(input.slot, ["index", "count"], "Parallel native field slot");
    finite(input.slot.index, "Parallel field slot", true);
    finite(input.slot.count, "Parallel field count");
    if (input.slot.count < 2 || input.slot.count > 10000 || input.slot.index > input.slot.count - 1) throw new RangeError("Parallel field slot must be inside its native layout.");
    if (["line", "title"].includes(input.component)) {
      if (input.mapping !== null) throw new TypeError("Parallel line and title anchors do not have tick values.");
    } else {
      input = { ...input, mapping: normalizeMapping(input.mapping) };
    }
    if (input.component === "line") record(input.policy, [], "Parallel line policy");
    else if (input.component === "ticks") {
      record(input.policy, ["length"], "Parallel tick policy");
      finite(input.policy.length, "Parallel tick length", true);
    } else textPolicy(input.policy, ["offset", "align"]);
  } else throw new TypeError("Unknown native guide anchor kind.");
  return cloneAndFreeze(input);
}
function geometry(state) {
  if (state.kind === "title") {
    if (cartesian(state.channel)) {
      const anchor = state.anchor;
      const scale = anchor.kind === "range" ? { range: anchor.range } : resolveCartesianPosition(anchor.mapping).resolvedScale;
      const along = resolveAxisTitleAlong(scale, { at: anchor.kind === "range" ? anchor.at : anchor.mapping.value, alongOffset: anchor.alongOffset });
      return { type: "text", properties: { ...resolveAxisTitleGeometry({ bounds: state.frame, channel: state.channel, position: state.policy.side, along, offset: state.policy.offset }),
        textAlign: state.policy.align ?? "center", textBaseline: state.policy.baseline } };
    }
    const properties = state.channel === "theta" ? resolveThetaAxisTitle({ frame: state.frame, offset: state.policy.offset })
      : resolveRadialAxisTitle({ frame: state.frame, ...state.policy });
    return { type: "text", properties: { ...properties, ...(state.policy.align === null ? {} : { textAlign: state.policy.align }) } };
  }
  if (state.kind === "band-boundary") {
    const { values: _values, ...properties } = resolveGridLineGeometry({ bounds: state.frame,
      direction: state.channel === "x" ? "vertical" : "horizontal", positions: boundaryPosition(state) + state.alongOffset });
    return { type: "line", properties };
  }
  const component = state.component;
  const axis = { x: parallelAxisPosition(state.frame, state.slot.index, state.slot.count), title: "", config: { [component]: { ...state.policy, ...(state.policy.align === null ? { align: undefined } : {}) } } };
  if (state.mapping !== null) axis[component] = { values: [state.mapping.value], y: [resolveCartesianPosition(state.mapping).position], text: [""] };
  const { length: _length, text: _text, ...properties } = resolveParallelGuideGeometry(component, [axis], state.frame);
  return { type: component === "line" || component === "ticks" ? "line" : "text",
    properties: Object.fromEntries(Object.entries(properties).map(([key, value]) => [key, Array.isArray(value) ? value[0] : value])) };
}
function checkedGeometry(state) {
  const result = geometry(state);
  if (Object.values(result.properties).some(value => typeof value === "number" && !Number.isFinite(value))) throw new RangeError("Guide anchor geometry exceeds finite coordinates.");
  return result;
}
export function resolveGuideAnchor(input) {
  return cloneAndFreeze(checkedGeometry(normalizeGuideAnchor(input)));
}
function mapping(state) {
  if (state.kind === "band-boundary") return { value: state.members[0].value, scale: state.scale };
  if (state.kind === "parallel") return state.mapping;
  return state.anchor?.kind === "value" ? state.anchor.mapping : null;
}
export function prepareGuideAnchor(fromInput, toInput) {
  const from = normalizeGuideAnchor(fromInput), to = normalizeGuideAnchor(toInput);
  if (from.kind !== to.kind || from.channel !== to.channel || from.component !== to.component || from.field !== to.field) return fade("guide-policy");
  if (from.kind === "band-boundary" && !same(from.members, to.members)) return fade("guide-layout");
  for (const key of ["side", "align", "baseline", "position"]) if (from.policy?.[key] !== to.policy?.[key]) return fade("guide-layout");
  if (from.kind === "title" && (from.anchor?.kind !== to.anchor?.kind || from.anchor?.at !== to.anchor?.at)) return fade("guide-layout");
  const a = mapping(from), b = mapping(to);
  if (from.kind === "parallel" && a !== null && !Object.is(a.value, b.value)) return fade("guide-policy");
  if (a !== null) {
    const prepared = prepareCartesianPosition(a, b);
    if (prepared.kind === "crossfade") return prepared;
  }
  return cloneAndFreeze({ kind: "guide-anchor", from, to });
}
export function sampleGuideAnchor(input, progress) {
  validateUnitInterval(progress, "Guide anchor progress");
  record(input, ["kind", "from", "to"], "Prepared guide anchor");
  if (input.kind !== "guide-anchor") throw new TypeError("Invalid prepared guide anchor.");
  const plan = prepareGuideAnchor(input.from, input.to);
  if (plan.kind !== "guide-anchor") throw new TypeError("Incompatible prepared guide anchors.");
  const { from, to } = plan, at = (a, b) => interpolateNumber(a, b, progress);
  try {
    const a = mapping(from), b = mapping(to);
    const sampled = a === null ? null : sampleCartesianPosition(prepareCartesianPosition(a, b), progress);
    if (sampled?.kind === "crossfade") return sampled;
    const state = { ...from, frame: Object.fromEntries(Object.keys(from.frame).map(key => [key, at(from.frame[key], to.frame[key])])) };
    if (from.kind === "band-boundary") {
      state.scale = sampled.scale;
      state.alongOffset = at(from.alongOffset, to.alongOffset);
    } else {
      state.policy = Object.fromEntries(Object.keys(from.policy).map(key => [key, key === "angle" ? interpolatePolarAngle(from.policy[key], to.policy[key], progress)
        : typeof from.policy[key] === "number" ? at(from.policy[key], to.policy[key]) : from.policy[key]]));
      if (from.kind === "parallel") {
        state.slot = { index: at(from.slot.index, to.slot.index), count: at(from.slot.count, to.slot.count) };
        if (sampled !== null) state.mapping = { value: sampled.value, scale: sampled.scale };
      } else if (from.anchor !== null) state.anchor = { ...from.anchor, alongOffset: at(from.anchor.alongOffset, to.anchor.alongOffset),
        ...(sampled === null ? { range: from.anchor.range.map((value, index) => at(value, to.anchor.range[index])) } : { mapping: { value: sampled.value, scale: sampled.scale } }) };
    }
    const normalized = normalizeGuideAnchor(state);
    return cloneAndFreeze({ kind: "guide-anchor", state: normalized, ...checkedGeometry(normalized) });
  } catch (error) {
    if (error instanceof BoundaryMembershipError) return fade("guide-layout");
    if (!(error instanceof RangeError)) throw error;
    return fade("nonfinite-guide");
  }
}
