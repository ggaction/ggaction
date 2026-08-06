import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { buildKnowledge } from "../../scripts/generate-action-knowledge.js";
import { buildKnowledgeSearchIndex } from "../../scripts/generate-knowledge-search.js";
import { loadKnowledgeSearchIndex, readKnowledge, searchKnowledge } from "../../scripts/knowledge-search.js";

async function json(relative) {
  return JSON.parse(await readFile(new URL(`../../${relative}`, import.meta.url), "utf8"));
}

test("generates one stable search record for every action, recipe, and LLM route", async () => {
  const [{ document }, generated, stored] = await Promise.all([
    buildKnowledge(),
    json("knowledge/search-index.json"),
    loadKnowledgeSearchIndex()
  ]);
  const rebuilt = await buildKnowledgeSearchIndex(document);
  assert.deepEqual(generated, rebuilt);
  assert.deepEqual(stored, rebuilt);
  assert.deepEqual(generated.generated, {
    actionCount: 173,
    recipeCount: 33,
    docsCount: 4,
    recordCount: 210,
    knowledgeSha256: generated.generated.knowledgeSha256,
    routeSourceSha256: generated.generated.routeSourceSha256
  });
  assert.match(generated.generated.knowledgeSha256, /^[a-f0-9]{64}$/);
  assert.match(generated.generated.routeSourceSha256, /^[a-f0-9]{64}$/);
  assert.equal(new Set(generated.records.map(record => `${record.kind}:${record.id}`)).size, 210);
});

test("ranks exact actions and recognizable tasks deterministically", async () => {
  const exact = await searchKnowledge({ query: "createScatterPlot" });
  assert.equal(exact[0].kind, "action");
  assert.equal(exact[0].id, "createScatterPlot");

  const first = await searchKnowledge({ query: "scatter plot relationship between horsepower and efficiency" });
  const second = await searchKnowledge({ query: "scatter plot relationship between horsepower and efficiency" });
  assert.deepEqual(second, first);
  assert.deepEqual(first.slice(0, 3).map(result => `${result.kind}:${result.id}`), [
    "recipe:scatterplot",
    "recipe:regression-scatterplot",
    "action:createScatterPlot"
  ]);

  const lifecycle = await searchKnowledge({ query: "remove a Cartesian x axis" });
  assert.equal(`${lifecycle[0].kind}:${lifecycle[0].id}`, "action:removeXAxis");
  for (const result of [...exact, ...first, ...lifecycle]) {
    assert.deepEqual(Object.keys(result), ["kind", "id", "title", "summary", "route", "score", "matchedTerms"]);
  }
});

test("retrieves meaningful structured knowledge for every evaluation task", async () => {
  const [tasks, cases] = await Promise.all([
    json("test/llm/tasks.json"),
    json("test/llm/search-cases.json")
  ]);
  assert.equal(cases.cases.length, 24);
  assert.deepEqual(cases.cases.map(entry => entry.taskId).toSorted(), tasks.tasks.map(entry => entry.id).toSorted());
  for (const entry of cases.cases) {
    const task = tasks.tasks.find(candidate => candidate.id === entry.taskId);
    const results = await searchKnowledge({ query: task.prompt, limit: 10 });
    const identities = new Set(results.map(result => `${result.kind}:${result.id}`));
    assert.equal(entry.expectedAny.some(identity => identities.has(identity)), true, entry.taskId);
    assert.equal(JSON.stringify(results).length < 6000, true, entry.taskId);
  }
});

test("bounds search and exact reads without exposing arbitrary files", async () => {
  assert.equal((await searchKnowledge({ query: "legend", limit: 1 })).length, 1);
  await assert.rejects(() => searchKnowledge(), /options must be an object/);
  await assert.rejects(() => searchKnowledge({ query: "" }), /non-empty string/);
  await assert.rejects(() => searchKnowledge({ query: "the and with" }), /searchable term/);
  await assert.rejects(() => searchKnowledge({ query: "x".repeat(501) }), /must not exceed 500/);
  await assert.rejects(() => searchKnowledge({ query: "legend", limit: 0 }), /between 1 and 10/);
  await assert.rejects(() => searchKnowledge({ query: "legend", limit: 11 }), /between 1 and 10/);

  const action = await readKnowledge({ kind: "action", id: "createScatterPlot" });
  const recipe = await readKnowledge({ kind: "recipe", id: "scatterplot" });
  const docs = await readKnowledge({ kind: "docs", id: "overview" });
  assert.equal(action.value.name, "createScatterPlot");
  assert.equal(recipe.value.id, "scatterplot");
  assert.match(docs.value.text, /# LLM Guide/);
  assert.equal(docs.value.truncated, false);
  await assert.rejects(() => readKnowledge({ kind: "action", id: "../../package" }), /ID is invalid/);
  await assert.rejects(() => readKnowledge({ kind: "action", id: "unknownAction" }), /Unknown action knowledge ID/);
});
