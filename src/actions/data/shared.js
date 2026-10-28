import { datasetInputReferences, rebindTransformDatasetInputs } from "../../core/datasetReferences.js";
import { action } from "../../core/action.js";
import { validateUserId } from "../../core/identifiers.js";
import { validateKeys } from "../../core/validation.js";
import {
  findDataset,
  resolveDatasetReference
} from "../../selectors/datasets.js";
import {
  assertFieldsAvailable,
  deriveTransformSchema,
  transformInputFields,
  validateRowsAgainstSchema
} from "../../grammar/datasetSchema.js";

export function resolveDatasetTransformInputs(program, transform) {
  const replacements = new Map();
  for (const reference of datasetInputReferences({ transform: [transform] })) {
    const input = resolveDatasetReference(program, reference.id, "Lookup dataset");
    if (input.id !== reference.id) replacements.set(reference.id, input.id);
  }
  return rebindTransformDatasetInputs(transform, replacements);
}

export const MATERIALIZE_OPTIONS = Object.freeze(["id"]);

export function requireDerivedDataset(program, id, type) {
  const validatedId = validateUserId(id, "Derived dataset id");
  const dataset = findDataset(program, validatedId);
  if (dataset === undefined || dataset.source === undefined) {
    throw new Error(`Unknown derived dataset "${validatedId}".`);
  }
  if (dataset.values !== undefined) {
    throw new Error(`Derived dataset "${validatedId}" is already materialized.`);
  }
  const source = findDataset(program, dataset.source);
  if (source?.values === undefined) {
    throw new Error(`Source dataset "${dataset.source}" has no values.`);
  }
  if (dataset.transform?.length !== 1 || dataset.transform[0].type !== type) {
    throw new Error(
      `Derived dataset "${validatedId}" requires one ${type} transform.`
    );
  }
  return { id: validatedId, dataset, source, transform: dataset.transform[0] };
}

export function derivedMaterializer(op, description, type, derive, resolve, { before, after, environment } = {}) {
  return action({ op, description }, function (args = {}) {
    validateKeys(args, MATERIALIZE_OPTIONS, op);
    const existing = before?.(this, args);
    if (existing !== undefined) return existing;
    const { id, source, transform } = requireDerivedDataset(
      this,
      args.id,
      type
    );
    assertFieldsAvailable(source.schema, transformInputFields(transform), {
      data: source.id,
      operation: op
    });
    const result = derive(source.values, transform, environment?.(this, source, transform));
    const values = Array.isArray(result) ? result : result.values;
    const schema = deriveTransformSchema(source.schema, transform, values, {
      sourceId: source.id,
      sourceTransform: source.transform?.[0],
      ownerId: id
    });
    validateRowsAgainstSchema(values, schema, `Derived dataset "${id}"`);
    const program = resolve === undefined
      ? this
      : this.editSemantic({
          property: `dataset[${id}].transform`,
          value: resolve(result, transform)
        });
    let next = program.editSemantic({
      property: `dataset[${id}].values`,
      value: values
    });
    if (!Array.isArray(result) && result.report !== undefined) {
      const report = {
        ...result.report,
        owner: { kind: "data", id },
        inputs: [{ kind: "data", id: source.id }]
      };
      next = next._withMaterializationConfig(
        ["calculations", "datasets", id],
        report
      );
    }
    return after === undefined ? next : after(next, { id, source, transform, result });
  });
}

export function derivedCreator(
  op,
  description,
  options,
  idLabel,
  sourceLabel,
  transform,
  materialize,
  requireSource = false,
  defaultId
) {
  return action({ op, description }, function (args = {}) {
    validateKeys(args, options, op);
    const id = validateUserId(args.id === undefined ? defaultId : args.id, idLabel);
    const requestedSource = validateUserId(
      requireSource ? args.source : args.source ?? this.context.currentData,
      sourceLabel
    );
    const source = resolveDatasetReference(
      this,
      requestedSource,
      sourceLabel
    ).id;
    const standalone = this.actionStack.length === 1;
    const requestedTransform = transform(args, id);
    const next = this
      .createDerivedData({ id, source, transform: [requestedTransform] })
      [materialize]({ id });
    return standalone
      ? next._withMaterializationConfig(
          ["data", requestedTransform.type, id],
          { current: id }
        )
      : next;
  });
}
