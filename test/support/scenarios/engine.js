import assert from "node:assert/strict";
import { createHash } from "node:crypto";

import { renderToSVG } from "../../../src/renderers/svg.js";
import { assertGraphicIntegrity } from "../../oracles/graphic-integrity.js";
import { assertSvgIntegrity } from "../../oracles/svg-integrity.js";
import { datasetDefinition } from "../datasets/catalog.js";
import { scenarioDatasetAvailable } from "./data-views.js";
import { assertPairwiseCoverage, pairwiseCases } from "./pairwise.js";
import { SCENARIO_RECIPES, scenarioRecipe } from "./recipes.js";

function stableValue(value) {
  if (Array.isArray(value)) return `[${value.map(stableValue).join(",")}]`;
  if (value !== null && typeof value === "object") {
    return `{${Object.entries(value).map(([key, child]) =>
      `${JSON.stringify(key)}:${stableValue(child)}`
    ).join(",")}}`;
  }
  return JSON.stringify(value);
}

function descriptorId(recipeId, factors) {
  const digest = createHash("sha256")
    .update(recipeId)
    .update("\0")
    .update(stableValue(factors))
    .digest("hex")
    .slice(0, 12);
  return `${recipeId}-${digest}`;
}

function availableDatasets(recipe, includeTidyTuesday) {
  const eligible = recipe.datasets.filter(id => {
    const definition = datasetDefinition(id);
    return includeTidyTuesday || definition.corpus !== "tidytuesday";
  });
  const unavailable = eligible.filter(id => !scenarioDatasetAvailable(id));
  if (unavailable.length > 0) {
    throw new Error(
      `Scenario recipe "${recipe.id}" requires unavailable datasets: ` +
      `${unavailable.join(", ")}. Run npm run datasets:sync first.`
    );
  }
  return eligible;
}

function smokeCases(recipe, datasets) {
  const entries = Object.entries(recipe.factors);
  const baseline = Object.fromEntries(entries.map(([name, values]) => [name, values[0]]));
  const edge = Object.fromEntries(entries.map(([name, values]) => [name, values.at(-1)]));
  return [
    ...datasets.map(dataset => ({ dataset, ...baseline })),
    { dataset: datasets.at(-1), ...edge }
  ].filter((value, index, values) =>
    values.findIndex(candidate => stableValue(candidate) === stableValue(value)) === index
  );
}

export function scenarioFactorContract(recipeId, { includeTidyTuesday = true } = {}) {
  const recipe = scenarioRecipe(recipeId);
  const datasets = availableDatasets(recipe, includeTidyTuesday);
  if (datasets.length === 0) {
    throw new Error(`Scenario recipe "${recipeId}" has no available datasets.`);
  }
  return Object.freeze({ dataset: Object.freeze(datasets), ...recipe.factors });
}

export function generateScenarioDescriptors({
  mode = "smoke",
  includeTidyTuesday = true,
  recipeIds = SCENARIO_RECIPES.map(recipe => recipe.id),
  limit
} = {}) {
  if (!["smoke", "deep"].includes(mode)) {
    throw new Error('Scenario mode must be "smoke" or "deep".');
  }
  if (limit !== undefined && (!Number.isInteger(limit) || limit <= 0)) {
    throw new RangeError("Scenario limit must be a positive integer.");
  }
  if (!Array.isArray(recipeIds) || recipeIds.length === 0) {
    throw new TypeError("Scenario recipe ids must be a non-empty array.");
  }
  if (new Set(recipeIds).size !== recipeIds.length) {
    throw new Error("Scenario recipe ids must be unique.");
  }
  const descriptors = [];
  for (const recipeId of recipeIds) {
    const recipe = scenarioRecipe(recipeId);
    const factors = scenarioFactorContract(recipeId, { includeTidyTuesday });
    const cases = mode === "deep"
      ? pairwiseCases(factors)
      : smokeCases(recipe, factors.dataset);
    if (mode === "deep") assertPairwiseCoverage(cases, factors);
    for (const factorValues of cases) {
      descriptors.push(Object.freeze({
        id: descriptorId(recipeId, factorValues),
        recipe: recipeId,
        factors: Object.freeze({ ...factorValues })
      }));
    }
  }
  const selected = limit === undefined ? descriptors : descriptors.slice(0, limit);
  return Object.freeze(selected);
}

