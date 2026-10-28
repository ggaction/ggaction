import { resolveOverlaySeries } from "./overlayItems.js";
import { resolveConditionalValues } from "./conditionalValues.js";
import { resolveMarkSourceItems } from "./selection/policies/index.js";

// Geometry needs the chosen glyph shape to recover asymmetric point anchors.
// The lower item owner remains independent of conditional selection adapters.
export function resolveOverlayGeometry(program, binding) {
  return resolveOverlaySeries(program, binding, { pointAppearance(source) {
    if (!source.conditionals?.shape && !source.conditionals?.angle) return undefined;
    const items = resolveMarkSourceItems(program, source.id);
    const shapes = resolveConditionalValues(program, source, "shape", items);
    const angles = resolveConditionalValues(program, source, "angle", items);
    return new Map(items.map((item, index) => [item.key, { shape: shapes?.[index], angle: angles?.[index] }]));
  } });
}
