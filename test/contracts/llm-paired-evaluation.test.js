import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { runPairedEvaluationTask } from "../../scripts/llm-eval/paired-condition-runner.js";
import {
  captureStructuredKnowledgeSurface,
  createPairedKnowledgeAdapter
} from "../../scripts/llm-eval/paired-knowledge-adapters.js";
import { createLocalMcpKnowledgeClient } from "../../scripts/llm-eval/mcp-client.js";
import { captureCurrentDocumentationSnapshot } from "../../scripts/llm-eval/current-docs.js";

const commit = "d".repeat(40);
const apiKey = `sk-${"x".repeat(40)}`;

async function fixtures() {
  return Promise.all([
    readFile(new URL("../llm/tasks.json", import.meta.url), "utf8").then(JSON.parse),
    readFile(new URL("../llm/paired-evaluation-plan.json", import.meta.url), "utf8").then(JSON.parse)
  ]);
}

function call(name, arguments_, callId = name) {
  return { type: "function_call", name, call_id: callId, arguments: JSON.stringify(arguments_) };
}

function mockFetch(outputs, requests) {
  return async (_url, init) => {
    requests.push(JSON.parse(init.body));
    return {
      ok: true,
      async json() {
        return {
          id: `response_${requests.length}`,
          model: "gpt-5.6-terra",
          output: outputs.shift(),
          usage: {
            input_tokens: 1000,
            input_tokens_details: { cached_tokens: 0, cache_write_tokens: 0 },
            output_tokens: 300,
            output_tokens_details: { reasoning_tokens: 100 },
            total_tokens: 1300
          }
        };
      }
    };
  };
}

const validScatterSource = `
import { chart, render } from "ggaction";
export function buildChart(datasets) {
  const values = datasets["cars-v1"].filter(row =>
    row.Horsepower != null && row.Miles_per_Gallon != null && row.Origin != null
  );
  return chart()
    .createCanvas({ width: 640, height: 400, margin: { top: 30, right: 140, bottom: 60, left: 70 } })
    .createData({ values })
    .createScatterPlot({
      x: "Horsepower", y: "Miles_per_Gallon", color: "Origin",
      guides: { axes: { x: {}, y: {} }, legend: {} }
    });
}
`;

const incompleteScatterSource = `
import { chart, render } from "ggaction";
export function buildChart(datasets) {
  const values = datasets["cars-v1"].filter(row =>
    row.Horsepower != null && row.Miles_per_Gallon != null && row.Origin != null
  );
  return chart()
    .createCanvas({ width: 640, height: 400, margin: 70 })
    .createData({ values })
    .createPointMark()
    .encodeX({ field: "Horsepower" })
    .encodeY({ field: "Miles_per_Gallon" });
}
`;

function topLegendSource(opacityCount) {
  return `
import { chart, render } from "ggaction";
export function buildChart(datasets) {
  const values = datasets["cars-v1"].filter(row =>
    row.Displacement != null && row.Miles_per_Gallon != null &&
    row.Origin != null && row.Acceleration != null
  );
  return chart()
    .createCanvas({ width: 640, height: 400, margin: { top: 160, right: 30, bottom: 60, left: 70 } })
    .createData({ values })
    .createPointMark({ id: "points" })
    .encodeX({ target: "points", field: "Displacement" })
    .encodeY({ target: "points", field: "Miles_per_Gallon" })
    .encodeColor({ target: "points", field: "Origin", fieldType: "nominal" })
    .encodeOpacity({ target: "points", field: "Acceleration" })
    .createGuides({ axes: { x: {}, y: {} }, legend: false })
    .createLegend({
      target: "points", channels: ["color"], position: "top",
      titlePosition: "left", columns: 3, offset: 18, itemGap: 12
    })
    .createLegend({
      target: "points", channels: ["opacity"], position: "top",
      titlePosition: "left", count: ${opacityCount}, offset: 18, itemGap: 12
    });
}
`;
}

