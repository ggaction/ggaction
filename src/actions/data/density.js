import { action } from "../../core/action.js";
import { validateUserId } from "../../core/identifiers.js";
import { validateKeys } from "../../core/validation.js";
import { deriveKernelDensity } from "../../grammar/density.js";
import { MATERIALIZE_OPTIONS, requireDerivedDataset } from "./shared.js";

const OPTIONS = Object.freeze([
  "id", "source", "field", "groupBy", "bandwidth", "extent", "steps", "as"
]);

export const materializeDensityData = action(
  { op: "materializeDensityData", description: "Materialize one grouped kernel-density dataset." },
  function (args = {}) {
    validateKeys(args, MATERIALIZE_OPTIONS, "materializeDensityData");
    const { id, source, transform } = requireDerivedDataset(
      this,
      args.id,
      "density"
    );
    const result = deriveKernelDensity(source.values, transform);
    return this
      .editSemantic({
        property: `dataset[${id}].transform`,
        value: [{ ...transform, bandwidth: result.bandwidth }]
      })
      .editSemantic({
        property: `dataset[${id}].values`,
        value: result.values
      });
  }
);

export const createDensityData = action(
  { op: "createDensityData", description: "Create grouped Gaussian kernel-density values." },
  function (args = {}) {
    validateKeys(args, OPTIONS, "createDensityData");
    const id = validateUserId(args.id, "Density dataset id");
    const source = validateUserId(
      args.source ?? this.context.currentData,
      "Source dataset id"
    );
    if (typeof args.field !== "string" || args.field.length === 0) {
      throw new TypeError("createDensityData requires a non-empty field string.");
    }
    const transform = {
      type: "density",
      field: args.field,
      ...(args.groupBy === undefined ? {} : { groupBy: args.groupBy }),
      bandwidth: args.bandwidth ?? "auto",
      extent: args.extent ?? "auto",
      steps: args.steps ?? 100,
      as: args.as ?? [`${args.field}_value`, `${args.field}_density`],
      resolve: "shared"
    };
    return this
      .createDerivedData({ id, source, transform: [transform] })
      .materializeDensityData({ id });
  }
);
