import { cloneAndFreeze } from "../../../core/immutable.js";
import { geoFeatureKey, geoMarkSource } from "../../geo/source.js";
import { concreteProperties } from "../items/common.js";
import { normalizeAreaHighlightStyle } from "../styles.js";
import { transformPathHighlightProperties } from "../path.js";

function items(program, layer, concrete) {
  const config = program.markConfigs[layer.id].geo;
  const { features, resource, projection } = geoMarkSource(program, layer, config);
  const graphics = program.graphicSpec.objects[layer.id]?.items;
  if (concrete && !Array.isArray(graphics)) throw new Error("Geographic selection requires materialized geometry.");
  const byKey = new Map();
  for (const child of graphics ?? []) {
    if (!child.identity) throw new Error("Geographic selection has stale feature identity.");
    const list = byKey.get(child.identity.key) ?? [];
    list.push(child); byKey.set(child.identity.key, list);
  }
  return features.flatMap(feature => {
    const key = geoFeatureKey(layer, resource, feature), children = byKey.get(key) ?? [];
    if (concrete && !children.length) return [];
    return [cloneAndFreeze({ key, layer: layer.id, markType: "geo", role: "feature", topology: children[0]?.identity.topology ?? "",
      channels: {}, rows: [], fields: feature.properties ?? {}, members: [], rowKeys: [], graphicRoles: children.map(child => child.identity.role),
      lineage: { kind: "resource", resource: layer.geoBinding.geometry ?? { kind: "projection", id: projection.id, revision: projection.revision } },
      properties: concrete ? concreteProperties(children[0].properties) : config,
      ...(concrete ? { graphicIds: children.map(child => child.id) } : {}) })];
  });
}
export const geoSelectionPolicy = Object.freeze({ resourceBacked: true, supportedGrains: Object.freeze(["item"]),
  resolveItems: (program, layer) => items(program, layer, true), resolveSourceItems: (program, layer) => items(program, layer, false),
  normalizeHighlightStyle: args => normalizeAreaHighlightStyle(args, "Geographic mark"), applyHighlightOp: "applyPathHighlight", rematerializeOp: "materializeGeoMark",
  transformHighlightChild(child, style) {
    const { fill, ...rest } = style;
    const mapped = child.type === "path" && child.properties.fill === "none" ? { ...rest, ...(style.stroke === undefined && fill !== undefined ? { stroke: fill } : {}) } : style;
    return { ...child, properties: transformPathHighlightProperties(child.properties, mapped) };
  }
});
