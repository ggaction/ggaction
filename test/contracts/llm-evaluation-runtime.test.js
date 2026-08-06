import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  candidateDocFiles,
  readCurrentDoc,
  searchCurrentDocs
} from "../../scripts/llm-eval/current-docs.js";
import {
  createOpenAIResponse,
  estimateResponseCostUsd,
  normalizeApiKeyText,
  normalizeResponseUsage
} from "../../scripts/llm-eval/openai-responses.js";
import {
  evaluateGeneratedProgram,
  runtimeFunctionsFromSource,
  validateGeneratedSource
} from "../../scripts/llm-eval/program-evaluator.js";
import { runConditionATask } from "../../scripts/llm-eval/condition-a-runner.js";
import { runConditionBTask } from "../../scripts/llm-eval/condition-b-runner.js";
import { runConditionCTask } from "../../scripts/llm-eval/condition-c-runner.js";
import {
  conditionAKnowledge,
  conditionBKnowledge,
  conditionCKnowledge
} from "../../scripts/llm-eval/knowledge-adapters.js";

test("keeps condition A documentation reads bounded inside public docs", async () => {
  const routing = await readCurrentDoc("./llms.txt");
  const actions = await readCurrentDoc("./reference/actions/");
  const search = await searchCurrentDocs("regression scatterplot", { limit: 3 });

  assert.equal(routing.file, "docs/llms.txt");
  assert.equal(routing.truncated, false);
  assert.equal(actions.file, "docs/reference/actions.md");
  assert.equal(actions.text.includes("Action Reference"), true);
  assert.equal(search.length, 3);
  assert.equal(search.some(result => result.url.includes("regression")), true);
  assert.equal(candidateDocFiles("./reference/actions/").length, 2);
  await assert.rejects(() => readCurrentDoc("../../package.json"), /inside docs/u);
});

test("normalizes API key files without exposing or weakening the token", () => {
  const token = `sk-${"x".repeat(40)}`;

  assert.equal(normalizeApiKeyText(`${token}\n`), token);
  assert.equal(normalizeApiKeyText(`OPENAI_API_KEY='${token}'\n`), token);
  assert.throws(() => normalizeApiKeyText("short"), /valid non-whitespace token/u);
});

test("normalizes response usage and uses the conservative price classes", () => {
  const usage = {
    input_tokens: 1000,
    input_tokens_details: { cached_tokens: 200, cache_write_tokens: 300 },
    output_tokens: 400,
    output_tokens_details: { reasoning_tokens: 250 },
    total_tokens: 1400
  };
  const normalized = normalizeResponseUsage(usage);

  assert.deepEqual(normalized, {
    promptTokens: 1000,
    cachedInputTokens: 200,
    cacheWriteTokens: 300,
    completionTokens: 400,
    reasoningTokens: 250,
    totalTokens: 1400
  });
  assert.equal(estimateResponseCostUsd(usage, {
    uncachedInput: 2.5,
    cachedInput: 0.25,
    cacheWrite: 3.125,
    output: 15
  }), 0.0082375);
});

test("sends one bounded Responses request and never logs the credential", async () => {
  const token = `sk-${"x".repeat(40)}`;
  let received;
  const payload = await createOpenAIResponse({
    apiKey: token,
    request: { model: "test-model", input: "hello", store: false },
    fetchImpl: async (url, init) => {
      received = { url, init };
      return {
        ok: true,
        async json() {
          return { id: "resp_test", output: [], usage: {} };
        }
      };
    }
  });

  assert.equal(received.url, "https://api.openai.com/v1/responses");
  assert.equal(received.init.headers.authorization, `Bearer ${token}`);
  assert.deepEqual(JSON.parse(received.init.body), {
    model: "test-model",
    input: "hello",
    store: false
  });
  assert.equal(payload.id, "resp_test");
});

