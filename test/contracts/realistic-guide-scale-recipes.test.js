import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import test from "node:test";

import { PALETTE_NAMES } from "../../src/grammar/palettes.js";
import { renderToSVG } from "../../src/renderers/svg.js";
import { assertAnalyticLayerIntegrity } from "../oracles/analytic-layer-integrity.js";
import { assertGraphicIntegrity } from "../oracles/graphic-integrity.js";
import { assertSvgIntegrity } from "../oracles/svg-integrity.js";
import { datasetDefinition } from "../support/datasets/catalog.js";
import { releaseTidyTuesdaySourceCache } from "../support/datasets/tidytuesday.js";
import { buildPublicOptionInventory } from "../support/scenarios/coverage-inventory.js";
import { literalValueKey } from "../support/scenarios/coverage-ledger.js";
import { runScenario } from "../support/scenarios/engine.js";
import {
  REALISTIC_GUIDE_SCALE_COUNTS,
  REALISTIC_GUIDE_SCALE_COVERAGE_SELECTIONS,
  REALISTIC_GUIDE_SCALE_EXPECTED_ACTIONS,
  REALISTIC_GUIDE_SCALE_INTERACTIONS,
  REALISTIC_GUIDE_SCALE_RECIPES,
  realisticGuideScaleWitnessFactors
} from "../support/scenarios/realistic-guide-scale-recipes.js";

const WITNESS_DATASETS = Object.freeze([
  "tt-tour-de-france-winners",
  "tt-london-marathon-winners",
  "tt-penguins"
]);
const SCALE_VOCABULARY_RECIPES = Object.freeze(
  REALISTIC_GUIDE_SCALE_RECIPES.filter(recipe =>
    recipe.id.startsWith("realistic-guide-scale-vocabulary-")
  )
);
const BASELINE_GAP_ACTIONS = Object.freeze([
  "editFacetHeaders",
  "editScale",
  "removeGrid",
  "removeRadialAxis",
  "removeThetaAxis"
]);
const EXPECTED_SELECTIONS = Object.freeze({
  "realistic-guide-scale-simple": 15,
  "realistic-guide-scale-cartesian-lifecycle": 50,
  "realistic-guide-scale-temporal-lifecycle": 30,
  "realistic-guide-scale-parallel-profiles": 10,
  "realistic-guide-scale-vocabulary-primary": 327,
  "realistic-guide-scale-vocabulary-secondary": 272,
  "realistic-guide-scale-polar-lifecycle": 15,
  "realistic-guide-scale-facet-policies": 15
});
const EXPECTED_TIER_SELECTIONS = Object.freeze({
  simple: 15,
  intermediate: 599,
  advanced: 105,
  composite: 15
});
const actionCards = JSON.parse(readFileSync(
  new URL("../../knowledge/action-cards.json", import.meta.url),
  "utf8"
));

function scheduledFactors(recipe, datasets = WITNESS_DATASETS) {
  const variants = new Map(recipe.factors.variant.map(variant => [variant.id, variant]));
  return Object.freeze(recipe.coverageSchedule.selectionVariantIds.map((variantId, index) => {
    const dataset = datasets[index % datasets.length];
    const domains = recipe.factorsForDataset(dataset);
    const variant = variants.get(variantId);
    assert.notEqual(domains, undefined, `${recipe.id} ${dataset} eligibility`);
    assert.notEqual(variant, undefined, `${recipe.id} ${variantId}`);
    return Object.freeze({
      dataset,
      fieldPair: domains.fieldPair[index % domains.fieldPair.length],
      variant
    });
  }));
}

function projectedFactors(recipe) {
  const variants = new Map(recipe.factors.variant.map(variant => [variant.id, variant]));
  return Object.freeze(recipe.coverageSchedule.selectionVariantIds.map((variantId, index) => {
    const variant = variants.get(variantId);
    assert.notEqual(variant, undefined, `${recipe.id} ${variantId}`);
    return Object.freeze({
      dataset: recipe.datasets[index % recipe.datasets.length],
      variant
    });
  }));
}

function assertTruthfulMetadata(recipe, factors, program, metadata, label) {
  const definition = datasetDefinition(factors.dataset);
  assert.equal(metadata.corpus, "tidytuesday", label);
  assert.deepEqual(metadata.sourceDatasetIds, [factors.dataset], label);
  assert.equal(metadata.provenance.sourceDataset, factors.dataset, label);
  assert.equal(
    metadata.provenance.sourceRowIndexBasis,
    "zero-based-data-row-in-pinned-csv",
    label
  );
  assert.ok(metadata.provenance.sourceRowCount > 0, label);
  assert.ok(metadata.provenance.sourceRowCount <= definition.rows, label);
  assert.match(metadata.provenance.sourceSelectionSha256, /^[a-f0-9]{64}$/u, label);
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
  assert.deepEqual(recipe.observe(program, factors), [], label);
  assert.deepEqual(metadata.activeFeatures, [], label);
  assert.equal(program.semanticSpec.title?.text, metadata.title, label);
  assert.equal(program.semanticSpec.title?.subtitle, metadata.analysisQuestion, label);

  const sampled = recipe.id.endsWith("parallel-profiles") ||
    recipe.id.endsWith("facet-policies");
  const samplePattern = /deterministic stratified sample \(n=\d+\/\d+ eligible\)/u;
  if (sampled) {
    assert.match(metadata.title, samplePattern, label);
    assert.match(metadata.analysisQuestion, samplePattern, label);
  } else {
    assert.doesNotMatch(metadata.title, /stratified sample/u, label);
  }
}

function groupPlansByDataset(plans) {
  const groups = new Map();
  for (const plan of plans) {
    const dataset = plan.factors.dataset;
    const values = groups.get(dataset) ?? [];
    values.push(plan);
    groups.set(dataset, values);
  }
  return groups;
}

function emptyStats() {
  return { occurrences: 0, datasets: new Set() };
}

function recordStats(stats, dataset) {
  stats.occurrences += 1;
  stats.datasets.add(dataset);
}

