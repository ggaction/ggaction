import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { appendFile, mkdir, readFile, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import { captureCurrentDocumentationSnapshot } from "./current-docs.js";
import { loadInstalledDirectKnowledge, prepareInstalledMcpArtifact } from "./installed-mcp-artifact.js";
import { createLocalMcpKnowledgeClient } from "./mcp-client.js";
import { runPairedEvaluationTask } from "./paired-condition-runner.js";
import { loadGeneralizationCorpus } from "./paired-corpus.js";
import {
  captureStructuredKnowledgeSurface,
  createPairedKnowledgeAdapter
} from "./paired-knowledge-adapters.js";
import { summarizePairedEvaluationResults } from "./paired-summary.js";
import { loadApiKey } from "./openai-responses.js";

const root = fileURLToPath(new URL("../../", import.meta.url));
const outputBoundary = path.join(root, ".artifacts", "llm-eval", "paired-pilot");
const approvalBoundary = path.join(root, ".artifacts", "llm-eval", "approvals");
const allowedPostCandidateFiles = new Set([
  "agent_docs/impl/roadmap5.3/ROADMAP.md",
  "agent_docs/impl/roadmap5.3/phase6/GATE_T.md",
  "agent_docs/impl/roadmap5.3/phase6/GOAL.md"
]);
const currentPaidGate = "R53-P6-T";

function invariant(condition, message) {
  if (!condition) throw new Error(message);
}

function argumentValue(name) {
  const index = process.argv.indexOf(name);
  return index === -1 ? undefined : process.argv[index + 1];
}

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function insideBoundary(file, boundary) {
  const relative = path.relative(boundary, path.resolve(file));
  return relative !== "" && !relative.startsWith("..") && !path.isAbsolute(relative);
}

export function assertPairedPilotApproval({ approval, plan, loadedCorpus }) {
  invariant(plan?.status === "unpaid-validation-only", "Paired plan must remain unpaid-validation-only in source control.");
  invariant(plan.paidPilot?.status === "blocked-pending-paid-gate", "Source plan must remain blocked pending a paid Gate.");
  invariant(plan.paidPilot.credentialReadsAllowed === false, "Source plan must not authorize credential reads.");
  invariant(plan.paidPilot.externalModelCallsAllowed === false, "Source plan must not authorize external calls.");
  invariant(plan.paidPilot.approvedSpendUsd === 0, "Source plan must retain zero approved spend.");
  invariant(approval?.schemaVersion === 1, "Paired pilot approval schemaVersion must be 1.");
  invariant(approval.gate === currentPaidGate && approval.status === "approved", "Gate T approval is required.");
  for (const key of ["candidateCommit", "gateRecordCommit"]) {
    invariant(/^[0-9a-f]{40}$/u.test(approval[key]), `Approval ${key} must be an exact Git SHA.`);
  }
  invariant(approval.corpusSha256 === loadedCorpus.sha256, "Approval corpus SHA-256 does not match the frozen corpus.");
  invariant(Array.isArray(approval.conditions) && approval.conditions.join(",") === "A,B,C,D",
    "Paired pilot approval must cover exactly A, B, C, and D.");
  invariant(Array.isArray(approval.taskIds) && approval.taskIds.length > 0 && new Set(approval.taskIds).size === approval.taskIds.length,
    "Paired pilot approval requires unique task IDs.");
  const knownTaskIds = new Set(loadedCorpus.corpus.tasks.map(task => task.id));
  invariant(approval.taskIds.every(id => knownTaskIds.has(id)), "Paired pilot approval contains an unknown task ID.");
  invariant(Number.isInteger(approval.repetitionsPerTask) && approval.repetitionsPerTask > 0,
    "Paired pilot repetitionsPerTask must be positive.");
  invariant(approval.maximumRuns === approval.conditions.length * approval.taskIds.length * approval.repetitionsPerTask,
    "Paired pilot maximumRuns must equal the approved condition/task/repetition product.");
  invariant(Number.isFinite(approval.hardSpendCapUsd) && approval.hardSpendCapUsd > 0,
    "Paired pilot hard spend cap must be positive.");
  invariant(approval.credentialReadsAllowed === true && approval.externalModelCallsAllowed === true,
    "Paired pilot approval must explicitly authorize credential reads and external model calls.");
  invariant(typeof approval.orderSeed === "string" && approval.orderSeed.length >= 8,
    "Paired pilot approval requires an order seed.");
  return true;
}

export function orderedPairedPilotRuns({ approval, corpus }) {
  const taskById = new Map(corpus.tasks.map(task => [task.id, task]));
  const runs = [];
  for (let repetition = 1; repetition <= approval.repetitionsPerTask; repetition += 1) {
    for (const taskId of approval.taskIds) {
      for (const condition of approval.conditions) runs.push({ condition, task: taskById.get(taskId), repetition });
    }
  }
  const orderKey = run => sha256(`${approval.orderSeed}:${run.condition}:${run.task.id}:${run.repetition}`);
  return runs.toSorted((left, right) => orderKey(left).localeCompare(orderKey(right)));
}

export function assertPairedPilotRunCanContinue(result, plan) {
  invariant(result.model.resolvedName === plan.model.name,
    `Resolved model mismatch: expected ${plan.model.name}, received ${result.model.resolvedName}.`);
  invariant(result.outcome.failureCategory !== "budget-exceeded",
    "Paid pilot stopped before a request that could not fit under the remaining hard cap.");
  invariant(!["provider-error", "timeout"].includes(result.outcome.failureCategory),
    "Paid pilot stopped after a request without complete billable usage; no further paid request is safe.");
  return true;
}

export function assertCandidateTree({ approval, cwd = root }) {
  const head = execFileSync("git", ["rev-parse", "HEAD"], { cwd, encoding: "utf8" }).trim();
  invariant(head === approval.gateRecordCommit, "Current HEAD is not the approved Gate T record commit.");
  const status = execFileSync("git", ["status", "--porcelain", "--untracked-files=no"], { cwd, encoding: "utf8" }).trim();
  invariant(status === "", "Tracked files must be clean before a paid pilot.");
  execFileSync("git", ["cat-file", "-e", `${approval.candidateCommit}^{commit}`], { cwd, stdio: "pipe" });
  const changed = execFileSync("git", ["diff", "--name-only", `${approval.candidateCommit}..${head}`], {
    cwd,
    encoding: "utf8"
  }).trim().split("\n").filter(Boolean);
  invariant(changed.every(file => allowedPostCandidateFiles.has(file)),
    "Only Gate T approval records may differ from the candidate commit.");
  return Object.freeze({ head, changed: Object.freeze(changed) });
}

async function assertFreshOutputRoot(outputRoot) {
  invariant(insideBoundary(outputRoot, outputBoundary), "Paid pilot output must be a fresh child of .artifacts/llm-eval/paired-pilot/.");
  try {
    await stat(outputRoot);
    throw new Error("Paid pilot output root already exists.");
  } catch (error) {
    if (error?.code !== "ENOENT") throw error;
  }
}

async function loadApproval(file) {
  invariant(typeof file === "string" && insideBoundary(file, approvalBoundary),
    "Approval file must be inside .artifacts/llm-eval/approvals/.");
  const source = await readFile(file, "utf8");
  return Object.freeze({ approval: JSON.parse(source), source, sha256: sha256(source) });
}

function structuredSurfaceSha256(surface) {
  return sha256(JSON.stringify({
    instructions: surface.instructions,
    tools: surface.tools,
    routingText: surface.routingText,
    resourcePatterns: surface.resourcePatterns.map(pattern => pattern.source)
  }));
}

async function createPilotKnowledge({ approval, installed, documentation }) {
  const probe = createLocalMcpKnowledgeClient(installed.clientOptions);
  const mcpC = createLocalMcpKnowledgeClient(installed.clientOptions);
  const mcpD = createLocalMcpKnowledgeClient(installed.clientOptions);
  try {
    const surface = await captureStructuredKnowledgeSurface(probe);
    const directKnowledge = await loadInstalledDirectKnowledge(installed);
    const common = {
      commit: approval.candidateCommit,
      structuredSurface: surface,
      structuredKnowledge: directKnowledge,
      documentation
    };
    return {
      surface,
      adapters: Object.freeze({
        A: createPairedKnowledgeAdapter({ condition: "A", ...common }),
        B: createPairedKnowledgeAdapter({ condition: "B", ...common }),
        C: createPairedKnowledgeAdapter({ condition: "C", mcp: mcpC, ...common }),
        D: createPairedKnowledgeAdapter({ condition: "D", mcp: mcpD, ...common })
      }),
      close: async () => Promise.all([probe.close(), mcpC.close(), mcpD.close()])
    };
  } catch (error) {
    await Promise.all([probe.close(), mcpC.close(), mcpD.close()]);
    throw error;
  }
}

export async function runApprovedPairedPilot({
  approvalFile,
  tokenFile,
  outputRoot,
  fetchImpl = globalThis.fetch
}) {
  const [approvalArtifact, loadedCorpus, plan] = await Promise.all([
    loadApproval(approvalFile),
    loadGeneralizationCorpus(),
    readFile(new URL("../../test/llm/paired-evaluation-plan.json", import.meta.url), "utf8").then(JSON.parse)
  ]);
  const { approval } = approvalArtifact;
  assertPairedPilotApproval({ approval, plan, loadedCorpus });
  assertCandidateTree({ approval });
  invariant(typeof tokenFile === "string" && tokenFile.length > 0, "An explicitly approved token file is required.");
  invariant(typeof outputRoot === "string", "An explicit paid pilot output root is required.");
  await assertFreshOutputRoot(outputRoot);

  const installed = await prepareInstalledMcpArtifact();
  let knowledge;
  try {
    const documentation = await captureCurrentDocumentationSnapshot();
    knowledge = await createPilotKnowledge({ approval, installed, documentation });
    const runs = orderedPairedPilotRuns({ approval, corpus: loadedCorpus.corpus });
    await mkdir(outputRoot, { recursive: false });
    const manifest = {
      schemaVersion: 1,
      gate: approval.gate,
      candidateCommit: approval.candidateCommit,
      gateRecordCommit: approval.gateRecordCommit,
      approvalSha256: approvalArtifact.sha256,
      corpusSha256: loadedCorpus.sha256,
      documentation: documentation.artifact,
      installedPackage: installed.artifact,
      structuredSurfaceSha256: structuredSurfaceSha256(knowledge.surface),
      model: plan.model,
      pricingUsdPerMillionTokens: plan.pricingUsdPerMillionTokens,
      hardSpendCapUsd: approval.hardSpendCapUsd,
      order: runs.map(run => `${run.condition}:${run.task.id}:r${run.repetition}`)
    };
    await writeFile(path.join(outputRoot, "manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`);

    // Credential access is intentionally the final pre-request step after every unpaid guard and artifact check.
    const apiKey = await loadApiKey(tokenFile);
    const results = [];
    let spentUsd = 0;
    for (const run of runs) {
      const remainingSpendUsd = approval.hardSpendCapUsd - spentUsd;
      invariant(remainingSpendUsd > 0, "Paid pilot hard spend cap has been reached.");
      const result = await runPairedEvaluationTask({
        knowledge: knowledge.adapters[run.condition],
        apiKey,
        corpus: loadedCorpus.corpus,
        task: run.task,
        repetition: run.repetition,
        plan,
        outputRoot: path.join(outputRoot, "runs"),
        fetchImpl,
        remainingSpendUsd
      });
      results.push(result);
      spentUsd += result.metrics.estimatedCostUsd;
      invariant(spentUsd <= approval.hardSpendCapUsd + Number.EPSILON, "Paid pilot exceeded its hard spend cap.");
      await appendFile(path.join(outputRoot, "results.jsonl"), `${JSON.stringify(result)}\n`);
      const summary = summarizePairedEvaluationResults(results, { corpusSha256: loadedCorpus.sha256 });
      await writeFile(path.join(outputRoot, "summary.json"), `${JSON.stringify(summary, null, 2)}\n`);
      process.stdout.write(`${JSON.stringify({
        runId: result.runId,
        valid: result.outcome.finalValid,
        failureCategory: result.outcome.failureCategory,
        modelCalls: result.metrics.modelCalls,
        totalTokens: result.metrics.totalTokens,
        costUsd: result.metrics.estimatedCostUsd,
        unreportedCostUpperBoundUsd: result.metrics.unreportedCostUpperBoundUsd,
        cumulativeCostUsd: spentUsd
      })}\n`);
      assertPairedPilotRunCanContinue(result, plan);
    }
    return Object.freeze({ outputRoot, runs: results.length, spentUsd, manifest });
  } finally {
    await knowledge?.close();
    await installed.cleanup();
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  const result = await runApprovedPairedPilot({
    approvalFile: argumentValue("--approval-file"),
    tokenFile: argumentValue("--token-file"),
    outputRoot: argumentValue("--output-root")
  });
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
}
