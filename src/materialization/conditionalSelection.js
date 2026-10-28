import { selectMarkItemKeys } from "../grammar/markSelection.js";
import { selectionPredicate } from "./selection/predicate.js";

function rowIdentity(ref) { return JSON.stringify([ref.logicalDataId, ref.rowKey]); }

export function conditionalSelectionMembership(program, layer, definition, items, resolvers, { rowMembership = false } = {}) {
  return Object.fromEntries(definition.selectionInputs.map(input => {
    const selection = program.materializationConfigs.selections[input.selection];
    const predicate = selectionPredicate(program, selection, resolvers);
    const source = predicate.property === undefined ? resolvers.resolveMarkSourceItems : resolvers.resolveMarkItems;
    const selectedItems = source(program, selection.target, predicate.grain, { channels: predicate.channel === undefined ? [] : [predicate.channel] });
    const keys = new Set(selectMarkItemKeys(selectedItems, predicate));
    const selectedRows = new Set(selectedItems.filter(item => keys.has(item.key)).flatMap(item => item.rows.map(rowIdentity)));
    return [input.selection, items.map(item => !rowMembership && selection.target === layer.id && predicate.grain === "item"
      ? keys.has(item.key) : item.rows.some(ref => selectedRows.has(rowIdentity(ref))))];
  }));
}
