import { encodeValue } from "../../core/valueEncoding.js";
import { getErrorDetails } from "../../core/diagnostics.js";
import { cloneAndFreeze, isOwned } from "../../core/immutable.js";
import { ownArray, ownRecord } from "../../core/ownData.js";
import { rejectUnknownProperties, validateWorkLimit } from "../../core/validation.js";
import { guideAnimationKey, ANIMATION_GUIDE_VERSION } from "../../grammar/animation/guideState.js";
import { resolveSceneNodeOccupiedBounds } from "../../grammar/schemas/graphicBounds.js";
import { resolveAxisLaneClearance } from "../guides/axisClearance.js";
import { normalizeLegendLaneAnimationState, legendLaneAnimationKeys, legendLaneAnimationMatchesNode,
  resolveLegendLaneAnimationGeometry, resolveLegendLaneClearanceEntries, prepareLegendLaneInterpolation,
  sampleLegendLaneInterpolation } from "./legendLaneState.js";

const same = (a, b) => JSON.stringify(encodeValue(a)) === JSON.stringify(encodeValue(b));
const states = new WeakMap(), entries = new WeakMap();
const base = state => ({ identity: state.identity, kind: "legend-lane", layout: state.layout });
const fade = reason => Object.freeze({ kind: "crossfade", reason });
function record(value, keys, label) {
  ownRecord(value, label); rejectUnknownProperties(value, keys, label);
  if (keys.some(key => !Object.hasOwn(value, key))) throw new TypeError(`${label} requires every field.`);
}
export function axisGuideEdge(state) {
  if (state.kind === "label-layout") return state.layout.config.position;
  if (state.kind === "title-layout") return state.layout.anchor.policy.side;
  if (["line", "ticks", "labels"].includes(state.kind) && ["x", "y"].includes(state.channel)) return state.policy.side;
  if (state.kind === "anchor" && state.anchor.kind === "title" && ["x", "y"].includes(state.anchor.channel)) return state.anchor.policy.side;
}
const axisComponent = state => ["line", "ticks", "labels", "title", "parallel-labels", "parallel-title"].includes(state?.identity.component);
export function legendAxisReferenceKeys(states, namespaces, edge) {
  const scoped = states.filter(state => state !== null && axisComponent(state) && same(state.identity.namespaces, namespaces));
  const owners = new Map();
  for (const state of scoped) {
    const side = axisGuideEdge(state);
    if (side === undefined) continue;
    if (!owners.has(state.identity.owner)) owners.set(state.identity.owner, new Set());
    owners.get(state.identity.owner).add(side);
  }
  const selected = [];
  for (const state of scoped) {
    const side = axisGuideEdge(state), sides = owners.get(state.identity.owner);
    if (side !== undefined && side !== edge || side === undefined && sides !== undefined && !sides.has(edge)) continue;
    // Unknown ink cannot silently disappear from a dependency proof. The
    // non-Cartesian text dependency retains its explicit unsupported status.
    if (state.reason !== undefined || side === undefined || ["labels", "title"].includes(state.identity.component) && state.layout?.metrics === undefined) return undefined;
    selected.push(guideAnimationKey(state.identity));
  }
  if (new Set(selected).size !== selected.length) return undefined;
  return selected.sort();
}
export function normalizeLegendAxisLaneState(input) {
  if (states.has(input)) return states.get(input);
  record(input, ["identity", "kind", "layout", "axes", "offsets"], "Axis-dependent legend lane");
  if (input.kind !== "legend-axis-lane") throw new TypeError("Expected an axis-dependent native legend lane.");
  const normalized = normalizeLegendLaneAnimationState(base(input));
  ownArray(input.axes, "Legend axis references");
  if (!input.axes.length) throw new TypeError("Axis-dependent legend lane requires exact axis references.");
  let work = 0;
  for (const key of input.axes) {
    if (typeof key !== "string" || !key.length) throw new TypeError("Legend axis references require canonical guide keys.");
    validateWorkLimit(work += key.length + 1, "Legend axis reference work");
  }
  if (!same([...new Set(input.axes)].sort(), input.axes)) throw new TypeError("Legend axis references must be unique and canonical.");
  // The existing native lane owner validates inferred block names and offset
  // inheritance. Zero ink here validates only shape; endpoint ink is separate.
  resolveLegendLaneClearanceEntries(normalized.layout, { clearance: 0, offsets: input.offsets });
  const result = cloneAndFreeze({ ...normalized, kind: "legend-axis-lane", axes: input.axes, offsets: input.offsets });
  states.set(result, result); if (isOwned(input)) states.set(input, result); return result;
}
export const legendAxisLaneKeys = input => legendLaneAnimationKeys(base(normalizeLegendAxisLaneState(input)));
export function resolveLegendAxisLaneEntries(input, dependencies, laneNode) {
  const state = normalizeLegendAxisLaneState(input), byKey = new Map();
  const key = JSON.stringify([state.axes, state.offsets, laneNode?.offset ?? [0, 0]]);
  const cached = entries.get(dependencies)?.get(state.layout)?.get(key);
  if (cached !== undefined) return cached;
  for (const item of dependencies) {
    const key = guideAnimationKey(item.state.identity);
    if (byKey.has(key)) throw new TypeError("Legend axis dependency must be unambiguous.");
    byKey.set(key, item);
  }
  if (!same([...byKey.keys()].sort(), state.axes)) throw new TypeError("Legend lane requires its complete current axis dependency.");
  const blocks = state.axes.map(key => {
    const { state: axis, node } = byKey.get(key);
    if (axis.reason !== undefined || axisGuideEdge(axis) !== state.layout.edge || !same(axis.identity.namespaces, state.identity.namespaces)) throw new TypeError("Legend axis reference differs from its native scope and edge.");
    if (node.type === "weighted-blend") throw new TypeError("A fallback cannot supply native axis ink.");
    if (node.type === "text" && axis.layout?.metrics === undefined) throw new TypeError("Legend axis text requires its prepared native metrics.");
    const bounds = resolveSceneNodeOccupiedBounds(node, axis.layout?.metrics);
    if (bounds === undefined) return undefined;
    const [x, y] = laneNode?.offset ?? [0, 0];
    return { position: state.layout.edge, bounds: { left: bounds.left - x, right: bounds.right - x, top: bounds.top - y, bottom: bounds.bottom - y } };
  });
  const result = resolveLegendLaneClearanceEntries(state.layout, { clearance: resolveAxisLaneClearance(state.layout.edge, state.layout.frame.plot, blocks.filter(Boolean)), offsets: state.offsets });
  if (isOwned(dependencies)) {
    if (!entries.has(dependencies)) entries.set(dependencies, new WeakMap());
    const layouts = entries.get(dependencies); if (!layouts.has(state.layout)) layouts.set(state.layout, new Map());
    layouts.get(state.layout).set(key, result);
  }
  return result;
}
export function resolveLegendAxisLaneGeometry(input, dependencies, laneNode) {
  const state = normalizeLegendAxisLaneState(input), entry = resolveLegendAxisLaneEntries(state, dependencies, laneNode).find(entry =>
    entry.target === state.identity.owner && entry.family === state.identity.value[0] && entry.component === state.identity.component && same(entry.sample, state.identity.value[1]));
  if (entry === undefined) throw new TypeError("Legend axis lane must name its native component.");
  return cloneAndFreeze({ type: entry.type, properties: entry.properties });
}
export function legendAxisLaneMatchesNode(input, node, dependencies) {
  const state = normalizeLegendAxisLaneState(input), output = resolveLegendAxisLaneGeometry(state, dependencies, node);
  if (output.type !== node.type || !Object.entries(output.properties).every(([key, value]) => same(value, node.properties[key]))) return false;
  const original = resolveLegendLaneAnimationGeometry(base(state));
  return legendLaneAnimationMatchesNode(base(state), { ...node, properties: { ...node.properties, ...original.properties } });
}
export function prepareLegendAxisLaneInterpolation(fromInput, toInput) {
  const from = normalizeLegendAxisLaneState(fromInput), to = normalizeLegendAxisLaneState(toInput);
  if (!same(from.axes, to.axes) || !same(from.offsets, to.offsets)) return fade("guide-layout");
  const prepared = prepareLegendLaneInterpolation(base(from), base(to));
  return prepared.kind === "crossfade" ? prepared : cloneAndFreeze({ kind: "guide", version: ANIMATION_GUIDE_VERSION, from, to });
}
export function sampleLegendAxisLaneInterpolation(plan, progress, dependencies, laneNode) {
  const prepared = prepareLegendAxisLaneInterpolation(plan.from, plan.to);
  if (prepared.kind !== "guide" || plan.kind !== "guide" || plan.version !== ANIMATION_GUIDE_VERSION) throw new TypeError("Invalid prepared axis-dependent legend lane.");
  const sampled = sampleLegendLaneInterpolation(prepareLegendLaneInterpolation(base(prepared.from), base(prepared.to)), progress);
  if (sampled.kind !== "guide") return sampled;
  const state = normalizeLegendAxisLaneState({ ...prepared.from, layout: sampled.state.layout });
  try { return cloneAndFreeze({ kind: "guide", state, ...resolveLegendAxisLaneGeometry(state, dependencies, laneNode) }); }
  catch (error) {
    if (error instanceof RangeError || getErrorDetails(error)?.reason === "canvas-overflow") return fade("guide-layout");
    throw error;
  }
}
