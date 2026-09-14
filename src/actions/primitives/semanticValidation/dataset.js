import { validateUserId } from "../../../core/identifiers.js";
import { validateDataRows } from "../../../core/validation.js";
import { hasDataset } from "../../../selectors/datasets.js";

export function validateDatasetSemanticValue(
  program,
  parsed,
  value,
  validateTransforms
) {
  const property = parsed.path[0];
  if (property === "values") {
    validateDataRows(value, `Dataset "${parsed.id}"`);
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
