import { annotateError } from "./diagnostics.js";
export const USER_ID_SOURCE = "[A-Za-z0-9_-]+";

const USER_ID_PATTERN = new RegExp(`^${USER_ID_SOURCE}$`);

export function validateUserId(id, label = "ID") {
  if (typeof id !== "string" || !USER_ID_PATTERN.test(id)) {
    throw annotateError(new TypeError(
      `${label} must contain only letters, numbers, _ or - and must not be empty.`
    ), { code: "invalid-value", optionPath: label });
  }

  return id;
}

export function resolveOptionalUserId(id, {
  defaultId,
  label = "ID",
  operation,
  ambiguous = false
}) {
  if (id !== undefined) return validateUserId(id, label);
  if (ambiguous) {
    throw annotateError(new Error(
      `${operation} requires an explicit ${label.toLowerCase()} because its default is ambiguous.`
    ), { code: "ambiguous-resource", operation, optionPath: label });
  }
  return validateUserId(defaultId, label);
}
