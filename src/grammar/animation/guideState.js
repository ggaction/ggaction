import { cloneAndFreeze } from "../../core/immutable.js";
import { ownArray, ownRecord } from "../../core/ownData.js";
import { encodeValue } from "../../core/valueEncoding.js";
import { rejectUnknownProperties, validateUnitInterval, validateWorkLimit } from "../../core/validation.js";
import { axisLabelLineOffset, resolveAxisLineGeometry, resolveAxisTickGeometry, resolveAxisLabelGeometry } from "../axisGeometry.js";
import { resolveGridLineGeometry } from "../gridGeometry.js";
import { buildPolarCircleCommands, resolveThetaAxisTicks, resolveRadialAxisTicks, resolveThetaAxisLabels, resolveRadialAxisLabels, resolveThetaSpokes, resolveRadialCircles, resolveRadialAxisLine } from "../polarGuides.js";
import { normalizeCartesianPosition, resolveCartesianPosition, prepareCartesianPosition, sampleCartesianPosition } from "./cartesianPosition.js";
import { interpolateNumber } from "./values.js";
import { normalizeBandBoundaryMembers, normalizeGuideAnchor, resolveGuideAnchor, prepareGuideAnchor, sampleGuideAnchor } from "./guideAnchors.js";
import { interpolatePolarAngle } from "./polarState.js";

