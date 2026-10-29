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
export function withPreparedResourceResults(program, args, replacements, operation, dataReplacements = []) {
  return bindPreparedResources(program, args, replacements, operation, dataReplacements, false);
}

// Source revisions may update independent resources rooted in the same exact
// dataset revision vector. This authority never escapes the primitive call.
export function withPreparedDataResourceResults(program, args, replacements, operation, dataReplacements) {
  return bindPreparedResources(program, args, replacements, operation, dataReplacements, true);
}

// Canvas revisions may invalidate several independent screen-space routes.
// This private authority permits only their next viewport-bound results.
export function withPreparedScreenRouteResults(program, args, replacements, operation) {
  return bindPreparedResources(program, args, replacements, operation, [], false, true);
}

function bindPreparedResources(program, args, replacements, operation, dataReplacements, dataRooted, screenRooted = false) {
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
    if (screenRooted && (previous.kind !== "edge-route" || resource.options.coordinateSpace !== "screen")) throw new TypeError("Prepared screen replacements require screen edge routes.");
    if (!(dataRooted ? ["hierarchy", "graph", "geometry", "layout", "edge-route"] : ["data-source", "graph", "layout", "edge-route"]).includes(previous.kind) || resource.kind !== previous.kind || previous.id !== resource.id ||
        resource.revision !== previous.revision + 1 || identities.has(JSON.stringify([previous.kind, previous.id]))) {
      throw new TypeError("Prepared resource replacements require unique next revisions.");
    }
    identities.add(JSON.stringify([previous.kind, previous.id]));
  }
  ownArray(dataReplacements, "Prepared data replacements");
  const dataIds = new Set();
  for (const entry of dataReplacements) {
    ownRecord(entry, "Prepared data replacement");
    if (Object.keys(entry).length !== 2) throw new TypeError("Prepared data replacement requires previous and next.");
    validateInputReference(entry.previous); validateInputReference(entry.next);
    if (entry.previous.kind !== "data" || entry.next.kind !== "data" || entry.previous.logicalId !== entry.next.logicalId ||
        entry.next.revision <= entry.previous.revision || dataIds.has(entry.previous.id)) throw new TypeError("Prepared data replacements require unique later revisions of the same source.");
    dataIds.add(entry.previous.id);
  }
  const hadPrevious = prepared.has(args), previous = prepared.get(args);
  prepared.set(args, { program, replacements: cloneAndFreeze(replacements), dataReplacements: cloneAndFreeze(dataReplacements), dataRooted, screenRooted });
  try { return operation(args); }
  finally { if (hadPrevious) prepared.set(args, previous); else prepared.delete(args); }
}

export function preparedResourceDataReplacements(args, enteredProgram) {
  preparedResourceResults(args, enteredProgram);
  return prepared.get(args)?.dataReplacements ?? [];
}

export function preparedResourceDataRooted(args, enteredProgram) {
  preparedResourceResults(args, enteredProgram);
  return prepared.get(args)?.dataRooted === true;
}

export function preparedResourceScreenRooted(args, enteredProgram) {
  preparedResourceResults(args, enteredProgram);
  return prepared.get(args)?.screenRooted === true;
}
