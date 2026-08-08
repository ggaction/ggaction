import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { readFile, readdir } from "node:fs/promises";
import test from "node:test";

import { buildKnowledge } from "../../scripts/generate-action-knowledge.js";
import { evaluateGeneratedProgram } from "../../scripts/llm-eval/program-evaluator.js";
import { searchKnowledge } from "../../scripts/knowledge-search.js";
import { chart } from "../../src/index.js";
import {
  executableExampleSourceViolations,
  recipeCoverageFile,
  recipeSourceRoot,
  reusableBuilderSourceViolations
} from "../../scripts/recipe-knowledge.js";
import { verifyExecutableRecipes } from "../../scripts/verify-executable-recipes.js";
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
    assert.equal(primary.some(name => recipe.builderSource.includes(`.${name}(`)), true, recipe.id);
    assert.equal(recipe.docs.some(entry => entry.path === recipe.exampleSourcePath), true, recipe.id);
    assert.equal(recipe.exampleSource.length <= 30_000, true, recipe.id);
    assert.equal(recipe.builderSource.length <= 30_000, true, recipe.id);
    assert.deepEqual(reusableBuilderSourceViolations(recipe.builderSource), [], recipe.id);
    for (const source of [recipe.exampleSource, recipe.builderSource]) {
      const checked = spawnSync(process.execPath, ["--input-type=module", "--check", "-"], {
        input: source,
        encoding: "utf8"
      });
      assert.equal(checked.status, 0, `${recipe.id}: ${checked.stderr}`);
    }
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

