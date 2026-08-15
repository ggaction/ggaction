import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import test from "node:test";

import { assertAnalyticLayerIntegrity } from
  "../oracles/analytic-layer-integrity.js";
import { datasetDefinition } from "../support/datasets/catalog.js";
import { releaseTidyTuesdaySourceCache, tidyTuesdaySourceEntries } from
  "../support/datasets/tidytuesday.js";
import {
  buildScenario,
  generateScenarioDescriptors,
  runScenario,
  scenarioGenerationDiagnostics
} from "../support/scenarios/engine.js";
import {
  REALISTIC_LIFECYCLE_COUNTS,
  REALISTIC_LIFECYCLE_SCENARIO_RECIPES
} from
  "../support/scenarios/lifecycle-recipes.js";
import {
  REALISTIC_REQUIRED_FEATURES,
  REALISTIC_SCENARIO_RECIPES,
  scenarioRecipe
} from "../support/scenarios/recipes.js";
import {
  realisticDatasetIds,
  realisticDatasetRoles,
  realisticFieldPairDomain,
  realisticGroupedView,
  realisticRecordView,
  realisticSummaryView
} from "../support/scenarios/realistic-data.js";
import { REALISTIC_ANALYSIS_COUNTS, REALISTIC_ANALYSIS_RECIPES } from
  "../support/scenarios/realistic-recipes.js";

const EXPECTED_TIERS = Object.freeze({
  simple: 14,
  intermediate: 28,
  advanced: 22,
  composite: 8
});

function countBy(values, keyFor) {
  const counts = {};
  for (const value of values) {
    const key = keyFor(value);
    counts[key] = (counts[key] ?? 0) + 1;
  }
  return counts;
}

test("owns exactly fifty real TidyTuesday sources and seventy-two realistic recipes", () => {
  const datasets = realisticDatasetIds();
  assert.equal(datasets.length, 50);
  assert.equal(new Set(datasets).size, 50);
  assert.equal(datasets.every(id => datasetDefinition(id).corpus === "tidytuesday"), true);

  assert.equal(REALISTIC_SCENARIO_RECIPES.length, 72);
  assert.equal(new Set(REALISTIC_SCENARIO_RECIPES.map(recipe => recipe.id)).size, 72);
  assert.deepEqual(REALISTIC_ANALYSIS_COUNTS, {
    simple: 14,
    intermediate: 28,
    advanced: 1,
    composite: 1
  });
  assert.deepEqual(REALISTIC_LIFECYCLE_COUNTS, { advanced: 21, composite: 7 });
  assert.deepEqual(countBy(
    REALISTIC_SCENARIO_RECIPES,
    recipe => recipe.complexity
  ), EXPECTED_TIERS);
  assert.equal(REALISTIC_SCENARIO_RECIPES.every(recipe =>
    recipe.suite === "realistic" && recipe.datasets.length > 0 &&
    recipe.datasets.every(id => datasets.includes(id))
  ), true);
  assert.equal(REALISTIC_REQUIRED_FEATURES.length > 0, true);
});