function finalProgramFingerprint(program) {
  return createHash("sha256")
    .update(JSON.stringify({
      semanticSpec: program.semanticSpec,
      graphicSpec: program.graphicSpec
    }))
    .digest("hex");
}

function programSpecs(program) {
  return Object.freeze({
    semanticSpec: program.semanticSpec,
    graphicSpec: program.graphicSpec
  });
}

function directEntries(program, operation) {
  return (program.trace.children ?? []).filter(entry => entry.op === operation);
}

function buildCoverageProjection(inventory) {
  const selectionPlans = REALISTIC_GUIDE_SCALE_RECIPES.flatMap(recipe =>
    projectedFactors(recipe).map((factors, selectionIndex) => Object.freeze({
      recipe,
      factors,
      selectionIndex
    }))
  );
  const relevantOptions = inventory.optionPaths.filter(option =>
    option.required && REALISTIC_GUIDE_SCALE_EXPECTED_ACTIONS.includes(option.action)
  );
  const facadeScaleTypeOptions = inventory.optionPaths.filter(option =>
    option.required && /(?:^|\.)scale\.type$|Scale\.type$/u.test(option.path)
  );
  const trackedOptions = [...new Map([
    ...relevantOptions,
    ...facadeScaleTypeOptions
  ].map(option => [option.id, option])).values()];
  const optionById = new Map(trackedOptions.map(option => [option.id, option]));
  const relevantLiterals = inventory.pathLiteralRequirements.filter(requirement =>
    relevantOptions.some(option => option.id === requirement.optionPath)
  );
  const facadeScaleTypeLiterals = inventory.pathLiteralRequirements.filter(requirement =>
    facadeScaleTypeOptions.some(option => option.id === requirement.optionPath)
  );
  const trackedLiterals = [...new Map([
    ...relevantLiterals,
    ...facadeScaleTypeLiterals
  ].map(requirement => [requirement.id, requirement])).values()];
  const optionsByAction = new Map();
  for (const option of trackedOptions) {
    const values = optionsByAction.get(option.action) ?? [];
    values.push(option);
    optionsByAction.set(option.action, values);
  }
  const literalsByOption = new Map();
  for (const requirement of trackedLiterals) {
    const values = literalsByOption.get(requirement.optionPath) ?? [];
    values.push(requirement);
    literalsByOption.set(requirement.optionPath, values);
  }
  const summarizeDirectEvidence = program => {
    const actions = new Set();
    const optionIds = new Set();
    const literalIds = new Set();
    for (const entry of program.trace.children ?? []) {
      actions.add(entry.op);
      for (const option of optionsByAction.get(entry.op) ?? []) {
        const values = nestedTraceValues(entry.args, option.path);
        if (values.length === 0) continue;
        optionIds.add(option.id);
        const valueKeys = new Set(values.map(literalValueKey).filter(value =>
          value !== undefined
        ));
        for (const requirement of literalsByOption.get(option.id) ?? []) {
          if (valueKeys.has(requirement.valueKey)) literalIds.add(requirement.id);
        }
      }
    }
    return Object.freeze({
      actions: Object.freeze([...actions]),
      optionIds: Object.freeze([...optionIds]),
      literalIds: Object.freeze([...literalIds])
    });
  };
  const actionStats = new Map(REALISTIC_GUIDE_SCALE_EXPECTED_ACTIONS.map(action =>
    [action, emptyStats()]
  ));
  const optionStats = new Map(trackedOptions.map(option => [option.id, emptyStats()]));
  const literalStats = new Map(trackedLiterals.map(requirement =>
    [requirement.id, emptyStats()]
  ));
  const interactionStats = new Map(REALISTIC_GUIDE_SCALE_INTERACTIONS.map(interaction =>
    [interaction.members.join("+"), emptyStats()]
  ));
  const evidenceByVariant = new Map();
  const actualPlans = new Map();
  for (const recipe of REALISTIC_GUIDE_SCALE_RECIPES) {
    const uniqueVariants = [...new Map(
      projectedFactors(recipe).map(factors => [factors.variant.id, factors.variant])
    ).values()];
    uniqueVariants.forEach((variant, variantIndex) => {
      // Keep every variant on an identical source/factor baseline. This makes
      // the final fingerprint comparison a genuine one-at-a-time variant test.
      const dataset = WITNESS_DATASETS[2];
      const domains = recipe.factorsForDataset(dataset);
      assert.notEqual(domains, undefined, `${recipe.id} ${dataset} eligibility`);
      const key = `${recipe.id}\0${variant.id}\0${dataset}`;
      actualPlans.set(key, Object.freeze({
        recipe,
        factors: Object.freeze({
          dataset,
          fieldPair: domains.fieldPair[0],
          variant
        }),
        selectionIndex: variantIndex,
        qualityWitness: false
      }));
    });
    const variant = uniqueVariants[0];
    WITNESS_DATASETS.forEach((dataset, datasetIndex) => {
      const domains = recipe.factorsForDataset(dataset);
      assert.notEqual(domains, undefined, `${recipe.id} ${dataset} QA eligibility`);
      const key = `${recipe.id}\0${variant.id}\0${dataset}`;
      const existing = actualPlans.get(key);
      actualPlans.set(key, Object.freeze({
        recipe,
        factors: Object.freeze({
          dataset,
          fieldPair: domains.fieldPair[datasetIndex % domains.fieldPair.length],
          variant
        }),
        selectionIndex: datasetIndex,
        qualityWitness: true,
        ...(existing === undefined ? {} : { selectionIndex: existing.selectionIndex })
      }));
    });
  }
  const byDataset = groupPlansByDataset([...actualPlans.values()]);
  let actualChartCount = 0;
  let qualityChartCount = 0;
  try {
    for (const [dataset, datasetPlans] of byDataset) {
      try {
        for (const { recipe, factors, selectionIndex, qualityWitness } of datasetPlans) {
          const label = `${recipe.id}-${selectionIndex}-${dataset}`;
          const program = recipe.build(factors);
          const metadata = recipe.describe(factors);
          assertTruthfulMetadata(recipe, factors, program, metadata, label);
          const factorEffects = recipe.observeFactors(program, factors);
          assert.deepEqual(
            new Set(factorEffects.map(effect => effect.factor)),
            new Set(["fieldPair", "variant"]),
            `${label} actual factor effects`
          );
          if (qualityWitness) {
            assertGraphicIntegrity(program, label);
            assertAnalyticLayerIntegrity(program, label);
            const svg = renderToSVG(program, {
              title: metadata.title,
              description: metadata.analysisQuestion
            });
            assertSvgIntegrity(svg, label);
            qualityChartCount += 1;
          }
          actualChartCount += 1;
          const variantKey = `${recipe.id}\0${factors.variant.id}`;
          if (!evidenceByVariant.has(variantKey)) {
            evidenceByVariant.set(variantKey, Object.freeze({
              ...summarizeDirectEvidence(program),
              fingerprint: finalProgramFingerprint(program),
              factorEffects
            }));
          }
        }
      } finally {
        releaseTidyTuesdaySourceCache(dataset);
      }
    }
  } finally {
    for (const dataset of byDataset.keys()) releaseTidyTuesdaySourceCache(dataset);
  }
  const actualActions = new Set([...evidenceByVariant.values()].flatMap(evidence =>
    evidence.actions
  ));
  for (const { recipe, factors } of selectionPlans) {
    const evidence = evidenceByVariant.get(`${recipe.id}\0${factors.variant.id}`);
    assert.notEqual(evidence, undefined, `${recipe.id} ${factors.variant.id} evidence`);
    const actions = new Set(evidence.actions);
    for (const action of actions) {
      const stats = actionStats.get(action);
      if (stats !== undefined) recordStats(stats, factors.dataset);
    }
    for (const optionId of evidence.optionIds) {
      recordStats(optionStats.get(optionId), factors.dataset);
    }
    for (const literalId of evidence.literalIds) {
      recordStats(literalStats.get(literalId), factors.dataset);
    }
    for (const interaction of REALISTIC_GUIDE_SCALE_INTERACTIONS) {
      const actions = interaction.members.map(member => member.slice("action:".length));
      if (actions.every(action => evidence.actions.includes(action))) {
        recordStats(interactionStats.get(interaction.members.join("+")), factors.dataset);
      }
    }
  }
  return Object.freeze({
    actualChartCount,
    projectedChartCount: selectionPlans.length,
    uniqueVariantCount: evidenceByVariant.size,
    qualityChartCount,
    finalFingerprintsByRecipe: new Map(REALISTIC_GUIDE_SCALE_RECIPES.map(recipe => [
      recipe.id,
      new Set([...evidenceByVariant]
        .filter(([key]) => key.startsWith(`${recipe.id}\0`))
        .map(([, evidence]) => evidence.fingerprint))
    ])),
    actualActions,
    actionStats,
    optionStats,
    literalStats,
    interactionStats,
    relevantOptions,
    relevantLiterals,
    facadeScaleTypeOptions,
    facadeScaleTypeLiterals,
    optionById
  });
}

