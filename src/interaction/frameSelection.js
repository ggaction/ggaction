import { findLayer } from "../selectors/layers.js";
import { resolveRegisteredMarkSourceItems } from "../materialization/selection/itemResolver.js";
import { frameGeographicSource } from "./hitFrameSource.js";
import { scopeSelectionKeys } from "./selection.js";
import { validateGeneratedItemLimit } from "../core/validation.js";

// Keep native picture items authoritative. Only authenticated Geo source parts
// painted in this frame may add the same current-native semantic item grain.
export function currentFrameSelectionItems(program, owner, items, frame, spend) {
  if (findLayer(owner.view, owner.target.id)?.mark.type !== "geo") return items;
  const keys = new Set(items.map(item => item.key)), sources = new Map();
  for (const entry of frame?.entries ?? []) {
    spend(1 + entry.metadata.itemKey.length);
    const ref = frameGeographicSource(frame, program, entry.metadata.itemKey);
    if (ref !== undefined && entry.metadata.ownerId === owner.target.id &&
        entry.metadata.childPath.length === owner.target.childPath.length &&
        entry.metadata.childPath.every((id, index) => id === owner.target.childPath[index])) sources.set(entry.metadata.itemKey, ref);
  }
  if (sources.size === 0) return items;
  const sourceItems = resolveRegisteredMarkSourceItems(owner.view, owner.target.id, "item", { channels: [] });
  spend(sourceItems.length); validateGeneratedItemLimit(sourceItems.length, "Current frame source items", 100_000);
  const scoped = scopeSelectionKeys(program, owner.target, sourceItems.map(item => item.key), spend);
  const additions = sourceItems.filter((item, index) => {
    const rendered = sources.get(scoped[index]), current = item.lineage?.resource;
    return !keys.has(item.key) && rendered !== undefined && current !== undefined &&
      rendered.kind === current.kind && rendered.id === current.id;
  });
  validateGeneratedItemLimit(items.length + additions.length, "Current frame items", 100_000);
  return [...items, ...additions];
}
