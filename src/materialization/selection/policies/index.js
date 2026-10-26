import { rowsForSelectedItems, memberRowReferences } from "../rows.js";
import { selectMarkItemKeys } from "../../../grammar/markSelection.js";
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

export function resolveMarkItems(program, target, grain = "item") {
  for (const config of Object.values(program.materializationConfigs.highlights ?? {})) {
    const definition = program.materializationConfigs.selections?.[config.selection];
    if (config.target !== target || !definition?.sourceSelection) continue;
    const parent = program.materializationConfigs.selections[definition.sourceSelection];
    if (!parent || parent.sourceSelection) throw new Error('Invalid composite selection owner.');
    if (!definition.selector.rows) {
      program = program._withSelectionConfig(config.selection, { ...definition, selector: parent.selector });
      continue;
    }
    const parentItems = parent.selector.property ? resolveMarkItems(program, parent.target, parent.selector.grain) : resolveMarkSourceItems(program, parent.target, parent.selector.grain);
    const rows = rowsForSelectedItems(program, parentItems, selectMarkItemKeys(parentItems, parent.selector), definition.selector.rows.data);
    program = program._withSelectionConfig(config.selection, { ...definition, selector: { ...definition.selector, rows } });
  }
  const layer = requireLayer(program, target, `Unknown mark target "${target}"`);
  if (layer.derivedBindings?.overlay) {
    if (grain !== "item") throw new Error(`Overlay "${target}" supports item selection grain.`);
    return resolveOverlayItems(program, layer);
  }
  const dataset = findDataset(program, layer.data);
  if (dataset === undefined) {
    throw new Error(`Mark "${target}" requires an existing dataset for selection.`);
  }
  const policy = requireSelectionPolicy(layer.mark?.type);
  if (!policy.supportedGrains.includes(grain)) {
    throw new Error(`Mark "${target}" does not support ${grain} selection grain.`);
  }
  return policy.resolveItems(program, layer, applyItemMissingPolicy(layer, dataset), grain, resolveMarkItems);
}

// Composite source membership does not require the parent's graphics to have
// finished rebuilding. Each owning policy supplies its same final semantic grain.
export function resolveMarkSourceItems(program, target, grain = 'item') {
  const layer = requireLayer(program, target), policy = requireSelectionPolicy(layer.mark.type);
  if (!policy.resolveSourceItems) return resolveMarkItems(program, target, grain);
  const dataset = applyItemMissingPolicy(layer, findDataset(program, layer.data));
  return policy.resolveSourceItems(program, layer, dataset, grain).map((item,index) => ({
    ...item, key: item.key ?? `${layer.id}/source/${index}`, properties: item.properties ?? {},
    rows: memberRowReferences(program, item.members)
  }));
}
