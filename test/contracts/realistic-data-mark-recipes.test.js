import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { renderToSVG } from "../../src/renderers/svg.js";
import { assertAnalyticLayerIntegrity } from "../oracles/analytic-layer-integrity.js";
import { assertGraphicIntegrity } from "../oracles/graphic-integrity.js";
import { assertSvgIntegrity } from "../oracles/svg-integrity.js";
import { datasetDefinition } from "../support/datasets/catalog.js";
import { releaseTidyTuesdaySourceCache } from "../support/datasets/tidytuesday.js";
import { buildPublicOptionInventory } from "../support/scenarios/coverage-inventory.js";
import {
  REALISTIC_DATA_MARK_COUNTS,
  REALISTIC_DATA_MARK_REQUIRED_FEATURES,
  REALISTIC_DATA_MARK_SCENARIO_RECIPES
} from "../support/scenarios/realistic-data-mark-recipes.js";

const WITNESS_DATASETS = Object.freeze([
  "tt-penguins",
  "tt-us-tornadoes",
  "tt-fast-food-nutrition"
]);
const NEW_DIRECT_ACTIONS = Object.freeze([
  "editArcMark",
  "editBin2DData",
  "editPointMark",
  "encodePathOrder",
  "encodeStrokeDash",
  "removeCategoryOrder",
  "removeJitter",
  "removeLabelLayout",
  "removePathOrder"
]);
const TARGET_ACTIONS = Object.freeze([
  "createHeatmap",
  "createHistogram",
  "encodeDensity",
  "editDensity",
  "editBin2DData",
  "editPointMark",
  "encodeStrokeDash",
  "orderCategories",
  "editLineMark",
  "layoutLabels",
  "jitterPoints",
  "removeJitter",
  "removeLabelLayout",
  "createArcMark",
  "editArcMark",
  "encodePathOrder",
  "removePathOrder",
  "createErrorBand",
  "editErrorBand",
  "editErrorBandBoundary",
  "encodeBarWidth",
  "removeCategoryOrder"
]);
const actionCards = JSON.parse(readFileSync(
  new URL("../../knowledge/action-cards.json", import.meta.url),
  "utf8"
));
let witnessCache;

function factorWitness(recipe, dataset, datasetIndex) {
  const domains = recipe.factorsForDataset(dataset);
  assert.notEqual(domains, undefined, `${recipe.id} ${dataset} factor domain`);
  const values = { dataset };
  let factorIndex = 0;
  for (const [name, domain] of Object.entries(domains)) {
    assert.ok(Array.isArray(domain) && domain.length > 0, `${recipe.id}.${name}`);
    values[name] = domain[(datasetIndex + factorIndex) % domain.length];
    factorIndex += 1;
  }
  return Object.freeze(values);
}

function buildWitnesses() {
  if (witnessCache !== undefined) return witnessCache;
  const values = [];
  for (const [datasetIndex, dataset] of WITNESS_DATASETS.entries()) {
    try {
      for (const recipe of REALISTIC_DATA_MARK_SCENARIO_RECIPES) {
        const factors = factorWitness(recipe, dataset, datasetIndex);
        const program = recipe.build(factors);
        const metadata = recipe.describe(factors);
        values.push(Object.freeze({ recipe, factors, program, metadata }));
      }
    } finally {
      releaseTidyTuesdaySourceCache(dataset);
    }
  }
  witnessCache = Object.freeze(values);
  return witnessCache;
}

function nestedTraceValues(args, path) {
  let values = [args];
  for (const segment of path.split(".")) {
    const name = segment.endsWith("[]") ? segment.slice(0, -2) : segment;
    const next = [];
    for (const value of values) {
      if (value === null || typeof value !== "object" || Array.isArray(value)) continue;
      if (Object.hasOwn(value, name) && value[name] !== undefined) {
        next.push(value[name]);
        continue;
      }
      const count = value[`${name}Count`];
      const type = value[`${name}Type`];
      if (
        Number.isInteger(count) && count > 0 ||
        typeof type === "string" && type.length > 0
      ) next.push(Object.freeze({ summarized: true }));
    }
    values = next;
    if (values.length === 0) break;
  }
  return values;
}

function directlyObserves(entries, option) {
  return entries.some(entry =>
    entry.op === option.action && nestedTraceValues(entry.args, option.path).length > 0
  );
}

