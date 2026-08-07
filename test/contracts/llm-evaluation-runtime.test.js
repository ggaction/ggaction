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
  captureProgramWorkflow,
  evaluateGeneratedProgram,
  runtimeFunctionsFromSource,
  validateGeneratedSource
} from "../../scripts/llm-eval/program-evaluator.js";
import { runConditionATask } from "../../scripts/llm-eval/condition-a-runner.js";
import { runConditionBTask } from "../../scripts/llm-eval/condition-b-runner.js";
import { runConditionCTask } from "../../scripts/llm-eval/condition-c-runner.js";
import {
  assertPaidEvaluationPlan,
  remainingPaidBudgetUsd
} from "../../scripts/llm-eval/run-paid-conditions.js";
import {
  conditionAKnowledge,
  conditionBKnowledge,
  conditionCKnowledge
} from "../../scripts/llm-eval/knowledge-adapters.js";
import { chart } from "../../src/index.js";

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

test("enforces separate and combined paid-condition spend caps", async () => {
  const plan = JSON.parse(await readFile(new URL("../llm/evaluation-plan.json", import.meta.url), "utf8"));

  assert.doesNotThrow(() => assertPaidEvaluationPlan(plan));
  assert.equal(remainingPaidBudgetUsd(plan, { conditionSpentUsd: 1.25, combinedSpentUsd: 4 }), 3.75);
  assert.equal(remainingPaidBudgetUsd(plan, { conditionSpentUsd: 4.75, combinedSpentUsd: 8 }), 0.25);
  assert.throws(
    () => assertPaidEvaluationPlan({ ...plan, paidConditionsApprovalStatus: "planned" }),
    /not approved/u
  );
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

test("rejects generated programs with capabilities outside the chart sandbox", async () => {
  assert.throws(() => validateGeneratedSource(`
    import { chart } from "ggaction";
    import { readFile } from "node:fs/promises";
    export function buildChart() { return chart(); }
  `), /not allowed/u);
  assert.deepEqual(runtimeFunctionsFromSource(`
    import { chart, render as draw } from "ggaction";
    import { renderToSVG } from "ggaction/svg";
  `), ["chart", "render", "renderToSVG"]);
  const captured = await captureProgramWorkflow(() => chart()
    .createCanvas()
    .createData({ values: [{ x: 1, y: 2 }] })
    .createScatterPlot({ x: "x", y: "y" }), [
    "createCanvas", "createData", "createPointMark", "createScatterPlot", "encodeX", "encodeY"
  ]);
  assert.deepEqual(captured.actions, ["createCanvas", "createData", "createScatterPlot"]);
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
  await conditionC.initialize();
  assert.deepEqual(conditionAKnowledge.tools.map(tool => tool.name), ["search_docs", "read_doc"]);
  assert.deepEqual(
    conditionB.tools.map(tool => tool.name),
    ["search_docs", "read_doc", "search_ggaction", "read_ggaction"]
  );
  assert.equal(conditionB.tools.find(tool => tool.name === "search_ggaction").strict, false);
  assert.equal(conditionAKnowledge.mode, "current-docs");
  assert.equal(conditionB.mode, "structured-knowledge");
  assert.equal(conditionC.mode, "local-mcp");
  for (const instruction of [conditionB.instruction, conditionC.instruction]) {
    assert.match(instruction, /Search (?:structured knowledge )?once/u);
    assert.match(instruction, /at most one dependency recipe in the same model response/u);
    assert.match(instruction, /without another (?:structured )?search or (?:resource )?read/u);
  }
  assert.deepEqual(conditionC.tools.map(tool => tool.name), ["search_ggaction", "read_mcp_resource"]);
  assert.equal(conditionC.tools.find(tool => tool.name === "search_ggaction").strict, false);
  for (const tool of [...conditionB.tools, ...conditionC.tools].filter(tool => tool.strict)) {
    assert.deepEqual(
      new Set(tool.parameters.required),
      new Set(Object.keys(tool.parameters.properties)),
      `${tool.name} strict schema must require every property`
    );
  }
  assert.equal(conditionC.tools[0].parameters.$schema, "http://json-schema.org/draft-07/schema#");
  assert.equal(conditionC.tools[0].parameters.additionalProperties, false);
  assert.deepEqual(conditionC.tools[0].parameters.required, ["query"]);
  assert.deepEqual(
    Object.keys(conditionC.tools[0].parameters.properties),
    ["query", "limit"]
  );
  assert.deepEqual(
    Object.keys(conditionAKnowledge).filter(key => !["condition", "mode", "commit", "tools", "instruction", "routingLabel"].includes(key)),
    Object.keys(conditionB).filter(key => !["condition", "mode", "commit", "tools", "instruction", "routingLabel"].includes(key))
  );
  const currentRouting = await conditionAKnowledge.routingText();
  const enhancedRouting = await conditionB.routingText();
  assert.equal(enhancedRouting.startsWith(currentRouting), true);
  assert.equal(enhancedRouting.includes("Structured knowledge overview"), true);
  assert.equal(
    JSON.parse(await conditionB.handle({ name: "read_doc", arguments: JSON.stringify({ route: "llms.txt" }) })).text,
    currentRouting
  );
  const mcpRouting = JSON.parse(await conditionC.routingText());
  assert.match(mcpRouting.instructions, /Search once/u);
  assert.deepEqual(mcpRouting.tools.map(tool => tool.name), ["search_ggaction"]);
  assert.deepEqual(mcpRouting.resourceTemplates.map(template => template.uriTemplate), [
    "ggaction://actions/{name}",
    "ggaction://recipes/{id}",
    "ggaction://docs/{section}"
  ]);
  assert.equal(mcpRouting.overview.schemaVersion, 2);
  await assert.rejects(() => conditionC.handle({ name: "read_doc", arguments: "{}" }), /Unknown local MCP knowledge tool/);
  await assert.rejects(
    () => conditionC.handle({
      name: "read_mcp_resource",
      arguments: JSON.stringify({ uri: "file:///etc/passwd" })
    }),
    /discovered ggaction resource template/u
  );
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
  const outputRoot = new URL("../../.artifacts/llm-eval/runner-b-contract", import.meta.url).pathname;
  const result = await runConditionBTask({
    knowledgeCommit: "b".repeat(40),
    apiKey: `sk-${"x".repeat(40)}`,
    corpus,
    task,
    repetition: 1,
    plan,
    outputRoot,
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
  assert.deepEqual(
    requests[0].tools.map(tool => tool.name),
    ["search_docs", "read_doc", "search_ggaction", "read_ggaction", "submit_program"]
  );
  assert.equal(result.condition, "B");
  assert.deepEqual(result.knowledge, { commit: "b".repeat(40), mode: "structured-knowledge" });
  assert.equal(result.outcome.firstPassValid, false);
  assert.equal(result.outcome.finalValid, true);
  assert.equal(result.metrics.modelCalls, 3);
  assert.equal(result.metrics.mcpCalls, 0);
  assert.equal(result.metrics.repairRounds, 1);
  assert.equal(result.artifacts.rendererFiles.length, 1);
  const traceText = await readFile(`${outputRoot}/${result.runId}/trace.json`, "utf8");
  const trace = JSON.parse(traceText);
  assert.equal(trace.schemaVersion, 1);
  assert.equal(trace.rounds.length, 3);
  assert.deepEqual(trace.rounds.map(round => round.remainingModelCallsAtStart), [3, 2, 1]);
  assert.deepEqual(trace.rounds[0].calls[0].arguments, {
    query: "scatter plot quantitative relationship"
  });
  assert.equal(trace.rounds[0].calls[0].result.identities[0], "recipe:scatterplot");
  assert.equal(trace.rounds[0].calls[1].result.identity, "action:createScatterPlot");
  assert.equal(trace.rounds[1].calls[0].submission.valid, false);
  assert.equal(trace.rounds[2].calls[0].submission.valid, true);
  assert.equal(traceText.includes("export function buildChart"), false);
  assert.equal(traceText.includes(`sk-${"x".repeat(40)}`), false);
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
      name: "read_mcp_resource",
      call_id: "mcp_read",
      arguments: JSON.stringify({ uri: "ggaction://actions/createScatterPlot" })
    }],
    [{
      type: "function_call",
      name: "submit_program",
      call_id: "mcp_submit",
      arguments: JSON.stringify({ source })
    }]
  ];
  const requests = [];
  const outputRoot = new URL("../../.artifacts/llm-eval/runner-c-contract", import.meta.url).pathname;
  const result = await runConditionCTask({
    knowledgeCommit: "c".repeat(40),
    apiKey: `sk-${"x".repeat(40)}`,
    corpus,
    task,
    repetition: 1,
    plan: {
      ...plan,
      sampling: { ...plan.sampling, maximumMcpCallsPerTask: 3 }
    },
    outputRoot,
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
  assert.deepEqual(requests[0].tools.map(tool => tool.name), ["search_ggaction", "read_mcp_resource", "submit_program"]);
  assert.equal(result.condition, "C");
  assert.deepEqual(result.knowledge, { commit: "c".repeat(40), mode: "local-mcp" });
  assert.equal(result.outcome.firstPassValid, true);
  assert.equal(result.outcome.finalValid, true);
  assert.equal(result.metrics.modelCalls, 2);
  assert.equal(result.metrics.mcpCalls, 3);
  assert.equal(result.metrics.repairRounds, 0);
  assert.equal(result.artifacts.rendererFiles.length, 1);
  const trace = JSON.parse(await readFile(`${outputRoot}/${result.runId}/trace.json`, "utf8"));
  assert.deepEqual(trace.rounds[0].calls.map(call => call.name), ["search_ggaction", "read_mcp_resource"]);
  assert.deepEqual(trace.rounds[0].calls[1].arguments, {
    uri: "ggaction://actions/createScatterPlot"
  });
  assert.equal(trace.rounds[0].calls[1].result.identity, "action:createScatterPlot");
});

test("runs the corrected one-read box recipe flow through mocked Conditions B and C", async () => {
  const corpus = JSON.parse(await readFile(new URL("../llm/tasks.json", import.meta.url), "utf8"));
  const plan = JSON.parse(await readFile(new URL("../llm/evaluation-plan.json", import.meta.url), "utf8"));
  const task = corpus.tasks.find(candidate => candidate.id === "cars-box-plot");
  const source = `
    import { chart, render } from "ggaction";
    export function buildChart(datasets) {
      const values = datasets["cars-v1"].filter(row =>
        row.Origin != null && row.Miles_per_Gallon != null
      );
      return chart()
        .createCanvas({ width: 640, height: 400, margin: { top: 35, right: 40, bottom: 65, left: 75 } })
        .createData({ values })
        .createBoxPlot({
          x: { field: "Origin", fieldType: "nominal" },
          y: { field: "Miles_per_Gallon" },
          guides: { axes: { x: {}, y: {} }, legend: false }
        })
        .encodeColor({ target: "boxPlot", field: "Origin", fieldType: "nominal" });
    }
  `;

  for (const condition of ["B", "C"]) {
    const readName = condition === "B" ? "read_ggaction" : "read_mcp_resource";
    const readArguments = condition === "B"
      ? { kind: "recipe", id: "box-plot" }
      : { uri: "ggaction://recipes/box-plot" };
    const outputs = [[
      {
        type: "function_call",
        name: "search_ggaction",
        call_id: `${condition}_box_search`,
        arguments: JSON.stringify({ query: task.prompt })
      },
      {
        type: "function_call",
        name: readName,
        call_id: `${condition}_box_read`,
        arguments: JSON.stringify(readArguments)
      }
    ], [{
      type: "function_call",
      name: "submit_program",
      call_id: `${condition}_box_submit`,
      arguments: JSON.stringify({ source })
    }]];
    const requests = [];
    const outputRoot = new URL(`../../.artifacts/llm-eval/runner-${condition.toLowerCase()}-box-contract`, import.meta.url).pathname;
    const options = {
      knowledgeCommit: condition.toLowerCase().repeat(40),
      apiKey: `sk-${"x".repeat(40)}`,
      corpus,
      task,
      repetition: 1,
      plan,
      outputRoot,
      fetchImpl: async (_url, init) => {
        requests.push(JSON.parse(init.body));
        return {
          ok: true,
          async json() {
            return {
              id: `resp_${condition}_box_${requests.length}`,
              model: plan.model.name,
              output: outputs.shift(),
              usage: { input_tokens: 1000, output_tokens: 300, total_tokens: 1300 }
            };
          }
        };
      }
    };
    const result = condition === "B"
      ? await runConditionBTask(options)
      : await runConditionCTask(options);
    const trace = JSON.parse(await readFile(`${outputRoot}/${result.runId}/trace.json`, "utf8"));

    assert.equal(result.outcome.firstPassValid, true, condition);
    assert.equal(result.outcome.finalValid, true, condition);
    assert.equal(result.metrics.modelCalls, 2, condition);
    assert.deepEqual(trace.rounds[0].calls.map(call => call.name), ["search_ggaction", readName], condition);
    assert.equal(trace.rounds[0].calls[1].result.identity, "recipe:box-plot", condition);
  }
});

test("runs the bounded two-read composition flow through mocked Conditions B and C", async () => {
  const corpus = JSON.parse(await readFile(new URL("../llm/tasks.json", import.meta.url), "utf8"));
  const plan = JSON.parse(await readFile(new URL("../llm/evaluation-plan.json", import.meta.url), "utf8"));
  const task = corpus.tasks.find(candidate => candidate.id === "composed-dashboard");
  const source = `
    import { chart, hconcat, render } from "ggaction";
    export function buildChart(datasets) {
      const cars = datasets["cars-v1"].filter(row =>
        row.Horsepower != null && row.Miles_per_Gallon != null && row.Origin != null
      );
      const nightingale = datasets["nightingale-v1"].filter(row =>
        row.month != null && row.cause != null && row.value != null
      );
      const scatter = chart()
        .createCanvas({ width: 300, height: 300, margin: { top: 30, right: 30, bottom: 60, left: 65 } })
        .createData({ values: cars })
        .createScatterPlot({ x: "Horsepower", y: "Miles_per_Gallon", color: "Origin" });
      const rose = chart()
        .createCanvas({ width: 300, height: 300, margin: { top: 35, right: 35, bottom: 35, left: 35 } })
        .createData({ values: nightingale })
        .createArcMark({ padAngle: 1 })
        .encodeTheta({ field: "month", fieldType: "ordinal" })
        .encodeR({ field: "value" })
        .encodeColor({ field: "cause", layout: "overlay" });
      const summary = chart()
        .createCanvas({ width: 300, height: 300, margin: { top: 30, right: 30, bottom: 80, left: 65 } })
        .createData({ values: nightingale })
        .createBarPlot({
          x: { field: "cause", fieldType: "nominal" },
          y: { field: "value", aggregate: "sum" },
          color: "cause",
          guides: { axes: { x: {}, y: {} }, legend: false }
        });
      return hconcat({
        id: "dashboard",
        programs: [{ id: "scatter", program: scatter }, { id: "detail", program: rose }]
      })
        .editCompositionLayout({ gap: 24, align: "start" })
        .replaceCompositionChild({ target: "detail", program: summary });
    }
  `;

  for (const condition of ["B", "C"]) {
    const readName = condition === "B" ? "read_ggaction" : "read_mcp_resource";
    const readArguments = id => condition === "B"
      ? { kind: "recipe", id }
      : { uri: `ggaction://recipes/${id}` };
    const outputs = [[
      {
        type: "function_call",
        name: "search_ggaction",
        call_id: `${condition}_composition_search`,
        arguments: JSON.stringify({ query: task.prompt })
      },
      {
        type: "function_call",
        name: readName,
        call_id: `${condition}_composition_read`,
        arguments: JSON.stringify(readArguments("composition"))
      },
      {
        type: "function_call",
        name: readName,
        call_id: `${condition}_rose_read`,
        arguments: JSON.stringify(readArguments("rose-chart"))
      }
    ], [{
      type: "function_call",
      name: "submit_program",
      call_id: `${condition}_composition_submit`,
      arguments: JSON.stringify({ source })
    }]];
    const requests = [];
    const outputRoot = new URL(`../../.artifacts/llm-eval/runner-${condition.toLowerCase()}-composition-contract`, import.meta.url).pathname;
    const options = {
      knowledgeCommit: condition.toLowerCase().repeat(40),
      apiKey: `sk-${"x".repeat(40)}`,
      corpus,
      task,
      repetition: 1,
      plan,
      outputRoot,
      fetchImpl: async (_url, init) => {
        requests.push(JSON.parse(init.body));
        return {
          ok: true,
          async json() {
            return {
              id: `resp_${condition}_composition_${requests.length}`,
              model: plan.model.name,
              output: outputs.shift(),
              usage: { input_tokens: 1000, output_tokens: 300, total_tokens: 1300 }
            };
          }
        };
      }
    };
    const result = condition === "B"
      ? await runConditionBTask(options)
      : await runConditionCTask(options);
    const trace = JSON.parse(await readFile(`${outputRoot}/${result.runId}/trace.json`, "utf8"));

    assert.equal(result.outcome.firstPassValid, true, condition);
    assert.equal(result.outcome.finalValid, true, condition);
    assert.equal(result.metrics.modelCalls, 2, condition);
    assert.deepEqual(
      trace.rounds[0].calls.map(call => call.name),
      ["search_ggaction", readName, readName],
      condition
    );
    assert.deepEqual(
      trace.rounds[0].calls.slice(1).map(call => call.result.identity),
      ["recipe:composition", "recipe:rose-chart"],
      condition
    );
  }
});
