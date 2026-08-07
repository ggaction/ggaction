import { createHash } from "node:crypto";
import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import { appendEvaluationResult, runConditionBTask } from "./condition-b-runner.js";
import { assertArchivedEvaluationExecution } from "./archived-evaluation.js";
import { runConditionCTask } from "./condition-c-runner.js";
import {
  loadEvaluationCorpus,
  validateEvaluationCorpus,
  validateEvaluationResult
} from "./corpus.js";
import { loadApiKey } from "./openai-responses.js";
import { orderedRuns } from "./run-paid-conditions.js";

const root = fileURLToPath(new URL("../../", import.meta.url));
const defaultFullPlanFile = path.join(root, "test/llm/corrective-full-evaluation-plan.json");
const evaluationPlanFile = path.join(root, "test/llm/evaluation-plan.json");
const corpusFile = path.join(root, "test/llm/tasks.json");
const knowledgeFile = path.join(root, "knowledge/index.json");
const knowledgeSearchFile = path.join(root, "knowledge/search-index.json");
const publicRecipeFile = path.join(root, "docs/llms-recipes.json");
const defaultTokenFile = "/Users/hj/Desktop/visualization-autocomplete/TOKEN.txt";
const manifestName = "run-manifest.json";
const runners = Object.freeze({ B: runConditionBTask, C: runConditionCTask });
const infrastructureFailures = new Set(["provider-error", "timeout", "budget-exceeded"]);

const approvedContract = Object.freeze({
  approvedOn: "2026-08-07",
  candidateCommit: "e88fbea9761ddc46268c400be1af280e838b71a2",
  taskCount: 24,
  repetitionsPerTask: 2,
  runsPerCondition: 48,
  conditions: Object.freeze(["B", "C"]),
  maximumRuns: 96,
  orderSeed: "roadmap5.3-eval-v1",
  maximumConsecutiveInfrastructureFailures: 3,
  outputRoot: ".artifacts/llm-eval/executable-recipe-full-e88fbea9",
  planningPerRun: 0.025,
  calculatedMaximumPerRun: 0.156,
  planningPerCondition: 1.2,
  approvedCapPerCondition: 3,
  approvedCombinedCap: 6,
  evaluationPlanSha256: "c30b33a7d3b2f5118a8d8b8818023339a1f01f6170fba62edaf7ed8feefc1671",
  corpusSha256: "1a87b9b9cbbcd382aef6f82c94bf2080b545425be5d366a95b29cb3b1c942ad1",
  knowledgeSha256: "eba175e202473c54202e0f5be6f988064efd2ba0790c46b8218119e758a254bf",
  knowledgeSearchSha256: "58fdde3a8069cb207cdef655b0dbe0a08a1adc055ab314c6646451caaa54ca52",
  publicRecipeSha256: "f94e5b3197c1ade2b1da4b2aca8a59820e5384a5202ad252a77e0ceba722fe92"
});

function requireCondition(value, message) {
  if (!value) throw new Error(message);
}

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function exactArray(actual, expected) {
  return Array.isArray(actual) && actual.length === expected.length &&
    actual.every((value, index) => value === expected[index]);
}

function resolvedOutputRoot(fullPlan) {
  requireCondition(
    typeof fullPlan.outputRoot === "string" && !path.isAbsolute(fullPlan.outputRoot),
    "Corrective full evaluation outputRoot must be repository-relative."
  );
  const resolved = path.resolve(root, fullPlan.outputRoot);
  const relative = path.relative(path.join(root, ".artifacts", "llm-eval"), resolved);
  requireCondition(
    relative.length > 0 && !relative.startsWith("..") && !path.isAbsolute(relative),
    "Corrective full evaluation outputRoot must be a dedicated child of .artifacts/llm-eval/."
  );
  return resolved;
}

