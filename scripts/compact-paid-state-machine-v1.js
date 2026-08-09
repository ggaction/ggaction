import { createHash } from "node:crypto";

import {
  createOpenAIResponse,
  projectedRequestInputTokens
} from "./compact-paid-smoke-v4.js";

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function emptyUsage() {
  return {
    inputTokens: 0,
    cachedInputTokens: 0,
    cacheWriteTokens: 0,
    outputTokens: 0,
    reasoningTokens: 0,
    totalTokens: 0
  };
}

function completeUsage(usage) {
  return Number.isInteger(usage?.input_tokens) && usage.input_tokens >= 0 &&
    Number.isInteger(usage?.input_tokens_details?.cached_tokens) &&
    usage.input_tokens_details.cached_tokens >= 0 &&
    Number.isInteger(usage?.input_tokens_details?.cache_write_tokens) &&
    usage.input_tokens_details.cache_write_tokens >= 0 &&
    Number.isInteger(usage?.output_tokens) && usage.output_tokens >= 0 &&
    Number.isInteger(usage?.total_tokens) && usage.total_tokens >= 0;
}

function normalizedUsage(usage) {
  return {
    inputTokens: usage.input_tokens,
    cachedInputTokens: usage.input_tokens_details.cached_tokens,
    cacheWriteTokens: usage.input_tokens_details.cache_write_tokens,
    outputTokens: usage.output_tokens,
    reasoningTokens: usage.output_tokens_details?.reasoning_tokens ?? 0,
    totalTokens: usage.total_tokens
  };
}

function addUsage(target, usage) {
  for (const key of Object.keys(target)) target[key] += usage[key] ?? 0;
}

function usageCost(usage, pricing) {
  const cached = Math.min(usage.cachedInputTokens, usage.inputTokens);
  const writes = Math.min(usage.cacheWriteTokens, usage.inputTokens - cached);
  const uncached = usage.inputTokens - cached - writes;
  return (
    uncached * pricing.uncachedInput +
    cached * pricing.cachedInput +
    writes * pricing.cacheWrite +
    usage.outputTokens * pricing.output
  ) / 1_000_000;
}

export function forcedFunctionToolChoiceV1(name) {
  return Object.freeze({ type: "function", name });
}

function baseRequest({ plan, adapter, submitTool, input, maximumOutputTokens, forcedTool }) {
  const tools = [...adapter.tools, submitTool];
  if (!tools.some(tool => tool.type === "function" && tool.name === forcedTool)) {
    throw new Error(`state-machine-contract: unknown forced tool ${forcedTool}`);
  }
  return {
    model: plan.api.model,
    reasoning: { effort: plan.api.reasoningEffort },
    text: { verbosity: plan.api.textVerbosity },
    service_tier: plan.api.serviceTier,
    store: plan.api.store,
    parallel_tool_calls: false,
    include: plan.api.include,
    max_output_tokens: maximumOutputTokens,
    tool_choice: forcedFunctionToolChoiceV1(forcedTool),
    tools,
    instructions: [
      "Complete one bounded ggaction authoring task.",
      `The current state requires exactly one ${forcedTool} function call.`,
      "Do not answer with a message instead of the required function call."
    ].join(" "),
    input
  };
}

function responseFunctionCalls(response) {
  return (response.output ?? []).filter(entry => entry.type === "function_call");
}

function parseArguments(call) {
  try {
    return JSON.parse(call.arguments);
  } catch {
    throw new Error(`provider-protocol-mismatch: ${call.name} returned invalid JSON arguments`);
  }
}

function sanitizedArguments(call) {
  const args = parseArguments(call);
  if (call.name !== "submit_result") return args;
  return {
    status: args.status,
    renderer: args.renderer,
    unsupported: args.unsupported,
    unresolved: args.unresolved,
    sourceBytes: typeof args.source === "string" ? Buffer.byteLength(args.source, "utf8") : 0,
    sourceSha256: typeof args.source === "string" ? sha256(args.source) : null
  };
}

