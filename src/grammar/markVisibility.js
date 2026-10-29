import { cloneAndFreeze } from "../core/immutable.js";
import { ownArray, ownRecord } from "../core/ownData.js";
import { LEGEND_CHANNELS } from "../core/vocabulary.js";
import { validateGeneratedItemLimit, validateWorkLimit } from "../core/validation.js";
import { isNominalValue } from "./scales/fields.js";

export function visibilityCategories(values, label = "Visibility values", { empty = false } = {}) {
  ownArray(values, label);
  validateGeneratedItemLimit(values.length, label);
  if (!empty && values.length === 0) throw new TypeError(`${label} must not be empty.`);
  let work = values.length;
  for (const value of values) {
    if (!isNominalValue(value)) throw new TypeError(`${label} requires nominal values.`);
    validateWorkLimit(work += typeof value === "string" ? value.length : 1, `${label} work`);
  }
  if (new Set(values).size !== values.length) throw new TypeError(`${label} must contain unique typed values.`);
  return cloneAndFreeze(values);
}

export function normalizeMarkVisibility(value) {
  ownRecord(value, "Mark visibility");
  if (Object.keys(value).length !== 4 || ["channels", "field", "hidden", "scaleDomain"].some(key => !Object.hasOwn(value, key))) {
    throw new TypeError("Mark visibility requires channels, field, hidden and scaleDomain.");
  }
  ownArray(value.channels, "Visibility channels");
  if (!value.channels.length || value.channels.length > LEGEND_CHANNELS.length ||
      value.channels.some(channel => !LEGEND_CHANNELS.includes(channel)) || new Set(value.channels).size !== value.channels.length) {
    throw new TypeError("Visibility channels must be unique legend channels.");
  }
  if (typeof value.field !== "string" || !value.field.length) throw new TypeError("Visibility field must be a non-empty string.");
  validateWorkLimit(value.field.length, "Visibility field work");
  if (!["visible-data", "all-data"].includes(value.scaleDomain)) throw new TypeError("Visibility scaleDomain requires visible-data or all-data.");
  return cloneAndFreeze({ channels: value.channels, field: value.field,
    hidden: visibilityCategories(value.hidden, "Hidden visibility values"), scaleDomain: value.scaleDomain });
}

export function updateVisibilityCategories(domain, hidden, values, visible) {
  const known = new Set(visibilityCategories(domain, "Visibility domain", { empty: true }));
  const previous = visibilityCategories(hidden, "Previous hidden values", { empty: true });
  const requested = visibilityCategories(values);
  if (typeof visible !== "boolean") throw new TypeError("Visibility visible must be boolean.");
  if (requested.some(value => !known.has(value))) throw new Error("Visibility values must belong to the original category domain.");
  const next = new Set(previous);
  for (const value of requested) visible ? next.delete(value) : next.add(value);
  return cloneAndFreeze([...next]);
}