export function assertCorrectiveFullEvaluationPlan(fullPlan, _hashes = {}) {
  requireCondition(fullPlan?.schemaVersion === 1, "Corrective full evaluation schemaVersion must be 1.");
  requireCondition(fullPlan.approvalStatus === "approved", "Corrective full evaluation is not approved.");
  for (const field of [
    "approvedOn",
    "candidateCommit",
    "taskCount",
    "repetitionsPerTask",
    "runsPerCondition",
    "maximumRuns",
    "orderSeed",
    "maximumConsecutiveInfrastructureFailures",
    "outputRoot"
  ]) {
    requireCondition(fullPlan[field] === approvedContract[field], `Corrective full evaluation ${field} changed.`);
  }
  requireCondition(
    exactArray(fullPlan.conditions, approvedContract.conditions),
    "Corrective full evaluation conditions must be B then C."
  );
  requireCondition(
    fullPlan.spendUsd?.planningPerRun === approvedContract.planningPerRun &&
      fullPlan.spendUsd?.calculatedMaximumPerRun === approvedContract.calculatedMaximumPerRun &&
      fullPlan.spendUsd?.planningPerCondition === approvedContract.planningPerCondition &&
      fullPlan.spendUsd?.approvedCapPerCondition === approvedContract.approvedCapPerCondition &&
      fullPlan.spendUsd?.approvedCombinedCap === approvedContract.approvedCombinedCap,
    "Corrective full evaluation spend contract changed."
  );
  for (const field of [
    "evaluationPlanSha256", "corpusSha256", "knowledgeSha256", "knowledgeSearchSha256", "publicRecipeSha256"
  ]) {
    requireCondition(fullPlan[field] === approvedContract[field], `Corrective full evaluation ${field} changed.`);
  }
  resolvedOutputRoot(fullPlan);
  return fullPlan;
}

export async function prepareCorrectiveFullEvaluation(fullPlanFile = defaultFullPlanFile) {
  const [
    fullPlanBytes,
    evaluationPlanBytes,
    corpusBytes,
    knowledgeBytes,
    knowledgeSearchBytes,
    publicRecipeBytes
  ] = await Promise.all([
    readFile(fullPlanFile),
    readFile(evaluationPlanFile),
    readFile(corpusFile),
    readFile(knowledgeFile),
    readFile(knowledgeSearchFile),
    readFile(publicRecipeFile)
  ]);
  const fullPlan = assertCorrectiveFullEvaluationPlan(JSON.parse(fullPlanBytes), {
    evaluationPlanBytes,
    corpusBytes,
    knowledgeBytes,
    knowledgeSearchBytes,
    publicRecipeBytes
  });
  const evaluationPlan = JSON.parse(evaluationPlanBytes);
  const corpus = await loadEvaluationCorpus(corpusFile);
  const corpusSummary = await validateEvaluationCorpus(corpus);
  requireCondition(corpusSummary.taskCount === fullPlan.taskCount, "Corrective full evaluation task count changed.");
  requireCondition(
    evaluationPlan.sampling.repetitionsPerTask === fullPlan.repetitionsPerTask &&
      evaluationPlan.sampling.runsPerCondition === fullPlan.runsPerCondition &&
      evaluationPlan.sampling.orderSeed === fullPlan.orderSeed,
    "Corrective full evaluation sampling contract changed."
  );
  return Object.freeze({
    fullPlan,
    fullPlanSha256: sha256(fullPlanBytes),
    evaluationPlan,
    corpus,
    outputRoot: resolvedOutputRoot(fullPlan)
  });
}

function expectedManifest(prepared) {
  return {
    schemaVersion: 1,
    kind: "ggaction-corrective-full-evaluation",
    fullPlanSha256: prepared.fullPlanSha256,
    candidateCommit: prepared.fullPlan.candidateCommit,
    outputRoot: prepared.fullPlan.outputRoot,
    conditions: prepared.fullPlan.conditions,
    runsPerCondition: prepared.fullPlan.runsPerCondition,
    maximumRuns: prepared.fullPlan.maximumRuns
  };
}

async function readResults(file) {
  try {
    const source = await readFile(file, "utf8");
    return source.trim().split("\n").filter(Boolean).map(line => JSON.parse(line));
  } catch (error) {
    if (error?.code === "ENOENT") return [];
    throw error;
  }
}

function conditionRoot(outputRoot, condition) {
  return path.join(outputRoot, `condition-${condition.toLowerCase()}`);
}

function resultsFile(outputRoot, condition) {
  return path.join(conditionRoot(outputRoot, condition), "results.jsonl");
}

function expectedRunId(condition, run) {
  return `${condition}-${run.task.id}-r${run.repetition}`;
}

function requireArtifactPath(prepared, relativeFile, label) {
  requireCondition(typeof relativeFile === "string" && relativeFile.length > 0, `${label} path is required.`);
  const resolved = path.resolve(root, relativeFile);
  const relative = path.relative(prepared.outputRoot, resolved);
  requireCondition(
    relative.length > 0 && !relative.startsWith("..") && !path.isAbsolute(relative),
    `${label} must stay inside the corrective full evaluation output root.`
  );
  return resolved;
}

