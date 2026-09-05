import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import test from "node:test";

import { createCanvas } from "@napi-rs/canvas";

import { render } from "../../src/renderers/canvas/index.js";
import { renderToSVG } from "../../src/renderers/svg.js";
import { assertAnalyticLayerIntegrity } from "../oracles/analytic-layer-integrity.js";
import { assertGraphicIntegrity } from "../oracles/graphic-integrity.js";
import { assertSvgIntegrity } from "../oracles/svg-integrity.js";
import { datasetDefinition } from "../support/datasets/catalog.js";
import { releaseTidyTuesdaySourceCache } from "../support/datasets/tidytuesday.js";
import { buildPublicOptionInventory } from "../support/scenarios/coverage-inventory.js";
import { literalValueKey } from "../support/scenarios/coverage-ledger.js";
import {
  REALISTIC_CARTESIAN_FACADE_COVERAGE_AGGREGATES,
  REALISTIC_CARTESIAN_FACADE_COVERAGE_COUNTS,
  REALISTIC_CARTESIAN_FACADE_COVERAGE_EXPECTED_ACTIONS,
  REALISTIC_CARTESIAN_FACADE_COVERAGE_RECIPES,
  realisticCartesianFacadeCoverageFactors
} from "../support/scenarios/realistic-cartesian-facade-coverage-recipes.js";

