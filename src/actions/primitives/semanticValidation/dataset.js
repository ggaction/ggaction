import { validateUserId } from "../../../core/identifiers.js";
import { validateDataRows } from "../../../core/validation.js";
import { findDataset, hasDataset } from "../../../selectors/datasets.js";
import {
  validateDatasetSchema,
  validateRowsAgainstSchema
} from "../../../grammar/datasetSchema.js";

export function validateDatasetSemanticValue(
  program,
  parsed,
  value,
  validateTransforms
) {
  const property = parsed.path[0];
  if (property === "values") {
    validateDataRows(value, `Dataset "${parsed.id}"`);
    const schema = findDataset(program, parsed.id)?.schema;
    if (schema !== undefined && schema.origin !== "derived") {
      validateRowsAgainstSchema(value, schema, `Dataset "${parsed.id}"`);
    }
    return;
  }
  if (property === "schema") {
    validateDatasetSchema(value);
    return;
  }
  if (property === "source") {
    validateUserId(value, "Dataset source id");
    if (!hasDataset(program, value)) {
      throw new Error(`Unknown source dataset "${value}".`);
    }
    return;
  }
  if (property === "transform") validateTransforms(value);
}
