import { validateNonEmptyString, validateOptionObject } from "../core/validation.js";

export function validateParallelAxisTitles(value) {
  if (!Array.isArray(value) || value.length === 0) {
    throw new TypeError("Parallel axis titles must be a non-empty field/text array.");
  }
  const fields = new Set();
  for (const title of value) {
    validateOptionObject(title, ["field", "text"], "Parallel axis title");
    validateNonEmptyString(title.field, "Parallel axis title field");
    validateNonEmptyString(title.text, "Parallel axis title text");
    if (fields.has(title.field)) throw new Error("Parallel axis titles require unique fields.");
    fields.add(title.field);
  }
  return value;
}
