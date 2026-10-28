import { cloneAndFreeze } from "../../core/immutable.js";
import { ownArray, ownRecord } from "../../core/ownData.js";
import { validateInputReference, validateStoredResource } from "../../materialization/resourceState.js";

const prepared = new WeakMap();

export function preparedSourceResources(args) { return prepared.get(args); }

// Bind final source outputs only to the exact parameter primitive argument.
// Nested callers restore their prior binding and every exit removes authority.
export function withPreparedSourceResources(args, replacements, operation) {
  ownRecord(args, "Prepared resource arguments");
  ownArray(replacements, "Prepared source replacements");
  const identities = new Set();
  for (const replacement of replacements) {
    ownRecord(replacement, "Prepared source replacement");
    if (Object.keys(replacement).length !== 2 || !Object.hasOwn(replacement, "previous") ||
        !Object.hasOwn(replacement, "resource")) throw new TypeError("Prepared source replacement requires previous and resource.");
    validateInputReference(replacement.previous);
    validateStoredResource(replacement.resource);
    const { previous, resource } = replacement;
    if (previous.kind !== "data-source" || resource.kind !== "data-source" || previous.id !== resource.id ||
        resource.revision !== previous.revision + 1 || identities.has(previous.id)) {
      throw new TypeError("Prepared source replacements require unique next revisions.");
    }
    identities.add(previous.id);
  }
  const hadPrevious = prepared.has(args), previous = prepared.get(args);
  prepared.set(args, cloneAndFreeze(replacements));
  try { return operation(args); }
  finally { if (hadPrevious) prepared.set(args, previous); else prepared.delete(args); }
}
