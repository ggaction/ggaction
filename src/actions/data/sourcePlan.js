import { annotateError } from "../../core/diagnostics.js";
import { validateUserId } from "../../core/identifiers.js";
import { allocateRowKeys, reviseSourceIdentity } from "../../core/itemIdentity.js";
import { ownRecord, ownArray } from "../../core/ownData.js";
import { validateKeys, validateWorkLimit } from "../../core/validation.js";
import { normalizeParameterValue } from "../../grammar/parameter.js";
import { findDataset, hasDatasetOwner, requireDataset } from "../../selectors/datasets.js";
import { requireStoredResource, resolveInputReference } from "../../selectors/resources.js";
import { facetUnitTemplate } from "../facets/actions.js";
import { newDatasetNamespace } from "../primitives/datasetIdentity.js";
import { buildParameterRevisionPlan } from "./edit.js";

function nextRevision(value, label) {
  if (!Number.isSafeInteger(value) || value < 0 || !Number.isSafeInteger(value + 1)) {
    throw annotateError(new RangeError(`${label} revision exceeds the safe integer range.`), { code: "resource-limit" });
  }
}

function currentSource(program, resource) {
  nextRevision(resource.revision, "Data source");
  const dataset = resolveInputReference(program, resource.result.data);
  if (dataset.source !== undefined || !Array.isArray(dataset.values)) {
    throw new Error("A data source must own a materialized original dataset.");
  }
  nextRevision(dataset.revision, "Dataset");
  return dataset;
}

// Full-only planning: before host I/O, fix the affected union and every new ID.
// The returned unit is a retained facet template or the exact unit receiver.
export function planDataUpdate(program, request) {
  ownRecord(request, "Data update request");
  if (!["revise", "parameter"].includes(request.kind)) throw new TypeError("Expected a revise or parameter data request.");
  validateKeys(request, request.kind === "revise" ? ["kind", "target", "id", "rowMap"]
    : ["kind", "target", "value"], "Data update request");
  const target = validateUserId(request.target, "Data update target");
  if (program.compositionSpec !== undefined && program.compositionSpec.type !== "facet") {
    throw new Error("Prepare a data update in an explicit concat child scope.");
  }
  const unit = program.compositionSpec === undefined ? program : facetUnitTemplate(program);
  let parameter, noOp = false, resources;
  if (request.kind === "parameter") {
    const resource = requireStoredResource(unit, { kind: "parameter", id: target });
    const value = normalizeParameterValue(request.value, resource.options);
    noOp = Object.is(resource.result.value, value);
    if (!noOp) nextRevision(resource.revision, "Parameter");
    parameter = { resource, value };
    resources = noOp ? [] : unit.semanticSpec.resources.filter(candidate => candidate.kind === "data-source" &&
      candidate.inputs.some(ref => ref.kind === "parameter" && ref.id === target));
  } else {
    const id = validateUserId(request.id, "Data update dataset id");
    if (findDataset(unit, id) !== undefined || hasDatasetOwner(unit, id)) throw new Error(`Dataset "${id}" already exists.`);
    resources = [requireStoredResource(unit, { kind: "data-source", id: target })];
  }
  const sources = resources.map(resource => {
    const dataset = currentSource(unit, resource);
    if (request.rowMap !== undefined) {
      if (dataset.keySpec.mode !== "generated") throw new Error("Data update rowMap requires generated row identity.");
      if (Array.isArray(request.rowMap)) validateWorkLimit(request.rowMap.length, "Data update rowMap length");
      ownArray(request.rowMap, "Data update rowMap");
      allocateRowKeys(dataset.rowKeys, dataset.nextGeneratedKey, request.rowMap, "preflight");
    }
    return { resource, old: dataset.id, ...(request.kind === "revise" ? { id: request.id } : {}) };
  });
  const revisionPlan = noOp ? { revisions: [], replacements: new Map() }
    : buildParameterRevisionPlan(unit, parameter?.resource.id,
      { sourceRevisions: sources.map(source => ({ old: source.old, owner: source.resource.id,
        ...(source.id === undefined ? {} : { id: source.id }) })) });
  for (const source of sources) source.id = revisionPlan.replacements.get(source.old);
  return { request, unit, parameter, noOp, sources, revisionPlan };
}

// Row identity depends on received data. Allocate once, after all host results
// exist, and retain it across speculative and actual synchronous application.
export function finalizeDataUpdatePlan(plan, preparedSources) {
  ownArray(preparedSources, "Prepared data update sources");
  if (preparedSources.length !== plan.sources.length) throw new Error("Prepared data update source count differs from its plan.");
  const sources = plan.sources.map((source, index) => {
    const prepared = preparedSources[index];
    const previous = requireDataset(plan.unit, source.old);
    const identity = reviseSourceIdentity(previous, prepared.values,
      plan.request.kind === "revise" && plan.request.rowMap !== undefined ? { rowMap: plan.request.rowMap } : {},
      newDatasetNamespace());
    return Object.freeze({ ...source, prepared, identity });
  });
  return Object.freeze({ ...plan, sources: Object.freeze(sources) });
}
