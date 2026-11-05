import { invokeActionStages, stagedClosedAction } from "../../core/action.js";
import { drainStages } from "../../core/stages.js";
import { validateUserId } from "../../core/identifiers.js";

import { requireDataset } from "../../selectors/datasets.js";
import { requireLayer } from "../../selectors/layers.js";
import { applyRevisionPlanStages, buildSourceRevisionPlan } from "./edit.js";
import { resolveStoredSelection } from "../../materialization/selection/state.js";
import { withGuideLayoutTransactionStages } from "../../materialization/guides/layout.js";
import { assertFieldsAvailable } from "../../grammar/datasetSchema.js";
import { reviseSourceIdentityStages } from "../../core/itemIdentity.js";
import { newDatasetNamespace, withPreparedDatasetIdentityStages } from "../primitives/datasetIdentity.js";
import { detachDataSourceBindings } from "../primitives/resourceState.js";
import { createDataSourceResource } from "../../materialization/dataSourceState.js";
import { createPreparedSource } from "./sourceCreate.js";
import { preparedSourceUpdate, writeSourceResource } from "./sourceContext.js";

let reviseFacet;
// Full binds its prepared native route invocation; Basic binds nothing.
const nativeIdentityReaders = new WeakMap();
export function registerNativeRevisionIdentityReader(ProgramClass, reader) {
  if (typeof ProgramClass !== "function" || typeof reader !== "function" || nativeIdentityReaders.has(ProgramClass)) throw new TypeError("Native revision identity requires one exact constructor binding.");
  nativeIdentityReaders.set(ProgramClass, reader);
}

function layerInputFields(layer) {
  const fields = [];
  const add = value => {
    if (typeof value === "string" && value.length > 0) fields.push(value);
  };
  for (const encoding of Object.values(layer.encoding ?? {})) {
    if (!encoding || typeof encoding !== "object") continue;
    add(encoding.field);
    add(encoding.weight);
    add(encoding.key);
    add(encoding.pathOrder?.field);
    add(encoding.categoryOrder?.by?.field);
    for (const field of encoding.fields ?? []) add(field);
    for (const dimension of encoding.dimensions ?? []) add(dimension.field);
  }
  return [...new Set(fields)];
}

export function registerFacetDataRevision(handler) {
  reviseFacet = handler;
}

export function reviseUnitData(program, input) {
  return drainStages(reviseUnitDataStages(program, input));
}

export function* reviseUnitDataStages(program, { source, id, values, schema, identity, sourceUpdate }) {
  const plan = sourceUpdate?.revisionPlan ?? buildSourceRevisionPlan(program, source, id);
  const original = requireDataset(program, source);
  const inheritedSchema = schema ?? (original.schema?.origin === "declared"
    ? { fields: original.schema.fields.map(({ name, storageType, nullable, optional }) => ({
        name, storageType, nullable, optional
      })) }
    : undefined);
  let created = sourceUpdate === undefined ? yield* withPreparedDatasetIdentityStages(
    { id, values, ...(inheritedSchema === undefined ? {} : { schema: inheritedSchema }) }, identity,
    args => invokeActionStages(program, program.createData, args)) : createPreparedSource(program, {
      id, prepared: sourceUpdate.prepared, identity, sourceId: sourceUpdate.resource.id
    });
  if (sourceUpdate === undefined) created = detachDataSourceBindings(created, original);
  else {
    const resource = createDataSourceResource({ id: sourceUpdate.resource.id,
      revision: sourceUpdate.resource.revision + 1, options: sourceUpdate.resource.options,
      prepared: sourceUpdate.prepared, dataset: requireDataset(created, id) });
    created = writeSourceResource(created, resource);
  }
  const revisedSource = requireDataset(created, id);
  for (const layer of program.semanticSpec.layers.filter(layer => layer.data === source)) {
    assertFieldsAvailable(revisedSource.schema, layerInputFields(layer), {
      data: id,
      operation: "reviseData"
    });
  }
  const next = yield* withGuideLayoutTransactionStages(created, candidate =>
    applyRevisionPlanStages(candidate, undefined, plan, { retain: new Set([source]) }));
  for (const [selection, config] of Object.entries(next.materializationConfigs.selections ?? {})) {
    if (plan.replacements.has(requireLayer(program, config.target).data)) {
      resolveStoredSelection(next, selection);
    }
  }
  return { program: next, plan };
}

export const reviseData = /* @__PURE__ */ stagedClosedAction(
  { op: "reviseData", description: "Revise source data and its dependent chart.", scope: "any" }, ["source", "id", "values", "schema", "keys", "rowMap"],
  function* (args = {}) {
    const source = validateUserId(args.source, "Source dataset id");
    const id = validateUserId(args.id, "Revision dataset id");
    if (this.compositionSpec !== undefined && this.compositionSpec.type !== "facet") {
      throw new Error("Revise an explicit child, then use replaceCompositionChild for concat.");
    }
    const original = requireDataset(this, source);
    if (original.source !== undefined || !Array.isArray(original.values)) {
      throw new Error(`Source "${source}" must be a materialized original dataset.`);
    }
    const sourceUpdate = preparedSourceUpdate(args);
    const identity = sourceUpdate?.identity ?? nativeIdentityReaders.get(this.constructor)?.(this, args, reviseData) ??
      (yield* reviseSourceIdentityStages(original, args.values, args, newDatasetNamespace()));
    const apply = this.compositionSpec === undefined
      ? function* (program) { return (yield* reviseUnitDataStages(program, { source, id, values: args.values, schema: args.schema, identity, sourceUpdate })).program; }
      // Facet revision runs as one step.
      : function* (program) { return reviseFacet(program, { source, id, values: args.values, schema: args.schema, identity, sourceUpdate }); };
    // The entire dependent materialization must succeed before returning a revision.
    yield* apply(this);
    return yield* apply(this);
  }
);
