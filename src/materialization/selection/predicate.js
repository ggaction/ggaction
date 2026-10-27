import { storedSelectionSelector } from "../../selectors/selectionResources.js";
import { rowsForSelectedItems } from "./rows.js";
import { selectMarkItemKeys } from "../../grammar/markSelection.js";

// Dependent components follow their owner's current selection after data or
// encoding revisions, rather than freezing a list of previously selected rows.
export function selectionPredicate(program, definition, { resolveMarkItems, resolveMarkSourceItems } = {}) {
  if (!definition.sourceSelection) return storedSelectionSelector(program, definition);
  const parent = program.materializationConfigs.selections?.[definition.sourceSelection];
  if (!parent || parent.sourceSelection) throw new Error('Invalid composite selection owner.');
  const predicate = storedSelectionSelector(program, parent);
  if (!definition.projection.data) return { ...predicate, grain: definition.grain };
  const items = predicate.property ? resolveMarkItems(program, parent.target, predicate.grain)
    : resolveMarkSourceItems(program, parent.target, predicate.grain);
  const resolved = { items, keys: selectMarkItemKeys(items, predicate) };
  return { grain: definition.grain, rows: rowsForSelectedItems(program, resolved.items, resolved.keys, definition.projection.data) };
}

