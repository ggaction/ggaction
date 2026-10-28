import { requireDataset } from "../../selectors/datasets.js";
import { cloneAndFreeze } from "../../core/immutable.js";
import { annotateError } from "../../core/diagnostics.js";
import { findStoredResource, requireStoredResource, resolveInputReference, dataInputReference } from "../../selectors/resources.js";
import { validateResourceGraph, validateStoredResource, resourceDependencies, orderResourceDependencies, planStoredResourceRemoval, collectParameterInputReferences } from "../../materialization/resourceState.js";
import { dataSourceValueHash } from "../../grammar/dataSourcePayload.js";
import { dataSourcesForDataset, validateDataSourceState } from "../../materialization/dataSourceState.js";
import { preparedSourceResources } from "./dataSourceContext.js";

const same = (a, b) => a.kind === b.kind && a.id === b.id;

export function replaceStoredResource(program, parsed, value, args) {
  validateStoredResource(value);
  if (value.kind !== parsed.resourceKind || value.id !== parsed.id) throw new Error("Resource identity must match its semantic path.");
  const previous = findStoredResource(program, value.kind, value.id);
  if (value.revision !== (previous === undefined ? 0 : previous.revision + 1)) {
    throw annotateError(new Error("Resource write requires its next revision."), {
      code: previous === undefined ? "missing-resource" : value.revision === 0 ? "duplicate-id" : "stale-result", resourceId: value.id
    });
  }
  // Check the caller's exact inputs before rebinding existing dependents.
  for (const ref of resourceDependencies(value)) {
    if (!same(ref, value)) resolveInputReference(program, ref);
  }
  const replacements = new Map();
  for (const entry of preparedSourceResources(args) ?? []) {
    const old = requireStoredResource(program, entry.previous);
    if (value.kind !== "parameter" || !old.inputs.some(ref => same(ref, value)) ||
        dataSourceValueHash(old.options) !== dataSourceValueHash(entry.resource.options)) {
      throw annotateError(new Error("Prepared source replacement does not belong to this parameter write."), { code: "stale-result", resourceId: old.id });
    }
    replacements.set(JSON.stringify([old.kind, old.id]), entry.resource);
  }
  const supplied = previous === undefined ? [...program.semanticSpec.resources, value]
    : program.semanticSpec.resources.map(resource => same(resource, value) ? value : resource);
  const updated = new Map(), revisions = new Map();
  for (const resource of orderResourceDependencies(supplied)) {
    const key = JSON.stringify([resource.kind, resource.id]);
    const rebind = ref => {
      const revised = updated.get(JSON.stringify([ref.kind, ref.id]));
      return revised === undefined || revised.revision === ref.revision ? ref : { ...ref, revision: revised.revision };
    };
    const inputs = resource.inputs.map(rebind);
    const ownership = resource.ownership.mode === "generated" ? { ...resource.ownership, owner: rebind(resource.ownership.owner) } : resource.ownership;
    const changed = inputs.some((ref, index) => ref !== resource.inputs[index]) || ownership.owner !== resource.ownership.owner;
    let next = changed ? { ...resource, revision: resource.revision + (same(resource, value) ? 0 : 1), inputs, ownership } : resource;
    const replacement = replacements.get(key);
    if (replacement !== undefined) {
      if (!changed || replacement.revision !== next.revision ||
          dataSourceValueHash(replacement.inputs) !== dataSourceValueHash(inputs) ||
          dataSourceValueHash(replacement.ownership) !== dataSourceValueHash(ownership)) {
        throw annotateError(new Error("Prepared source replacement has stale dependency revisions."), { code: "stale-result", resourceId: resource.id });
      }
      next = replacement;
      replacements.delete(key);
    }
    updated.set(key, next);
    if (changed || same(resource, value)) revisions.set(key, next.revision);
  }
  if (replacements.size) throw annotateError(new Error("Prepared source replacement is missing from the resource graph."), { code: "stale-result" });
  const resources = supplied.map(resource => updated.get(JSON.stringify([resource.kind, resource.id])));
  const semanticSpec = { ...program.semanticSpec, resources: cloneAndFreeze(resources) };
  validateResourceGraph({ ...program, semanticSpec });
  const selections = program.materializationConfigs.selections;
  const rebound = selections === undefined ? undefined : Object.fromEntries(Object.entries(selections).map(([id, definition]) => {
    const revision = revisions.get(JSON.stringify([definition.resource?.kind, definition.resource?.id]));
    return [id, revision === undefined ? definition : { ...definition, resource: { ...definition.resource, revision } }];
  }));
  return program._clone({ semanticSpec, ...(rebound === undefined ? {} : { materializationConfigs: { ...program.materializationConfigs, selections: rebound } }) });
}

export function detachDataSourceBindings(program, dataset) {
  let next = program;
  for (const source of dataSourcesForDataset(program, dataset)) {
    next = next.editSemantic({ property: `resource[data-source:${source.id}]`, remove: true });
  }
  return next;
}

export function removeStoredResource(program, parsed) {
  const resource = findStoredResource(program, parsed.resourceKind, parsed.id);
  if (resource === undefined) throw annotateError(new Error("Resource removal requires an existing resource."), { code: "missing-resource", resourceId: parsed.id });
  planStoredResourceRemoval(program, resource);
  const dependents = Object.entries(program.materializationConfigs.selections ?? {}).filter(([, definition]) => definition.resource && same(definition.resource, resource));
  if (dependents.length) throw annotateError(new Error("Resource still has selection consumers."), { code: "resource-in-use", resourceId: resource.id, dependencies: dependents.map(([id]) => id) });
  return program._clone({ semanticSpec: { ...program.semanticSpec, resources: program.semanticSpec.resources.filter(candidate => !same(candidate, resource)) } });
}

// Facet source replacement retains the selected recipe and its exact resource
// closure. Data projections follow explicit IDs; keys keep their old logical
// namespace, so an unrelated replacement cannot acquire an old row selection.
export function adoptSelectionResources(program, source, selections) {
  const retained = new Map(), pending = [
    ...Object.values(selections ?? {}).map(definition => definition.resource),
    ...collectParameterInputReferences(program).filter(ref => ref.scope.length === 0)
      .map(({ kind, id, revision }) => ({ kind, id, revision }))
  ];
  while (pending.length) {
    const ref = pending.pop(), key = JSON.stringify([ref.kind, ref.id]);
    if (retained.has(key)) continue;
    // A replacement unit owns its parameters. Adopt only a missing exact
    // dependency; never overwrite a current authored value with an older cell.
    if (["parameter", "data-source"].includes(ref.kind) && findStoredResource(program, ref.kind, ref.id) !== undefined) {
      requireStoredResource(program, ref);
      continue;
    }
    const resource = requireStoredResource(source, ref);
    retained.set(key, resource);
    pending.push(...resourceDependencies(resource).filter(input => input.kind !== "data"));
  }
  if (!retained.size) return program;
  const rebind = ref => ref.kind === "data" ? dataInputReference(requireDataset(program, ref.id)) : ref;
  const resources = [...program.semanticSpec.resources.filter(resource => !retained.has(JSON.stringify([resource.kind, resource.id]))),
    ...[...retained.values()].map(resource => ({ ...resource, inputs: resource.inputs.map(rebind),
      ownership: resource.ownership.mode === "generated" ? { ...resource.ownership, owner: rebind(resource.ownership.owner) } : resource.ownership }))];
  const next = program._clone({ semanticSpec: { ...program.semanticSpec, resources: cloneAndFreeze(resources) } });
  validateResourceGraph(next);
  validateDataSourceState(next);
  return next;
}
