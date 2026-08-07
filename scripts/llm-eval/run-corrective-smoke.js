import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import { appendEvaluationResult, runConditionBTask } from "./condition-b-runner.js";
import { assertArchivedEvaluationExecution } from "./archived-evaluation.js";
import { runConditionCTask } from "./condition-c-runner.js";
import { loadEvaluationCorpus, validateEvaluationCorpus } from "./corpus.js";
import { loadApiKey } from "./openai-responses.js";

const root = fileURLToPath(new URL("../../", import.meta.url));
const defaultSmokePlanFile = path.join(root, "test/llm/corrective-smoke-plan.json");
const retrySmokePlanFile = path.join(root, "test/llm/corrective-smoke-retry-plan.json");
const executableRecipeSmokePlanFile = path.join(root, "test/llm/executable-recipe-smoke-plan.json");
const evaluationPlanFile = path.join(root, "test/llm/evaluation-plan.json");
const corpusFile = path.join(root, "test/llm/tasks.json");
const knowledgeFile = path.join(root, "knowledge/index.json");
const knowledgeSearchFile = path.join(root, "knowledge/search-index.json");
const publicRecipeFile = path.join(root, "docs/llms-recipes.json");
const defaultTokenFile = "/Users/hj/Desktop/visualization-autocomplete/TOKEN.txt";
const runners = Object.freeze({ B: runConditionBTask, C: runConditionCTask });

const initialApprovedContract = Object.freeze({
  candidateCommit: "ea50b0c15d9f747b6e5b8e41ded657d67868fa3a",
  taskId: "cars-scatter-origin",
  repetition: 1,
  conditions: Object.freeze(["B", "C"]),
  maximumRuns: 2,
  outputRoot: ".artifacts/llm-eval/corrective-smoke-ea50b0c1",
  expectedPerRun: 0.072,
  calculatedMaximumPerRun: 0.156,
  approvedCapPerCondition: 0.2,
  approvedCombinedCap: 0.4,
  evaluationPlanSha256: "c30b33a7d3b2f5118a8d8b8818023339a1f01f6170fba62edaf7ed8feefc1671",
  corpusSha256: "1a87b9b9cbbcd382aef6f82c94bf2080b545425be5d366a95b29cb3b1c942ad1"
});

const retryApprovedContract = Object.freeze({
  candidateCommit: "060a13f1017485f2a19579ef640a768b86a63417",
  taskId: "cars-scatter-origin",
  repetition: 1,
  conditions: Object.freeze(["B", "C"]),
  maximumRuns: 2,
  outputRoot: ".artifacts/llm-eval/corrective-smoke-retry-060a13f1",
  expectedPerRun: 0.072,
  calculatedMaximumPerRun: 0.156,
  approvedCapPerCondition: 0.2,
  approvedCombinedCap: 0.4,
  evaluationPlanSha256: "c30b33a7d3b2f5118a8d8b8818023339a1f01f6170fba62edaf7ed8feefc1671",
  corpusSha256: "1a87b9b9cbbcd382aef6f82c94bf2080b545425be5d366a95b29cb3b1c942ad1"
});

const executableRecipeApprovedContract = Object.freeze({
  candidateCommit: "e88fbea9761ddc46268c400be1af280e838b71a2",
  taskId: "cars-scatter-origin",
  repetition: 1,
  conditions: Object.freeze(["B", "C"]),
  maximumRuns: 2,
  outputRoot: ".artifacts/llm-eval/executable-recipe-smoke-e88fbea9",
  expectedPerRun: 0.025,
  calculatedMaximumPerRun: 0.156,
  approvedCapPerCondition: 0.1,
  approvedCombinedCap: 0.2,
  evaluationPlanSha256: "c30b33a7d3b2f5118a8d8b8818023339a1f01f6170fba62edaf7ed8feefc1671",
  corpusSha256: "1a87b9b9cbbcd382aef6f82c94bf2080b545425be5d366a95b29cb3b1c942ad1",
  knowledgeSha256: "eba175e202473c54202e0f5be6f988064efd2ba0790c46b8218119e758a254bf",
  knowledgeSearchSha256: "58fdde3a8069cb207cdef655b0dbe0a08a1adc055ab314c6646451caaa54ca52",
  publicRecipeSha256: "f94e5b3197c1ade2b1da4b2aca8a59820e5384a5202ad252a77e0ceba722fe92"
});

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