function recordBudgetBeforeRequest({ plan, ledger, state, request, priorReasoningTokens }) {
  const bytes = Buffer.byteLength(JSON.stringify(request), "utf8");
  if (bytes > plan.limits.maximumRequestBodyBytesPerCall) {
    throw new Error("request-transport-envelope: request body exceeds the per-call limit");
  }
  if (state.requestBodyBytes + bytes > plan.limits.maximumRequestBodyBytesPerTask) {
    throw new Error("request-transport-envelope: cumulative request bodies exceed the task limit");
  }
  const projectedInputTokens = projectedRequestInputTokens(request, {
    bytesPerToken: plan.limits.projectedInputBytesPerToken,
    priorReasoningTokens
  });
  if (state.projectedInputTokens + projectedInputTokens > plan.limits.maximumInputTokensPerTask) {
    throw new Error("task-token-envelope: projected billable input would be exceeded");
  }
  const worstRequestCost = (
    projectedInputTokens * plan.pricingPerMillionTokens.cacheWrite +
    request.max_output_tokens * plan.pricingPerMillionTokens.output
  ) / 1_000_000;
  if (ledger.costUsd + worstRequestCost > plan.limits.hardCostUsd) {
    throw new Error("global-cost-cap: next request could exceed the approved hard cap");
  }
  state.requestBodyBytes += bytes;
  state.projectedInputTokens += projectedInputTokens;
  return { bytes, projectedInputTokens };
}

function activeTaskSnapshot({ task, condition, usage, state, adapter, trace, route, routeIndex }) {
  return JSON.parse(JSON.stringify({
    id: `${task.id}:${condition}`,
    task: task.id,
    condition,
    stratum: task.stratum,
    modelCalls: trace.length,
    usage,
    costUsd: trace.reduce((sum, entry) => sum + (entry.costUsd ?? 0), 0),
    requestBodyBytes: state.requestBodyBytes,
    projectedInputTokens: state.projectedInputTokens,
    knowledge: adapter.snapshot(),
    stateMachine: {
      route,
      routeIndex,
      nextTool: route[Math.min(routeIndex, route.length - 1)]
    },
    trace
  }));
}

function protocolFailure(forcedTool, calls) {
  const names = calls.map(call => call.name);
  return new Error(
    `provider-protocol-mismatch: forced ${forcedTool}, received ${calls.length} function calls` +
    (names.length > 0 ? ` (${names.join(",")})` : "")
  );
}