test("executes and renders a bounded generated chart program", async () => {
  const corpus = JSON.parse(await readFile(new URL("../llm/tasks.json", import.meta.url), "utf8"));
  const task = corpus.tasks.find(candidate => candidate.id === "cars-scatter-origin");
  const cars = JSON.parse(await readFile(new URL("../../data/cars.json", import.meta.url), "utf8"));
  const source = `
    import { chart, render } from "ggaction";

    export function buildChart(datasets) {
      const values = datasets["cars-v1"].filter(row =>
        row.Horsepower != null && row.Miles_per_Gallon != null && row.Origin != null
      );
      return chart()
        .createCanvas({ width: 640, height: 400, margin: { top: 30, right: 130, bottom: 60, left: 70 } })
        .createData({ values })
        .createScatterPlot({
          x: "Horsepower",
          y: "Miles_per_Gallon",
          color: "Origin",
          guides: { axes: { x: {}, y: {} }, legend: {} }
        });
    }
  `;
  const result = await evaluateGeneratedProgram({
    source,
    task,
    datasets: { "cars-v1": cars },
    artifactRoot: new URL("../../.artifacts/llm-eval/runtime-contract", import.meta.url).pathname
  });

  assert.equal(result.actions.includes("createScatterPlot"), true);
  assert.equal(result.actions.includes("createGuides"), true);
  assert.deepEqual(result.runtimeFunctions, ["chart", "render"]);
  assert.equal(result.validations.every(validation => validation.passed), true);
  assert.deepEqual(result.renderers, ["canvas"]);
});

test("rejects generated programs with capabilities outside the chart sandbox", () => {
  assert.throws(() => validateGeneratedSource(`
    import { chart } from "ggaction";
    import { readFile } from "node:fs/promises";
    export function buildChart() { return chart(); }
  `), /not allowed/u);
  assert.deepEqual(runtimeFunctionsFromSource(`
    import { chart, render as draw } from "ggaction";
    import { renderToSVG } from "ggaction/svg";
  `), ["chart", "render", "renderToSVG"]);
});

test("validates composite statistical actions from their public input trace", async () => {
  const corpus = JSON.parse(await readFile(new URL("../llm/tasks.json", import.meta.url), "utf8"));
  const task = corpus.tasks.find(candidate => candidate.id === "cars-error-bar-origin");
  const cars = JSON.parse(await readFile(new URL("../../data/cars.json", import.meta.url), "utf8"));
  const source = `
    import { chart, render } from "ggaction";
    export function buildChart(datasets) {
      const values = datasets["cars-v1"].filter(row => row.Origin != null && row.Acceleration != null);
      return chart()
        .createCanvas({ width: 640, height: 400, margin: { top: 70, right: 40, bottom: 65, left: 80 } })
        .createData({ id: "cars", values })
        .createErrorBar({
          data: "cars",
          x: { field: "Origin", fieldType: "nominal" },
          y: { field: "Acceleration", center: "mean", extent: "ci", level: 0.95 }
        })
        .createGuides({ grid: { horizontal: true, vertical: false } })
        .createTitle({ text: "Mean Acceleration by Origin (95% CI)" });
    }
  `;
  const result = await evaluateGeneratedProgram({
    source,
    task,
    datasets: { "cars-v1": cars },
    artifactRoot: new URL("../../.artifacts/llm-eval/error-bar-contract", import.meta.url).pathname
  });

  assert.equal(result.validations.every(validation => validation.passed), true);
});

test("validates binned facade inputs before their generated fields replace them", async () => {
  const corpus = JSON.parse(await readFile(new URL("../llm/tasks.json", import.meta.url), "utf8"));
  const task = corpus.tasks.find(candidate => candidate.id === "cars-binned-heatmap");
  const cars = JSON.parse(await readFile(new URL("../../data/cars.json", import.meta.url), "utf8"));
  const source = `
    import { chart, render } from "ggaction";
    export function buildChart(datasets) {
      const values = datasets["cars-v1"].filter(row => row.Weight_in_lbs != null && row.Miles_per_Gallon != null);
      return chart()
        .createCanvas({ width: 640, height: 400, margin: { top: 30, right: 130, bottom: 65, left: 85 } })
        .createData({ values })
        .createHeatmap({
          x: "Weight_in_lbs",
          y: "Miles_per_Gallon",
          bin: { bins: { x: 10, y: 8 } },
          color: { scale: { palette: "blues" } },
          guides: { axes: { x: {}, y: {} } }
        });
    }
  `;
  const result = await evaluateGeneratedProgram({
    source,
    task,
    datasets: { "cars-v1": cars },
    artifactRoot: new URL("../../.artifacts/llm-eval/heatmap-contract", import.meta.url).pathname
  });

  assert.equal(result.validations.every(validation => validation.passed), true);
});

