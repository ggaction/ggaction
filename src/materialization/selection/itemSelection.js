import { validateRowSelection } from "./rows.js";
import { normalizeMarkSelector, selectMarkItemKeys } from "../../grammar/markSelection.js";

export function resolveItemSelection(program, items, selector) {
  const normalized = normalizeMarkSelector(selector);
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

