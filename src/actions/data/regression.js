import { closedAction } from "../../core/action.js";
import { validateUserId } from "../../core/identifiers.js";

import {
  deriveRegression,
  normalizeRegressionTransform
} from "../../grammar/regression/index.js";
import { resolveDatasetReference } from "../../selectors/datasets.js";
import { derivedMaterializer } from "./shared.js";

const OPTIONS = Object.freeze([
  "id", "source", "x", "y", "groupBy", "method", "degree", "span",
  "confidenceMethod", "level", "confidence", "interval"
  , "predict", "missing"
]);

export const materializeRegressionData = /* @__PURE__ */ derivedMaterializer(
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
      confidenceMethod: transform.confidenceMethod,
      level: transform.level,
      confidence: transform.confidence,
      interval: transform.interval,
      predict: transform.predict
      , missing: transform.missing
    })
);

export const createRegressionData = /* @__PURE__ */ closedAction(
  { op: "createRegressionData", description: "Create grouped regression values and optional interval bounds." }, OPTIONS,
  function (args = {}) {
    const id = validateUserId(args.id, "Regression dataset id");
    const requestedSource = validateUserId(
      args.source ?? this.context.currentData,
      "Source dataset id"
    );
    const source = resolveDatasetReference(
      this,
      requestedSource,
      "Regression source dataset"
    ).id;
    const transform = normalizeRegressionTransform(args);
    const next = this
      .createDerivedData({ id, source, transform: [transform] })
      .materializeRegressionData({ id });
    return this.actionStack.length === 1
      ? next._withMaterializationConfig(
          ["data", "regression", id],
          { current: id }
        )
      : next;
  }
);