test("validates transformed density semantics and direct radial action fields", async () => {
  const corpus = JSON.parse(await readFile(new URL("../llm/tasks.json", import.meta.url), "utf8"));
  const cars = JSON.parse(await readFile(new URL("../../data/cars.json", import.meta.url), "utf8"));
  const nightingale = JSON.parse(await readFile(new URL("../../data/nightingale_rose.json", import.meta.url), "utf8"));
  const densityTask = corpus.tasks.find(candidate => candidate.id === "cars-density-origin");
  const roseTask = corpus.tasks.find(candidate => candidate.id === "nightingale-rose");
  const densitySource = `
    import { chart, render } from "ggaction";
    export function buildChart(datasets) {
      const values = datasets["cars-v1"].filter(row => row.Acceleration != null && row.Origin != null);
      return chart().createCanvas({ width: 640, height: 400, margin: { top: 80, right: 100, bottom: 60, left: 70 } })
        .createData({ values }).createAreaMark({ id: "densities", opacity: 0.5 })
        .encodeDensity({ field: "Acceleration", groupBy: "Origin", bandwidth: 0.6 })
        .encodeColor({ field: "Origin" }).createGuides({ axes: { x: {}, y: {} }, legend: {} });
    }
  `;
  const roseSource = `
    import { chart, render } from "ggaction";
    export function buildChart(datasets) {
      const values = datasets["nightingale-v1"].filter(row => row.month != null && row.cause != null && row.value != null);
      return chart().createCanvas({ width: 640, height: 400, margin: { top: 40, right: 160, bottom: 50, left: 60 } })
        .createData({ values }).createArcMark({}).encodeTheta({ field: "month", fieldType: "ordinal" })
        .encodeR({ field: "value" }).encodeColor({ field: "cause" })
        .createGuides({ axes: { theta: {}, radius: {} }, grid: { radial: {} }, legend: {} });
    }
  `;
  const density = await evaluateGeneratedProgram({
    source: densitySource,
    task: densityTask,
    datasets: { "cars-v1": cars },
    artifactRoot: new URL("../../.artifacts/llm-eval/density-contract", import.meta.url).pathname
  });
  const rose = await evaluateGeneratedProgram({
    source: roseSource,
    task: roseTask,
    datasets: { "nightingale-v1": nightingale },
    artifactRoot: new URL("../../.artifacts/llm-eval/rose-contract", import.meta.url).pathname
  });

  assert.equal(density.validations.every(validation => validation.passed), true);
  assert.equal(rose.validations.every(validation => validation.passed), true);
});

test("runs one condition-A task through a mocked model and records executable evidence", async () => {
  const corpus = JSON.parse(await readFile(new URL("../llm/tasks.json", import.meta.url), "utf8"));
  const plan = JSON.parse(await readFile(new URL("../llm/evaluation-plan.json", import.meta.url), "utf8"));
  const task = corpus.tasks.find(candidate => candidate.id === "cars-scatter-origin");
  const source = `
    import { chart, render } from "ggaction";
    export function buildChart(datasets) {
      const values = datasets["cars-v1"].filter(row =>
        row.Horsepower != null && row.Miles_per_Gallon != null && row.Origin != null
      );
      return chart()
        .createCanvas({ width: 640, height: 400, margin: { top: 30, right: 130, bottom: 60, left: 70 } })
        .createData({ values })
        .createScatterPlot({
          x: "Horsepower",
          y: "Miles_per_Gallon",
          color: "Origin",
          guides: { axes: { x: {}, y: {} }, legend: {} }
        });
    }
  `;
  let calls = 0;
  const result = await runConditionATask({
    apiKey: `sk-${"x".repeat(40)}`,
    corpus,
    task,
    repetition: 1,
    plan,
    outputRoot: new URL("../../.artifacts/llm-eval/runner-contract", import.meta.url).pathname,
    fetchImpl: async () => {
      calls += 1;
      return {
        ok: true,
        async json() {
          return {
            id: "resp_test",
            model: plan.model.name,
            output: [{
              type: "function_call",
              name: "submit_program",
              call_id: "call_test",
              arguments: JSON.stringify({ source })
            }],
            usage: {
              input_tokens: 1000,
              input_tokens_details: { cached_tokens: 0, cache_write_tokens: 0 },
              output_tokens: 500,
              output_tokens_details: { reasoning_tokens: 200 },
              total_tokens: 1500
            }
          };
        }
      };
    }
  });

  assert.equal(calls, 1);
  assert.equal(result.outcome.firstPassValid, true);
  assert.equal(result.outcome.finalValid, true);
  assert.equal(result.outcome.failureCategory, null);
  assert.equal(result.metrics.modelCalls, 1);
  assert.equal(result.metrics.totalTokens, 1500);
  assert.equal(result.artifacts.rendererFiles.length, 1);
});

