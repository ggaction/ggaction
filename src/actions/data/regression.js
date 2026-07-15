import { action } from "../../core/action.js";
import { validateUserId } from "../../core/identifiers.js";
import { validateKeys } from "../../core/validation.js";
import {
  deriveRegression,
  normalizeRegressionParameters
} from "../../grammar/regression.js";
import { MATERIALIZE_OPTIONS, requireDerivedDataset } from "./shared.js";

const OPTIONS = Object.freeze([
  "id", "source", "x", "y", "groupBy", "method", "degree", "span",
  "confidence", "interval"
]);

export const materializeRegressionData = action(
  { op: "materializeRegressionData", description: "Materialize one regression derived dataset." },
  function (args = {}) {
    validateKeys(args, MATERIALIZE_OPTIONS, "materializeRegressionData");
    const { id, source, transform } = requireDerivedDataset(
      this,
      args.id,
      "regression"
    );
    const result = deriveRegression(source.values, {
      x: transform.x,
      y: transform.y,
      groupBy: transform.groupBy,
      method: transform.method,
      degree: transform.degree,
      span: transform.span,
      confidence: transform.confidence,
      interval: transform.interval
    });
    return this.editSemantic({
      property: `dataset[${id}].values`,
      value: result.values
    });
  }
);

export const createRegressionData = action(
  { op: "createRegressionData", description: "Create grouped regression values and optional interval bounds." },
  function (args = {}) {
    validateKeys(args, OPTIONS, "createRegressionData");
    const parameters = normalizeRegressionParameters(args);
    const id = validateUserId(args.id, "Regression dataset id");
    const source = validateUserId(
      args.source ?? this.context.currentData,
      "Source dataset id"
    );
    const transform = {
      type: "regression",
      method: parameters.method,
      x: args.x,
      y: args.y,
      ...(args.groupBy === undefined ? {} : { groupBy: args.groupBy }),
      ...(parameters.method === "polynomial"
        ? { degree: parameters.degree }
        : {}),
      ...(parameters.method === "loess"
        ? { span: parameters.span }
        : {
            confidence: parameters.confidence,
            interval: parameters.interval
          })
    };
    return this
      .createDerivedData({ id, source, transform: [transform] })
      .materializeRegressionData({ id });
  }
);
