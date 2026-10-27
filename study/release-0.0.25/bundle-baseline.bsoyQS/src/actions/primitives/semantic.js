import { createSemanticPrimitiveAction } from "./semanticAction.js";
import { planResourceRemoval } from "../resources/remove.js";
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

function fullSemanticValidator() {
  return createSemanticValueValidator({
    validateDatasetTransforms,
    validateParallel,
    sourceMarkTypes: ["point", "bar", "line", "rule", "rect", "arc"]
  });
}

export function validateStoredSemanticValue(program, parsed, value) {
  return fullSemanticValidator()(program, parsed, value);
}

export function registerSemanticPrimitiveAction(ProgramClass) {
  ProgramClass.prototype.editSemantic =
    createSemanticPrimitiveAction(fullSemanticValidator(), planResourceRemoval);
}
