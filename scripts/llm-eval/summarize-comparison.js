import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import { loadEvaluationCorpus, validateEvaluationResult } from "./corpus.js";
import { summarizeEvaluationResults } from "./summarize-condition-a.js";

const root = fileURLToPath(new URL("../../", import.meta.url));
const phaseRoot = path.join(root, "agent_docs/impl/roadmap5.3/phase6");
const baselineFile = path.join(root, "agent_docs/impl/roadmap5.3/phase0/CURRENT_DOCS_BASELINE.json");
const resultsFiles = Object.freeze({
  B: path.join(root, ".artifacts/llm-eval/condition-b/results.jsonl"),
  C: path.join(root, ".artifacts/llm-eval/condition-c/results.jsonl")
});

function round(value, digits = 4) {
  return Number(value.toFixed(digits));
}

async function readResults(file) {
  return (await readFile(file, "utf8")).trim().split("\n").filter(Boolean).map(line => JSON.parse(line));
}

async function sha256(file) {
  return createHash("sha256").update(await readFile(file)).digest("hex");
}

function correctnessDecision(baseline, candidate, thresholds) {
  const finalRegression = round(baseline.finalCorrectnessPercent - candidate.finalCorrectnessPercent, 2);
  const firstPassGain = round(candidate.firstPassCorrectnessPercent - baseline.firstPassCorrectnessPercent, 2);
  const highBaseline = baseline.firstPassCorrectnessPercent >= thresholds.highBaselineFirstPassCorrectnessPercent;
  return {
    finalCorrectness: {
      baselinePercent: baseline.finalCorrectnessPercent,
      candidatePercent: candidate.finalCorrectnessPercent,
      regressionPercentagePoints: finalRegression,
      maximumRegressionPercentagePoints: thresholds.maximumFinalCorrectnessRegressionPercentagePoints,
      passed: finalRegression <= thresholds.maximumFinalCorrectnessRegressionPercentagePoints
    },
    firstPassCorrectness: {
      baselinePercent: baseline.firstPassCorrectnessPercent,
      candidatePercent: candidate.firstPassCorrectnessPercent,
      gainPercentagePoints: firstPassGain,
      rule: highBaseline ? "maximum-regression" : "minimum-gain",
      requiredPercentagePoints: highBaseline
        ? -thresholds.maximumFinalCorrectnessRegressionPercentagePoints
        : thresholds.minimumFirstPassCorrectnessGainPercentagePoints,
      passed: highBaseline
        ? firstPassGain >= -thresholds.maximumFinalCorrectnessRegressionPercentagePoints
        : firstPassGain >= thresholds.minimumFirstPassCorrectnessGainPercentagePoints
    }
  };
}

function efficiencyMetric(baseline, candidate, requiredReductionPercent) {
  const available = Number.isFinite(baseline) && Number.isFinite(candidate);
  const reductionPercent = available ? round((baseline - candidate) / baseline * 100, 2) : null;
  return {
    baselineMedian: baseline,
    candidateMedian: candidate,
    reductionPercent,
    requiredReductionPercent,
    available,
    passed: available && reductionPercent >= requiredReductionPercent
  };
}

function acceptanceDecision(a, b, c, thresholds) {
  const heldout = correctnessDecision(a.splits.heldout, c.splits.heldout, thresholds);
  const overall = correctnessDecision(a.overall, c.overall, thresholds);
  const cVsBRegression = round(b.overall.finalCorrectnessPercent - c.overall.finalCorrectnessPercent, 2);
  const efficiency = {
    totalTokens: efficiencyMetric(
      a.overall.successfulRuns.totalTokens.median,
      c.overall.successfulRuns.totalTokens.median,
      thresholds.minimumTokenReductionPercent
    ),
    modelCalls: efficiencyMetric(
      a.overall.successfulRuns.modelCalls.median,
      c.overall.successfulRuns.modelCalls.median,
      thresholds.minimumModelCallReductionPercent
    ),
    timeToValidMs: efficiencyMetric(
      a.overall.successfulRuns.timeToValidMs.median,
      c.overall.successfulRuns.timeToValidMs.median,
      thresholds.minimumTimeToValidReductionPercent
    )
  };
  const efficiencyPassed = Object.values(efficiency).filter(metric => metric.passed).length;
  const remainingWithinRegression = Object.values(efficiency).every(metric =>
    metric.passed || (metric.available && metric.reductionPercent >= -thresholds.maximumRemainingEfficiencyRegressionPercent)
  );
  return {
    primarySplit: "heldout",
    heldoutCorrectness: heldout,
    overallCorrectness: overall,
    cVersusBFinalCorrectness: {
      regressionPercentagePoints: cVsBRegression,
      maximumRegressionPercentagePoints: thresholds.maximumFinalCorrectnessRegressionPercentagePoints,
      passed: cVsBRegression <= thresholds.maximumFinalCorrectnessRegressionPercentagePoints
    },
    efficiency,
    efficiencyThresholdsPassed: efficiencyPassed,
    requiredEfficiencyThresholdsPassed: thresholds.requiredEfficiencyThresholdsPassed,
    remainingEfficiencyWithinRegressionLimit: remainingWithinRegression,
    passed: heldout.finalCorrectness.passed &&
      heldout.firstPassCorrectness.passed &&
      overall.finalCorrectness.passed &&
      overall.firstPassCorrectness.passed &&
      cVsBRegression <= thresholds.maximumFinalCorrectnessRegressionPercentagePoints &&
      efficiencyPassed >= thresholds.requiredEfficiencyThresholdsPassed &&
      remainingWithinRegression
  };
}

