import { resolveMarkItems } from './selection/policies/index.js';
import { resolveTextGraphicEntries as resolveEntries } from './textGeometry.js';
export { sourceValue, validateSourceMarkLabelPlacement } from './textGeometry.js';

export function resolveTextGraphicEntries(program, layer, config, options = {}) {
  return resolveEntries(program, layer, config, { ...options, resolveMarkItems });
}
export function resolveTextGraphicItems(program, layer, config) {
  return resolveTextGraphicEntries(program, layer, config).map(entry => entry.graphic);
}
