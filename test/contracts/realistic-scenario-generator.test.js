import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import test from "node:test";

import { assertAnalyticLayerIntegrity } from
  "../oracles/analytic-layer-integrity.js";
import { PALETTE_NAMES } from "../../src/grammar/palettes.js";
import { datasetDefinition } from "../support/datasets/catalog.js";
import { releaseTidyTuesdaySourceCache, tidyTuesdaySourceEntries } from
  "../support/datasets/tidytuesday.js";
import {
  buildScenario,
  generateScenarioDescriptors,
  REALISTIC_DATASET_QUOTAS,
  realisticScenarioDeclaredCapacityReport,
  runScenario,
  scenarioCoverageSchedulePlan,
  scenarioFactorCandidateDomainReport,
  scenarioGenerationDiagnostics,
  scenarioScheduleVariantPriorities
} from "../support/scenarios/engine.js";
import { REALISTIC_CARTESIAN_FACADE_COVERAGE_RECIPES } from
  "../support/scenarios/realistic-cartesian-facade-coverage-recipes.js";
import { REALISTIC_DIRECT_LIFECYCLE_COVERAGE_RECIPES } from
  "../support/scenarios/realistic-direct-lifecycle-coverage-recipes.js";
import { REALISTIC_ENCODING_COVERAGE_RECIPES } from
  "../support/scenarios/realistic-encoding-coverage-recipes.js";
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
import { REALISTIC_DATA_MARK_SCENARIO_RECIPES } from
  "../support/scenarios/realistic-data-mark-recipes.js";
import { REALISTIC_GUIDE_SCALE_RECIPES } from
  "../support/scenarios/realistic-guide-scale-recipes.js";
import {
  realisticDatasetIds,
  realisticDatasetRoles,
  realisticFieldPairDomain,
  realisticGroupedView,
  realisticLifecycleRows,
  realisticRecordView,
  realisticSummaryView
} from "../support/scenarios/realistic-data.js";
import { REALISTIC_ANALYSIS_COUNTS, REALISTIC_ANALYSIS_RECIPES } from
  "../support/scenarios/realistic-recipes.js";
import { REALISTIC_STATISTICAL_FACADE_COVERAGE_RECIPES } from
  "../support/scenarios/realistic-statistical-facade-coverage-recipes.js";

const EXPECTED_TIERS = Object.freeze({
  simple: 11,
  intermediate: 26,
  advanced: 28,
  composite: 7
});

function countBy(values, keyFor) {
  const counts = {};
  for (const value of values) {
    const key = keyFor(value);
    counts[key] = (counts[key] ?? 0) + 1;
  }
  return counts;
}

function actualFactorTargets(requirements) {
  const domains = new Map();
  for (const requirement of requirements) {
    const key = `${requirement.recipe}\0${requirement.factor}`;
    if (!domains.has(key)) domains.set(key, new Set());
    domains.get(key).add(requirement.valueKey);
  }
  const byTier = Object.fromEntries(
    Object.keys(EXPECTED_TIERS).map(complexity => [complexity, 0])
  );
  const byRecipe = {};
  for (const recipe of REALISTIC_SCENARIO_RECIPES) {
    const minimum = recipe.minimumSelections ??
      recipe.coverageSchedule?.minimumSelections ?? 5;
    const largestDomain = Math.max(0, ...[...domains]
      .filter(([key]) => key.startsWith(`${recipe.id}\0`))
      .map(([, values]) => values.size));
    const target = Math.max(minimum, largestDomain * 3);
    byRecipe[recipe.id] = target;
    byTier[recipe.complexity] += target;
  }
  return { byRecipe, byTier };
}

test("owns exactly fifty real TidyTuesday sources and the integrated realistic recipe set", () => {
  const datasets = realisticDatasetIds();
  assert.equal(datasets.length, 50);
  assert.equal(new Set(datasets).size, 50);
  assert.equal(datasets.every(id => datasetDefinition(id).corpus === "tidytuesday"), true);

  assert.equal(REALISTIC_SCENARIO_RECIPES.length, 111);
  assert.equal(new Set(REALISTIC_SCENARIO_RECIPES.map(recipe => recipe.id)).size, 111);
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
  ), { simple: 16, intermediate: 38, advanced: 41, composite: 16 });
  assert.equal(REALISTIC_SCENARIO_RECIPES.every(recipe =>
    recipe.suite === "realistic" && recipe.datasets.length > 0 &&
    recipe.datasets.every(id => datasets.includes(id))
  ), true);
  assert.equal(REALISTIC_REQUIRED_FEATURES.length > 0, true);
});

