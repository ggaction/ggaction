import { createSourceIdentity, validateSourceIdentity } from "../../core/itemIdentity.js";
import { annotateError } from "../../core/diagnostics.js";

// Preparation is scoped to an exact argument object, not to a current dataset
// or process-global identity. Nested actions and speculative branches cannot
// consume one another's allocation.
const prepared = new WeakMap();

export function preparedDatasetIdentity(args) { return prepared.get(args); }

export function withPreparedDatasetIdentity(args, identity, operation) {
  prepared.set(args, identity);
  try { return operation(args); } finally { prepared.delete(args); }
}

export function newDatasetNamespace() {
  if (typeof globalThis.crypto?.randomUUID !== "function") {
    throw annotateError(new Error("Dataset identity requires crypto.randomUUID."), { code: "unsupported-format" });
  }
  return globalThis.crypto.randomUUID();
}

export function sourceIdentityFor(args, values, options = {}) {
  const identity = prepared.get(args) ?? createSourceIdentity(values, options, {
    logicalId: newDatasetNamespace(), allocationId: newDatasetNamespace()
  });
  validateSourceIdentity({ values, ...identity });
  return identity;
}

export function writeSourceValues(program, id, values, identity) {
  return withPreparedDatasetIdentity({ property: `dataset[${id}].values`, value: values }, identity,
    args => program.editSemantic(args));
}
