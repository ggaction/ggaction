import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdir, mkdtemp, readFile, rm } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

import {
  assertSupportedStrictToolSchema,
  evaluateSubmission,
  loadPaidSmokePlan,
  preflightPaidSmokeTools,
  root,
  runPaidSmokeDryRun,
  runPaidSmokeTask
} from "../../scripts/compact-paid-smoke.js";

function usage(input = 100, output = 50) {
  return {
    input_tokens: input,
    input_tokens_details: { cached_tokens: 0, cache_write_tokens: 0 },
    output_tokens: output,
    output_tokens_details: { reasoning_tokens: 10 },
    total_tokens: input + output
  };
}

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function histogramSource() {
  return [
    'import { chart } from "ggaction";',
    'import { renderToSVG } from "ggaction/svg";',
    "export function buildChart(rows) {",
    "  return chart()",
    "    .createCanvas({ width: 640, height: 400, margin: 50 })",
    "    .createData({ values: rows })",
    '    .createHistogram({ field: "value", guides: {} });',
    "}",
    "export function renderChart(program) { return renderToSVG(program); }",
    ""
  ].join("\n");
}

test("freezes the exact approved paid-smoke matrix and cost ceiling", async () => {
  const plan = await loadPaidSmokePlan();
  assert.equal(plan.id, "compact-authoring-paid-smoke-v2");
  assert.equal(plan.productCandidateCommit, "6ed5af76c80e56c5a3cde833c5a702de183e4d7a");
  assert.equal(plan.requiredGate, "R54-P5-B");
  assert.deepEqual(plan.conditions.map(condition => condition.id), ["A", "B", "C", "D"]);
  assert.deepEqual(plan.tasks.map(task => [task.id, task.stratum, task.role]), [
    ["repair-val-histogram", "simple", "supported"],
    ["repair-hold-regression-layers", "complex", "supported"],
    ["policy-hold-pdf-and-jpg", "simple", "unsupported"],
    ["policy-val-3d-jpeg", "complex", "unsupported"]
  ]);
  assert.equal(plan.runOrder.length, 16);
  assert.equal(plan.api.model, "gpt-5.6-terra");
  assert.equal(plan.api.reasoningEffort, "medium");
  assert.equal(plan.api.textVerbosity, "low");
  assert.equal(plan.api.serviceTier, "default");
  assert.equal(plan.api.store, false);
  assert.equal(plan.limits.hardCostUsd, 3);
  assert.equal(plan.limits.requestTokenEstimateBytesPerToken, 1);
  assert.equal(plan.costProjection.expectedUsd, 1.152);
  assert.equal(plan.costProjection.calculatedMaximumUsd, 2.496);
});

test("preserves the first paid attempt and its approved plan byte-for-byte", async () => {
  const historicalRoot = path.join(root, "evaluation", "compact-authoring-paid-smoke");
  const [plan, result] = await Promise.all([
    readFile(path.join(historicalRoot, "PLAN.json")),
    readFile(path.join(historicalRoot, "results", "IN_PROGRESS.json"))
  ]);
  assert.equal(
    sha256(plan),
    "95010b28aacb596f18398a9e259ed9bec1de9280e78ccd2316a525a73f08bc54"
  );
  assert.equal(
    sha256(result),
    "a6176c64010795da419cc6f49c4cec645f95fdfdfb938e98c0f216a441dbb745"
  );
});

test("preflights every model-visible schema against the provider subset", async () => {
  await preflightPaidSmokeTools();
  assert.throws(
    () => assertSupportedStrictToolSchema({
      type: "function",
      name: "invalid_array",
      strict: true,
      parameters: {
        type: "object",
        additionalProperties: false,
        required: ["values"],
        properties: {
          values: { type: "array", uniqueItems: true, items: { type: "string" } }
        }
      }
    }),
    /unsupported keyword uniqueItems/u
  );
});

test("dry-runs all public-doc, direct, MCP, and fallback routes without spend", async () => {
  const result = await runPaidSmokeDryRun();
  assert.equal(result.checks, 16);
  assert.equal(result.passed, true);
  assert.equal(result.externalCalls, 0);
  assert.equal(result.spendUsd, 0);
  for (const condition of ["A", "B", "C", "D"]) {
    assert.equal(result.details.filter(entry => entry.condition === condition).length, 4);
  }
  const fallbackChecks = result.details.filter(entry => entry.condition === "D");
  assert.deepEqual(fallbackChecks.map(entry => entry.knowledge.docsReads), [0, 0, 1, 2]);
  assert.deepEqual(fallbackChecks.map(entry => entry.knowledge.toolCalls), [1, 1, 2, 2]);
});

