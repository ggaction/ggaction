import assert from "node:assert/strict";
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
  "realistic-guide-scale-vocabulary": 395,
  "realistic-guide-scale-polar-lifecycle": 15,
  "realistic-guide-scale-facet-policies": 15
});
const EXPECTED_TIER_SELECTIONS = Object.freeze({
  simple: 15,
  intermediate: 395,
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
      const dataset = WITNESS_DATASETS[variantIndex % WITNESS_DATASETS.length];
      const domains = recipe.factorsForDataset(dataset);
      assert.notEqual(domains, undefined, `${recipe.id} ${dataset} eligibility`);
      const key = `${recipe.id}\0${variant.id}\0${dataset}`;
      actualPlans.set(key, Object.freeze({
        recipe,
        factors: Object.freeze({
          dataset,
          fieldPair: domains.fieldPair[variantIndex % domains.fieldPair.length],
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
            evidenceByVariant.set(variantKey, Object.freeze(
              (program.trace.children ?? []).map(entry => Object.freeze({
                op: entry.op,
                args: entry.args
              }))
            ));
          }
        }
      } finally {
        releaseTidyTuesdaySourceCache(dataset);
      }
    }
  } finally {
    for (const dataset of byDataset.keys()) releaseTidyTuesdaySourceCache(dataset);
  }
  const actualActions = new Set([...evidenceByVariant.values()].flatMap(entries =>
    entries.map(entry => entry.op)
  ));
  for (const { recipe, factors } of selectionPlans) {
    const entries = evidenceByVariant.get(`${recipe.id}\0${factors.variant.id}`);
    assert.notEqual(entries, undefined, `${recipe.id} ${factors.variant.id} evidence`);
    const entriesByAction = new Map();
    for (const entry of entries) {
      const values = entriesByAction.get(entry.op) ?? [];
      values.push(entry);
      entriesByAction.set(entry.op, values);
    }
    for (const action of entriesByAction.keys()) {
      const stats = actionStats.get(action);
      if (stats !== undefined) recordStats(stats, factors.dataset);
    }
    for (const [action, actionEntries] of entriesByAction) {
      for (const option of optionsByAction.get(action) ?? []) {
        const optionTraceValues = actionEntries.flatMap(entry =>
          nestedTraceValues(entry.args, option.path)
        );
        if (optionTraceValues.length === 0) continue;
        recordStats(optionStats.get(option.id), factors.dataset);
        const valueKeys = new Set(optionTraceValues.map(literalValueKey).filter(value =>
          value !== undefined
        ));
        for (const requirement of literalsByOption.get(option.id) ?? []) {
          if (valueKeys.has(requirement.valueKey)) {
            recordStats(literalStats.get(requirement.id), factors.dataset);
          }
        }
      }
    }
    for (const interaction of REALISTIC_GUIDE_SCALE_INTERACTIONS) {
      const actions = interaction.members.map(member => member.slice("action:".length));
      if (actions.every(action => entriesByAction.has(action))) {
        recordStats(interactionStats.get(interaction.members.join("+")), factors.dataset);
      }
    }
  }
  return Object.freeze({
    actualChartCount,
    projectedChartCount: selectionPlans.length,
    uniqueVariantCount: evidenceByVariant.size,
    qualityChartCount,
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

test("defines a feasible 530-selection guide/scale coverage schedule", () => {
  assert.deepEqual(REALISTIC_GUIDE_SCALE_COUNTS, {
    simple: 1,
    intermediate: 1,
    advanced: 4,
    composite: 1
  });
  assert.equal(REALISTIC_GUIDE_SCALE_RECIPES.length, 7);
  assert.equal(new Set(REALISTIC_GUIDE_SCALE_RECIPES.map(recipe => recipe.id)).size, 7);
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
  assert.equal(Object.values(EXPECTED_SELECTIONS).reduce((sum, value) => sum + value, 0), 530);
  assert.ok(Math.max(...Object.values(EXPECTED_SELECTIONS)) <= 540);
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
    assert.equal(recipe.coverageSchedule.minimumOccurrencesPerRequirement, 5, recipe.id);
    assert.equal(recipe.coverageSchedule.minimumDatasetsPerRequirement, 3, recipe.id);
    assert.equal(
      REALISTIC_GUIDE_SCALE_COVERAGE_SELECTIONS[recipe.id],
      recipe.coverageSchedule
    );
    assert.ok(realisticGuideScaleWitnessFactors(recipe, WITNESS_DATASETS[2]).length > 0);
    const variantIds = new Set(recipe.factors.variant.map(variant => variant.id));
    assert.ok(recipe.coverageSchedule.selectionVariantIds.every(id => variantIds.has(id)));
  }

  const scaleRecipe = REALISTIC_GUIDE_SCALE_RECIPES.find(recipe =>
    recipe.id.endsWith("vocabulary")
  );
  assert.equal(scaleRecipe.factors.variant.length, 555);
  const variants = new Map(scaleRecipe.factors.variant.map(variant => [variant.id, variant]));
  const scheduled = scaleRecipe.coverageSchedule.selectionVariantIds.map(id => variants.get(id));
  const paletteCounts = Object.fromEntries(PALETTE_NAMES.map(name => [name, 0]));
  const paletteDatasets = new Map(PALETTE_NAMES.map(name => [name, new Set()]));
  scheduled.forEach((variant, index) => {
    if (variant.palette === undefined) return;
    paletteCounts[variant.palette] += 1;
    paletteDatasets.get(variant.palette).add(WITNESS_DATASETS[index % WITNESS_DATASETS.length]);
  });
  assert.ok(Object.values(paletteCounts).every(count => count === 5));
  assert.ok([...paletteDatasets.values()].every(datasets => datasets.size === 3));
  for (const interpolate of [
    "rgb", "hsl", "hsl-long", "lab", "hcl", "hcl-long", "cubehelix", "cubehelix-long"
  ]) {
    assert.ok(scheduled.filter(variant => variant.interpolate === interpolate).length >= 40);
  }
});

test("builds every reserved witness and directly satisfies guide/scale coverage", async () => {
  const inventory = await buildPublicOptionInventory(actionCards);
  const projection = buildCoverageProjection(inventory);
  assert.equal(projection.projectedChartCount, 530);
  assert.equal(projection.uniqueVariantCount, 106);
  assert.equal(projection.actualChartCount, 120);
  assert.equal(projection.qualityChartCount, 21);

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
