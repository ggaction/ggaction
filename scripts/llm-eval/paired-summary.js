import { createHash } from "node:crypto";

const comparisonPairs = Object.freeze([
  Object.freeze({ id: "transport-b-vs-c", left: "B", right: "C", purpose: "structured transport isolation" }),
  Object.freeze({ id: "product-a-vs-c", left: "A", right: "C", purpose: "MCP product effect against docs" }),
  Object.freeze({ id: "product-a-vs-d", left: "A", right: "D", purpose: "docs plus MCP product effect against docs" })
]);
const efficiencyMetrics = Object.freeze([
  "totalTokens",
  "modelCalls",
  "knowledgeToolCalls",
  "knowledgeToolCallsExecuted",
  "knowledgeToolCallsRejected",
  "taskLoopDurationMs",
  "endToEndDurationMs",
  "estimatedCostUsd"
]);

function invariant(condition, message) {
  if (!condition) throw new Error(message);
}

function mean(values) {
  return values.length === 0 ? null : values.reduce((sum, value) => sum + value, 0) / values.length;
}

function median(values) {
  if (values.length === 0) return null;
  const sorted = values.toSorted((left, right) => left - right);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 1 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
}

function seededRandom(label) {
  let state = createHash("sha256").update(label).digest().readUInt32LE(0);
  return () => {
    state += 0x6d2b79f5;
    let value = state;
    value = Math.imul(value ^ value >>> 15, value | 1);
    value ^= value + Math.imul(value ^ value >>> 7, value | 61);
    return ((value ^ value >>> 14) >>> 0) / 4294967296;
  };
}

function taskBootstrap(valuesByTask, label, iterations = 2000) {
  const taskValues = [...valuesByTask.values()].map(mean);
  if (taskValues.length === 0) return { unit: "task", taskCount: 0, iterations, lower95: null, upper95: null };
  const random = seededRandom(label);
  const samples = [];
  for (let iteration = 0; iteration < iterations; iteration += 1) {
    let total = 0;
    for (let index = 0; index < taskValues.length; index += 1) {
      total += taskValues[Math.floor(random() * taskValues.length)];
    }
    samples.push(total / taskValues.length);
  }
  samples.sort((left, right) => left - right);
  return {
    unit: "task",
    taskCount: taskValues.length,
    iterations,
    lower95: samples[Math.floor((samples.length - 1) * 0.025)],
    upper95: samples[Math.ceil((samples.length - 1) * 0.975)]
  };
}

function groupedValues(rows, value) {
  const grouped = new Map();
  for (const row of rows) {
    if (!grouped.has(row.taskId)) grouped.set(row.taskId, []);
    grouped.get(row.taskId).push(value(row));
  }
  return grouped;
}

function stageSummary(rows, { id, eligible = () => true, success }) {
  const considered = rows.filter(eligible);
  const successful = considered.filter(success);
  const byTask = groupedValues(considered, row => success(row) ? 1 : 0);
  const taskRates = [...byTask.values()].map(mean);
  return {
    eligibleRuns: considered.length,
    successfulRuns: successful.length,
    runRate: considered.length === 0 ? null : successful.length / considered.length,
    rate: mean(taskRates),
    uncertainty95: taskBootstrap(byTask, `stage:${id}`)
  };
}

function sumMetric(rows, metric) {
  return rows.reduce((sum, row) => sum + (row.metrics?.[metric] ?? 0), 0);
}

function conditionSummary(condition, rows) {
  const failures = rows.filter(row => !row.outcome.finalValid);
  const failureCategories = Object.fromEntries([...new Set(failures.map(row => row.outcome.failureCategory))]
    .sort()
    .map(category => [category, failures.filter(row => row.outcome.failureCategory === category).length]));
  return {
    condition,
    runs: rows.length,
    tasks: new Set(rows.map(row => row.taskId)).size,
    stages: {
      retrieval: stageSummary(rows, {
        id: `${condition}:retrieval`,
        success: row => row.outcome.retrievalSucceeded
      }),
      naturalSubmission: stageSummary(rows, {
        id: `${condition}:natural-submission`,
        success: row => row.outcome.naturalSubmission
      }),
      forcedSubmissionCorrectness: stageSummary(rows, {
        id: `${condition}:forced-correctness`,
        eligible: row => row.outcome.forcedSubmissionUsed,
        success: row => row.outcome.finalValid
      }),
      firstSubmissionCorrectness: stageSummary(rows, {
        id: `${condition}:first-correctness`,
        eligible: row => row.metrics.submissions > 0,
        success: row => row.outcome.firstSubmissionValid
      }),
      finalCorrectness: stageSummary(rows, {
        id: `${condition}:final-correctness`,
        success: row => row.outcome.finalValid
      })
    },
    allRunCost: Object.fromEntries([
      ...efficiencyMetrics.map(metric => [metric, sumMetric(rows, metric)]),
      ["mcpOperations", rows.reduce((sum, row) => sum + (row.metrics.mcpOperations?.total ?? 0), 0)]
    ]),
    failureCost: {
      runs: failures.length,
      categories: failureCategories,
      ...Object.fromEntries(efficiencyMetrics.map(metric => [metric, sumMetric(failures, metric)])),
      mcpOperations: failures.reduce((sum, row) => sum + (row.metrics.mcpOperations?.total ?? 0), 0)
    }
  };
}

