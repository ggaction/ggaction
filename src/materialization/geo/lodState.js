import { ownRecord } from "../../core/ownData.js";
import { canonicalJSON } from "../../core/contentDigest.js";
import { encodeValue } from "../../core/valueEncoding.js";
import { validateSourceIdentity } from "../../core/itemIdentity.js";
import { normalizeGeoLODOptions } from "../../grammar/geo/lodOptions.js";
import { resolveInputReference } from "../../selectors/resources.js";
import { createGeoLODResource } from "./lodResource.js";

const same = (a, b) => canonicalJSON(encodeValue(a)) === canonicalJSON(encodeValue(b));
function exact(value, keys, label) {
  ownRecord(value, label);
  if (Object.keys(value).length !== keys.length || keys.some(key => !Object.hasOwn(value, key))) throw new TypeError(`${label} requires exact stored fields.`);
}
function validateStored(resource) {
  const { method, ...definition } = resource.options;
  if (method !== "geo-lod" || !same(normalizeGeoLODOptions(definition), resource.options) || typeof definition.activeLevel !== "string" ||
      !same(resource.ownership, { mode: "authored" }) || !same(resource.provenance, { origin: "observed", sourceRows: [] }) ||
      resource.inputs.length !== definition.levels.length || resource.inputs.some(ref => ref.kind !== "geometry")) throw new TypeError("Geographic levels require normalized options and exact geometry inputs.");
  const { result } = resource;
  exact(result, ["features", "identity", "coordinateKind", "mapping", "diagnostics", ...(Object.hasOwn(result, "topology") ? ["topology"] : [])], "Geographic level result");
  exact(result.identity, ["logicalId", "revision", "allocationId", "keySpec", "rowKeys", "nextGeneratedKey"], "Geographic level identity");
  validateSourceIdentity({ ...result.identity, values: result.features });
  if (result.identity.revision !== resource.revision || result.identity.keySpec.mode !== "explicit") throw new TypeError("Geographic levels require current explicit identity.");
}
function validateBindings(program, resource) {
  const { method, ...definition } = resource.options;
  const expected = createGeoLODResource({ program, id: resource.id, revision: resource.revision, definition,
    geometries: resource.inputs.map(ref => resolveInputReference(program, ref)),
    logicalId: resource.result.identity.logicalId, allocationId: resource.result.identity.allocationId });
  if (!same(resource.options, expected.options) || !same(resource.result, expected.result)) throw new TypeError("Geographic levels disagree with retained source inputs or hysteresis state.");
}
export const geoLODResourceHandler = Object.freeze({ validateStored, validateBindings });
