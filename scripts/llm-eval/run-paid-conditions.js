import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import { appendEvaluationResult, runConditionBTask } from "./condition-b-runner.js";
import { runConditionCTask } from "./condition-c-runner.js";
import { loadEvaluationCorpus, validateEvaluationCorpus } from "./corpus.js";
import { loadApiKey } from "./openai-responses.js";

const root = fileURLToPath(new URL("../../", import.meta.url));
const defaultOutputRoot = path.join(root, ".artifacts/llm-eval");
const defaultTokenFile = "/Users/hj/Desktop/visualization-autocomplete/TOKEN.txt";
const runners = Object.freeze({ B: runConditionBTask, C: runConditionCTask });

function argumentValue(name) {
  const index = process.argv.indexOf(name);
  return index === -1 ? undefined : process.argv[index + 1];
}

function orderedRuns(corpus, plan) {
  const runs = [];
  for (let repetition = 1; repetition <= plan.sampling.repetitionsPerTask; repetition += 1) {
    for (const task of corpus.tasks) runs.push({ task, repetition });
  }
  return runs.sort((left, right) => {
    const key = run => createHash("sha256")
      .update(`${plan.sampling.orderSeed}:${run.repetition}:${run.task.id}`)
      .digest("hex");
    return key(left).localeCompare(key(right));
  });
}

async function existingResults(file) {
  try {
    return (await readFile(file, "utf8")).trim().split("\n").filter(Boolean).map(line => JSON.parse(line));
  } catch (error) {
    if (error?.code === "ENOENT") return [];
    throw error;
  }
}

function conditionResultsFile(outputRoot, condition) {
  return path.join(outputRoot, `condition-${condition.toLowerCase()}`, "results.jsonl");
}

export function assertPaidEvaluationPlan(plan) {
  if (plan?.paidConditionsApprovalStatus !== "approved") {
    throw new Error("Paid Condition B/C evaluation is not approved.");
  }
  const budget = plan.paidConditionsBCUsd;
  if (!budget || !Array.isArray(budget.conditions) || budget.conditions.join(",") !== "B,C") {
    throw new Error("Paid Condition B/C budget must cover exactly B and C.");
  }
  for (const field of ["approvedSpendCapPerCondition", "approvedCombinedSpendCap"]) {
    if (!Number.isFinite(budget[field]) || budget[field] <= 0) {
      throw new Error(`Paid Condition B/C ${field} must be positive.`);
    }
  }
  if (budget.approvedSpendCapPerCondition * 2 > budget.approvedCombinedSpendCap) {
    throw new Error("Combined paid-condition spend cap is smaller than both condition caps.");
  }
}

export function remainingPaidBudgetUsd(plan, { conditionSpentUsd, combinedSpentUsd }) {
  assertPaidEvaluationPlan(plan);
  return Math.max(0, Math.min(
    plan.paidConditionsBCUsd.approvedSpendCapPerCondition - conditionSpentUsd,
    plan.paidConditionsBCUsd.approvedCombinedSpendCap - combinedSpentUsd
  ));
}

export async function runPaidCondition({
  condition,
  knowledgeCommit,
  tokenFile = defaultTokenFile,
  outputRoot = defaultOutputRoot,
  limit = Number.POSITIVE_INFINITY,
  fetchImpl = globalThis.fetch
} = {}) {
  if (!(condition in runners)) throw new TypeError("Paid evaluation condition must be B or C.");
  if (typeof knowledgeCommit !== "string" || !/^[0-9a-f]{40}$/.test(knowledgeCommit)) {
    throw new TypeError("Paid evaluation knowledge commit must be an exact lowercase 40-character Git SHA.");
  }
  const corpus = await loadEvaluationCorpus();
  await validateEvaluationCorpus(corpus);
  const plan = JSON.parse(await readFile(new URL("../../test/llm/evaluation-plan.json", import.meta.url), "utf8"));
  assertPaidEvaluationPlan(plan);
  const apiKey = await loadApiKey(tokenFile);
  const resultsFile = conditionResultsFile(outputRoot, condition);
  const allPrior = Object.fromEntries(await Promise.all(["B", "C"].map(async candidate => [
    candidate,
    await existingResults(conditionResultsFile(outputRoot, candidate))
  ])));
  const prior = allPrior[condition];
  const completed = new Set(prior.map(result => result.runId));
  let conditionSpentUsd = prior.reduce((sum, result) => sum + result.metrics.estimatedCostUsd, 0);
  let combinedSpentUsd = Object.values(allPrior).flat()
    .reduce((sum, result) => sum + result.metrics.estimatedCostUsd, 0);
  let executed = 0;
  let consecutiveProviderErrors = 0;

  for (const run of orderedRuns(corpus, plan)) {
    if (executed >= limit) break;
    const runId = `${condition}-${run.task.id}-r${run.repetition}`;
    if (completed.has(runId)) continue;
    const remainingSpendUsd = remainingPaidBudgetUsd(plan, { conditionSpentUsd, combinedSpentUsd });
    if (remainingSpendUsd <= 0) throw new Error("Approved paid Condition B/C spend cap has been reached.");
    const result = await runners[condition]({
      knowledgeCommit,
      apiKey,
      corpus,
      task: run.task,
      repetition: run.repetition,
      plan,
      outputRoot: path.dirname(resultsFile),
      fetchImpl,
      remainingSpendUsd
    });
    await appendEvaluationResult(resultsFile, result);
    conditionSpentUsd += result.metrics.estimatedCostUsd;
    combinedSpentUsd += result.metrics.estimatedCostUsd;
    executed += 1;
    consecutiveProviderErrors = result.outcome.failureCategory === "provider-error"
      ? consecutiveProviderErrors + 1
      : 0;
    process.stdout.write(`${JSON.stringify({
      runId: result.runId,
      finalValid: result.outcome.finalValid,
      failureCategory: result.outcome.failureCategory,
      resolvedModel: result.model.resolvedName,
      modelCalls: result.metrics.modelCalls,
      mcpCalls: result.metrics.mcpCalls,
      totalTokens: result.metrics.totalTokens,
      costUsd: Number(result.metrics.estimatedCostUsd.toFixed(6)),
      conditionCostUsd: Number(conditionSpentUsd.toFixed(6)),
      combinedCostUsd: Number(combinedSpentUsd.toFixed(6))
    })}\n`);
    if (result.model.resolvedName !== plan.model.name) {
      throw new Error(`Resolved model mismatch: expected ${plan.model.name}, received ${result.model.resolvedName}.`);
    }
    if (consecutiveProviderErrors >= 3) {
      throw new Error("Paid evaluation stopped after three consecutive provider errors.");
    }
  }
  return {
    condition,
    resultsFile,
    executed,
    totalResults: prior.length + executed,
    conditionSpentUsd,
    combinedSpentUsd
  };
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  const limitValue = argumentValue("--limit");
  const result = await runPaidCondition({
    condition: argumentValue("--condition"),
    knowledgeCommit: argumentValue("--knowledge-commit"),
    tokenFile: argumentValue("--token-file") ?? defaultTokenFile,
    outputRoot: argumentValue("--output-root") ?? defaultOutputRoot,
    limit: limitValue === undefined ? Number.POSITIVE_INFINITY : Number(limitValue)
  });
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
}