test("keeps direct and MCP structured knowledge byte-equivalent for the model", async () => {
  const probe = createLocalMcpKnowledgeClient();
  const mcp = createLocalMcpKnowledgeClient();
  try {
    const surface = await captureStructuredKnowledgeSurface(probe);
    const direct = createPairedKnowledgeAdapter({ condition: "B", commit, structuredSurface: surface });
    const transported = createPairedKnowledgeAdapter({ condition: "C", commit, structuredSurface: surface, mcp });
    await Promise.all([direct.initialize(), transported.initialize()]);

    assert.deepEqual(transported.tools, direct.tools);
    assert.equal(transported.instruction, direct.instruction);
    assert.equal(await transported.routingText(), await direct.routingText());

    const search = call("search_ggaction", { query: "scatter plot with categorical color", limit: 3 });
    const [directSearch, transportedSearch] = await Promise.all([
      direct.handle(search),
      transported.handle(search)
    ]);
    assert.equal(transportedSearch, directSearch);
    const parsed = JSON.parse(directSearch);
    assert.equal(parsed.results[0].resourceUri, "ggaction://recipes/scatterplot");
    assert.match(parsed.primaryResource.value.builderSource, /export function buildChart\(values\)/u);

    const read = call("read_mcp_resource", { uri: parsed.results[0].resourceUri });
    const [directRead, transportedRead] = await Promise.all([direct.handle(read), transported.handle(read)]);
    assert.equal(transportedRead, directRead);
    assert.equal(mcp.operationSnapshot().callTool, 1);
    assert.equal(mcp.operationSnapshot().readResource, 2);
    assert.equal(mcp.operationSnapshot().total, 7);
    assert.equal(mcp.lifecycleSnapshot().startupDurationMs >= 0, true);
  } finally {
    await Promise.all([probe.close(), mcp.close()]);
  }
});

test("pins public documentation reads and search to one identified snapshot", async () => {
  const snapshot = await captureCurrentDocumentationSnapshot();
  assert.match(snapshot.artifact.sha256, /^[0-9a-f]{64}$/u);
  assert.equal(snapshot.artifact.fileCount > 10, true);
  assert.equal(snapshot.artifact.bytes > 10_000, true);
  const first = await snapshot.read("llms.txt");
  const second = await snapshot.read("llms.txt");
  assert.deepEqual(second, first);
  const results = await snapshot.search("scatter plot");
  assert.equal(results.length > 0, true);
});

test("reserves a forced final submission and two real repair calls", async () => {
  const [corpus, plan] = await fixtures();
  const probe = createLocalMcpKnowledgeClient();
  try {
    const surface = await captureStructuredKnowledgeSurface(probe);
    const knowledge = createPairedKnowledgeAdapter({ condition: "B", commit, structuredSurface: surface });
    const task = corpus.tasks.find(candidate => candidate.id === "cars-scatter-origin");
    const outputs = [
      [call("search_ggaction", { query: task.prompt }, "search")],
      [call("read_mcp_resource", { uri: "ggaction://recipes/scatterplot" }, "read")],
      [{ type: "message", role: "assistant", content: [{ type: "output_text", text: "Preparing the program." }] }],
      [call("submit_program", { source: incompleteScatterSource }, "forced")],
      [call("submit_program", { source: incompleteScatterSource }, "repair_1")],
      [call("submit_program", { source: validScatterSource }, "repair_2")]
    ];
    const requests = [];
    const result = await runPairedEvaluationTask({
      knowledge,
      apiKey,
      corpus,
      task,
      repetition: 1,
      plan,
      outputRoot: new URL("../../.artifacts/llm-eval/paired-repair-contract", import.meta.url).pathname,
      fetchImpl: mockFetch(outputs, requests)
    });

    assert.equal(requests.length, 6);
    assert.deepEqual(requests.slice(0, 3).map(request => request.tool_choice), ["auto", "auto", "auto"]);
    assert.deepEqual(requests.slice(3).map(request => request.tool_choice), [
      { type: "function", name: "submit_program" },
      { type: "function", name: "submit_program" },
      { type: "function", name: "submit_program" }
    ]);
    assert.equal(result.metrics.submissions, 3);
    assert.equal(result.metrics.repairRounds, 2);
    assert.equal(result.metrics.modelCalls, 6);
    assert.equal(result.metrics.knowledgeToolCalls, 2);
    assert.equal(result.metrics.knowledgeToolCallsExecuted, 2);
    assert.equal(result.metrics.knowledgeToolCallsRejected, 0);
    assert.equal(result.metrics.unreportedCostUpperBoundUsd, 0);
    assert.equal(result.metrics.mcpOperations.total, 0);
    assert.equal(result.outcome.retrievalSucceeded, true);
    assert.equal(result.outcome.naturalSubmission, false);
    assert.equal(result.outcome.forcedSubmissionUsed, true);
    assert.equal(result.outcome.firstSubmissionValid, false);
    assert.equal(result.outcome.finalValid, true);
    assert.equal(result.artifacts.submissions.length, 3);
    assert.match(result.artifacts.submissions[0].programFile, /program-submission-1\.mjs$/u);
    assert.match(result.artifacts.submissions[2].programFile, /program-submission-3\.mjs$/u);
    assert.notEqual(result.artifacts.submissions[0].programSha256, result.artifacts.submissions[2].programSha256);
  } finally {
    await probe.close();
  }
});

