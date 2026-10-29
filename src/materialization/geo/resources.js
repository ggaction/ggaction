import { cloneAndFreeze } from "../../core/immutable.js";
import { createSourceIdentity, reviseSourceIdentity } from "../../core/itemIdentity.js";
import { normalizeGeometryData } from "../../grammar/geo/normalize.js";
import { geometryFeatureKeys, normalizeGeometryOptions } from "../../grammar/geo/options.js";

export function createGeometryResource({ id, options, values, logicalId, allocationId, previous, replaceValues = true }) {
  const { method, featureKey, polygonWinding, ...normalization } = options;
  const model = normalizeGeometryData(values, normalization), keys = geometryFeatureKeys(model.features, featureKey);
  const identityOptions = keys === undefined ? {} : { keys };
  const identity = previous === undefined ? createSourceIdentity(model.features, identityOptions, { logicalId, allocationId })
    : reviseSourceIdentity(previous.result.identity, model.features, keys === undefined && !replaceValues
      ? { rowMap: model.features.map((_, i) => i) } : identityOptions, allocationId);
  return cloneAndFreeze({ kind: "geometry", id, revision: previous === undefined ? 0 : previous.revision + 1,
    algorithmVersion: "1", ownership: { mode: "authored" }, inputs: [], options: model.topology === undefined ? options : normalizeGeometryOptions({ ...normalization, ...(polygonWinding === undefined ? {} : { polygonWinding }),
      ...(featureKey === undefined ? {} : { featureKey }), topoObject: model.topology.object }),
    result: { features: model.features, identity, source: model.source,
      ...(model.topology === undefined ? {} : { topology: model.topology }), diagnostics: model.diagnostics },
    provenance: { origin: "authored", sourceRows: [] } });
}
