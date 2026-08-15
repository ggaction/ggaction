import { createSemanticValueValidator } from "./semanticValidation/index.js";
import { isPlainObject } from "../../core/immutable.js";
import { validateBin2DTransform } from "../../grammar/bin2d.js";
import { registerSemanticPrimitiveAction } from "./semantic.js";
import { registerEditGraphicsAction } from "./editGraphics.js";
import { registerCreateGraphicsAction } from "./createGraphics.js";
import { createSemanticPrimitiveAction } from "./semanticAction.js";

function validateBasicDatasetTransforms(value) {
  if (!Array.isArray(value) || value.length !== 1 || !isPlainObject(value[0])) {
    throw new TypeError(
      "Dataset transform must contain exactly one plain object."
    );
  }
  if (value[0].type !== "bin2d") {
    throw new Error(`Unsupported dataset transform "${value[0].type}".`);
  }
  validateBin2DTransform(value[0]);
}

export function registerBasicPrimitiveActions(ProgramClass) {
  const validateBasicSemanticValue = createSemanticValueValidator({
    validateDatasetTransforms: validateBasicDatasetTransforms,
    sourceMarkTypes: ["point", "bar", "rect"]
  });
  ProgramClass.prototype.editSemantic =
    createSemanticPrimitiveAction(validateBasicSemanticValue);
  registerCreateGraphicsAction(ProgramClass);
  registerEditGraphicsAction(ProgramClass);
}

export function registerPrimitiveActions(ProgramClass) {
  registerSemanticPrimitiveAction(ProgramClass);
  registerCreateGraphicsAction(ProgramClass);
  registerEditGraphicsAction(ProgramClass);
}
