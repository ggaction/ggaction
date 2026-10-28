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
  const dataset = requireDataset(clipped, layer.data);
  const identities = new Map();
  for (const item of resolveMarkIdentities(clipped, id)) {
    for (const [index, graphicId] of item.graphicIds.entries()) {
      identities.set(graphicId, {
        key: item.key, topology: item.topology, role: item.graphicRoles[index],
        lineage: { data: dataset.id, logicalDataId: dataset.logicalId, revision: dataset.revision,
          rowKeys: item.rowKeys }
      });
    }
  }
  if (identities.size !== graphic.items.length) throw new Error(`Mark "${id}" has ambiguous concrete item identity.`);
  return clipped.editGraphics({ target: id, property: "items", value: graphic.items.map(child => ({
    type: child.type ?? graphic.type, properties: { ...child.properties, ...conditionalProperties[child.id] }, identity: identities.get(child.id)
  })) });
}