test("integrates every coverage recipe once with bounded tier capacity", () => {
  const expectedRegistry = [
    ...REALISTIC_ANALYSIS_RECIPES,
    ...REALISTIC_LIFECYCLE_SCENARIO_RECIPES,
    ...REALISTIC_DATA_MARK_SCENARIO_RECIPES,
    ...REALISTIC_GUIDE_SCALE_RECIPES,
    ...REALISTIC_CARTESIAN_FACADE_COVERAGE_RECIPES,
    ...REALISTIC_ENCODING_COVERAGE_RECIPES,
    ...REALISTIC_STATISTICAL_FACADE_COVERAGE_RECIPES,
    ...REALISTIC_DIRECT_LIFECYCLE_COVERAGE_RECIPES
  ];
  assert.deepEqual(
    REALISTIC_SCENARIO_RECIPES.map(recipe => recipe.id),
    expectedRegistry.map(recipe => recipe.id)
  );
  assert.deepEqual(REALISTIC_DATASET_QUOTAS, EXPECTED_TIERS);

  const report = realisticScenarioDeclaredCapacityReport();
  assert.equal(report.datasetCount, 50);
  assert.deepEqual(report.recipeCounts, {
    simple: 16,
    intermediate: 38,
    advanced: 41,
    composite: 16
  });
  assert.deepEqual(report.minimumSelections, {
    simple: 90,
    intermediate: 1_094,
    advanced: 1_345,
    composite: 90
  });
  assert.deepEqual(report.declaredFactorSelectionTargets, {
    simple: 179,
    intermediate: 1_278,
    advanced: 1_374,
    composite: 101
  });
  assert.deepEqual(report.capacity, {
    simple: 550,
    intermediate: 1_300,
    advanced: 1_400,
    composite: 350
  });
  assert.equal(Object.values(REALISTIC_DATASET_QUOTAS)
    .reduce((sum, count) => sum + count, 0), 72);
  assert.equal(Object.values(report.capacity)
    .reduce((sum, count) => sum + count, 0), 3_600);
  for (const complexity of Object.keys(EXPECTED_TIERS)) {
    assert.equal(
      report.minimumSelections[complexity] <= report.capacity[complexity],
      true,
      `${complexity} minimum-selection capacity`
    );
    assert.equal(
      report.declaredFactorSelectionTargets[complexity] <= report.capacity[complexity],
      true,
      `${complexity} factor-target capacity`
    );
  }
});

test("does not advertise impossible outliers for min-max whiskers", () => {
  const dataset = "tt-penguins";
  try {
    const minmax = REALISTIC_ANALYSIS_RECIPES.find(recipe =>
      recipe.id === "realistic-minmax-boxes"
    );
    const tukey = REALISTIC_ANALYSIS_RECIPES.find(recipe =>
      recipe.id === "realistic-category-boxes"
    );
    assert.equal(minmax.factorsForDataset(dataset).outliers, undefined);
    assert.deepEqual(tukey.factorsForDataset(dataset).outliers, [false, true]);
  } finally {
    releaseTidyTuesdaySourceCache(dataset);
  }
});

test("distributes the full palette vocabulary across bounded recipe domains", () => {
  const palettes = new Set();
  for (const recipe of REALISTIC_ANALYSIS_RECIPES) {
    if (recipe.factors.palette === undefined) continue;
    assert.equal(recipe.factors.palette.length, 4, recipe.id);
    recipe.factors.palette.forEach(value => palettes.add(value));
  }
  assert.deepEqual([...palettes].sort(), [...PALETTE_NAMES].sort());
});

test("composition alignment moves deliberately unequal child canvases", () => {
  const recipe = REALISTIC_ANALYSIS_RECIPES.find(candidate =>
    candidate.id === "realistic-paired-summary-dashboard"
  );
  const dataset = "tt-penguins";
  try {
    const domains = recipe.factorsForDataset(dataset);
    const baseline = { dataset };
    for (const [factor, domain] of Object.entries(domains)) baseline[factor] = domain[0];
    for (const compositionDirection of domains.compositionDirection) {
      const fingerprints = domains.compositionAlign.map(compositionAlign => {
        const factors = Object.freeze({ ...baseline, compositionDirection, compositionAlign });
        const program = recipe.build(factors);
        recipe.releaseResolution(factors);
        return createHash("sha256")
          .update(JSON.stringify(program.semanticSpec))
          .update("\0")
          .update(JSON.stringify(program.graphicSpec))
          .digest("hex");
      });
      assert.equal(new Set(fingerprints).size, domains.compositionAlign.length);
    }
  } finally {
    releaseTidyTuesdaySourceCache(dataset);
  }
});