test("returns measured legend geometry to the repair call without weakening the oracle", async () => {
  const [corpus, plan] = await fixtures();
  const probe = createLocalMcpKnowledgeClient();
  try {
    const surface = await captureStructuredKnowledgeSurface(probe);
    const knowledge = createPairedKnowledgeAdapter({
      condition: "B",
      commit,
      structuredSurface: surface
    });
    const task = corpus.tasks.find(candidate => candidate.id === "cars-multi-legend");
    const requests = [];
    const result = await runPairedEvaluationTask({
      knowledge,
      apiKey,
      corpus,
      task,
      repetition: 1,
      plan,
      outputRoot: new URL(
        "../../.artifacts/llm-eval/paired-legend-diagnostic-contract",
        import.meta.url
      ).pathname,
      fetchImpl: mockFetch([
        [call("submit_program", { source: topLegendSource(5) }, "invalid")],
        [call("submit_program", { source: topLegendSource(3) }, "repaired")]
      ], requests)
    });

    const priorOutput = requests[1].input.find(item =>
      item.type === "function_call_output" && item.call_id === "invalid"
    );
    const feedback = JSON.parse(priorOutput.output);
    assert.equal(feedback.valid, false);
    assert.equal(feedback.failures.includes(
      "failed-validation:legend:order:left-to-right"
    ), true);
    assert.equal(feedback.diagnostics.some(entry =>
      entry.id === "legend:order:left-to-right" &&
      /reduce sampled count\/item widths or widen the plot/u.test(entry.diagnostic)
    ), true);
    assert.equal(feedback.diagnostics.some(entry =>
      entry.id === "legend:titles-aligned" &&
      /wrapped onto separate rows/u.test(entry.diagnostic)
    ), true);
    assert.equal(result.artifacts.submissions[0].diagnostics.length >= 2, true);
    assert.equal(result.outcome.firstSubmissionValid, false);
    assert.equal(result.outcome.finalValid, true);
  } finally {
    await probe.close();
  }
});

test("counts docs retrieval and separates attempted, executed, and rejected knowledge calls", async () => {
  const [corpus, plan] = await fixtures();
  const documentation = {
    route: "llms.txt",
    async search() {
      return [{ title: "Scatter plot", url: "examples/scatterplot", kind: "example", summary: "Build a scatter plot." }];
    },
    async read(route) {
      return { route, file: `docs/${route}.md`, truncated: false, text: "Pinned documentation." };
    }
  };
  const knowledge = createPairedKnowledgeAdapter({ condition: "A", commit, documentation });
  const task = corpus.tasks.find(candidate => candidate.id === "cars-scatter-origin");
  const outputs = [
    [
      call("search_docs", { query: "scatter plot" }, "search"),
      call("read_doc", { route: "examples/scatterplot" }, "read_1"),
      call("read_doc", { route: "api/canvas" }, "read_2"),
      call("read_doc", { route: "api/actions" }, "rejected")
    ],
    [call("submit_program", { source: validScatterSource }, "submit")]
  ];
  const requests = [];
  const outputRoot = new URL("../../.artifacts/llm-eval/paired-docs-accounting-contract", import.meta.url).pathname;
  const result = await runPairedEvaluationTask({
    knowledge,
    apiKey,
    corpus,
    task,
    repetition: 1,
    plan,
    outputRoot,
    fetchImpl: mockFetch(outputs, requests)
  });

  assert.match(requests[0].input[0].content, /at most 3 knowledge-tool calls/u);
  assert.match(requests[0].input[0].content, /Start with one search_docs call/u);
  assert.equal(result.metrics.knowledgeToolCalls, 4);
  assert.equal(result.metrics.knowledgeToolCallsExecuted, 3);
  assert.equal(result.metrics.knowledgeToolCallsRejected, 1);
  assert.equal(result.outcome.retrievalSucceeded, true);
});

