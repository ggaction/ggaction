import { action } from "../../core/action.js";
import { validateUserId } from "../../core/identifiers.js";
import { validateKeys } from "../../core/validation.js";
import { findDataset } from "../../selectors/datasets.js";

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

export function derivedMaterializer(op, description, type, derive, resolve) {
  return action({ op, description }, function (args = {}) {
    validateKeys(args, MATERIALIZE_OPTIONS, op);
    const { id, source, transform } = requireDerivedDataset(
      this,
      args.id,
      type
    );
    const result = derive(source.values, transform);
    const program = resolve === undefined
      ? this
      : this.editSemantic({
          property: `dataset[${id}].transform`,
          value: resolve(result, transform)
        });
    return program.editSemantic({
      property: `dataset[${id}].values`,
      value: Array.isArray(result) ? result : result.values
    });
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
  requireSource = false
) {
  return action({ op, description }, function (args = {}) {
    validateKeys(args, options, op);
    const id = validateUserId(args.id, idLabel);
    const source = validateUserId(
      requireSource ? args.source : args.source ?? this.context.currentData,
      sourceLabel
    );
    return this
      .createDerivedData({ id, source, transform: [transform(args, id)] })
      [materialize]({ id });
  });
}
