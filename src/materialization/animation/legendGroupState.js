import { legendAnimationFamily as owner, legendBlockEntryProperties } from "./legendBlockState.js";
import { cloneAndFreeze, isOwned } from "../../core/immutable.js";
import { ownRecord, ownArray } from "../../core/ownData.js";
import { rejectUnknownProperties, validateWorkLimit, validateUnitInterval } from "../../core/validation.js";
import { encodeValue } from "../../core/valueEncoding.js";
import { getErrorDetails } from "../../core/diagnostics.js";
import { validateLegendGroupState } from "../../grammar/legendGroups.js";
import { normalizeGuideIdentity, guideAnimationKey, ANIMATION_GUIDE_VERSION } from "../../grammar/animation/guideState.js";
import { interpolateNumber } from "../../grammar/animation/values.js";
import { resolveLegendGroupPlacement } from "../../layout/legendGroup.js";
import { unionLegendBounds } from "../guides/legendLaneState.js";
import { translatedProperties } from "../graphicTranslation.js";
import { intrinsicLegendConfigValues } from "../legendGroups.js";

const same = (a, b) => JSON.stringify(encodeValue(a)) === JSON.stringify(encodeValue(b));
const layouts = new WeakMap(), geometry = new WeakMap(), samples = new WeakMap(), preparedBlocks = new WeakMap();
const fade = reason => Object.freeze({ kind: "crossfade", reason });
const mode = group => group.placement.position?.includes("-") ? "corner" : true;
function record(value, keys, label) {
  ownRecord(value, label); rejectUnknownProperties(value, keys, label);
  if (keys.some(key => !Object.hasOwn(value, key))) throw new TypeError(`${label} requires every field.`);
}
function groupPolicy(group) {
  record(group, ["placement", "blockLayout", "inferredOffset"], "Prepared legend group");
  ownRecord(group.placement, "Prepared legend group placement");
  if (Object.hasOwn(group.placement, "at")) {
    record(group.placement, ["at"], "Prepared legend group placement");
    record(group.placement.at, ["x", "y"], "Prepared legend group origin");
  } else record(group.placement, ["position", "align", "offset", ...(Object.hasOwn(group.placement, "alongOffset") ? ["alongOffset"] : [])], "Prepared legend group placement");
  if (group.inferredOffset !== false) throw new TypeError("Prepared legend groups require an explicit offset.");
  validateLegendGroupState({ owner: group });
  return group;
}
function blockLayout(block, frame, group) {
  const intrinsicMode = mode(group), cached = preparedBlocks.get(block);
  if (cached?.frame === frame && cached.intrinsicMode === intrinsicMode) return cached.layout;
  const layout = owner(block.kind).normalize({ ...block.values, frame }, intrinsicMode);
  if (isOwned(block)) preparedBlocks.set(block, { frame, intrinsicMode, layout });
  return layout;
}
function normalizeLayout(input) {
  if (layouts.has(input)) return layouts.get(input);
  record(input, ["frame", "group", "blocks", "allowOverflow"], "Prepared legend group layout");
  if (typeof input.allowOverflow !== "boolean") throw new TypeError("Prepared legend group requires its native plot fit policy.");
  const group = groupPolicy(input.group);
  ownArray(input.blocks, "Prepared legend group blocks");
  if (!input.blocks.length || input.blocks.length > 6) throw new RangeError("Prepared legend group requires bounded native blocks.");
  const kinds = new Set();
  const blocks = input.blocks.map(block => {
    record(block, ["kind", "values"], "Prepared legend group block");
    if (!owner(block.kind) || kinds.has(block.kind)) throw new TypeError("Prepared legend group requires unique supported native families.");
    kinds.add(block.kind); ownRecord(block.values, "Prepared legend group values");
    if (Object.hasOwn(block.values, "frame")) throw new TypeError("A legend group owns its frame once.");
    const { frame, ...values } = blockLayout(block, input.frame, group);
    const intrinsic = intrinsicLegendConfigValues(values.config, group.placement);
    if (values.config.offset !== 0 || values.config.position !== intrinsic.position || values.config.align !== intrinsic.align ||
        owner(block.kind).kind === "categorical-legend" && values.config.kind !== block.kind) throw new TypeError("Prepared group blocks require the native intrinsic origin and family.");
    return { kind: block.kind, values };
  });
  const normalized = cloneAndFreeze({ frame: input.frame, group, blocks, allowOverflow: input.allowOverflow });
  geometryList(normalized);
  layouts.set(normalized, normalized); if (isOwned(input)) layouts.set(input, normalized);
  return normalized;
}
function bounds(block, layout, entries) {
  const objects = {}, ids = [], config = layout.config;
  for (const [index, entry] of entries.entries()) {
    const id = entry.component === "legend-symbol" ? `preparedLegendSymbols${index}` : `prepared${index}`;
    objects[id] = { type: entry.type, properties: legendBlockEntryProperties(block.kind, layout, entry) }; ids.push(id);
  }
  return unionLegendBounds({ graphicSpec: { objects, order: ids }, materializationConfigs: { textMetrics: layout.metrics } }, ids);
}
function geometryList(layout) {
  if (geometry.has(layout)) return geometry.get(layout);
  let work = 0;
  const blocks = layout.blocks.map(block => {
    const prepared = blockLayout(block, layout.frame, layout.group), entries = owner(block.kind).entries(prepared, mode(layout.group));
    validateWorkLimit(work += entries.length, "Legend group geometry work");
    return { id: block.kind, entries, bounds: bounds(block, prepared, entries) };
  });
  const placements = resolveLegendGroupPlacement({ blocks, group: layout.group, ...layout.frame, allowOverflow: layout.allowOverflow });
  const result = cloneAndFreeze(blocks.flatMap((block, index) => block.entries.map(entry => ({ ...entry, family: block.id,
    properties: translatedProperties(entry.type, entry.properties, placements[index].dx, placements[index].dy) }))));
  if (isOwned(layout)) geometry.set(layout, result); return result;
}
function findEntry(layout, identity) {
  return geometryList(layout).find(entry => entry.family === identity.value[0] && entry.component === identity.component && same(entry.sample, identity.value[1]));
}
export function prepareLegendGroupLayout({ frame, group, blocks, allowOverflow = false }) {
  return normalizeLayout({ frame, group: { ...group, inferredOffset: group.inferredOffset ?? false }, allowOverflow, blocks: blocks.map(({ kind, layout }) => {
    const { frame: ignored, ...values } = layout; return { kind, values };
  }) });
}
export function normalizeLegendGroupAnimationState(input) {
  record(input, ["identity", "kind", "layout"], "Legend group animation state");
  const identity = normalizeGuideIdentity(input.identity), layout = normalizeLayout(input.layout);
  if (input.kind !== "legend-group" || findEntry(layout, identity) === undefined) throw new TypeError("Legend group identity does not name its native component.");
  return cloneAndFreeze({ identity, kind: "legend-group", layout });
}
export function resolveLegendGroupAnimationGeometry(input) {
  const state = normalizeLegendGroupAnimationState(input), entry = findEntry(state.layout, state.identity);
  return cloneAndFreeze({ type: entry.type, properties: entry.properties });
}
export function legendGroupAnimationKeys(input) {
  const state = normalizeLegendGroupAnimationState(input);
  return geometryList(state.layout).map(entry => guideAnimationKey({ ...state.identity,
    component: entry.component, value: [entry.family, entry.sample], line: 0 }));
}
export function legendGroupAnimationMatchesNode(state, node) {
  const entry = resolveLegendGroupAnimationGeometry(state);
  return entry.type === node.type && Object.entries(entry.properties).every(([key, value]) => same(value, node.properties[key]));
}
function representative(block, layout, identity) {
  const family = owner(block.kind), prepared = blockLayout(block, layout.frame, layout.group), entry = family.entries(prepared, mode(layout.group))[0];
  return { identity: { ...identity, component: entry.component, value: [block.kind, entry.sample], line: 0 }, kind: family.kind, layout: prepared };
}
const policy = group => ({ ...group, placement: group.placement.at ? { at: { x: 0, y: 0 } }
  : { ...group.placement, offset: 0, ...(Object.hasOwn(group.placement, "alongOffset") ? { alongOffset: 0 } : {}) } });