test("isolates A, B, and C knowledge tools behind one evaluation envelope", async () => {
  const conditionB = conditionBKnowledge("b".repeat(40));
  const conditionC = conditionCKnowledge("c".repeat(40));
  assert.deepEqual(conditionAKnowledge.tools.map(tool => tool.name), ["search_docs", "read_doc"]);
  assert.deepEqual(conditionB.tools.map(tool => tool.name), ["search_ggaction", "read_ggaction"]);
  assert.equal(conditionAKnowledge.mode, "current-docs");
  assert.equal(conditionB.mode, "structured-knowledge");
  assert.equal(conditionC.mode, "local-mcp");
  assert.deepEqual(conditionC.tools.map(tool => tool.name), ["search_ggaction", "read_ggaction"]);
  assert.deepEqual(
    Object.keys(conditionAKnowledge).filter(key => !["condition", "mode", "commit", "tools", "instruction", "routingLabel"].includes(key)),
    Object.keys(conditionB).filter(key => !["condition", "mode", "commit", "tools", "instruction", "routingLabel"].includes(key))
  );
  await assert.rejects(() => conditionB.handle({ name: "read_doc", arguments: "{}" }), /Unknown structured-knowledge tool/);
  await assert.rejects(() => conditionC.handle({ name: "read_doc", arguments: "{}" }), /Unknown local MCP knowledge tool/);
  await conditionC.close();
});

