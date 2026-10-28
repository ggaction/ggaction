import { resolveFillPaint, isPatternPaint, validateConcreteFillPaint } from "../grammar/paint.js";
import { patternFillGeometry } from "../grammar/patterns.js";
import { resolvePrimitiveGraphicBounds } from "../grammar/schemas/graphicBounds.js";
import { resolveCoordinateBounds } from "./coordinateBounds.js";
import { validateWorkLimit } from "../core/validation.js";

// Called by mark/guide owners before they write concrete fill properties.
export function materializeFillItems(program, layer, items) {
  if (!items.some(item => isPatternPaint(item.properties.fill) || item.type === "text" && typeof item.properties.fill === "object")) return items;
  const plot = resolveCoordinateBounds(program, layer.coordinate);
  let work = 0;
  return items.map(item => {
    const textPaint = item.type === "text" && typeof item.properties.fill === "object";
    if (!isPatternPaint(item.properties.fill) && !textPaint) return item;
    const bounds = resolvePrimitiveGraphicBounds(item.type, { ...item.properties, strokeWidth: 0,
      ...(textPaint ? { rotation: 0 } : {}) }, program.materializationConfigs.textMetrics);
    const fill = isPatternPaint(item.properties.fill) && Object.hasOwn(item.properties.fill, "origin")
      ? validateConcreteFillPaint(item.properties.fill)
      : resolveFillPaint(item.properties.fill, { bounds, plotOrigin: [plot.x, plot.y] });
    if (isPatternPaint(fill)) {
      const { type, origin, ...options } = fill;
      work += patternFillGeometry(options, bounds, [origin.x, origin.y]).workItems;
      validateWorkLimit(work, "Mark pattern geometry work");
    }
    return { ...item, properties: { ...item.properties, fill, ...(textPaint ? { fillBounds: bounds } : {}) } };
  });
}
