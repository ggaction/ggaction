import { createHash } from "node:crypto";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import { appendEvaluationResult, runConditionBTask } from "./condition-b-runner.js";
import { runConditionCTask } from "./condition-c-runner.js";
import { loadEvaluationCorpus, validateEvaluationCorpus } from "./corpus.js";
import { loadApiKey } from "./openai-responses.js";

const root = fileURLToPath(new URL("../../", import.meta.url));
const defaultSmokePlanFile = path.join(root, "test/llm/corrective-smoke-plan.json");
const retrySmokePlanFile = path.join(root, "test/llm/corrective-smoke-retry-plan.json");
const evaluationPlanFile = path.join(root, "test/llm/evaluation-plan.json");
const corpusFile = path.join(root, "test/llm/tasks.json");
const defaultTokenFile = "/Users/hj/Desktop/visualization-autocomplete/TOKEN.txt";
const runners = Object.freeze({ B: runConditionBTask, C: runConditionCTask });

const initialApprovedContract = Object.freeze({
  candidateCommit: "ea50b0c15d9f747b6e5b8e41ded657d67868fa3a",
  taskId: "cars-scatter-origin",
  repetition: 1,
  conditions: Object.freeze(["B", "C"]),
  maximumRuns: 2,
  outputRoot: ".artifacts/llm-eval/corrective-smoke-ea50b0c1",
  approvedCapPerCondition: 0.2,
  approvedCombinedCap: 0.4
});

const retryApprovedContract = Object.freeze({
  candidateCommit: "060a13f1017485f2a19579ef640a768b86a63417",
  taskId: "cars-scatter-origin",
  repetition: 1,
  conditions: Object.freeze(["B", "C"]),
  maximumRuns: 2,
  outputRoot: ".artifacts/llm-eval/corrective-smoke-retry-060a13f1",
  approvedCapPerCondition: 0.2,
  approvedCombinedCap: 0.4
});

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function requireCondition(value, message) {
  if (!value) throw new Error(message);
}

function exactArray(actual, expected) {
  return Array.isArray(actual) && actual.length === expected.length &&
    actual.every((value, index) => value === expected[index]);
}

function resolvedOutputRoot(smokePlan) {
  requireCondition(
    typeof smokePlan.outputRoot === "string" && !path.isAbsolute(smokePlan.outputRoot),
    "Corrective smoke outputRoot must be repository-relative."
  );
  const resolved = path.resolve(root, smokePlan.outputRoot);
  const relative = path.relative(path.join(root, ".artifacts", "llm-eval"), resolved);
  requireCondition(
    relative.length > 0 && !relative.startsWith("..") && !path.isAbsolute(relative),
    "Corrective smoke outputRoot must be a dedicated child of .artifacts/llm-eval/."
  );
  return resolved;
}

function assertApprovedSmokePlan(smokePlan, approvedContract, { evaluationPlanBytes, corpusBytes } = {}) {
  requireCondition(smokePlan?.schemaVersion === 1, "Corrective smoke schemaVersion must be 1.");
  requireCondition(smokePlan.approvalStatus === "approved", "Corrective paid smoke is not approved.");
  requireCondition(smokePlan.candidateCommit === approvedContract.candidateCommit, "Corrective smoke candidate SHA changed.");
  requireCondition(smokePlan.taskId === approvedContract.taskId, "Corrective smoke task changed.");
  requireCondition(smokePlan.repetition === approvedContract.repetition, "Corrective smoke repetition changed.");
  requireCondition(exactArray(smokePlan.conditions, approvedContract.conditions), "Corrective smoke conditions must be B then C.");
  requireCondition(smokePlan.maximumRuns === approvedContract.maximumRuns, "Corrective smoke run count changed.");
  requireCondition(smokePlan.outputRoot === approvedContract.outputRoot, "Corrective smoke output root changed.");
  requireCondition(
    smokePlan.spendUsd?.approvedCapPerCondition === approvedContract.approvedCapPerCondition &&
      smokePlan.spendUsd?.approvedCombinedCap === approvedContract.approvedCombinedCap,
    "Corrective smoke spend cap changed."
  );
  if (evaluationPlanBytes !== undefined) {
    requireCondition(
      sha256(evaluationPlanBytes) === smokePlan.evaluationPlanSha256,
      "Frozen evaluation plan digest changed."
    );
  }
  if (corpusBytes !== undefined) {
    requireCondition(sha256(corpusBytes) === smokePlan.corpusSha256, "Frozen corpus digest changed.");
  }
  resolvedOutputRoot(smokePlan);
  return smokePlan;
}

export function assertCorrectiveSmokePlan(smokePlan, hashes = {}) {
  return assertApprovedSmokePlan(smokePlan, initialApprovedContract, hashes);
}