function compact(summary) {
  return {
    condition: summary.condition,
    knowledgeMode: summary.knowledgeMode,
    knowledgeCommit: summary.knowledgeCommit,
    models: summary.models,
    taskCount: summary.taskCount,
    repetitionsPerTask: summary.repetitionsPerTask,
    overall: summary.overall,
    splits: summary.splits,
    categories: summary.categories,
    totals: summary.totals,
    runs: summary.runs
  };
}

function comparisonMarkdown(report) {
  const { A, B, C } = report.conditions;
  const metric = value => value === null ? "n/a" : value.toLocaleString("en-US");
  return `# Roadmap 5.3 A/B/C LLM Comparison

## 결론

현재 candidate는 사전 승인한 acceptance threshold를 **통과하지 못했다**. Condition B와 C 모두 48회 중 프로그램을
한 번도 제출하지 못해 final correctness가 0%였다. 따라서 이 결과로 LLM-friendly correctness 또는 efficiency
개선을 주장하거나 현재 branch를 integration candidate로 승인하면 안 된다.

## 결과

| 항목 | A — Current docs | B — Structured knowledge | C — Local MCP |
| --- | ---: | ---: | ---: |
| Runs | ${A.overall.runs} | ${B.overall.runs} | ${C.overall.runs} |
| First-pass correctness | ${A.overall.firstPassCorrectnessPercent}% | ${B.overall.firstPassCorrectnessPercent}% | ${C.overall.firstPassCorrectnessPercent}% |
| Final correctness | ${A.overall.finalCorrectnessPercent}% | ${B.overall.finalCorrectnessPercent}% | ${C.overall.finalCorrectnessPercent}% |
| Held-out final correctness | ${A.splits.heldout.finalCorrectnessPercent}% | ${B.splits.heldout.finalCorrectnessPercent}% | ${C.splits.heldout.finalCorrectnessPercent}% |
| Successful-run token median | ${metric(A.overall.successfulRuns.totalTokens.median)} | ${metric(B.overall.successfulRuns.totalTokens.median)} | ${metric(C.overall.successfulRuns.totalTokens.median)} |
| Successful-run model-call median | ${metric(A.overall.successfulRuns.modelCalls.median)} | ${metric(B.overall.successfulRuns.modelCalls.median)} | ${metric(C.overall.successfulRuns.modelCalls.median)} |
| Successful-run time median | ${metric(A.overall.successfulRuns.timeToValidMs.median)} ms | ${metric(B.overall.successfulRuns.timeToValidMs.median)} | ${metric(C.overall.successfulRuns.timeToValidMs.median)} |
| Total tokens | ${metric(A.totals.totalTokens)} | ${metric(B.totals.totalTokens)} | ${metric(C.totals.totalTokens)} |
| Model calls | ${A.totals.modelCalls} | ${B.totals.modelCalls} | ${C.totals.modelCalls} |
| MCP calls | ${A.totals.mcpCalls ?? 0} | ${B.totals.mcpCalls} | ${C.totals.mcpCalls} |
| Recorded cost | $${A.totals.estimatedCostUsd.toFixed(6)} | $${B.totals.estimatedCostUsd.toFixed(6)} | $${C.totals.estimatedCostUsd.toFixed(6)} |

B/C paid spend는 합계 **$${report.paidSpendUsd.toFixed(6)}**로 승인된 $10 combined cap 안에 있다. A 비용은 당시
승인된 가격표로 기록된 historical baseline이며 B/C와 직접적인 acceptance metric으로 사용하지 않는다.

## 사전 기준 판정

- Primary held-out final correctness: A ${A.splits.heldout.finalCorrectnessPercent}% → C ${C.splits.heldout.finalCorrectnessPercent}%, failed
- Primary held-out first-pass correctness: A ${A.splits.heldout.firstPassCorrectnessPercent}% → C ${C.splits.heldout.firstPassCorrectnessPercent}%, failed
- Overall final correctness: A ${A.overall.finalCorrectnessPercent}% → C ${C.overall.finalCorrectnessPercent}%, failed
- C versus B final regression guard: 0 percentage points, passed
- Successful-chart efficiency: C successful chart가 0개라 세 metric 모두 unavailable, failed
- Final decision: **FAILED**

## 실패 해석

- B와 C의 96개 run은 모두 model call 상한 3회를 사용했지만 submit_program을 한 번도 호출하지 않아
  invalid-program으로 분류됐다.
- C는 local MCP를 실제로 사용했고 task당 최대 8회의 실행된 MCP call을 기록했다. Runner와 model provider 중단은
  없었지만 bounded model loop 안에서 탐색을 끝내고 chart 제출로 전환하지 못했다.
- 따라서 현재 evidence는 knowledge의 존재나 MCP 설치 성공과 실제 chart-authoring 성능이 다르다는 것을 보여준다.
  다음 candidate는 benchmark threshold를 바꾸지 말고, bounded retrieval 결과가 더 적은 model turn 안에 직접
  실행 가능한 chart program으로 이어지도록 knowledge delivery를 수정한 뒤 새 비용 승인을 받아 재평가해야 한다.

## 재현성과 계측 기록

- B raw SHA-256: ${report.rawEvidence.B.sha256}
- C raw SHA-256: ${report.rawEvidence.C.sha256}
- Resolved model: ${C.models.join(", ")}
- Knowledge commit: ${C.knowledgeCommit}
- C 첫 smoke run에서 차단된 tool attempt까지 call로 세는 계측 문제를 발견했다. 실제 실행된 MCP call만 세도록
  a2ae9c72에서 수정하고 해당 raw record의 mcpCalls만 9에서 8로 교정했다. Model output, outcome, token과 cost는
  변경하지 않았다.

Machine-readable result와 sanitized task-level records는 [LLM_COMPARISON.json](./LLM_COMPARISON.json)이 소유한다.
API key, raw response body와 generated source는 포함하지 않는다.
`;
}

