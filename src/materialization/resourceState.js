import { validateRowReference } from "../core/rowReference.js";
import { cloneAndFreeze, isPlainObject } from "../core/immutable.js";
import { annotateError } from "../core/diagnostics.js";
import { validateUserId } from "../core/identifiers.js";
import { validateWorkLimit } from "../core/validation.js";
import { canonicalJSON, contentDigest } from "../core/contentDigest.js";
import { normalizeMarkSelector } from "../grammar/markSelection.js";
import { encodeValue } from "../core/valueEncoding.js";
import { resolveInputReference, resolveRowReference } from "../selectors/resources.js";

export const STORED_RESOURCE_KINDS = Object.freeze(["persistent-selection"]);
const identity = ref => JSON.stringify([ref.kind, ref.id]);

function error(message, code = "invalid-value", details = {}) {
  return annotateError(new Error(message), { code, ...details });
}

function exact(value, keys, label) {
  if (!isPlainObject(value) || Object.keys(value).length !== keys.length || keys.some(key => !Object.hasOwn(value, key))) {
    throw error(`${label} requires its exact stored fields.`);
  }
}

function revision(value) {
  if (!Number.isSafeInteger(value) || value < 0) throw error("Resource revision requires a non-negative safe integer.");
}

export function validateInputReference(ref) {
  exact(ref, ref?.kind === "data" ? ["kind", "id", "logicalId", "revision"] : ["kind", "id", "revision"], "Input reference");
  if (ref.kind !== "data" && !STORED_RESOURCE_KINDS.includes(ref.kind)) throw error("Unsupported resource kind.", "unsupported-format");
  validateUserId(ref.id, "Input resource id"); revision(ref.revision);
  if (ref.kind === "data" && (typeof ref.logicalId !== "string" || !ref.logicalId)) throw error("Data input requires logical identity.");
  return ref;
}

export function validateStoredResource(resource) {
  exact(resource, ["kind", "id", "revision", "algorithmVersion", "ownership", "inputs", "options", "result", "provenance"], "Resource");
  if (!STORED_RESOURCE_KINDS.includes(resource.kind)) throw error("Unsupported resource kind.", "unsupported-format");
  validateUserId(resource.id, "Resource id"); revision(resource.revision);
  if (resource.algorithmVersion !== "1") throw error("Unsupported resource algorithm version.", "unsupported-format");
  const ownership = resource.ownership;
  exact(ownership, ownership?.mode === "generated" ? ["mode", "owner"] : ["mode"], "Resource ownership");
  if (!["authored", "generated"].includes(ownership.mode)) throw error("Unsupported resource ownership.");
  if (ownership.mode === "generated") validateInputReference(ownership.owner);
  if (!Array.isArray(resource.inputs)) throw error("Resource inputs must be an array.");
  resource.inputs.forEach(validateInputReference);
  if (new Set(resource.inputs.map(identity)).size !== resource.inputs.length) throw error("Duplicate resource input.", "ambiguous-identity");
  exact(resource.result, [], "Persistent selection result");
  const options = resource.options;
  if (options?.mode === "predicate") {
    exact(options, ["mode", "predicate"], "Predicate selection");
    if (Object.hasOwn(options.predicate, "grain") || Object.hasOwn(options.predicate, "rows")) throw error("Selection projection belongs to its target configuration.");
    const { grain: _grain, ...normalized } = normalizeMarkSelector(options.predicate);
    if (canonicalJSON(normalized) !== canonicalJSON(options.predicate)) throw error("Selection predicate must be normalized.");
  } else if (options?.mode === "row-keys") {
    exact(options, ["mode", "logicalDataId", "rowKeys"], "Row-key selection");
    if (typeof options.logicalDataId !== "string" || !options.logicalDataId || !Array.isArray(options.rowKeys) ||
        options.rowKeys.some(key => typeof key !== "string" || !key) || new Set(options.rowKeys).size !== options.rowKeys.length) {
      throw error("Selection requires unique row keys and logical data identity.");
    }
  } else throw error("Unsupported persistent selection mode.");
  exact(resource.provenance, Object.hasOwn(resource.provenance ?? {}, "sourceRows") ? ["origin", "sourceRows"] : ["origin"], "Resource provenance");
  if (!["authored", "observed", "inferred"].includes(resource.provenance.origin)) throw error("Unsupported resource provenance origin.");
  if (resource.provenance.sourceRows !== undefined && !Array.isArray(resource.provenance.sourceRows)) throw error("Resource sourceRows must be an array.");
  resource.provenance.sourceRows?.forEach(validateRowReference);
  return resource;
}

