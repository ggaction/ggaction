import { createHash } from "node:crypto";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import { appendEvaluationResult } from "./condition-b-runner.js";
import { assertArchivedEvaluationExecution } from "./archived-evaluation.js";
import { loadEvaluationCorpus, validateEvaluationCorpus } from "./corpus.js";
import { loadApiKey } from "./openai-responses.js";
import { runSystematicRecipeSmokeSequence } from "./run-systematic-recipe-smoke.js";

const root = fileURLToPath(new URL("../../", import.meta.url));
const defaultPlanFile = path.join(root, "test/llm/layout-safe-smoke-plan.json");
const evaluationPlanFile = path.join(root, "test/llm/evaluation-plan.json");
const corpusFile = path.join(root, "test/llm/tasks.json");
const knowledgeFile = path.join(root, "knowledge/index.json");
const knowledgeSearchFile = path.join(root, "knowledge/search-index.json");
const publicRecipeFile = path.join(root, "docs/llms-recipes.json");
const deliveryMatrixFile = path.join(root, "test/llm/recipe-delivery-matrix.json");
const defaultTokenFile = "/Users/hj/Desktop/visualization-autocomplete/TOKEN.txt";

const approvedContract = Object.freeze({
  candidateCommit: "5606b1d509192006799042a43f76928b03062dc1",
  taskIds: Object.freeze(["cars-box-plot", "composed-dashboard", "renderer-parity"]),
  repetition: 1,
  conditions: Object.freeze(["B", "C"]),
  maximumRuns: 6,
  outputRoot: ".artifacts/llm-eval/layout-safe-smoke-5606b1d5",
  expectedPerRun: 0.025,
  calculatedMaximumPerRun: 0.156,
  approvedCapPerCondition: 0.3,
  approvedCombinedCap: 0.6,
  deliveredClosureManifestSha256: "08f786b7237deef3af583975f425d35e4964353a026aafdaf021a21fe8598d5f",
  evaluationPlanSha256: "c30b33a7d3b2f5118a8d8b8818023339a1f01f6170fba62edaf7ed8feefc1671",
  corpusSha256: "1a87b9b9cbbcd382aef6f82c94bf2080b545425be5d366a95b29cb3b1c942ad1",
  knowledgeSha256: "e29dd05976d7eb685184fb391de29ac297a2cb49ea09425a52a28229a073d612",
  knowledgeSearchSha256: "215e2cd640c644f929767a8301cb9e859341f617b1f6cb93d3be89211f8a61b7",
  publicRecipeSha256: "ed29100aa47fa25625ae05fc808ef1bc921ad70f55673af355ec789ea1fd1e67",
  deliveryMatrixSha256: "4c1d854d01478d9601509bde370b48999f44f06825475aa366642b031cdc9507"
});