test("runs a mocked structured-knowledge search and one repair through Condition B", async () => {
  const corpus = JSON.parse(await readFile(new URL("../llm/tasks.json", import.meta.url), "utf8"));
  const plan = JSON.parse(await readFile(new URL("../llm/evaluation-plan.json", import.meta.url), "utf8"));
  const task = corpus.tasks.find(candidate => candidate.id === "cars-scatter-origin");
  const incompleteSource = `
    import { chart, render } from "ggaction";
    export function buildChart(datasets) {
      const values = datasets["cars-v1"].filter(row =>
        row.Horsepower != null && row.Miles_per_Gallon != null && row.Origin != null
      );
      return chart().createCanvas({ width: 640, height: 400 })
        .createData({ values }).createScatterPlot({ x: "Horsepower", y: "Miles_per_Gallon" });
    }
  `;
  const completeSource = `
    import { chart, render } from "ggaction";
    export function buildChart(datasets) {
      const values = datasets["cars-v1"].filter(row =>
        row.Horsepower != null && row.Miles_per_Gallon != null && row.Origin != null
      );
      return chart()
        .createCanvas({ width: 640, height: 400, margin: { top: 30, right: 130, bottom: 60, left: 70 } })
        .createData({ values })
        .createScatterPlot({
          x: "Horsepower", y: "Miles_per_Gallon", color: "Origin",
          guides: { axes: { x: {}, y: {} }, legend: {} }
        });
    }
  `;
  const outputs = [
    [{
      type: "function_call", name: "search_ggaction", call_id: "search_1",
      arguments: JSON.stringify({ query: "scatter plot quantitative relationship" })
    }, {
      type: "function_call", name: "read_ggaction", call_id: "read_1",
      arguments: JSON.stringify({ kind: "action", id: "createScatterPlot" })
    }],
    [{
      type: "function_call", name: "submit_program", call_id: "submit_1",
      arguments: JSON.stringify({ source: incompleteSource })
    }],
    [{
      type: "function_call", name: "submit_program", call_id: "submit_2",
      arguments: JSON.stringify({ source: completeSource })
    }]
  ];
  const requests = [];
  const result = await runConditionBTask({
    knowledgeCommit: "b".repeat(40),
    apiKey: `sk-${"x".repeat(40)}`,
    corpus,
    task,
    repetition: 1,
    plan,
    outputRoot: new URL("../../.artifacts/llm-eval/runner-b-contract", import.meta.url).pathname,
    fetchImpl: async (_url, init) => {
      requests.push(JSON.parse(init.body));
      const output = outputs.shift();
      return {
        ok: true,
        async json() {
          return {
            id: `resp_${requests.length}`,
            model: plan.model.name,
            output,
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
    }
  });

  assert.equal(requests.length, 3);
  assert.deepEqual(requests[0].tools.map(tool => tool.name), ["search_ggaction", "read_ggaction", "submit_program"]);
  assert.equal(result.condition, "B");
  assert.deepEqual(result.knowledge, { commit: "b".repeat(40), mode: "structured-knowledge" });
  assert.equal(result.outcome.firstPassValid, false);
  assert.equal(result.outcome.finalValid, true);
  assert.equal(result.metrics.modelCalls, 3);
  assert.equal(result.metrics.mcpCalls, 0);
  assert.equal(result.metrics.repairRounds, 1);
  assert.equal(result.artifacts.rendererFiles.length, 1);
});

test("runs mocked chart authoring through the real local MCP Condition C adapter", async () => {
  const corpus = JSON.parse(await readFile(new URL("../llm/tasks.json", import.meta.url), "utf8"));
  const plan = JSON.parse(await readFile(new URL("../llm/evaluation-plan.json", import.meta.url), "utf8"));
  const task = corpus.tasks.find(candidate => candidate.id === "cars-scatter-origin");
  const source = `
    import { chart, render } from "ggaction";
    export function buildChart(datasets) {
      const values = datasets["cars-v1"].filter(row =>
        row.Horsepower != null && row.Miles_per_Gallon != null && row.Origin != null
      );
      return chart()
        .createCanvas({ width: 640, height: 400, margin: { top: 30, right: 130, bottom: 60, left: 70 } })
        .createData({ values })
        .createScatterPlot({
          x: "Horsepower", y: "Miles_per_Gallon", color: "Origin",
          guides: { axes: { x: {}, y: {} }, legend: {} }
        });
    }
  `;
  const outputs = [
    [{
      type: "function_call",
      name: "search_ggaction",
      call_id: "mcp_search",
      arguments: JSON.stringify({ query: "scatter plot with categorical color" })
    }, {
      type: "function_call",
      name: "read_ggaction",
      call_id: "mcp_read",
      arguments: JSON.stringify({ kind: "action", id: "createScatterPlot" })
    }],
    [{
      type: "function_call",
      name: "submit_program",
      call_id: "mcp_submit",
      arguments: JSON.stringify({ source })
    }]
  ];
  const requests = [];
  const result = await runConditionCTask({
    knowledgeCommit: "c".repeat(40),
    apiKey: `sk-${"x".repeat(40)}`,
    corpus,
    task,
    repetition: 1,
    plan,
    outputRoot: new URL("../../.artifacts/llm-eval/runner-c-contract", import.meta.url).pathname,
    fetchImpl: async (_url, init) => {
      requests.push(JSON.parse(init.body));
      return {
        ok: true,
        async json() {
          return {
            id: `resp_c_${requests.length}`,
            model: plan.model.name,
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
    }
  });

  assert.equal(requests.length, 2);
  assert.deepEqual(requests[0].tools.map(tool => tool.name), ["search_ggaction", "read_ggaction", "submit_program"]);
  assert.equal(result.condition, "C");
  assert.deepEqual(result.knowledge, { commit: "c".repeat(40), mode: "local-mcp" });
  assert.equal(result.outcome.firstPassValid, true);
  assert.equal(result.outcome.finalValid, true);
  assert.equal(result.metrics.modelCalls, 2);
  assert.equal(result.metrics.mcpCalls, 3);
  assert.equal(result.metrics.repairRounds, 0);
  assert.equal(result.artifacts.rendererFiles.length, 1);
});
