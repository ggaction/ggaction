import assert from "node:assert/strict";
import { mkdir, mkdtemp, rm } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

import {
  evaluateFullSubmissionV2,
  rendererWrapperFailuresV2
} from "../../scripts/compact-full-evaluator-v2.js";
import {
  loadRouteOracleV5,
  root
} from "../../scripts/compact-paid-smoke-v5.js";
import {
  loadPaidSmokePlanV6,
  preflightPaidSmokeToolsV6,
  runPaidSmokeDryRunV6,
  runPaidSmokeTaskV6,
  taskPromptV6
} from "../../scripts/compact-paid-smoke-v6.js";
import { runPaidSmokeTaskV7 } from "../../scripts/compact-paid-smoke-v7.js";
import { canonicalRuntimeClosureSource } from "../../scripts/compact-runtime-closure-v2.js";

function planForMocks() {
  return {
    api: {
      model: "gpt-5.6-terra",
      reasoningEffort: "medium",
      textVerbosity: "low",
      serviceTier: "default",
      store: false,
      parallelToolCalls: false,
      include: ["reasoning.encrypted_content"]
    },
    limits: {
      maximumModelCallsPerTask: 4,
      maximumModelCallsTotal: 128,
      maximumInputTokensPerTask: 120000,
      maximumOutputTokensPerTask: 16000,
      maximumOutputTokensPerResponse: 4000,
      projectedInputBytesPerToken: 1,
      maximumRequestBodyBytesPerCall: 262144,
      maximumRequestBodyBytesPerTask: 786432,
      timeoutMilliseconds: 30000,
      hardCostUsd: 6
    },
    pricingPerMillionTokens: {
      uncachedInput: 2,
      cachedInput: 0.2,
      cacheWrite: 2.5,
      output: 12
    }
  };
}

function ledger() {
  return {
    usage: {
      inputTokens: 0,
      cachedInputTokens: 0,
      cacheWriteTokens: 0,
      outputTokens: 0,
      reasoningTokens: 0,
      totalTokens: 0
    },
    costUsd: 0,
    modelCalls: 0
  };
}

function response(call, index) {
  return {
    model: "gpt-5.6-terra",
    service_tier: "default",
    status: "completed",
    incomplete_details: null,
    error: null,
    output: [
      {
        type: "reasoning",
        id: `reasoning-${index}`,
        summary: [],
        encrypted_content: "opaque"
      },
      ...(call ? [call] : [])
    ],
    usage: {
      input_tokens: 100,
      input_tokens_details: { cached_tokens: 0, cache_write_tokens: 0 },
      output_tokens: 50,
      output_tokens_details: { reasoning_tokens: 10 },
      total_tokens: 150
    }
  };
}

function functionCall(name, args, index) {
  return {
    type: "function_call",
    name,
    arguments: JSON.stringify(args),
    call_id: `${name}-${index}`
  };
}

async function temporaryArtifact(prefix) {
  const parent = path.join(root, ".artifacts", "test");
  await mkdir(parent, { recursive: true });
  return mkdtemp(path.join(parent, prefix));
}

test("forces each knowledge and submission phase with the Responses function tool choice", async () => {
  const oracle = await loadRouteOracleV5();
  const task = oracle.tasks.find(entry => entry.id === "final3-03-bars-png");
  const canonical = canonicalRuntimeClosureSource(task);
  const hardCoded = canonical.replace("{ output }", '{ output: "chart.png" }');
  const expectedTools = ["search_ggaction", "submit_result", "submit_result"];
  const choices = [];
  let index = 0;
  const artifactRoot = await temporaryArtifact("paid-state-machine-repair-");
  try {
    const result = await runPaidSmokeTaskV7({
      plan: planForMocks(),
      task,
      condition: "B",
      apiKey: "test-key-with-more-than-twenty-characters",
      ledger: ledger(),
      artifactRoot,
      createResponse: async ({ request }) => {
        const expected = expectedTools[index];
        choices.push(request.tool_choice);
        assert.deepEqual(request.tool_choice, { type: "function", name: expected });
        const call = expected === "search_ggaction"
          ? functionCall(expected, { query: task.query }, index)
          : functionCall(expected, {
              status: "program",
              source: index === 1 ? hardCoded : canonical,
              renderer: "png",
              unsupported: [],
              unresolved: []
            }, index);
        index += 1;
        return response(call, index);
      }
    });
    assert.equal(result.passed, true);
    assert.equal(result.modelCalls, 3);
    assert.deepEqual(choices, expectedTools.map(name => ({ type: "function", name })));
    assert.deepEqual(result.trace.map(entry => entry.forcedTool), expectedTools);
    assert.deepEqual(result.trace.map(entry => entry.provider.status), [
      "completed",
      "completed",
      "completed"
    ]);
    assert.deepEqual(result.trace[1].evaluation.failures, [
      "renderer-wrapper-contract:png:the evaluator-supplied output parameter must be passed as { output }; literal paths are forbidden"
    ]);
  } finally {
    await rm(artifactRoot, { recursive: true, force: true });
  }
});

