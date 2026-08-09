import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { writeFile } from "node:fs/promises";

import {
  loadRouteOracleV9,
  modelCallEnvelopeV9,
  threeModelRunOrderV9
} from "./compact-paid-oracle-v9.js";
import { paidComparisonRootV10 } from "./compact-paid-comparison-v10.js";
import { root } from "./compact-runtime-closure-v2.js";

const productCandidateCommit = "4e211ba418cd437d7c66c4fb986fcc714cf579ea";
const evaluatorSourcePaths = [
  "evaluation/compact-authoring-paid-comparison-v9/ROUTE_ORACLE.json",
  "evaluation/compact-authoring-final-v3/corpus.json",
  "evaluation/compact-authoring-final-v3/datasets.json",
  "evaluation/compact-authoring-final-v3/ROUTE_ORACLE.json",
  "evaluation/compact-authoring-final-v3/RESULT.json",
  "scripts/compact-paid-comparison-v10.js",
  "scripts/run-compact-paid-comparison-v10.js",
  "scripts/compact-paid-state-machine-v4.js",
  "scripts/compact-paid-oracle-v9.js",
  "scripts/compact-paid-comparison-v3.js",
  "scripts/compact-paid-comparison-v8.js",
  "scripts/compact-paid-oracle-v8.js",
  "scripts/compact-paid-state-machine-v3.js",
  "scripts/compact-openai-response-v2.js",
  "scripts/compact-paid-comparison-v2.js",
  "scripts/compact-paid-smoke-v6.js",
  "scripts/compact-paid-smoke-v5.js",
  "scripts/compact-paid-smoke-v4.js",
  "scripts/compact-full-evaluator-v2.js",
  "scripts/compact-runtime-closure-v2.js",
  "scripts/compact-paid-smoke.js"
];
const productPaths = ["src", "types", "knowledge", "docs", "package.json"];

function git(args, options = {}) {
  return execFileSync("git", args, {
    cwd: root,
    encoding: options.encoding ?? "utf8",
    maxBuffer: 30_000_000
  });
}

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function money(value) {
  return Number(value.toFixed(12));
}

function committedFile(commit, relative) {
  return execFileSync("git", ["show", `${commit}:${relative}`], {
    cwd: root,
    maxBuffer: 30_000_000
  });
}

function projection(runOrder, models, inputTokens, outputTokens, maximum = false) {
  const byId = new Map(models.map(model => [model.id, model]));
  const runCounts = new Map(models.map(model => [model.id, 0]));
  for (const run of runOrder) {
    const modelId = run.split(":").at(-2);
    runCounts.set(modelId, runCounts.get(modelId) + 1);
  }
  const standard = [...runCounts].reduce((sum, [modelId, count]) => {
    const pricing = byId.get(modelId).pricingPerMillionTokens;
    const inputRate = maximum ? pricing.maximumInput : pricing.uncachedInput;
    return sum + count * (
      inputTokens * inputRate + outputTokens * pricing.output
    ) / 1_000_000;
  }, 0);
  return { standard, conservative: standard * 1.1 };
}

const evaluatorCheckpointCommit = git(["rev-parse", "HEAD"]).trim();
const dirty = git(["status", "--porcelain", "--", ...evaluatorSourcePaths]).trim();
if (dirty !== "") {
  throw new Error("Commit the complete v10 evaluator before freezing its plan.");
}

const oracle = await loadRouteOracleV9();
const models = [
  {
    id: "gpt-5.6-terra",
    requestModel: "gpt-5.6-terra",
    cacheWriteBillingBasis: "explicit-cache-write",
    pricingPerMillionTokens: {
      uncachedInput: 2,
      cachedInput: 0.2,
      cacheWrite: 2.5,
      maximumInput: 2.5,
      output: 12
    }
  },
  {
    id: "gpt-5.6-luna",
    requestModel: "gpt-5.6-luna",
    cacheWriteBillingBasis: "explicit-cache-write",
    pricingPerMillionTokens: {
      uncachedInput: 0.2,
      cachedInput: 0.02,
      cacheWrite: 0.25,
      maximumInput: 0.25,
      output: 1.2
    }
  },
  {
    id: "gpt-5.4-nano",
    requestModel: "gpt-5.4-nano-2026-03-17",
    cacheWriteBillingBasis: "uncached-input-fallback",
    pricingPerMillionTokens: {
      uncachedInput: 0.2,
      cachedInput: 0.02,
      cacheWrite: 0.2,
      maximumInput: 0.2,
      output: 1.25
    }
  }
];
const conditions = oracle.conditions.map(condition => condition.id);
const repetitions = 2;
const runOrder = threeModelRunOrderV9(
  oracle.tasks,
  models.map(model => model.id),
  conditions,
  repetitions
);
const callEnvelope = modelCallEnvelopeV9(oracle.tasks, models.map(model => model.id), conditions, repetitions, 3);
const expected = projection(runOrder, models, 12000, 4000);
const maximum = projection(runOrder, models, 120000, 28000, true);
const evaluatorSourceFiles = Object.fromEntries(evaluatorSourcePaths.map(relative => [
  relative,
  sha256(committedFile(evaluatorCheckpointCommit, relative))
]));
const productSourceTrees = Object.fromEntries(productPaths.map(relative => [
  relative,
  git(["rev-parse", `${productCandidateCommit}:${relative}`]).trim()
]));

