import { isPlainObject } from "../core/immutable.js";

export function patchLegendItemsOffset(config, value) {
  const { itemsOffset: previous, ...rest } = config;
  if (value === "auto") return rest;
  if (!isPlainObject(value) || !Object.keys(value).length ||
      Object.keys(value).some(key => !["x", "y"].includes(key) ||
        typeof value[key] !== "number" || !Number.isFinite(value[key]))) {
    throw new TypeError('Legend itemsOffset must be a nonempty object with finite x/y coordinates, or "auto".');
  }
  return { ...rest, itemsOffset: { x: 0, y: 0, ...previous, ...value } };
}
