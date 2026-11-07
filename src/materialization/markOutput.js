import { resolveMarkEffectProperties } from "./markEffects.js";
import { isScreenAnnotation } from "../grammar/screenAnnotation.js";
import { CONDITIONAL_APPEARANCE_CHANNELS } from "../grammar/conditionalState.js";
import { hasPositionBinding } from "../core/encodingBindings.js";
import { resolveConditionalValues } from "./conditionalValues.js";
import { requireDataset } from "../selectors/datasets.js";
import { materializeMarkClip } from "./markClip.js";
import { resolveMarkIdentities, resolveMarkIdentitiesStages, resolveMarkSourceItems } from "./selection/policies/index.js";
import { findLayer } from "../selectors/layers.js";
import { invokeActionStages } from "../core/action.js";
import { ownWhenMembersOwned } from "../core/immutable.js";
import { drainStages, mapStages, STAGE_ROWS } from "../core/stages.js";

// Explicitly called by the owning mark materializer after geometry is complete.
// The primitive transition owns the trace and the immutable concrete replacement.
export function materializeMarkOutput(program, id) {
  return drainStages(materializeMarkOutputStages(program, id));
}

export function* materializeMarkOutputStages(program, id) {
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
  let rows = 0;
  for (const item of yield* resolveMarkIdentitiesStages(clipped, id)) {
    if (++rows % STAGE_ROWS === 0) yield;
    for (const [index, graphicId] of item.graphicIds.entries()) {
      identities.set(graphicId, ownWhenMembersOwned({
        key: item.key, topology: item.topology, role: item.graphicRoles[index],
        lineage: item.lineage ?? ownWhenMembersOwned(isScreenAnnotation(layer) ? { kind: "screen" } : { data: dataset.id, logicalDataId: dataset.logicalId, revision: dataset.revision,
          rowKeys: item.rowKeys })
      }));
    }
  }
  if (identities.size !== graphic.items.length) throw new Error(`Mark "${id}" has ambiguous concrete item identity.`);
  const config = clipped.markConfigs[id];
  return yield* invokeActionStages(clipped, clipped.editGraphics, { target: id, property: "items", value: yield* mapStages(graphic.items, child => {
    const type = child.type ?? graphic.type;
    const properties = ownWhenMembersOwned(resolveMarkEffectProperties(layer, config, { ...child.properties, ...conditionalProperties[child.id] }));
    return { type, properties, identity: identities.get(child.id) };
  }) });
}