const actionCards = JSON.parse(readFileSync(
  new URL("../../knowledge/action-cards.json", import.meta.url),
  "utf8"
));
const inventoryPromise = buildPublicOptionInventory(actionCards);
const ACTIONS = new Set(REALISTIC_CARTESIAN_FACADE_COVERAGE_EXPECTED_ACTIONS);
const EXPECTED_TARGETS = Object.freeze({
  createScatterPlot: Object.freeze({ requirements: 303, diversity: 7 }),
  createBarPlot: Object.freeze({ requirements: 296, diversity: 8 }),
  createLinePlot: Object.freeze({ requirements: 257, diversity: 6 }),
  createParallelCoordinates: Object.freeze({ requirements: 96, diversity: 3 })
});
const EXPECTED_REQUIREMENT_DIGESTS = Object.freeze({
  // Locked after public declarations match the runtime-supported facade branches.
  createScatterPlot: "8cc394c86656323c688c16021b4a8e01964e0d27abc2bd5751dc0155c1e5786d",
  createBarPlot: "e7226ab4015a86d143b6a9eda41ff1f4a33b4656cffa78a7a3007ff685d8991f",
  createLinePlot: "4a0a3d4f7ede23f3869562b1b2911aa0cd78df19e80c6189638596f60671ca63",
  createParallelCoordinates: "1642084c2c1a75675254f7f59409266d275d1493996586b7fc287bf2206fd337"
});
const EXPECTED_DIVERSITY_DIGESTS = Object.freeze({
  createScatterPlot: "8364d1c7cb80a45be2fcb58dce188e69fb4eb9d40fc80b628b8dc73833509461",
  createBarPlot: "a95e8347ab1a38e554e1be433739ae22e40bba19ac93ca341dc4eee16e2b2fb2",
  createLinePlot: "37a49ee6ed7666a0f2d88270e2c4c049e44e00ec06dc836ce07a708c610ba1a9",
  createParallelCoordinates: "ec8f99f3b8ef011bcabbfdc64266d1157e99697a96dc593e026efb9f77793a18"
});
const OTHER_RECIPE_REQUIREMENT_IDS = new Set(`
option-path:createBarPlot.color
option-path:createBarPlot.color.field
option-path:createBarPlot.color.layout
option-path:createBarPlot.color.scale
option-path:createBarPlot.color.scale.palette
option-path:createBarPlot.guides
option-path:createBarPlot.guides.axes
option-path:createBarPlot.guides.axes.x
option-path:createBarPlot.guides.axes.x.ticksAndLabels
option-path:createBarPlot.guides.axes.x.ticksAndLabels.values
option-path:createBarPlot.guides.axes.y
option-path:createBarPlot.guides.axes.y.ticksAndLabels
option-path:createBarPlot.guides.axes.y.ticksAndLabels.values
option-path:createBarPlot.guides.legend
option-path:createBarPlot.guides.legend.position
option-path:createBarPlot.id
option-path:createBarPlot.width
option-path:createBarPlot.width.band
option-path:createBarPlot.x
option-path:createBarPlot.x.aggregate
option-path:createBarPlot.x.field
option-path:createBarPlot.x.fieldType
option-path:createBarPlot.x.scale
option-path:createBarPlot.x.scale.nice
option-path:createBarPlot.x.scale.zero
option-path:createBarPlot.y
option-path:createBarPlot.y.aggregate
option-path:createBarPlot.y.field
option-path:createBarPlot.y.fieldType
option-path:createBarPlot.y.scale
option-path:createBarPlot.y.scale.nice
option-path:createBarPlot.y.scale.zero
option-path:createLinePlot.color
option-path:createLinePlot.color.field
option-path:createLinePlot.color.scale
option-path:createLinePlot.color.scale.palette
option-path:createLinePlot.groupBy
option-path:createLinePlot.guides
option-path:createLinePlot.guides.axes
option-path:createLinePlot.guides.axes.x
option-path:createLinePlot.guides.axes.x.ticksAndLabels
option-path:createLinePlot.guides.axes.x.ticksAndLabels.values
option-path:createLinePlot.guides.legend
option-path:createLinePlot.guides.legend.position
option-path:createLinePlot.id
option-path:createLinePlot.line
option-path:createLinePlot.line.curve
option-path:createLinePlot.line.strokeWidth
option-path:createLinePlot.strokeDash
option-path:createLinePlot.strokeDash.field
option-path:createLinePlot.x
option-path:createLinePlot.x.field
option-path:createLinePlot.x.fieldType
option-path:createLinePlot.x.scale
option-path:createLinePlot.x.scale.reverse
option-path:createLinePlot.y
option-path:createLinePlot.y.aggregate
option-path:createLinePlot.y.field
option-path:createLinePlot.y.scale
option-path:createLinePlot.y.scale.nice
option-path:createLinePlot.y.scale.zero
option-path:createParallelCoordinates.color
option-path:createParallelCoordinates.color.field
option-path:createParallelCoordinates.color.scale
option-path:createParallelCoordinates.color.scale.palette
option-path:createParallelCoordinates.dimensions
option-path:createParallelCoordinates.guides
option-path:createParallelCoordinates.guides.legend
option-path:createParallelCoordinates.guides.legend.position
option-path:createParallelCoordinates.id
option-path:createParallelCoordinates.key
option-path:createParallelCoordinates.line
option-path:createParallelCoordinates.line.opacity
option-path:createParallelCoordinates.line.strokeWidth
option-path:createParallelCoordinates.strokeDash
option-path:createParallelCoordinates.strokeDash.field
option-path:createScatterPlot.color
option-path:createScatterPlot.color.field
option-path:createScatterPlot.color.scale
option-path:createScatterPlot.color.scale.palette
option-path:createScatterPlot.guides
option-path:createScatterPlot.guides.legend
option-path:createScatterPlot.guides.legend.position
option-path:createScatterPlot.id
option-path:createScatterPlot.point
option-path:createScatterPlot.point.opacity
option-path:createScatterPlot.shape
option-path:createScatterPlot.shape.field
option-path:createScatterPlot.x
option-path:createScatterPlot.x.field
option-path:createScatterPlot.x.scale
option-path:createScatterPlot.x.scale.nice
option-path:createScatterPlot.x.scale.zero
option-path:createScatterPlot.y
option-path:createScatterPlot.y.field
option-path:createScatterPlot.y.scale
option-path:createScatterPlot.y.scale.nice
option-path:createScatterPlot.y.scale.zero
option-value:createBarPlot.color.layout=string:group
option-value:createBarPlot.guides.legend.position=string:right
option-value:createBarPlot.x.fieldType=string:nominal
option-value:createBarPlot.x.scale.nice=boolean:true
option-value:createBarPlot.x.scale.zero=boolean:true
option-value:createBarPlot.y.fieldType=string:nominal
option-value:createBarPlot.y.scale.nice=boolean:true
option-value:createBarPlot.y.scale.zero=boolean:true
option-value:createLinePlot.guides.legend.position=string:right
option-value:createLinePlot.line.curve=string:linear
option-value:createLinePlot.line.curve=string:step
option-value:createLinePlot.x.fieldType=string:temporal
option-value:createLinePlot.x.scale.reverse=boolean:false
option-value:createLinePlot.x.scale.reverse=boolean:true
option-value:createLinePlot.y.scale.nice=boolean:true
option-value:createLinePlot.y.scale.zero=boolean:false
option-value:createParallelCoordinates.guides.legend.position=string:right
option-value:createScatterPlot.guides.legend.position=string:right
option-value:createScatterPlot.x.scale.nice=boolean:false
option-value:createScatterPlot.x.scale.nice=boolean:true
option-value:createScatterPlot.x.scale.zero=boolean:false
option-value:createScatterPlot.y.scale.nice=boolean:true
option-value:createScatterPlot.y.scale.zero=boolean:false
`.trim().split("\n"));
const OTHER_RECIPE_DIVERSITY_IDS = new Set([
  "literal-diversity:createBarPlot.color.scale.palette",
  "literal-diversity:createLinePlot.color.scale.palette",
  "literal-diversity:createParallelCoordinates.color.scale.palette",
  "literal-diversity:createScatterPlot.color.scale.palette"
]);
const PNG_SIGNATURE = Object.freeze([137, 80, 78, 71, 13, 10, 26, 10]);

