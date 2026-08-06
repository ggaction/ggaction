import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import { loadEvaluationCorpus } from "./corpus.js";

const root = fileURLToPath(new URL("../../", import.meta.url));
const defaultResultsFile = path.join(root, ".artifacts/llm-eval/condition-a/results.jsonl");
const defaultJsonFile = path.join(root, "agent_docs/impl/roadmap5.3/phase0/CURRENT_DOCS_BASELINE.json");
const defaultMarkdownFile = path.join(root, "agent_docs/impl/roadmap5.3/phase0/CURRENT_DOCS_BASELINE.md");

function round(value, digits = 4) {
  return Number(value.toFixed(digits));
}

function percentile(values, probability) {
  if (values.length === 0) return null;
  const ordered = [...values].sort((left, right) => left - right);
  const index = Math.max(0, Math.ceil(probability * ordered.length) - 1);
  return ordered[index];
}

function distribution(values) {
  if (values.length === 0) return { count: 0, mean: null, median: null, p95: null };
  return {
    count: values.length,
    mean: round(values.reduce((sum, value) => sum + value, 0) / values.length),
    median: round(percentile(values, 0.5)),
    p95: round(percentile(values, 0.95))
  };
}

function countBy(values, keyFor) {
  const counts = {};
  for (const value of values) {
    const key = keyFor(value);
    counts[key] = (counts[key] ?? 0) + 1;
  }
  return Object.fromEntries(Object.entries(counts).sort(([left], [right]) => left.localeCompare(right)));
}

function aggregate(results) {
  const successful = results.filter(result => result.outcome.finalValid);
  const firstPass = results.filter(result => result.outcome.firstPassValid);
  return {
    runs: results.length,
    firstPassSuccessful: firstPass.length,
    firstPassCorrectnessPercent: results.length === 0 ? null : round(firstPass.length / results.length * 100, 2),
    finalSuccessful: successful.length,
    finalCorrectnessPercent: results.length === 0 ? null : round(successful.length / results.length * 100, 2),
    failureCategories: countBy(results.filter(result => !result.outcome.finalValid), result => result.outcome.failureCategory),
    allRuns: {
      totalTokens: distribution(results.map(result => result.metrics.totalTokens)),
      modelCalls: distribution(results.map(result => result.metrics.modelCalls)),
      estimatedCostUsd: distribution(results.map(result => result.metrics.estimatedCostUsd))
    },
    successfulRuns: {
      totalTokens: distribution(successful.map(result => result.metrics.totalTokens)),
      modelCalls: distribution(successful.map(result => result.metrics.modelCalls)),
      timeToValidMs: distribution(successful.map(result => result.metrics.timeToValidMs).filter(Number.isFinite))
    }
  };
}

export function summarizeEvaluationResults(results, corpus, {
  condition,
  knowledgeMode,
  knowledgeCommit
}) {
  const tasks = new Map(corpus.tasks.map(task => [task.id, task]));
  const enriched = results.map(result => ({ ...result, task: tasks.get(result.taskId) }));
  const splits = Object.fromEntries(["authoring", "heldout"].map(split => [
    split,
    aggregate(enriched.filter(result => result.task?.split === split))
  ]));
  return {
    schemaVersion: 1,
    condition,
    knowledgeMode,
    knowledgeCommit,
    models: [...new Set(results.map(result => result.model.resolvedName))].sort(),
    taskCount: corpus.tasks.length,
    repetitionsPerTask: results.length / corpus.tasks.length,
    overall: aggregate(enriched),
    splits,
    categories: Object.fromEntries([...new Set(corpus.tasks.map(task => task.category))].sort().map(category => [
      category,
      aggregate(enriched.filter(result => result.task?.category === category))
    ])),
    totals: {
      promptTokens: results.reduce((sum, result) => sum + result.metrics.promptTokens, 0),
      cachedInputTokens: results.reduce((sum, result) => sum + result.metrics.cachedInputTokens, 0),
      cacheWriteTokens: results.reduce((sum, result) => sum + result.metrics.cacheWriteTokens, 0),
      completionTokens: results.reduce((sum, result) => sum + result.metrics.completionTokens, 0),
      reasoningTokens: results.reduce((sum, result) => sum + result.metrics.reasoningTokens, 0),
      totalTokens: results.reduce((sum, result) => sum + result.metrics.totalTokens, 0),
      modelCalls: results.reduce((sum, result) => sum + result.metrics.modelCalls, 0),
      mcpCalls: results.reduce((sum, result) => sum + result.metrics.mcpCalls, 0),
      estimatedCostUsd: round(results.reduce((sum, result) => sum + result.metrics.estimatedCostUsd, 0), 6)
    },
    runs: results.map(result => ({
      runId: result.runId,
      taskId: result.taskId,
      split: tasks.get(result.taskId)?.split,
      category: tasks.get(result.taskId)?.category,
      difficulty: tasks.get(result.taskId)?.difficulty,
      model: result.model.resolvedName,
      metrics: result.metrics,
      outcome: result.outcome,
      evidence: {
        actions: result.evidence.actions,
        failedValidations: result.evidence.validations.filter(validation => !validation.passed).map(validation => validation.id),
        renderers: result.evidence.renderers,
        runtimeError: result.evidence.runtimeError
      },
      programSha256: result.artifacts.programSha256
    }))
  };
}