export function assertCorrectiveSmokeRetryPlan(smokePlan, hashes = {}) {
  return assertApprovedSmokePlan(smokePlan, retryApprovedContract, hashes);
}

async function prepareApprovedSmoke(smokePlanFile, approvedContract) {
  const [smokePlanBytes, evaluationPlanBytes, corpusBytes] = await Promise.all([
    readFile(smokePlanFile),
    readFile(evaluationPlanFile),
    readFile(corpusFile)
  ]);
  const smokePlan = assertApprovedSmokePlan(JSON.parse(smokePlanBytes), approvedContract, {
    evaluationPlanBytes,
    corpusBytes
  });
  const evaluationPlan = JSON.parse(evaluationPlanBytes);
  const corpus = await loadEvaluationCorpus(corpusFile);
  await validateEvaluationCorpus(corpus);
  const task = corpus.tasks.find(candidate => candidate.id === smokePlan.taskId);
  requireCondition(task !== undefined, `Unknown corrective smoke task ${smokePlan.taskId}.`);
  return Object.freeze({
    smokePlan,
    evaluationPlan,
    corpus,
    task,
    outputRoot: resolvedOutputRoot(smokePlan)
  });
}

export function prepareCorrectiveSmoke(smokePlanFile = defaultSmokePlanFile) {
  return prepareApprovedSmoke(smokePlanFile, initialApprovedContract);
}

export function prepareCorrectiveSmokeRetry(smokePlanFile = retrySmokePlanFile) {
  return prepareApprovedSmoke(smokePlanFile, retryApprovedContract);
}

async function requireEmptyOutputRoot(outputRoot) {
  try {
    requireCondition((await readdir(outputRoot)).length === 0, "Corrective smoke output root is not empty.");
  } catch (error) {
    if (error?.code !== "ENOENT") throw error;
  }
}

function unsafeOutcome(result, expectedModel) {
  return result.model.resolvedName !== expectedModel ||
    ["provider-error", "budget-exceeded", "timeout"].includes(result.outcome.failureCategory);
}

export async function runCorrectiveSmokeSequence({
  prepared,
  apiKey,
  fetchImpl = globalThis.fetch,
  runnersByCondition = runners,
  appendResult = appendEvaluationResult
}) {
  const { smokePlan, evaluationPlan, corpus, task, outputRoot } = prepared;
  const results = [];
  let combinedSpendUsd = 0;
  for (const condition of smokePlan.conditions) {
    const conditionRoot = path.join(outputRoot, `condition-${condition.toLowerCase()}`);
    const remainingSpendUsd = Math.min(
      smokePlan.spendUsd.approvedCapPerCondition,
      smokePlan.spendUsd.approvedCombinedCap - combinedSpendUsd
    );
    requireCondition(remainingSpendUsd > 0, "Corrective smoke combined spend cap was reached.");
    const result = await runnersByCondition[condition]({
      knowledgeCommit: smokePlan.candidateCommit,
      apiKey,
      corpus,
      task,
      repetition: smokePlan.repetition,
      plan: evaluationPlan,
      outputRoot: conditionRoot,
      fetchImpl,
      remainingSpendUsd
    });
    await appendResult(path.join(conditionRoot, "results.jsonl"), result);
    combinedSpendUsd += result.metrics.estimatedCostUsd;
    results.push(result);
    if (unsafeOutcome(result, evaluationPlan.model.name)) break;
  }
  return Object.freeze({
    schemaVersion: 1,
    candidateCommit: smokePlan.candidateCommit,
    taskId: smokePlan.taskId,
    outputRoot: smokePlan.outputRoot,
    approvedCombinedCapUsd: smokePlan.spendUsd.approvedCombinedCap,
    actualCombinedSpendUsd: combinedSpendUsd,
    results: Object.freeze(results)
  });
}

async function runApprovedCorrectiveSmoke({
  prepare,
  tokenFile = defaultTokenFile,
  fetchImpl = globalThis.fetch,
  loadApiKeyImpl = loadApiKey
}) {
  const prepared = await prepare();
  await requireEmptyOutputRoot(prepared.outputRoot);

  const apiKey = await loadApiKeyImpl(tokenFile);
  return runCorrectiveSmokeSequence({
    prepared,
    apiKey,
    fetchImpl
  });
}

export function runCorrectiveSmoke({
  smokePlanFile = defaultSmokePlanFile,
  ...options
} = {}) {
  return runApprovedCorrectiveSmoke({
    ...options,
    prepare: () => prepareCorrectiveSmoke(smokePlanFile)
  });
}

export function runCorrectiveSmokeRetry(options = {}) {
  return runApprovedCorrectiveSmoke({
    ...options,
    prepare: () => prepareCorrectiveSmokeRetry()
  });
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  process.stdout.write(`${JSON.stringify(await runCorrectiveSmoke(), null, 2)}\n`);
}
