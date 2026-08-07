import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import { appendEvaluationResult, runConditionBTask } from "./condition-b-runner.js";
import { assertArchivedEvaluationExecution } from "./archived-evaluation.js";
import { runConditionCTask } from "./condition-c-runner.js";
import { loadEvaluationCorpus, validateEvaluationCorpus } from "./corpus.js";
import { loadApiKey } from "./openai-responses.js";

const root = fileURLToPath(new URL("../../", import.meta.url));
const defaultPlanFile = path.join(root, "test/llm/systematic-recipe-smoke-plan.json");
const evaluationPlanFile = path.join(root, "test/llm/evaluation-plan.json");
const corpusFile = path.join(root, "test/llm/tasks.json");
const knowledgeFile = path.join(root, "knowledge/index.json");
const knowledgeSearchFile = path.join(root, "knowledge/search-index.json");
const publicRecipeFile = path.join(root, "docs/llms-recipes.json");
const defaultTokenFile = "/Users/hj/Desktop/visualization-autocomplete/TOKEN.txt";
const runners = Object.freeze({ B: runConditionBTask, C: runConditionCTask });

const approvedContract = Object.freeze({
  candidateCommit: "a44d3d4eb2c99526f8174d6af5fa2ebed087ec60",
  taskIds: Object.freeze(["cars-box-plot", "composed-dashboard", "renderer-parity"]),
  repetition: 1,
  conditions: Object.freeze(["B", "C"]),
  maximumRuns: 6,
  outputRoot: ".artifacts/llm-eval/systematic-recipe-smoke-a44d3d4e",
  expectedPerRun: 0.025,
  calculatedMaximumPerRun: 0.156,
  approvedCapPerCondition: 0.3,
  approvedCombinedCap: 0.6,
  evaluationPlanSha256: "c30b33a7d3b2f5118a8d8b8818023339a1f01f6170fba62edaf7ed8feefc1671",
  corpusSha256: "1a87b9b9cbbcd382aef6f82c94bf2080b545425be5d366a95b29cb3b1c942ad1",
  knowledgeSha256: "c8bd63f75021673a86c4d2f22a941cbb24647f8b0f4b615400148ce4934d504c",
  knowledgeSearchSha256: "df98a5216253af792fb1c1b4765127199c3bb2a91288c96d12808f25119538ed",
  publicRecipeSha256: "f0452d6d235618fc45e3dfaad20ade128096d39379371d0b842a7f114d0efa13"
});

function requireCondition(value, message) {
  if (!value) throw new Error(message);
}

function exactArray(actual, expected) {
  return Array.isArray(actual) && actual.length === expected.length &&
    actual.every((value, index) => value === expected[index]);
}

function resolvedOutputRoot(plan) {
  requireCondition(
    typeof plan.outputRoot === "string" && !path.isAbsolute(plan.outputRoot),
    "Systematic recipe smoke outputRoot must be repository-relative."
  );
  const resolved = path.resolve(root, plan.outputRoot);
  const relative = path.relative(path.join(root, ".artifacts", "llm-eval"), resolved);
  requireCondition(
    relative.length > 0 && !relative.startsWith("..") && !path.isAbsolute(relative),
    "Systematic recipe smoke outputRoot must be a dedicated child of .artifacts/llm-eval/."
  );
  return resolved;
}

export function assertSystematicRecipeSmokePlan(plan, _hashes = {}) {
  requireCondition(plan?.schemaVersion === 1, "Systematic recipe smoke schemaVersion must be 1.");
  requireCondition(plan.approvalStatus === "approved", "Systematic recipe paid smoke is not approved.");
  requireCondition(plan.candidateCommit === approvedContract.candidateCommit, "Systematic recipe smoke candidate SHA changed.");
  requireCondition(exactArray(plan.taskIds, approvedContract.taskIds), "Systematic recipe smoke task order changed.");
  requireCondition(plan.repetition === approvedContract.repetition, "Systematic recipe smoke repetition changed.");
  requireCondition(exactArray(plan.conditions, approvedContract.conditions), "Systematic recipe smoke conditions must be B then C.");
  requireCondition(plan.maximumRuns === approvedContract.maximumRuns, "Systematic recipe smoke run count changed.");
  requireCondition(plan.outputRoot === approvedContract.outputRoot, "Systematic recipe smoke output root changed.");
  requireCondition(
    plan.spendUsd?.expectedPerRun === approvedContract.expectedPerRun &&
      plan.spendUsd?.calculatedMaximumPerRun === approvedContract.calculatedMaximumPerRun &&
      plan.spendUsd?.approvedCapPerCondition === approvedContract.approvedCapPerCondition &&
      plan.spendUsd?.approvedCombinedCap === approvedContract.approvedCombinedCap,
    "Systematic recipe smoke spend cap changed."
  );
  for (const field of [
    "evaluationPlanSha256", "corpusSha256", "knowledgeSha256", "knowledgeSearchSha256", "publicRecipeSha256"
  ]) {
    requireCondition(plan[field] === approvedContract[field], `Systematic recipe smoke ${field} changed.`);
  }
  resolvedOutputRoot(plan);
  return plan;
}