async function validateResultArtifacts(prepared, result) {
  const validationFile = requireArtifactPath(prepared, result.artifacts.validationLogFile, "Validation evidence");
  await readFile(validationFile);
  const traceFile = path.join(conditionRoot(prepared.outputRoot, result.condition), result.runId, "trace.json");
  await readFile(traceFile);
  if (result.artifacts.programFile !== null) {
    const programFile = requireArtifactPath(prepared, result.artifacts.programFile, "Submitted program");
    const programBytes = await readFile(programFile);
    requireCondition(
      sha256(programBytes) === result.artifacts.programSha256,
      `Submitted program digest changed for ${result.runId}.`
    );
  }
  for (const rendererFile of result.artifacts.rendererFiles) {
    await readFile(requireArtifactPath(prepared, rendererFile, "Renderer evidence"));
  }
}

function trailingInfrastructureFailures(results) {
  let count = 0;
  for (let index = results.length - 1; index >= 0; index -= 1) {
    if (!infrastructureFailures.has(results[index].outcome.failureCategory)) break;
    count += 1;
  }
  return count;
}

function resultHasInfrastructureFault(result, expectedModel) {
  return result.model.resolvedName !== expectedModel ||
    infrastructureFailures.has(result.outcome.failureCategory);
}

async function validateConditionState(prepared, condition, results) {
  const expectedRuns = orderedRuns(prepared.corpus, prepared.evaluationPlan);
  requireCondition(results.length <= prepared.fullPlan.runsPerCondition, `Condition ${condition} has too many results.`);
  let spentUsd = 0;
  for (const [index, result] of results.entries()) {
    validateEvaluationResult(result, prepared.corpus);
    requireCondition(result.condition === condition, `Condition ${condition} result identity changed.`);
    requireCondition(
      result.runId === expectedRunId(condition, expectedRuns[index]),
      `Condition ${condition} results are not an exact deterministic prefix.`
    );
    requireCondition(
      result.knowledge.commit === prepared.fullPlan.candidateCommit,
      `Condition ${condition} knowledge candidate changed.`
    );
    requireCondition(
      result.model.name === prepared.evaluationPlan.model.name,
      `Condition ${condition} requested model changed.`
    );
    requireCondition(
      result.metrics.modelCalls <= prepared.evaluationPlan.sampling.maximumModelCallsPerTask,
      `Condition ${condition} exceeded the model-call limit.`
    );
    requireCondition(
      result.metrics.mcpCalls <= (condition === "C" ? prepared.evaluationPlan.sampling.maximumMcpCallsPerTask : 0),
      `Condition ${condition} exceeded the MCP-call limit.`
    );
    spentUsd += result.metrics.estimatedCostUsd;
    await validateResultArtifacts(prepared, result);
  }
  requireCondition(
    spentUsd <= prepared.fullPlan.spendUsd.approvedCapPerCondition,
    `Condition ${condition} exceeded its approved spend cap.`
  );

  const directory = conditionRoot(prepared.outputRoot, condition);
  try {
    const entries = await readdir(directory, { withFileTypes: true });
    const allowed = new Set(["results.jsonl", ...results.map(result => result.runId)]);
    requireCondition(
      entries.every(entry => allowed.has(entry.name)),
      `Condition ${condition} output contains untracked evidence.`
    );
  } catch (error) {
    if (error?.code !== "ENOENT") throw error;
    requireCondition(results.length === 0, `Condition ${condition} result file is missing.`);
  }
  return spentUsd;
}