test("freezes the repaired evaluator, task matrix, and bounded paid envelope", async () => {
  const plan = await loadPaidSmokePlanV6();
  assert.equal(plan.planSha256, "5f8a226e2146843b3fe8875289646871284b3b486c755c333d02bc6a4cf8b561");
  assert.equal(plan.requiredGate, "R54-P5-I");
  assert.equal(plan.productCandidateCommit, "4e211ba418cd437d7c66c4fb986fcc714cf579ea");
  assert.equal(plan.evaluatorCheckpointCommit, "956e969faf3c127a83850f65e5c78009c070af7d");
  assert.equal(plan.runOrder.length, 32);
  assert.equal(plan.limits.maximumModelCallsPerTask, 4);
  assert.equal(plan.limits.maximumModelCallsTotal, 128);
  assert.equal(plan.costProjection.expectedUsd, 2.304);
  assert.equal(plan.costProjection.calculatedMaximumUsd, 7.488);
  assert.equal(plan.costProjection.calculatedMaximumWithRegionalUpliftUsd, 8.2368);
  assert.equal(plan.limits.hardCostUsd, 8.3);
  await preflightPaidSmokeToolsV6();
});

test("forces the complete public-docs route while preserving the model's selected returned URL", async () => {
  const oracle = await loadRouteOracleV5();
  const task = oracle.tasks.find(entry => entry.id === "final3-03-bars-png");
  const expectedTools = ["search_docs", "read_doc", "submit_result"];
  let index = 0;
  const artifactRoot = await temporaryArtifact("paid-state-machine-docs-");
  try {
    const result = await runPaidSmokeTaskV6({
      plan: planForMocks(),
      task,
      condition: "A",
      apiKey: "test-key-with-more-than-twenty-characters",
      ledger: ledger(),
      artifactRoot,
      createResponse: async ({ request }) => {
        const expected = expectedTools[index];
        assert.deepEqual(request.tool_choice, { type: "function", name: expected });
        let args;
        if (expected === "search_docs") {
          args = { query: `${task.query} complete ESM program bootstrap PNG renderer` };
        } else if (expected === "read_doc") {
          const results = JSON.parse(request.input.at(-1).output);
          args = { url: results[0].url };
        } else {
          args = {
            status: "program",
            source: canonicalRuntimeClosureSource(task),
            renderer: "png",
            unsupported: [],
            unresolved: []
          };
        }
        const call = functionCall(expected, args, index);
        index += 1;
        return response(call, index);
      }
    });
    assert.equal(result.passed, true);
    assert.deepEqual(result.trace.map(entry => entry.forcedTool), expectedTools);
    assert.equal(result.knowledge.searches, 1);
    assert.equal(result.knowledge.docsReads, 1);
  } finally {
    await rm(artifactRoot, { recursive: true, force: true });
  }
});

test("forces one bounded fallback read before a needs-input submission", async () => {
  const oracle = await loadRouteOracleV5();
  const task = oracle.tasks.find(entry => entry.id === "final3-37-rule-endpoint");
  const expectedTools = ["search_ggaction", "read_mcp_resources", "submit_result"];
  let index = 0;
  const result = await runPaidSmokeTaskV6({
    plan: planForMocks(),
    task,
    condition: "D",
    apiKey: "test-key-with-more-than-twenty-characters",
    ledger: ledger(),
    artifactRoot: path.join(root, ".artifacts", "test", "paid-state-machine-fallback"),
    createResponse: async ({ request }) => {
      const expected = expectedTools[index];
      assert.deepEqual(request.tool_choice, { type: "function", name: expected });
      const args = expected === "search_ggaction"
        ? { query: task.query }
        : expected === "read_mcp_resources"
          ? { uris: task.expectedFallbacks }
          : {
              status: "needs-input",
              source: null,
              renderer: "canvas",
              unsupported: [],
              unresolved: task.expectedUnresolved
            };
      const call = functionCall(expected, args, index);
      index += 1;
      return response(call, index);
    }
  });
  assert.equal(result.passed, true);
  assert.deepEqual(result.trace.map(entry => entry.forcedTool), expectedTools);
});

