import { closedAction } from "../../core/action.js";
import { validateUserId } from "../../core/identifiers.js";
import { deriveLookupRows, normalizeLookupTransform } from "../../grammar/lookup.js";
import {
  deriveTransformSchema, datasetSchemaContext, validateRowsAgainstSchema
} from "../../grammar/datasetSchema.js";
import { orderedDatasetAncestors } from "../../grammar/datasetDependencies.js";
import { resolveDatasetReference, requireDataset } from "../../selectors/datasets.js";
import {
  requireDerivedDataset, MATERIALIZE_OPTIONS, resolveDatasetTransformInputs
} from "./shared.js";

function lookupResult(program, source, transform, id) {
  if (!Array.isArray(source.values)) throw new Error(`Source dataset "${source.id}" has no values.`);
  const right = requireDataset(program, transform.lookup.data);
  if (!Array.isArray(right.values)) throw new Error(`Lookup dataset "${right.id}" has no values.`);
  const context = datasetSchemaContext(source, transform, id, reference => requireDataset(program, reference));
  const schema = deriveTransformSchema(source.schema, transform, undefined, context);
  const values = deriveLookupRows(source.values, right.values, transform);
  validateRowsAgainstSchema(values, schema, `Lookup dataset "${id}"`);
  return values;
}

export const materializeLookupData = /* @__PURE__ */ closedAction(
  { op: "materializeLookupData", description: "Materialize one typed named-dataset lookup." },
  MATERIALIZE_OPTIONS,
  function(args = {}) {
    const { id, source, transform } = requireDerivedDataset(this, args.id, "lookup");
    orderedDatasetAncestors(this.semanticSpec.datasets, id);
    const values = lookupResult(this, source, transform, id);
    return this.editSemantic({ property: `dataset[${id}].values`, value: values });
  }
);

export const createLookupData = /* @__PURE__ */ closedAction(
  { op: "createLookupData", description: "Copy fields from one named dataset without changing primary rows." },
  ["id", "source", "field", "lookup"],
  function(args = {}) {
    const id = validateUserId(args.id, "Lookup dataset id");
    const source = resolveDatasetReference(this,
      validateUserId(args.source ?? this.context.currentData, "Lookup source dataset id"),
      "Lookup source dataset");
    const transform = resolveDatasetTransformInputs(this, normalizeLookupTransform(args));
    lookupResult(this, source, transform, id);
    const standalone = this.actionStack.length === 1;
    const next = this.createDerivedData({ id, source: source.id, transform: [transform] })
      .materializeLookupData({ id });
    return standalone ? next._withMaterializationConfig(["data", "lookup", id], { current: id }) : next;
  }
);
