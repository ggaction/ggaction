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
