import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import { validateEvaluationResult } from "./corpus.js";
import { prepareCorrectiveFullEvaluation } from "./run-executable-recipe-full.js";
import { acceptanceDecision, compact } from "./summarize-comparison.js";
import { summarizeEvaluationResults } from "./summarize-condition-a.js";

const root = fileURLToPath(new URL("../../", import.meta.url));
const phaseRoot = path.join(root, "agent_docs/impl/roadmap5.3/phase6");
const defaultBaselineFile = path.join(root, "agent_docs/impl/roadmap5.3/phase0/CURRENT_DOCS_BASELINE.json");
const defaultOutputRoot = path.join(root, ".artifacts/llm-eval/executable-recipe-full-e88fbea9");
const defaultResultsFiles = Object.freeze({
  B: path.join(defaultOutputRoot, "condition-b/results.jsonl"),
  C: path.join(defaultOutputRoot, "condition-c/results.jsonl")
});

function requireCondition(value, message) {
  if (!value) throw new Error(message);
}

function round(value, digits = 6) {
  return Number(value.toFixed(digits));
}

async function readResults(file) {
  return (await readFile(file, "utf8")).trim().split("\n").filter(Boolean).map(line => JSON.parse(line));
}

async function sha256(file) {
  return createHash("sha256").update(await readFile(file)).digest("hex");
}

function passLabel(passed) {
  return passed ? "passed" : "failed";
}

function metric(value, suffix = "") {
  return value === null ? "n/a" : `${value.toLocaleString("en-US")}${suffix}`;
}

function correctedComparisonMarkdown(report) {
  const { A, B, C } = report.conditions;
  const decision = report.acceptance.passed ? "PASSED" : "FAILED";
  const recommendation = report.acceptance.passed
    ? "사전 고정한 correctness와 efficiency threshold를 모두 통과했다. 이 결과는 사용자 검토 뒤에만 integration candidate와 LLM-friendly benefit 근거로 사용할 수 있다."
    : "사전 고정한 acceptance threshold를 통과하지 못했다. 이 결과로 integration candidate 또는 LLM-friendly benefit을 주장하면 안 된다.";
  return `# Roadmap 5.3 Corrected A/B/C LLM Comparison

## 결론

**${decision}.** ${recommendation}

## 결과

| 항목 | A — Current docs | B — Structured knowledge | C — Local MCP |
| --- | ---: | ---: | ---: |
| Runs | ${A.overall.runs} | ${B.overall.runs} | ${C.overall.runs} |
| First-pass correctness | ${A.overall.firstPassCorrectnessPercent}% | ${B.overall.firstPassCorrectnessPercent}% | ${C.overall.firstPassCorrectnessPercent}% |
| Final correctness | ${A.overall.finalCorrectnessPercent}% | ${B.overall.finalCorrectnessPercent}% | ${C.overall.finalCorrectnessPercent}% |
| Held-out first-pass correctness | ${A.splits.heldout.firstPassCorrectnessPercent}% | ${B.splits.heldout.firstPassCorrectnessPercent}% | ${C.splits.heldout.firstPassCorrectnessPercent}% |
| Held-out final correctness | ${A.splits.heldout.finalCorrectnessPercent}% | ${B.splits.heldout.finalCorrectnessPercent}% | ${C.splits.heldout.finalCorrectnessPercent}% |
| Successful-run token median | ${metric(A.overall.successfulRuns.totalTokens.median)} | ${metric(B.overall.successfulRuns.totalTokens.median)} | ${metric(C.overall.successfulRuns.totalTokens.median)} |
| Successful-run model-call median | ${metric(A.overall.successfulRuns.modelCalls.median)} | ${metric(B.overall.successfulRuns.modelCalls.median)} | ${metric(C.overall.successfulRuns.modelCalls.median)} |
| Successful-run time median | ${metric(A.overall.successfulRuns.timeToValidMs.median, " ms")} | ${metric(B.overall.successfulRuns.timeToValidMs.median, " ms")} | ${metric(C.overall.successfulRuns.timeToValidMs.median, " ms")} |
| Total tokens | ${metric(A.totals.totalTokens)} | ${metric(B.totals.totalTokens)} | ${metric(C.totals.totalTokens)} |
| Model calls | ${A.totals.modelCalls} | ${B.totals.modelCalls} | ${C.totals.modelCalls} |
| MCP calls | ${A.totals.mcpCalls ?? 0} | ${B.totals.mcpCalls} | ${C.totals.mcpCalls} |
| Recorded cost | $${A.totals.estimatedCostUsd.toFixed(6)} | $${B.totals.estimatedCostUsd.toFixed(6)} | $${C.totals.estimatedCostUsd.toFixed(6)} |

B/C paid spend는 합계 **$${report.paidSpendUsd.toFixed(6)}** / 승인된 $${report.approvedCombinedSpendCapUsd.toFixed(2)}다.
A 비용은 historical baseline이며 B/C spend에 합산하지 않는다.

## 사전 기준 판정

- Held-out final correctness: ${passLabel(report.acceptance.heldoutCorrectness.finalCorrectness.passed)}
- Held-out first-pass correctness: ${passLabel(report.acceptance.heldoutCorrectness.firstPassCorrectness.passed)}
- Overall final correctness: ${passLabel(report.acceptance.overallCorrectness.finalCorrectness.passed)}
- Overall first-pass correctness: ${passLabel(report.acceptance.overallCorrectness.firstPassCorrectness.passed)}
- C versus B final-correctness guard: ${passLabel(report.acceptance.cVersusBFinalCorrectness.passed)}
- Successful-chart token reduction: ${metric(report.acceptance.efficiency.totalTokens.reductionPercent, "%")}, ${passLabel(report.acceptance.efficiency.totalTokens.passed)}
- Successful-chart model-call reduction: ${metric(report.acceptance.efficiency.modelCalls.reductionPercent, "%")}, ${passLabel(report.acceptance.efficiency.modelCalls.passed)}
- Successful-chart time-to-valid reduction: ${metric(report.acceptance.efficiency.timeToValidMs.reductionPercent, "%")}, ${passLabel(report.acceptance.efficiency.timeToValidMs.passed)}
- Efficiency thresholds passed: ${report.acceptance.efficiencyThresholdsPassed} / ${report.acceptance.requiredEfficiencyThresholdsPassed}
- Final decision: **${decision}**

## Failure distribution

- B: ${JSON.stringify(B.overall.failureCategories)}
- C: ${JSON.stringify(C.overall.failureCategories)}

## 재현성과 증거

- Candidate commit: \`${report.candidateCommit}\`
- Resolved model B/C: \`${B.models.join(", ")}\` / \`${C.models.join(", ")}\`
- B raw SHA-256: \`${report.rawEvidence.B.sha256}\`
- C raw SHA-256: \`${report.rawEvidence.C.sha256}\`
- Output root: \`${report.outputRoot}\`

Machine-readable aggregate와 sanitized task records는 [LLM_CORRECTED_COMPARISON.json](./LLM_CORRECTED_COMPARISON.json)이
소유한다. API key, raw provider response, reasoning text와 complete submitted source는 포함하지 않는다.
`;
}

