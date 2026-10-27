import { isPlainObject } from "./immutable.js";
import { annotateError } from "./diagnostics.js";

export function validateRowReference(ref) {
  if (!isPlainObject(ref) || Object.keys(ref).length !== 5 ||
      !["data", "logicalDataId", "rowKey", "role"].every(key => typeof ref[key] === "string" && ref[key]) ||
      !Number.isSafeInteger(ref.revision) || ref.revision < 0) {
    throw annotateError(new TypeError("Lineage requires exact immutable input row references."), { code: "ambiguous-identity" });
  }
  return ref;
}