function nestedTraceValues(args, path) {
  const summarized = Object.freeze({ summarized: true });
  let values = [args];
  for (const segment of path.split(".")) {
    const array = segment.endsWith("[]");
    const name = array ? segment.slice(0, -2) : segment;
    const next = [];
    for (const value of values) {
      if (value === null || typeof value !== "object" || Array.isArray(value)) continue;
      if (Object.hasOwn(value, name) && value[name] !== undefined) {
        if (array) {
          if (Array.isArray(value[name]) && value[name].length > 0) {
            next.push(...value[name]);
          }
        } else {
          next.push(value[name]);
        }
        continue;
      }
      const count = value[`${name}Count`];
      const type = value[`${name}Type`];
      if (!array && (
        Number.isInteger(count) && count > 0 ||
        typeof type === "string" && type.length > 0
      )) next.push(summarized);
    }
    values = next;
    if (values.length === 0) break;
  }
  return values;
}

function meetsMinimum(stats, occurrences = 5, datasets = 3) {
  return stats.occurrences >= occurrences && stats.datasets.size >= datasets;
}

test("defines a feasible 734-selection guide/scale coverage schedule", () => {
  assert.deepEqual(REALISTIC_GUIDE_SCALE_COUNTS, {
    simple: 1,
    intermediate: 2,
    advanced: 4,
    composite: 1
  });
  assert.equal(REALISTIC_GUIDE_SCALE_RECIPES.length, 8);
  assert.equal(new Set(REALISTIC_GUIDE_SCALE_RECIPES.map(recipe => recipe.id)).size, 8);
  assert.deepEqual(
    Object.fromEntries(REALISTIC_GUIDE_SCALE_RECIPES.map(recipe => [
      recipe.id,
      recipe.coverageSchedule.minimumSelections
    ])),
    EXPECTED_SELECTIONS
  );
  assert.deepEqual(
    Object.fromEntries(Object.keys(EXPECTED_TIER_SELECTIONS).map(tier => [
      tier,
      REALISTIC_GUIDE_SCALE_RECIPES
        .filter(recipe => recipe.complexity === tier)
        .reduce((sum, recipe) => sum + recipe.coverageSchedule.minimumSelections, 0)
    ])),
    EXPECTED_TIER_SELECTIONS
  );
  assert.equal(Object.values(EXPECTED_SELECTIONS).reduce((sum, value) => sum + value, 0), 734);
  assert.ok(EXPECTED_TIER_SELECTIONS.intermediate <= Math.floor(3_600 * 0.45));
  assert.ok(Math.max(...Object.values(EXPECTED_SELECTIONS)) <= Math.floor(3_600 * 0.15));
  assert.equal(
    new Set(REALISTIC_GUIDE_SCALE_RECIPES.flatMap(recipe => recipe.datasets)).size,
    50
  );

  for (const recipe of REALISTIC_GUIDE_SCALE_RECIPES) {
    assert.equal(recipe.suite, "realistic");
    assert.equal(recipe.generation, "balanced-per-dataset");
    assert.equal(recipe.datasets.length, 50, recipe.id);
    assert.ok(recipe.datasets.every(dataset => datasetDefinition(dataset).corpus === "tidytuesday"));
    assert.equal(
      recipe.coverageSchedule.selectionVariantIds.length,
      recipe.coverageSchedule.minimumSelections,
      recipe.id
    );
    assert.equal(recipe.coverageSchedule.assignment, "round-robin-datasets", recipe.id);
    assert.equal(
      Object.hasOwn(recipe.coverageSchedule, "minimumOccurrencesPerRequirement"),
      false,
      `${recipe.id} has no misleading global occurrence claim`
    );
    const scheduledCounts = new Map();
    for (const variantId of recipe.coverageSchedule.selectionVariantIds) {
      scheduledCounts.set(variantId, (scheduledCounts.get(variantId) ?? 0) + 1);
    }
    assert.deepEqual(
      recipe.coverageSchedule.variantRequirements,
      [...scheduledCounts].map(([variantId, minimumOccurrences]) => ({
        variantId,
        minimumOccurrences,
        minimumDatasets: Math.min(minimumOccurrences, 3)
      })),
      `${recipe.id} explicit per-variant schedule requirements`
    );
    assert.equal(
      recipe.coverageSchedule.minimumDatasetsPerRequirement,
      Math.max(...recipe.coverageSchedule.variantRequirements.map(value =>
        value.minimumDatasets
      )),
      `${recipe.id} engine dataset ceiling`
    );
    assert.equal(
      REALISTIC_GUIDE_SCALE_COVERAGE_SELECTIONS[recipe.id],
      recipe.coverageSchedule
    );
    assert.ok(realisticGuideScaleWitnessFactors(recipe, WITNESS_DATASETS[2]).length > 0);
    const variantIds = new Set(recipe.factors.variant.map(variant => variant.id));
    assert.ok(recipe.coverageSchedule.selectionVariantIds.every(id => variantIds.has(id)));
  }

  const scaleRecipes = SCALE_VOCABULARY_RECIPES;
  assert.deepEqual(scaleRecipes.map(recipe => recipe.factors.variant.length), [283, 272]);
  assert.deepEqual(scaleRecipes.map(recipe => recipe.coverageSchedule.minimumSelections), [327, 272]);
  const variants = new Map(scaleRecipes.flatMap(recipe =>
    recipe.factors.variant.map(variant => [variant.id, variant])
  ));
  assert.equal(variants.size, 555);
  const scheduledAssignments = scaleRecipes.flatMap(recipe => {
    const recipeVariants = new Map(recipe.factors.variant.map(variant => [variant.id, variant]));
    return recipe.coverageSchedule.selectionVariantIds.map((id, index) => Object.freeze({
      variant: recipeVariants.get(id),
      dataset: WITNESS_DATASETS[index % WITNESS_DATASETS.length]
    }));
  });
  const scheduled = scheduledAssignments.map(assignment => assignment.variant);
  assert.equal(scheduled.length, 599);
  assert.equal(new Set(scheduled.map(variant => variant.id)).size, 555);
  const paletteCounts = Object.fromEntries(PALETTE_NAMES.map(name => [name, 0]));
  const paletteDatasets = new Map(PALETTE_NAMES.map(name => [name, new Set()]));
  scheduledAssignments.forEach(({ variant, dataset }) => {
    if (variant.palette === undefined) return;
    paletteCounts[variant.palette] += 1;
    paletteDatasets.get(variant.palette).add(dataset);
  });
  assert.ok(Object.values(paletteCounts).every(count => count === 8));
  assert.ok([...paletteDatasets.values()].every(datasets => datasets.size === 3));
  for (const interpolate of [
    "rgb", "hsl", "hsl-long", "lab", "hcl", "hcl-long", "cubehelix", "cubehelix-long"
  ]) {
    assert.equal(scheduled.filter(variant => variant.interpolate === interpolate).length, 68);
  }
  for (const variant of variants.values()) {
    if (variant.palette !== undefined) continue;
    assert.equal(scheduled.filter(value => value.id === variant.id).length, 5, variant.id);
  }
  const scaleRequirements = scaleRecipes.flatMap(recipe =>
    recipe.coverageSchedule.variantRequirements
  );
  assert.equal(scaleRequirements.length, 555);
  assert.equal(scaleRequirements.filter(requirement =>
    requirement.minimumOccurrences === 1 && requirement.minimumDatasets === 1
  ).length, 544);
  assert.equal(scaleRequirements.filter(requirement =>
    requirement.minimumOccurrences === 5 && requirement.minimumDatasets === 3
  ).length, 11);
});

