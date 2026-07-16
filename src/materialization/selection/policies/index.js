import { findDataset } from "../../../selectors/datasets.js";
import { requireLayer } from "../../../selectors/layers.js";
import { areaSelectionPolicy } from "./area.js";
import { barSelectionPolicy } from "./bar.js";
import { lineSelectionPolicy } from "./line.js";
import { pointSelectionPolicy } from "./point.js";
import { ruleSelectionPolicy } from "./rule.js";

const POLICIES = Object.freeze({
  area: areaSelectionPolicy,
  bar: barSelectionPolicy,
  line: lineSelectionPolicy,
  point: pointSelectionPolicy,
  rule: ruleSelectionPolicy
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
  const layer = requireLayer(program, target, `Unknown mark target "${target}"`);
  const dataset = findDataset(program, layer.data);
  if (dataset === undefined) {
    throw new Error(`Mark "${target}" requires an existing dataset for selection.`);
  }
  const policy = requireSelectionPolicy(layer.mark?.type);
  if (!policy.supportedGrains.includes(grain)) {
    throw new Error(`Mark "${target}" does not support ${grain} selection grain.`);
  }
  return policy.resolveItems(program, layer, dataset, grain);
}
