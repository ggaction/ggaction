import { action } from "../../core/action.js";
import { validateUserId } from "../../core/identifiers.js";
import { validateKeys } from "../../core/validation.js";
import {
  deriveRegression,
  normalizeRegressionParameters
} from "../../grammar/regression/index.js";
import { derivedMaterializer } from "./shared.js";

const OPTIONS = Object.freeze([
  "id", "source", "x", "y", "groupBy", "method", "degree", "span",
  "confidence", "interval"
]);

export const materializeRegressionData = derivedMaterializer(
  "materializeRegressionData",
  "Materialize one regression derived dataset.",
  "regression",
  (values, transform) => deriveRegression(values, {
      x: transform.x,
      y: transform.y,
      groupBy: transform.groupBy,
      method: transform.method,
      degree: transform.degree,
      span: transform.span,
      confidence: transform.confidence,
      interval: transform.interval
    })
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
