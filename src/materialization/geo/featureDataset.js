import { geoMarkSource } from "./source.js";
import { validateGeoEncodingChannel } from "../../grammar/geo/encoding.js";
import { inferDatasetSchema } from "../../grammar/datasetSchema.js";
import { requireLayer } from "../../selectors/layers.js";

// A read-only transient feature view shares native field and expression readers.
// Geometry keeps its own identity; no dataset or source rows are synthesized.
export function geoFeatureDataset(program, layer) {
  validateGeoEncodingChannel(layer, "color");
  // Legend adapters expose a transient chosen ordinary binding. Read geometry
  // from the authoritative layer instead of validating that inspection view.
  const source = geoMarkSource(program, requireLayer(program, layer.id), program.materializationConfigs.marks[layer.id].geo);
  const features = source.drawableFeatures;
  const values = features.map(feature => feature.fields);
  return { values, features, schema: inferDatasetSchema(values) };
}
