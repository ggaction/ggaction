import { cloneAndFreeze, isPlainObject } from "../core/immutable.js";
import { normalizeMarkSelector } from "./markSelection.js";

const TRANSFORM_KEYS = Object.freeze([
  "type", "target", "selector", "selectors"
]);

export function markFilterSelectors(transform) {
  const hasSelector = Object.hasOwn(transform, "selector");
  const hasSelectors = Object.hasOwn(transform, "selectors");
  if (hasSelector === hasSelectors) {
    throw new Error(
      "Mark filter transform requires exactly one of selector or selectors."
    );
  }
  const selectors = hasSelector ? [transform.selector] : transform.selectors;
  if (!Array.isArray(selectors) || selectors.length === 0) {
    throw new TypeError("Mark filter selectors must be a non-empty array.");
  }
  return cloneAndFreeze(selectors.map(normalizeMarkSelector));
}

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
  markFilterSelectors(transform);
}

export function normalizeMarkFilterTransform(target, selectors) {
  const transform = {
    type: "markFilter",
    target,
    selectors: (Array.isArray(selectors) ? selectors : [selectors])
      .map(normalizeMarkSelector)
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