test("observes field-pair and variant factors with independent direct and final evidence", () => {
  const dataset = "tt-penguins";
  try {
    for (const recipe of REALISTIC_GUIDE_SCALE_RECIPES) {
      const domains = recipe.factorsForDataset(dataset);
      assert.notEqual(domains, undefined, `${recipe.id} eligibility`);
      assert.ok(domains.fieldPair.length >= 2, `${recipe.id} field-pair OAT domain`);
      const variant = domains.variant[0];
      const programs = domains.fieldPair.slice(0, 2).map(fieldPair => {
        const factors = Object.freeze({ dataset, fieldPair, variant });
        const program = recipe.build(factors);
        const effects = recipe.observeFactors(program, factors);
        assert.deepEqual(effects.map(effect => effect.factor).sort(), ["fieldPair", "variant"]);
        assert.ok(effects.every(effect =>
          effect.evidence.includes("direct:") && effect.evidence.includes("final:")
        ));
        assert.deepEqual(
          effects.map(effect => effect.value),
          [fieldPair, variant]
        );
        return program;
      });
      assert.notEqual(
        finalProgramFingerprint(programs[0]),
        finalProgramFingerprint(programs[1]),
        `${recipe.id} fieldPair is not inert`
      );
    }
  } finally {
    releaseTidyTuesdaySourceCache(dataset);
  }
});