function digest(ids) {
  return createHash("sha256")
    .update([...ids].sort().join("\n") + "\n")
    .digest("hex");
}

function targetInventory(inventory) {
  const options = inventory.optionPaths.filter(option =>
    option.required && ACTIONS.has(option.action) &&
    !OTHER_RECIPE_REQUIREMENT_IDS.has(option.id)
  );
  const literals = inventory.pathLiteralRequirements.filter(requirement => {
    const action = requirement.optionPath.slice("option-path:".length).split(".")[0];
    return ACTIONS.has(action) && !OTHER_RECIPE_REQUIREMENT_IDS.has(requirement.id);
  });
  const familyLiterals = inventory.familyLiteralRequirements.filter(requirement =>
    requirement.family.startsWith("AggregateOperation-") &&
    REALISTIC_CARTESIAN_FACADE_COVERAGE_AGGREGATES.includes(
      requirement.valueKey.slice("string:".length)
    )
  );
  const diversity = inventory.pathDiversityRequirements.filter(requirement => {
    const action = requirement.optionPath.slice("option-path:".length).split(".")[0];
    return ACTIONS.has(action) && !OTHER_RECIPE_DIVERSITY_IDS.has(requirement.id);
  });
  return Object.freeze({ options, literals, familyLiterals, diversity });
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

function strippedFingerprint(program) {
  const objects = Object.fromEntries(Object.entries(program.graphicSpec.objects).filter(
    ([id]) => id !== "chartTitle" && id !== "chartSubtitle"
  ));
  return createHash("sha256")
    .update(JSON.stringify({ ...program.semanticSpec, title: {} }))
    .update("\0")
    .update(JSON.stringify({ ...program.graphicSpec, objects }))
    .digest("hex");
}

function assertMetadata(recipe, factors, program, metadata, label) {
  const definition = datasetDefinition(factors.dataset);
  const rows = program.semanticSpec.datasets.find(dataset =>
    dataset.id === "analysisRows"
  )?.values;
  assert.ok(Array.isArray(rows) && rows.length > 0, label);
  assert.equal(metadata.corpus, "tidytuesday", label);
  assert.equal(definition.corpus, "tidytuesday", label);
  assert.deepEqual(metadata.sourceDatasetIds, [factors.dataset], label);
  assert.equal(metadata.provenance.sourceDataset, factors.dataset, label);
  assert.equal(
    metadata.provenance.sourceRowIndexBasis,
    "zero-based-data-row-in-pinned-csv",
    label
  );
  assert.equal(metadata.provenance.sourceRowCount, rows.length, label);
  assert.equal(metadata.sample.displayedRowCount, rows.length, label);
  assert.deepEqual(
    [...new Set(rows.map(row => row.sourceRowIndex))].sort((left, right) => left - right),
    [...metadata.provenance.sourceRowIndexes].sort((left, right) => left - right),
    label
  );
  assert.match(metadata.provenance.sourceSelectionSha256, /^[a-f0-9]{64}$/u, label);
  assert.ok(metadata.provenance.minimumSourceRow >= 0, label);
  assert.ok(metadata.provenance.maximumSourceRow < definition.rows, label);
  assert.ok(metadata.sourceFields.length >= 2, label);
  assert.ok(metadata.sourceFields.every(field => definition.fields[field.field] !== undefined), label);
  assert.deepEqual(
    metadata.dataOperations,
    metadata.provenance.transformations.map(transformation => transformation.op),
    label
  );
  assert.ok(metadata.dataOperations.includes("source-selection-order-rank"), label);
  assert.ok(
    metadata.dataOperations.includes("positive-domain-and-secondary-projection"),
    label
  );
  assert.ok(metadata.dataOperations.includes("deterministic-temporal-witness"), label);
  assert.deepEqual(metadata.activeFeatures, [], label);
  assert.deepEqual(recipe.observe(program, factors), [], label);
  assert.equal(program.semanticSpec.title?.text, metadata.title, label);
  assert.equal(program.semanticSpec.title?.subtitle, metadata.analysisQuestion, label);
  assert.ok(rows.every(row =>
    Number.isFinite(row.positiveValue) && row.positiveValue > 0 &&
    Number.isFinite(row.positiveSecondary) && row.positiveSecondary > 0 &&
    Number.isInteger(row.sourcePosition) && row.sourcePosition > 0 &&
    Number.isFinite(Date.parse(row.observedAt)) &&
    Number.isFinite(Date.parse(row.observedAtSecondary))
  ), label);
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
    const allOptionsByAction = new Map();
    for (const action of ACTIONS) {
      optionsByAction.set(action, target.options.filter(option => option.action === action));
      allOptionsByAction.set(action, inventory.optionPaths.filter(option =>
        option.required && option.action === action
      ));
    }
    const optionStats = new Map(target.options.map(option => [option.id, emptyStats()]));
    const literalStats = new Map(target.literals.map(requirement => [
      requirement.id,
      emptyStats()
    ]));
    const valueStats = new Map(inventory.optionPaths
      .filter(option => option.required && ACTIONS.has(option.action))
      .map(option => [option.id, new Map()]));
    const aggregateStats = new Map(target.familyLiterals.map(requirement => [
      requirement.id,
      emptyStats()
    ]));
    const aggregateByValue = new Map(target.familyLiterals.map(requirement => [
      requirement.valueKey,
      requirement
    ]));
    const variantStats = new Map();
    const plans = REALISTIC_CARTESIAN_FACADE_COVERAGE_RECIPES.flatMap(recipe =>
      realisticCartesianFacadeCoverageFactors(recipe).map(factors => ({ recipe, factors }))
    );
    let chartCount = 0;
    for (const [dataset, datasetPlans] of groupByDataset(plans)) {
      try {
        for (const { recipe, factors } of datasetPlans) {
          const action = recipe.expectedDirectActions[0];
          const label = `${recipe.id}-${dataset}-${factors.variant.id}`;
          let program;
          try { program = recipe.build(factors); }
          catch (error) { throw new Error(`${label}: ${error.message}`, { cause: error }); }
          const metadata = recipe.describe(factors);
          const direct = directEntries(program, action);
          assert.equal(direct.length, 1, `${label} direct root action`);
          assertMetadata(recipe, factors, program, metadata, label);
          assert.deepEqual(
            new Set(recipe.observeFactors(program, factors).map(effect => effect.factor)),
            new Set(["fieldPair", "variant"]),
            `${label} independent factor evidence`
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
          for (const option of allOptionsByAction.get(action)) {
            const traceValues = nestedTraceValues(direct[0].args, option.path);
            if (traceValues.length === 0) continue;
            if (optionStats.has(option.id)) record(optionStats.get(option.id), dataset);
            const observedKeys = new Set(traceValues.map(literalValueKey).filter(Boolean));
            for (const valueKey of observedKeys) {
              const statsByValue = valueStats.get(option.id);
              const stats = statsByValue.get(valueKey) ?? emptyStats();
              record(stats, dataset);
              statsByValue.set(valueKey, stats);
            }
          }
          if (action === "createBarPlot") {
            const valueKey = literalValueKey(direct[0].args.color?.aggregate);
            const requirement = aggregateByValue.get(valueKey);
            if (requirement !== undefined) {
              record(aggregateStats.get(requirement.id), dataset);
            }
          }
          chartCount += 1;
        }
      } finally {
        releaseTidyTuesdaySourceCache(dataset);
      }
    }
    for (const requirement of target.literals) {
      const stats = valueStats.get(requirement.optionPath)?.get(requirement.valueKey);
      if (stats !== undefined) literalStats.set(requirement.id, stats);
    }
    return Object.freeze({
      target,
      optionStats,
      literalStats,
      valueStats,
      aggregateStats,
      variantStats,
      chartCount,
      datasetCount: new Set(plans.map(plan => plan.factors.dataset)).size
    });
  })();
  return projectionPromise;
}

