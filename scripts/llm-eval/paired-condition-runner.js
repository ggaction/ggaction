import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  createOpenAIResponse,
  estimateResponseCostUsd,
  hasCompleteBillingUsage,
  normalizeResponseUsage
} from "./openai-responses.js";
import { evaluateGeneratedProgram } from "./program-evaluator.js";
import { scoreEvaluationEvidence } from "./score.js";

const root = fileURLToPath(new URL("../../", import.meta.url));
const conditionModes = Object.freeze({
  A: "docs-only",
  B: "structured-direct",
  C: "structured-mcp",
  D: "docs-plus-mcp"
});

export const submitProgramTool = Object.freeze({
  type: "function",
  name: "submit_program",
  description: "Submit one complete ESM module that exports buildChart(datasets) and returns a fully materialized ChartProgram.",
  strict: true,
  parameters: Object.freeze({
    type: "object",
    additionalProperties: false,
    required: Object.freeze(["source"]),
    properties: Object.freeze({
      source: Object.freeze({ type: "string", minLength: 1, maxLength: 30_000 })
    })
  })
});

function addUsage(total, usage) {
  const normalized = normalizeResponseUsage(usage);
  for (const key of Object.keys(total)) total[key] += normalized[key] ?? 0;
}

function requestTokenEstimate(request) {
  return Math.ceil(JSON.stringify(request).length / 3.5);
}

function requestTokenUpperBound(request) {
  return Buffer.byteLength(JSON.stringify(request), "utf8");
}

function operationDelta(before, after) {
  return Object.freeze(Object.fromEntries(Object.keys(after).map(key => [key, after[key] - (before[key] ?? 0)])));
}

function failureCategory(failures, runtimeError, providerError, submissions) {
  if (["budget-exceeded", "timeout"].includes(providerError)) return providerError;
  if (providerError !== null) return "provider-error";
  if (submissions === 0) return "invalid-program";
  if (runtimeError) return "runtime-error";
  if (failures.some(failure => failure.startsWith("forbidden-action:"))) return "forbidden-primitive";
  if (failures.some(failure => failure.startsWith("missing-action:"))) return "missing-action";
  if (failures.some(failure => failure.startsWith("missing-renderer:"))) return "renderer-failed";
  return failures.length > 0 ? "validation-failed" : null;
}

function sanitizedArguments(call) {
  if (call.name === "submit_program") return { submission: true };
  try {
    const args = JSON.parse(call.arguments);
    return Object.fromEntries(Object.entries(args).flatMap(([key, value]) =>
      typeof value === "string" ? [[key, value.slice(0, 500)]] : Number.isInteger(value) ? [[key, value]] : []
    ));
  } catch {
    return { invalidJson: true };
  }
}

function sanitizedKnowledgeResult(output) {
  const summary = { bytes: Buffer.byteLength(output, "utf8") };
  try {
    const parsed = JSON.parse(output);
    const primary = parsed?.primaryResource;
    if (typeof primary?.kind === "string" && typeof primary?.id === "string") {
      summary.primaryIdentity = `${primary.kind}:${primary.id}`;
    }
    if (typeof parsed?.kind === "string" && typeof parsed?.id === "string") {
      summary.identity = `${parsed.kind}:${parsed.id}`;
    }
    const results = Array.isArray(parsed) ? parsed : parsed?.results;
    if (Array.isArray(results)) {
      summary.identities = results.slice(0, 10).flatMap(result =>
        typeof result?.kind === "string" && typeof result?.id === "string"
          ? [`${result.kind}:${result.id}`]
          : []
      );
      summary.routes = results.slice(0, 10).flatMap(result =>
        typeof result?.url === "string" ? [result.url] : []
      );
    }
    if (typeof parsed?.route === "string" && typeof parsed?.file === "string") {
      summary.documentationRoute = parsed.route;
      summary.documentationFile = parsed.file;
    }
    if (typeof parsed?.error === "string") summary.error = parsed.error.slice(0, 500);
  } catch {
    summary.unparseable = true;
  }
  return summary;
}