function keyOf(row) {
  return `${row.taskId}:r${row.repetition}`;
}

function metricComparison(successfulPairs, metric, label) {
  const pairValues = successfulPairs.map(({ left, right }) => ({
    taskId: left.taskId,
    delta: right.metrics[metric] - left.metrics[metric],
    relativeReduction: left.metrics[metric] === 0
      ? null
      : (left.metrics[metric] - right.metrics[metric]) / left.metrics[metric]
  }));
  const deltasByTask = groupedValues(pairValues, pair => pair.delta);
  const reductionsByTask = groupedValues(
    pairValues.filter(pair => Number.isFinite(pair.relativeReduction)),
    pair => pair.relativeReduction
  );
  return {
    direction: "right-minus-left",
    pairedRunCount: pairValues.length,
    taskCount: deltasByTask.size,
    meanDelta: mean([...deltasByTask.values()].map(mean)),
    medianDelta: median([...deltasByTask.values()].map(mean)),
    meanRelativeReduction: mean([...reductionsByTask.values()].map(mean)),
    uncertainty95: taskBootstrap(deltasByTask, `${label}:${metric}`)
  };
}

function pairedComparison(pair, rows) {
  const leftRows = rows.filter(row => row.condition === pair.left);
  const rightRows = rows.filter(row => row.condition === pair.right);
  const leftByKey = new Map(leftRows.map(row => [keyOf(row), row]));
  const rightByKey = new Map(rightRows.map(row => [keyOf(row), row]));
  const matchedKeys = [...leftByKey.keys()].filter(key => rightByKey.has(key)).sort();
  const successfulPairs = matchedKeys.flatMap(key => {
    const left = leftByKey.get(key);
    const right = rightByKey.get(key);
    return left.outcome.finalValid && right.outcome.finalValid ? [{ left, right }] : [];
  });
  return {
    ...pair,
    matchedRuns: matchedKeys.length,
    successfulPairs: successfulPairs.length,
    pairedCoverage: matchedKeys.length === 0 ? null : successfulPairs.length / matchedKeys.length,
    excludedFailedPairs: matchedKeys.length - successfulPairs.length,
    metrics: Object.fromEntries(efficiencyMetrics.map(metric => [
      metric,
      metricComparison(successfulPairs, metric, pair.id)
    ]))
  };
}

function validateRows(rows) {
  invariant(Array.isArray(rows) && rows.length > 0, "Paired summary requires results.");
  const keys = rows.map(row => `${row.condition}:${keyOf(row)}`);
  invariant(new Set(keys).size === keys.length, "Paired summary received a duplicate condition/task/repetition result.");
  invariant(rows.every(row => ["A", "B", "C", "D"].includes(row.condition)), "Paired summary received an unknown condition.");
  invariant(rows.every(row => row.schemaVersion === 2), "Paired summary requires result schemaVersion 2.");
  invariant(rows.every(row => efficiencyMetrics.every(metric => Number.isFinite(row.metrics?.[metric]) && row.metrics[metric] >= 0)),
    "Paired summary requires finite non-negative efficiency metrics.");
  const commits = new Set(rows.map(row => row.knowledge.commit));
  invariant(commits.size === 1, "Paired summary cannot mix candidate commits.");
  const modelSettings = new Set(rows.map(row => JSON.stringify({
    provider: row.model.provider,
    name: row.model.name,
    reasoningEffort: row.model.reasoningEffort,
    textVerbosity: row.model.textVerbosity,
    serviceTier: row.model.serviceTier,
    store: row.model.store
  })));
  invariant(modelSettings.size === 1, "Paired summary cannot mix model settings.");
}

export function summarizePairedEvaluationResults(rows, { corpusSha256 = null } = {}) {
  validateRows(rows);
  return Object.freeze({
    schemaVersion: 1,
    candidateCommit: rows[0].knowledge.commit,
    corpusSha256,
    analysisUnit: "task",
    repetitionPolicy: "Repetitions are grouped within tasks and are not independent task samples.",
    conditions: Object.fromEntries(["A", "B", "C", "D"].map(condition => [
      condition,
      conditionSummary(condition, rows.filter(row => row.condition === condition))
    ])),
    comparisons: Object.fromEntries(comparisonPairs.map(pair => [pair.id, pairedComparison(pair, rows)]))
  });
}