export function summarizeConditionAResults(results, corpus) {
  return summarizeEvaluationResults(results, corpus, {
    condition: "A",
    knowledgeMode: "current-docs",
    knowledgeCommit: "9414d07179c9e7c6bbfdf00b762fc35de0ff25ec"
  });
}

function formatDistribution(value, unit = "") {
  return `${value.median?.toLocaleString("en-US") ?? "n/a"}${unit} median / ${value.p95?.toLocaleString("en-US") ?? "n/a"}${unit} p95`;
}

export function conditionASummaryMarkdown(summary) {
  const overall = summary.overall;
  return `# Current-Docs LLM Baseline (Condition A)

## 한눈에 보는 결과

Starting commit \`${summary.knowledgeCommit}\`의 현재 public docs만 제공한 상태에서 \`${summary.models.join(", ")}\`로
24개 task를 두 번씩 총 ${overall.runs}회 실행했다. 모델은 task당 최대 세 번 호출할 수 있었고, 생성 프로그램은 실제
dataset과 package로 실행한 뒤 요청된 Canvas/SVG/PNG/PDF output을 통과해야 정답으로 처리했다.

| 항목 | 결과 |
| --- | ---: |
| First-pass correctness | ${overall.firstPassSuccessful}/${overall.runs} (${overall.firstPassCorrectnessPercent}%) |
| Final correctness | ${overall.finalSuccessful}/${overall.runs} (${overall.finalCorrectnessPercent}%) |
| Authoring final correctness | ${summary.splits.authoring.finalSuccessful}/${summary.splits.authoring.runs} (${summary.splits.authoring.finalCorrectnessPercent}%) |
| Held-out final correctness | ${summary.splits.heldout.finalSuccessful}/${summary.splits.heldout.runs} (${summary.splits.heldout.finalCorrectnessPercent}%) |
| Successful-run tokens | ${formatDistribution(overall.successfulRuns.totalTokens)} |
| Successful-run model calls | ${formatDistribution(overall.successfulRuns.modelCalls)} |
| Successful-run time-to-valid | ${formatDistribution(overall.successfulRuns.timeToValidMs, " ms")} |
| Total tokens | ${summary.totals.totalTokens.toLocaleString("en-US")} |
| Total model calls | ${summary.totals.modelCalls} |
| Actual estimated cost | $${summary.totals.estimatedCostUsd.toFixed(4)} |

## 성공한 대표 렌더

아래 이미지는 성공한 17개 run 중 basic, binned, distribution, specialized, polar와 renderer-parity task의 Canvas
output을 고른 것이다. 별도 예제 코드를 손으로 보정하지 않았고, benchmark가 제출받아 실제 package로 렌더한 결과다.

![Condition A representative successful renders](./CURRENT_DOCS_BASELINE_GALLERY.png)

## 실패 분포

${Object.entries(overall.failureCategories).map(([category, count]) => `- \`${category}\`: ${count}`).join("\n")}

\`invalid-program\`은 task당 세 번의 model call 안에 \`submit_program\`을 호출하지 못한 경우다. 실행 오류와 required
domain action 우회는 별도 category로 유지했다. 실패와 timeout은 correctness denominator에서 제외하지 않았다.

## 해석

- 현재 \`llms.txt\`는 정확한 docs로 가는 route를 제공하지만, 복합 task에서는 model이 세 호출을 문서 탐색에 모두
  사용하고 프로그램을 제출하지 못하는 경우가 가장 컸다.
- 성공한 task에서도 model-call median은 ${overall.successfulRuns.modelCalls.median}으로 제한 상한과 같았다. Roadmap 5.3은
  단순히 정답률만 높이는 것이 아니라 이 탐색 호출과 token/time을 줄여야 한다.
- Renderer parity 두 반복은 Canvas/SVG/PNG/PDF를 모두 통과해 multi-renderer docs 자체는 현재도 강한 route임을
  보여준다.
- 이 결과는 미리 고정한 A/B/C acceptance rule의 A 기준선이며, threshold는 결과를 본 뒤 바꾸지 않는다.

Machine-readable aggregate와 48개 sanitized run record는
[\`CURRENT_DOCS_BASELINE.json\`](./CURRENT_DOCS_BASELINE.json)이 소유한다. API key, raw response body와 generated source는
포함하지 않는다.
`;
}

export async function generateConditionASummary({
  resultsFile = defaultResultsFile,
  jsonFile = defaultJsonFile,
  markdownFile = defaultMarkdownFile
} = {}) {
  const corpus = await loadEvaluationCorpus();
  const results = (await readFile(resultsFile, "utf8")).trim().split("\n").filter(Boolean).map(line => JSON.parse(line));
  const summary = summarizeConditionAResults(results, corpus);
  await writeFile(jsonFile, `${JSON.stringify(summary, null, 2)}\n`);
  await writeFile(markdownFile, conditionASummaryMarkdown(summary));
  return summary;
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  const summary = await generateConditionASummary();
  process.stdout.write(`${JSON.stringify({
    runs: summary.overall.runs,
    finalCorrectnessPercent: summary.overall.finalCorrectnessPercent,
    totalTokens: summary.totals.totalTokens,
    modelCalls: summary.totals.modelCalls,
    estimatedCostUsd: summary.totals.estimatedCostUsd
  }, null, 2)}\n`);
}
