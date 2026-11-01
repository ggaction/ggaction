import { cloneAndFreeze, isOwned } from "../../core/immutable.js";
import { ownArray, ownRecord } from "../../core/ownData.js";
import { rejectUnknownProperties, validateUnitInterval, validateWorkLimit } from "../../core/validation.js";
import { encodeValue } from "../../core/valueEncoding.js";
import { textMetricKey, DEFAULT_FONT_FAMILY, textMetricFontWeight } from "../../core/font.js";
import { getErrorDetails } from "../../core/diagnostics.js";
import { normalizeGuideIdentity, guideAnimationKey, ANIMATION_GUIDE_VERSION } from "../../grammar/animation/guideState.js";
import { legendAnimationFamily, legendBlockEntryProperties } from "./legendBlockState.js";
import { normalizeGuideMetrics } from "./guideMetrics.js";
import { blockDescriptor, groupBlocks, horizontalGroups, unionLegendBounds } from "../guides/legendLaneState.js";
import { resolveSideLegendLane, resolveSingleSideLegendPlacement, resolveHorizontalLegendLane, resolveHorizontalLegendGroup } from "../../layout/legendLane.js";
import { translatedProperties } from "../graphicTranslation.js";

const same = (a, b) => JSON.stringify(encodeValue(a)) === JSON.stringify(encodeValue(b));
const layouts = new WeakMap(), geometry = new WeakMap(), samples = new WeakMap();
const fade = reason => Object.freeze({ kind: "crossfade", reason });
function record(value, keys, label) {
  ownRecord(value, label); rejectUnknownProperties(value, keys, label);
  if (keys.some(key => !Object.hasOwn(value, key))) throw new TypeError(`${label} requires every field.`);
}
const withoutNull = value => Object.fromEntries(Object.entries(value).filter(([, item]) => item !== null));
function configOf(block) {
  const config = block.values.config;
  return { ...withoutNull(config), target: block.target, layout: "edge", border: false,
    labels: withoutNull(config.labels), titleStyle: withoutNull(config.titleStyle) };
}
function blockLayout(block, frame) { return legendAnimationFamily(block.kind).normalize({ ...block.values, frame }); }
function metricsOf(blocks) {
  const measurements = new Map(), fonts = new Map(), version = blocks[0].values.metrics.schemaVersion;
  for (const block of blocks) {
    const profile = block.values.metrics;
    if (profile.schemaVersion !== version) throw new TypeError("Legend lane requires one native font policy.");
    for (const measurement of profile.measurements) {
      const key = textMetricKey(measurement), prior = measurements.get(key);
      if (prior !== undefined && !same(prior, measurement)) throw new TypeError("Legend lane font measurements must agree.");
      measurements.set(key, measurement);
    }
    for (const font of profile.fonts ?? []) {
      const prior = fonts.get(font.resource.id);
      if (prior !== undefined && !same(prior, font)) throw new TypeError("Legend lane font bindings must agree.");
      fonts.set(font.resource.id, font);
    }
  }
  return normalizeGuideMetrics({ schemaVersion: version, id: "animation-legend-lane", measurements: [...measurements.values()],
    ...(version === 2 ? { fonts: [...fonts.values()] } : {}) });
}
function graphicId(kind, entry) {
  const prefix = kind === "gradient" ? "colorGradient" : kind === "strokeGradient" ? "strokeGradient" : `${kind}Legend`;
  const suffix = entry.component === "legend-title" ? "Title" : entry.component === "legend-label" ? "Labels"
    : entry.component === "legend-strip" ? "Strips" : entry.component === "legend-tick" ? "Ticks"
      : ["color", "series", "stroke"].includes(kind) ? ({ line: "SymbolLines", point: "SymbolPoints", swatch: "SymbolSwatches" })[entry.sample[2]] : "Symbols";
  return `${prefix}${suffix}`;
}
function programFor(layout, entries) {
  const objects = {}, configs = {}, order = [];
  for (const block of layout.blocks) {
    const prepared = blockLayout(block, layout.frame); configs[block.kind] = configOf(block);
    for (const entry of entries.filter(item => item.family === block.kind)) {
      const id = graphicId(block.kind, entry), properties = legendBlockEntryProperties(block.kind, prepared, entry);
      if (entry.component === "legend-title") { objects[id] = { type: entry.type, properties }; order.push(id); continue; }
      if (objects[id] === undefined) { objects[id] = { type: entry.type, items: [] }; order.push(id); }
      const object = objects[id]; if (object.type !== entry.type) object.type = "collection";
      object.items.push({ id: `${id}:${object.items.length}`, type: entry.type, properties });
    }
    // A hidden native label collection still owns a lane slot.
    const id = graphicId(block.kind, { component: "legend-label" });
    if (!objects[id]) { objects[id] = { type: "text", items: [] }; order.push(id); }
  }
  return { graphicSpec: { objects, order }, guideConfigs: { legend: configs }, materializationConfigs: { textMetrics: metricsOf(layout.blocks) } };
}
function move(entries, kind, dx, titleDy, contentDy, align) {
  return entries.map(entry => entry.family !== kind ? entry : { ...entry,
    properties: { ...translatedProperties(entry.type, entry.properties, dx(entry), entry.component === "legend-title" ? titleDy : contentDy),
      ...(align?.(entry) ? { textAlign: "left" } : {}) } });
}
function horizontalPlan(entries, groups, plan) {
  for (const placement of plan.placements) {
    const group = groups.find(group => group.id === placement.id);
    entries = entries.map(entry => {
      const id = graphicId(entry.family, entry);
      if (id !== group.titleId && !group.contentIds.includes(id)) return entry;
      return { ...entry, properties: translatedProperties(entry.type, entry.properties, placement.dx, id === group.titleId ? placement.titleDy : placement.contentDy) };
    });
  }
  return entries;
}
function geometryList(layout) {
  if (geometry.has(layout)) return geometry.get(layout);
  let work = 0;
  let entries = layout.blocks.flatMap(block => {
    const prepared = blockLayout(block, layout.frame), result = legendAnimationFamily(block.kind).entries(prepared);
    validateWorkLimit(work += result.length, "Native legend lane work");
    return result.map(entry => ({ ...entry, family: block.kind, target: block.target }));
  });
  if (layout.blocks.length > 1) {
    let program = programFor(layout, entries), configs = program.guideConfigs.legend;
    let blocks = layout.blocks.map(block => blockDescriptor(program, block.kind, configs[block.kind]));
    if (["left", "right"].includes(layout.edge)) {
      const plan = resolveSideLegendLane({ side: layout.edge, ...layout.frame, groups: groupBlocks(blocks, configs) });
      for (const placement of plan.placements) {
        const block = blocks.find(block => block.id === placement.id);
        entries = move(entries, block.id, entry => entry.component === "legend-title" ? placement.titleDx : entry.component === "legend-label" ? placement.labelDx : placement.symbolDx,
          placement.dy, placement.dy, entry => !block.preserveAlignment && (entry.component === "legend-title" || entry.component === "legend-label" && !block.preserveLabelAlignment));
      }
      program = programFor(layout, entries);
      const bounds = unionLegendBounds(program, program.graphicSpec.order), { dy } = resolveSingleSideLegendPlacement({ side: layout.edge, ...layout.frame, bounds });
      entries = entries.map(entry => ({ ...entry, properties: translatedProperties(entry.type, entry.properties, 0, dy) }));
    } else {
      let groups = groupBlocks(blocks, configs);
      for (const group of groups.filter(group => group.blocks.length > 1)) {
        const config = configs[group.blocks[0].kind];
        const children = horizontalGroups(program, group.blocks.map(block => ({ id: block.id, blocks: [block], border: false })))
          .map(child => ({ ...child, element: child.content }));
        const plan = resolveHorizontalLegendGroup({ edge: layout.edge, ...layout.frame, groups: children,
          align: config.align, offset: config.offset, border: false, allowOverflow: layout.allowOverflow });
        entries = horizontalPlan(entries, children, plan);
        program = programFor(layout, entries);
      }
      blocks = layout.blocks.map(block => blockDescriptor(program, block.kind, configs[block.kind]));
      groups = groupBlocks(blocks, configs);
      if (groups.length > 1) {
        const horizontal = horizontalGroups(program, groups);
        entries = horizontalPlan(entries, horizontal, resolveHorizontalLegendLane({ edge: layout.edge, ...layout.frame, groups: horizontal, allowOverflow: layout.allowOverflow }));
      }
    }
  }
  const result = cloneAndFreeze(entries); if (isOwned(layout)) geometry.set(layout, result); return result;
}
function normalizeLayout(input) {
  if (layouts.has(input)) return layouts.get(input);
  record(input, ["edge", "frame", "blocks", "allowOverflow"], "Prepared legend lane");
  if (!["left", "right", "top", "bottom"].includes(input.edge) || typeof input.allowOverflow !== "boolean") throw new TypeError("Legend lane requires native edge and fit policy.");
  ownArray(input.blocks, "Prepared legend lane blocks");
  if (!input.blocks.length || input.blocks.length > 6) throw new RangeError("Legend lane requires bounded native blocks.");
  const kinds = new Set();
  const blocks = input.blocks.map(block => {
    record(block, ["kind", "target", "values"], "Prepared legend lane block");
    if (!legendAnimationFamily(block.kind) || kinds.has(block.kind)) throw new TypeError("Legend lane requires unique native families.");
    kinds.add(block.kind); if (typeof block.target !== "string" || !block.target.length) throw new TypeError("Legend lane requires a native target."); validateWorkLimit(block.target.length, "Legend lane target work"); ownRecord(block.values, "Prepared legend lane values");
    if (Object.hasOwn(block.values, "frame")) throw new TypeError("Legend lane owns its frame once.");
    const { frame, ...values } = blockLayout(block, input.frame);
    if (values.config.position !== input.edge || ["color", "series", "stroke"].includes(block.kind) && values.config.kind !== block.kind) throw new TypeError("Legend lane block must belong to its declared edge and family.");
    return { kind: block.kind, target: block.target, values };
  });
  const result = cloneAndFreeze({ ...input, blocks }); geometryList(result);
  layouts.set(result, result); if (isOwned(input)) layouts.set(input, result); return result;
}
export function prepareLegendLaneLayout({ edge, frame, blocks, allowOverflow = false }) {
  return normalizeLayout({ edge, frame, allowOverflow, blocks: blocks.map(({ kind, target, layout }) => {
    const { frame: ignored, ...values } = layout; return { kind, target, values };
  }) });
}
function entryFor(layout, identity) { return geometryList(layout).find(entry => entry.target === identity.owner && entry.family === identity.value[0] && entry.component === identity.component && same(entry.sample, identity.value[1])); }
export function normalizeLegendLaneAnimationState(input) {
  record(input, ["identity", "kind", "layout"], "Legend lane animation state");
  const identity = normalizeGuideIdentity(input.identity), layout = normalizeLayout(input.layout);
  if (input.kind !== "legend-lane" || entryFor(layout, identity) === undefined) throw new TypeError("Legend lane identity must name its native component.");
  return cloneAndFreeze({ identity, kind: "legend-lane", layout });
}
export function legendLaneAnimationKeys(input) {
  const state = normalizeLegendLaneAnimationState(input);
  return geometryList(state.layout).map(entry => guideAnimationKey({ ...state.identity, owner: entry.target, component: entry.component, value: [entry.family, entry.sample], line: 0 }));
}
export function resolveLegendLaneAnimationGeometry(input) {
  const state = normalizeLegendLaneAnimationState(input), entry = entryFor(state.layout, state.identity);
  return cloneAndFreeze({ type: entry.type, properties: entry.properties });
}
export function legendLaneAnimationMatchesNode(state, node) {
  const output = resolveLegendLaneAnimationGeometry(state);
  if (output.type !== node.type || !Object.entries(output.properties).every(([key, value]) => same(value, node.properties[key]))) return false;
  const entry = entryFor(state.layout, state.identity), block = state.layout.blocks.find(block => block.kind === entry.family);
  const properties = legendBlockEntryProperties(block.kind, blockLayout(block, state.layout.frame), entry);
  if (output.type === "text") return (node.properties.fontFamily ?? DEFAULT_FONT_FAMILY) === properties.fontFamily &&
    node.properties.fontSize === properties.fontSize && textMetricFontWeight(node.properties.fontWeight) === properties.fontWeight &&
    (node.properties.fontStyle ?? "normal") === properties.fontStyle && (node.properties.rotation ?? 0) === 0 &&
    (Object.hasOwn(output.properties, "lines") || !Object.hasOwn(node.properties, "lines"));
  return (node.properties.strokeWidth ?? 0) === (properties.strokeWidth ?? 0);
}
function representative(block, layout, identity) {
  const family = legendAnimationFamily(block.kind), prepared = blockLayout(block, layout.frame), entry = family.entries(prepared)[0];
  return { identity: { ...identity, owner: block.target, component: entry.component, value: [block.kind, entry.sample], line: 0 }, kind: family.kind, layout: prepared };
}
export function prepareLegendLaneInterpolation(fromInput, toInput) {
  const from = normalizeLegendLaneAnimationState(fromInput), to = normalizeLegendLaneAnimationState(toInput);
  if (guideAnimationKey(from.identity) !== guideAnimationKey(to.identity)) return fade("guide-policy");
  const a = from.layout, b = to.layout;
  if (a.edge !== b.edge || a.allowOverflow !== b.allowOverflow || !same(a.blocks.map(x => [x.kind, x.target]), b.blocks.map(x => [x.kind, x.target]))) return fade("guide-layout");
  for (const [index, block] of a.blocks.entries()) {
    const prepared = legendAnimationFamily(block.kind).prepare(representative(block, a, from.identity), representative(b.blocks[index], b, to.identity));
    if (prepared.kind === "crossfade") return fade(prepared.reason);
  }
  return cloneAndFreeze({ kind: "guide", version: ANIMATION_GUIDE_VERSION, from, to });
}
export function sampleLegendLaneInterpolation(plan, progress) {
  validateUnitInterval(progress, "Legend lane progress"); record(plan, ["kind", "version", "from", "to"], "Prepared legend lane interpolation");
  if (plan.kind !== "guide" || plan.version !== ANIMATION_GUIDE_VERSION) throw new TypeError("Invalid prepared legend lane interpolation.");
  const prepared = prepareLegendLaneInterpolation(plan.from, plan.to);
  if (prepared.kind !== "guide") throw new TypeError("Invalid prepared legend lane interpolation.");
  const a = prepared.from.layout, b = prepared.to.layout, cached = samples.get(a)?.get(b);
  if (cached?.progress === progress) {
    const state = normalizeLegendLaneAnimationState({ ...prepared.from, layout: cached.layout });
    return cloneAndFreeze({ kind: "guide", state, ...resolveLegendLaneAnimationGeometry(state) });
  }
  try {
    const blocks = []; let frame;
    for (const [index, block] of a.blocks.entries()) {
      const family = legendAnimationFamily(block.kind), child = family.prepare(representative(block, a, prepared.from.identity), representative(b.blocks[index], b, prepared.to.identity));
      const sampled = family.sample(child, progress);
      if (sampled.kind === "crossfade") return fade(sampled.reason);
      const { frame: sampledFrame, ...values } = sampled.state.layout; frame = sampledFrame;
      blocks.push({ kind: block.kind, target: block.target, values });
    }
    const state = normalizeLegendLaneAnimationState({ ...prepared.from, layout: { ...a, frame, blocks } });
    if (!samples.has(a)) samples.set(a, new WeakMap()); samples.get(a).set(b, { progress, layout: state.layout });
    return cloneAndFreeze({ kind: "guide", state, ...resolveLegendLaneAnimationGeometry(state) });
  } catch (error) {
    if (!(error instanceof RangeError) && getErrorDetails(error)?.reason !== "canvas-overflow" && !/legend block requires/.test(error.message)) throw error;
    return fade("guide-layout");
  }
}
export { geometryList as resolveLegendLaneEntries };