export function resourceDependencies(resource) {
  return [...resource.inputs, ...(resource.ownership.mode === "generated" ? [resource.ownership.owner] : [])];
}

export function validateResourceGraph(program) {
  const resources = program.semanticSpec.resources;
  if (!Array.isArray(resources)) throw error("Semantic resources must be an array.");
  validateWorkLimit(resources.length, "Resource count");
  const byId = new Map();
  for (const resource of resources) {
    validateStoredResource(resource);
    resource.provenance.sourceRows?.forEach(ref => resolveRowReference(program, ref));
    const key = identity(resource);
    if (byId.has(key)) throw error("Duplicate resource identity.", "duplicate-id", { resourceId: resource.id });
    byId.set(key, resource);
  }
  let work = 0;
  for (const resource of resources) for (const ref of resourceDependencies(resource)) {
    validateWorkLimit(++work, "Resource dependency work");
    resolveInputReference(program, ref);
  }
  orderResourceDependencies(resources);
}

// Iterative postorder keeps a valid deep DAG within the work budget and avoids
// host call-stack limits during restoration and atomic revision planning.
export function orderResourceDependencies(resources) {
  const byId = new Map(resources.map(resource => [identity(resource), resource]));
  const visited = new Set(), active = new Set(), ordered = [];
  let work = 0;
  for (const root of resources) {
    const stack = [{ resource: root, done: false }];
    while (stack.length) {
      const { resource, done } = stack.pop(), key = identity(resource);
      if (visited.has(key)) continue;
      if (done) { active.delete(key); visited.add(key); ordered.push(resource); continue; }
      if (active.has(key)) throw error("Cyclic resource dependency.", "cyclic-dependency", { ownerId: resource.id });
      active.add(key); stack.push({ resource, done: true });
      for (const ref of resourceDependencies(resource)) {
        validateWorkLimit(++work, "Resource dependency work");
        const dependency = ref.kind === "data" ? undefined : byId.get(identity(ref));
        if (dependency) stack.push({ resource: dependency, done: false });
      }
    }
  }
  return ordered;
}

function inputFingerprint(program, refs) {
  return contentDigest(canonicalJSON(encodeValue(refs.map(ref => resolveInputReference(program, ref)))));
}

export function prepareResourceResult(program, resource) {
  validateStoredResource(resource);
  const sourceRevisionVector = cloneAndFreeze(resourceDependencies(resource));
  return cloneAndFreeze({ resource, sourceRevisionVector, inputHash: inputFingerprint(program, sourceRevisionVector) });
}

export function validatePreparedResource(program, prepared) {
  validateStoredResource(prepared.resource);
  if (canonicalJSON(resourceDependencies(prepared.resource)) !== canonicalJSON(prepared.sourceRevisionVector)) {
    throw error("Prepared resource dependency vector does not match its inputs.", "stale-result", { ownerId: prepared.resource.id });
  }
  if (inputFingerprint(program, prepared.sourceRevisionVector) !== prepared.inputHash) {
    throw error("Prepared resource inputs have changed.", "stale-result", { ownerId: prepared.resource.id });
  }
  return prepared.resource;
}

export function planStoredResourceRemoval(program, requested, { cascade = false } = {}) {
  const remove = new Set([identity(requested)]), resources = program.semanticSpec.resources;
  let changed;
  do {
    changed = false;
    for (const resource of resources) {
      if (remove.has(identity(resource))) continue;
      if (!resourceDependencies(resource).some(ref => remove.has(identity(ref)))) continue;
      if (!cascade || resource.ownership.mode !== "generated" || !remove.has(identity(resource.ownership.owner))) {
        throw error("Resource is referenced by a live dependent.", "resource-in-use", { resourceId: requested.id, dependencies: [resource.id] });
      }
      remove.add(identity(resource)); changed = true;
    }
  } while (changed);
  return resources.filter(resource => remove.has(identity(resource)));
}
