import assert from "node:assert/strict";
import test from "node:test";

import { loadPaidComparisonPlanV8 } from "../../scripts/compact-paid-comparison-v8.js";
import {
  loadPaidComparisonPlanV10,
  runPaidComparisonTaskV10
} from "../../scripts/compact-paid-comparison-v10.js";

const nanoAlias = "gpt-5.4-nano";
const nanoSnapshot = "gpt-5.4-nano-2026-03-17";

function nanoModel() {
  return {
    id: nanoAlias,
    requestModel: nanoSnapshot,
    cacheWriteBillingBasis: "uncached-input-fallback",
    pricingPerMillionTokens: {
      uncachedInput: 0.2,
      cachedInput: 0.02,
      cacheWrite: 0.2,
      maximumInput: 0.2,
      output: 1.25
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
    standardCostUsd: 0,
    costUsd: 0,
    uncertainCostReserveUsd: 0,
    exposureCostUsd: 0,
    modelCalls: 0,
    apiRequestAttempts: 0,
    providerRetries: 0
  };
}

function response(name, args, {
  model = nanoSnapshot,
  serviceTier = "default"
} = {}) {
  return {
    model,
    service_tier: serviceTier,
    status: "completed",
    incomplete_details: null,
    error: null,
    output: [{
      type: "function_call",
      status: "completed",
      name,
      call_id: `${name}-call`,
      arguments: JSON.stringify(args)
    }],
    usage: {
      input_tokens: 100,
      input_tokens_details: { cached_tokens: 0 },
      output_tokens: 50,
      output_tokens_details: { reasoning_tokens: 10 },
      total_tokens: 150
    }
  };
}

async function fixture() {
  const v8 = await loadPaidComparisonPlanV8();
  return {
    plan: { ...v8, models: [nanoModel()] },
    task: v8.tasks.find(entry => entry.id === "final3-27-geo")
  };
}

test("freezes the snapshot-pinned replacement plan and unchanged paid envelope", async () => {
  const plan = await loadPaidComparisonPlanV10();
  assert.equal(plan.planSha256, "48d8cdebf81bcefedef96148a20836c46fb483ddae8080aef46c013a20f3d950");
  assert.equal(plan.evaluatorCheckpointCommit, "cd65fd8e91481fafddfff90a2a432d32d9821022");
  assert.equal(plan.routeOracleSha256, "8211f33c5a443649def1f72de6f92d943a260f3df89795032d498f5c87819816");
  assert.deepEqual(
    plan.models.map(model => [model.id, model.requestModel]),
    [
      ["gpt-5.6-terra", "gpt-5.6-terra"],
      ["gpt-5.6-luna", "gpt-5.6-luna"],
      [nanoAlias, nanoSnapshot]
    ]
  );
  assert.equal(plan.runOrder.length, 576);
  assert.equal(plan.limits.maximumModelCallsTotal, 2460);
  assert.equal(plan.limits.maximumApiRequestAttemptsTotal, 2532);
  assert.equal(plan.costProjection.expectedWithRegionalUpliftUsd, 18.28992);
  assert.equal(plan.limits.hardCostUsd, 50);
});

test("pins Nano requests to the official snapshot and records both provider identities", async () => {
  const { plan, task } = await fixture();
  const requestedModels = [];
  const calls = [
    ["search_ggaction", { query: task.query }],
    ["submit_result", {
      status: "unsupported",
      source: null,
      renderer: "svg",
      unsupported: ["unsupported.geo"],
      unresolved: []
    }]
  ];
  let index = 0;
  const execution = await runPaidComparisonTaskV10({
    plan,
    task,
    model: nanoAlias,
    condition: "B",
    apiKey: "test-key-with-more-than-twenty-characters",
    ledger: ledger(),
    artifactRoot: "/unused",
    createResponse: async ({ request }) => {
      requestedModels.push(request.model);
      const [name, args] = calls[index];
      index += 1;
      return response(name, args);
    }
  });

  assert.equal(execution.passed, true);
  assert.deepEqual(requestedModels, [nanoSnapshot, nanoSnapshot]);
  assert.equal(execution.usage.cacheWriteTokens, 0);
  for (const entry of execution.trace) {
    assert.deepEqual(entry.provider.identity, {
      requestedModel: nanoSnapshot,
      returnedModel: nanoSnapshot,
      requestedServiceTier: "default",
      returnedServiceTier: "default"
    });
  }
});

test("separates model mismatch and preserves its billed response before stopping", async () => {
  const { plan, task } = await fixture();
  const taskLedger = ledger();
  let progress;
  await assert.rejects(
    runPaidComparisonTaskV10({
      plan,
      task,
      model: nanoAlias,
      condition: "B",
      apiKey: "test-key-with-more-than-twenty-characters",
      ledger: taskLedger,
      artifactRoot: "/unused",
      onProgress: snapshot => { progress = snapshot; },
      createResponse: async () => response("search_ggaction", { query: task.query }, {
        model: nanoAlias
      })
    }),
    /provider-model-identity-mismatch:requested-gpt-5\.4-nano-2026-03-17:returned-gpt-5\.4-nano/u
  );

  assert.equal(taskLedger.modelCalls, 1);
  assert.equal(taskLedger.apiRequestAttempts, 1);
  assert.ok(taskLedger.costUsd > 0);
  assert.deepEqual(progress.trace[0].provider.identity, {
    requestedModel: nanoSnapshot,
    returnedModel: nanoAlias,
    requestedServiceTier: "default",
    returnedServiceTier: "default"
  });
  assert.equal(progress.trace[0].billingUsageComplete, true);
});

test("separates service-tier mismatch and preserves its billed response before stopping", async () => {
  const { plan, task } = await fixture();
  const taskLedger = ledger();
  let progress;
  await assert.rejects(
    runPaidComparisonTaskV10({
      plan,
      task,
      model: nanoAlias,
      condition: "B",
      apiKey: "test-key-with-more-than-twenty-characters",
      ledger: taskLedger,
      artifactRoot: "/unused",
      onProgress: snapshot => { progress = snapshot; },
      createResponse: async () => response("search_ggaction", { query: task.query }, {
        serviceTier: "priority"
      })
    }),
    /provider-service-tier-mismatch:requested-default:returned-priority/u
  );

  assert.equal(taskLedger.modelCalls, 1);
  assert.equal(taskLedger.apiRequestAttempts, 1);
  assert.ok(taskLedger.costUsd > 0);
  assert.deepEqual(progress.trace[0].provider.identity, {
    requestedModel: nanoSnapshot,
    returnedModel: nanoSnapshot,
    requestedServiceTier: "default",
    returnedServiceTier: "priority"
  });
  assert.equal(progress.trace[0].billingUsageComplete, true);
});
