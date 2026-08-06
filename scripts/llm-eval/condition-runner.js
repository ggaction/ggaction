import { createHash } from "node:crypto";
import { appendFile, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { loadEvaluationCorpus, validateEvaluationResult } from "./corpus.js";
import { createOpenAIResponse, estimateResponseCostUsd, normalizeResponseUsage } from "./openai-responses.js";
import { evaluateGeneratedProgram } from "./program-evaluator.js";
import { scoreEvaluationEvidence } from "./score.js";

const root = fileURLToPath(new URL("../../", import.meta.url));
const submitProgramTool = {
    type: "function",
    name: "submit_program",
    description: "Submit the complete ESM JavaScript program for execution and deterministic chart validation.",
    strict: true,
    parameters: {
      type: "object",
      additionalProperties: false,
      required: ["source"],
      properties: {
        source: { type: "string", minLength: 1, maxLength: 30000 }
      }
    }
  };

function addUsage(total, usage) {
  const normalized = normalizeResponseUsage(usage);
  for (const key of Object.keys(total)) total[key] += normalized[key] ?? 0;
}

function requestTokenEstimate(request) {
  return Math.ceil(JSON.stringify(request).length / 3.5);
}

function failureCategory(failures, runtimeError) {
  if (runtimeError) return "runtime-error";
  if (failures.some(failure => failure.startsWith("forbidden-action:"))) return "forbidden-primitive";
  if (failures.some(failure => failure.startsWith("missing-action:"))) return "missing-action";
  if (failures.some(failure => failure.startsWith("missing-renderer:"))) return "renderer-failed";
  if (failures.length > 0) return "validation-failed";
  return null;
}

function sanitizedCallArguments(call) {
  let args;
  try {
    args = JSON.parse(call.arguments);
  } catch {
    return { invalidJson: true };
  }
  if (call.name === "submit_program") return { submission: true };
  const sanitized = {};
  if (typeof args.query === "string") sanitized.query = args.query.slice(0, 500);
  if (Number.isInteger(args.limit)) sanitized.limit = args.limit;
  for (const key of ["kind", "id", "route", "uri"]) {
    if (typeof args[key] === "string") sanitized[key] = args[key].slice(0, 500);
  }
  return sanitized;
}

function sanitizedKnowledgeResult(output) {
  const summary = { bytes: Buffer.byteLength(output, "utf8") };
  try {
    const parsed = JSON.parse(output);
    if (typeof parsed?.kind === "string" && typeof parsed?.id === "string") {
      summary.identity = `${parsed.kind}:${parsed.id}`;
    } else if (typeof parsed?.route === "string") {
      summary.identity = `docs:${parsed.route}`;
    }
    const results = Array.isArray(parsed) ? parsed : parsed?.results;
    if (Array.isArray(results)) {
      summary.identities = results.slice(0, 10).flatMap(result => {
        if (typeof result?.kind === "string" && typeof result?.id === "string") {
          return [`${result.kind}:${result.id}`];
        }
        if (typeof result?.kind === "string" && typeof result?.url === "string") {
          return [`${result.kind}:${result.url}`];
        }
        return [];
      });
    }
    if (typeof parsed?.error === "string") summary.error = parsed.error.slice(0, 500);
  } catch {
    summary.unparseable = true;
  }
  return summary;
}

function programInstructions(task, routingText, knowledge) {
  const datasetFields = task.data.map(selection =>
    `${selection.id}: ${selection.fields.join(", ")}`
  ).join("\n");
  return `You are writing one real ggaction chart program for an executable evaluation.

${knowledge.instruction} Do not use editSemantic, createGraphics, or editGraphics for ordinary chart authoring. Do not invent action names or option keys.

Submit one complete ESM JavaScript source file with submit_program. The source must:
- import only from ggaction, ggaction/basic, ggaction/svg, ggaction/png, or ggaction/pdf;
- import chart and every renderer function requested by the task, even though the evaluator invokes rendering;
- export function buildChart(datasets), returning one fully materialized ChartProgram;
- read rows from datasets["<versioned-id>"] rather than embedding or importing data;
- remove rows whose task-declared fields are null before createData;
- use an explicit 640×400 Canvas with adequate margins unless the task requires a composition;
- avoid filesystem, network, process, dynamic import, eval, and arbitrary code execution.

Available dataset fields:
${datasetFields}

Task:
${task.prompt}

${knowledge.routingLabel}:
${routingText}`;
}

async function loadTaskDatasets(corpus, task) {
  const entries = await Promise.all(task.data.map(async selection => [
    selection.id,
    JSON.parse(await readFile(path.join(root, corpus.datasets[selection.id].path), "utf8"))
  ]));
  return Object.fromEntries(entries);
}

export async function runEvaluationTask({
  knowledge,
  apiKey,
  corpus,
  task,
  repetition,
  plan,
  outputRoot,
  fetchImpl = globalThis.fetch,
  remainingSpendUsd = plan.costPerConditionUsd.approvedSpendCap
}) {
  if (!knowledge || !["A", "B", "C"].includes(knowledge.condition)) {
    throw new TypeError("Evaluation knowledge adapter must be Condition A, B, or C.");
  }
  const runId = `${knowledge.condition}-${task.id}-r${repetition}`;
  const artifactRoot = path.join(outputRoot, runId);
  await mkdir(artifactRoot, { recursive: true });
  await knowledge.initialize?.();
  const routingText = await knowledge.routingText();
  const input = [{ role: "user", content: programInstructions(task, routingText, knowledge) }];
  const usage = {
    promptTokens: 0,
    cachedInputTokens: 0,
    cacheWriteTokens: 0,
    completionTokens: 0,
    reasoningTokens: 0,
    totalTokens: 0
  };
  let estimatedCostUsd = 0;
  let modelCalls = 0;
  let knowledgeCalls = knowledge.condition === "C" ? 1 : 0;
  let submissions = 0;
  let firstPassValid = false;
  let finalEvaluation;
  let lastSubmittedSource = null;
  let finalScore = { valid: false, failures: ["no-valid-submission"] };
  let runtimeError = null;
  let providerError = null;
  let resolvedName = plan.model.name;
  const started = Date.now();
  const trace = {
    schemaVersion: 1,
    runId,
    condition: knowledge.condition,
    taskId: task.id,
    repetition,
    rounds: []
  };
  const taskSignal = AbortSignal.timeout(plan.sampling.timeoutMsPerTask);

  while (modelCalls < plan.sampling.maximumModelCallsPerTask && !finalScore.valid) {
    const remainingOutput = plan.tokenBudgetPerTask.maximumCumulativeOutputTokens - usage.completionTokens;
    if (remainingOutput <= 0 || usage.promptTokens >= plan.tokenBudgetPerTask.maximumCumulativeInputTokens) {
      providerError = "budget-exceeded";
      break;
    }
    const maxOutputTokens = Math.min(plan.tokenBudgetPerTask.maximumOutputTokensPerCall, remainingOutput);
    const request = {
      model: plan.model.name,
      input,
      tools: [...knowledge.tools, submitProgramTool],
      tool_choice: "auto",
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
    const maximumNextCost = (
      estimatedInput * plan.pricingUsdPerMillionTokens.cacheWrite +
      maxOutputTokens * plan.pricingUsdPerMillionTokens.output
    ) / 1_000_000;
    if (estimatedCostUsd + maximumNextCost > remainingSpendUsd) {
      providerError = "budget-exceeded";
      break;
    }

    const traceRound = {
      round: modelCalls + 1,
      remainingModelCallsAtStart: plan.sampling.maximumModelCallsPerTask - modelCalls,
      calls: []
    };
    trace.rounds.push(traceRound);

    let response;
    try {
      response = await createOpenAIResponse({ apiKey, request, fetchImpl, signal: taskSignal });
    } catch (error) {
      providerError = ["AbortError", "TimeoutError"].includes(error.name)
        ? "timeout"
        : error.code ?? `provider-http-${error.status ?? "error"}`;
      runtimeError = error.message;
      break;
    }
    modelCalls += 1;
    resolvedName = response.model ?? resolvedName;
    addUsage(usage, response.usage);
    estimatedCostUsd += estimateResponseCostUsd(response.usage, plan.pricingUsdPerMillionTokens);
    input.push(...(response.output ?? []));
    const calls = (response.output ?? []).filter(item => item.type === "function_call");

    if (calls.length === 0) {
      input.push({ role: "user", content: "Use the documentation tools if needed, then call submit_program with the complete source." });
      continue;
    }
    for (const call of calls) {
      let output;
      const traceCall = {
        name: call.name,
        arguments: sanitizedCallArguments(call)
      };
      traceRound.calls.push(traceCall);
      if (call.name === "submit_program") {
        submissions += 1;
        try {
          const args = JSON.parse(call.arguments);
          lastSubmittedSource = args.source;
          await writeFile(path.join(artifactRoot, "program.mjs"), lastSubmittedSource);
          finalEvaluation = await evaluateGeneratedProgram({
            source: args.source,
            task,
            datasets: await loadTaskDatasets(corpus, task),
            artifactRoot
          });
          const evidence = {
            actions: finalEvaluation.actions,
            runtimeFunctions: finalEvaluation.runtimeFunctions,
            validations: finalEvaluation.validations,
            renderers: finalEvaluation.renderers,
            runtimeError: null
          };
          finalScore = scoreEvaluationEvidence(task, evidence);
          if (submissions === 1) firstPassValid = finalScore.valid;
          output = JSON.stringify({ valid: finalScore.valid, failures: finalScore.failures });
          traceCall.submission = {
            present: true,
            valid: finalScore.valid,
            failures: finalScore.failures.slice(0, 20)
          };
        } catch (error) {
          runtimeError = error.message;
          finalScore = { valid: false, failures: [`runtime-error:${error.message}`] };
          if (submissions === 1) firstPassValid = false;
          output = JSON.stringify({ valid: false, failures: ["program execution failed"], error: error.message });
          traceCall.submission = {
            present: true,
            valid: false,
            failures: ["program execution failed"]
          };
        }
      } else {
        if (knowledgeCalls >= plan.sampling.maximumMcpCallsPerTask) {
          output = JSON.stringify({ error: "Documentation call limit reached." });
        } else {
          try {
            output = await knowledge.handle(call);
            knowledgeCalls += 1;
          } catch (error) {
            output = JSON.stringify({ error: error.message });
          }
        }
        traceCall.result = sanitizedKnowledgeResult(output);
      }
      input.push({ type: "function_call_output", call_id: call.call_id, output });
    }
  }

  const finalValid = finalScore.valid;
  const failure = ["budget-exceeded", "timeout"].includes(providerError)
    ? providerError
    : providerError === null
      ? submissions === 0
        ? "invalid-program"
        : failureCategory(finalScore.failures, runtimeError)
      : "provider-error";
  const validationLogFile = path.join(artifactRoot, "validation.json");
  const relative = file => file === null ? null : path.relative(root, file);
  const submittedProgramFile = lastSubmittedSource === null ? null : path.join(artifactRoot, "program.mjs");
  const evidence = finalEvaluation === undefined ? {
    actions: [],
    runtimeFunctions: [],
    validations: [],
    renderers: [],
    runtimeError
  } : {
    actions: finalEvaluation.actions,
    runtimeFunctions: finalEvaluation.runtimeFunctions,
    validations: finalEvaluation.validations,
    renderers: finalEvaluation.renderers,
    runtimeError
  };
  await writeFile(validationLogFile, `${JSON.stringify({ score: finalScore, evidence, providerError }, null, 2)}\n`);
  const result = {
    schemaVersion: 1,
    runId,
    condition: knowledge.condition,
    taskId: task.id,
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
      maxOutputTokensPerCall: plan.tokenBudgetPerTask.maximumOutputTokensPerCall,
      maxCumulativeInputTokens: plan.tokenBudgetPerTask.maximumCumulativeInputTokens,
      maxCumulativeOutputTokens: plan.tokenBudgetPerTask.maximumCumulativeOutputTokens
    },
    metrics: {
      ...usage,
      modelCalls,
      mcpCalls: knowledge.condition === "C" ? knowledgeCalls : 0,
      repairRounds: Math.max(0, submissions - 1),
      timeToValidMs: finalValid ? Date.now() - started : null,
      estimatedCostUsd
    },
    outcome: { firstPassValid, finalValid, failureCategory: failure },
    evidence,
    artifacts: {
      programFile: finalEvaluation === undefined ? relative(submittedProgramFile) : relative(finalEvaluation.artifacts.programFile),
      programSha256: finalEvaluation?.artifacts.programSha256 ?? (
        lastSubmittedSource === null ? null : createHash("sha256").update(lastSubmittedSource).digest("hex")
      ),
      validationLogFile: relative(validationLogFile),
      rendererFiles: (finalEvaluation?.artifacts.rendererFiles ?? []).map(relative)
    }
  };
  await writeFile(path.join(artifactRoot, "trace.json"), `${JSON.stringify(trace, null, 2)}\n`);
  await knowledge.close?.();
  validateEvaluationResult(result, corpus);
  return result;
}

export async function appendEvaluationResult(file, result) {
  await mkdir(path.dirname(file), { recursive: true });
  await appendFile(file, `${JSON.stringify(result)}\n`);
}
