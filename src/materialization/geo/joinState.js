import { ownArray, ownRecord } from "../../core/ownData.js";
import { canonicalJSON } from "../../core/contentDigest.js";
import { encodeValue } from "../../core/valueEncoding.js";
import { validateSourceIdentity } from "../../core/itemIdentity.js";
import { normalizeGeoJoinOptions } from "../../grammar/geo/join.js";
import { resolveInputReference } from "../../selectors/resources.js";
import { createGeoJoinResource } from "./joinResource.js";

const same = (a, b) => canonicalJSON(encodeValue(a)) === canonicalJSON(encodeValue(b));
function exact(value, keys, label) {
  ownRecord(value, label);
  if (Object.keys(value).length !== keys.length || keys.some(key => !Object.hasOwn(value, key))) throw new TypeError(`${label} requires exact stored fields.`);
}
function validateStored(resource) {
  const { method, ...definition } = resource.options;
  if (method !== "geo-join" || !same(normalizeGeoJoinOptions(definition), resource.options) ||
      !same(resource.ownership, { mode: "authored" }) || resource.provenance.origin !== "observed" ||
      resource.inputs.length !== 2 || resource.inputs[0].kind !== "geometry" || resource.inputs[1].kind !== "data") {
    throw new TypeError("Geographic join requires normalized keys and exact geometry and data inputs.");
  }
  const { result } = resource;
  exact(result, ["features", "identity", "coordinateKind", "rowMap", "diagnostics", ...(Object.hasOwn(result, "topology") ? ["topology"] : [])], "Geographic join result");
  exact(result.identity, ["logicalId", "revision", "allocationId", "keySpec", "rowKeys", "nextGeneratedKey"], "Geographic join identity");
  validateSourceIdentity({ ...result.identity, values: result.features });
  ownArray(result.rowMap, "Geographic join row map");
  if (!["geographic", "planar"].includes(result.coordinateKind) || result.identity.revision !== resource.revision ||
      result.rowMap.length !== result.features.length || result.rowMap.some(index => index !== null && (!Number.isSafeInteger(index) || index < 0))) {
    throw new TypeError("Geographic join has invalid feature identity or row correspondence.");
  }
}
function validateBindings(program, resource) {
  const { method, ...definition } = resource.options;
  const expected = createGeoJoinResource({ id: resource.id, revision: resource.revision, definition,
    geometry: resolveInputReference(program, resource.inputs[0]), dataset: resolveInputReference(program, resource.inputs[1]) });
  if (!same(resource.result, expected.result) || !same(resource.provenance, expected.provenance)) {
    throw new TypeError("Geographic join disagrees with its retained geometry and data inputs.");
  }
}
export const geoJoinResourceHandler = Object.freeze({ validateStored, validateBindings });
