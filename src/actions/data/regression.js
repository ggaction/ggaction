import { closedAction } from "../../core/action.js";
import { validateUserId } from "../../core/identifiers.js";

import {
  deriveRegression,
  normalizeRegressionTransform
} from "../../grammar/regression/index.js";
import { resolveDatasetReference, requireDataset, findDataset } from "../../selectors/datasets.js";
import { derivedMaterializer } from "./shared.js";

const OPTIONS = Object.freeze([
  "id", "source", "x", "y", "groupBy", "method", "degree", "span", "robustIterations",
  "confidenceMethod", "level", "confidence", "interval"
  , "predict", "missing"
]);

function calculateRegression(values, transform) {
  return deriveRegression(values, transform);
}

function retainFitStatistics(program, { id, result }) {
  return result.fitStatistics === undefined ? program : program._withMaterializationConfig(
    ["regressionFits", id], result.fitStatistics
  );
}

function materializeMissingFitStatistics(program, args) {
  const dataset = findDataset(program, args.id);
  if (dataset?.values === undefined || dataset.transform?.length !== 1 ||
      dataset.transform[0].type !== "regression" || dataset.transform[0].method !== "linear" ||
      program.materializationConfigs.regressionFits?.[dataset.id] !== undefined) return undefined;
  const source = requireDataset(program, dataset.source);
  const result = calculateRegression(source.values, dataset.transform[0]);
  return retainFitStatistics(program, { id: dataset.id, result });
}

export const materializeRegressionData = /* @__PURE__ */ derivedMaterializer(
  "materializeRegressionData",
  "Materialize one regression derived dataset.",
  "regression",
  calculateRegression,
  undefined,
  { before: materializeMissingFitStatistics, after: retainFitStatistics }
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
