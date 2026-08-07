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
  assert.equal(generated.schemaVersion, 2);
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
  assert.equal(generated.records.filter(record => record.kind === "recipe").every(record => record.priority === 100), true);
  assert.equal(generated.records.filter(record => record.kind === "action").every(record => record.priority === 0), true);
  assert.equal(generated.records.filter(record => record.kind === "docs").every(record => record.priority === -50), true);
});

test("ranks exact actions and recognizable tasks deterministically", async () => {
  const exact = await searchKnowledge({ query: "createScatterPlot" });
  assert.equal(exact.schemaVersion, 2);
  assert.equal(exact.results[0].kind, "action");
  assert.equal(exact.results[0].id, "createScatterPlot");
  assert.match(exact.nextStep, /best matching primary action or recipe/u);
  assert.match(exact.nextStep, /at most one dependency recipe in the same model response/u);

  const first = await searchKnowledge({ query: "scatter plot relationship between horsepower and efficiency" });
  const second = await searchKnowledge({ query: "scatter plot relationship between horsepower and efficiency" });
  assert.deepEqual(second, first);
  assert.deepEqual(first.results.slice(0, 2).map(result => `${result.kind}:${result.id}`), [
    "recipe:scatterplot",
    "recipe:regression-scatterplot"
  ]);
  assert.equal(first.results.some(result => `${result.kind}:${result.id}` === "action:createScatterPlot"), true);

  const lifecycle = await searchKnowledge({ query: "remove a Cartesian x axis" });
  assert.equal(`${lifecycle.results[0].kind}:${lifecycle.results[0].id}`, "recipe:cartesian-guide-lifecycle");
  for (const result of [...exact.results, ...first.results, ...lifecycle.results]) {
    assert.deepEqual(Object.keys(result), ["kind", "id", "title", "summary", "route", "score", "matchedTerms"]);
  }
});

test("keeps every evaluation task in the production default top three", async () => {
  const [tasks, cases, paraphrases] = await Promise.all([
    json("test/llm/tasks.json"),
    json("test/llm/search-cases.json"),
    json("test/llm/search-paraphrases.json")
  ]);
  assert.equal(cases.cases.length, 24);
  assert.equal(paraphrases.cases.length, 24);
  assert.deepEqual(cases.cases.map(entry => entry.taskId).toSorted(), tasks.tasks.map(entry => entry.id).toSorted());
  for (const entry of cases.cases) {
    const task = tasks.tasks.find(candidate => candidate.id === entry.taskId);
    const response = await searchKnowledge({ query: task.prompt });
    const results = response.results;
    const identities = new Set(results.map(result => `${result.kind}:${result.id}`));
    const primaryRecipes = entry.expectedAny.filter(identity => identity.startsWith("recipe:"));
    assert.equal(primaryRecipes.length, 1, `${entry.taskId}: one primary recipe route`);
    assert.equal(`${results[0].kind}:${results[0].id}`, primaryRecipes[0], `${entry.taskId}: recipe-first`);
    assert.equal(entry.expectedAny.some(identity => identities.has(identity)), true, entry.taskId);
    assert.equal(results.findIndex(result => entry.expectedAny.includes(`${result.kind}:${result.id}`)) < 3, true, entry.taskId);
    assert.equal(results.length <= 6, true, entry.taskId);
    assert.equal(JSON.stringify(response).length < 6000, true, entry.taskId);
  }
  for (const entry of paraphrases.cases) {
    const results = (await searchKnowledge({ query: entry.query })).results;
    const primaryRecipes = entry.expectedAny.filter(identity => identity.startsWith("recipe:"));
    assert.equal(primaryRecipes.length, 1, `${entry.id}: one primary recipe route`);
    assert.equal(`${results[0].kind}:${results[0].id}`, primaryRecipes[0], `${entry.id}: recipe-first`);
    assert.equal(results.findIndex(result => entry.expectedAny.includes(`${result.kind}:${result.id}`)) < 3, true, entry.id);
  }
});

test("ranks every exact action and recipe identity first", async () => {
  const index = await loadKnowledgeSearchIndex();
  const records = index.records.filter(record => record.kind !== "docs");
  const counts = new Map(records.map(record => [
    record.id,
    records.filter(candidate => candidate.id === record.id).length
  ]));
  for (const record of records) {
    const query = counts.get(record.id) === 1 ? record.id : `${record.kind}:${record.id}`;
    const response = await searchKnowledge({ query, limit: 1 });
    assert.equal(`${response.results[0].kind}:${response.results[0].id}`, `${record.kind}:${record.id}`);
  }
});

test("bounds search and exact reads without exposing arbitrary files", async () => {
  assert.equal((await searchKnowledge({ query: "legend", limit: 1 })).results.length, 1);
  await assert.rejects(() => searchKnowledge(), /options must be an object/);
  await assert.rejects(() => searchKnowledge({ query: "" }), /non-empty string/);
  await assert.rejects(() => searchKnowledge({ query: "the and with" }), /searchable term/);
  await assert.rejects(() => searchKnowledge({ query: "x".repeat(501) }), /must not exceed 500/);
  await assert.rejects(() => searchKnowledge({ query: "legend", limit: 0 }), /between 1 and 10/);
  await assert.rejects(() => searchKnowledge({ query: "legend", limit: 11 }), /between 1 and 10/);

  const action = await readKnowledge({ kind: "action", id: "createScatterPlot" });
  const recipe = await readKnowledge({ kind: "recipe", id: "scatterplot" });
  const docs = await readKnowledge({ kind: "docs", id: "overview" });
  assert.equal(action.schemaVersion, 2);
  assert.equal(action.value.name, "createScatterPlot");
  assert.match(action.nextStep, /at most one dependency recipe in this same model response/u);
  assert.match(action.nextStep, /call submit_program without another search/u);
  assert.equal(action.value.typeDefinitions.length > 0, true);
  assert.equal(recipe.value.id, "scatterplot");
  assert.match(recipe.value.exampleSource, /from "ggaction"/);
  assert.match(docs.value.text, /# LLM Guide/);
  assert.equal(docs.value.truncated, false);
  await assert.rejects(() => readKnowledge({ kind: "action", id: "../../package" }), /ID is invalid/);
  await assert.rejects(() => readKnowledge({ kind: "action", id: "unknownAction" }), /Unknown action knowledge ID/);
});