test("keeps known video-game facets and complete-case parallel profiles nonempty", () => {
  const cases = [
    Object.freeze({
      dataset: "tt-transit-costs",
      recipe: REALISTIC_GUIDE_SCALE_RECIPES.find(recipe =>
        recipe.id.endsWith("parallel-profiles")
      ),
      variants: domains => domains.variant
    }),
    Object.freeze({
      dataset: "tt-us-tornadoes",
      recipe: REALISTIC_GUIDE_SCALE_RECIPES.find(recipe =>
        recipe.id.endsWith("parallel-profiles")
      ),
      variants: domains => domains.variant.filter(variant =>
        variant.id === "parallel-drop-row"
      )
    }),
    Object.freeze({
      dataset: "tt-video-games",
      recipe: REALISTIC_GUIDE_SCALE_RECIPES.find(recipe =>
        recipe.id.endsWith("facet-policies")
      ),
      variants: domains => domains.variant
    })
  ];
  for (const { dataset, recipe, variants } of cases) {
    try {
      const domains = recipe.factorsForDataset(dataset);
      assert.notEqual(domains, undefined, `${dataset} eligibility`);
      const materialFingerprints = new Set();
      for (const fieldPair of domains.fieldPair) {
        for (const variant of variants(domains)) {
          const factors = Object.freeze({ dataset, fieldPair, variant });
          const label = `${dataset}-${fieldPair.bindingId}-${variant.id}`;
          const program = recipe.build(factors);
          assertGraphicIntegrity(program, label);
          assertAnalyticLayerIntegrity(program, label);
          assert.equal(recipe.observeFactors(program, factors).length, 2, label);
          if (fieldPair === domains.fieldPair[0] && program.compositionSpec?.type === "facet") {
            const { children: _children, ...materialFacet } = program.compositionSpec;
            materialFingerprints.add(JSON.stringify(materialFacet));
          }
        }
      }
      if (recipe.id.endsWith("facet-policies")) {
        assert.equal(
          materialFingerprints.size,
          domains.variant.length,
          "facet variants have materially distinct final layout/resolution policies"
        );
      }
    } finally {
      releaseTidyTuesdaySourceCache(dataset);
    }
  }
});

test("filters transit parallel dimensions before its deterministic sample", () => {
  const dataset = "tt-transit-costs";
  const recipe = REALISTIC_GUIDE_SCALE_RECIPES.find(value =>
    value.id.endsWith("parallel-profiles")
  );
  try {
    const domains = recipe.factorsForDataset(dataset);
    const factors = Object.freeze({
      dataset,
      fieldPair: domains.fieldPair[0],
      variant: domains.variant.find(value => value.id === "parallel-drop-row")
    });
    const program = recipe.build(factors);
    const metadata = recipe.describe(factors);
    const rows = program.semanticSpec.datasets.find(value =>
      value.id === "analysisRows"
    ).values;
    const completeCases = metadata.provenance.transformations.find(value =>
      value.op === "filter-parallel-complete-cases"
    );
    const sample = metadata.provenance.transformations.find(value =>
      value.op === "witness-preserving-even-sample"
    );
    assert.equal(completeCases.eligibleRowCount, 71);
    assert.deepEqual(
      completeCases.fields,
      ["sourceRowIndex", "cost_km_millions", "country", "start_year"]
    );
    assert.equal(sample.eligibleRowCount, 71);
    assert.equal(sample.displayedRowCount, 71);
    assert.equal(rows.length, 71);
    assert.ok(rows.every(row =>
      Number.isFinite(row.sourceRowIndex) && Number.isFinite(row.value) &&
      Number.isFinite(row.orderNumeric) && typeof row.category === "string" &&
      row.category.length > 0
    ));
    assert.equal(program.graphicSpec.objects.profileLines.items.length, 71);
    assert.equal(metadata.provenance.sourceRowCount, 71);
    assert.equal(metadata.provenance.sourceRowIndexes.length, 71);
    assert.equal(
      metadata.provenance.sourceSelectionSha256,
      "9b67415db947e6a23d9ef5d51348e36a205bc7fa5d46c5957cfda4f78ff47565"
    );
    assert.match(metadata.title, /\(n=71\/71 eligible\)/u);
    assert.match(metadata.analysisQuestion, /\(n=71\/71 eligible\)/u);
    assertTruthfulMetadata(recipe, factors, program, metadata, "tt-transit-parallel-drop-row");
    assertGraphicIntegrity(program, "tt-transit-parallel-drop-row");
    assertAnalyticLayerIntegrity(program, "tt-transit-parallel-drop-row");
  } finally {
    releaseTidyTuesdaySourceCache(dataset);
  }
});

test("preflights every temporal display policy on every eligible TT dataset", () => {
  const recipe = REALISTIC_GUIDE_SCALE_RECIPES.find(value =>
    value.id.endsWith("temporal-lifecycle")
  );
  let builds = 0;
  for (const dataset of recipe.datasets) {
    try {
      const domains = recipe.factorsForDataset(dataset);
      if (domains === undefined) continue;
      domains.variant.forEach((variant, index) => {
        const factors = Object.freeze({
          dataset,
          fieldPair: domains.fieldPair[index % domains.fieldPair.length],
          variant
        });
        assert.doesNotThrow(() => runScenario({
          id: `temporal-preflight-${dataset}-${variant.id}`,
          recipe: recipe.id,
          factors
        }, { deterministic: false }));
        builds += 1;
      });
    } finally {
      releaseTidyTuesdaySourceCache(dataset);
    }
  }
  assert.equal(builds, 30 * 6);
});

test("keeps the meteorites long day labels sparse and non-overlapping", () => {
  const dataset = "tt-meteorites";
  const recipe = REALISTIC_GUIDE_SCALE_RECIPES.find(value =>
    value.id.endsWith("temporal-lifecycle")
  );
  try {
    const domains = recipe.factorsForDataset(dataset);
    const factors = Object.freeze({
      dataset,
      fieldPair: domains.fieldPair.find(value =>
        value.bindingId === "eligible:mass-by-name_type"
      ),
      variant: domains.variant.find(value => value.id === "day-on-x")
    });
    const result = runScenario({
      id: "tt-meteorites-mass-name-type-day-on-x",
      recipe: recipe.id,
      factors
    }, { deterministic: false, captureProgram(program) {
      const labels = program.graphicSpec.objects.xAxisLabels.items;
      assert.equal(labels.length, 2);
      assert.ok(labels.every(item => /^\d{4}-\d{2}-\d{2}$/u.test(item.properties.text)));
    } });
    assert.ok(result.directOperations.includes("editXAxisLabels"));
  } finally {
    releaseTidyTuesdaySourceCache(dataset);
  }
});

