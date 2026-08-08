import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdir, mkdtemp, readFile, rm } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

import { searchGgaction } from "../../knowledge/task-resolver.js";
import {
  evaluateSubmissionV4,
  loadPaidSmokePlanV4,
  loadRouteOracleV4,
  preflightPaidSmokeToolsV4,
  projectedRequestInputTokens,
  root,
  runPaidSmokeDryRunV4,
  runPaidSmokeTaskV4,
  submitResultToolV4
} from "../../scripts/compact-paid-smoke-v4.js";
import { assertSupportedStrictToolSchema } from "../../scripts/compact-paid-smoke.js";

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function usage(input = 100, output = 50) {
  return {
    input_tokens: input,
    input_tokens_details: { cached_tokens: 0, cache_write_tokens: 0 },
    output_tokens: output,
    output_tokens_details: { reasoning_tokens: 10 },
    total_tokens: input + output
  };
}

function reasoningItem(id, bytes = 40000) {
  return {
    type: "reasoning",
    id,
    summary: [],
    encrypted_content: "r".repeat(bytes)
  };
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
      maximumModelCallsPerTask: 3,
      maximumInputTokensPerTask: 120000,
      maximumOutputTokensPerTask: 12000,
      maximumOutputTokensPerResponse: 4000,
      projectedInputBytesPerToken: 1,
      maximumRequestBodyBytesPerCall: 262144,
      maximumRequestBodyBytesPerTask: 524288,
      timeoutMilliseconds: 30000,
      hardCostUsd: 3
    },
    pricingPerMillionTokens: {
      uncachedInput: 1.2,
      cachedInput: 0.12,
      cacheWrite: 1.2,
      output: 4.8
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

test("freezes terminal and open decisions in the current paid-smoke route oracle", async () => {
  const oracle = await loadRouteOracleV4();
  assert.equal(oracle.id, "compact-authoring-paid-smoke-route-oracle-v4");
  assert.equal(oracle.packetSchemaVersion, 3);
  assert.equal(
    oracle.oracleSha256,
    "1b9e7adeb8f29d3f1f43818082ac74beff76c44c533c0d7076b70f3265ce48e8"
  );
  assert.deepEqual(oracle.tasks.map(task => [
    task.id,
    task.expectedUnsupported,
    task.expectedUnresolved,
    task.expectedFallbacks,
    task.expectedDRoute
  ]), [
    ["repair-val-histogram", [], [], [], ["search_ggaction", "submit_result"]],
    ["repair-hold-regression-layers", [], [], [], ["search_ggaction", "submit_result"]],
    ["policy-hold-pdf-and-jpg", ["unsupported.jpg"], [], [], ["search_ggaction", "submit_result"]],
    [
      "policy-val-3d-jpeg",
      ["unsupported.3d", "unsupported.jpg"],
      ["renderer.format"],
      ["ggaction://docs/choose-renderer"],
      ["search_ggaction", "read_mcp_resources", "submit_result"]
    ]
  ]);
});

test("freezes the exact v4 paid-smoke candidate, plan, source trees, and cost envelope", async () => {
  const plan = await loadPaidSmokePlanV4();
  assert.equal(plan.id, "compact-authoring-paid-smoke-v4");
  assert.equal(plan.requiredGate, "R54-P5-F");
  assert.equal(
    plan.productCandidateCommit,
    "4eb8ce78b705c160394e0a0e0bafc557f54008c0"
  );
  assert.equal(
    plan.planSha256,
    "68006c3b61751108eb91a75a4a8eb5f4a93862a00762efa95d22340673bf7228"
  );
  assert.equal(
    plan.routeOracleSha256,
    "1b9e7adeb8f29d3f1f43818082ac74beff76c44c533c0d7076b70f3265ce48e8"
  );
  assert.equal(plan.runOrder.length, 16);
  assert.equal(plan.costProjection.expectedModelCallsIfFirstPass, 37);
  assert.equal(plan.costProjection.expectedUsd, 1.152);
  assert.equal(plan.costProjection.calculatedMaximumUsd, 2.496);
  assert.equal(plan.limits.hardCostUsd, 3);
  assert.deepEqual(plan.sourceTrees, {
    src: "3ed263f6d92164e5ebc276b3f7db6a4dc74ad370",
    types: "5cc5082ec2000ed8c89abfd4ee2004bccd3c40b1",
    knowledge: "d98fc7e277099bca443c43b2d2e9cd45ec982076"
  });
});

test("preserves all three historical paid attempts byte-for-byte", async () => {
  const files = [
    [
      "evaluation/compact-authoring-paid-smoke/PLAN.json",
      "95010b28aacb596f18398a9e259ed9bec1de9280e78ccd2316a525a73f08bc54"
    ],
    [
      "evaluation/compact-authoring-paid-smoke/results/IN_PROGRESS.json",
      "a6176c64010795da419cc6f49c4cec645f95fdfdfb938e98c0f216a441dbb745"
    ],
    [
      "evaluation/compact-authoring-paid-smoke-v2/results/IN_PROGRESS.json",
      "a9c9ffadafcadd076d6f44948e9a2f7b7673a4aa68ee3a4e2106e622e54bb12e"
    ],
    [
      "evaluation/compact-authoring-paid-smoke-v3/PLAN.json",
      "261a53c96913eededc7bbed898abc38104d223508701eba7c0f2daf5ebd01d37"
    ],
    [
      "evaluation/compact-authoring-paid-smoke-v3/results/IN_PROGRESS.json",
      "73f9322c3c07defb8a26e280ae2abfa7fbf70611359c9f6d1520ce714e353c62"
    ],
    [
      "evaluation/compact-authoring-paid-smoke-v3/results/RESULT.json",
      "197a1c567aa34d5b054928586a58bd621eb2f369317f3ad1051f7801a667a15c"
    ]
  ];
  for (const [relative, expected] of files) {
    assert.equal(sha256(await readFile(path.join(root, relative))), expected, relative);
  }
});

test("preflights the current model-visible schemas and keeps decision arrays separate", async () => {
  await preflightPaidSmokeToolsV4();
  assert.deepEqual(Object.keys(submitResultToolV4.parameters.properties), [
    "status",
    "source",
    "renderer",
    "unsupported",
    "unresolved"
  ]);
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

test("dry-runs every public-doc, direct, MCP, and explicit-fallback route without spend", async () => {
  const result = await runPaidSmokeDryRunV4();
  assert.equal(result.checks, 16);
  assert.equal(result.passed, true);
  assert.equal(result.externalCalls, 0);
  assert.equal(result.credentialReads, 0);
  assert.equal(result.spendUsd, 0);
  const fallback = result.details.filter(entry => entry.condition === "D");
  assert.deepEqual(fallback.map(entry => entry.knowledge.docsReads), [0, 0, 0, 1]);
  assert.deepEqual(fallback.map(entry => entry.knowledge.toolCalls), [1, 1, 1, 2]);
});

test("keeps fresh histogram, regression, renderer, and limitation wording closed", () => {
  const cases = [
    [
      "Draw a frequency distribution with axis guides as an SVG document.",
      ["chart.histogram", "guide.axes", "renderer.svg"],
      []
    ],
    [
      "Add circle marks, map to x, map to y, a best fit line, confidence band, and automatic guides.",
      ["mark.point", "statistics.regression", "statistics.errorBand", "encoding.x", "encoding.y", "guide.all"],
      []
    ],
    [
      "Produce a vector PDF and a JPEG image.",
      ["renderer.pdf", "unsupported.jpg"],
      ["unsupported.jpg"]
    ],
    [
      "Build a three-dimensional plot and return a JPEG image.",
      ["unsupported.3d", "unsupported.jpg"],
      ["unsupported.3d", "unsupported.jpg"]
    ]
  ];
  for (const [query, matched, unsupported] of cases) {
    const packet = searchGgaction(query);
    for (const id of matched) assert.equal(packet.matchedConstraints.includes(id), true, `${query}: ${id}`);
    assert.deepEqual(packet.unsupported.map(entry => entry.constraint), unsupported, query);
  }
});

test("runs a two-call direct route to an executable histogram", async () => {
  const oracle = await loadRouteOracleV4();
  const task = oracle.tasks.find(entry => entry.id === "repair-val-histogram");
  let call = 0;
  const result = await runPaidSmokeTaskV4({
    plan: planForMocks(),
    task,
    condition: "B",
    apiKey: "test-key-with-more-than-twenty-characters",
    ledger: ledger(),
    artifactRoot: path.join(root, ".artifacts", "test", "paid-smoke-v4-direct"),
    createResponse: async () => {
      call += 1;
      const output = call === 1
        ? {
            type: "function_call",
            name: "search_ggaction",
            arguments: JSON.stringify({ query: task.query }),
            call_id: "search"
          }
        : {
            type: "function_call",
            name: "submit_result",
            arguments: JSON.stringify({
              status: "program",
              source: histogramSource(),
              renderer: "svg",
              unsupported: [],
              unresolved: []
            }),
            call_id: "submit"
          };
      return {
        model: "gpt-5.6-terra",
        service_tier: "default",
        output: [reasoningItem(`direct-${call}`), output],
        usage: usage()
      };
    }
  });
  assert.equal(result.passed, true);
  assert.equal(result.modelCalls, 2);
  assert.deepEqual(result.trace.map(entry => entry.tool), ["search_ggaction", "submit_result"]);
});

test("uses a two-call D route for a terminal limitation with no open decision", async () => {
  const oracle = await loadRouteOracleV4();
  const task = oracle.tasks.find(entry => entry.id === "policy-hold-pdf-and-jpg");
  let call = 0;
  const result = await runPaidSmokeTaskV4({
    plan: planForMocks(),
    task,
    condition: "D",
    apiKey: "test-key-with-more-than-twenty-characters",
    ledger: ledger(),
    artifactRoot: path.join(root, ".artifacts", "test", "paid-smoke-v4-terminal"),
    createResponse: async () => {
      call += 1;
      const output = call === 1
        ? {
            type: "function_call",
            name: "search_ggaction",
            arguments: JSON.stringify({ query: task.query }),
            call_id: "search"
          }
        : {
            type: "function_call",
            name: "submit_result",
            arguments: JSON.stringify({
              status: "unsupported",
              source: null,
              renderer: "pdf",
              unsupported: ["unsupported.jpg"],
              unresolved: []
            }),
            call_id: "submit"
          };
      return {
        model: "gpt-5.6-terra",
        service_tier: "default",
        output: [reasoningItem(`terminal-${call}`), output],
        usage: usage()
      };
    }
  });
  assert.equal(result.passed, true);
  assert.deepEqual(result.trace.map(entry => entry.tool), task.expectedDRoute);
  assert.equal(result.knowledge.docsReads, 0);
});

test("uses a three-call D route only when an open decision names a docs resource", async () => {
  const oracle = await loadRouteOracleV4();
  const task = oracle.tasks.find(entry => entry.id === "policy-val-3d-jpeg");
  let call = 0;
  const result = await runPaidSmokeTaskV4({
    plan: planForMocks(),
    task,
    condition: "D",
    apiKey: "test-key-with-more-than-twenty-characters",
    ledger: ledger(),
    artifactRoot: path.join(root, ".artifacts", "test", "paid-smoke-v4-open"),
    createResponse: async () => {
      call += 1;
      const output = [
        {
          type: "function_call",
          name: "search_ggaction",
          arguments: JSON.stringify({ query: task.query }),
          call_id: "search"
        },
        {
          type: "function_call",
          name: "read_mcp_resources",
          arguments: JSON.stringify({ uris: task.expectedFallbacks }),
          call_id: "read"
        },
        {
          type: "function_call",
          name: "submit_result",
          arguments: JSON.stringify({
            status: "unsupported",
            source: null,
            renderer: null,
            unsupported: task.expectedUnsupported,
            unresolved: task.expectedUnresolved
          }),
          call_id: "submit"
        }
      ][call - 1];
      return {
        model: "gpt-5.6-terra",
        service_tier: "default",
        output: [reasoningItem(`open-${call}`), output],
        usage: usage()
      };
    }
  });
  assert.equal(result.passed, true);
  assert.deepEqual(result.trace.map(entry => entry.tool), task.expectedDRoute);
  assert.equal(result.knowledge.docsReads, 1);
});

test("rejects a correct submission that skips its assigned knowledge route", async () => {
  const oracle = await loadRouteOracleV4();
  const task = oracle.tasks.find(entry => entry.id === "repair-val-histogram");
  const result = await runPaidSmokeTaskV4({
    plan: planForMocks(),
    task,
    condition: "B",
    apiKey: "test-key-with-more-than-twenty-characters",
    ledger: ledger(),
    artifactRoot: path.join(root, ".artifacts", "test", "paid-smoke-v4-skipped"),
    createResponse: async () => ({
      model: "gpt-5.6-terra",
      service_tier: "default",
      output: [{
        type: "function_call",
        name: "submit_result",
        arguments: JSON.stringify({
          status: "program",
          source: histogramSource(),
          renderer: "svg",
          unsupported: [],
          unresolved: []
        }),
        call_id: "submit"
      }],
      usage: usage()
    })
  });
  assert.equal(result.passed, false);
  assert.match(result.failures.join("\n"), /knowledge-search-count:0/u);
});

test("stops before accepting incomplete billing usage", async () => {
  const oracle = await loadRouteOracleV4();
  const task = oracle.tasks[0];
  const currentLedger = ledger();
  await assert.rejects(
    runPaidSmokeTaskV4({
      plan: planForMocks(),
      task,
      condition: "B",
      apiKey: "test-key-with-more-than-twenty-characters",
      ledger: currentLedger,
      artifactRoot: path.join(root, ".artifacts", "test", "paid-smoke-v4-usage"),
      createResponse: async () => ({
        model: "gpt-5.6-terra",
        service_tier: "default",
        output: [],
        usage: { input_tokens: 1, output_tokens: 1, total_tokens: 2 }
      })
    }),
    /incomplete-billing-usage/u
  );
  assert.equal(currentLedger.modelCalls, 0);
  assert.equal(currentLedger.costUsd, 0);
});

test("persists billed usage before a malformed provider response aborts", async () => {
  const oracle = await loadRouteOracleV4();
  const task = oracle.tasks[0];
  const currentLedger = ledger();
  const progress = [];
  await assert.rejects(
    runPaidSmokeTaskV4({
      plan: planForMocks(),
      task,
      condition: "B",
      apiKey: "test-key-with-more-than-twenty-characters",
      ledger: currentLedger,
      artifactRoot: path.join(root, ".artifacts", "test", "paid-smoke-v4-malformed"),
      createResponse: async () => ({
        model: "gpt-5.6-terra",
        service_tier: "default",
        output: [],
        usage: usage()
      }),
      onProgress: async snapshot => progress.push(snapshot)
    }),
    /expected one function call/u
  );
  assert.equal(currentLedger.modelCalls, 1);
  assert.ok(currentLedger.costUsd > 0);
  assert.equal(progress.length, 1);
  assert.equal(progress[0].trace[0].billingUsageComplete, true);
  assert.equal(progress[0].trace[0].functionCallCount, 0);
  assert.equal(progress[0].trace[0].tool, null);
});

test("keeps opaque transport bytes outside the projected billable input", () => {
  const base = {
    model: "gpt-5.6-terra",
    input: [{ role: "user", content: [{ type: "input_text", text: "make a chart" }] }]
  };
  const opaque = { ...base, input: [...base.input, reasoningItem("projection", 80000)] };
  const visible = {
    ...base,
    input: [...base.input, { type: "reasoning", id: "projection", summary: [] }]
  };
  assert.equal(
    projectedRequestInputTokens(opaque, { priorReasoningTokens: 48 }),
    projectedRequestInputTokens(visible) + 48
  );
});

test("bounds generated-program errors without exposing local command details", async () => {
  const oracle = await loadRouteOracleV4();
  const task = oracle.tasks.find(entry => entry.id === "repair-val-histogram");
  const parent = path.join(root, ".artifacts", "test");
  await mkdir(parent, { recursive: true });
  const artifactRoot = await mkdtemp(path.join(parent, "paid-smoke-v4-error-"));
  try {
    const result = await evaluateSubmissionV4({
      task,
      artifactRoot,
      submission: {
        status: "program",
        source: [
          'import { Canvas } from "ggaction";',
          'import { renderToSVG } from "ggaction/svg";',
          "export function buildChart(rows) { return Canvas(rows); }",
          "export function renderChart(program) { return renderToSVG(program); }"
        ].join("\n"),
        renderer: "svg",
        unsupported: [],
        unresolved: []
      }
    });
    assert.equal(result.passed, false);
    assert.match(result.failures.join("\n"), /^generated-program-error:SyntaxError:/u);
    assert.doesNotMatch(result.failures.join("\n"), /Command failed|\/Users\//u);
  } finally {
    await rm(artifactRoot, { recursive: true, force: true });
  }
});