function programInstructions(task, knowledge, routingText, maximumKnowledgeToolCalls) {
  const datasetFields = task.data.map(selection => `${selection.id}: ${selection.fields.join(", ")}`).join("\n");
  return `Write one executable ggaction chart program.

${knowledge.instruction}

You may make at most ${maximumKnowledgeToolCalls} knowledge-tool calls. Use returned routes and resource URIs exactly; never guess one.

Use domain actions for ordinary chart authoring. Do not invent action names or option keys. Do not use editSemantic, createGraphics, or editGraphics unless the task explicitly asks for extension authoring.

Submit one complete ESM JavaScript module through submit_program. It must:
- import only the public ggaction entries needed to construct the chart;
- export function buildChart(datasets), returning one fully materialized ChartProgram;
- read rows from datasets["<versioned-id>"] instead of embedding or importing task data;
- remove rows whose task-declared fields are null before createData;
- use an explicit 640×400 Canvas with adequate margins unless the task requires composition;
- leave rendering to the evaluator and avoid DOM, filesystem, network, process, dynamic import, eval, and arbitrary code execution.

Available dataset fields:
${datasetFields}

Task:
${task.prompt}

${knowledge.routingLabel}:
${routingText}`;
}

async function taskDatasets(corpus, task) {
  const entries = await Promise.all(task.data.map(async selection => [
    selection.id,
    JSON.parse(await readFile(path.join(root, corpus.datasets[selection.id].path), "utf8"))
  ]));
  return Object.fromEntries(entries);
}

function evidenceFrom(evaluation, runtimeError) {
  return evaluation === undefined ? {
    actions: [], runtimeFunctions: [], validations: [], renderers: [], runtimeError
  } : {
    actions: evaluation.actions,
    runtimeFunctions: evaluation.runtimeFunctions,
    validations: evaluation.validations,
    renderers: evaluation.renderers,
    runtimeError
  };
}

function failedValidationDiagnostics(evaluation) {
  return (evaluation?.validations ?? [])
    .filter(validation => !validation.passed && typeof validation.diagnostic === "string")
    .map(validation => ({
      id: validation.id,
      diagnostic: validation.diagnostic.slice(0, 1000)
    }));
}

export function validatePairedEvaluationResult(result, corpus) {
  if (result?.schemaVersion !== 2) throw new Error("Paired result schemaVersion must be 2.");
  if (conditionModes[result.condition] !== result.knowledge?.mode) {
    throw new Error("Paired result condition and knowledge mode disagree.");
  }
  if (!corpus.tasks.some(task => task.id === result.taskId)) throw new Error("Paired result references an unknown task.");
  if (!/^[0-9a-f]{40}$/u.test(result.knowledge.commit)) throw new Error("Paired result requires an exact knowledge commit.");
  for (const key of [
    "modelCalls",
    "knowledgeToolCalls",
    "knowledgeToolCallsExecuted",
    "knowledgeToolCallsRejected",
    "submissions",
    "repairRounds"
  ]) {
    if (!Number.isInteger(result.metrics[key]) || result.metrics[key] < 0) throw new Error(`Invalid paired metric ${key}.`);
  }
  if (
    result.metrics.knowledgeToolCalls !==
    result.metrics.knowledgeToolCallsExecuted + result.metrics.knowledgeToolCallsRejected
  ) throw new Error("Paired knowledge tool attempts must equal executed plus rejected calls.");
  if (!Number.isFinite(result.metrics.unreportedCostUpperBoundUsd) || result.metrics.unreportedCostUpperBoundUsd < 0) {
    throw new Error("Paired result requires a non-negative unreported request cost upper bound.");
  }
  if (result.metrics.repairRounds !== Math.max(0, result.metrics.submissions - 1)) {
    throw new Error("Paired repairRounds must count submissions after the first.");
  }
  if (result.metrics.modelCalls > result.model.maximumModelCallsPerTask) {
    throw new Error("Paired result exceeds its model call envelope.");
  }
  if (result.outcome.finalValid !== (result.outcome.failureCategory === null)) {
    throw new Error("Paired final validity and failure category disagree.");
  }
  if (typeof result.outcome.naturalSubmission !== "boolean" || typeof result.outcome.forcedSubmissionUsed !== "boolean") {
    throw new Error("Paired result must separate natural and forced submission.");
  }
  if (!(result.evidence.validations ?? []).every(validation =>
    validation.diagnostic === undefined || (
      validation.passed === false &&
      typeof validation.diagnostic === "string" &&
      validation.diagnostic.length > 0 &&
      validation.diagnostic.length <= 1000
    )
  )) {
    throw new Error("Paired validation diagnostics must be bounded failed-check explanations.");
  }
  return true;
}

