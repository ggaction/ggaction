import { isPlainObject } from "../core/immutable.js";

export function validateRendererOptions(options, allowed, label) {
  if (!isPlainObject(options)) {
    throw new TypeError(`${label} must be a plain object.`);
  }
  for (const key of Object.keys(options)) {
    if (!allowed.has(key)) {
      throw new TypeError(`${label} does not support option "${key}".`);
    }
  }
}