function collectTraceOperations(node, operations = []) {
  if (node === null || typeof node !== "object") return operations;
  if (typeof node.op === "string") operations.push(node.op);
  for (const child of node.children ?? []) collectTraceOperations(child, operations);
  return operations;
}

function collectDirectTraceOperations(trace) {
  return (trace?.children ?? [])
    .map(node => node?.op)
    .filter(operation => typeof operation === "string");
}

function scanFinite(value, path = "program", visited = new Set()) {
  if (typeof value === "number") {
    assert.equal(Number.isFinite(value), true, `${path} must be finite.`);
    return;
  }
  if (value === null || typeof value !== "object" || visited.has(value)) return;
  visited.add(value);
  if (Array.isArray(value)) {
    value.forEach((child, index) => scanFinite(child, `${path}[${index}]`, visited));
    return;
  }
  for (const [key, child] of Object.entries(value)) {
    scanFinite(child, `${path}.${key}`, visited);
  }
}

export function buildScenario(descriptor) {
  if (
    descriptor === null || typeof descriptor !== "object" ||
    typeof descriptor.recipe !== "string" ||
    descriptor.factors === null || typeof descriptor.factors !== "object"
  ) {
    throw new TypeError("Scenario descriptor requires a recipe and factors.");
  }
  return scenarioRecipe(descriptor.recipe).build(descriptor.factors);
}

export function runScenario(descriptor, { deterministic = true } = {}) {
  const program = buildScenario(descriptor);
  scanFinite(program.semanticSpec, `${descriptor.id}.semanticSpec`);
  scanFinite(program.resolvedScales, `${descriptor.id}.resolvedScales`);
  const graphic = assertGraphicIntegrity(program, descriptor.id);
  const svg = renderToSVG(program, {
    title: descriptor.id,
    description: `Generated ${descriptor.recipe} scenario.`
  });
  assertSvgIntegrity(svg, descriptor.id);
  if (deterministic) {
    const replay = buildScenario(descriptor);
    assert.deepEqual(replay.semanticSpec, program.semanticSpec, `${descriptor.id} semantic replay`);
    assert.deepEqual(replay.graphicSpec, program.graphicSpec, `${descriptor.id} graphic replay`);
    assert.equal(renderToSVG(replay, {
      title: descriptor.id,
      description: `Generated ${descriptor.recipe} scenario.`
    }), svg, `${descriptor.id} SVG replay`);
  }
  const operations = collectTraceOperations(program.trace);
  const directOperations = collectDirectTraceOperations(program.trace);
  return Object.freeze({
    id: descriptor.id,
    recipe: descriptor.recipe,
    dataset: descriptor.factors.dataset,
    operations: Object.freeze([...new Set(operations)]),
    directOperations: Object.freeze([...new Set(directOperations)]),
    actionCount: operations.length,
    graphic,
    layerCount: program.semanticSpec.layers.length,
    datasetCount: program.semanticSpec.datasets.length,
    svgBytes: Buffer.byteLength(svg),
    svgSha256: createHash("sha256").update(svg).digest("hex")
  });
}

export function summarizeScenarioResults(results, descriptors) {
  const operations = new Set(results.flatMap(result => result.operations));
  const directOperations = new Set(results.flatMap(result => result.directOperations));
  const recipes = new Set(results.map(result => result.recipe));
  const datasets = new Set(results.map(result => result.dataset));
  return Object.freeze({
    scenarioCount: results.length,
    recipeCount: recipes.size,
    datasetCount: datasets.size,
    operationCount: operations.size,
    operations: Object.freeze([...operations].sort()),
    directOperationCount: directOperations.size,
    directOperations: Object.freeze([...directOperations].sort()),
    graphicObjects: results.reduce((sum, result) => sum + result.graphic.objectCount, 0),
    graphicItems: results.reduce((sum, result) => sum + result.graphic.itemCount, 0),
    svgBytes: results.reduce((sum, result) => sum + result.svgBytes, 0),
    descriptorCount: descriptors.length
  });
}