export async function runPairedEvaluationTask({
  knowledge,
  apiKey,
  corpus,
  task,
  repetition,
  plan,
  outputRoot,
  fetchImpl = globalThis.fetch,
  remainingSpendUsd = Number.POSITIVE_INFINITY
}) {
  if (conditionModes[knowledge?.condition] !== knowledge?.mode) {
    throw new TypeError("A paired A/B/C/D knowledge adapter is required.");
  }
  const runId = `${knowledge.condition}-${task.id}-r${repetition}`;
  const artifactRoot = path.join(outputRoot, runId);
  await mkdir(artifactRoot, { recursive: true });
  const endToEndStarted = Date.now();
  const operationsBefore = knowledge.operationSnapshot();
  await knowledge.initialize();
  const routingText = await knowledge.routingText();
  const taskLoopStarted = Date.now();
  const sampling = plan.sampling;
  const input = [{
    role: "user",
    content: programInstructions(task, knowledge, routingText, sampling.maximumKnowledgeToolCallsPerTask)
  }];
  const usage = {
    promptTokens: 0,
    cachedInputTokens: 0,
    cacheWriteTokens: 0,
    completionTokens: 0,
    reasoningTokens: 0,
    totalTokens: 0
  };
  const trace = {
    schemaVersion: 2,
    runId,
    condition: knowledge.condition,
    taskId: task.id,
    repetition,
    rounds: []
  };
  const taskSignal = AbortSignal.timeout(sampling.timeoutMsPerTask);
  let estimatedCostUsd = 0;
  let unreportedCostUpperBoundUsd = 0;
  let modelCalls = 0;
  let knowledgeToolCalls = 0;
  let knowledgeToolCallsExecuted = 0;
  let knowledgeToolCallsRejected = 0;
  let submissions = 0;
  const submissionArtifacts = [];
  let firstSubmissionValid = false;
  let naturalSubmission = false;
  let forcedSubmissionUsed = false;
  let firstSubmissionAtMs = null;
  let firstValidAtMs = null;
  let evaluation;
  let lastSource = null;
  let runtimeError = null;
  let providerError = null;
  let resolvedName = plan.model.name;
  let score = { valid: false, failures: ["no-valid-submission"] };

  while (
    modelCalls < sampling.maximumModelCallsPerTask &&
    submissions < sampling.maximumRepairSubmissions + 1 &&
    !score.valid
  ) {
    const remainingOutput = plan.tokenBudgetPerTask.maximumCumulativeOutputTokens - usage.completionTokens;
    if (remainingOutput <= 0 || usage.promptTokens >= plan.tokenBudgetPerTask.maximumCumulativeInputTokens) {
      providerError = "budget-exceeded";
      break;
    }
    const maxOutputTokens = Math.min(plan.tokenBudgetPerTask.maximumOutputTokensPerCall, remainingOutput);
    const forceSubmission = submissions > 0 || modelCalls >= sampling.maximumNaturalModelCallsBeforeForcedSubmission;
    const request = {
      model: plan.model.name,
      input,
      tools: [...knowledge.tools, submitProgramTool],
      tool_choice: forceSubmission ? { type: "function", name: "submit_program" } : "auto",
      reasoning: { effort: plan.model.reasoningEffort },
      text: { verbosity: plan.model.textVerbosity },
      service_tier: plan.model.serviceTier,
      max_output_tokens: maxOutputTokens,
      store: plan.model.store
    };
    const estimatedInput = requestTokenEstimate(request);
    if (usage.promptTokens + estimatedInput > plan.tokenBudgetPerTask.maximumCumulativeInputTokens) {
      providerError = "budget-exceeded";
      break;
    }
    const maximumInputPrice = Math.max(
      plan.pricingUsdPerMillionTokens.uncachedInput,
      plan.pricingUsdPerMillionTokens.cachedInput,
      plan.pricingUsdPerMillionTokens.cacheWrite
    );
    const maximumNextCost = (
      requestTokenUpperBound(request) * maximumInputPrice +
      maxOutputTokens * plan.pricingUsdPerMillionTokens.output
    ) / 1_000_000;
    if (estimatedCostUsd + maximumNextCost > remainingSpendUsd) {
      providerError = "budget-exceeded";
      break;
    }

    const traceRound = {
      round: modelCalls + 1,
      submissionMode: forceSubmission ? (submissions === 0 ? "forced-final" : "forced-repair") : "natural",
      remainingModelCallsAtStart: sampling.maximumModelCallsPerTask - modelCalls,
      calls: []
    };
    trace.rounds.push(traceRound);
    let response;
    try {
      response = await createOpenAIResponse({ apiKey, request, fetchImpl, signal: taskSignal });
    } catch (error) {
      unreportedCostUpperBoundUsd = maximumNextCost;
      providerError = ["AbortError", "TimeoutError"].includes(error.name)
        ? "timeout"
        : error.code ?? `provider-http-${error.status ?? "error"}`;
      runtimeError = error.message;
      break;
    }
    modelCalls += 1;
    resolvedName = response.model ?? resolvedName;
    if (!hasCompleteBillingUsage(response.usage)) {
      unreportedCostUpperBoundUsd = maximumNextCost;
      providerError = "usage-unavailable";
      runtimeError = "OpenAI response did not include complete billable token usage.";
      break;
    }
    addUsage(usage, response.usage);
    estimatedCostUsd += estimateResponseCostUsd(response.usage, plan.pricingUsdPerMillionTokens);
    input.push(...(response.output ?? []));
    const calls = (response.output ?? []).filter(item => item.type === "function_call");
    if (calls.length === 0) {
      input.push({ role: "user", content: "Call submit_program with the complete buildChart(datasets) module." });
      continue;
    }

    for (const call of calls) {
      const traceCall = { name: call.name, arguments: sanitizedArguments(call) };
      traceRound.calls.push(traceCall);
      let output;
      if (call.name === "submit_program") {
        submissions += 1;
        let submissionSource = null;
        if (forceSubmission) forcedSubmissionUsed = true;
        if (submissions === 1) {
          naturalSubmission = !forceSubmission;
          firstSubmissionAtMs = Date.now() - taskLoopStarted;
        }
        try {
          const args = JSON.parse(call.arguments);
          submissionSource = args.source;
          lastSource = submissionSource;
          const submissionFile = path.join(artifactRoot, `program-submission-${submissions}.mjs`);
          await writeFile(submissionFile, submissionSource);
          await writeFile(path.join(artifactRoot, "program.mjs"), submissionSource);
          evaluation = undefined;
          evaluation = await evaluateGeneratedProgram({
            source: submissionSource,
            task,
            datasets: await taskDatasets(corpus, task),
            artifactRoot
          });
          runtimeError = null;
          score = scoreEvaluationEvidence(task, evidenceFrom(evaluation, null));
          const diagnostics = failedValidationDiagnostics(evaluation);
          if (submissions === 1) firstSubmissionValid = score.valid;
          if (score.valid && firstValidAtMs === null) firstValidAtMs = Date.now() - taskLoopStarted;
          output = JSON.stringify({
            valid: score.valid,
            failures: score.failures,
            diagnostics
          });
          traceCall.submission = {
            valid: score.valid,
            failures: score.failures.slice(0, 20),
            diagnostics
          };
          submissionArtifacts.push({
            submission: submissions,
            programFile: submissionFile,
            programSha256: createHash("sha256").update(submissionSource).digest("hex"),
            valid: score.valid,
            failures: score.failures.slice(0, 20),
            diagnostics,
            error: null
          });
        } catch (error) {
          runtimeError = error.message;
          score = { valid: false, failures: [`runtime-error:${error.message}`] };
          if (submissions === 1) firstSubmissionValid = false;
          output = JSON.stringify({ valid: false, failures: ["program execution failed"], error: error.message });
          traceCall.submission = {
            valid: false,
            failures: ["program execution failed"],
            diagnostics: [],
            error: error.message.slice(0, 1000)
          };
          submissionArtifacts.push({
            submission: submissions,
            programFile: submissionSource === null
              ? null
              : path.join(artifactRoot, `program-submission-${submissions}.mjs`),
            programSha256: submissionSource === null
              ? null
              : createHash("sha256").update(submissionSource).digest("hex"),
            valid: false,
            failures: ["program execution failed"],
            diagnostics: [],
            error: error.message.slice(0, 1000)
          });
        }
      } else {
        knowledgeToolCalls += 1;
        if (knowledgeToolCalls > sampling.maximumKnowledgeToolCallsPerTask) {
          knowledgeToolCallsRejected += 1;
          output = JSON.stringify({ error: "Knowledge tool call limit reached." });
        } else {
          knowledgeToolCallsExecuted += 1;
          try {
            output = await knowledge.handle(call);
          } catch (error) {
            output = JSON.stringify({ error: error.message });
          }
        }
        traceCall.result = sanitizedKnowledgeResult(output);
      }
      input.push({ type: "function_call_output", call_id: call.call_id, output });
    }
  }

  const operationsAfter = knowledge.operationSnapshot();
  const finalValid = score.valid;
  const category = failureCategory(score.failures, runtimeError, providerError, submissions);
  const validationLogFile = path.join(artifactRoot, "validation.json");
  const resultEvidence = evidenceFrom(evaluation, runtimeError);
  await writeFile(validationLogFile, `${JSON.stringify({ score, evidence: resultEvidence, providerError }, null, 2)}\n`);
  await writeFile(path.join(artifactRoot, "trace.json"), `${JSON.stringify(trace, null, 2)}\n`);
  const relative = file => file === null ? null : path.relative(root, file);
  const result = {
    schemaVersion: 2,
    runId,
    condition: knowledge.condition,
    taskId: task.id,
    repetition,
    knowledge: { commit: knowledge.commit, mode: knowledge.mode },
    model: {
      provider: plan.provider,
      name: plan.model.name,
      resolvedName,
      reasoningEffort: plan.model.reasoningEffort,
      reasoningMode: plan.model.reasoningMode,
      textVerbosity: plan.model.textVerbosity,
      serviceTier: plan.model.serviceTier,
      store: plan.model.store,
      maximumModelCallsPerTask: sampling.maximumModelCallsPerTask,
      maximumNaturalModelCallsBeforeForcedSubmission: sampling.maximumNaturalModelCallsBeforeForcedSubmission
    },
    metrics: {
      ...usage,
      modelCalls,
      knowledgeToolCalls,
      knowledgeToolCallsExecuted,
      knowledgeToolCallsRejected,
      submissions,
      repairRounds: Math.max(0, submissions - 1),
      setupDurationMs: taskLoopStarted - endToEndStarted,
      taskLoopDurationMs: Date.now() - taskLoopStarted,
      endToEndDurationMs: Date.now() - endToEndStarted,
      timeToFirstSubmissionMs: firstSubmissionAtMs,
      timeToValidMs: firstValidAtMs,
      estimatedCostUsd,
      unreportedCostUpperBoundUsd,
      mcpOperations: operationDelta(operationsBefore, operationsAfter),
      mcpSession: knowledge.sessionSnapshot()
    },
    outcome: {
      retrievalSucceeded: trace.rounds.some(round => round.calls.some(call =>
        call.result?.primaryIdentity !== undefined ||
        call.result?.identity !== undefined ||
        call.result?.identities?.length > 0 ||
        call.result?.routes?.length > 0 ||
        call.result?.documentationRoute !== undefined
      )),
      naturalSubmission,
      forcedSubmissionUsed,
      firstSubmissionValid,
      finalValid,
      failureCategory: category
    },
    evidence: resultEvidence,
    artifacts: {
      programFile: evaluation === undefined
        ? lastSource === null ? null : relative(path.join(artifactRoot, "program.mjs"))
        : relative(evaluation.artifacts.programFile),
      programSha256: evaluation?.artifacts.programSha256 ?? (
        lastSource === null ? null : createHash("sha256").update(lastSource).digest("hex")
      ),
      submissions: submissionArtifacts.map(submission => ({
        ...submission,
        programFile: relative(submission.programFile)
      })),
      validationLogFile: relative(validationLogFile),
      traceFile: relative(path.join(artifactRoot, "trace.json")),
      rendererFiles: (evaluation?.artifacts.rendererFiles ?? []).map(relative)
    }
  };
  validatePairedEvaluationResult(result, corpus);
  return result;
}
