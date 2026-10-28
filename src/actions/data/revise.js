import { closedAction } from "../../core/action.js";
import { validateUserId } from "../../core/identifiers.js";

import { requireDataset } from "../../selectors/datasets.js";
import { requireLayer } from "../../selectors/layers.js";
import { applyRevisionPlan, buildSourceRevisionPlan } from "./edit.js";
import { resolveStoredSelection } from "../../materialization/selection/state.js";
import { withGuideLayoutTransaction } from "../../materialization/guides/layout.js";
import { assertFieldsAvailable } from "../../grammar/datasetSchema.js";
import { reviseSourceIdentity } from "../../core/itemIdentity.js";
import { newDatasetNamespace, withPreparedDatasetIdentity } from "../primitives/datasetIdentity.js";
import { detachDataSourceBindings } from "../primitives/resourceState.js";
import { createDataSourceResource } from "../../materialization/dataSourceState.js";
import { createPreparedSource } from "./sourceCreate.js";
import { preparedSourceUpdate, writeSourceResource } from "./sourceContext.js";

let reviseFacet;

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

export function reviseUnitData(program, { source, id, values, schema, identity, sourceUpdate }) {
  const plan = sourceUpdate?.revisionPlan ?? buildSourceRevisionPlan(program, source, id);
  const original = requireDataset(program, source);
  const inheritedSchema = schema ?? (original.schema?.origin === "declared"
    ? { fields: original.schema.fields.map(({ name, storageType, nullable, optional }) => ({
        name, storageType, nullable, optional
      })) }
    : undefined);
  let created = sourceUpdate === undefined ? withPreparedDatasetIdentity(
    { id, values, ...(inheritedSchema === undefined ? {} : { schema: inheritedSchema }) }, identity,
    args => program.createData(args)) : createPreparedSource(program, {
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
  const next = withGuideLayoutTransaction(created, candidate =>
    applyRevisionPlan(candidate, undefined, plan, { retain: new Set([source]) }));
  for (const [selection, config] of Object.entries(next.materializationConfigs.selections ?? {})) {
    if (plan.replacements.has(requireLayer(program, config.target).data)) {
      resolveStoredSelection(next, selection);
    }
  }
  return { program: next, plan };
}

export const reviseData = /* @__PURE__ */ closedAction(
  { op: "reviseData", description: "Revise source data and its dependent chart.", scope: "any" }, ["source", "id", "values", "schema", "keys", "rowMap"],
  function (args = {}) {
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
    const identity = sourceUpdate?.identity ?? reviseSourceIdentity(original, args.values, args, newDatasetNamespace());
    const apply = this.compositionSpec === undefined
      ? program => reviseUnitData(program, { source, id, values: args.values, schema: args.schema, identity, sourceUpdate }).program
      : program => reviseFacet(program, { source, id, values: args.values, schema: args.schema, identity, sourceUpdate });
    // The entire dependent materialization must succeed before returning a revision.
    apply(this);
    return apply(this);
  }
);
