import { validateCoordinateType } from "../../../grammar/coordinates.js";
import { validateScaleSemanticValue } from "./scale.js";
import { validateLayerSemanticValue } from "./layer.js";
import { validateDatasetSemanticValue } from "./dataset.js";
import { validateGuideSemanticValue } from "./guide.js";
import { validateNonEmptySemanticString } from "./shared.js";

export function createSemanticValueValidator({
  validateDatasetTransforms,
  validateParallel,
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
    } else if (parsed.kind === "guide") {
      validateGuideSemanticValue(program, parsed, value);
    } else if (parsed.kind === "title") {
      validateNonEmptySemanticString(value, `Chart title ${parsed.path[0]}`);
    }
  };
}
