import assert from "node:assert/strict";
import { createHash } from "node:crypto";
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
  REALISTIC_DATA_MARK_INTERACTIONS,
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

function finalProgramFingerprint(program) {
  return createHash("sha256")
    .update(JSON.stringify(program.semanticSpec))
    .update("\0")
    .update(JSON.stringify(program.graphicSpec))
    .digest("hex");
}

test("defines focused realistic recipes over at least three actual TidyTuesday datasets", () => {
  assert.deepEqual(REALISTIC_DATA_MARK_COUNTS, {
    recipes: 9,
    intermediate: 3,
    advanced: 6,
    minimumSelections: 280,
    intermediateSelections: 60,
    advancedSelections: 220
  });
  assert.equal(REALISTIC_DATA_MARK_SCENARIO_RECIPES.length, 9);
  assert.equal(new Set(REALISTIC_DATA_MARK_SCENARIO_RECIPES.map(recipe => recipe.id)).size, 9);
  assert.ok(REALISTIC_DATA_MARK_REQUIRED_FEATURES.includes("feature:maximal-binned-heatmap"));
  assert.ok(REALISTIC_DATA_MARK_REQUIRED_FEATURES.includes("lifecycle:remove"));
  assert.equal(REALISTIC_DATA_MARK_INTERACTIONS.length, 12);
  for (const recipe of REALISTIC_DATA_MARK_SCENARIO_RECIPES) {
    assert.equal(recipe.suite, "realistic");
    assert.equal(recipe.generation, "balanced-per-dataset");
    assert.ok(recipe.datasets.length >= 3, recipe.id);
    assert.ok(recipe.datasets.every(dataset => datasetDefinition(dataset).corpus === "tidytuesday"));
    assert.equal(typeof recipe.build, "function");
    assert.equal(typeof recipe.observe, "function");
    assert.equal(recipe.enforceFactorEffects, true);
    assert.equal(typeof recipe.observeFactors, "function");
    assert.equal(typeof recipe.describe, "function");
    assert.ok(recipe.minimumSelections >= 20, recipe.id);
  }
});

test("every advertised data-mark factor changes the final chart one factor at a time", () => {
  for (const [recipeIndex, recipe] of REALISTIC_DATA_MARK_SCENARIO_RECIPES.entries()) {
    const dataset = WITNESS_DATASETS[recipeIndex % WITNESS_DATASETS.length];
    try {
      const domains = recipe.factorsForDataset(dataset);
      assert.notEqual(domains, undefined, `${recipe.id} ${dataset}`);
      const baseline = { dataset };
      for (const [factor, domain] of Object.entries(domains)) baseline[factor] = domain[0];
      for (const [factor, domain] of Object.entries(domains)) {
        const fingerprints = new Set();
        for (const [valueIndex, value] of domain.entries()) {
          const factors = Object.freeze({ ...baseline, [factor]: value });
          const label = `${recipe.id}-${dataset}-${factor}-${valueIndex}`;
          const program = recipe.build(factors);
          assertGraphicIntegrity(program, label);
          assertAnalyticLayerIntegrity(program, label);
          fingerprints.add(finalProgramFingerprint(program));
          assert.deepEqual(
            new Set(recipe.observeFactors(program, factors).map(effect => effect.factor)),
            new Set(Object.keys(domains)),
            `${label} factor observers`
          );
        }
        assert.equal(
          fingerprints.size,
          domain.length,
          `${recipe.id} ${dataset} inactive ${factor} values`
        );
      }
    } finally {
      releaseTidyTuesdaySourceCache(dataset);
    }
  }
});

test("recognizes renderer-specific removed strokes on non-circular points", () => {
  const recipe = REALISTIC_DATA_MARK_SCENARIO_RECIPES.find(candidate =>
    candidate.id === "realistic-maximal-point-label-layout"
  );
  const dataset = "tt-london-marathon-winners";
  try {
    const domains = recipe.factorsForDataset(dataset);
    const baseline = {
      dataset,
      fieldPair: domains.fieldPair[0],
      fill: "#7c3aed",
      opacity: 0.9,
      strokeRemoval: true,
      jitter: domains.jitter.find(value => value.id === "vertical-band"),
      labelAxis: "both",
      labelBounds: "plot",
      labelPadding: 1,
      maxDisplacement: 20,
      leader: true
    };
    for (const shape of ["diamond", "square"]) {
      const factors = Object.freeze({ ...baseline, shape });
      const program = recipe.build(factors);
      const point = program.graphicSpec.objects.observations.items[0].properties;
      if (shape === "diamond") {
        assert.equal(point.stroke, undefined);
        assert.equal(point.strokeWidth, undefined);
      } else {
        assert.equal(point.strokeWidth, 0);
      }
      assert.ok(recipe.observeFactors(program, factors)
        .some(effect => effect.factor === "strokeRemoval"));
      assert.equal(
        recipe.observeFactors(program, factors)
          .find(effect => effect.factor === "maxDisplacement")?.evidence,
        "applied-layout-policy:layoutLabels.maxDisplacement"
      );
    }
  } finally {
    releaseTidyTuesdaySourceCache(dataset);
  }
});

