import { cloneAndFreeze } from "../core/immutable.js";
import { legendResourcePolicies } from "./guides/resources.js";
import { translatedProperties } from "./graphicTranslation.js";
import { unionConcreteGraphicBounds } from "../grammar/schemas/graphicBounds.js";
import { editLegendBorderBounds } from "./legendBorder.js";

// Layout always works with the native, unshifted block. Retain its concrete
// baseline so an unrelated transaction can restore it without regenerating
// marks or accumulating translations. Rebuilt resources supersede old paint.
export function restoreLegendItemsOffset(program) {
  const retained = program.materializationConfigs.legendItemsPaint;
  if (!retained) return program;
  const objects = { ...program.graphicSpec.objects };
  for (const [id, { before, after }] of Object.entries(retained)) {
    if (objects[id] === after || JSON.stringify(objects[id]) === JSON.stringify(after)) objects[id] = before;
  }
  return program._clone({ graphicSpec: cloneAndFreeze({ ...program.graphicSpec, objects }) })
    ._withoutMaterializationConfig(["legendItemsPaint"]);
}

export function applyLegendItemsOffset(program) {
  let next = restoreLegendItemsOffset(program);
  if (!Object.values(next.guideConfigs.legend ?? {}).some(config => config.itemsOffset?.x || config.itemsOffset?.y)) return next;
  const baseline = next.graphicSpec.objects, objects = { ...baseline }, retained = {};
  const touched = new Set();
  function shift(id, dx, dy) {
    const object = objects[id];
    if (!object) return;
    touched.add(id);
    const moved = { ...object };
    if (object.properties) moved.properties = translatedProperties(object.type, object.properties, dx, dy);
    if (object.clip) moved.clip = { ...object.clip, x: object.clip.x + dx, y: object.clip.y + dy };
    if (object.items) moved.items = object.items.map(item => ({ ...item,
      properties: translatedProperties(item.type ?? object.type, item.properties, dx, dy) }));
    objects[id] = moved;
    // Canvas children inherit the translated clipping window.
    if (object.type !== "canvas") for (const child of object.children ?? []) shift(child, dx, dy);
  }
  const changed = [];
  for (const policy of legendResourcePolicies()) {
    const config = next.guideConfigs.legend?.[policy.kind];
    const { x = 0, y = 0 } = config?.itemsOffset ?? {};
    if (!x && !y) continue;
    const body = policy.graphicIds.filter(id => !/(Title|Background)$/.test(id));
    for (const id of body) shift(id, x, y);
    changed.push({ policy, config });
  }
  if (!changed.length) return next;
  next = next._clone({ graphicSpec: cloneAndFreeze({ ...next.graphicSpec, objects }) });
  for (const { policy, config } of changed) {
    const background = policy.graphicIds.find(id => id.endsWith("Background"));
    if (!next.graphicSpec.objects[background]) continue;
    touched.add(background);
    const bounds = unionConcreteGraphicBounds(next.graphicSpec,
      policy.graphicIds.filter(id => id !== background && next.graphicSpec.objects[id]), next.materializationConfigs.textMetrics);
    if (!bounds) continue;
    const padding = config.border?.padding ?? 0;
    next = editLegendBorderBounds(next, background, { x: bounds.left - padding, y: bounds.top - padding,
      width: bounds.right - bounds.left + padding * 2, height: bounds.bottom - bounds.top + padding * 2 });
  }
  for (const id of touched) {
    const object = next.graphicSpec.objects[id];
    if (baseline[id] && object !== baseline[id]) {
      retained[id] = { before: baseline[id], after: object };
    }
  }
  return next._withMaterializationConfig(["legendItemsPaint"], retained);
}