test("reuses one MCP session while reporting per-task protocol deltas", async () => {
  const [corpus, plan] = await fixtures();
  const probe = createLocalMcpKnowledgeClient();
  const mcp = createLocalMcpKnowledgeClient({ artifact: { sha256: "a".repeat(64), kind: "test-package" } });
  try {
    const surface = await captureStructuredKnowledgeSurface(probe);
    const knowledge = createPairedKnowledgeAdapter({ condition: "C", commit, structuredSurface: surface, mcp });
    const task = corpus.tasks.find(candidate => candidate.id === "cars-scatter-origin");
    const run = repetition => runPairedEvaluationTask({
      knowledge,
      apiKey,
      corpus,
      task,
      repetition,
      plan,
      outputRoot: new URL("../../.artifacts/llm-eval/paired-persistent-contract", import.meta.url).pathname,
      fetchImpl: mockFetch([
        [call("search_ggaction", { query: task.prompt }, `search_${repetition}`)],
        [call("submit_program", { source: validScatterSource }, `submit_${repetition}`)]
      ], [])
    });

    const first = await run(1);
    const second = await run(2);
    assert.equal(first.metrics.mcpOperations.initialize, 1);
    assert.equal(first.metrics.mcpOperations.listResources, 1);
    assert.equal(first.metrics.mcpOperations.listResourceTemplates, 1);
    assert.equal(first.metrics.mcpOperations.listTools, 1);
    assert.equal(first.metrics.mcpOperations.readResource, 1);
    assert.equal(first.metrics.mcpOperations.callTool, 1);
    assert.equal(first.metrics.mcpOperations.total, 6);
    assert.deepEqual(second.metrics.mcpOperations, {
      initialize: 0,
      listResources: 0,
      listResourceTemplates: 0,
      listTools: 0,
      readResource: 0,
      callTool: 1,
      total: 1
    });
    assert.deepEqual(second.metrics.mcpSession.artifact, { sha256: "a".repeat(64), kind: "test-package" });
  } finally {
    await Promise.all([probe.close(), mcp.close()]);
  }
});

test("records a conservative request bound when provider usage is incomplete", async () => {
  const [corpus, plan] = await fixtures();
  const probe = createLocalMcpKnowledgeClient();
  try {
    const surface = await captureStructuredKnowledgeSurface(probe);
    const knowledge = createPairedKnowledgeAdapter({ condition: "B", commit, structuredSurface: surface });
    const task = corpus.tasks.find(candidate => candidate.id === "cars-scatter-origin");
    const result = await runPairedEvaluationTask({
      knowledge,
      apiKey,
      corpus,
      task,
      repetition: 1,
      plan,
      outputRoot: new URL("../../.artifacts/llm-eval/paired-usage-contract", import.meta.url).pathname,
      fetchImpl: async () => ({
        ok: true,
        async json() {
          return { model: plan.model.name, output: [], usage: { input_tokens: 100, output_tokens: 10 } };
        }
      })
    });

    assert.equal(result.outcome.failureCategory, "provider-error");
    assert.equal(result.metrics.modelCalls, 1);
    assert.equal(result.metrics.estimatedCostUsd, 0);
    assert.equal(result.metrics.unreportedCostUpperBoundUsd > 0, true);
  } finally {
    await probe.close();
  }
});
