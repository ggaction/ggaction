import { resolveInputReference } from "../../selectors/resources.js";
import { validateWorkLimit } from "../../core/validation.js";
import { geometryFeatureKeys } from "../../grammar/geo/options.js";

export function geographicFeatureKeys(resource, input) {
  const seen = new Set(); let source = resource;
  while (source.options.method === "geo-join") {
    if (seen.has(source.id)) throw new TypeError("Geographic levels cannot contain cyclic joins.");
    seen.add(source.id); validateWorkLimit(seen.size, "Geographic level source work");
    source = input(source.inputs[0]);
  }
  if (source.options.method !== "geo" || source.options.featureKey === undefined) throw new TypeError("Geographic levels require source featureKey and cannot contain nested levels.");
  return geometryFeatureKeys(resource.result.features, source.options.featureKey);
}

// One metadata path for source geometry, joins and current detail representations.
// The resource DAG has already been validated; an explicit stack also supports
// long join chains without relying on the JavaScript call stack.
export function geographicFeatures(program, resource) {
  const chain = []; let source = resource;
  while (source.options.method !== "geo") {
    chain.push(source);
    const index = source.options.method === "geo-lod"
      ? source.options.levels.findIndex(level => level.id === source.options.activeLevel) : 0;
    source = resolveInputReference(program, source.inputs[index]);
  }
  let features = source.result.features.map((feature, index) => ({ ...feature,
    key: source.result.identity.rowKeys[index], fields: feature.properties ?? {}, rows: [] }));
  for (const current of chain.reverse()) {
    let aliases;
    if (current.options.method === "geo-lod") {
      aliases = new Map(current.result.identity.rowKeys.map(key => [key, []]));
      for (const level of current.result.mapping) for (const region of level.regions) {
        for (const key of region.representations) aliases.get(key).push(region.key);
      }
    }
    const dataset = current.options.method === "geo-join" ? resolveInputReference(program, current.inputs[1]) : undefined;
    features = current.result.features.map((feature, index) => {
      const key = current.result.identity.rowKeys[index], row = current.result.rowMap?.[index];
      return { ...features[index], ...feature, key,
        ...(aliases === undefined ? {} : { representationKeys: aliases.get(key) }),
        ...(dataset === undefined ? {} : { fields: row === null ? {} : dataset.values[row],
          rows: row === null ? [] : [{ ...current.provenance.sourceRows[row], index: row }] }) };
    });
  }
  return features;
}