function assertApprovedSmokePlan(smokePlan, approvedContract) {
  requireCondition(smokePlan?.schemaVersion === 1, "Corrective smoke schemaVersion must be 1.");
  requireCondition(smokePlan.approvalStatus === "approved", "Corrective paid smoke is not approved.");
  requireCondition(smokePlan.candidateCommit === approvedContract.candidateCommit, "Corrective smoke candidate SHA changed.");
  requireCondition(smokePlan.taskId === approvedContract.taskId, "Corrective smoke task changed.");
  requireCondition(smokePlan.repetition === approvedContract.repetition, "Corrective smoke repetition changed.");
  requireCondition(exactArray(smokePlan.conditions, approvedContract.conditions), "Corrective smoke conditions must be B then C.");
  requireCondition(smokePlan.maximumRuns === approvedContract.maximumRuns, "Corrective smoke run count changed.");
  requireCondition(smokePlan.outputRoot === approvedContract.outputRoot, "Corrective smoke output root changed.");
  requireCondition(
    smokePlan.spendUsd?.expectedPerRun === approvedContract.expectedPerRun &&
      smokePlan.spendUsd?.calculatedMaximumPerRun === approvedContract.calculatedMaximumPerRun &&
      smokePlan.spendUsd?.approvedCapPerCondition === approvedContract.approvedCapPerCondition &&
      smokePlan.spendUsd?.approvedCombinedCap === approvedContract.approvedCombinedCap,
    "Corrective smoke spend cap changed."
  );
  for (const field of ["evaluationPlanSha256", "corpusSha256"]) {
    requireCondition(smokePlan[field] === approvedContract[field], `Corrective smoke ${field} changed.`);
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

export function assertExecutableRecipeSmokePlan(smokePlan, hashes = {}) {
  const validated = assertApprovedSmokePlan(smokePlan, executableRecipeApprovedContract, hashes);
  for (const field of ["knowledgeSha256", "knowledgeSearchSha256", "publicRecipeSha256"]) {
    requireCondition(smokePlan[field] === executableRecipeApprovedContract[field], `Executable recipe smoke ${field} changed.`);
  }
  return validated;
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

export async function prepareExecutableRecipeSmoke(smokePlanFile = executableRecipeSmokePlanFile) {
  const [
    smokePlanBytes,
    evaluationPlanBytes,
    corpusBytes,
    knowledgeBytes,
    knowledgeSearchBytes,
    publicRecipeBytes
  ] = await Promise.all([
    readFile(smokePlanFile),
    readFile(evaluationPlanFile),
    readFile(corpusFile),
    readFile(knowledgeFile),
    readFile(knowledgeSearchFile),
    readFile(publicRecipeFile)
  ]);
  const smokePlan = assertExecutableRecipeSmokePlan(JSON.parse(smokePlanBytes), {
    evaluationPlanBytes,
    corpusBytes,
    knowledgeBytes,
    knowledgeSearchBytes,
    publicRecipeBytes
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
  appendResult = appendEvaluationResult,
  stopAfterInvalid = false
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
    if (unsafeOutcome(result, evaluationPlan.model.name) || (stopAfterInvalid && !result.outcome.finalValid)) break;
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
  loadApiKeyImpl = loadApiKey,
  stopAfterInvalid = false
}) {
  const prepared = await prepare();
  await requireEmptyOutputRoot(prepared.outputRoot);
  assertArchivedEvaluationExecution(prepared.smokePlan.candidateCommit);

  const apiKey = await loadApiKeyImpl(tokenFile);
  return runCorrectiveSmokeSequence({
    prepared,
    apiKey,
    fetchImpl,
    stopAfterInvalid
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

export function runExecutableRecipeSmoke({
  smokePlanFile = executableRecipeSmokePlanFile,
  ...options
} = {}) {
  return runApprovedCorrectiveSmoke({
    ...options,
    stopAfterInvalid: true,
    prepare: () => prepareExecutableRecipeSmoke(smokePlanFile)
  });
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  process.stdout.write(`${JSON.stringify(await runCorrectiveSmoke(), null, 2)}\n`);
}
