import { closedAction } from "../../core/action.js";
import { validateUserId } from "../../core/identifiers.js";
import { requireDataset, resolveDatasetReference, hasDataset, hasDatasetOwner } from "../../selectors/datasets.js";
import {
  requireRegressionStatisticsSource,
  validateRegressionFitStatistics,
  regressionStatisticsRows
} from "../../grammar/regression/statistics.js";
import { requireDerivedDataset } from "./shared.js";
import { resolveDerivedDataOwner, reviseDerivedData } from "./edit.js";

function ensureFitStatistics(program, source) {
  requireRegressionStatisticsSource(source);
  if (!Array.isArray(source.values)) throw new Error("Regression statistics requires a materialized linear fit source.");
  const next = program.materializationConfigs.regressionFits?.[source.id] === undefined
    ? program.materializeRegressionData({ id: source.id }) : program;
  validateRegressionFitStatistics(next.materializationConfigs.regressionFits[source.id], source,
    requireDataset(next, source.source));
  return next;
}

function statisticsOwner(program, target) {
  if (target !== undefined) return resolveDerivedDataOwner(program, target, "regressionStatistics");
  const records = Object.entries(program.materializationConfigs.data?.regressionStatistics ?? {})
    .map(([owner, config]) => ({ owner, current: config.current }));
  const current = records.filter(record => record.current === program.context.currentData);
  const candidate = current.length === 1 ? current[0] : records.length === 1 ? records[0] : undefined;
  if (candidate === undefined) throw new Error(records.length === 0
    ? "No standalone regression statistics dataset is available."
    : "Regression statistics target is ambiguous; provide target.");
  return resolveDerivedDataOwner(program, candidate.owner, "regressionStatistics");
}

export const materializeRegressionStatisticsData = /* @__PURE__ */ closedAction(
  { op: "materializeRegressionStatisticsData", description: "Materialize statistics from an existing linear fit cache." }, ["id"],
  function (args = {}) {
    const { id, source } = requireDerivedDataset(this, args.id, "regressionStatistics");
    const next = ensureFitStatistics(this, source);
    const values = regressionStatisticsRows(next.materializationConfigs.regressionFits[source.id], source);
    return next.editSemantic({ property: `dataset[${id}].values`, value: values });
  }
);

export const createRegressionStatisticsData = /* @__PURE__ */ closedAction(
  { op: "createRegressionStatisticsData", description: "Create counts, coefficients and R-squared from a linear regression dataset." }, ["id", "source"],
  function (args = {}) {
    const id = validateUserId(args.id, "Regression statistics dataset id");
    if (hasDataset(this, id) || hasDatasetOwner(this, id)) throw new Error(`Dataset "${id}" already exists.`);
    const source = resolveDatasetReference(this,
      validateUserId(args.source, "Regression statistics source id"), "Regression statistics source");
    const next = ensureFitStatistics(this, source)
      .createDerivedData({ id, source: source.id, transform: [{ type: "regressionStatistics" }] })
      .materializeRegressionStatisticsData({ id });
    return this.actionStack.length === 1 ? next._withMaterializationConfig(
      ["data", "regressionStatistics", id], { current: id }
    ) : next;
  }
);

export const editRegressionStatisticsData = /* @__PURE__ */ closedAction(
  { op: "editRegressionStatisticsData", description: "Revise the source of a standalone regression statistics dataset." }, ["target", "source"],
  function (args = {}) {
    const resolved = statisticsOwner(this, args.target);
    if (!Object.hasOwn(args, "source")) return this;
    const source = resolveDatasetReference(this,
      validateUserId(args.source, "Regression statistics source id"), "Regression statistics source");
    if (source.id === resolved.dataset.source) return this;
    const next = ensureFitStatistics(this, source);
    return reviseDerivedData(next, {
      resolved, source: source.id, definition: { type: "regressionStatistics" }, dependents: "recompute"
    });
  }
);
