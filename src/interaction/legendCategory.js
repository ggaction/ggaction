import { categoricalLegendView } from "../grammar/legendOverflow.js";
import { interactionNamespaces } from "./selection.js";
import { guideHitToken, guideHitItemKey } from "./hitGuides.js";

// Share exact semantic guide identity across selection and visibility effects.
export function hitLegendCategory(program, target, kind, config, hit, spend) {
  const view = categoricalLegendView(config), namespaces = interactionNamespaces(program, target), entries = new Map();
  const visible = view.hiddenCount > 0 ? view.domain.slice(0, view.overflow.maxItems) : view.domain;
  spend(visible.length + JSON.stringify(namespaces).length * visible.length);
  for (const value of visible) {
    const key = guideHitItemKey(namespaces, guideHitToken(target.id, "legend-item", [kind, ["value", value]]));
    spend(key.length); entries.set(key, value);
  }
  const candidate = hit.candidates.find(item => { spend(1 + item.itemKey.length); return entries.has(item.itemKey); });
  return candidate ? { value: entries.get(candidate.itemKey) } : null;
}