test("runs every non-sequential scale profile with branch-exact direct actions", () => {
  const recipe = SCALE_VOCABULARY_RECIPES.find(value => value.id.endsWith("primary"));
  const excluded = ["createGuides", "editLegend", "editLegendSymbols", "removeLegend"];
  let builds = 0;
  for (const dataset of WITNESS_DATASETS) {
    try {
      const domains = recipe.factorsForDataset(dataset);
      const variants = domains.variant.filter(value => value.type !== "sequential");
      assert.equal(variants.length, 11);
      variants.forEach((variant, index) => {
        const factors = Object.freeze({
          dataset,
          fieldPair: domains.fieldPair[index % domains.fieldPair.length],
          variant
        });
        const expected = recipe.expectedDirectActionsFor(factors);
        assert.deepEqual(excluded.filter(action => expected.includes(action)), []);
        const result = runScenario({
          id: `non-sequential-${dataset}-${variant.id}`,
          recipe: recipe.id,
          factors
        }, { deterministic: false });
        assert.deepEqual(excluded.filter(action => result.directOperations.includes(action)), []);
        builds += 1;
      });
    } finally {
      releaseTidyTuesdaySourceCache(dataset);
    }
  }
  assert.equal(builds, 3 * 11);
});

test("uses truthful record counts when a quantize share field has zero span", () => {
  const dataset = "tt-trash-wheel";
  const recipe = SCALE_VOCABULARY_RECIPES.find(value => value.id.endsWith("primary"));
  try {
    const domains = recipe.factorsForDataset(dataset);
    const factors = Object.freeze({
      dataset,
      fieldPair: domains.fieldPair.find(value =>
        value.bindingId === "eligible:GlassBottles-by-Name"
      ),
      variant: domains.variant.find(value => value.id === "color-quantize")
    });
    const program = recipe.build(factors);
    const metadata = recipe.describe(factors);
    const rows = program.semanticSpec.datasets.find(value =>
      value.id === "analysisRows"
    ).values;
    const color = program.semanticSpec.layers.find(value =>
      value.id === "points"
    ).encoding.color;
    const aggregate = metadata.provenance.transformations.find(value =>
      value.op === "group-aggregate"
    );

    assert.deepEqual(rows.map(row => Object.freeze({
      category: row.category,
      value: row.value,
      share: row.share,
      count: row.count
    })), [
      {
        category: "Mister Trash Wheel",
        value: 18,
        share: 0.5,
        count: 629
      },
      {
        category: "Professor Trash Wheel",
        value: 18,
        share: 0.5,
        count: 113
      }
    ]);
    assert.equal(color.field, "count");
    assert.equal(color.fieldType, "quantitative");
    assert.equal(color.scale, "color");
    assert.deepEqual(program.resolvedScales.color.domain, [113, 629]);
    assert.deepEqual(program.resolvedScales.color.thresholds, [242, 371, 500]);
    assert.equal(program.semanticSpec.guides.legend.color.title, "Source records per Name");
    assert.equal(
      program.graphicSpec.objects.colorLegendTitle.properties.text,
      "Source records per Name"
    );
    assert.equal(aggregate.aggregate, "median");
    assert.ok(aggregate.statistics.includes("count"));
    assert.equal(metadata.provenance.sourceRowCount, 742);
    assert.equal(
      metadata.provenance.sourceSelectionSha256,
      "c9967e4dcf62b8e91ace45d0213b4835be92f6450160741551f05a6485164505"
    );
    assert.deepEqual(
      recipe.observeFactors(program, factors).map(effect => effect.factor),
      ["fieldPair", "variant"]
    );
    assertTruthfulMetadata(recipe, factors, program, metadata, "trash-wheel-quantize-count");
    assertGraphicIntegrity(program, "trash-wheel-quantize-count");
    assertAnalyticLayerIntegrity(program, "trash-wheel-quantize-count");
    assertSvgIntegrity(renderToSVG(program, {
      title: metadata.title,
      description: metadata.analysisQuestion
    }), "trash-wheel-quantize-count");
  } finally {
    releaseTidyTuesdaySourceCache(dataset);
  }
});

test("preflights every quantitative non-sequential scale on every eligible field pair", () => {
  const recipe = SCALE_VOCABULARY_RECIPES.find(value => value.id.endsWith("primary"));
  const quantitativeTypes = new Set(["quantize", "quantile", "threshold"]);
  let fieldPairs = 0;
  let builds = 0;
  let countFallbacks = 0;
  for (const dataset of recipe.datasets) {
    try {
      const domains = recipe.factorsForDataset(dataset);
      assert.notEqual(domains, undefined, `${dataset} eligibility`);
      const variants = domains.variant.filter(variant => quantitativeTypes.has(variant.type));
      assert.equal(variants.length, 3, `${dataset} quantitative scale variants`);
      for (const fieldPair of domains.fieldPair) {
        fieldPairs += 1;
        for (const variant of variants) {
          const factors = Object.freeze({ dataset, fieldPair, variant });
          const label = `${dataset}-${fieldPair.bindingId}-${variant.id}`;
          const program = recipe.build(factors);
          const metadata = recipe.describe(factors);
          const rows = program.semanticSpec.datasets.find(value =>
            value.id === "analysisRows"
          ).values;
          const color = program.semanticSpec.layers.find(value =>
            value.id === "points"
          ).encoding.color;
          const shareValues = rows.map(row => row.share);
          const shareSpan = Math.max(...shareValues) - Math.min(...shareValues);
          const colorValues = rows.map(row => row[color.field]);

          assert.ok(Math.max(...colorValues) > Math.min(...colorValues), `${label} color span`);
          if (shareSpan === 0) {
            assert.equal(color.field, "count", `${label} truthful fallback`);
            assert.match(
              program.semanticSpec.guides.legend.color.title,
              /^Source records per /u,
              `${label} exposed fallback`
            );
            countFallbacks += 1;
          } else {
            assert.equal(color.field, "share", `${label} aggregate-share field`);
          }
          assert.ok(
            Math.max(...program.resolvedScales.color.domain) >
              Math.min(...program.resolvedScales.color.domain),
            `${label} resolved color domain`
          );
          assert.deepEqual(
            recipe.observeFactors(program, factors).map(effect => effect.factor),
            ["fieldPair", "variant"],
            `${label} factor evidence`
          );
          assertTruthfulMetadata(recipe, factors, program, metadata, label);
          assertGraphicIntegrity(program, label);
          assertAnalyticLayerIntegrity(program, label);
          assertSvgIntegrity(renderToSVG(program, {
            title: metadata.title,
            description: metadata.analysisQuestion
          }), label);
          builds += 1;
        }
      }
    } finally {
      releaseTidyTuesdaySourceCache(dataset);
    }
  }
  assert.equal(fieldPairs, 753);
  assert.equal(builds, 753 * 3);
  assert.equal(countFallbacks, 68 * 2);
});

