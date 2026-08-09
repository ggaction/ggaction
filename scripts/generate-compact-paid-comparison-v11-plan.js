import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";

import {
  continuationSourceFileV11,
  paidComparisonRootV11
} from "./compact-paid-comparison-v11.js";
import { root } from "./compact-runtime-closure-v2.js";

const basePlanFile = "evaluation/compact-authoring-paid-comparison-v10/PLAN.json";
const productCandidateCommit = "4e211ba418cd437d7c66c4fb986fcc714cf579ea";
const evaluatorSourcePaths = [
  "evaluation/compact-authoring-paid-comparison-v9/ROUTE_ORACLE.json",
  "evaluation/compact-authoring-paid-comparison-v10/PLAN.json",
  "evaluation/compact-authoring-final-v3/corpus.json",
  "evaluation/compact-authoring-final-v3/datasets.json",
  "evaluation/compact-authoring-final-v3/ROUTE_ORACLE.json",
  "evaluation/compact-authoring-final-v3/RESULT.json",
  "scripts/compact-paid-comparison-v11.js",
  "scripts/run-compact-paid-comparison-v11.js",
  "scripts/compact-paid-comparison-v10.js",
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

function committedFile(commit, relative) {
  return execFileSync("git", ["show", `${commit}:${relative}`], {
    cwd: root,
    maxBuffer: 30_000_000
  });
}

const evaluatorCheckpointCommit = git(["rev-parse", "HEAD"]).trim();
const dirty = git(["status", "--porcelain", "--", ...evaluatorSourcePaths]).trim();
if (dirty !== "") {
  throw new Error("Commit the complete v11 evaluator before freezing its plan.");
}

const [basePlanBytes, sourceBytes] = await Promise.all([
  readFile(`${root}/${basePlanFile}`),
  readFile(continuationSourceFileV11)
]);
const basePlanSha256 = sha256(basePlanBytes);
if (basePlanSha256 !== "48d8cdebf81bcefedef96148a20836c46fb483ddae8080aef46c013a20f3d950") {
  throw new Error("Paid comparison v11 base plan drifted.");
}
const source = JSON.parse(sourceBytes);
const base = JSON.parse(basePlanBytes);
if (
  sha256(sourceBytes) !== "1fea9ad184df9bb2f0a80cc714e26fba542232bd7856bf3b8ebd268dddcc2381" ||
  source.results.length !== 214 ||
  source.results.at(-1)?.id !== base.runOrder[213]
) {
  throw new Error("Paid comparison v11 continuation source drifted.");
}

const evaluatorSourceFiles = Object.fromEntries(evaluatorSourcePaths.map(relative => [
  relative,
  sha256(committedFile(evaluatorCheckpointCommit, relative))
]));
const productSourceTrees = Object.fromEntries(productPaths.map(relative => [
  relative,
  git(["rev-parse", `${productCandidateCommit}:${relative}`]).trim()
]));

const plan = {
  ...base,
  id: "compact-authoring-paid-comparison-v11",
  requiredGate: "R54-P6-C",
  basePlanSha256,
  evaluatorCheckpointCommit,
  evaluatorSourceFiles,
  productSourceTrees,
  continuation: {
    source: "evaluation/compact-authoring-paid-comparison-v10/results/IN_PROGRESS.json",
    sourceSha256: sha256(sourceBytes),
    completedTaskRuns: source.results.length,
    remainingTaskRuns: base.runOrder.length - source.results.length,
    nextRunPosition: source.results.length + 1,
    nextRun: base.runOrder[source.results.length],
    lastCompletedRun: source.results.at(-1).id,
    stoppedConsecutiveProviderFailures: source.ledger.consecutiveProviderFailureTaskRuns,
    approvedCircuitReset: 0,
    carryModelCalls: source.ledger.modelCalls,
    carryApiRequestAttempts: source.ledger.apiRequestAttempts,
    carryProviderRetries: source.ledger.providerRetries,
    carryStandardCostUsd: source.ledger.standardCostUsd,
    carryCostUsd: source.ledger.costUsd,
    carryUncertainCostReserveUsd: source.ledger.uncertainCostReserveUsd,
    carryExposureCostUsd: source.ledger.exposureCostUsd
  },
  continuationStopRules: [
    "continuation-source-hash-mismatch",
    "continuation-result-order-mismatch",
    "continuation-ledger-mismatch",
    "continuation-identity-mismatch"
  ]
};

await writeFile(`${paidComparisonRootV11}/PLAN.json`, `${JSON.stringify(plan, null, 2)}\n`);
process.stdout.write(`${JSON.stringify({
  evaluatorCheckpointCommit,
  basePlanSha256,
  continuationSourceSha256: plan.continuation.sourceSha256,
  preservedTaskRuns: plan.continuation.completedTaskRuns,
  remainingTaskRuns: plan.continuation.remainingTaskRuns,
  nextRun: plan.continuation.nextRun,
  carriedExposureCostUsd: plan.continuation.carryExposureCostUsd,
  hardCostUsd: plan.limits.hardCostUsd
}, null, 2)}\n`);