test("defines four bounded facade recipes and a 720-chart schedule", () => {
  assert.deepEqual(REALISTIC_CARTESIAN_FACADE_COVERAGE_COUNTS, {
    recipes: 4,
    advanced: 4,
    variantsPerRecipe: 36,
    minimumSelectionsPerRecipe: 180,
    minimumSelections: 720
  });
  assert.ok(REALISTIC_CARTESIAN_FACADE_COVERAGE_COUNTS.minimumSelections <= 900);
  assert.deepEqual(
    REALISTIC_CARTESIAN_FACADE_COVERAGE_RECIPES.map(recipe =>
      recipe.expectedDirectActions[0]
    ),
    REALISTIC_CARTESIAN_FACADE_COVERAGE_EXPECTED_ACTIONS
  );
  assert.equal(new Set(REALISTIC_CARTESIAN_FACADE_COVERAGE_RECIPES.map(
    recipe => recipe.id
  )).size, 4);
  for (const recipe of REALISTIC_CARTESIAN_FACADE_COVERAGE_RECIPES) {
    assert.equal(recipe.suite, "realistic", recipe.id);
    assert.equal(recipe.generation, "balanced-per-dataset", recipe.id);
    assert.equal(recipe.complexity, "advanced", recipe.id);
    assert.equal(recipe.enforceFactorEffects, true, recipe.id);
    assert.equal(recipe.datasets.length, 50, recipe.id);
    assert.equal(recipe.factors.variant.length, 36, recipe.id);
    assert.equal(recipe.minimumSelections, 180, recipe.id);
    assert.ok(recipe.minimumSelections <= 540, recipe.id);
    assert.equal(recipe.coverageSchedule.variantRequirements.length, 36, recipe.id);
    assert.ok(recipe.coverageSchedule.variantRequirements.every(requirement =>
      requirement.minimumOccurrences === 5 && requirement.minimumDatasets === 3
    ), recipe.id);
  }
  assert.deepEqual(REALISTIC_CARTESIAN_FACADE_COVERAGE_AGGREGATES, [
    "ciLower", "ciUpper", "distinct", "max", "median", "min", "missing",
    "q1", "q3", "stderr", "stdev", "stdevP", "valid", "variance", "varianceP"
  ]);
});

