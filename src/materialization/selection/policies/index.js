import { mapConditionalValues } from "../../conditionalMapping.js";
import { conditionalSelectionMembership } from "../../conditionalSelection.js";
import { identifyItems } from "../items/common.js";
import { memberRowReferences } from "../rows.js";
import { textSelectionPolicy } from "./text.js";
import { findDataset } from "../../../selectors/datasets.js";
import { requireLayer } from "../../../selectors/layers.js";
import { areaSelectionPolicy } from "./area.js";
import { arcSelectionPolicy } from "./arc.js";
import { barSelectionPolicy } from "./bar.js";
import { lineSelectionPolicy } from "./line.js";
import { pointSelectionPolicy } from "./point.js";
import { ruleSelectionPolicy } from "./rule.js";
import { tickSelectionPolicy } from "./tick.js";
import { rectSelectionPolicy } from "./rect.js";
import { applyItemMissingPolicy } from "../../../grammar/itemMissing.js";
import { resolveOverlayItems } from "../items/overlay.js";

const POLICIES = Object.freeze({
  text: textSelectionPolicy,
  arc: arcSelectionPolicy,
  area: areaSelectionPolicy,
  bar: barSelectionPolicy,
  line: lineSelectionPolicy,
  point: pointSelectionPolicy,
  rule: ruleSelectionPolicy,
  tick: tickSelectionPolicy,
  rect: rectSelectionPolicy
});

export function findSelectionPolicy(markType) {
  return POLICIES[markType];
}

export function requireSelectionPolicy(markType) {
  const policy = findSelectionPolicy(markType);
  if (policy === undefined) {
    throw new Error(`Mark type "${markType}" has no selection policy.`);
  }
  return policy;
}

export function resolveMarkItems(program, target, grain = "item", options) {
  return resolveItems(program, target, grain, false, options);
}

// Concrete output records direct membership; expanding all ancestors belongs
// to selection and inspection, not every geometry rebuild.
export function resolveMarkIdentities(program, target) {
  return resolveItems(program, target, "item", true);
}

function resolveItems(program, target, grain, identityOnly, options) {
  const resolvers = { resolveMarkItems, resolveMarkSourceItems, identityOnly,
    pointAppearance: (layer, items) => conditionalPointAppearance(program, layer, items) };
  const layer = requireLayer(program, target, `Unknown mark target "${target}"`);
  if (layer.derivedBindings?.overlay) {
    if (grain !== "item") throw new Error(`Overlay "${target}" supports item selection grain.`);
    const items = resolveOverlayItems(program, layer, resolvers);
    return identityOnly ? items : withConditionalChannels(program, layer, items, options);
  }
  const dataset = findDataset(program, layer.data);
  if (dataset === undefined) {
    throw new Error(`Mark "${target}" requires an existing dataset for selection.`);
  }
  const policy = requireSelectionPolicy(layer.mark?.type);
  if (!policy.supportedGrains.includes(grain)) {
    throw new Error(`Mark "${target}" does not support ${grain} selection grain.`);
  }
  const items = policy.resolveItems(program, layer, applyItemMissingPolicy(layer, dataset), grain, resolveMarkItems, resolvers);
  return identityOnly ? items : withConditionalChannels(program, layer, items, options);
}

// Composite source membership does not require the parent's graphics to have
// finished rebuilding. Each owning policy supplies its same final semantic grain.
export function resolveMarkSourceItems(program, target, grain = 'item', options = { channels: [] }) {
  const layer = requireLayer(program, target), policy = requireSelectionPolicy(layer.mark.type);
  const dataset = applyItemMissingPolicy(layer, findDataset(program, layer.data));
  if (layer.derivedBindings?.overlay && grain !== "item") throw new Error(`Overlay "${target}" supports item selection grain.`);
  const definitions = layer.derivedBindings?.overlay ? resolveOverlayItems(program, layer, { sourceOnly: true, resolveMarkItems, resolveMarkSourceItems })
    : policy.resolveSourceItems ? policy.resolveSourceItems(program, layer, dataset, grain, { resolveMarkItems, resolveMarkSourceItems })
    : policy.resolveItems(program, layer, dataset, grain, resolveMarkItems, { sourceOnly: true, resolveMarkItems, resolveMarkSourceItems });
  const items = definitions.every(item => item.key !== undefined) ? definitions : identifyItems(program, layer, grain, definitions);
  return withConditionalChannels(program, layer, items.map(item => ({
    ...item, properties: item.properties ?? {},
    rows: memberRowReferences(program, item.members, layer.data, item.memberKeys)
  })), options);
}

function withConditionalChannels(program, layer, items, { channels, active = new Set() } = {}) {
  let result = items;
  for (const channel of channels ?? Object.keys(layer.conditionals ?? {})) {
    const definition = layer.conditionals?.[channel];
    if (definition === undefined) continue;
    if ((["bar", "arc"].includes(layer.mark.type) || (channels === undefined && ["line", "area"].includes(layer.mark.type))) && ["x", "y", "x2", "y2", "theta", "radius"].includes(channel)) continue;
    const key = `${layer.id}:${channel}`;
    if (active.has(key)) throw new Error("Cyclic conditional selection dependency.");
    active.add(key);
    try {
      const resolvers = {
        resolveMarkItems: (program, target, grain, options) => resolveMarkItems(program, target, grain, { ...options, active }),
        resolveMarkSourceItems: (program, target, grain, options) => resolveMarkSourceItems(program, target, grain, { ...options, active })
      };
      const membership = conditionalSelectionMembership(program, layer, definition, result, resolvers);
      const values = mapConditionalValues(program, layer, channel, result, membership, { mapped: false, resolvers });
      result = result.map((item, index) => ({ ...item, channels: { ...item.channels, [channel]: values[index] } }));
    } finally { active.delete(key); }
  }
  return result;
}

function conditionalPointAppearance(program, layer, items) {
  if (!layer.conditionals?.shape && !layer.conditionals?.angle) return undefined;
  const output = new Map(items.map(item => [item.key, {}]));
  for (const channel of ["shape", "angle"]) {
    const definition = layer.conditionals?.[channel];
    if (definition === undefined) continue;
    const membership = conditionalSelectionMembership(program, layer, definition, items, { resolveMarkItems, resolveMarkSourceItems });
    const values = mapConditionalValues(program, layer, channel, items, membership);
    items.forEach((item, index) => { output.get(item.key)[channel] = values[index]; });
  }
  return output;
}
