import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import {
  loadEvaluationCorpus,
  validateEvaluationCorpus,
  validateEvaluationResult
} from "./corpus.js";
import { scoreEvaluationEvidence, summarizeEvaluationResults } from "./score.js";

const root = fileURLToPath(new URL("../../", import.meta.url));

export function syntheticPassingResult(task, condition = "A") {
  const knowledgeModes = {
    A: "current-docs",
    B: "structured-knowledge",
    C: "local-mcp"
  };
  return {
    schemaVersion: 1,
    runId: `dry-run-${condition}-${task.id}`,
    condition,
    taskId: task.id,
    knowledge: {
      commit: "9414d07179c9e7c6bbfdf00b762fc35de0ff25ec",
      mode: knowledgeModes[condition]
    },
    model: {
      provider: "local-dry-run",
      name: "synthetic",
      reasoningEffort: "none",
      reasoningMode: "standard",
      textVerbosity: "low",
      serviceTier: "default",
      store: false,
      maxOutputTokensPerCall: 1,
      maxCumulativeInputTokens: 1,
      maxCumulativeOutputTokens: 1
    },
    metrics: {
      promptTokens: 0,
      cachedInputTokens: 0,
      cacheWriteTokens: 0,
      completionTokens: 0,
      reasoningTokens: 0,
      totalTokens: 0,
      modelCalls: 0,
      mcpCalls: 0,
      repairRounds: 0,
      timeToValidMs: 0,
      estimatedCostUsd: 0
    },
    outcome: {
      firstPassValid: true,
      finalValid: true,
      failureCategory: null
    },
    evidence: {
      actions: [...new Set([
        ...task.oracle.requiredActions,
        ...(task.oracle.anyOfActionSets[0] ?? [])
      ])],
      runtimeFunctions: task.oracle.requiredRuntimeFunctions,
      validations: task.oracle.requiredValidations.map(id => ({ id, passed: true })),
      renderers: task.oracle.renderers,
      runtimeError: null
    },
    artifacts: {
      programFile: "synthetic/program.js",
      programSha256: "0000000000000000000000000000000000000000000000000000000000000000",
      validationLogFile: "synthetic/validation.json",
      rendererFiles: []
    }
  };
}

export async function runEvaluationDryRun() {
  const corpus = await loadEvaluationCorpus();
  const corpusSummary = await validateEvaluationCorpus(corpus);
  const scoredResults = corpus.tasks.map(task => {
    const result = syntheticPassingResult(task);
    validateEvaluationResult(result, corpus);
    return { task, result, score: scoreEvaluationEvidence(task, result.evidence) };
  });
  const summary = summarizeEvaluationResults(scoredResults);
  if (summary.successful !== corpus.tasks.length) {
    throw new Error("Synthetic dry run did not satisfy every task oracle.");
  }
  return { corpusSummary, summary };
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  process.stdout.write(`${JSON.stringify(await runEvaluationDryRun(), null, 2)}\n`);
}