test("runs one bounded mocked Responses tool loop to an executable SVG", async () => {
  const plan = await loadPaidSmokePlan();
  const task = plan.tasks.find(entry => entry.id === "repair-val-histogram");
  const requests = [];
  let call = 0;
  const createResponse = async ({ request }) => {
    requests.push(request);
    call += 1;
    const output = call === 1
      ? [{
          type: "function_call",
          name: "search_ggaction",
          arguments: JSON.stringify({ query: task.query }),
          call_id: "knowledge-1"
        }]
      : [{
          type: "function_call",
          name: "submit_result",
          arguments: JSON.stringify({
            status: "program",
            source: histogramSource(),
            renderer: "svg",
            unresolved: []
          }),
          call_id: "submission-1"
        }];
    return {
      model: plan.api.model,
      service_tier: plan.api.serviceTier,
      output,
      usage: usage()
    };
  };
  const parent = path.join(root, ".artifacts", "test");
  await mkdir(parent, { recursive: true });
  const artifactRoot = await mkdtemp(path.join(parent, "paid-smoke-"));
  try {
    const ledger = {
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
    const result = await runPaidSmokeTask({
      plan,
      task,
      condition: "B",
      apiKey: "test-key-with-more-than-twenty-characters",
      ledger,
      artifactRoot,
      createResponse
    });
    assert.equal(result.passed, true);
    assert.equal(result.modelCalls, 2);
    assert.equal(result.knowledge.toolCalls, 1);
    assert.ok(result.estimatedInputTokens >= result.requestBodyBytes);
    assert.equal(ledger.modelCalls, 2);
    assert.ok(ledger.costUsd > 0 && ledger.costUsd < 0.01);
    assert.equal(requests[0].model, "gpt-5.6-terra");
    assert.deepEqual(requests[0].reasoning, { effort: "medium" });
    assert.deepEqual(requests[0].text, { verbosity: "low" });
    assert.equal(requests[0].parallel_tool_calls, false);
    assert.equal(requests[0].store, false);
    assert.deepEqual(requests[0].include, ["reasoning.encrypted_content"]);
    assert.equal(requests[0].max_output_tokens, 4000);
    assert.equal(
      requests[1].input.some(entry => entry.type === "function_call_output"),
      true
    );
  } finally {
    await rm(artifactRoot, { recursive: true, force: true });
  }
});

test("bundles two MCP fallback resources and submits within three model calls", async () => {
  const plan = await loadPaidSmokePlan();
  const task = plan.tasks.find(entry => entry.id === "policy-val-3d-jpeg");
  const requests = [];
  let call = 0;
  const createResponse = async ({ request }) => {
    requests.push(request);
    call += 1;
    const output = [
      {
        type: "function_call",
        name: "search_ggaction",
        arguments: JSON.stringify({ query: task.query }),
        call_id: "knowledge-search"
      },
      {
        type: "function_call",
        name: "read_mcp_resources",
        arguments: JSON.stringify({ uris: task.expectedFallbacks }),
        call_id: "knowledge-docs"
      },
      {
        type: "function_call",
        name: "submit_result",
        arguments: JSON.stringify({
          status: "unsupported",
          source: null,
          renderer: task.expectedRenderer,
          unresolved: task.expectedUnresolved
        }),
        call_id: "submission"
      }
    ][call - 1];
    return {
      model: plan.api.model,
      service_tier: plan.api.serviceTier,
      output: [output],
      usage: usage()
    };
  };
  const ledger = {
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
  const result = await runPaidSmokeTask({
    plan,
    task,
    condition: "D",
    apiKey: "test-key-with-more-than-twenty-characters",
    ledger,
    artifactRoot: path.join(root, ".artifacts", "test", "paid-smoke-fallback"),
    createResponse
  });
  assert.equal(result.passed, true);
  assert.equal(result.modelCalls, 3);
  assert.deepEqual(result.knowledge, {
    toolCalls: 2,
    searches: 1,
    docsReadCalls: 1,
    docsReads: 2
  });
  assert.equal(requests.length, 3);
  assert.equal(
    requests[0].tools.some(tool => tool.name === "read_mcp_resources"),
    true
  );
});

test("rejects a correct submission that skips its assigned knowledge route", async () => {
  const plan = await loadPaidSmokePlan();
  const task = plan.tasks.find(entry => entry.id === "repair-val-histogram");
  const ledger = {
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
  const result = await runPaidSmokeTask({
    plan,
    task,
    condition: "B",
    apiKey: "test-key-with-more-than-twenty-characters",
    ledger,
    artifactRoot: path.join(root, ".artifacts", "test", "paid-smoke-skipped-route"),
    createResponse: async () => ({
      model: plan.api.model,
      service_tier: plan.api.serviceTier,
      output: [{
        type: "function_call",
        name: "submit_result",
        arguments: JSON.stringify({
          status: "program",
          source: histogramSource(),
          renderer: "svg",
          unresolved: []
        }),
        call_id: "premature-submission"
      }],
      usage: usage()
    })
  });
  assert.equal(result.passed, false);
  assert.match(result.failures.join("\n"), /knowledge-search-count:0/u);
});

test("stops a paid task when billing usage is incomplete", async () => {
  const plan = await loadPaidSmokePlan();
  const task = plan.tasks[0];
  const ledger = {
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
  await assert.rejects(
    runPaidSmokeTask({
      plan,
      task,
      condition: "B",
      apiKey: "test-key-with-more-than-twenty-characters",
      ledger,
      artifactRoot: path.join(root, ".artifacts", "test", "paid-smoke-invalid"),
      createResponse: async () => ({
        model: plan.api.model,
        service_tier: plan.api.serviceTier,
        output: [],
        usage: { input_tokens: 1, output_tokens: 1, total_tokens: 2 }
      })
    }),
    /incomplete-billing-usage/
  );
  assert.equal(ledger.costUsd, 0);
  assert.equal(ledger.modelCalls, 0);
});

test("bounds isolated generated-program failures without local command details", async () => {
  const plan = await loadPaidSmokePlan();
  const task = plan.tasks.find(entry => entry.id === "repair-val-histogram");
  const result = await evaluateSubmission({
    task,
    artifactRoot: path.join(root, ".artifacts", "test", "paid-smoke-bounded-error"),
    submission: {
      status: "program",
      source: [
        'import { Canvas } from "ggaction";',
        'import { renderToSVG } from "ggaction/svg";',
        "export function buildChart(rows) { return Canvas(rows); }",
        "export function renderChart(program) { return renderToSVG(program); }"
      ].join("\n"),
      renderer: "svg",
      unresolved: []
    }
  });
  assert.equal(result.passed, false);
  assert.match(result.failures.join("\n"), /^generated-program-error:SyntaxError:/u);
  assert.doesNotMatch(result.failures.join("\n"), /Command failed|\/Users\//u);
});