test("normalizes exact continuous-color facade bars before native rendering", {
  timeout: 30_000
}, () => {
  const recipe = REALISTIC_CARTESIAN_FACADE_COVERAGE_RECIPES.find(candidate =>
    candidate.id === "realistic-cartesian-facade-coverage-bar"
  );
  const cases = [
    {
      factors: {
        dataset: "tt-meteorites",
        fieldPair: {
          measureIndex: 2,
          dimensionIndex: 0,
          bindingId: "eligible:mass-by-fall"
        },
        variant: {
          id: "createbarplot-orthogonal-12",
          ordinal: 11,
          guide: { id: "cartesian-grid-booleans", kind: "cartesian-grid-booleans" }
        }
      },
      measure: "x",
      start: 620,
      span: 1_260
    },
    {
      factors: {
        dataset: "tt-nurses",
        fieldPair: {
          measureIndex: 10,
          dimensionIndex: 0,
          bindingId: "eligible:Annual 25th Percentile-by-State"
        },
        variant: {
          id: "createbarplot-orthogonal-11",
          ordinal: 10,
          guide: { id: "cartesian-title-disabled", kind: "cartesian-title-disabled" }
        }
      },
      measure: "y",
      start: 250,
      span: 820
    },
    {
      factors: {
        dataset: "tt-nurses",
        fieldPair: {
          measureIndex: 11,
          dimensionIndex: 0,
          bindingId: "eligible:Annual 75th Percentile-by-State"
        },
        variant: {
          id: "createbarplot-orthogonal-12",
          ordinal: 11,
          guide: { id: "cartesian-grid-booleans", kind: "cartesian-grid-booleans" }
        }
      },
      measure: "x",
      start: 620,
      span: 1_260
    }
  ];

  assert.ok(recipe !== undefined);
  try {
    for (const scenario of cases) {
      const { factors, measure, start, span } = scenario;
      const label = `${factors.dataset}/${factors.variant.id}`;
      const program = recipe.build(factors);
      const bars = program.graphicSpec.objects.mainBars.items;
      const measureScale = program.resolvedScales[`main${measure.toUpperCase()}`];

      assert.deepEqual(measureScale.domain, [0, 1], label);
      assert.ok(bars.length > 0, label);
      for (const bar of bars) {
        assert.equal(bar.properties[measure], start, label);
        assert.equal(
          bar.properties[measure === "x" ? "width" : "height"],
          span,
          label
        );
        assert.ok(["x", "y", "width", "height"].every(property =>
          Number.isFinite(bar.properties[property]) &&
          Math.abs(bar.properties[property]) <= 2_300
        ), label);
      }
      assertGraphicIntegrity(program, label);
      assertSvgIntegrity(renderToSVG(program), label);

      const canvas = createCanvas(1, 1);
      const context = canvas.getContext("2d");
      render(program, context);
      assert.deepEqual([canvas.width, canvas.height], [2_300, 1_220], label);
      for (const bar of bars) {
        const { x, y, width, height } = bar.properties;
        const pixel = [...context.getImageData(
          Math.round(x + width / 2),
          Math.round(y + height / 2),
          1,
          1
        ).data];
        assert.notDeepEqual(pixel, [255, 255, 255, 255], label);
      }
      assert.deepEqual(
        [...canvas.toBuffer("image/png").subarray(0, 8)],
        PNG_SIGNATURE,
        label
      );
    }
  } finally {
    for (const dataset of new Set(cases.map(scenario => scenario.factors.dataset))) {
      releaseTidyTuesdaySourceCache(dataset);
    }
  }
});

