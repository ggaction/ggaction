import { annotateError } from "../core/diagnostics.js";
import { isPlainObject } from "../core/immutable.js";

export function validateRendererOptions(options, allowed, label) {
  if (!isPlainObject(options)) {
    throw annotateError(new TypeError(`${label} must be a plain object.`), { code: "invalid-option" });
  }
  for (const key of Object.keys(options)) {
    if (!allowed.has(key)) {
      throw annotateError(new TypeError(`${label} does not support option "${key}".`), { code: "invalid-option", optionPath: key });
    }
  }
}
