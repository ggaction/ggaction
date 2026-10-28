import { ownArray, ownRecord } from "../core/ownData.js";
import { validateUserId } from "../core/identifiers.js";
import { record } from "./expressionValues.js";

// Dependencies are collected in first-occurrence order from every AST branch.
export function validateExpressionParameterInputs(inputs, dependencies, label = "Expression") {
  ownArray(inputs, `${label} parameter inputs`);
  if (inputs.length !== dependencies.length) throw new TypeError(`${label} parameter inputs do not match expression dependencies.`);
  inputs.forEach((input, index) => {
    ownRecord(input, `${label} parameter input`);
    record(input, ["kind", "id", "revision"], [], `${label} parameter input`);
    validateUserId(input.id, `${label} parameter input id`);
    if (input.kind !== "parameter" || input.id !== dependencies[index] ||
        !Number.isSafeInteger(input.revision) || input.revision < 0) {
      throw new TypeError(`${label} parameter inputs must be ordered exact parameter references.`);
    }
  });
  return inputs;
}