test("locks the exact assigned option, literal, aggregate, and diversity target set", async () => {
  const target = targetInventory(await inventoryPromise);
  let actionRequirementCount = 0;
  let diversityCount = 0;
  for (const action of ACTIONS) {
    const requirementIds = [
      ...target.options.filter(option => option.action === action),
      ...target.literals.filter(requirement =>
        requirement.optionPath.startsWith(`option-path:${action}.`)
      )
    ].map(requirement => requirement.id);
    const diversityIds = target.diversity.filter(requirement =>
      requirement.optionPath.startsWith(`option-path:${action}.`)
    ).map(requirement => requirement.id);
    assert.equal(
      requirementIds.length,
      EXPECTED_TARGETS[action].requirements,
      `${action} requirement count`
    );
    assert.equal(
      diversityIds.length,
      EXPECTED_TARGETS[action].diversity,
      `${action} diversity count`
    );
    assert.equal(
      digest(requirementIds),
      EXPECTED_REQUIREMENT_DIGESTS[action],
      `${action} exact requirement set`
    );
    assert.equal(
      digest(diversityIds),
      EXPECTED_DIVERSITY_DIGESTS[action],
      `${action} exact diversity set`
    );
    actionRequirementCount += requirementIds.length;
    diversityCount += diversityIds.length;
  }
  assert.equal(actionRequirementCount, 952);
  assert.equal(target.familyLiterals.length, 15);
  assert.equal(actionRequirementCount + target.familyLiterals.length, 967);
  assert.equal(diversityCount, 24);
});