export async function initializeOrValidateFullEvaluationOutput(prepared) {
  const manifestFile = path.join(prepared.outputRoot, manifestName);
  const manifest = expectedManifest(prepared);
  let entries;
  try {
    entries = await readdir(prepared.outputRoot, { withFileTypes: true });
  } catch (error) {
    if (error?.code !== "ENOENT") throw error;
    await mkdir(prepared.outputRoot, { recursive: true });
    await writeFile(manifestFile, `${JSON.stringify(manifest, null, 2)}\n`);
    return Object.freeze({ fresh: true, results: Object.freeze({ B: [], C: [] }), spentUsd: Object.freeze({ B: 0, C: 0 }) });
  }

  const allowedRootEntries = new Set([manifestName, "condition-b", "condition-c"]);
  requireCondition(entries.every(entry => allowedRootEntries.has(entry.name)), "Corrective full evaluation output root is not managed.");
  const existingManifest = JSON.parse(await readFile(manifestFile, "utf8"));
  requireCondition(
    JSON.stringify(existingManifest) === JSON.stringify(manifest),
    "Corrective full evaluation manifest changed."
  );
  const results = {
    B: await readResults(resultsFile(prepared.outputRoot, "B")),
    C: await readResults(resultsFile(prepared.outputRoot, "C"))
  };
  const spentUsd = {
    B: await validateConditionState(prepared, "B", results.B),
    C: await validateConditionState(prepared, "C", results.C)
  };
  requireCondition(
    spentUsd.B + spentUsd.C <= prepared.fullPlan.spendUsd.approvedCombinedCap,
    "Corrective full evaluation exceeded its approved combined spend cap."
  );
  requireCondition(
    results.C.length === 0 || results.B.length === prepared.fullPlan.runsPerCondition,
    "Condition C cannot exist before Condition B is complete."
  );
  requireCondition(
    results.C.length === 0 || !results.B.some(result => resultHasInfrastructureFault(result, prepared.evaluationPlan.model.name)),
    "Condition C cannot exist after a Condition B infrastructure fault."
  );
  return Object.freeze({
    fresh: false,
    results: Object.freeze({ B: Object.freeze(results.B), C: Object.freeze(results.C) }),
    spentUsd: Object.freeze(spentUsd)
  });
}

function preflightStopReason(prepared, state) {
  const expectedModel = prepared.evaluationPlan.model.name;
  if (state.results.B.length === prepared.fullPlan.runsPerCondition &&
      state.results.B.some(result => resultHasInfrastructureFault(result, expectedModel))) {
    return "condition-b-infrastructure-fault";
  }
  for (const condition of prepared.fullPlan.conditions) {
    const results = state.results[condition];
    if (results.some(result => result.model.resolvedName !== expectedModel)) return "model-mismatch";
    if (results.some(result => result.outcome.failureCategory === "budget-exceeded")) return "budget-exceeded";
    if (trailingInfrastructureFailures(results) >= prepared.fullPlan.maximumConsecutiveInfrastructureFailures) {
      return "consecutive-infrastructure-failures";
    }
  }
  if (state.results.C.length === prepared.fullPlan.runsPerCondition) return "complete";
  return null;
}

function frozenRunSummary(prepared, results, spentUsd, stopReason = null) {
  return Object.freeze({
    schemaVersion: 1,
    candidateCommit: prepared.fullPlan.candidateCommit,
    outputRoot: prepared.fullPlan.outputRoot,
    approvedCombinedCapUsd: prepared.fullPlan.spendUsd.approvedCombinedCap,
    actualCombinedSpendUsd: spentUsd.B + spentUsd.C,
    runs: Object.freeze({ B: results.B.length, C: results.C.length }),
    spentUsd: Object.freeze({ ...spentUsd }),
    stopReason,
    complete: results.B.length === prepared.fullPlan.runsPerCondition &&
      results.C.length === prepared.fullPlan.runsPerCondition
  });
}