export async function generateCorrectedComparison({
  prepared = undefined,
  baselineFile = defaultBaselineFile,
  resultFiles = defaultResultsFiles,
  jsonFile = path.join(phaseRoot, "LLM_CORRECTED_COMPARISON.json"),
  markdownFile = path.join(phaseRoot, "LLM_CORRECTED_COMPARISON.md")
} = {}) {
  const full = prepared ?? await prepareCorrectiveFullEvaluation();
  const A = JSON.parse(await readFile(baselineFile, "utf8"));
  const raw = { B: await readResults(resultFiles.B), C: await readResults(resultFiles.C) };
  for (const condition of full.fullPlan.conditions) {
    requireCondition(
      raw[condition].length === full.fullPlan.runsPerCondition,
      `Condition ${condition} must contain exactly ${full.fullPlan.runsPerCondition} corrected results.`
    );
    const ids = new Set(raw[condition].map(result => result.runId));
    requireCondition(ids.size === raw[condition].length, `Condition ${condition} contains duplicate run IDs.`);
    for (const result of raw[condition]) {
      validateEvaluationResult(result, full.corpus);
      requireCondition(result.condition === condition, `Condition ${condition} result identity changed.`);
      requireCondition(
        result.knowledge.commit === full.fullPlan.candidateCommit,
        `Condition ${condition} knowledge candidate changed.`
      );
      requireCondition(
        result.model.resolvedName === full.evaluationPlan.model.name,
        `Condition ${condition} resolved model changed.`
      );
    }
  }
  const B = summarizeEvaluationResults(raw.B, full.corpus, {
    condition: "B",
    knowledgeMode: "structured-knowledge",
    knowledgeCommit: full.fullPlan.candidateCommit
  });
  const C = summarizeEvaluationResults(raw.C, full.corpus, {
    condition: "C",
    knowledgeMode: "local-mcp",
    knowledgeCommit: full.fullPlan.candidateCommit
  });
  const report = {
    schemaVersion: 1,
    candidateCommit: full.fullPlan.candidateCommit,
    outputRoot: full.fullPlan.outputRoot,
    conditions: { A, B: compact(B), C: compact(C) },
    acceptance: acceptanceDecision(A, B, C, full.evaluationPlan.acceptance),
    paidSpendUsd: round(B.totals.estimatedCostUsd + C.totals.estimatedCostUsd),
    approvedCombinedSpendCapUsd: full.fullPlan.spendUsd.approvedCombinedCap,
    rawEvidence: {
      B: { runs: raw.B.length, sha256: await sha256(resultFiles.B) },
      C: { runs: raw.C.length, sha256: await sha256(resultFiles.C) }
    }
  };
  requireCondition(
    report.paidSpendUsd <= report.approvedCombinedSpendCapUsd,
    "Corrected comparison exceeded the approved combined spend cap."
  );
  await writeFile(jsonFile, `${JSON.stringify(report, null, 2)}\n`);
  await writeFile(markdownFile, correctedComparisonMarkdown(report));
  return report;
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  const report = await generateCorrectedComparison();
  process.stdout.write(`${JSON.stringify({
    runs: { B: report.conditions.B.overall.runs, C: report.conditions.C.overall.runs },
    finalCorrectness: {
      A: report.conditions.A.overall.finalCorrectnessPercent,
      B: report.conditions.B.overall.finalCorrectnessPercent,
      C: report.conditions.C.overall.finalCorrectnessPercent
    },
    paidSpendUsd: report.paidSpendUsd,
    accepted: report.acceptance.passed
  }, null, 2)}\n`);
}
