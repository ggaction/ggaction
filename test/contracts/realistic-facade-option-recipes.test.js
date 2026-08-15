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
import { literalValueKey } from "../support/scenarios/coverage-ledger.js";
import {
  REALISTIC_FACADE_OPTION_COUNTS,
  REALISTIC_FACADE_OPTION_EXPECTED_ACTIONS,
  REALISTIC_FACADE_OPTION_RECIPES,
  realisticFacadeOptionCacheSnapshot,
  realisticFacadeOptionCoverageFactors,
  realisticFacadeOptionWitnessFactors
} from "../support/scenarios/realistic-facade-option-recipes.js";

const actionCards = JSON.parse(readFileSync(
  new URL("../../knowledge/action-cards.json", import.meta.url),
  "utf8"
));
const inventoryPromise = buildPublicOptionInventory(actionCards);
const SCALE_ROOTS = Object.freeze({
  createBoxPlot: Object.freeze(["x.scale", "y.scale"]),
  createGradientPlot: Object.freeze(["x.scale", "y.scale"]),
  createViolinPlot: Object.freeze(["x.scale", "y.scale", "color.scale"]),
  createHeatmap: Object.freeze(["x.scale", "y.scale", "color.scale"]),
  createHistogram: Object.freeze(["xScale", "yScale", "color.scale"])
});
const EXPECTED_INVENTORY_BY_ACTION = Object.freeze({
  createBoxPlot: Object.freeze({ paths: 30, literals: 32, typeLiterals: 12, diversity: 0 }),
  createGradientPlot: Object.freeze({ paths: 30, literals: 32, typeLiterals: 12, diversity: 0 }),
  createViolinPlot: Object.freeze({ paths: 39, literals: 35, typeLiterals: 13, diversity: 2 }),
  createHeatmap: Object.freeze({ paths: 42, literals: 51, typeLiterals: 17, diversity: 2 }),
  createHistogram: Object.freeze({ paths: 32, literals: 32, typeLiterals: 10, diversity: 2 })
});

function targetOption(option) {
  return (SCALE_ROOTS[option.action] ?? []).some(root =>
    option.path === root || option.path.startsWith(`${root}.`)
  );
}

