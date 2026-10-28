import { annotateError } from "./diagnostics.js";
import { validateUserId } from "./identifiers.js";
import { ownRecord } from "./ownData.js";

export const BUILTIN_RESOURCE_KINDS = Object.freeze(["hierarchy", "layout", "image", "font", "graph"]);
export const STORED_RESOURCE_KINDS = Object.freeze(["persistent-selection", "parameter", "data-source", ...BUILTIN_RESOURCE_KINDS]);
const invalid = message => annotateError(new Error(message), { code: "invalid-value" });

export function validateResourceRevision(value) {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw invalid("Resource revision requires a non-negative safe integer.");
  }
}

export function validateInputReference(ref) {
  ownRecord(ref, "Input reference");
  const keys = ref.kind === "data" ? ["kind", "id", "logicalId", "revision"] : ["kind", "id", "revision"];
  if (Object.keys(ref).length !== keys.length || keys.some(key => !Object.hasOwn(ref, key))) {
    throw invalid("Input reference requires its exact stored fields.");
  }
  if (ref.kind !== "data" && !STORED_RESOURCE_KINDS.includes(ref.kind)) {
    throw annotateError(new Error("Unsupported resource kind."), { code: "unsupported-format" });
  }
  validateUserId(ref.id, "Input resource id");
  validateResourceRevision(ref.revision);
  if (ref.kind === "data" && (typeof ref.logicalId !== "string" || !ref.logicalId)) {
    throw invalid("Data input requires logical identity.");
  }
  return ref;
}
