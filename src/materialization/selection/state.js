import { validateRowSelection, rowsForSelectedItems } from "./rows.js";
import { validateUserId } from "../../core/identifiers.js";
import { normalizeMarkSelector, selectMarkItemKeys } from "../../grammar/markSelection.js";
import { resolveMarkItems, resolveMarkSourceItems } from "./policies/index.js";

export function resolveMarkSelection(program, target, selector) {
  const normalized = normalizeMarkSelector(selector);
  const items = resolveMarkItems(program, target, normalized.grain);
  if (normalized.rows) validateRowSelection(program, normalized.rows, items);
  if (items.length > 0 && !normalized.rows) {
    const source = normalized.field !== undefined
      ? "fields"
      : normalized.channel !== undefined
        ? "channels"
        : "properties";
    const kind = normalized.field !== undefined
      ? "field"
      : normalized.channel !== undefined
        ? "channel"
        : "graphic property";
    const key = normalized.field ?? normalized.channel ?? normalized.property;
    if (!items.some(item => Object.hasOwn(item[source], key))) {
      throw new Error(
        `Selection ${kind} "${key}" is not uniquely defined at the target ${normalized.grain} grain.`
      );
    }
  }
  return Object.freeze({
    selector: normalized,
    items,
    keys: selectMarkItemKeys(items, normalized)
  });
}

export function resolveSelectionCreationId(program, id, target) {
  const resolved = validateUserId(
    id ?? `${target}Selection`,
    "Selection id"
  );
  if (program.materializationConfigs.selections?.[resolved] !== undefined) {
    throw new Error(`Selection "${resolved}" already exists.`);
  }
  return resolved;
}


// Dependent components follow their owner's current selection after data or
// encoding revisions, rather than freezing a list of previously selected rows.
export function selectionPredicate(program, definition) {
  if (!definition.sourceSelection) return definition.selector;
  const parent = program.materializationConfigs.selections?.[definition.sourceSelection];
  if (!parent || parent.sourceSelection) throw new Error('Invalid composite selection owner.');
  if (!definition.selector.rows) return parent.selector;
  const items = parent.selector.property ? resolveMarkItems(program, parent.target, parent.selector.grain)
    : resolveMarkSourceItems(program, parent.target, parent.selector.grain);
  const resolved = { items, keys: selectMarkItemKeys(items, parent.selector) };
  return { ...definition.selector, rows: rowsForSelectedItems(program, resolved.items, resolved.keys, definition.selector.rows.data) };
}

export function resolveStoredSelection(program, id) {
  const selections = program.materializationConfigs.selections ?? {};
  const requested = id ?? program.context.currentSelection;
  const resolvedId = requested ?? (
    Object.keys(selections).length === 1 ? Object.keys(selections)[0] : undefined
  );
  if (resolvedId === undefined) {
    if (Object.keys(selections).length === 0) {
      throw new Error("Selection resolution requires an existing selection.");
    }
    throw new Error("Selection is ambiguous; provide selection.");
  }
  validateUserId(resolvedId, "Selection id");
  const definition = selections[resolvedId];
  if (definition === undefined) {
    throw new Error(`Unknown selection "${resolvedId}".`);
  }
  const resolved = resolveMarkSelection(
    program,
    definition.target,
    selectionPredicate(program, definition)
  );
  return Object.freeze({ id: resolvedId, definition, ...resolved });
}