export function prepareLegendGroupInterpolation(fromInput, toInput) {
  const from = normalizeLegendGroupAnimationState(fromInput), to = normalizeLegendGroupAnimationState(toInput);
  if (guideAnimationKey(from.identity) !== guideAnimationKey(to.identity)) return fade("guide-policy");
  const a = from.layout, b = to.layout;
  if (a.allowOverflow !== b.allowOverflow || !same(policy(a.group), policy(b.group)) || !same(a.blocks.map(x => x.kind), b.blocks.map(x => x.kind))) return fade("guide-layout");
  for (let index = 0; index < a.blocks.length; index++) {
    const block = a.blocks[index], prepared = owner(block.kind).prepare(representative(block, a, from.identity), representative(b.blocks[index], b, to.identity), mode(a.group));
    if (prepared.kind === "crossfade") return fade(prepared.reason);
  }
  return cloneAndFreeze({ kind: "guide", version: ANIMATION_GUIDE_VERSION, from, to });
}
export function sampleLegendGroupInterpolation(plan, progress) {
  validateUnitInterval(progress, "Legend group progress"); record(plan, ["kind", "version", "from", "to"], "Prepared legend group interpolation");
  if (plan.kind !== "guide" || plan.version !== ANIMATION_GUIDE_VERSION) throw new TypeError("Invalid prepared legend group interpolation.");
  const prepared = prepareLegendGroupInterpolation(plan.from, plan.to);
  if (prepared.kind !== "guide") throw new TypeError("Invalid prepared legend group interpolation.");
  const a = prepared.from.layout, b = prepared.to.layout, cached = samples.get(a)?.get(b);
  if (cached?.progress === progress) {
    const state = normalizeLegendGroupAnimationState({ ...prepared.from, layout: cached.layout });
    return cloneAndFreeze({ kind: "guide", state, ...resolveLegendGroupAnimationGeometry(state) });
  }
  const numbers = (from, to) => Object.fromEntries(Object.keys(from).map(key => [key, interpolateNumber(from[key], to[key], progress)]));
  const placement = a.group.placement.at ? { at: numbers(a.group.placement.at, b.group.placement.at) }
    : { ...a.group.placement, offset: interpolateNumber(a.group.placement.offset, b.group.placement.offset, progress),
      ...(a.group.placement.alongOffset === undefined ? {} : { alongOffset: interpolateNumber(a.group.placement.alongOffset, b.group.placement.alongOffset, progress) }) };
  try {
    const blocks = [];
    for (const [index, block] of a.blocks.entries()) {
      const family = owner(block.kind), child = family.prepare(representative(block, a, prepared.from.identity), representative(b.blocks[index], b, prepared.to.identity), mode(a.group));
      const sampled = family.sample(child, progress, mode(a.group));
      if (sampled.kind === "crossfade") return fade(sampled.reason);
      const { frame, ...values } = sampled.state.layout; blocks.push({ kind: block.kind, values });
    }
    const state = normalizeLegendGroupAnimationState({ ...prepared.from, layout: { ...a, frame: { plot: numbers(a.frame.plot, b.frame.plot), canvas: numbers(a.frame.canvas, b.frame.canvas) }, group: { ...a.group, placement }, blocks } });
    if (!samples.has(a)) samples.set(a, new WeakMap()); samples.get(a).set(b, { progress, layout: state.layout });
    return cloneAndFreeze({ kind: "guide", state, ...resolveLegendGroupAnimationGeometry(state) });
  } catch (error) {
    if (!(error instanceof RangeError) && getErrorDetails(error)?.reason !== "canvas-overflow" && !/legend (block requires|group does not fit)/.test(error.message)) throw error;
    return fade("guide-layout");
  }
}