test("keeps every orthogonal profile materially distinct under one authentic witness", {
  timeout: 30_000
}, () => {
  const dataset = "tt-penguins";
  try {
    for (const recipe of REALISTIC_CARTESIAN_FACADE_COVERAGE_RECIPES) {
      const domains = recipe.factorsForDataset(dataset);
      assert.ok(domains !== undefined, `${recipe.id} witness eligibility`);
      const fieldPair = domains.fieldPair[0];
      const hashes = recipe.factors.variant.map(variant => strippedFingerprint(
        recipe.build({ dataset, fieldPair, variant })
      ));
      assert.equal(hashes.length, 36, `${recipe.id} fingerprints`);
      assert.equal(new Set(hashes).size, 36, `${recipe.id} material distinction`);
    }
  } finally {
    releaseTidyTuesdaySourceCache(dataset);
  }
});

test("factor observers require the direct evidence claimed for data and facade profiles", () => {
  const dataset = "tt-penguins";
  try {
    for (const recipe of REALISTIC_CARTESIAN_FACADE_COVERAGE_RECIPES) {
      const domains = recipe.factorsForDataset(dataset);
      assert.ok(domains !== undefined, `${recipe.id} witness eligibility`);
      const factors = {
        dataset,
        fieldPair: domains.fieldPair[0],
        variant: domains.variant[0]
      };
      const program = recipe.build(factors);
      const withoutFacadeTrace = {
        ...program,
        trace: {
          ...program.trace,
          children: program.trace.children.filter(entry =>
            entry.op !== recipe.expectedDirectActions[0]
          )
        }
      };
      assert.deepEqual(
        recipe.observeFactors(withoutFacadeTrace, factors).map(effect => effect.factor),
        ["fieldPair"],
        `${recipe.id} rejects missing facade evidence`
      );
      const withoutDataTrace = {
        ...program,
        trace: {
          ...program.trace,
          children: program.trace.children.filter(entry => entry.op !== "createData")
        }
      };
      assert.deepEqual(
        recipe.observeFactors(withoutDataTrace, factors).map(effect => effect.factor),
        ["variant"],
        `${recipe.id} rejects missing data evidence`
      );
    }
  } finally {
    releaseTidyTuesdaySourceCache(dataset);
  }
});

test("direct authentic witnesses satisfy every assigned hard minimum and diversity rule", {
  timeout: 180_000
}, async () => {
  const projection = await buildProjection();
  assert.equal(projection.chartCount, 720);
  assert.ok(projection.datasetCount >= 3);
  const deficits = [];
  for (const collection of [projection.optionStats, projection.literalStats, projection.aggregateStats]) {
    for (const [id, stats] of collection) {
      if (!meetsMinimum(stats)) deficits.push(`${id}: ${stats.occurrences}/${stats.datasets.size}`);
    }
  }
  for (const requirement of projection.target.diversity) {
    const values = [...(projection.valueStats.get(requirement.optionPath) ?? new Map())]
      .filter(([, stats]) => meetsMinimum(stats));
    if (values.length < requirement.minimumDistinctValues) {
      deficits.push(`${requirement.id}: ${values.map(([value]) => value).join(", ")}`);
    }
  }
  assert.deepEqual(deficits, []);
  for (const recipe of REALISTIC_CARTESIAN_FACADE_COVERAGE_RECIPES) {
    for (const variant of recipe.factors.variant) {
      const stats = projection.variantStats.get(`${recipe.id}\0${variant.id}`);
      assert.ok(stats !== undefined && meetsMinimum(stats), `${recipe.id}/${variant.id}`);
    }
  }
});