test("only advertises arc bindings with positive weights for every aggregate", () => {
  const recipe = REALISTIC_DATA_MARK_SCENARIO_RECIPES.find(candidate =>
    candidate.id === "realistic-maximal-arc"
  );
  const dataset = "tt-us-tornadoes";
  try {
    const domains = recipe.factorsForDataset(dataset);
    assert.equal(
      domains.fieldPair.some(value => value.bindingId === "eligible:inj-by-st"),
      false
    );
    const baseline = { dataset };
    for (const [factor, domain] of Object.entries(domains)) baseline[factor] = domain[0];
    for (const fieldPair of domains.fieldPair) {
      for (const aggregate of domains.aggregate) {
        const program = recipe.build(Object.freeze({ ...baseline, fieldPair, aggregate }));
        assertGraphicIntegrity(program, `${dataset}-${fieldPair.bindingId}-${aggregate}`);
        assertAnalyticLayerIntegrity(program, `${dataset}-${fieldPair.bindingId}-${aggregate}`);
      }
    }
  } finally {
    releaseTidyTuesdaySourceCache(dataset);
  }
});

test("keeps every advertised arc padding ratio materially distinct", () => {
  const recipe = REALISTIC_DATA_MARK_SCENARIO_RECIPES.find(candidate =>
    candidate.id === "realistic-maximal-arc"
  );
  const datasets = [
    "tt-himalayan-peaks",
    "tt-space-launches",
    "tt-meteorites",
    "tt-bechdel-movies",
    "tt-spiders",
    "tt-new-zealand-names"
  ];
  for (const dataset of datasets) {
    try {
      const domains = recipe.factorsForDataset(dataset);
      assert.deepEqual(domains.padRatio, [0.008, 0.018, 0.03]);
      const baseline = { dataset };
      for (const [factor, domain] of Object.entries(domains)) baseline[factor] = domain[0];
      const fingerprints = domains.padRatio.map(padRatio =>
        finalProgramFingerprint(recipe.build(Object.freeze({ ...baseline, padRatio })))
      );
      assert.equal(new Set(fingerprints).size, domains.padRatio.length, dataset);
    } finally {
      releaseTidyTuesdaySourceCache(dataset);
    }
  }
});

test("only advertises monotone error bands on a strictly ordered position axis", () => {
  const explicit = REALISTIC_DATA_MARK_SCENARIO_RECIPES.find(candidate =>
    candidate.id === "realistic-maximal-explicit-band"
  );
  const statistical = REALISTIC_DATA_MARK_SCENARIO_RECIPES.find(candidate =>
    candidate.id === "realistic-maximal-statistical-band"
  );
  const dataset = "tt-movie-profit";
  try {
    const explicitDomains = explicit.factorsForDataset(dataset);
    const statisticalDomains = statistical.factorsForDataset(dataset);
    assert.deepEqual(explicitDomains.orientation, ["vertical"]);
    assert.ok(explicitDomains.curve.includes("monotone"));
    assert.equal(statisticalDomains.curve.includes("monotone"), false);
    assert.equal(statisticalDomains.editCurve.includes("monotone"), false);

    const baseline = { dataset };
    for (const [factor, domain] of Object.entries(explicitDomains)) baseline[factor] = domain[0];
    const fieldPair = explicitDomains.fieldPair.find(value =>
      value.bindingId === "eligible:production_budget-by-distributor"
    );
    const program = explicit.build(Object.freeze({
      ...baseline,
      fieldPair,
      curve: "monotone",
      editCurve: "linear",
      reverse: true
    }));
    assertGraphicIntegrity(program, `${dataset}-vertical-monotone-explicit-band`);
    assertAnalyticLayerIntegrity(program, `${dataset}-vertical-monotone-explicit-band`);
  } finally {
    releaseTidyTuesdaySourceCache(dataset);
  }
});

