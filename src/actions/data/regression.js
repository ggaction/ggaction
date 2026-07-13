import { action } from "../../core/action.js";
import { validateUserId } from "../../core/identifiers.js";
import { validateKeys } from "../../core/validation.js";
import { deriveLinearRegression } from "../../grammar/regression.js";
import { MATERIALIZE_OPTIONS, requireDerivedDataset } from "./shared.js";

const OPTIONS = Object.freeze([
  "id", "source", "x", "y", "groupBy", "method", "confidence", "interval"
]);

export const materializeRegressionData = action(
  { op: "materializeRegressionData", description: "Materialize one linear-regression derived dataset." },
  function (args = {}) {
    validateKeys(args, MATERIALIZE_OPTIONS, "materializeRegressionData");
    const { id, source, transform } = requireDerivedDataset(
      this,
      args.id,
      "regression"
    );
    const result = deriveLinearRegression(source.values, {
      x: transform.x,
      y: transform.y,
      groupBy: transform.groupBy,
      confidence: transform.confidence
    });
    return this.editSemantic({
      property: `dataset[${id}].values`,
      value: result.values
    });
  }
);

export const createRegressionData = action(
  { op: "createRegressionData", description: "Create grouped linear-regression values and confidence bounds." },
  function (args = {}) {
    validateKeys(args, OPTIONS, "createRegressionData");
    const id = validateUserId(args.id, "Regression dataset id");
    const source = validateUserId(
      args.source ?? this.context.currentData,
      "Source dataset id"
    );
    const transform = {
      type: "regression",
      method: args.method ?? "linear",
      x: args.x,
      y: args.y,
      ...(args.groupBy === undefined ? {} : { groupBy: args.groupBy }),
      confidence: args.confidence ?? 0.95,
      interval: args.interval ?? "mean"
    };
    return this
      .createDerivedData({ id, source, transform: [transform] })
      .materializeRegressionData({ id });
  }
);
