import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import { appendEvaluationResult, runConditionATask } from "./condition-a-runner.js";
import { loadEvaluationCorpus, validateEvaluationCorpus } from "./corpus.js";
import { loadApiKey } from "./openai-responses.js";

const root = fileURLToPath(new URL("../../", import.meta.url));
const defaultOutputRoot = path.join(root, ".artifacts/llm-eval/condition-a");
const defaultTokenFile = "/Users/hj/Desktop/visualization-autocomplete/TOKEN.txt";

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

export async function runConditionA({
  tokenFile = defaultTokenFile,
  outputRoot = defaultOutputRoot,
  limit = Number.POSITIVE_INFINITY,
  fetchImpl = globalThis.fetch
} = {}) {
  const corpus = await loadEvaluationCorpus();
  await validateEvaluationCorpus(corpus);
  const plan = JSON.parse(await readFile(new URL("../../test/llm/evaluation-plan.json", import.meta.url), "utf8"));
  if (plan.approvalStatus !== "approved") throw new Error("Condition A plan is not approved.");
  const apiKey = await loadApiKey(tokenFile);
  const resultsFile = path.join(outputRoot, "results.jsonl");
  const prior = await existingResults(resultsFile);
  const completed = new Set(prior.map(result => result.runId));
  let spent = prior.reduce((sum, result) => sum + result.metrics.estimatedCostUsd, 0);
  let executed = 0;

  for (const run of orderedRuns(corpus, plan)) {
    if (executed >= limit) break;
    const runId = `A-${run.task.id}-r${run.repetition}`;
    if (completed.has(runId)) continue;
    const remainingSpendUsd = plan.costPerConditionUsd.approvedSpendCap - spent;
    if (remainingSpendUsd <= 0) throw new Error("Approved condition-A spend cap has been reached.");
    const result = await runConditionATask({
      apiKey,
      corpus,
      task: run.task,
      repetition: run.repetition,
      plan,
      outputRoot,
      fetchImpl,
      remainingSpendUsd
    });
    await appendEvaluationResult(resultsFile, result);
    spent += result.metrics.estimatedCostUsd;
    executed += 1;
    process.stdout.write(`${JSON.stringify({
      runId: result.runId,
      finalValid: result.outcome.finalValid,
      modelCalls: result.metrics.modelCalls,
      totalTokens: result.metrics.totalTokens,
      costUsd: Number(result.metrics.estimatedCostUsd.toFixed(6)),
      cumulativeCostUsd: Number(spent.toFixed(6))
    })}\n`);
  }
  return { resultsFile, executed, totalResults: prior.length + executed, spent };
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  const limitValue = argumentValue("--limit");
  const result = await runConditionA({
    tokenFile: argumentValue("--token-file") ?? defaultTokenFile,
    outputRoot: argumentValue("--output") ?? defaultOutputRoot,
    limit: limitValue === undefined ? Number.POSITIVE_INFINITY : Number(limitValue)
  });
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
}