test("preflights one balanced dataset quota with truthful metadata and replay", () => {
  const descriptors = generateScenarioDescriptors({ mode: "realistic", limit: 72 });
  const dataset = realisticDatasetIds()[0];
  try {
    assert.equal(descriptors.length, 72);
    assert.equal(descriptors.every(descriptor => descriptor.factors.dataset === dataset), true);
    assert.equal(new Set(descriptors.map(descriptor => descriptor.id)).size, 72);
    assert.equal(new Set(descriptors.map(descriptor => descriptor.semanticFingerprint)).size, 72);
    assert.deepEqual(countBy(
      descriptors,
      descriptor => descriptor.metadata.complexity
    ), EXPECTED_TIERS);
    assert.equal(scenarioGenerationDiagnostics(descriptors).acceptedCandidates, 72);
    assert.equal(scenarioGenerationDiagnostics(descriptors).selectedDescriptors, 72);

    const definition = datasetDefinition(dataset);
    for (const descriptor of descriptors) {
      const { metadata, semanticFingerprint } = descriptor;
      const provenance = metadata.provenance;
      assert.equal(metadata.corpus, "tidytuesday");
      assert.deepEqual(metadata.sourceDatasetIds, [dataset]);
      assert.equal(provenance.sourceDataset, dataset);
      assert.equal(provenance.sourceRowIndexBasis, "zero-based-data-row-in-pinned-csv");
      assert.match(provenance.sourceSelectionSha256, /^[a-f0-9]{64}$/u);
      assert.match(semanticFingerprint, /^[a-f0-9]{64}$/u);
      assert.deepEqual(
        metadata.dataOperations,
        provenance.transformations.map(operation => operation.op)
      );
      if (scenarioRecipe(descriptor.recipe).enforceFactorEffects === true) {
        assert.deepEqual(
          new Set(descriptor.factorEffects.map(effect => effect.factor)),
          new Set(Object.keys(descriptor.factors).filter(name => name !== "dataset"))
        );
      }
      assert.equal(metadata.sourceFields.every(field =>
        Object.hasOwn(definition.fields, field.field)
      ), true);
      if (provenance.sourceRowIndexes !== undefined) {
        assert.equal(provenance.sourceRowIndexes.length <= 160, true);
        assert.equal(provenance.sourceRowIndexes.length, provenance.sourceRowCount);
        assert.equal(
          createHash("sha256")
            .update(provenance.sourceRowIndexes.join(","))
            .digest("hex"),
          provenance.sourceSelectionSha256
        );
      }
    }

    for (const complexity of Object.keys(EXPECTED_TIERS)) {
      const descriptor = descriptors.find(value =>
        value.metadata.complexity === complexity
      );
      const program = buildScenario(descriptor);
      assertAnalyticLayerIntegrity(program, descriptor.id);
      assert.equal(Object.values(program.graphicSpec.objects).some(object =>
        object.type === "text" && object.properties?.text === descriptor.metadata.title
      ), true, `${descriptor.id} visible title`);
      const result = runScenario(descriptor);
      assert.equal(result.directTrace.length > 0, true);
      assert.deepEqual(
        [...result.metadata.activeFeatures].sort(),
        [...result.effectiveFeatures].sort()
      );
      assert.equal(result.svgSha256.length, 64);
      assert.deepEqual(result.factorEffects, descriptor.factorEffects);
    }

    for (const descriptor of descriptors) {
      const result = runScenario(descriptor, { deterministic: false });
      assert.deepEqual(
        [...result.metadata.activeFeatures].sort(),
        [...result.effectiveFeatures].sort(),
        descriptor.id
      );
      const recipe = scenarioRecipe(descriptor.recipe);
      const expected = recipe.expectedDirectActionsFor?.(descriptor.factors) ??
        recipe.expectedDirectActions ?? [];
      assert.equal(
        expected.every(operation => result.directOperations.includes(operation)),
        true,
        `${descriptor.id} direct trace`
      );
    }
  } finally {
    releaseTidyTuesdaySourceCache(dataset);
  }
});

test("aligns default secondary bindings and actual record eligibility across all fifty sources", () => {
  for (const dataset of realisticDatasetIds()) {
    try {
      const roles = realisticDatasetRoles(dataset);
      const pairs = realisticFieldPairDomain(dataset, "record");
      assert.equal(pairs.length > 0, true, `${dataset} record domain`);
      const pair = pairs[0];
      const view = realisticRecordView(dataset, {
        measureIndex: pair.measureIndex,
        dimensionIndex: pair.dimensionIndex
      });
      assert.equal(view.provenance.fieldBindings.measure, roles.measures[pair.measureIndex]);
      assert.equal(view.provenance.fieldBindings.dimension, roles.dimensions[pair.dimensionIndex]);
      const otherMeasures = roles.measures.filter(field =>
        field !== roles.measures[pair.measureIndex]
      );
      const otherDimensions = roles.dimensions.filter(field =>
        field !== roles.dimensions[pair.dimensionIndex]
      );
      assert.equal(
        view.provenance.fieldBindings.secondaryMeasure,
        otherMeasures[0]
      );
      assert.equal(
        view.provenance.fieldBindings.secondaryDimension,
        otherDimensions[0]
      );
    } finally {
      releaseTidyTuesdaySourceCache(dataset);
    }
  }
});

