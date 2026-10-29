import { cloneAndFreeze } from "../../core/immutable.js";
import { joinGeometryRows, normalizeGeoJoinOptions } from "../../grammar/geo/join.js";
import { geographicCoordinateKind } from "../../selectors/geometry.js";
import { dataInputReference } from "../../selectors/resources.js";

export function geoJoinRowReferences(dataset) {
  return dataset.rowKeys.map(rowKey => ({ data: dataset.id, logicalDataId: dataset.logicalId,
    revision: dataset.revision, rowKey, role: "geo-join" }));
}

export function createGeoJoinResource({ id, revision = 0, geometry, dataset, definition }) {
  const coordinateKind = geographicCoordinateKind(geometry), options = normalizeGeoJoinOptions(definition);
  const { method, ...keys } = options, joined = joinGeometryRows(geometry.result.features, dataset.values, keys);
  const { features, identity, topology } = geometry.result;
  return cloneAndFreeze({ kind: "geometry", id, revision, algorithmVersion: "1", ownership: { mode: "authored" },
    inputs: [{ kind: "geometry", id: geometry.id, revision: geometry.revision }, dataInputReference(dataset)], options,
    result: { features, identity: { ...identity, revision }, coordinateKind, ...joined, ...(topology === undefined ? {} : { topology }) },
    provenance: { origin: "observed", sourceRows: geoJoinRowReferences(dataset) } });
}
