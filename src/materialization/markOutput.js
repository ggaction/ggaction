import { isScreenAnnotation } from "../grammar/screenAnnotation.js";
import { CONDITIONAL_APPEARANCE_CHANNELS } from "../grammar/conditionalState.js";
import { hasPositionBinding } from "../core/encodingBindings.js";
import { resolveConditionalValues } from "./conditionalValues.js";
import { requireDataset } from "../selectors/datasets.js";
import { materializeMarkClip } from "./markClip.js";
import { resolveMarkIdentities, resolveMarkSourceItems } from "./selection/policies/index.js";
import { findLayer } from "../selectors/layers.js";

// Explicitly called by the owning mark materializer after geometry is complete.
// The primitive transition owns the trace and the immutable concrete replacement.
export function materializeMarkOutput(program, id) {
  const clipped = materializeMarkClip(program, id);
  const graphic = clipped.graphicSpec.objects[id];
  if (!graphic?.items?.length) return clipped;
  const layer = findLayer(clipped, id);
  if (layer === undefined) return clipped;
  if (layer.mark.type === "point" && !layer.derivedBindings?.overlay &&
      !((hasPositionBinding(layer, "x") && hasPositionBinding(layer, "y")) ||
        (hasPositionBinding(layer, "theta") && hasPositionBinding(layer, "radius")))) return clipped;
  let output = clipped;
  const conditionalProperties = {};
  for (const channel of Object.keys(layer.conditionals ?? {})) {
    if (!CONDITIONAL_APPEARANCE_CHANNELS.includes(channel) || ["size", "shape", "angle"].includes(channel)) continue;
    const sourceItems = resolveMarkSourceItems(output, id);
    const values = resolveConditionalValues(output, layer, channel, sourceItems);
    const byKey = new Map(sourceItems.map((item, index) => [item.key, values[index]]));
    const property = channel === "color" ? (["line", "rule", "tick"].includes(layer.mark.type) ? "stroke" : "fill") : channel;
    const items = resolveMarkIdentities(output, id);
    items.forEach(item => item.graphicIds.forEach(graphicId => {
      if (!byKey.has(item.key)) throw new Error(`Mark "${id}" has ambiguous conditional item identity.`);
      (conditionalProperties[graphicId] ??= {})[property] = byKey.get(item.key);
    }));
  }
  const dataset = layer.data === undefined ? undefined : requireDataset(clipped, layer.data);
  const identities = new Map();
  for (const item of resolveMarkIdentities(clipped, id)) {
    for (const [index, graphicId] of item.graphicIds.entries()) {
      identities.set(graphicId, {
        key: item.key, topology: item.topology, role: item.graphicRoles[index],
        lineage: item.lineage ?? (isScreenAnnotation(layer) ? { kind: "screen" } : { data: dataset.id, logicalDataId: dataset.logicalId, revision: dataset.revision,
          rowKeys: item.rowKeys })
      });
    }
  }
  if (identities.size !== graphic.items.length) throw new Error(`Mark "${id}" has ambiguous concrete item identity.`);
  const config = clipped.markConfigs[id];
  const outline = layer.mark.type === "bar" ? config?.barAppearance?.outline : config?.outline;
  const shadow = layer.mark.type === "bar" ? config?.barAppearance?.shadow : config?.shadow;
  return clipped.editGraphics({ target: id, property: "items", value: graphic.items.map(child => {
    const type = child.type ?? graphic.type;
    const { outline: previousOutline, blend: previousBlend, shadow: previousShadow, ...properties } = { ...child.properties, ...conditionalProperties[child.id] };
    void previousOutline;
    void previousBlend;
    void previousShadow;
    if (shadow !== undefined && shadow !== false) properties.shadow = shadow;
    if (Object.hasOwn(layer.mark, "blend")) properties.blend = layer.mark.blend;
    if (outline !== undefined && outline !== false) {
      properties.outline = outline;
      // The outline owns the rendered edge. Retain the concrete ordinary stroke
      // as well as its config so owners that reuse prior appearance can restore
      // it exactly when the outline is removed.
    }
    return { type, properties, identity: identities.get(child.id) };
  }) });
}
