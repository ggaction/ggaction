import { actionSource } from "../../core/action.js";
import { annotateError } from "../../core/diagnostics.js";
import { cloneAndFreeze } from "../../core/immutable.js";
import { ownArray, ownRecord } from "../../core/ownData.js";
import { validateInputReference, validateStoredResource } from "../../materialization/resourceState.js";

const prepared = new WeakMap();

export function preparedResourceResults(args, enteredProgram) {
  const binding = prepared.get(args);
  if (binding === undefined) return undefined;
  if (enteredProgram !== undefined && actionSource(enteredProgram) !== binding.program) {
    throw annotateError(new Error("Prepared resource results belong to a different receiver."), { code: "stale-result" });
  }
  return binding.replacements;
}

// Bind precomputed dependent results only to the exact resource primitive argument.
// Nested callers restore their prior binding and every exit removes authority.
export function withPreparedResourceResults(program, args, replacements, operation) {
  ownRecord(args, "Prepared resource arguments");
  ownArray(replacements, "Prepared resource replacements");
  const identities = new Set();
  for (const replacement of replacements) {
    ownRecord(replacement, "Prepared resource replacement");
    if (Object.keys(replacement).length !== 2 || !Object.hasOwn(replacement, "previous") ||
        !Object.hasOwn(replacement, "resource")) throw new TypeError("Prepared resource replacement requires previous and resource.");
    validateInputReference(replacement.previous);
    validateStoredResource(replacement.resource, program.constructor);
    const { previous, resource } = replacement;
    if (!["data-source", "layout"].includes(previous.kind) || resource.kind !== previous.kind || previous.id !== resource.id ||
        resource.revision !== previous.revision + 1 || identities.has(JSON.stringify([previous.kind, previous.id]))) {
      throw new TypeError("Prepared resource replacements require unique next revisions.");
    }
    identities.add(JSON.stringify([previous.kind, previous.id]));
  }
  const hadPrevious = prepared.has(args), previous = prepared.get(args);
  prepared.set(args, { program, replacements: cloneAndFreeze(replacements) });
  try { return operation(args); }
  finally { if (hadPrevious) prepared.set(args, previous); else prepared.delete(args); }
}