const historicalPlanDigests = Object.freeze({
  "test/llm/systematic-recipe-smoke-plan.json": "c0bcfe75443b70fe929aa3513b48e88360a82f05027839c59f43732f476ca550",
  "test/llm/executable-recipe-smoke-plan.json": "31cedbe4582d20b781517d1dd59782ae599dda54e8bf90e64a55f95d83e14143",
  "test/llm/corrective-full-evaluation-plan.json": "4ff7726b0e0019b6dd0e87864c42dcad2b8792af4b8dc2dab3f200db67230a3c",
  "test/llm/task-closed-smoke-plan.json": "0fbbb6022b26fb0f55c204c82585786ce1cb5ce80fd3c41f50f9108569f7be13"
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

function resolvedOutputRoot(plan) {
  requireCondition(
    typeof plan.outputRoot === "string" && !path.isAbsolute(plan.outputRoot),
    "Layout-safe smoke outputRoot must be repository-relative."
  );
  const resolved = path.resolve(root, plan.outputRoot);
  const relative = path.relative(path.join(root, ".artifacts", "llm-eval"), resolved);
  requireCondition(
    relative.length > 0 && !relative.startsWith("..") && !path.isAbsolute(relative),
    "Layout-safe smoke outputRoot must be a dedicated child of .artifacts/llm-eval/."
  );
  return resolved;
}

export function assertLayoutSafeSmokePlan(plan, _hashes = {}) {
  requireCondition(plan?.schemaVersion === 1, "Layout-safe smoke schemaVersion must be 1.");
  requireCondition(plan.approvalStatus === "approved", "Layout-safe paid smoke is not approved.");
  requireCondition(plan.candidateCommit === approvedContract.candidateCommit, "Layout-safe smoke candidate SHA changed.");
  requireCondition(exactArray(plan.taskIds, approvedContract.taskIds), "Layout-safe smoke task order changed.");
  requireCondition(plan.repetition === approvedContract.repetition, "Layout-safe smoke repetition changed.");
  requireCondition(exactArray(plan.conditions, approvedContract.conditions), "Layout-safe smoke conditions must be B then C.");
  requireCondition(plan.maximumRuns === approvedContract.maximumRuns, "Layout-safe smoke run count changed.");
  requireCondition(plan.outputRoot === approvedContract.outputRoot, "Layout-safe smoke output root changed.");
  requireCondition(
    plan.spendUsd?.expectedPerRun === approvedContract.expectedPerRun &&
      plan.spendUsd?.calculatedMaximumPerRun === approvedContract.calculatedMaximumPerRun &&
      plan.spendUsd?.approvedCapPerCondition === approvedContract.approvedCapPerCondition &&
      plan.spendUsd?.approvedCombinedCap === approvedContract.approvedCombinedCap,
    "Layout-safe smoke spend cap changed."
  );
  requireCondition(
    plan.deliveredClosureManifestSha256 === approvedContract.deliveredClosureManifestSha256,
    "Layout-safe smoke delivered closure manifest changed."
  );
  for (const field of [
    "evaluationPlanSha256", "corpusSha256", "knowledgeSha256", "knowledgeSearchSha256",
    "publicRecipeSha256", "deliveryMatrixSha256"
  ]) {
    requireCondition(plan[field] === approvedContract[field], `Layout-safe smoke ${field} changed.`);
  }
  resolvedOutputRoot(plan);
  return plan;
}

export async function assertHistoricalLayoutSafePaidPlansUnchanged() {
  for (const [relative, expected] of Object.entries(historicalPlanDigests)) {
    requireCondition(
      sha256(await readFile(path.join(root, relative))) === expected,
      `Historical paid plan changed: ${relative}.`
    );
  }
}

export async function prepareLayoutSafeSmoke(planFile = defaultPlanFile) {
  const [
    planBytes,
    evaluationPlanBytes,
    corpusBytes,
    knowledgeBytes,
    knowledgeSearchBytes,
    publicRecipeBytes,
    deliveryMatrixBytes
  ] = await Promise.all([
    readFile(planFile),
    readFile(evaluationPlanFile),
    readFile(corpusFile),
    readFile(knowledgeFile),
    readFile(knowledgeSearchFile),
    readFile(publicRecipeFile),
    readFile(deliveryMatrixFile)
  ]);
  await assertHistoricalLayoutSafePaidPlansUnchanged();
  const plan = assertLayoutSafeSmokePlan(JSON.parse(planBytes), {
    evaluationPlanBytes,
    corpusBytes,
    knowledgeBytes,
    knowledgeSearchBytes,
    publicRecipeBytes,
    deliveryMatrixBytes
  });
  const evaluationPlan = JSON.parse(evaluationPlanBytes);
  const corpus = await loadEvaluationCorpus(corpusFile);
  await validateEvaluationCorpus(corpus);
  const tasks = plan.taskIds.map(taskId => {
    const task = corpus.tasks.find(candidate => candidate.id === taskId);
    requireCondition(task !== undefined, `Unknown layout-safe smoke task ${taskId}.`);
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

export async function requireEmptyLayoutSafeSmokeRoot(outputRoot) {
  try {
    requireCondition((await readdir(outputRoot)).length === 0, "Layout-safe smoke output root is not empty.");
  } catch (error) {
    if (error?.code !== "ENOENT") throw error;
  }
}

export async function runLayoutSafeSmoke({
  planFile = defaultPlanFile,
  tokenFile = defaultTokenFile,
  fetchImpl = globalThis.fetch,
  loadApiKeyImpl = loadApiKey,
  requireEmptyOutputRootImpl = requireEmptyLayoutSafeSmokeRoot,
  runnersByCondition,
  appendResult = appendEvaluationResult
} = {}) {
  const prepared = await prepareLayoutSafeSmoke(planFile);
  await requireEmptyOutputRootImpl(prepared.outputRoot);
  assertArchivedEvaluationExecution(prepared.plan.candidateCommit);
  const apiKey = await loadApiKeyImpl(tokenFile);
  return runSystematicRecipeSmokeSequence({
    prepared,
    apiKey,
    fetchImpl,
    ...(runnersByCondition === undefined ? {} : { runnersByCondition }),
    appendResult
  });
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  process.stdout.write(`${JSON.stringify(await runLayoutSafeSmoke(), null, 2)}\n`);
}
