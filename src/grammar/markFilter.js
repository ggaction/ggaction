import { cloneAndFreeze, isPlainObject } from "../core/immutable.js";
import { normalizeMarkSelector } from "./markSelection.js";

const TRANSFORM_KEYS = Object.freeze(["type", "target", "selector"]);

export function validateMarkFilterTransform(transform) {
  if (!isPlainObject(transform)) {
    throw new TypeError("Mark filter transform must be a plain object.");
  }
  const unknown = Object.keys(transform).find(
    key => !TRANSFORM_KEYS.includes(key)
  );
  if (unknown !== undefined) {
    throw new Error(`Unknown mark filter transform property "${unknown}".`);
  }
  if (transform.type !== "markFilter") {
    throw new Error(`Unsupported mark filter transform "${transform.type}".`);
  }
  if (typeof transform.target !== "string" || transform.target.length === 0) {
    throw new TypeError("Mark filter target must be a non-empty string.");
  }
  normalizeMarkSelector(transform.selector);
}

export function normalizeMarkFilterTransform(target, selector) {
  const transform = {
    type: "markFilter",
    target,
    selector: normalizeMarkSelector(selector)
  };
  validateMarkFilterTransform(transform);
  return cloneAndFreeze(transform);
}

export function deriveMarkFilteredRows(sourceRows, items, selectedKeys) {
  if (!Array.isArray(sourceRows)) {
    throw new TypeError("Mark filter source values must be an array.");
  }
  const selected = new Set(selectedKeys);
  const members = new Set(
    items
      .filter(item => selected.has(item.key))
      .flatMap(item => item.members)
  );
  return cloneAndFreeze(sourceRows.filter(row => members.has(row)));
}