test("composition children reserve room for long authentic titles", () => {
  const recipe = REALISTIC_ANALYSIS_RECIPES.find(candidate =>
    candidate.id === "realistic-paired-summary-dashboard"
  );
  const dataset = "tt-dog-breed-traits";
  try {
    const domains = recipe.factorsForDataset(dataset);
    const baseline = { dataset };
    for (const [factor, domain] of Object.entries(domains)) baseline[factor] = domain[0];
    const factors = Object.freeze({
      ...baseline,
      fieldPair: domains.fieldPair.find(value =>
        value.bindingId === "eligible:Affectionate With Family-by-Coat Length"
      ),
      aggregate: "median",
      gap: 16,
      padding: 4,
      compositionDirection: "vertical",
      compositionAlign: "start"
    });
    assertAnalyticLayerIntegrity(recipe.build(factors), `${dataset}-long-dashboard-title`);
    recipe.releaseResolution(factors);
  } finally {
    releaseTidyTuesdaySourceCache(dataset);
  }
});

test("only advertises positive-weight field bindings for base arc recipes", () => {
  const dataset = "tt-video-games";
  try {
    for (const recipeId of ["realistic-solid-pie", "realistic-padded-donut"]) {
      const recipe = REALISTIC_ANALYSIS_RECIPES.find(candidate => candidate.id === recipeId);
      const domains = recipe.factorsForDataset(dataset);
      assert.equal(domains.fieldPair.some(value =>
        value.bindingId === "eligible:average_playtime-by-developer"
      ), false, recipeId);
      const baseline = { dataset };
      for (const [factor, domain] of Object.entries(domains)) baseline[factor] = domain[0];
      for (const fieldPair of domains.fieldPair) {
        for (const aggregate of domains.aggregate) {
          const factors = Object.freeze({ ...baseline, fieldPair, aggregate });
          assertAnalyticLayerIntegrity(recipe.build(factors), `${recipeId}-${aggregate}`);
          recipe.releaseResolution(factors);
        }
      }
    }
  } finally {
    releaseTidyTuesdaySourceCache(dataset);
  }
});