const plan = {
  schemaVersion: 1,
  id: "compact-authoring-paid-comparison-v10",
  requiredGate: "R54-P6-B",
  productCandidateCommit,
  evaluatorCheckpointCommit,
  routeOracleSha256: oracle.oracleSha256,
  api: {
    endpoint: "https://api.openai.com/v1/responses",
    reasoningEffort: "medium",
    textVerbosity: "low",
    serviceTier: "default",
    store: false,
    include: ["reasoning.encrypted_content"]
  },
  models,
  limits: {
    repetitions,
    maximumModelCallsPerTask: 5,
    maximumModelCallsTotal: callEnvelope.maximum,
    maximumApiRequestAttemptsTotal: callEnvelope.maximum + 72,
    maximumProviderRetriesPerRequest: 1,
    maximumProviderRetriesTotal: 72,
    maximumProviderRetryDelayMilliseconds: 30000,
    maximumConsecutiveProviderFailureTaskRuns: 3,
    maximumSubmissionAttemptsPerTask: 3,
    maximumKnowledgeOutputTokensPerResponse: 2000,
    maximumSubmissionOutputTokensPerResponse: 8000,
    maximumInputTokensPerTask: 120000,
    maximumOutputTokensPerTask: 28000,
    projectedInputBytesPerToken: 1,
    maximumRequestBodyBytesPerCall: 524288,
    maximumRequestBodyBytesPerTask: 3145728,
    timeoutMilliseconds: 180000,
    hardCostUsd: 50
  },
  costAccountingMultiplier: 1.1,
  costProjection: {
    expectedModelCallsIfFirstPass: callEnvelope.expected,
    taskRunExpectedInputTokens: 12000,
    taskRunExpectedOutputTokens: 4000,
    expectedUsd: money(expected.standard),
    expectedWithRegionalUpliftUsd: money(expected.conservative),
    theoreticalTokenEnvelopeMaximumUsd: money(maximum.standard),
    theoreticalTokenEnvelopeMaximumWithRegionalUpliftUsd: money(maximum.conservative)
  },
  runOrder,
  evaluatorSourceFiles,
  productSourceTrees,
  boundedTaskOutcomes: [
    "provider-request-failure",
    "model-output-budget-exhausted:max_output_tokens",
    "model-incomplete",
    "model-response-failed",
    "model-protocol-noncompliance",
    "knowledge-tool-failure",
    "strict-evaluator-failure"
  ],
  stopRules: [
    "provider-circuit-breaker",
    "global-provider-retry-cap",
    "non-retryable-provider-request",
    "model-mismatch",
    "service-tier-mismatch",
    "product-candidate-mismatch",
    "evaluator-checkpoint-mismatch",
    "source-hash-mismatch",
    "dirty-product-tree",
    "incomplete-billing-usage",
    "provider-response-status",
    "request-transport-envelope",
    "task-token-envelope",
    "global-response-cap",
    "global-request-attempt-cap",
    "global-exposure-cost-cap"
  ]
};

await writeFile(
  `${paidComparisonRootV10}/PLAN.json`,
  `${JSON.stringify(plan, null, 2)}\n`
);
process.stdout.write(`${JSON.stringify({
  evaluatorCheckpointCommit,
  routeOracleSha256: oracle.oracleSha256,
  taskRuns: runOrder.length,
  expectedModelCalls: callEnvelope.expected,
  maximumModelCalls: callEnvelope.maximum,
  expectedUsd: money(expected.standard),
  expectedWithRegionalUpliftUsd: money(expected.conservative),
  theoreticalTokenEnvelopeMaximumWithRegionalUpliftUsd: money(maximum.conservative)
}, null, 2)}\n`);