test("defines focused realistic recipes over at least three actual TidyTuesday datasets", () => {
  assert.deepEqual(REALISTIC_DATA_MARK_COUNTS, {
    recipes: 9,
    intermediate: 3,
    advanced: 6
  });
  assert.equal(REALISTIC_DATA_MARK_SCENARIO_RECIPES.length, 9);
  assert.equal(new Set(REALISTIC_DATA_MARK_SCENARIO_RECIPES.map(recipe => recipe.id)).size, 9);
  assert.ok(REALISTIC_DATA_MARK_REQUIRED_FEATURES.includes("feature:maximal-binned-heatmap"));
  assert.ok(REALISTIC_DATA_MARK_REQUIRED_FEATURES.includes("lifecycle:remove"));
  for (const recipe of REALISTIC_DATA_MARK_SCENARIO_RECIPES) {
    assert.equal(recipe.suite, "realistic");
    assert.equal(recipe.generation, "balanced-per-dataset");
    assert.ok(recipe.datasets.length >= 3, recipe.id);
    assert.ok(recipe.datasets.every(dataset => datasetDefinition(dataset).corpus === "tidytuesday"));
    assert.equal(typeof recipe.build, "function");
    assert.equal(typeof recipe.observe, "function");
    assert.equal(typeof recipe.describe, "function");
  }
});

test("materializes analytic and SVG output with compact truthful lineage", () => {
  const witnesses = buildWitnesses();
  assert.equal(witnesses.length, 27);
  for (const { recipe, factors, program, metadata } of witnesses) {
    const label = `${recipe.id}-${factors.dataset}`;
    assertGraphicIntegrity(program, label);
    assertAnalyticLayerIntegrity(program, label);
    const svg = renderToSVG(program, {
      title: metadata.title,
      description: metadata.analysisQuestion
    });
    assertSvgIntegrity(svg, label);

    const definition = datasetDefinition(factors.dataset);
    assert.equal(metadata.corpus, "tidytuesday");
    assert.deepEqual(metadata.sourceDatasetIds, [factors.dataset]);
    assert.equal(metadata.provenance.sourceDataset, factors.dataset);
    assert.equal(metadata.provenance.sourceRowIndexBasis, "zero-based-data-row-in-pinned-csv");
    assert.ok(metadata.provenance.sourceRowCount > 0);
    assert.ok(metadata.provenance.sourceRowCount <= definition.rows);
    assert.match(metadata.provenance.sourceSelectionSha256, /^[a-f0-9]{64}$/u);
    assert.ok(JSON.stringify(metadata.provenance).length < 30_000, `${label} lineage`);
    if (metadata.provenance.sourceRowIndexes !== undefined) {
      assert.ok(metadata.provenance.sourceRowIndexes.length <= 160, label);
      assert.equal(
        metadata.provenance.sourceRowIndexes.length,
        metadata.provenance.sourceRowCount,
        label
      );
    }
    assert.ok(metadata.sourceFields.length >= 2, label);
    assert.ok(metadata.sourceFields.every(field => definition.fields[field.field] !== undefined));
    assert.deepEqual(recipe.observe(program, factors), metadata.activeFeatures, label);
  }
});

test("directly covers every newly targeted action option and broad maximal paths", async () => {
  const inventory = await buildPublicOptionInventory(actionCards);
  const entries = buildWitnesses().flatMap(({ program }) => program.trace.children ?? []);
  const directActions = new Set(entries.map(entry => entry.op));
  assert.deepEqual(
    NEW_DIRECT_ACTIONS.filter(action => !directActions.has(action)),
    []
  );
  assert.deepEqual(
    TARGET_ACTIONS.filter(action => !directActions.has(action)),
    []
  );

  const newActionOptions = inventory.optionPaths.filter(option =>
    option.required && NEW_DIRECT_ACTIONS.includes(option.action)
  );
  assert.equal(newActionOptions.length, 50);
  assert.deepEqual(
    newActionOptions.filter(option => !directlyObserves(entries, option)).map(option => option.id),
    []
  );

  const broadOptions = inventory.optionPaths.filter(option =>
    option.required && TARGET_ACTIONS.includes(option.action)
  );
  const observedBroad = broadOptions.filter(option => directlyObserves(entries, option));
  assert.equal(broadOptions.length, 363);
  assert.ok(observedBroad.length >= 270, `${observedBroad.length}/363 option paths`);

  const traces = action => entries.filter(entry => entry.op === action).map(entry => entry.args);
  assert.ok(traces("createHistogram").some(args => args.maxBins !== undefined));
  assert.ok(traces("createHistogram").some(args => args.binStep !== undefined));
  assert.ok(traces("createHistogram").some(args => args.binBoundariesCount > 0));
  assert.ok(traces("encodeStrokeDash").some(args => args.field !== undefined));
  assert.ok(traces("encodeStrokeDash").some(args => args.value !== undefined));
  assert.ok(traces("jitterPoints").some(args => args.maxOffset.band !== undefined));
  assert.ok(traces("jitterPoints").some(args => args.maxOffset.pixels !== undefined));
  assert.ok(traces("editArcMark").some(args => args.fill !== undefined));
  assert.ok(traces("editArcMark").some(args => args.stroke === false));
  assert.ok(traces("createErrorBand").some(args =>
    args.x?.lower !== undefined || args.y?.lower !== undefined
  ));
  assert.ok(traces("createErrorBand").some(args =>
    args.x?.extent !== undefined || args.y?.extent !== undefined
  ));
});
