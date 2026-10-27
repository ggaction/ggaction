import { requireDataset } from "../selectors/datasets.js";
import { materializeMarkClip } from "./markClip.js";
import { resolveMarkItems } from "./selection/policies/index.js";
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
      !((layer.encoding?.x?.scale && layer.encoding?.y?.scale) ||
        (layer.encoding?.theta?.scale && layer.encoding?.radius?.scale))) return clipped;
  const dataset = requireDataset(clipped, layer.data);
  const identities = new Map();
  for (const item of resolveMarkItems(clipped, id)) {
    for (const [index, graphicId] of item.graphicIds.entries()) {
      identities.set(graphicId, {
        key: item.key, topology: item.topology, role: item.graphicRoles[index],
        lineage: { data: dataset.id, logicalDataId: dataset.logicalId, revision: dataset.revision,
          rowKeys: item.rows.filter(ref => ref.data === layer.data).map(ref => ref.rowKey) }
      });
    }
  }
  if (identities.size !== graphic.items.length) throw new Error(`Mark "${id}" has ambiguous concrete item identity.`);
  return clipped.editGraphics({ target: id, property: "items", value: graphic.items.map(child => ({
    type: child.type ?? graphic.type, properties: child.properties, identity: identities.get(child.id)
  })) });
}
