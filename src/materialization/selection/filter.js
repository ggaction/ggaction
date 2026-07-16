import { isPlainObject } from "../../core/immutable.js";
import {
  normalizeMarkSelector,
  selectMarkItemKeys
} from "../../grammar/markSelection.js";
import { findDataset } from "../../selectors/datasets.js";
import { findLayer } from "../../selectors/layers.js";
import { resolveMarkSelection } from "./state.js";

function resolvePointRows(program, layer, selector) {
  const dataset = findDataset(program, layer.data);
  if (dataset === undefined) {
    throw new Error(`Point mark "${layer.id}" requires an existing dataset.`);
  }
  const items = dataset.values.map((row, index) => ({
    key: `${layer.id}/point/${index}`,
    fields: isPlainObject(row) ? { ...row } : {},
    channels: {},
    properties: {},
    members: [row]
  }));
  return {
    selector,
    items,
    keys: selectMarkItemKeys(items, selector)
  };
}

export function resolveMarkFilterSelection(program, target, selector) {
  const normalized = normalizeMarkSelector(selector);
  const layer = findLayer(program, target);
  if (
    layer?.mark?.type === "point" &&
    normalized.grain === "item" &&
    normalized.field !== undefined
  ) {
    return resolvePointRows(program, layer, normalized);
  }
  return resolveMarkSelection(program, target, normalized);
}
