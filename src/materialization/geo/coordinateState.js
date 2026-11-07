import { geoLabelSource } from "./labels.js";
import { validateInputReference } from "../../core/resourceReference.js";
import { requireStoredResource } from "../../selectors/resources.js";
import { findCoordinate } from "../../selectors/coordinates.js";
import { findLayerMatching } from "../../selectors/layers.js";

export function validateGeoCoordinateValue(program, parsed, value) {
  const coordinate = findCoordinate(program, parsed.id);
  if (parsed.path[0] === "type") {
    if (coordinate !== undefined && Object.keys(coordinate).some(key => !["id", "type", "projection"].includes(key))) {
      throw new TypeError("Geo coordinates cannot retain native coordinate constraints.");
    }
  } else {
    if (coordinate?.type !== "geo") throw new TypeError("Projection references require a Geo coordinate.");
    validateInputReference(value);
    if (value.kind !== "projection") throw new TypeError("Geo coordinates require projection references.");
    requireStoredResource(program, value);
  }
  if (findLayerMatching(program, layer => layer.coordinate === parsed.id && layer.mark?.type !== "geo" && geoLabelSource(program, layer) === undefined) !== undefined) {
    throw new TypeError("Geo coordinates require geographic marks.");
  }
}
