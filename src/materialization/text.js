import { materializeFillItems } from "./fillPaint.js";
import { resolveMarkItems, resolveMarkSourceItems } from './selection/policies/index.js';
import { resolveTextGraphicEntries as resolveEntries } from './textGeometry.js';
export { sourceValue, validateSourceMarkLabelPlacement } from './textGeometry.js';

export function resolveTextGraphicEntries(program, layer, config, options = {}) {
  return resolveEntries(program, layer, config, { ...options, resolveMarkItems, resolveMarkSourceItems });
}
export function resolveTextGraphicItems(program, layer, config) {
  return materializeFillItems(program, layer, resolveTextGraphicEntries(program, layer, config).map(entry => entry.graphic));
}
