import { createSemanticPrimitiveAction } from "./semanticAction.js";
import { validateDatasetTransforms } from "../../grammar/transforms.js";
import {
  validateParallelDimensions,
  validateParallelKeyField,
  validateParallelMissingPolicy
} from "../../grammar/parallelCoordinates.js";
import { createSemanticValueValidator } from "./semanticValidation/index.js";

function validateParallel(property, value) {
  if (property === "encoding.parallel.dimensions") {
    validateParallelDimensions(value, { normalized: true });
  } else if (property === "encoding.parallel.key") {
    validateParallelKeyField(value);
  } else if (property === "encoding.parallel.missing") {
    validateParallelMissingPolicy(value);
  }
}

export function registerSemanticPrimitiveAction(ProgramClass) {
  const validateSemanticValue = createSemanticValueValidator({
    validateDatasetTransforms,
    validateParallel,
    sourceMarkTypes: ["point", "bar", "rule", "rect", "arc"]
  });
  ProgramClass.prototype.editSemantic =
    createSemanticPrimitiveAction(validateSemanticValue);
}