export async function generateComparison({
  jsonFile = path.join(phaseRoot, "LLM_COMPARISON.json"),
  markdownFile = path.join(phaseRoot, "LLM_COMPARISON.md")
} = {}) {
  const corpus = await loadEvaluationCorpus();
  const plan = JSON.parse(await readFile(new URL("../../test/llm/evaluation-plan.json", import.meta.url), "utf8"));
  const A = JSON.parse(await readFile(baselineFile, "utf8"));
  const raw = { B: await readResults(resultsFiles.B), C: await readResults(resultsFiles.C) };
  for (const condition of ["B", "C"]) {
    if (raw[condition].length !== plan.sampling.runsPerCondition) {
      throw new Error(`Condition ${condition} must contain exactly ${plan.sampling.runsPerCondition} results.`);
    }
    const ids = new Set(raw[condition].map(result => result.runId));
    if (ids.size !== raw[condition].length) throw new Error(`Condition ${condition} contains duplicate run IDs.`);
    raw[condition].forEach(result => validateEvaluationResult(result, corpus));
  }
  const knowledgeCommit = raw.B[0].knowledge.commit;
  if (raw.C[0].knowledge.commit !== knowledgeCommit ||
      [...raw.B, ...raw.C].some(result => result.knowledge.commit !== knowledgeCommit)) {
    throw new Error("Condition B/C knowledge commits do not match.");
  }
  const B = summarizeEvaluationResults(raw.B, corpus, {
    condition: "B",
    knowledgeMode: "structured-knowledge",
    knowledgeCommit
  });
  const C = summarizeEvaluationResults(raw.C, corpus, {
    condition: "C",
    knowledgeMode: "local-mcp",
    knowledgeCommit
  });
  const report = {
    schemaVersion: 1,
    conditions: { A: compact(A), B: compact(B), C: compact(C) },
    acceptance: acceptanceDecision(A, B, C, plan.acceptance),
    paidSpendUsd: round(B.totals.estimatedCostUsd + C.totals.estimatedCostUsd, 6),
    approvedCombinedSpendCapUsd: plan.paidConditionsBCUsd.approvedCombinedSpendCap,
    rawEvidence: {
      B: { runs: raw.B.length, sha256: await sha256(resultsFiles.B) },
      C: { runs: raw.C.length, sha256: await sha256(resultsFiles.C) }
    },
    instrumentation: {
      correctedConditionCRunId: "C-cars-error-bar-origin-r2",
      correctedField: "metrics.mcpCalls",
      before: 9,
      after: 8,
      runtimeFixCommit: "a2ae9c72",
      unchangedFields: ["model output", "outcome", "tokens", "cost"]
    }
  };
  await writeFile(jsonFile, `${JSON.stringify(report, null, 2)}\n`);
  await writeFile(markdownFile, comparisonMarkdown(report));
  return report;
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  const report = await generateComparison();
  process.stdout.write(`${JSON.stringify({
    runs: Object.fromEntries(Object.entries(report.conditions).map(([condition, value]) => [condition, value.overall.runs])),
    finalCorrectness: Object.fromEntries(Object.entries(report.conditions).map(([condition, value]) => [condition, value.overall.finalCorrectnessPercent])),
    paidSpendUsd: report.paidSpendUsd,
    accepted: report.acceptance.passed
  }, null, 2)}\n`);
}
