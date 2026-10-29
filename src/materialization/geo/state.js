import { ownRecord } from "../../core/ownData.js";
import { canonicalJSON } from "../../core/contentDigest.js";
import { encodeValue } from "../../core/valueEncoding.js";
import { encodeRowKey, validateSourceIdentity } from "../../core/itemIdentity.js";
import { normalizeGeometryOptions, geometryFeatureKeys } from "../../grammar/geo/options.js";
import { normalizeGeometryData } from "../../grammar/geo/normalize.js";

const same = (a, b) => canonicalJSON(encodeValue(a)) === canonicalJSON(encodeValue(b));
function exact(value, keys, label) {
  ownRecord(value, label);
  if (Object.keys(value).length !== keys.length || keys.some(key => !Object.hasOwn(value, key))) throw new TypeError(`${label} requires exact stored fields.`);
}
function validateStored(resource) {
  const { method, ...authored } = resource.options;
  if (method !== "geo" || !same(normalizeGeometryOptions(authored), resource.options) ||
      !same(resource.ownership, { mode: "authored" }) || !same(resource.inputs, []) ||
      !same(resource.provenance, { origin: "authored", sourceRows: [] })) throw new TypeError("Geometry source ownership or options are inconsistent.");
  const { result } = resource;
  exact(result, ["features", "identity", "source", "diagnostics", ...(resource.options.format === "topojson" ? ["topology"] : [])], "Stored geometry result");
  const { featureKey, ...normalization } = authored;
  const expected = normalizeGeometryData(result.source.values, normalization);
  for (const key of ["features", "source", "diagnostics", ...(expected.topology === undefined ? [] : ["topology"])]) {
    if (!same(result[key], expected[key])) throw new TypeError("Stored geometry disagrees with its retained source.");
  }
  exact(result.identity, ["logicalId", "revision", "allocationId", "keySpec", "rowKeys", "nextGeneratedKey"], "Stored geometry identity");
  validateSourceIdentity({ ...result.identity, values: result.features });
  if (result.identity.revision !== resource.revision) throw new TypeError("Stored geometry identity revision is stale.");
  const keys = geometryFeatureKeys(result.features, featureKey);
  if (result.identity.keySpec.mode !== (keys === undefined ? "generated" : "explicit") ||
      keys !== undefined && !same(keys.map(key => encodeRowKey(key)), result.identity.rowKeys)) throw new TypeError("Stored geometry keys disagree with featureKey.");
}
function validateBindings() {}
export const geographicResourceHandler = Object.freeze({ validateStored, validateBindings });
