import { cloneAndFreeze } from "../../core/immutable.js";
import { requireLayer } from "../../selectors/layers.js";
import { geoLabelSource, identifyGeoLabelItems } from "../geo/labels.js";
import { geoFeatureKey, geoMarkSource } from "../geo/source.js";
import { geoAppearanceValues, geoFeatureAppearance } from "../geo/appearance.js";
import { resolveMarkItems, resolveMarkSourceItems } from "../selection/policies/index.js";
import { resolvePreparedSourceTextEntries } from "../textGeometry.js";

// This is transient preparation, not a second Text schema. Geometry remains
// in the source group's native features; each entry retains its exact source
// key, rows and resource lineage and is placed at an explicit origin.
export function projectGeoLabelEntries(program, layer) {
  if (requireLayer(program, layer.id) !== layer) throw new TypeError("Geographic labels require their exact native layer.");
  const source = geoLabelSource(program, layer);
  if (source === undefined) throw new TypeError("Geographic labels require a native geographic source.");
  if (layer.encoding?.text === undefined && layer.conditionals?.text === undefined) return Object.freeze([]);
  const config = program.materializationConfigs.marks[source.id].geo;
  const resolved = geoMarkSource(program, source, config);
  const mapped = geoAppearanceValues(program, source, resolved.features);
  const styles = new Map(resolved.features.map((feature, index) => [geoFeatureKey(source, resolved.resource, feature),
    geoFeatureAppearance(config, source.geoBinding, mapped, index).style]));
  const anchors = new Map(resolved.drawableFeatures.map(feature => [geoFeatureKey(source, resolved.resource, feature), { x: 0, y: 0 }]));
  const sourceItems = (receiver, target, grain, options) => {
    const items = resolveMarkSourceItems(receiver, target, grain, options);
    return receiver === program && target === source.id
      ? items.map(item => ({ ...item, properties: styles.get(item.key), graphicIds: [] })) : items;
  };
  const entries = resolvePreparedSourceTextEntries(program, layer, program.markConfigs[layer.id], anchors, {
    resolveMarkItems: (receiver, target, grain, options) => receiver === program && target === source.id
      ? sourceItems(receiver, target, grain, options) : resolveMarkItems(receiver, target, grain, options),
    resolveMarkSourceItems: sourceItems
  });
  return cloneAndFreeze(identifyGeoLabelItems(layer, entries));
}
