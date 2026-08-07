import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { readFile, readdir } from "node:fs/promises";
import test from "node:test";

import { buildKnowledge } from "../../scripts/generate-action-knowledge.js";
import { evaluateGeneratedProgram } from "../../scripts/llm-eval/program-evaluator.js";
import {
  executableExampleSourceViolations,
  recipeCoverageFile,
  recipeSourceRoot
} from "../../scripts/recipe-knowledge.js";
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
  assert.equal(
    document.recipes.every(recipe => executableExampleSourceViolations(recipe.exampleSource).length === 0),
    true
  );
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

test("audits complete recipe runtime wrappers without accepting invented APIs", () => {
  const complete = `import { chart, render } from "ggaction";

const program = chart().createCanvas();
const context = document.querySelector("#chart")?.getContext("2d");
if (!context) throw new Error("Missing #chart Canvas context.");
render(program, context);`;
  assert.deepEqual(executableExampleSourceViolations(complete), []);

  const incomplete = `import { chart, renderCanvas } from "ggaction";
const result = new Chart().createSelection();
renderToCanvas(result);`;
  assert.deepEqual(executableExampleSourceViolations(incomplete), [
    "missing render import from ggaction",
    "missing final program binding",
    "missing Canvas 2D context lookup",
    "missing Canvas context guard",
    "missing final Canvas render invocation",
    "forbidden runtime identifier Chart",
    "forbidden runtime identifier createSelection",
    "forbidden runtime identifier renderCanvas",
    "forbidden runtime identifier renderToCanvas"
  ]);
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

test("keeps the scatterplot recipe executable for the frozen Canvas task", async () => {
  const [{ document }, corpus] = await Promise.all([
    buildKnowledge(),
    json("test/llm/tasks.json")
  ]);
  const recipe = document.recipes.find(entry => entry.id === "scatterplot");
  const lineRecipe = document.recipes.find(entry => entry.id === "line-chart");
  const task = corpus.tasks.find(entry => entry.id === "cars-scatter-origin");
  const expression = recipe.exampleSource.match(/const program = ([\s\S]+?);\n\nconst context/u)?.[1]
    .replace('x: "x"', 'x: "Horsepower"')
    .replace('y: "y"', 'y: "Miles_per_Gallon"')
    .replace('color: "group"', 'color: "Origin"')
    .replace('text: "X"', 'text: "Horsepower"')
    .replace('text: "Y"', 'text: "Miles per Gallon"');

  assert.match(recipe.exampleSource, /^import \{ chart, render \} from "ggaction";/u);
  assert.match(recipe.exampleSource, /color: "group"/u);
  assert.match(recipe.exampleSource, /guides: \{[\s\S]*axes: \{/u);
  assert.match(recipe.exampleSource, /render\(program, context\);/u);
  const rendererGuidance = recipe.pitfalls.map(pitfall => pitfall.fix).join("\n");
  assert.match(rendererGuidance, /Import \{ render \} from "ggaction"/u);
  assert.match(rendererGuidance, /Import \{ renderToSVG \} from "ggaction\/svg"/u);
  assert.match(rendererGuidance, /Import \{ renderToPNG \} from "ggaction\/png"/u);
  assert.match(rendererGuidance, /Import \{ renderToPDF \} from "ggaction\/pdf"/u);
  assert.doesNotMatch(rendererGuidance, /renderCanvas|renderToCanvas|renderPDF\(/u);
  assert.equal(expression?.includes('x: "Horsepower"'), true);
  assert.equal(
    recipe.steps.flatMap(step => step.actions).some(action => action.name === "encodeColor"),
    true
  );
  assert.equal(
    recipe.steps.flatMap(step => step.actions).some(action => action.name === "encodeGroup"),
    false
  );
  assert.equal(
    lineRecipe.steps.flatMap(step => step.actions).some(action => action.name === "encodeGroup"),
    true
  );

  const source = `import { chart, render } from "ggaction";

export function buildChart(datasets) {
  const values = datasets["cars-v1"].filter(row =>
    row.Horsepower !== null && row.Miles_per_Gallon !== null && row.Origin !== null
  );
  return ${expression};
}

export { render };`;
  const datasets = {
    "cars-v1": await json(corpus.datasets["cars-v1"].path)
  };
  const evaluated = await evaluateGeneratedProgram({
    source,
    task,
    datasets,
    artifactRoot: new URL("../../.artifacts/llm-eval/executable-recipe-contract", import.meta.url).pathname
  });

  assert.deepEqual(evaluated.runtimeFunctions, ["chart", "render"]);
  assert.equal(evaluated.validations.every(validation => validation.passed), true);
  assert.deepEqual(evaluated.renderers, ["canvas"]);
});