export async function runBoundedToolStateMachineV1({
  plan,
  task,
  condition,
  apiKey,
  ledger,
  artifactRoot,
  route,
  createAdapter,
  submitTool,
  evaluateSubmission,
  promptBuilder,
  validateRoute = () => [],
  createResponse = createOpenAIResponse,
  onProgress = async () => {}
}) {
  if (!Array.isArray(route) || route.length === 0 || route.at(-1) !== "submit_result") {
    throw new Error("state-machine-contract: route must end with submit_result");
  }
  if (route.length > plan.limits.maximumModelCallsPerTask) {
    throw new Error("state-machine-contract: route cannot fit within the task call limit");
  }
  const adapter = await createAdapter(condition);
  const started = performance.now();
  const usage = emptyUsage();
  const state = { requestBodyBytes: 0, projectedInputTokens: 0 };
  const trace = [];
  let routeIndex = 0;
  let input = [{
    role: "user",
    content: [{ type: "input_text", text: promptBuilder(task, adapter) }]
  }];
  let lastEvaluation;
  try {
    for (let callIndex = 0; callIndex < plan.limits.maximumModelCallsPerTask; callIndex += 1) {
      const remainingOutput = plan.limits.maximumOutputTokensPerTask - usage.outputTokens;
      if (remainingOutput <= 0) break;
      const forcedTool = route[Math.min(routeIndex, route.length - 1)];
      const request = baseRequest({
        plan,
        adapter,
        submitTool,
        input,
        maximumOutputTokens: Math.min(
          plan.limits.maximumOutputTokensPerResponse,
          remainingOutput
        ),
        forcedTool
      });
      const budget = recordBudgetBeforeRequest({
        plan,
        ledger,
        state,
        request,
        priorReasoningTokens: usage.reasoningTokens
      });
      const response = await createResponse({
        apiKey,
        request,
        timeoutMilliseconds: plan.limits.timeoutMilliseconds
      });
      const calls = responseFunctionCalls(response);
      const traceEntry = {
        modelCall: callIndex + 1,
        phase: forcedTool === "submit_result" ? "submission" : "knowledge",
        forcedTool,
        toolChoice: request.tool_choice,
        requestBytes: budget.bytes,
        projectedInputTokens: budget.projectedInputTokens,
        functionCallCount: calls.length,
        tool: null,
        arguments: null,
        usage: null,
        costUsd: null,
        billingUsageComplete: false
      };
      trace.push(traceEntry);
      if (!completeUsage(response.usage)) {
        await onProgress(activeTaskSnapshot({
          task, condition, usage, state, adapter, trace, route, routeIndex
        }));
        throw new Error("incomplete-billing-usage: response omitted required billing fields");
      }
      const responseUsage = normalizedUsage(response.usage);
      addUsage(usage, responseUsage);
      addUsage(ledger.usage, responseUsage);
      const costUsd = usageCost(responseUsage, plan.pricingPerMillionTokens);
      ledger.costUsd += costUsd;
      ledger.modelCalls += 1;
      Object.assign(traceEntry, {
        usage: responseUsage,
        costUsd,
        billingUsageComplete: true
      });
      await onProgress(activeTaskSnapshot({
        task, condition, usage, state, adapter, trace, route, routeIndex
      }));
      if (response.model !== plan.api.model || response.service_tier !== plan.api.serviceTier) {
        throw new Error("provider-response-identity-mismatch");
      }
      if (
        usage.inputTokens > plan.limits.maximumInputTokensPerTask ||
        usage.outputTokens > plan.limits.maximumOutputTokensPerTask
      ) {
        throw new Error("task-token-envelope: provider usage exceeded the approved task envelope");
      }
      if (ledger.costUsd > plan.limits.hardCostUsd) {
        throw new Error("global-cost-cap: provider usage exceeded the approved hard cap");
      }
      if (calls.length !== 1 || calls[0].name !== forcedTool) {
        throw protocolFailure(forcedTool, calls);
      }
      const call = calls[0];
      if (typeof call.call_id !== "string" || call.call_id.length === 0) {
        throw new Error(`provider-protocol-mismatch: ${forcedTool} omitted call_id`);
      }
      traceEntry.tool = call.name;
      traceEntry.arguments = sanitizedArguments(call);
      input = [...input, ...(response.output ?? [])];

      if (forcedTool !== "submit_result") {
        const output = await adapter.handle(call);
        traceEntry.toolResultBytes = Buffer.byteLength(output, "utf8");
        input.push({ type: "function_call_output", call_id: call.call_id, output });
        routeIndex += 1;
        await onProgress(activeTaskSnapshot({
          task, condition, usage, state, adapter, trace, route, routeIndex
        }));
        continue;
      }

      const submission = parseArguments(call);
      const routeFailures = validateRoute(condition, task, adapter.snapshot());
      lastEvaluation = routeFailures.length > 0
        ? { passed: false, failures: routeFailures }
        : await evaluateSubmission({ submission, task, artifactRoot });
      traceEntry.evaluation = lastEvaluation;
      await onProgress(activeTaskSnapshot({
        task, condition, usage, state, adapter, trace, route, routeIndex
      }));
      if (lastEvaluation.passed) {
        return {
          id: `${task.id}:${condition}`,
          task: task.id,
          condition,
          stratum: task.stratum,
          passed: true,
          modelCalls: callIndex + 1,
          timeToValidMilliseconds: performance.now() - started,
          usage,
          costUsd: trace.reduce((sum, entry) => sum + entry.costUsd, 0),
          requestBodyBytes: state.requestBodyBytes,
          projectedInputTokens: state.projectedInputTokens,
          knowledge: adapter.snapshot(),
          trace
        };
      }
      input.push({
        type: "function_call_output",
        call_id: call.call_id,
        output: JSON.stringify(lastEvaluation)
      });
    }
    return {
      id: `${task.id}:${condition}`,
      task: task.id,
      condition,
      stratum: task.stratum,
      passed: false,
      modelCalls: trace.length,
      timeToValidMilliseconds: null,
      usage,
      costUsd: trace.reduce((sum, entry) => sum + entry.costUsd, 0),
      requestBodyBytes: state.requestBodyBytes,
      projectedInputTokens: state.projectedInputTokens,
      knowledge: adapter.snapshot(),
      failures: lastEvaluation?.failures ?? ["No passing submission within the call limit."],
      trace
    };
  } finally {
    await adapter.close();
  }
}
