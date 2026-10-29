import { validateRowSelection } from "./rows.js";
import { normalizeSelectionSelector } from "../../grammar/selectionExpression.js";
import { selectProgramItemKeys } from "./expression.js";

export function resolveItemSelection(program, items, selector) {
  const normalized = normalizeSelectionSelector(selector);
  if (normalized.rows) validateRowSelection(program, normalized.rows, items);
  if (items.length > 0 && !normalized.rows && normalized.items === undefined && !Object.hasOwn(normalized, "where") && !Object.hasOwn(normalized, "region")) {
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
    keys: selectProgramItemKeys(program, items, normalized)
  });
}