export async function runCorrectiveFullEvaluationSequence({
  prepared,
  state,
  apiKey,
  fetchImpl = globalThis.fetch,
  runnersByCondition = runners,
  appendResult = appendEvaluationResult,
  onProgress = () => {}
}) {
  const results = { B: [...state.results.B], C: [...state.results.C] };
  const spentUsd = { ...state.spentUsd };
  const expectedRuns = orderedRuns(prepared.corpus, prepared.evaluationPlan);
  const expectedModel = prepared.evaluationPlan.model.name;

  for (const condition of prepared.fullPlan.conditions) {
    if (condition === "C") {
      if (results.B.length !== prepared.fullPlan.runsPerCondition) {
        return frozenRunSummary(prepared, results, spentUsd, "condition-b-incomplete");
      }
      if (results.B.some(result => resultHasInfrastructureFault(result, expectedModel))) {
        return frozenRunSummary(prepared, results, spentUsd, "condition-b-infrastructure-fault");
      }
    }
    let consecutiveFailures = trailingInfrastructureFailures(results[condition]);
    for (let index = results[condition].length; index < expectedRuns.length; index += 1) {
      const conditionRemaining = prepared.fullPlan.spendUsd.approvedCapPerCondition - spentUsd[condition];
      const combinedRemaining = prepared.fullPlan.spendUsd.approvedCombinedCap - spentUsd.B - spentUsd.C;
      const remainingSpendUsd = Math.min(conditionRemaining, combinedRemaining);
      if (remainingSpendUsd <= 0) {
        return frozenRunSummary(prepared, results, spentUsd, "budget-exceeded");
      }
      const run = expectedRuns[index];
      const result = await runnersByCondition[condition]({
        knowledgeCommit: prepared.fullPlan.candidateCommit,
        apiKey,
        corpus: prepared.corpus,
        task: run.task,
        repetition: run.repetition,
        plan: prepared.evaluationPlan,
        outputRoot: conditionRoot(prepared.outputRoot, condition),
        fetchImpl,
        remainingSpendUsd
      });
      validateEvaluationResult(result, prepared.corpus);
      requireCondition(result.runId === expectedRunId(condition, run), `Condition ${condition} returned an unexpected run ID.`);
      requireCondition(result.condition === condition, `Condition ${condition} returned a mismatched result.`);
      requireCondition(
        result.knowledge.commit === prepared.fullPlan.candidateCommit,
        `Condition ${condition} returned a mismatched knowledge candidate.`
      );
      requireCondition(
        result.metrics.modelCalls <= prepared.evaluationPlan.sampling.maximumModelCallsPerTask,
        `Condition ${condition} exceeded the model-call limit.`
      );
      requireCondition(
        result.metrics.mcpCalls <= (condition === "C" ? prepared.evaluationPlan.sampling.maximumMcpCallsPerTask : 0),
        `Condition ${condition} exceeded the MCP-call limit.`
      );
      await appendResult(resultsFile(prepared.outputRoot, condition), result);
      results[condition].push(result);
      spentUsd[condition] += result.metrics.estimatedCostUsd;
      await onProgress(Object.freeze({
        condition,
        runId: result.runId,
        finalValid: result.outcome.finalValid,
        failureCategory: result.outcome.failureCategory,
        resolvedModel: result.model.resolvedName,
        modelCalls: result.metrics.modelCalls,
        mcpCalls: result.metrics.mcpCalls,
        totalTokens: result.metrics.totalTokens,
        costUsd: result.metrics.estimatedCostUsd,
        conditionRuns: results[condition].length,
        conditionSpendUsd: spentUsd[condition],
        combinedSpendUsd: spentUsd.B + spentUsd.C
      }));

      if (spentUsd[condition] > prepared.fullPlan.spendUsd.approvedCapPerCondition ||
          spentUsd.B + spentUsd.C > prepared.fullPlan.spendUsd.approvedCombinedCap) {
        return frozenRunSummary(prepared, results, spentUsd, "budget-exceeded");
      }
      if (result.model.resolvedName !== expectedModel) {
        return frozenRunSummary(prepared, results, spentUsd, "model-mismatch");
      }
      if (result.outcome.failureCategory === "budget-exceeded") {
        return frozenRunSummary(prepared, results, spentUsd, "budget-exceeded");
      }
      consecutiveFailures = infrastructureFailures.has(result.outcome.failureCategory)
        ? consecutiveFailures + 1
        : 0;
      if (consecutiveFailures >= prepared.fullPlan.maximumConsecutiveInfrastructureFailures) {
        return frozenRunSummary(prepared, results, spentUsd, "consecutive-infrastructure-failures");
      }
    }
  }
  return frozenRunSummary(prepared, results, spentUsd);
}

export async function runExecutableRecipeFull({
  fullPlanFile = defaultFullPlanFile,
  tokenFile = defaultTokenFile,
  fetchImpl = globalThis.fetch,
  loadApiKeyImpl = loadApiKey,
  runnersByCondition = runners,
  appendResult = appendEvaluationResult,
  onProgress = () => {}
} = {}) {
  const prepared = await prepareCorrectiveFullEvaluation(fullPlanFile);
  const state = await initializeOrValidateFullEvaluationOutput(prepared);
  const stopReason = preflightStopReason(prepared, state);
  if (stopReason !== null) return frozenRunSummary(prepared, state.results, state.spentUsd, stopReason);
  assertArchivedEvaluationExecution(prepared.fullPlan.candidateCommit);
  const apiKey = await loadApiKeyImpl(tokenFile);
  return runCorrectiveFullEvaluationSequence({
    prepared,
    state,
    apiKey,
    fetchImpl,
    runnersByCondition,
    appendResult,
    onProgress
  });
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  const result = await runExecutableRecipeFull({
    onProgress: progress => process.stdout.write(`${JSON.stringify(progress)}\n`)
  });
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
}
