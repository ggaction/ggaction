import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { readFile, readdir } from "node:fs/promises";
import test from "node:test";

import { buildKnowledge } from "../../scripts/generate-action-knowledge.js";
import { recipeCoverageFile, recipeSourceRoot } from "../../scripts/recipe-knowledge.js";
import { focusedRecipeActions, recipeExamples } from "../llm/recipe-knowledge-examples.js";

async function json(relative) {
  return JSON.parse(await readFile(new URL(`../../${relative}`, import.meta.url), "utf8"));
}

function traceIncludes(node, action) {
  return node?.op === action || (node?.children ?? []).some(child => traceIncludes(child, action));
}

function programIncludes(program, action) {
  return traceIncludes(program?.trace, action) || Object.values(program?.children ?? {}).some(child =>
    programIncludes(child, action)
  );
}

test("publishes deterministic recipe knowledge with exact action backlinks", async () => {
  const [{ document, recipeDocument }, published, coverageSource] = await Promise.all([
    buildKnowledge(),
    json("docs/llms-recipes.json"),
    json("knowledge/recipe-coverage.json")
  ]);

  assert.deepEqual(published, recipeDocument);
  assert.equal(document.schemaVersion, 2);
  assert.equal(recipeDocument.schemaVersion, 2);
  assert.deepEqual(document.recipes, recipeDocument.recipes);
  assert.deepEqual(document.coverage, recipeDocument.coverage);
  assert.deepEqual(document.coverage, coverageSource.actions);
  assert.equal(document.recipes.length, 33);
  assert.equal(document.coverage.length, 173);
  assert.equal(new Set(document.coverage.map(row => row.name)).size, 173);
  assert.equal(document.coverage.every(row => row.recipeIds.length > 0), true);

  for (const recipe of document.recipes) {
    const primary = recipe.steps.flatMap(step => step.actions)
      .filter(action => action.role === "primary")
      .map(action => action.name);
    assert.match(recipe.exampleSource, /from\s+["']ggaction(?:\/[A-Za-z0-9_-]+)?["']/u, recipe.id);
    assert.equal(primary.some(name => recipe.exampleSource.includes(`.${name}(`)), true, recipe.id);
    assert.equal(recipe.docs.some(entry => entry.path === recipe.exampleSourcePath), true, recipe.id);
    assert.equal(recipe.exampleSource.length <= 30_000, true, recipe.id);
    const checked = spawnSync(process.execPath, ["--input-type=module", "--check", "-"], {
      input: recipe.exampleSource,
      encoding: "utf8"
    });
    assert.equal(checked.status, 0, `${recipe.id}: ${checked.stderr}`);
  }

  const actionBacklinks = new Map(document.actions.map(action => [action.name, action.recipeIds]));
  for (const row of document.coverage) assert.deepEqual(row.recipeIds, actionBacklinks.get(row.name), row.name);
});

test("keeps recipe sources schema-shaped and task-centered", async () => {
  const files = (await readdir(recipeSourceRoot)).filter(file => file.endsWith(".json")).sort();
  assert.equal(files.length, 33);
  const recipes = await Promise.all(files.map(async file =>
    JSON.parse(await readFile(new URL(`../../knowledge/recipes/${file}`, import.meta.url), "utf8"))
  ));
  const schema = await json("test/llm/recipe-knowledge.schema.json");
  const coverageSchema = await json("test/llm/recipe-coverage.schema.json");
  assert.equal(schema.properties.id.$ref, "#/$defs/recipeId");
  assert.deepEqual(coverageSchema.$defs.actionCoverage.properties.classification.enum, [
    "primary", "supporting", "lifecycle", "extension-only", "metadata-only", "not-applicable"
  ]);
  for (const recipe of recipes) {
    assert.equal(recipe.intent.length >= 20, true, recipe.id);
    assert.equal(recipe.useWhen.length > 0, true, recipe.id);
    assert.equal(recipe.avoidWhen.length > 0, true, recipe.id);
    assert.equal(recipe.steps.length > 0, true, recipe.id);
    assert.equal(recipe.docs.length > 0, true, recipe.id);
  }
  assert.equal(recipeCoverageFile.endsWith("knowledge/recipe-coverage.json"), true);
});

test("executes every focused recipe workflow and records every assigned action", () => {
  assert.equal(Object.keys(recipeExamples).length, 11);
  assert.deepEqual(Object.keys(recipeExamples).toSorted(), Object.keys(focusedRecipeActions).toSorted());
  for (const [id, createProgram] of Object.entries(recipeExamples)) {
    const program = createProgram();
    assert.ok(program.semanticSpec, id);
    assert.ok(program.graphicSpec, id);
    for (const action of focusedRecipeActions[id]) {
      assert.equal(programIncludes(program, action), true, `${id}: ${action}`);
    }
  }
});

test("routes LLM readers to the public structured recipe document", async () => {
  const router = await readFile(new URL("../../docs/llms/recipes.md", import.meta.url), "utf8");
  assert.match(router, /\[complete machine-readable recipe metadata\]\(\.\.\/llms-recipes\.json\)/);
});
