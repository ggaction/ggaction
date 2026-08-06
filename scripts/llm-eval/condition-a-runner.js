import { createHash } from "node:crypto";
import { appendFile, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { loadEvaluationCorpus, validateEvaluationResult } from "./corpus.js";
import { readCurrentDoc, searchCurrentDocs } from "./current-docs.js";
import { createOpenAIResponse, estimateResponseCostUsd, normalizeResponseUsage } from "./openai-responses.js";
import { evaluateGeneratedProgram } from "./program-evaluator.js";
import { scoreEvaluationEvidence } from "./score.js";

const root = fileURLToPath(new URL("../../", import.meta.url));
const startingCommit = "9414d07179c9e7c6bbfdf00b762fc35de0ff25ec";

const tools = [
  {
    type: "function",
    name: "search_docs",
    description: "Search the current public ggaction documentation and return a small ranked list of routes and summaries.",
    strict: true,
    parameters: {
      type: "object",
      additionalProperties: false,
      required: ["query"],
      properties: {
        query: { type: "string", minLength: 1 }
      }
    }
  },
  {
    type: "function",
    name: "read_doc",
    description: "Read one current public ggaction documentation route. Use routes returned by search_docs or docs/llms.txt.",
    strict: true,
    parameters: {
      type: "object",
      additionalProperties: false,
      required: ["route"],
      properties: {
        route: { type: "string", minLength: 1 }
      }
    }
  },
  {
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
  }
];

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

function programInstructions(task, routingText) {
  const datasetFields = task.data.map(selection =>
    `${selection.id}: ${selection.fields.join(", ")}`
  ).join("\n");
  return `You are writing one real ggaction chart program for an executable evaluation.

Use only public ggaction APIs documented through the provided current-doc tools. Do not use editSemantic, createGraphics, or editGraphics for ordinary chart authoring. Do not invent action names or option keys.

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

Current ggaction documentation routing index:
${routingText}`;
}

async function loadTaskDatasets(corpus, task) {
  const entries = await Promise.all(task.data.map(async selection => [
    selection.id,
    JSON.parse(await readFile(path.join(root, corpus.datasets[selection.id].path), "utf8"))
  ]));
  return Object.fromEntries(entries);
}

async function handleKnowledgeCall(call) {
  const args = JSON.parse(call.arguments);
  if (call.name === "search_docs") return JSON.stringify(await searchCurrentDocs(args.query));
  if (call.name === "read_doc") return JSON.stringify(await readCurrentDoc(args.route));
  throw new Error(`Unknown knowledge tool ${call.name}.`);
}

export async function runConditionATask({
  apiKey,
  corpus,
  task,
  repetition,
  plan,
  outputRoot,
  fetchImpl = globalThis.fetch,
  remainingSpendUsd = plan.costPerConditionUsd.approvedSpendCap
}) {
  const runId = `A-${task.id}-r${repetition}`;
  const artifactRoot = path.join(outputRoot, runId);
  await mkdir(artifactRoot, { recursive: true });
  const routing = await readCurrentDoc("llms.txt");
  const input = [{ role: "user", content: programInstructions(task, routing.text) }];
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
  let knowledgeCalls = 0;
  let submissions = 0;
  let firstPassValid = false;
  let finalEvaluation;
  let lastSubmittedSource = null;
  let finalScore = { valid: false, failures: ["no-valid-submission"] };
  let runtimeError = null;
  let providerError = null;
  let resolvedName = plan.model.name;
  const started = Date.now();

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
      tools,
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

    let response;
    try {
      response = await createOpenAIResponse({ apiKey, request, fetchImpl });
    } catch (error) {
      providerError = error.code ?? `provider-http-${error.status ?? "error"}`;
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
        } catch (error) {
          runtimeError = error.message;
          finalScore = { valid: false, failures: [`runtime-error:${error.message}`] };
          if (submissions === 1) firstPassValid = false;
          output = JSON.stringify({ valid: false, failures: ["program execution failed"], error: error.message });
        }
      } else {
        knowledgeCalls += 1;
        if (knowledgeCalls > plan.sampling.maximumMcpCallsPerTask) {
          output = JSON.stringify({ error: "Documentation call limit reached." });
        } else {
          try {
            output = await handleKnowledgeCall(call);
          } catch (error) {
            output = JSON.stringify({ error: error.message });
          }
        }
      }
      input.push({ type: "function_call_output", call_id: call.call_id, output });
    }
  }

  const finalValid = finalScore.valid;
  const failure = providerError === "budget-exceeded"
    ? "budget-exceeded"
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
    condition: "A",
    taskId: task.id,
    knowledge: { commit: startingCommit, mode: "current-docs" },
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
      mcpCalls: 0,
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
  validateEvaluationResult(result, corpus);
  return result;
}

export async function appendEvaluationResult(file, result) {
  await mkdir(path.dirname(file), { recursive: true });
  await appendFile(file, `${JSON.stringify(result)}\n`);
}