test("delivers the supported box color and composition replacement variants", async () => {
  const { document } = await buildKnowledge();
  const box = document.recipes.find(recipe => recipe.id === "box-plot");
  const composition = document.recipes.find(recipe => recipe.id === "composition");
  const rose = document.recipes.find(recipe => recipe.id === "rose-chart");

  assert.match(box.exampleSource, /\.createBoxPlot\(\{[\s\S]*?guides:\s*\{ legend: false \}[\s\S]*?\}\)\s*\.encodeColor\(\{/u);
  assert.match(box.exampleSource, /target:\s*["']boxPlot["']/u);
  assert.equal(
    box.steps.flatMap(step => step.actions).some(action => action.name === "encodeColor"),
    true
  );
  assert.match(box.pitfalls.map(pitfall => pitfall.problem).join("\n"), /does not accept a color option/u);

  assert.match(composition.exampleSource, /\.editCompositionLayout\(\{ gap: 24, align: "center" \}\)/u);
  assert.match(composition.exampleSource, /\.replaceCompositionChild\(\{ target: "detail", program: replacement \}\)/u);
  assert.deepEqual(composition.relatedRecipes, ["rose-chart"]);
  const inventedFacadeWarning = [...composition.pitfalls, ...rose.pitfalls]
    .map(pitfall => `${pitfall.problem}\n${pitfall.fix}`)
    .join("\n");
  assert.match(inventedFacadeWarning, /no createRoseChart/u);
  assert.match(inventedFacadeWarning, /createArcMark[\s\S]*encodeTheta[\s\S]*encodeR[\s\S]*encodeColor/u);
});

test("publishes submit-ready Canvas and layout-safe composition guidance", async () => {
  const { document } = await buildKnowledge();
  const box = document.recipes.find(recipe => recipe.id === "box-plot");
  const composition = document.recipes.find(recipe => recipe.id === "composition");
  const values = [
    { month: "April", cause: "Zymotic Diseases", value: 5 },
    { month: "May", cause: "Other Causes", value: 3 },
    { month: "June", cause: "Wounds & Injuries", value: 2 }
  ];

  assert.match(
    box.exampleSource,
    /\.createCanvas\(\{[\s\S]*width:\s*640,[\s\S]*height:\s*400,[\s\S]*margin:\s*\{ top: 30, right: 30, bottom: 60, left: 70 \}[\s\S]*\}\)/u
  );
  assert.doesNotMatch(box.exampleSource, /\.createCanvas\(\)/u);
  assert.match(
    box.pitfalls.map(pitfall => pitfall.fix).join("\n"),
    /explicit Canvas width, height, and margins/u
  );
  assert.throws(
    () => chart()
      .createCanvas({
        width: 308,
        height: 400,
        margin: { top: 48, right: 24, bottom: 70, left: 58 }
      })
      .createData({ values })
      .createBarPlot({
        x: { field: "month", fieldType: "ordinal" },
        y: { field: "value" },
        color: { field: "cause", fieldType: "nominal" }
      }),
    /Legend layout requires more right-margin space/u
  );

  assert.doesNotThrow(() => chart()
    .createCanvas({
      width: 308,
      height: 400,
      margin: { top: 48, right: 120, bottom: 70, left: 58 }
    })
    .createData({ values })
    .createBarPlot({
      x: { field: "month", fieldType: "ordinal" },
      y: { field: "value" },
      color: { field: "cause", fieldType: "nominal" }
    }));
  assert.doesNotThrow(() => chart()
    .createCanvas({
      width: 308,
      height: 400,
      margin: { top: 48, right: 24, bottom: 70, left: 58 }
    })
    .createData({ values })
    .createBarPlot({
      x: { field: "month", fieldType: "ordinal" },
      y: { field: "value" },
      color: { field: "cause", fieldType: "nominal" },
      guides: { axes: { x: {}, y: {} }, legend: false }
    }));
  assert.match(
    composition.exampleSource,
    /margin:\s*\{ top: 24, right: 120, bottom: 48, left: 54 \}[\s\S]*color:\s*\{ field: "group", fieldType: "nominal" \}/u
  );
  assert.match(composition.exampleSource, /guides:\s*\{ axes: \{ x: \{\}, y: \{\} \}, legend: false \}/u);
  const compositionGuidance = composition.pitfalls.map(pitfall => `${pitfall.problem}\n${pitfall.fix}`).join("\n");
  assert.match(compositionGuidance, /parent composition cannot repair an automatic legend/u);
  assert.match(compositionGuidance, /Build every child independently/u);
  assert.match(compositionGuidance, /do not provide concat, compose, or composeCharts methods/u);
  assert.match(compositionGuidance, /Import hconcat or vconcat from ggaction/u);

  const legend = document.recipes.find(recipe => recipe.id === "legend-title-lifecycle");
  const legendGuidance = legend.pitfalls.map(pitfall => `${pitfall.problem}\n${pitfall.fix}`).join("\n");
  assert.match(legendGuidance, /bottom Canvas margin alone does not move a bottom legend/u);
  assert.match(legendGuidance, /same position, titlePosition, offset, and itemGap/u);
  assert.match(legendGuidance, /52 pixels with a 120-pixel bottom margin/u);

  const bottomRow = chart()
    .createCanvas({
      width: 640,
      height: 400,
      margin: { top: 30, right: 30, bottom: 120, left: 70 }
    })
    .createData({ values: [
      { weight: 2200, mileage: 34, origin: "USA", power: 75 },
      { weight: 2600, mileage: 29, origin: "Japan", power: 95 },
      { weight: 3100, mileage: 24, origin: "Europe", power: 130 }
    ] })
    .createPointMark({ id: "points" })
    .encodeX({ target: "points", field: "weight" })
    .encodeY({ target: "points", field: "mileage" })
    .encodeColor({ target: "points", field: "origin", fieldType: "nominal" })
    .encodeOpacity({ target: "points", field: "power" })
    .createGuides({ axes: { x: {}, y: {} }, legend: false })
    .createLegend({
      target: "points", channels: ["color"], position: "bottom",
      titlePosition: "left", offset: 52, itemGap: 12
    })
    .createLegend({
      target: "points", channels: ["opacity"], position: "bottom",
      titlePosition: "left", offset: 52, itemGap: 12
    });
  assert.equal(bottomRow.guideConfigs.legend.color.offset, 52);
  assert.equal(bottomRow.guideConfigs.legend.opacity.offset, 52);
  assert.equal(bottomRow.graphicSpec.objects.colorLegendSymbols.items.length, 3);
  assert.equal(bottomRow.graphicSpec.objects.opacityLegendSymbols.items.length, 5);
});

test("closes every frozen task from the exact delivered recipe payload", async () => {
  const [corpus, matrix, paraphrases, { document }, manifest] = await Promise.all([
    json("test/llm/tasks.json"),
    json("test/llm/recipe-delivery-matrix.json"),
    json("test/llm/search-paraphrases.json"),
    buildKnowledge(),
    verifyExecutableRecipes({
      artifactRoot: new URL("../../.artifacts/test/recipe-delivery-closure", import.meta.url).pathname
    })
  ]);
  assert.equal(matrix.schemaVersion, 1);
  assert.equal(matrix.rows.length, 24);
  assert.deepEqual(matrix.rows.map(row => row.taskId).toSorted(), corpus.tasks.map(task => task.id).toSorted());
  const recipes = new Map(document.recipes.map(recipe => [recipe.id, recipe]));
  const executions = new Map(manifest.results.map(result => [result.id, result]));

  assert.equal(paraphrases.cases.length, matrix.rows.length);
  const failures = [];
  for (const [index, row] of matrix.rows.entries()) {
    const task = corpus.tasks.find(candidate => candidate.id === row.taskId);
    assert.equal(row.dependencyRecipeIds.length <= 1, true, `${row.taskId}: bounded dependency count`);
    assert.equal(row.dependencyRecipeIds.includes(row.primaryRecipeId), false, `${row.taskId}: distinct dependency`);
    const deliveryIds = [row.primaryRecipeId, ...row.dependencyRecipeIds];
    const deliveredActions = new Set(deliveryIds.flatMap(id => executions.get(id).deliveredActions));
    const deliveredRuntimeFunctions = new Set(deliveryIds.flatMap(id => executions.get(id).deliveredRuntimeFunctions));
    const deliveredText = deliveryIds.map(id => {
      const recipe = recipes.get(id);
      return [
        recipe.exampleSource,
        ...recipe.pitfalls.flatMap(pitfall => [pitfall.problem, pitfall.fix])
      ].join("\n");
    }).join("\n");

    for (const action of task.oracle.requiredActions) {
      if (!deliveredActions.has(action)) failures.push(`${row.taskId}: missing delivered action ${action}`);
    }
    if (task.oracle.anyOfActionSets.length > 0) {
      if (!task.oracle.anyOfActionSets.some(set => set.every(action => deliveredActions.has(action)))) {
        failures.push(`${row.taskId}: no delivered alternative action set`);
      }
    }
    for (const action of task.oracle.forbiddenActions) {
      if (deliveredText.includes(`.${action}(`)) failures.push(`${row.taskId}: forbidden delivered action ${action}`);
    }
    for (const runtimeFunction of task.oracle.requiredRuntimeFunctions) {
      if (!deliveredRuntimeFunctions.has(runtimeFunction)) {
        failures.push(`${row.taskId}: missing delivered runtime function ${runtimeFunction}`);
      }
    }
    for (const trap of row.knownTrapCoverage) {
      if (!deliveredText.includes(trap.warning)) failures.push(`${row.taskId}: missing trap warning ${trap.warning}`);
      if (!deliveredText.includes(trap.forbiddenIdentifier)) failures.push(`${row.taskId}: unnamed trap ${trap.forbiddenIdentifier}`);
    }

    const taskSearch = await searchKnowledge({ query: task.prompt });
    if (`${taskSearch.results[0].kind}:${taskSearch.results[0].id}` !== `recipe:${row.primaryRecipeId}`) {
      failures.push(`${row.taskId}: primary task rank`);
    }
    for (const dependencyId of row.dependencyRecipeIds) {
      if (!taskSearch.results.some(result => result.kind === "recipe" && result.id === dependencyId)) {
        failures.push(`${row.taskId}: dependency route ${dependencyId}`);
      }
    }
    const paraphraseSearch = await searchKnowledge({ query: paraphrases.cases[index].query });
    if (`${paraphraseSearch.results[0].kind}:${paraphraseSearch.results[0].id}` !== `recipe:${row.primaryRecipeId}`) {
      failures.push(`${row.taskId}: paraphrase primary rank`);
    }
  }
  assert.deepEqual(failures, []);
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