test("only advertises materially varying bindings for summary comparisons", () => {
  const dataset = "tt-plastics";
  try {
    for (const recipeId of [
      "realistic-horizontal-summary-bars",
      "realistic-vertical-summary-bars",
      "realistic-bubble-summary",
      "realistic-reversed-summary-points",
      "realistic-ranked-labels",
      "realistic-laid-out-labels",
      "realistic-paired-summary-dashboard"
    ]) {
      const recipe = REALISTIC_ANALYSIS_RECIPES.find(candidate => candidate.id === recipeId);
      const domains = recipe.factorsForDataset(dataset);
      assert.equal(domains?.fieldPair.some(value =>
        value.bindingId === "eligible:hdpe-by-country"
      ) ?? false, false, recipeId);
    }
    const recipe = REALISTIC_ANALYSIS_RECIPES.find(candidate =>
      candidate.id === "realistic-horizontal-summary-bars"
    );
    const domains = recipe.factorsForDataset(dataset);
    const baseline = { dataset };
    for (const [factor, domain] of Object.entries(domains)) baseline[factor] = domain[0];
    for (const fieldPair of domains.fieldPair) {
      for (const aggregate of domains.aggregate) {
        const factors = Object.freeze({ ...baseline, fieldPair, aggregate });
        assertAnalyticLayerIntegrity(recipe.build(factors), `${fieldPair.bindingId}-${aggregate}`);
        recipe.releaseResolution(factors);
      }
    }
  } finally {
    releaseTidyTuesdaySourceCache(dataset);
  }
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
    const diagnostics = scenarioGenerationDiagnostics(descriptors);
    assert.equal(diagnostics.acceptedCandidates, 72);
    assert.equal(diagnostics.selectedDescriptors, 72);
    assert.equal(diagnostics.factorValueRequirements.length > 0, true);
    assert.equal(diagnostics.factorValueRequirements.every(requirement =>
      requirement.factor !== "fieldPair" &&
      requirement.requiredCount === 3 && requirement.minimumDatasets === 3
    ), true);
    assert.equal(diagnostics.factorValueRequirements.some(requirement =>
      requirement.recipe === "realistic-strip-points" &&
      requirement.factor === "titleAlign" && requirement.value === "left" &&
      requirement.eligibleDatasetCount === 1
    ), true);
    assert.equal(REALISTIC_SCENARIO_RECIPES.every(recipe =>
      recipe.coverageSchedule === undefined ||
      diagnostics.factorValueRequirements.every(requirement =>
        requirement.recipe !== recipe.id ||
        requirement.factor !== recipe.coverageSchedule.factor
      )
    ), true);
    assert.equal(diagnostics.missingFactorValueRequirements.length > 0, true);
    const requirement = diagnostics.factorValueRequirements.find(value =>
      value.fulfilledCount > 0 &&
      ["string", "number", "boolean"].includes(typeof value.value)
    );
    assert.notEqual(requirement, undefined);
    const matching = descriptors.filter(descriptor =>
      descriptor.recipe === requirement.recipe &&
      descriptor.factors[requirement.factor] === requirement.value
    );
    assert.equal(requirement.fulfilledCount, matching.length);
    assert.deepEqual(
      requirement.selectedDatasetIds,
      [...new Set(matching.map(descriptor => descriptor.factors.dataset))].sort()
    );

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
  assert.throws(() => realisticFieldPairDomain("tt-penguins", "typo-capability"));
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
  assert.equal(diagnostics.rejectedCandidates, 0);
  assert.equal(diagnostics.acceptedCandidates, descriptors.length);
  assert.equal(
    diagnostics.attemptedCandidates,
    diagnostics.acceptedCandidates + diagnostics.rejectedCandidates +
      diagnostics.duplicateCandidates
  );
  for (const integratedRecipe of [
    "realistic-maximal-ordered-bars",
    "realistic-maximal-binned-heatmap",
    "realistic-guide-scale-parallel-profiles",
    "realistic-action-bar-facade"
  ]) {
    assert.equal(
      descriptors.some(descriptor => descriptor.recipe === integratedRecipe),
      true,
      `${integratedRecipe} must survive two-dataset preflight`
    );
  }
  assert.equal(diagnostics.factorPairCount > 0, true);
  assert.equal(Object.values(diagnostics.factorValueOccurrences)
    .reduce((sum, count) => sum + count, 0) > descriptors.length, true);
  const actualTargets = actualFactorTargets(diagnostics.factorValueRequirements);
  const declaredCapacity = realisticScenarioDeclaredCapacityReport();
  assert.deepEqual(
    actualTargets.byRecipe,
    declaredCapacity.declaredFactorSelectionTargetsByRecipe
  );
  assert.deepEqual(
    actualTargets.byTier,
    declaredCapacity.declaredFactorSelectionTargets
  );
  assert.throws(() => scenarioGenerationDiagnostics([...descriptors]));
  const sampledFactors = descriptors
    .filter(descriptor =>
      descriptor.recipe === "realistic-guide-scale-vocabulary-primary"
    )
    .map(descriptor => Object.fromEntries(Object.entries(descriptor.factors)
      .filter(([name]) => !["dataset", "fieldPair"].includes(name))));
  assert.equal(sampledFactors.length >= 2, true);
  assert.equal(new Set(sampledFactors.map(value => JSON.stringify(value))).size >= 2, true);
});

test("advances past exhausted factor domains under strict scheduling", () => {
  const dataset = "tt-london-marathon-winners";
  const domain = scenarioFactorCandidateDomainReport(
    "realistic-direct-position-encoding-options",
    { dataset }
  );
  assert.equal(domain.eligibleFactorCases, 1);
  assert.equal(domain.selectedFactorCases.length, 1);
  assert.equal(domain.exhausted, true);
  assert.equal(domain.attemptedEligibleFactorCases, domain.eligibleFactorCases);

  const descriptors = generateScenarioDescriptors({
    mode: "realistic",
    limit: 216,
    strictScheduling: true
  });
  const composite = descriptors.filter(descriptor =>
    descriptor.factors.dataset === dataset && descriptor.metadata.complexity === "composite"
  );
  const diagnostics = scenarioGenerationDiagnostics(descriptors);

  assert.equal(composite.length, EXPECTED_TIERS.composite);
  assert.equal(new Set(composite.map(value => value.semanticFingerprint)).size, composite.length);
  assert.equal(diagnostics.rejections.some(value =>
    value.dataset === dataset && value.complexity === "composite"
  ), false);
  assert.equal(
    diagnostics.attemptedCandidates,
    diagnostics.acceptedCandidates + diagnostics.rejectedCandidates +
      diagnostics.duplicateCandidates
  );
});