export const ANIMATION_GUIDE_VERSION = "native-guide-values@4";
const kinds = new Set(["line", "ticks", "labels", "grid"]);
const components = new Set([...kinds, "title", "boundary", "parallel-line", "parallel-ticks", "parallel-labels", "parallel-title", "legend-strip", "legend-tick", "legend-label", "legend-title"]);
const reasons = new Set(["guide-policy", "guide-layout", "guide-ambiguity", "guide-edited", "guide-unavailable", "nonfinite-guide"]);
const fade = reason => Object.freeze({ kind: "crossfade", reason });
const same = (a, b) => JSON.stringify(encodeValue(a)) === JSON.stringify(encodeValue(b));
export const isGuideAnimationFallbackReason = reason => reasons.has(reason);
function record(value, keys, label) {
  ownRecord(value, label);
  rejectUnknownProperties(value, keys, label);
  if (keys.some(key => !Object.hasOwn(value, key))) throw new TypeError(`${label} requires every field.`);
}
function finite(value, label, nonnegative = false) {
  if (!Number.isFinite(value)) throw new TypeError(`${label} must be finite.`);
  if (nonnegative && value < 0) throw new RangeError(`${label} must be nonnegative.`);
}
function scalar(value) {
  return typeof value === "string" || typeof value === "boolean" || Number.isFinite(value);
}
function identityValue(component, value) {
  if (component.startsWith("legend-")) {
    ownArray(value, "Legend identity value");
    if (value.length !== 2 || !["gradient", "strokeGradient"].includes(value[0])) throw new TypeError("Legend identity requires an exact native family.");
    const sample = ownArray(value[1], "Legend sample identity");
    const valid = component === "legend-title" ? sample.length === 1 && sample[0] === "title"
      : component === "legend-strip" ? sample.length === 3 && sample[0] === "segment" && Number.isSafeInteger(sample[1]) &&
        Number.isSafeInteger(sample[2]) && sample[2] > 0 && sample[1] >= 0 && sample[1] < sample[2]
      : sample.length === 2 && sample[0] === "value" && Number.isFinite(sample[1]);
    if (!valid) throw new TypeError("Legend identity requires its exact raw value or normalized segment role.");
    return value;
  }
  if (component === "line" || component === "title") {
    if (value !== null) throw new TypeError("Guide line and title identity requires null values.");
    return null;
  }
  if (component === "boundary") return normalizeBandBoundaryMembers(value);
  if (component.startsWith("parallel-")) {
    record(value, ["field", "value"], "Parallel guide identity value");
    if (typeof value.field !== "string" || !value.field.length ||
        (["parallel-line", "parallel-title"].includes(component) ? value.value !== null : !scalar(value.value))) {
      throw new TypeError("Parallel guide identity requires an exact field and typed value.");
    }
    return { field: value.field, value: value.value };
  }
  if (!scalar(value)) throw new TypeError("Guide identity requires a typed scalar value.");
  return value;
}
export function normalizeGuideIdentity(input) {
  record(input, ["namespaces", "owner", "component", "value", "line"], "Guide identity");
  ownArray(input.namespaces, "Guide namespaces");
  if (input.namespaces.length > 1024 || input.namespaces.some(value => typeof value !== "string" || !value.length) ||
      typeof input.owner !== "string" || !input.owner.length || !components.has(input.component) ||
      !Number.isSafeInteger(input.line) || input.line < 0 || input.component !== "labels" && input.line !== 0) {
    throw new TypeError("Guide identity requires exact scope, owner, role and typed value.");
  }
  const value = identityValue(input.component, input.value);
  validateWorkLimit(input.owner.length + input.namespaces.reduce((sum, value) => sum + value.length, 0) +
    JSON.stringify(encodeValue(value)).length, "Guide identity work");
  return cloneAndFreeze({ ...input, value });
}
function normalizeAnchorState(input) {
  record(input, ["identity", "kind", "anchor"], "Anchored guide animation state");
  const identity = normalizeGuideIdentity(input.identity), anchor = normalizeGuideAnchor(input.anchor);
  const component = anchor.kind === "band-boundary" ? "boundary" : anchor.kind === "parallel" ? `parallel-${anchor.component}` : "title";
  const value = anchor.kind === "band-boundary" ? anchor.members : anchor.kind === "parallel" ? { field: anchor.field, value: anchor.mapping?.value ?? null } : null;
  if (identity.component !== component || !same(identity.value, value)) throw new TypeError("Guide anchor differs from its exact identity.");
  return cloneAndFreeze({ identity, kind: "anchor", anchor });
}
export function guideAnimationKey(identity) {
  const value = normalizeGuideIdentity(identity);
  return JSON.stringify(["guide", value.namespaces, value.owner, value.component, encodeValue(value.value), value.line]);
}
function policyKeys(kind, channel) {
  const cartesian = channel === "x" || channel === "y";
  if (kind === "line") return cartesian ? ["side"] : channel === "radius" ? ["angle"] : [];
  if (kind === "grid") return cartesian ? ["alongOffset"] : [];
  if (kind === "ticks") return cartesian ? ["side", "alongOffset", "length"] : channel === "radius" ? ["angle", "length"] : ["length"];
  return cartesian ? ["side", "alongOffset", "offset", "lineCount", "lineHeight", "align"]
    : channel === "radius" ? ["angle", "offset", "align"] : ["offset", "align"];
}
export function normalizeGuideAnimationState(input) {
  ownRecord(input, "Guide animation state");
  if (Object.hasOwn(input, "reason")) {
    record(input, ["identity", "reason"], "Guide animation fallback");
    if (!reasons.has(input.reason)) throw new TypeError("Unknown guide animation fallback reason.");
    return cloneAndFreeze({ identity: normalizeGuideIdentity(input.identity), reason: input.reason });
  }
  if (input.kind === "anchor") return normalizeAnchorState(input);
  record(input, ["identity", "kind", "channel", "frame", input.kind === "line" ? "range" : "mapping", "policy"], "Guide animation state");
  const identity = normalizeGuideIdentity(input.identity);
  if (!kinds.has(input.kind) || identity.component !== input.kind || !["x", "y", "theta", "radius"].includes(input.channel)) {
    throw new TypeError("Guide animation requires a native component and channel.");
  }
  const cartesian = input.channel === "x" || input.channel === "y";
  record(input.frame, cartesian ? ["x", "y", "width", "height"] : ["centerX", "centerY", "availableRadius"], "Guide frame");
  for (const [key, value] of Object.entries(input.frame)) finite(value, "Guide frame value", ["width", "height", "availableRadius"].includes(key));
  let mapping;
  if (input.kind === "line") {
    ownArray(input.range, "Guide line range");
    if (input.range.length !== (input.channel === "theta" ? 0 : 2)) throw new TypeError("Guide line requires its exact range.");
    input.range.forEach(value => finite(value, "Guide line range"));
    if (input.channel === "radius" && input.range.some(value => value < 0 || value > input.frame.availableRadius)) throw new RangeError("Radial axis range is outside its frame.");
  } else {
    mapping = normalizeCartesianPosition(input.mapping);
    if (!Object.is(mapping.value, identity.value)) throw new TypeError("Guide value differs from its exact identity.");
  }
  record(input.policy, policyKeys(input.kind, input.channel), "Guide geometry policy");
  for (const [key, value] of Object.entries(input.policy)) {
    if (key === "side") {
      if (!(input.channel === "x" ? ["top", "bottom"] : ["left", "right"]).includes(value)) throw new TypeError("Guide side does not match its channel.");
    } else if (key === "align") {
      if (![null, "left", "center", "right"].includes(value)) throw new TypeError("Guide alignment must be native or explicit.");
    } else {
      finite(value, "Guide policy value", !["angle", "alongOffset"].includes(key));
      if (key === "lineCount" && (!Number.isSafeInteger(value) || value <= identity.line)) throw new RangeError("Guide line role exceeds its label line count.");
    }
  }
  return cloneAndFreeze({ ...input, identity, ...(mapping === undefined ? {} : { mapping }) });
}
const scalarGeometry = properties => Object.fromEntries(Object.entries(properties).map(([key, value]) => [key, Array.isArray(value) ? value[0] : value]));
function geometry(state) {
  if (state.kind === "anchor") return resolveGuideAnchor(state.anchor);
  const { kind, channel, frame, policy } = state;
  const cartesian = channel === "x" || channel === "y";
  if (kind === "line") {
    if (cartesian) return { type: "line", properties: resolveAxisLineGeometry(frame, channel, policy.side, state.range) };
    if (channel === "theta") return { type: "path", properties: { commands: buildPolarCircleCommands(frame, frame.availableRadius) } };
    return { type: "line", properties: resolveRadialAxisLine({ frame, angle: policy.angle, startRadius: Math.min(...state.range) }) };
  }
  const position = resolveCartesianPosition(state.mapping).position;
  if (cartesian) {
    const positions = position + policy.alongOffset;
    if (kind === "ticks") return { type: "line", properties: resolveAxisTickGeometry({ bounds: frame, channel, position: policy.side, positions, length: policy.length }) };
    if (kind === "grid") {
      const { values: _values, ...properties } = resolveGridLineGeometry({ bounds: frame, direction: channel === "x" ? "vertical" : "horizontal", positions });
      return { type: "line", properties };
    }
    const properties = resolveAxisLabelGeometry({ bounds: frame, channel, position: policy.side, positions, offset: policy.offset });
    properties.y += axisLabelLineOffset(channel, properties.textBaseline, state.identity.line, policy.lineCount, policy.lineHeight);
    if (policy.align !== null) properties.textAlign = policy.align;
    return { type: "text", properties };
  }
  if (kind === "grid") {
    if (channel === "theta") return { type: "line", properties: scalarGeometry(resolveThetaSpokes({ frame, angles: [position] })) };
    const circles = resolveRadialCircles({ frame, radii: [position] });
    if (circles.commands.length !== 1) throw new RangeError("A radial guide circle requires positive radius.");
    return { type: "path", properties: { commands: circles.commands[0] } };
  }
  const args = { frame, angles: [position], radii: [position], ...policy };
  const resolve = kind === "ticks" ? channel === "theta" ? resolveThetaAxisTicks : resolveRadialAxisTicks
    : channel === "theta" ? resolveThetaAxisLabels : resolveRadialAxisLabels;
  const properties = scalarGeometry(resolve(args));
  if (kind === "labels" && policy.align !== null) properties.textAlign = policy.align;
  return { type: kind === "labels" ? "text" : "line", properties };
}
function checkedGeometry(state) {
  if (state.reason !== undefined) throw new TypeError("Unavailable guide state has no geometry.");
  const result = geometry(state), pending = [result.properties];
  while (pending.length) {
    const value = pending.pop();
    if (typeof value === "number" && !Number.isFinite(value)) throw new RangeError("Guide geometry exceeds finite coordinates.");
    if (value !== null && typeof value === "object") pending.push(...Object.values(value));
  }
  return result;
}
export function resolveGuideAnimationGeometry(input) {
  return cloneAndFreeze(checkedGeometry(normalizeGuideAnimationState(input)));
}
export function guideAnimationMatchesNode(input, node) {
  const result = resolveGuideAnimationGeometry(input);
  return result.type === node.type && Object.entries(result.properties).every(([key, value]) => same(value, node.properties[key]));
}
export function prepareGuideInterpolation(fromInput, toInput) {
  const from = normalizeGuideAnimationState(fromInput), to = normalizeGuideAnimationState(toInput);
  if (from.reason !== undefined || to.reason !== undefined) return fade(from.reason ?? to.reason);
  if (guideAnimationKey(from.identity) !== guideAnimationKey(to.identity) || from.kind !== to.kind || from.channel !== to.channel) return fade("guide-policy");
  if (from.kind === "anchor") {
    const prepared = prepareGuideAnchor(from.anchor, to.anchor);
    return prepared.kind === "crossfade" ? prepared : cloneAndFreeze({ kind: "guide", version: ANIMATION_GUIDE_VERSION, from, to });
  }
  for (const key of ["side", "align", "lineCount", "lineHeight"]) if (from.policy[key] !== to.policy[key]) return fade("guide-layout");
  if (from.kind !== "line") {
    const mapping = prepareCartesianPosition(from.mapping, to.mapping);
    if (mapping.kind === "crossfade") return mapping;
  }
  return cloneAndFreeze({ kind: "guide", version: ANIMATION_GUIDE_VERSION, from, to });
}
export function sampleGuideInterpolation(input, progress) {
  validateUnitInterval(progress, "Guide animation progress");
  record(input, ["kind", "version", "from", "to"], "Prepared guide animation");
  if (input.kind !== "guide" || input.version !== ANIMATION_GUIDE_VERSION) throw new TypeError("Unsupported guide animation kernel.");
  const plan = prepareGuideInterpolation(input.from, input.to);
  if (plan.kind !== "guide") throw new TypeError("Incompatible prepared guide states.");
  const { from, to } = plan, at = (a, b) => interpolateNumber(a, b, progress);
  try {
    if (from.kind === "anchor") {
      const sampled = sampleGuideAnchor(prepareGuideAnchor(from.anchor, to.anchor), progress);
      if (sampled.kind === "crossfade") return sampled;
      const state = normalizeAnchorState({ identity: from.identity, kind: "anchor", anchor: sampled.state });
      return cloneAndFreeze({ kind: "guide", state, type: sampled.type, properties: sampled.properties });
    }
    const mapping = from.kind === "line" ? undefined : sampleCartesianPosition(prepareCartesianPosition(from.mapping, to.mapping), progress);
    if (mapping?.kind === "crossfade") return mapping;
    const state = normalizeGuideAnimationState({ ...from,
      frame: Object.fromEntries(Object.keys(from.frame).map(key => [key, at(from.frame[key], to.frame[key])])),
      policy: Object.fromEntries(Object.keys(from.policy).map(key => [key, key === "angle" ? interpolatePolarAngle(from.policy[key], to.policy[key], progress)
        : typeof from.policy[key] === "number" ? at(from.policy[key], to.policy[key]) : from.policy[key]])),
      ...(mapping === undefined ? { range: from.range.map((value, index) => at(value, to.range[index])) }
        : { mapping: { value: from.mapping.value, scale: mapping.scale } })
    });
    return cloneAndFreeze({ kind: "guide", state, ...checkedGeometry(state) });
  } catch (error) {
    if (!(error instanceof RangeError)) throw error;
    return fade("nonfinite-guide");
  }
}