test("paired-measure sampling filters the full source before selecting displayed rows", () => {
  const recipe = REALISTIC_DATA_MARK_SCENARIO_RECIPES.find(candidate =>
    candidate.id === "realistic-maximal-binned-heatmap"
  );
  const expected = Object.freeze({
    "tt-college-graduates": [172, "c70b38d47aff708c6526b8f038fe39e1850a08130137f2c96e0f6f6794b63397"],
    "tt-video-games": [23586, "32058fc14355039bf1215e982f2d6277f2d79fd63c5e839fff43fe8ff69ed1a5"],
    "tt-coffee-ratings": [1083, "4aa45a764dd5a7af73ff895b2c09dd0556a619bbb52763ee119ceb88b88c5585"],
    "tt-big-mac": [456, "ce2adf311e3b386af013091932b40fa75819be0f5657d46210052e3cb7889d2e"],
    "tt-plastics": [923, "f73bb9b0df38f14829ad585d41782c022f1dba190ea586679fc3faf8d6a6f18d"]
  });
  for (const [dataset, [eligibleRowCount, selectionSha256]] of Object.entries(expected)) {
    try {
      const factors = factorWitness(recipe, dataset, 0);
      const metadata = recipe.describe(factors);
      assert.equal(metadata.sampling.eligibleRowCount, eligibleRowCount, dataset);
      assert.equal(metadata.sampling.displayedRowCount, 160, dataset);
      assert.equal(metadata.provenance.sourceRowCount, 160, dataset);
      assert.equal(metadata.provenance.sourceSelectionSha256, selectionSha256, dataset);
      assert.deepEqual(metadata.dataOperations, [
        "filter-valid",
        "top-groups",
        "filter-paired-finite-measures",
        "witness-preserving-even-sample",
        "project"
      ], dataset);
    } finally {
      releaseTidyTuesdaySourceCache(dataset);
    }
  }
});

test("split-density eligibility is filtered before deterministic sampling", () => {
  const recipe = REALISTIC_DATA_MARK_SCENARIO_RECIPES.find(candidate =>
    candidate.id === "realistic-maximal-density"
  );
  const expected = Object.freeze({
    "tt-plastics": [
      291,
      160,
      "58f41152091de41fee942704d51d62bf214b7962ab3179547006aed33875e922"
    ],
    "tt-video-games": [
      153,
      153,
      "fe80a2a1a62d15c6f227f0a9269d0a1de0677f0a4b77b7b1fe0a8b7a6215dfcc"
    ]
  });
  for (const [dataset, [eligible, displayed, sha256]] of Object.entries(expected)) {
    try {
      const domains = recipe.factorsForDataset(dataset);
      const baseline = { dataset };
      for (const [factor, domain] of Object.entries(domains)) baseline[factor] = domain[0];
      for (const placement of domains.placement.filter(value => value.type === "split")) {
        const factors = Object.freeze({ ...baseline, placement });
        const metadata = recipe.describe(factors);
        const program = recipe.build(factors);
        const rows = program.semanticSpec.datasets.find(value => value.id === "analysisRows").values;
        assert.equal(metadata.sampling.eligibleRowCount, eligible, dataset);
        assert.equal(metadata.sampling.displayedRowCount, displayed, dataset);
        assert.equal(metadata.provenance.sourceRowCount, displayed, dataset);
        assert.equal(metadata.provenance.sourceSelectionSha256, sha256, dataset);
        assert.equal(rows.length, displayed, dataset);
        assert.ok(metadata.dataOperations.indexOf("filter-supported-groups") <
          metadata.dataOperations.indexOf("witness-preserving-even-sample"), dataset);
      }
    } finally {
      releaseTidyTuesdaySourceCache(dataset);
    }
  }
});