test("prioritizes a scheduled variant on its last eligible dataset", () => {
  const priorities = scenarioScheduleVariantPriorities([
    {
      key: "flexible",
      variantId: "flexible",
      requiredCount: 5,
      minimumDatasets: 1,
      order: 0,
      eligibleDatasets: new Set(["current", "later"])
    },
    {
      key: "last-chance",
      variantId: "last-chance",
      requiredCount: 5,
      minimumDatasets: 1,
      order: 1,
      eligibleDatasets: new Set(["current"])
    }
  ], {
    dataset: "current",
    datasetIndexes: new Map([["current", 0], ["later", 1]]),
    fulfillment: new Map([["last-chance", {
      count: 4,
      datasets: new Set(["earlier"])
    }]])
  });

  assert.equal(priorities[0].variantId, "last-chance");
  assert.equal(priorities[0].deadlineUrgency, 1);
  assert.equal(priorities[0].occurrenceDeficit, 1);
  assert.equal(priorities[1].variantId, "flexible");
  assert.equal(priorities[1].deadlineUrgency, 0);
  assert.equal(priorities[1].occurrenceDeficit, 5);
});

test("plans every heatmap schedule variant across eligible real datasets", () => {
  const plan = scenarioCoverageSchedulePlan(
    "realistic-statistical-facade-coverage-heatmap",
    { datasets: realisticDatasetIds() }
  );

  assert.equal(plan.complete, true);
  assert.equal(plan.assignments.length, 135);
  assert.equal(plan.requirements.length, 27);
  assert.deepEqual(plan.unavailable, []);
  assert.deepEqual(plan.exhausted, []);
  assert.equal(plan.requirements.every(requirement =>
    requirement.scheduledCount === 5 &&
    requirement.fulfilledCount === 5 &&
    requirement.minimumDatasets === 3 &&
    requirement.fulfilledDatasets >= 3 &&
    requirement.missingCount === 0 &&
    requirement.missingDatasets === 0
  ), true);

  const temporalVariantIds = new Set([
    "heatmap-temporal-color",
    "heatmap-temporal-soft",
    "heatmap-temporal-reversed"
  ]);
  const temporalRequirements = plan.requirements.filter(requirement =>
    temporalVariantIds.has(requirement.variantId)
  );
  assert.equal(temporalRequirements.length, 3);
  assert.equal(temporalRequirements.every(requirement =>
    requirement.eligibleDatasetCount === 31 &&
    requirement.fulfilledCount === 5 &&
    requirement.fulfilledDatasets >= 3
  ), true);
  for (const assignment of plan.assignments.filter(value =>
    temporalVariantIds.has(value.variantId)
  )) {
    try {
      assert.equal(
        realisticDatasetRoles(assignment.dataset).temporal.length > 0,
        true,
        `${assignment.variantId}-${assignment.dataset}`
      );
    } finally {
      releaseTidyTuesdaySourceCache(assignment.dataset);
    }
  }
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
    const sampled = REALISTIC_LIFECYCLE_SCENARIO_RECIPES.find(recipe =>
      recipe.id === "realistic-action-scatter-facade"
    );
    const sampledFactors = Object.freeze({
      dataset,
      ...Object.fromEntries(Object.entries(sampled.factors)
        .map(([name, values]) => [name, values[0]]))
    });
    const metadata = sampled.describe(sampledFactors);
    assert.equal(metadata.sampling.method, "deterministic-stratified-witness-sample");
    assert.match(metadata.analysisQuestion, /deterministic stratified sample/u);
    assert.equal(
      Object.values(sampled.build(sampledFactors).graphicSpec.objects).some(object =>
        object.type === "text" && object.properties?.text === metadata.title
      ),
      true
    );
  } finally {
    releaseTidyTuesdaySourceCache(dataset);
  }
});

