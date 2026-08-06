import { copyFile, readFile, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import { loadEvaluationCorpus, validateEvaluationResult } from "./corpus.js";
import { evaluateGeneratedProgram } from "./program-evaluator.js";
import { scoreEvaluationEvidence } from "./score.js";

const root = fileURLToPath(new URL("../../", import.meta.url));
const defaultResultsFile = path.join(root, ".artifacts/llm-eval/condition-a/results.jsonl");

async function datasetsFor(corpus, task) {
  return Object.fromEntries(await Promise.all(task.data.map(async selection => [
    selection.id,
    JSON.parse(await readFile(path.join(root, corpus.datasets[selection.id].path), "utf8"))
  ])));
}

function category(score, runtimeError) {
  if (runtimeError) return "runtime-error";
  if (score.failures.some(failure => failure.startsWith("forbidden-action:"))) return "forbidden-primitive";
  if (score.failures.some(failure => failure.startsWith("missing-action:"))) return "missing-action";
  if (score.failures.some(failure => failure.startsWith("missing-renderer:"))) return "renderer-failed";
  return score.valid ? null : "validation-failed";
}

export async function regradeConditionA(file = defaultResultsFile) {
  const corpus = await loadEvaluationCorpus();
  const lines = (await readFile(file, "utf8")).trim().split("\n").filter(Boolean);
  const original = lines.map(line => JSON.parse(line));
  const backup = `${file}.pre-regrade`;
  await copyFile(file, backup);
  const changed = [];
  const results = [];

  for (const result of original) {
    if (result.condition !== "A" || result.artifacts.programFile === null) {
      results.push(result);
      continue;
    }
    const task = corpus.tasks.find(candidate => candidate.id === result.taskId);
    const programFile = path.join(root, result.artifacts.programFile);
    const artifactRoot = path.dirname(programFile);
    const source = await readFile(programFile, "utf8");
    const evaluation = await evaluateGeneratedProgram({
      source,
      task,
      datasets: await datasetsFor(corpus, task),
      artifactRoot
    });
    const evidence = {
      actions: evaluation.actions,
      runtimeFunctions: evaluation.runtimeFunctions,
      validations: evaluation.validations,
      renderers: evaluation.renderers,
      runtimeError: null
    };
    const score = scoreEvaluationEvidence(task, evidence);
    const directoryStats = await stat(artifactRoot);
    const validationStats = await stat(path.join(root, result.artifacts.validationLogFile));
    const updated = {
      ...result,
      metrics: {
        ...result.metrics,
        timeToValidMs: score.valid
          ? Math.max(0, Math.round(validationStats.mtimeMs - directoryStats.birthtimeMs))
          : null
      },
      outcome: {
        firstPassValid: result.metrics.repairRounds === 0 ? score.valid : result.outcome.firstPassValid,
        finalValid: score.valid,
        failureCategory: category(score, null)
      },
      evidence,
      artifacts: {
        ...result.artifacts,
        programSha256: evaluation.artifacts.programSha256,
        rendererFiles: evaluation.artifacts.rendererFiles.map(rendered => path.relative(root, rendered))
      }
    };
    validateEvaluationResult(updated, corpus);
    if (JSON.stringify(updated.outcome) !== JSON.stringify(result.outcome)) changed.push(result.runId);
    await writeFile(
      path.join(root, result.artifacts.validationLogFile),
      `${JSON.stringify({ score, evidence, regraded: true }, null, 2)}\n`
    );
    results.push(updated);
  }
  await writeFile(file, `${results.map(result => JSON.stringify(result)).join("\n")}\n`);
  return { file, backup, total: results.length, changed };
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  process.stdout.write(`${JSON.stringify(await regradeConditionA(process.argv[2] ?? defaultResultsFile), null, 2)}\n`);
}
