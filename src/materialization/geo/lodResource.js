import { cloneAndFreeze } from "../../core/immutable.js";
import { createSourceIdentity, encodeRowKey } from "../../core/itemIdentity.js";
import { geographicFeatureKeys } from "./features.js";
import { geographicCoordinateKind } from "../../selectors/geometry.js";
import { resolveInputReference } from "../../selectors/resources.js";
import { normalizeGeoLODOptions } from "../../grammar/geo/lodOptions.js";
import { resolveGeoLevels } from "../../grammar/geo/levels.js";
import { simplifySharedTopology } from "../../grammar/geo/simplify.js";


export function createGeoLODResource({ program, id, revision = 0, definition, geometries, logicalId, allocationId,
  input = ref => resolveInputReference(program, ref) }) {
  const normalized = normalizeGeoLODOptions(definition);
  if (geometries.length !== normalized.levels.length) throw new TypeError("Geographic levels require one geometry input per level.");
  const coordinateKind = geographicCoordinateKind(geometries[0]);
  const levels = normalized.levels.map((level, index) => {
    const geometry = geometries[index];
    if (geographicCoordinateKind(geometry) !== coordinateKind) throw new TypeError("Geographic levels require one coordinateKind.");
    if (level.tolerance > 0 && geometry.result.topology === undefined) throw new TypeError("Positive geographic tolerance requires shared topology.");
    const { input: role, tolerance, ...mapping } = level;
    return { ...mapping, keys: geographicFeatureKeys(geometry, input) };
  });
  const resolved = resolveGeoLevels(levels, { zoom: normalized.zoom,
    ...(normalized.activeLevel === undefined ? {} : { previousLevel: normalized.activeLevel }) });
  const options = { ...normalized, activeLevel: resolved.level }, geometry = geometries[resolved.levelIndex];
  const tolerance = options.levels[resolved.levelIndex].tolerance;
  const simplified = tolerance > 0 ? simplifySharedTopology(geometry.result.topology, { coordinateKind, tolerance }) : undefined;
  const features = simplified === undefined ? geometry.result.features : geometry.result.features.map((feature, index) => ({ ...feature, ...simplified.geometries[index] }));
  const sourceKeys = resolved.mapping[resolved.levelIndex].regions.map(region => region.key);
  const identity = { ...createSourceIdentity(features, { keys: sourceKeys.map(key => [resolved.level, key]) }, { logicalId, allocationId }), revision };
  const mapping = resolved.mapping.map(level => ({ level: level.level, regions: level.regions.map(region => ({
    key: encodeRowKey([level.level, region.key]), representations: region.representations.map(key => encodeRowKey([resolved.level, key]))
  })) }));
  const topology = simplified?.topology ?? geometry.result.topology;
  return cloneAndFreeze({ kind: "geometry", id, revision, algorithmVersion: "1", ownership: { mode: "authored" },
    inputs: geometries.map(source => ({ kind: "geometry", id: source.id, revision: source.revision })), options,
    result: { features, identity, coordinateKind, mapping, ...(topology === undefined ? {} : { topology }),
      diagnostics: { levelCount: resolved.diagnostics.levelCount, featureCount: resolved.diagnostics.featureCount, simplification: simplified?.diagnostics ?? null } },
    provenance: { origin: "observed", sourceRows: [] } });
}