test("keeps derived-data regression viable after realistic subgroup filtering", () => {
  const dataset = "tt-london-marathon-winners";
  const recipe = REALISTIC_LIFECYCLE_SCENARIO_RECIPES.find(value =>
    value.id === "realistic-action-derived-data"
  );
  const factors = Object.freeze({
    dataset,
    filter: "oneOf",
    order: "ascending",
    frame: 2,
    unit: "month",
    interval: "mean-stderr",
    regression: "polynomial"
  });
  try {
    assert.doesNotThrow(() => runScenario({
      id: "realistic-derived-data-filtered-regression",
      recipe: recipe.id,
      factors
    }, { deterministic: false }));
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

  const countDataset = "tt-us-tornadoes";
  try {
    const first = realisticGroupedView(countDataset, {
      aggregate: "count",
      measureIndex: 0,
      dimensionIndex: 0
    });
    const second = realisticGroupedView(countDataset, {
      aggregate: "count",
      measureIndex: 1,
      dimensionIndex: 0
    });
    assert.deepEqual(first.rows, second.rows);
    assert.deepEqual(
      first.provenance.transformations[0].fields,
      [first.provenance.fieldBindings.dimension, first.provenance.fieldBindings.secondaryDimension]
    );
  } finally {
    releaseTidyTuesdaySourceCache(countDataset);
  }
});

test("preserves exact lifecycle contributor lineage and sampling disclosures", () => {
  const dataset = "tt-penguins";
  try {
    const records = realisticRecordView(dataset, {
      includeSecondaryDimension: true,
      deriveSubgroup: true
    });
    const path = realisticLifecycleRows(dataset, "path");
    assert.equal(path.rows.some(row => Object.hasOwn(row, "sourceRowIndex")), false);
    assert.equal(path.provenance.sourceRowIndexes.length, path.provenance.sourceRowCount);
    assert.equal(path.provenance.transformations.some(operation =>
      operation.op === "duplicate-position-mean"
    ), true);
    assert.equal(path.sample.outputRowCount, path.rows.length);
    assert.equal(path.sample.displayedRowCount, path.provenance.sourceRowCount);

  } finally {
    releaseTidyTuesdaySourceCache(dataset);
  }

  const temporalDataset = "tt-meteorites";
  try {
    const records = realisticRecordView(temporalDataset, {
      includeSecondaryDimension: true,
      deriveSubgroup: true
    });
    const temporal = realisticLifecycleRows(temporalDataset, "temporal");
    const expectedTemporalIndexes = records.rows.filter(row =>
      row.time !== undefined && Number.isFinite(Date.parse(row.time))
    ).map(row => row.sourceRowIndex).sort((left, right) => left - right);
    assert.deepEqual(temporal.provenance.sourceRowIndexes, expectedTemporalIndexes);
    assert.equal(temporal.provenance.sourceRowCount, 159);
    assert.equal(temporal.provenance.sourceRowIndexes.includes(37), false);
    assert.equal(temporal.provenance.transformations.some(operation =>
      operation.op === "filter-valid-temporal"
    ), true);
  } finally {
    releaseTidyTuesdaySourceCache(temporalDataset);
  }

  const mixedSourceDataset = "tt-video-games";
  try {
    const source = new Map(tidyTuesdaySourceEntries(mixedSourceDataset).map(entry => [
      entry.sourceRowIndex,
      entry.row
    ]));
    for (const kind of ["path", "style"]) {
      const view = realisticLifecycleRows(mixedSourceDataset, kind);
      const projection = view.provenance.transformations.find(operation =>
        operation.op === "project-real-analysis-pair"
      );
      const filter = view.provenance.transformations.find(operation =>
        operation.op === "filter-valid-analysis-x"
      );
      const xField = projection?.x ?? filter?.field;
      assert.equal(xField, "price");
      const sourceValues = new Set(view.provenance.sourceRowIndexes.map(index =>
        source.get(index)[xField]
      ));
      assert.equal(view.rows.every(row => sourceValues.has(row.x)), true, kind);
      if (kind === "path") {
        assert.equal(view.rows.every(row => row.id.startsWith("path-aggregate-")), true);
      }
    }
  } finally {
    releaseTidyTuesdaySourceCache(mixedSourceDataset);
  }
});