export async function prepareSystematicRecipeSmoke(planFile = defaultPlanFile) {
  const [
    planBytes,
    evaluationPlanBytes,
    corpusBytes,
    knowledgeBytes,
    knowledgeSearchBytes,
    publicRecipeBytes
  ] = await Promise.all([
    readFile(planFile),
    readFile(evaluationPlanFile),
    readFile(corpusFile),
    readFile(knowledgeFile),
    readFile(knowledgeSearchFile),
    readFile(publicRecipeFile)
  ]);
  const plan = assertSystematicRecipeSmokePlan(JSON.parse(planBytes), {
    evaluationPlanBytes,
    corpusBytes,
    knowledgeBytes,
    knowledgeSearchBytes,
    publicRecipeBytes
  });
  const evaluationPlan = JSON.parse(evaluationPlanBytes);
  const corpus = await loadEvaluationCorpus(corpusFile);
  await validateEvaluationCorpus(corpus);
  const tasks = plan.taskIds.map(taskId => {
    const task = corpus.tasks.find(candidate => candidate.id === taskId);
    requireCondition(task !== undefined, `Unknown systematic recipe smoke task ${taskId}.`);
    return task;
  });
  return Object.freeze({
    plan,
    evaluationPlan,
    corpus,
    tasks: Object.freeze(tasks),
    outputRoot: resolvedOutputRoot(plan)
  });
}

export async function requireEmptySystematicSmokeRoot(outputRoot) {
  try {
    requireCondition((await readdir(outputRoot)).length === 0, "Systematic recipe smoke output root is not empty.");
  } catch (error) {
    if (error?.code !== "ENOENT") throw error;
  }
}

function unsafeOutcome(result, expectedModel) {
  return result.model.resolvedName !== expectedModel ||
    ["provider-error", "budget-exceeded", "timeout"].includes(result.outcome.failureCategory);
}

function firstPassAndFinalValid(result) {
  return result.outcome.firstPassValid && result.outcome.finalValid && result.metrics.repairRounds === 0;
}

export async function runSystematicRecipeSmokeSequence({
  prepared,
  apiKey,
  fetchImpl = globalThis.fetch,
  runnersByCondition = runners,
  appendResult = appendEvaluationResult
}) {
  const { plan, evaluationPlan, corpus, tasks, outputRoot } = prepared;
  const results = [];
  const conditionSpendUsd = { B: 0, C: 0 };
  let actualCombinedSpendUsd = 0;
  let stopReason = null;

  for (const condition of plan.conditions) {
    if (condition === "C" && !results.every(firstPassAndFinalValid)) {
      stopReason = "condition-b-not-first-pass-valid";
      break;
    }
    const conditionRoot = path.join(outputRoot, `condition-${condition.toLowerCase()}`);
    for (const task of tasks) {
      const remainingSpendUsd = Math.min(
        plan.spendUsd.approvedCapPerCondition - conditionSpendUsd[condition],
        plan.spendUsd.approvedCombinedCap - actualCombinedSpendUsd
      );
      requireCondition(remainingSpendUsd > 0, "Systematic recipe smoke spend cap was reached.");
      const result = await runnersByCondition[condition]({
        knowledgeCommit: plan.candidateCommit,
        apiKey,
        corpus,
        task,
        repetition: plan.repetition,
        plan: evaluationPlan,
        outputRoot: conditionRoot,
        fetchImpl,
        remainingSpendUsd
      });
      await appendResult(path.join(conditionRoot, "results.jsonl"), result);
      conditionSpendUsd[condition] += result.metrics.estimatedCostUsd;
      actualCombinedSpendUsd += result.metrics.estimatedCostUsd;
      results.push(result);

      if (
        conditionSpendUsd[condition] >= plan.spendUsd.approvedCapPerCondition ||
        actualCombinedSpendUsd >= plan.spendUsd.approvedCombinedCap
      ) {
        stopReason = "spend-cap-reached";
        break;
      }
      if (unsafeOutcome(result, evaluationPlan.model.name)) {
        stopReason = `unsafe-${condition.toLowerCase()}-outcome`;
        break;
      }
      if (condition === "C" && !firstPassAndFinalValid(result)) {
        stopReason = "condition-c-not-first-pass-valid";
        break;
      }
    }
    if (stopReason !== null) break;
    if (condition === "B" && !results.every(firstPassAndFinalValid)) {
      stopReason = "condition-b-not-first-pass-valid";
      break;
    }
  }

  return Object.freeze({
    schemaVersion: 1,
    candidateCommit: plan.candidateCommit,
    taskIds: Object.freeze([...plan.taskIds]),
    outputRoot: plan.outputRoot,
    approvedCombinedCapUsd: plan.spendUsd.approvedCombinedCap,
    actualCombinedSpendUsd,
    conditionSpendUsd: Object.freeze(conditionSpendUsd),
    stopReason,
    results: Object.freeze(results)
  });
}

export async function runSystematicRecipeSmoke({
  planFile = defaultPlanFile,
  tokenFile = defaultTokenFile,
  fetchImpl = globalThis.fetch,
  loadApiKeyImpl = loadApiKey,
  requireEmptyOutputRootImpl = requireEmptySystematicSmokeRoot,
  runnersByCondition = runners,
  appendResult = appendEvaluationResult
} = {}) {
  const prepared = await prepareSystematicRecipeSmoke(planFile);
  await requireEmptyOutputRootImpl(prepared.outputRoot);
  assertArchivedEvaluationExecution(prepared.plan.candidateCommit);
  const apiKey = await loadApiKeyImpl(tokenFile);
  return runSystematicRecipeSmokeSequence({
    prepared,
    apiKey,
    fetchImpl,
    runnersByCondition,
    appendResult
  });
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  process.stdout.write(`${JSON.stringify(await runSystematicRecipeSmoke(), null, 2)}\n`);
}
