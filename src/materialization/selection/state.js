import { resolveItemSelection } from "./itemSelection.js";
import { validateUserId } from "../../core/identifiers.js";
import { normalizeMarkSelector } from "../../grammar/markSelection.js";
import { resolveMarkItems, resolveMarkSourceItems } from "./policies/index.js";
import { selectionPredicate as resolveSelectionPredicate } from "./predicate.js";

export function resolveMarkSelection(program, target, selector) {
  const normalized = normalizeMarkSelector(selector);
  return resolveItemSelection(program, resolveMarkItems(program, target, normalized.grain), normalized);
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


export function selectionPredicate(program, definition) {
  return resolveSelectionPredicate(program, definition, { resolveMarkItems, resolveMarkSourceItems });
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
