import { findCoordinate } from "../../../selectors/coordinates.js";
import {
  normalizeCoordinateAspect,
  validateCoordinateType
} from "../../../grammar/coordinates.js";
import { normalizePolarFrameOptions } from "../../../grammar/polar.js";
import { validateScaleSemanticValue } from "./scale.js";
import { validateDatasetSemanticValue } from "./dataset.js";
import { validateLayerSemanticValue } from "./layer.js";
import { validateGuideSemanticValue } from "./guide.js";
import { validateNonEmptySemanticString } from "./shared.js";

export function createSemanticValueValidator({
  validateDatasetTransforms,
  validateParallel,
  validateGeoCoordinate,
  sourceMarkTypes
}) {
  return function validateSemanticValue(program, parsed, value) {
    if (parsed.kind === "dataset") {
      validateDatasetSemanticValue(
        program,
        parsed,
        value,
        validateDatasetTransforms
      );
    } else if (parsed.kind === "layer") {
      validateLayerSemanticValue(program, parsed, value, {
        sourceMarkTypes,
        validateParallel
      });
    } else if (parsed.kind === "scale") {
      validateScaleSemanticValue(program, parsed, value);
    } else if (parsed.kind === "coordinate" && parsed.path[0] === "type") {
      validateCoordinateType(value);
      if (value === "geo") {
        if (validateGeoCoordinate === undefined) throw new TypeError("Geo coordinates require the full ChartProgram.");
        validateGeoCoordinate(program, parsed, value);
      } else if (findCoordinate(program, parsed.id)?.projection !== undefined) {
        throw new TypeError("Native coordinates cannot retain a projection binding.");
      }
    } else if (parsed.kind === "coordinate" && parsed.path[0] === "aspect") {
      if (findCoordinate(program, parsed.id)?.type === "geo") throw new TypeError("Geo coordinates cannot use aspect constraints.");
      normalizeCoordinateAspect(value);
    } else if (parsed.kind === "coordinate" && parsed.path[0] === "polarFrame") {
      if (findCoordinate(program, parsed.id)?.type === "geo") throw new TypeError("Geo coordinates cannot use Polar frames.");
      normalizePolarFrameOptions(value);
    } else if (parsed.kind === "coordinate" && parsed.path[0] === "projection") {
      if (validateGeoCoordinate === undefined) throw new TypeError("Geo coordinates require the full ChartProgram.");
      validateGeoCoordinate(program, parsed, value);
    } else if (parsed.kind === "guide") {
      validateGuideSemanticValue(program, parsed, value);
    } else if (parsed.kind === "title") {
      validateNonEmptySemanticString(value, `Chart title ${parsed.path[0]}`);
    }
  };
}