test("records unsupported dataset recipes as skips without preflight rejection loops", () => {
  const descriptors = generateScenarioDescriptors({ mode: "realistic", limit: 144 });
  const diagnostics = scenarioGenerationDiagnostics(descriptors);
  const dataset = "tt-global-temperatures";
  const recipe = "realistic-grouped-bars";
  assert.equal(descriptors.filter(value => value.factors.dataset === dataset).length, 72);
  assert.equal(diagnostics.skips.some(value =>
    value.dataset === dataset && value.recipe === recipe &&
    value.reason === "no-eligible-factor-domain"
  ), true);
  assert.equal(diagnostics.rejections.some(value =>
    value.dataset === dataset && value.recipe === recipe
  ), false);
  assert.equal(diagnostics.factorPairCount > 0, true);
  assert.equal(Object.values(diagnostics.factorValueOccurrences)
    .reduce((sum, count) => sum + count, 0) > descriptors.length, true);
});

test("observes lifecycle features from recipe-specific direct trace signatures", () => {
  const dataset = "tt-penguins";
  try {
    for (const recipe of REALISTIC_LIFECYCLE_SCENARIO_RECIPES) {
      if (!recipe.datasets.includes(dataset)) continue;
      const factors = Object.freeze({
        dataset,
        ...Object.fromEntries(Object.entries(recipe.factors)
          .map(([name, values]) => [name, values[0]]))
      });
      const program = recipe.build(factors);
      const expected = recipe.expectedDirectActionsFor(factors);
      const direct = new Set(program.trace.children.map(node => node.op));
      assert.equal(
        expected.every(operation => direct.has(operation)),
        true,
        `${recipe.id} direct signature`
      );
      const feature = `feature:${recipe.id.replace(/^realistic-action-/u, "")}`;
      assert.equal(recipe.observe(program, factors).includes(feature), true);

      const missingOperation = expected[0];
      const altered = {
        ...program,
        trace: {
          ...program.trace,
          children: program.trace.children.filter(node => node.op !== missingOperation)
        }
      };
      assert.equal(
        recipe.observe(altered, factors).includes(feature),
        false,
        `${recipe.id} must not self-confirm without ${missingOperation}`
      );
    }
  } finally {
    releaseTidyTuesdaySourceCache(dataset);
  }
});

test("uses full-source grouped aggregates, truthful samples, and median IQR intervals", () => {
  const dataset = "tt-penguins";
  try {
    const grouped = realisticGroupedView(dataset, { aggregate: "mean" });
    const bindings = grouped.provenance.fieldBindings;
    const expected = new Map();
    const retained = new Set(grouped.rows.map(row =>
      `${String(row.category)}\0${String(row.subgroup)}`
    ));
    for (const { row } of tidyTuesdaySourceEntries(dataset)) {
      const key = `${String(row[bindings.dimension])}\0${String(row[bindings.secondaryDimension])}`;
      if (!retained.has(key) || !Number.isFinite(row[bindings.measure])) continue;
      if (!expected.has(key)) expected.set(key, []);
      expected.get(key).push(row[bindings.measure]);
    }
    for (const row of grouped.rows) {
      const values = expected.get(`${String(row.category)}\0${String(row.subgroup)}`);
      assert.equal(row.count, values.length);
      assert.equal(row.value, values.reduce((sum, value) => sum + value, 0) / values.length);
    }
    assert.equal(grouped.provenance.sourceRowIndexes, undefined);
    assert.equal(
      grouped.provenance.transformations.at(-1).op,
      "category-subgroup-aggregate"
    );

    const sampleKinds = ["histogram", "box", "density"];
    for (const kind of sampleKinds) {
      const recipe = REALISTIC_ANALYSIS_RECIPES.find(value => value.id.includes(kind));
      const domains = recipe.factorsForDataset(dataset);
      const factors = Object.freeze({
        dataset,
        ...Object.fromEntries(Object.entries(domains).map(([name, values]) => [name, values[0]]))
      });
      const metadata = recipe.describe(factors);
      assert.match(metadata.title, /stratified sample \(n=\d+\)/u);
      assert.match(metadata.analysisQuestion, /sample/u);
      assert.equal(metadata.sampling.method, "deterministic-stratified-witness-sample");
      assert.equal(metadata.provenance.sourceRowIndexes.length, metadata.sampling.displayedRowCount);
    }

    const interval = realisticSummaryView(dataset, { aggregate: "median" });
    assert.equal(interval.rows.every(row =>
      row.center === row.value && row.lower < row.center && row.center < row.upper
    ), true);
  } finally {
    releaseTidyTuesdaySourceCache(dataset);
  }
});