test("replays the automatic cartesian guide identically after cloning, reordering, and a process boundary", () => {
  const dataset = "tt-global-temperatures";
  const recipe = REALISTIC_GUIDE_SCALE_RECIPES.find(value =>
    value.id.endsWith("cartesian-lifecycle")
  );
  try {
    const domains = recipe.factorsForDataset(dataset);
    const factors = Object.freeze({
      dataset,
      fieldPair: domains.fieldPair.find(value => value.bindingId === "curated:primary"),
      variant: domains.variant.find(value => value.id === "automatic")
    });
    assert.notEqual(factors.fieldPair, undefined, "global temperatures primary binding");
    assert.notEqual(factors.variant, undefined, "automatic cartesian variant");

    const baseline = recipe.build(factors);
    const clonedReplay = recipe.build(structuredClone(factors));
    assert.deepEqual(programSpecs(clonedReplay), programSpecs(baseline));

    for (const variant of [...domains.variant].reverse()) {
      recipe.build(structuredClone({ ...factors, variant }));
    }
    const reorderedReplay = recipe.build(structuredClone(factors));
    assert.deepEqual(programSpecs(reorderedReplay), programSpecs(baseline));

    const recipeModule = new URL(
      "../support/scenarios/realistic-guide-scale-recipes.js",
      import.meta.url
    ).href;
    const childSource = `
      import { readFileSync } from "node:fs";
      import { REALISTIC_GUIDE_SCALE_RECIPES } from ${JSON.stringify(recipeModule)};
      const factors = JSON.parse(readFileSync(0, "utf8"));
      const recipe = REALISTIC_GUIDE_SCALE_RECIPES.find(value =>
        value.id.endsWith("cartesian-lifecycle")
      );
      const program = recipe.build(factors);
      process.stdout.write(JSON.stringify({
        semanticSpec: program.semanticSpec,
        graphicSpec: program.graphicSpec
      }));
    `;
    const child = spawnSync(
      process.execPath,
      ["--input-type=module", "--eval", childSource],
      {
        input: JSON.stringify(factors),
        encoding: "utf8",
        maxBuffer: 16 * 1024 * 1024
      }
    );
    assert.equal(child.status, 0, child.stderr);
    assert.deepEqual(
      JSON.parse(child.stdout),
      JSON.parse(JSON.stringify(programSpecs(baseline)))
    );
  } finally {
    releaseTidyTuesdaySourceCache(dataset);
  }
});

test("keeps every cartesian guide variant stable after structured-clone replay across all 50 datasets", () => {
  const recipe = REALISTIC_GUIDE_SCALE_RECIPES.find(value =>
    value.id.endsWith("cartesian-lifecycle")
  );
  let datasets = 0;
  let replayedVariants = 0;
  for (const dataset of recipe.datasets) {
    try {
      const domains = recipe.factorsForDataset(dataset);
      assert.notEqual(domains, undefined, `${dataset} cartesian eligibility`);
      assert.equal(domains.variant.length, 10, `${dataset} cartesian variants`);
      for (const variant of [...domains.variant].reverse()) {
        const index = domains.variant.findIndex(value => value.id === variant.id);
        const factors = structuredClone({
          dataset,
          fieldPair: domains.fieldPair[index % domains.fieldPair.length],
          variant
        });
        const label = `${dataset} ${variant.id} structured-clone replay`;
        const program = recipe.build(factors);
        const createCanvas = directEntries(program, "createCanvas")[0].args;
        const plot = Object.freeze({
          left: createCanvas.margin.left,
          right: createCanvas.width - createCanvas.margin.right,
          top: createCanvas.margin.top,
          bottom: createCanvas.height - createCanvas.margin.bottom
        });
        const atValues = ["start", "center", "end"];
        const at = atValues[index % atValues.length];
        const expectedXTitle = at === "start"
          ? plot.left
          : at === "center" ? (plot.left + plot.right) / 2 : plot.right;
        const expectedYTitle = at === "start"
          ? plot.bottom
          : at === "center" ? (plot.top + plot.bottom) / 2 : plot.top;
        assert.equal(
          program.graphicSpec.objects.xAxisLine.properties.y1,
          index % 2 === 0 ? plot.top : plot.bottom,
          `${label} x position`
        );
        assert.equal(
          program.graphicSpec.objects.yAxisLine.properties.x1,
          index % 2 === 0 ? plot.right : plot.left,
          `${label} y position`
        );
        assert.equal(
          program.graphicSpec.objects.xAxisTitle.properties.x,
          expectedXTitle,
          `${label} x title alignment`
        );
        assert.equal(
          program.graphicSpec.objects.yAxisTitle.properties.y,
          expectedYTitle,
          `${label} y title alignment`
        );
        assert.deepEqual(
          recipe.observeFactors(program, factors).map(effect => effect.factor),
          ["fieldPair", "variant"],
          `${label} factor evidence`
        );
        replayedVariants += 1;
      }
      datasets += 1;
    } finally {
      releaseTidyTuesdaySourceCache(dataset);
    }
  }
  assert.equal(datasets, 50);
  assert.equal(replayedVariants, 50 * 10);
});

