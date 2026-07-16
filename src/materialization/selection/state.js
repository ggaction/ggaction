import { validateUserId } from "../../core/identifiers.js";
import { normalizeMarkSelector, selectMarkItemKeys } from "../../grammar/markSelection.js";
import { resolveMarkItems } from "./items.js";

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
  const selector = normalizeMarkSelector(definition.selector);
  const items = resolveMarkItems(program, definition.target);
  if (items.length > 0) {
    const source = selector.field === undefined ? "channels" : "fields";
    const key = selector.field ?? selector.channel;
    if (!items.some(item => Object.hasOwn(item[source], key))) {
      throw new Error(
        `Selection ${selector.field === undefined ? "channel" : "field"} "${key}" is not uniquely defined at the target item grain.`
      );
    }
  }
  const keys = selectMarkItemKeys(items, selector);
  return Object.freeze({ id: resolvedId, definition, items, keys });
}