test("classifies a missing forced call as a provider protocol mismatch after persisting usage", async () => {
  const oracle = await loadRouteOracleV5();
  const task = oracle.tasks[0];
  const currentLedger = ledger();
  const progress = [];
  await assert.rejects(
    runPaidSmokeTaskV6({
      plan: planForMocks(),
      task,
      condition: "B",
      apiKey: "test-key-with-more-than-twenty-characters",
      ledger: currentLedger,
      artifactRoot: path.join(root, ".artifacts", "test", "paid-state-machine-protocol"),
      createResponse: async ({ request }) => {
        assert.deepEqual(request.tool_choice, { type: "function", name: "search_ggaction" });
        return response(null, 1);
      },
      onProgress: async snapshot => progress.push(snapshot)
    }),
    /provider-protocol-mismatch: forced search_ggaction, received 0 function calls/u
  );
  assert.equal(currentLedger.modelCalls, 1);
  assert.ok(currentLedger.costUsd > 0);
  assert.equal(progress.at(-1).trace[0].billingUsageComplete, true);
  assert.deepEqual(progress.at(-1).trace[0].toolChoice, {
    type: "function",
    name: "search_ggaction"
  });
});

test("stops before a request that would exceed the global call cap", async () => {
  const oracle = await loadRouteOracleV5();
  const task = oracle.tasks[0];
  const plan = planForMocks();
  plan.limits.maximumModelCallsTotal = 1;
  const currentLedger = ledger();
  currentLedger.modelCalls = 1;
  let requests = 0;
  await assert.rejects(
    runPaidSmokeTaskV6({
      plan,
      task,
      condition: "B",
      apiKey: "test-key-with-more-than-twenty-characters",
      ledger: currentLedger,
      artifactRoot: path.join(root, ".artifacts", "test", "paid-state-machine-call-cap"),
      createResponse: async () => {
        requests += 1;
        return response(null, 1);
      }
    }),
    /global-call-cap: next request would exceed the approved call count/u
  );
  assert.equal(requests, 0);
  assert.equal(currentLedger.modelCalls, 1);
});

test("validates renderer adapter structure before isolated chart execution", async () => {
  const dynamic = [
    'import * as png from "ggaction/png";',
    "export async function renderChart(program, destination) {",
    "  return await png.renderToPNG(program, { output: destination, pixelRatio: 2 });",
    "}"
  ].join("\n");
  const literal = [
    'import { renderToPNG } from "ggaction/png";',
    "export async function renderChart(program, output) {",
    '  return renderToPNG(program, { output: "chart.png" });',
    "}"
  ].join("\n");
  const commented = [
    'import { renderToPNG } from "ggaction/png";',
    "export async function renderChart(program, output) {",
    "  // return renderToPNG(program, { output });",
    "  return null;",
    "}"
  ].join("\n");
  assert.deepEqual(rendererWrapperFailuresV2(dynamic, "png"), []);
  assert.deepEqual(rendererWrapperFailuresV2(literal, "png"), [
    "renderer-wrapper-contract:png:the evaluator-supplied output parameter must be passed as { output }; literal paths are forbidden"
  ]);
  assert.deepEqual(rendererWrapperFailuresV2(commented, "png"), [
    "renderer-wrapper-contract:png:the evaluator-supplied output parameter must be passed as { output }; literal paths are forbidden"
  ]);
  const result = await evaluateFullSubmissionV2({
    task: { role: "supported", expectedRenderer: "png" },
    artifactRoot: path.join(root, ".artifacts", "test", "renderer-wrapper-preflight"),
    submission: {
      status: "program",
      source: literal,
      renderer: "png",
      unsupported: [],
      unresolved: []
    }
  });
  assert.equal(result.passed, false);
  assert.deepEqual(result.failures, rendererWrapperFailuresV2(literal, "png"));
});

test("states the evaluator wrapper separately from ordinary renderer examples", async () => {
  const oracle = await loadRouteOracleV5();
  const task = oracle.tasks.find(entry => entry.id === "final3-03-bars-png");
  const prompt = taskPromptV6(task, { instruction: "Use the assigned route." });
  assert.match(prompt, /renderChart\(program, output\)/u);
  assert.match(prompt, /evaluator supplies output/u);
  assert.match(prompt, /ordinary product examples may choose their own output path/u);
  assert.doesNotMatch(prompt, /renderChart\(program\) using/u);
});

test("dry-runs every state-machine route and strict evaluator without credentials or spend", async () => {
  const result = await runPaidSmokeDryRunV6();
  assert.equal(result.checks, 32);
  assert.equal(result.evaluatorChecks, 8);
  assert.equal(result.passed, true);
  assert.equal(result.externalCalls, 0);
  assert.equal(result.credentialReads, 0);
  assert.equal(result.spendUsd, 0);
});