test("known corpus-wide density and axis witnesses remain nondegenerate", () => {
  const density = REALISTIC_DATA_MARK_SCENARIO_RECIPES.find(candidate =>
    candidate.id === "realistic-maximal-density"
  );
  const densityDataset = "tt-us-tornadoes";
  try {
    const domains = density.factorsForDataset(densityDataset);
    assert.notEqual(domains, undefined);
    for (const [fieldIndex, fieldPair] of domains.fieldPair.entries()) {
      const factors = factorWitness(density, densityDataset, 0);
      const program = density.build({ ...factors, fieldPair });
      assertAnalyticLayerIntegrity(program, `tornado-density-${fieldIndex}`);
    }
  } finally {
    releaseTidyTuesdaySourceCache(densityDataset);
  }

  for (const [recipeId, dataset] of [
    ["realistic-maximal-histogram", "tt-movie-profit"],
    ["realistic-maximal-ordered-bars", "tt-global-temperatures"]
  ]) {
    const recipe = REALISTIC_DATA_MARK_SCENARIO_RECIPES.find(candidate =>
      candidate.id === recipeId
    );
    try {
      const domains = recipe.factorsForDataset(dataset);
      for (const [fieldIndex, fieldPair] of domains.fieldPair.entries()) {
        const factors = factorWitness(recipe, dataset, fieldIndex);
        const metadata = recipe.describe({ ...factors, fieldPair });
        const svg = renderToSVG(recipe.build({ ...factors, fieldPair }), {
          title: metadata.title,
          description: metadata.analysisQuestion
        });
        assertSvgIntegrity(svg, `${recipeId}-${dataset}-${fieldIndex}`);
      }
    } finally {
      releaseTidyTuesdaySourceCache(dataset);
    }
  }
});

test("sizes step histograms from the full sampled extent for extreme outliers", () => {
  const recipe = REALISTIC_DATA_MARK_SCENARIO_RECIPES.find(candidate =>
    candidate.id === "realistic-maximal-histogram"
  );
  const dataset = "tt-nuclear-explosions";
  try {
    const domains = recipe.factorsForDataset(dataset);
    const fieldPair = domains.fieldPair.find(value =>
      value.bindingId === "eligible:yield_upper-by-country"
    );
    assert.notEqual(fieldPair, undefined);
    const fingerprints = [];
    for (const maxBins of domains.maxBins) {
      const factors = Object.freeze({
        dataset,
        fieldPair,
        binMode: "step",
        maxBins,
        stack: "normalize",
        palettePath: "scale",
        nice: true,
        reverse: true,
        palette: "tableau10"
      });
      const program = recipe.build(factors);
      assertGraphicIntegrity(program, `${dataset}-step-${maxBins}`);
      assertAnalyticLayerIntegrity(program, `${dataset}-step-${maxBins}`);
      const rows = program.semanticSpec.datasets.find(value =>
        value.id === "analysisRows"
      ).values;
      const extent = Math.max(...rows.map(row => row.value)) -
        Math.min(...rows.map(row => row.value));
      assert.equal(extent, 50_000);
      const created = program.trace.children.findLast(node =>
        node.op === "createHistogram"
      ).args;
      assert.equal(created.binStep, extent / maxBins);
      assert.equal(created.maxBins, undefined);
      assert.equal(created.stack, "normalize");
      assert.equal(created.xScale.nice, true);
      assert.equal(created.xScale.reverse, true);
      assert.equal(created.color.palette, undefined);
      assert.equal(created.color.scale.palette, "category20");
      assert.deepEqual(
        new Set(recipe.observeFactors(program, factors).map(effect => effect.factor)),
        new Set(Object.keys(domains))
      );
      fingerprints.push(finalProgramFingerprint(program));
      if (maxBins === 12) {
        const metadata = recipe.describe(factors);
        const svg = renderToSVG(program, {
          title: metadata.title,
          description: metadata.analysisQuestion
        });
        assertSvgIntegrity(svg, `${dataset}-step-${maxBins}`);
      }
    }
    assert.equal(new Set(fingerprints).size, domains.maxBins.length);
  } finally {
    releaseTidyTuesdaySourceCache(dataset);
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
    assert.equal(program.semanticSpec.title?.text, metadata.title, label);
    assert.equal(program.semanticSpec.title?.subtitle, metadata.analysisQuestion, label);
    if (metadata.sampling !== undefined) {
      assert.match(metadata.title, /deterministic stratified sample \(n=\d+\/\d+ eligible\)/u);
      assert.match(metadata.analysisQuestion, /deterministic stratified sample/u);
      assert.equal(
        metadata.sampling.displayedRowCount,
        metadata.provenance.sourceRowCount,
        label
      );
    }
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
  assert.ok(observedBroad.length >= 300, `${observedBroad.length}/${broadOptions.length} paths`);

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