test("preserves whitespace through a realistic long wrapped title block", () => {
  const dataset = "tt-nurses";
  const recipe = REALISTIC_GUIDE_SCALE_RECIPES.find(value =>
    value.id.endsWith("cartesian-lifecycle")
  );
  try {
    const domains = recipe.factorsForDataset(dataset);
    const variant = domains.variant.find(value => value.id === "decimal-object");
    const candidates = domains.fieldPair.map(fieldPair => {
      const factors = Object.freeze({ dataset, fieldPair, variant });
      return Object.freeze({ factors, metadata: recipe.describe(factors) });
    });
    const selected = candidates.sort((left, right) =>
      right.metadata.title.length - left.metadata.title.length
    )[0];
    const program = recipe.build(selected.factors);
    const subtitle = program.graphicSpec.objects.chartSubtitle;
    const lines = subtitle.items.map(item => item.properties.text);
    const titleTrace = [...directEntries(program, "createTitle")].at(-1);
    const reconstructed = titleTrace.args.wrap === "character"
      ? lines.join("")
      : lines.join(" ");
    const normalize = value => value.replace(/\p{White_Space}+/gu, " ").trim();
    assert.ok(selected.metadata.title.length >= 40);
    assert.ok(selected.metadata.analysisQuestion.length >= 120);
    assert.ok(lines.length >= 2, "long subtitle is actually wrapped");
    assert.equal(normalize(reconstructed), normalize(selected.metadata.analysisQuestion));
    assert.equal(program.semanticSpec.title.text, selected.metadata.title);
    assertGraphicIntegrity(program, "tt-nurses-long-wrapped-title");
    assertAnalyticLayerIntegrity(program, "tt-nurses-long-wrapped-title");
    assertSvgIntegrity(renderToSVG(program, {
      title: selected.metadata.title,
      description: selected.metadata.analysisQuestion
    }), "tt-nurses-long-wrapped-title");
  } finally {
    releaseTidyTuesdaySourceCache(dataset);
  }
});

test("builds every reserved witness and directly satisfies guide/scale coverage", async () => {
  const inventory = await buildPublicOptionInventory(actionCards);
  const projection = buildCoverageProjection(inventory);
  assert.equal(projection.projectedChartCount, 734);
  assert.equal(projection.uniqueVariantCount, 582);
  assert.equal(projection.actualChartCount, 598);
  assert.equal(projection.qualityChartCount, 24);
  for (const recipe of REALISTIC_GUIDE_SCALE_RECIPES) {
    assert.equal(
      projection.finalFingerprintsByRecipe.get(recipe.id).size,
      recipe.factors.variant.length,
      `${recipe.id} advertised variants have distinct actual final fingerprints`
    );
  }
  const scaleFingerprintUnion = new Set(SCALE_VOCABULARY_RECIPES.flatMap(recipe =>
    [...projection.finalFingerprintsByRecipe.get(recipe.id)]
  ));
  assert.equal(scaleFingerprintUnion.size, 555, "all scale variants have unique actual finals");

  for (const action of REALISTIC_GUIDE_SCALE_EXPECTED_ACTIONS) {
    assert.ok(projection.actualActions.has(action), `${action} actual witness`);
    const stats = projection.actionStats.get(action);
    assert.ok(stats.occurrences >= 5, `${action} occurrences=${stats.occurrences}`);
    assert.ok(stats.datasets.size >= 3, `${action} datasets=${stats.datasets.size}`);
  }
  assert.deepEqual(
    BASELINE_GAP_ACTIONS.filter(action => projection.actionStats.get(action).occurrences === 0),
    []
  );

  for (const interaction of REALISTIC_GUIDE_SCALE_INTERACTIONS) {
    const actions = interaction.members.map(member => member.slice("action:".length));
    const stats = projection.interactionStats.get(interaction.members.join("+"));
    assert.ok(
      stats.occurrences >= interaction.minimumOccurrences,
      `${actions.join("+")} occurrences=${stats.occurrences}`
    );
    assert.ok(
      stats.datasets.size >= interaction.minimumDatasets,
      `${actions.join("+")} datasets=${stats.datasets.size}`
    );
  }

  const standaloneScaleOptions = projection.relevantOptions.filter(option =>
    ["createScale", "editScale"].includes(option.action)
  );
  const missingScaleOptions = standaloneScaleOptions.filter(option =>
    !meetsMinimum(projection.optionStats.get(option.id))
  );
  assert.deepEqual(missingScaleOptions.map(option => option.id), []);

  const standaloneScaleLiterals = projection.relevantLiterals.filter(requirement => {
    const option = projection.optionById.get(requirement.optionPath);
    return option !== undefined && ["createScale", "editScale"].includes(option.action);
  });
  const missingScaleLiterals = standaloneScaleLiterals.filter(requirement =>
    !meetsMinimum(projection.literalStats.get(requirement.id))
  );
  assert.deepEqual(missingScaleLiterals.map(requirement => requirement.id), []);

  const guideScalePaths = projection.relevantOptions.filter(option =>
    /(?:^|\.)scale(?:\.|$)/u.test(option.path)
  );
  const missingGuideScalePaths = guideScalePaths.filter(option =>
    projection.optionStats.get(option.id).occurrences === 0
  );
  assert.deepEqual(missingGuideScalePaths.map(option => option.id), []);

  const facadeScaleTypeWitnesses = [
    "option-value:encodeColor.scale.type=string:ordinal",
    "option-value:encodeR.scale.type=string:linear",
    "option-value:encodeShape.scale.type=string:ordinal",
    "option-value:encodeTheta.scale.type=string:linear",
    "option-value:encodeX.scale.type=string:band",
    "option-value:encodeX.scale.type=string:linear",
    "option-value:encodeY.scale.type=string:band",
    "option-value:encodeY.scale.type=string:linear"
  ];
  assert.deepEqual(facadeScaleTypeWitnesses.filter(id =>
    (projection.literalStats.get(id)?.occurrences ?? 0) === 0
  ), []);
});
