import { cloneAndFreeze, isPlainObject } from "../core/immutable.js";
import { validateUserId } from "../core/identifiers.js";
import { normalizeMarkSelector } from "./markSelection.js";

function hasOwn(value, key) {
  return Object.hasOwn(value, key);
}

function normalizeNamedSelection(id) {
  return cloneAndFreeze({
    kind: "named",
    id: validateUserId(id, "Label selection id")
  });
}

function normalizeInlineSelection(selector) {
  return cloneAndFreeze({
    kind: "inline",
    selector: normalizeMarkSelector(selector)
  });
}

export function normalizeLabelSelectionCreate(options) {
  if (!isPlainObject(options)) {
    throw new TypeError("createMarkLabels options must be a plain object.");
  }
  const hasSelect = hasOwn(options, "select");
  const hasSelection = hasOwn(options, "selection");
  if (hasSelect && hasSelection) {
    throw new Error("createMarkLabels accepts select or selection, not both.");
  }
  if (hasSelect) return normalizeInlineSelection(options.select);
  if (hasSelection) return normalizeNamedSelection(options.selection);
  return cloneAndFreeze({ kind: "all" });
}

export function normalizeLabelSelectionEdit(options) {
  if (!isPlainObject(options)) {
    throw new TypeError("editMarkLabelSelection options must be a plain object.");
  }
  const requested = ["select", "selection", "all"].filter(key =>
    hasOwn(options, key)
  );
  if (requested.length !== 1) {
    throw new Error(
      "editMarkLabelSelection requires exactly one of select, selection, or all."
    );
  }
  if (requested[0] === "select") return normalizeInlineSelection(options.select);
  if (requested[0] === "selection") {
    return normalizeNamedSelection(options.selection);
  }
  if (options.all !== true) {
    throw new TypeError("editMarkLabelSelection all must be true.");
  }
  return cloneAndFreeze({ kind: "all" });
}