function targetInventory(inventory) {
  const options = inventory.optionPaths.filter(option => option.required && targetOption(option));
  const optionIds = new Set(options.map(option => option.id));
  return Object.freeze({
    options,
    literals: inventory.pathLiteralRequirements.filter(requirement =>
      optionIds.has(requirement.optionPath)
    ),
    diversity: inventory.pathDiversityRequirements.filter(requirement =>
      optionIds.has(requirement.optionPath)
    )
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

function emptyStats() {
  return { occurrences: 0, datasets: new Set() };
}

function record(stats, dataset) {
  stats.occurrences += 1;
  stats.datasets.add(dataset);
}

function meetsMinimum(stats) {
  return stats.occurrences >= 5 && stats.datasets.size >= 3;
}

function directEntries(program, operation) {
  return (program.trace.children ?? []).filter(entry => entry.op === operation);
}

function configuredScales(action, args) {
  if (action === "createHistogram") {
    return [args.xScale, args.yScale, args.color?.scale].filter(Boolean);
  }
  return [args.x?.scale, args.y?.scale, args.color?.scale].filter(Boolean);
}

function fingerprint(program) {
  return createHash("sha256")
    .update(JSON.stringify(program.semanticSpec))
    .update("\0")
    .update(JSON.stringify(program.graphicSpec))
    .digest("hex");
}

function assertMetadata(recipe, factors, program, metadata, label) {
  const definition = datasetDefinition(factors.dataset);
  assert.equal(metadata.corpus, "tidytuesday", label);
  assert.equal(definition.corpus, "tidytuesday", label);
  assert.deepEqual(metadata.sourceDatasetIds, [factors.dataset], label);
  assert.equal(metadata.provenance.sourceDataset, factors.dataset, label);
  assert.equal(
    metadata.provenance.sourceRowIndexBasis,
    "zero-based-data-row-in-pinned-csv",
    label
  );
  assert.ok(metadata.provenance.sourceRowCount > 0, label);
  assert.ok(metadata.provenance.minimumSourceRow >= 0, label);
  assert.ok(metadata.provenance.maximumSourceRow < definition.rows, label);
  assert.ok(
    metadata.provenance.minimumSourceRow <= metadata.provenance.maximumSourceRow,
    label
  );
  assert.match(metadata.provenance.sourceSelectionSha256, /^[a-f0-9]{64}$/u, label);
  assert.ok(metadata.provenance.sourceRowIndexes.length <= 160, label);
  assert.equal(
    new Set(metadata.provenance.sourceRowIndexes).size,
    metadata.provenance.sourceRowIndexes.length,
    label
  );
  assert.equal(
    metadata.provenance.sourceRowIndexes.length,
    metadata.provenance.sourceRowCount,
    label
  );
  assert.ok(metadata.sourceFields.length >= 2, label);
  assert.ok(metadata.sourceFields.every(field => definition.fields[field.field] !== undefined), label);
  assert.deepEqual(
    metadata.dataOperations,
    metadata.provenance.transformations.map(transformation => transformation.op),
    label
  );
  assert.ok(metadata.dataOperations.includes("positive-domain-shift"), label);
  assert.ok(metadata.dataOperations.includes("source-selection-order-rank"), label);
  assert.deepEqual(metadata.activeFeatures, [], label);
  assert.deepEqual(recipe.observe(program, factors), [], label);
  assert.equal(program.semanticSpec.title?.text, metadata.title, label);
  assert.equal(program.semanticSpec.title?.subtitle, metadata.analysisQuestion, label);
}

function graphicTextItems(object) {
  if (object?.type !== "text") return [];
  if (Array.isArray(object.items)) return object.items.map(item => item.properties);
  return object.properties === undefined ? [] : [object.properties];
}

function assertVisibleFacadeTitle(program, metadata, label) {
  assert.deepEqual({
    maxWidth: program.titleConfig?.maxWidth,
    wrap: program.titleConfig?.wrap,
    lineHeight: program.titleConfig?.lineHeight
  }, { maxWidth: 880, wrap: "word", lineHeight: 26 }, label);
  const titleItems = graphicTextItems(program.graphicSpec.objects.chartTitle);
  const subtitleItems = graphicTextItems(program.graphicSpec.objects.chartSubtitle);
  assert.ok(titleItems.length >= 1, `${label} visible title`);
  assert.ok(subtitleItems.length >= 1, `${label} visible subtitle`);
  assert.equal(titleItems.map(item => item.text).join(" "), metadata.title, label);
  assert.equal(
    subtitleItems.map(item => item.text).join(" "),
    metadata.analysisQuestion,
    label
  );
  for (const item of [...titleItems, ...subtitleItems]) {
    assert.ok(Number.isFinite(item.x) && item.x >= 0 && item.x <= 1_200, label);
    assert.ok(Number.isFinite(item.y) && item.y >= 0 && item.y < 110, label);
  }
}

function assertResolvedScaleEvidence(program, action, direct, label) {
  const semanticById = new Map(program.semanticSpec.scales.map(scale => [scale.id, scale]));
  const scales = configuredScales(action, direct.args);
  assert.ok(scales.length >= 2, label);
  for (const scale of scales) {
    assert.equal(typeof scale.id, "string", label);
    assert.equal(typeof scale.type, "string", label);
    assert.equal(semanticById.get(scale.id)?.type, scale.type, `${label} semantic ${scale.id}`);
    assert.equal(program.resolvedScales[scale.id]?.type, scale.type, `${label} resolved ${scale.id}`);
    assert.equal(Object.hasOwn(scale, "unknown"), false, `${label} non-point unknown`);
  }
}

function groupByDataset(plans) {
  const groups = new Map();
  for (const plan of plans) {
    const values = groups.get(plan.factors.dataset) ?? [];
    values.push(plan);
    groups.set(plan.factors.dataset, values);
  }
  return groups;
}

let projectionPromise;

async function buildProjection() {
  if (projectionPromise !== undefined) return projectionPromise;
  projectionPromise = (async () => {
    const inventory = await inventoryPromise;
    const target = targetInventory(inventory);
    const optionsByAction = new Map();
    for (const option of target.options) {
      const values = optionsByAction.get(option.action) ?? [];
      values.push(option);
      optionsByAction.set(option.action, values);
    }
    const literalsByOption = new Map();
    for (const requirement of target.literals) {
      const values = literalsByOption.get(requirement.optionPath) ?? [];
      values.push(requirement);
      literalsByOption.set(requirement.optionPath, values);
    }
    const optionStats = new Map(target.options.map(option => [option.id, emptyStats()]));
    const literalStats = new Map(target.literals.map(requirement => [requirement.id, emptyStats()]));
    const valueStats = new Map(target.options.map(option => [option.id, new Map()]));
    const variantStats = new Map();
    const plans = REALISTIC_FACADE_OPTION_RECIPES.flatMap(recipe =>
      realisticFacadeOptionCoverageFactors(recipe).map(factors => ({ recipe, factors }))
    );
    let chartCount = 0;
    for (const [dataset, datasetPlans] of groupByDataset(plans)) {
      try {
        for (const { recipe, factors } of datasetPlans) {
          const action = recipe.expectedDirectActions[0];
          const label = `${recipe.id}-${dataset}-${factors.variant.id}`;
          const program = recipe.build(factors);
          const metadata = recipe.describe(factors);
          const direct = directEntries(program, action);
          assert.equal(direct.length, 1, `${label} direct root action`);
          assertResolvedScaleEvidence(program, action, direct[0], label);
          assertMetadata(recipe, factors, program, metadata, label);
          assert.deepEqual(
            new Set(recipe.observeFactors(program, factors).map(effect => effect.factor)),
            new Set(["fieldPair", "variant"]),
            `${label} independently observed factors`
          );
          assertGraphicIntegrity(program, label);
          assertAnalyticLayerIntegrity(program, label);
          assertSvgIntegrity(renderToSVG(program, {
            title: metadata.title,
            description: metadata.analysisQuestion
          }), label);

          const variantKey = `${recipe.id}\0${factors.variant.id}`;
          const variant = variantStats.get(variantKey) ?? emptyStats();
          record(variant, dataset);
          variantStats.set(variantKey, variant);

          for (const option of optionsByAction.get(action) ?? []) {
            const traceValues = nestedTraceValues(direct[0].args, option.path);
            if (traceValues.length === 0) continue;
            record(optionStats.get(option.id), dataset);
            const observedKeys = new Set(traceValues.map(literalValueKey).filter(Boolean));
            for (const valueKey of observedKeys) {
              const statsByValue = valueStats.get(option.id);
              const stats = statsByValue.get(valueKey) ?? emptyStats();
              record(stats, dataset);
              statsByValue.set(valueKey, stats);
            }
            for (const requirement of literalsByOption.get(option.id) ?? []) {
              if (observedKeys.has(requirement.valueKey)) {
                record(literalStats.get(requirement.id), dataset);
              }
            }
          }
          chartCount += 1;
        }
      } finally {
        releaseTidyTuesdaySourceCache(dataset);
      }
    }
    return Object.freeze({
      target,
      optionStats,
      literalStats,
      valueStats,
      variantStats,
      chartCount,
      datasetCount: new Set(plans.map(plan => plan.factors.dataset)).size
    });
  })();
  return projectionPromise;
}

test("defines five integration-ready facade recipes and a 235-chart selection schedule", () => {
  assert.deepEqual(REALISTIC_FACADE_OPTION_COUNTS, {
    recipes: 5,
    advanced: 4,
    intermediate: 1,
    minimumSelections: 235,
    advancedSelections: 210,
    intermediateSelections: 25
  });
  assert.deepEqual(
    REALISTIC_FACADE_OPTION_RECIPES.map(recipe => recipe.expectedDirectActions[0]),
    REALISTIC_FACADE_OPTION_EXPECTED_ACTIONS
  );
  assert.equal(new Set(REALISTIC_FACADE_OPTION_RECIPES.map(recipe => recipe.id)).size, 5);
  for (const recipe of REALISTIC_FACADE_OPTION_RECIPES) {
    assert.equal(recipe.suite, "realistic", recipe.id);
    assert.equal(recipe.generation, "balanced-per-dataset", recipe.id);
    assert.equal(recipe.enforceFactorEffects, true, recipe.id);
    assert.equal(recipe.datasets.length, 50, recipe.id);
    assert.ok(recipe.datasets.every(dataset => datasetDefinition(dataset).corpus === "tidytuesday"));
    assert.equal(recipe.minimumSelections, recipe.coverageSchedule.minimumSelections, recipe.id);
    assert.equal(recipe.coverageSchedule.minimumDatasetsPerRequirement, 3, recipe.id);
    assert.ok(recipe.coverageSchedule.variantRequirements.every(requirement =>
      requirement.minimumOccurrences === 5 && requirement.minimumDatasets === 3
    ), recipe.id);
  }
});

test("bounds facade data caches while preserving deterministic recomputation", () => {
  const recipe = REALISTIC_FACADE_OPTION_RECIPES[0];
  const factors = realisticFacadeOptionWitnessFactors(recipe, "tt-penguins")[0];
  const initialProgram = recipe.build(factors);
  const initialMetadata = recipe.describe(factors);
  const before = realisticFacadeOptionCacheSnapshot();
  const churnDatasets = recipe.datasets.filter(dataset => dataset !== factors.dataset).slice(0, 7);
  try {
    for (const dataset of churnDatasets) {
      for (const candidate of REALISTIC_FACADE_OPTION_RECIPES) {
        const witness = realisticFacadeOptionWitnessFactors(candidate, dataset)[0];
        if (witness !== undefined) candidate.build(witness);
      }
    }
    const after = realisticFacadeOptionCacheSnapshot();
    assert.ok(after.transformedViews <= after.transformedViewLimit);
    assert.ok(after.eligibleFieldPairDomains <= after.eligibleFieldPairDomainLimit);
    assert.ok(after.transformedViewEvictions > before.transformedViewEvictions);
    assert.ok(
      after.eligibleFieldPairDomainEvictions > before.eligibleFieldPairDomainEvictions
    );
    assert.equal(fingerprint(recipe.build(factors)), fingerprint(initialProgram));
    assert.deepEqual(recipe.describe(factors), initialMetadata);
  } finally {
    for (const dataset of churnDatasets) releaseTidyTuesdaySourceCache(dataset);
    releaseTidyTuesdaySourceCache(factors.dataset);
  }
});

test("keeps the authentic volcano population violin title visible with exact provenance", () => {
  const recipe = REALISTIC_FACADE_OPTION_RECIPES.find(candidate =>
    candidate.id === "realistic-facade-options-violin-plot"
  );
  const dataset = "tt-volcanoes";
  try {
    const domains = recipe.factorsForDataset(dataset);
    const factors = Object.freeze({
      dataset,
      fieldPair: domains.fieldPair.find(candidate =>
        candidate.bindingId ===
          "eligible:population_within_100_km-by-tectonic_settings"
      ),
      variant: domains.variant.find(candidate => candidate.id === "vertical-linear")
    });
    assert.notEqual(factors.fieldPair, undefined);
    assert.notEqual(factors.variant, undefined);
    const program = recipe.build(factors);
    const metadata = recipe.describe(factors);
    const label = `${dataset}-${recipe.id}-${factors.variant.id}`;
    assertVisibleFacadeTitle(program, metadata, label);
    assertMetadata(recipe, factors, program, metadata, label);
    assert.deepEqual(
      new Set(recipe.observeFactors(program, factors).map(effect => effect.factor)),
      new Set(["fieldPair", "variant"]),
      label
    );
    assert.deepEqual(metadata.provenance.fieldBindings, {
      measure: "population_within_100_km",
      dimension: "tectonic_settings",
      order: "elevation",
      identifier: "volcano_number",
      label: "volcano_name"
    });
    assert.equal(metadata.provenance.sourceRowCount, 120);
    assert.equal(
      metadata.provenance.sourceSelectionSha256,
      "7631ca7bd51db988f0626e283281eda9373d8637cda2d144679758c3dd7420f8"
    );
    assert.deepEqual(metadata.dataOperations, [
      "filter-valid",
      "top-groups",
      "filter-supported-groups",
      "witness-preserving-even-sample",
      "median-split",
      "source-order-numeric-projection",
      "project",
      "positive-domain-shift",
      "source-selection-order-rank"
    ]);
    assertGraphicIntegrity(program, label);
    assertAnalyticLayerIntegrity(program, label);
    const svg = renderToSVG(program, {
      title: metadata.title,
      description: metadata.analysisQuestion
    });
    assertSvgIntegrity(svg, label);
    assert.match(svg, /Population Within 100 Km/u);
  } finally {
    releaseTidyTuesdaySourceCache(dataset);
  }
});

test("fits baseline and longest authentic titles across every eligible TT facade pairing", () => {
  const datasets = REALISTIC_FACADE_OPTION_RECIPES[0].datasets;
  let recipeDatasetCount = 0;
  let chartCount = 0;
  for (const dataset of datasets) {
    try {
      for (const recipe of REALISTIC_FACADE_OPTION_RECIPES) {
        const domains = recipe.factorsForDataset(dataset);
        if (domains === undefined) continue;
        recipeDatasetCount += 1;
        const baseline = {
          dataset,
          fieldPair: domains.fieldPair[0],
          variant: domains.variant[0]
        };
        let longest = baseline;
        let longestLength = -1;
        for (const fieldPair of domains.fieldPair) {
          for (const variant of domains.variant) {
            const factors = { dataset, fieldPair, variant };
            const metadata = recipe.describe(factors);
            const length = metadata.title.length + metadata.analysisQuestion.length;
            if (length > longestLength) {
              longest = factors;
              longestLength = length;
            }
          }
        }
        for (const [kind, factors] of [["baseline", baseline], ["longest", longest]]) {
          const label = `${dataset}-${recipe.id}-${kind}`;
          const program = recipe.build(factors);
          const metadata = recipe.describe(factors);
          assertVisibleFacadeTitle(program, metadata, label);
          assertMetadata(recipe, factors, program, metadata, label);
          assertGraphicIntegrity(program, label);
          assertSvgIntegrity(renderToSVG(program, {
            title: metadata.title,
            description: metadata.analysisQuestion
          }), label);
          chartCount += 1;
        }
      }
    } finally {
      releaseTidyTuesdaySourceCache(dataset);
    }
  }
  assert.equal(datasets.length, 50);
  assert.equal(recipeDatasetCount, 235);
  assert.equal(chartCount, 470);
});

test("locks the role-valid facade scale inventory at 173 paths and 182 literals", async () => {
  const target = targetInventory(await inventoryPromise);
  assert.equal(target.options.length, 173);
  assert.equal(target.literals.length, 182);
  assert.equal(target.diversity.length, 6);
  assert.equal(target.options.filter(option => option.path.endsWith(".unknown")).length, 0);
  assert.equal(target.literals.filter(requirement => {
    const option = target.options.find(candidate => candidate.id === requirement.optionPath);
    return option.path.endsWith("type");
  }).length, 64);
  for (const [action, expected] of Object.entries(EXPECTED_INVENTORY_BY_ACTION)) {
    const options = target.options.filter(option => option.action === action);
    const optionIds = new Set(options.map(option => option.id));
    const literals = target.literals.filter(requirement => optionIds.has(requirement.optionPath));
    const diversity = target.diversity.filter(requirement => optionIds.has(requirement.optionPath));
    const typeLiterals = literals.filter(requirement =>
      options.find(option => option.id === requirement.optionPath).path.endsWith("type")
    );
    assert.deepEqual({
      paths: options.length,
      literals: literals.length,
      typeLiterals: typeLiterals.length,
      diversity: diversity.length
    }, expected, action);
  }
});

test("235 actual TT charts cover every target path and literal at least five times across three datasets", async () => {
  const projection = await buildProjection();
  assert.equal(projection.chartCount, 235);
  assert.ok(projection.datasetCount >= 5);
  for (const option of projection.target.options) {
    assert.equal(meetsMinimum(projection.optionStats.get(option.id)), true, option.id);
  }
  for (const requirement of projection.target.literals) {
    assert.equal(meetsMinimum(projection.literalStats.get(requirement.id)), true, requirement.id);
  }
  for (const requirement of projection.target.diversity) {
    const qualifyingValues = [...projection.valueStats.get(requirement.optionPath).values()]
      .filter(meetsMinimum);
    assert.ok(
      qualifyingValues.length >= requirement.minimumDistinctValues,
      requirement.id
    );
  }
  for (const [variant, stats] of projection.variantStats) {
    assert.equal(stats.occurrences, 5, variant);
    assert.ok(stats.datasets.size >= 3, variant);
  }
});

test("every facade variant changes the final program on an identical TT field binding", () => {
  const dataset = "tt-penguins";
  try {
    for (const recipe of REALISTIC_FACADE_OPTION_RECIPES) {
      const domains = recipe.factorsForDataset(dataset);
      assert.notEqual(domains, undefined, recipe.id);
      const fingerprints = new Set();
      for (const factors of realisticFacadeOptionWitnessFactors(recipe, dataset)) {
        const stableFactors = Object.freeze({ ...factors, fieldPair: domains.fieldPair[0] });
        const program = recipe.build(stableFactors);
        fingerprints.add(fingerprint(program));
        assert.deepEqual(
          new Set(recipe.observeFactors(program, stableFactors).map(effect => effect.factor)),
          new Set(["fieldPair", "variant"]),
          `${recipe.id}-${stableFactors.variant.id}`
        );
      }
      assert.equal(fingerprints.size, domains.variant.length, recipe.id);
    }
  } finally {
    releaseTidyTuesdaySourceCache(dataset);
  }
});
