import assert from "node:assert/strict";
import { fork } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { renderToSVG } from "../../src/renderers/svg.js";
import { assertAnalyticLayerIntegrity } from "../oracles/analytic-layer-integrity.js";
import { assertGraphicIntegrity } from "../oracles/graphic-integrity.js";
import { assertSvgIntegrity } from "../oracles/svg-integrity.js";
import { DATASET_CORPUS, datasetDefinition } from "../support/datasets/catalog.js";
import { releaseTidyTuesdaySourceCache } from "../support/datasets/tidytuesday.js";
import { buildPublicOptionInventory } from "../support/scenarios/coverage-inventory.js";
import {
  createScenarioCoverageLedger,
  summarizeScenarioFeatureCoverage
} from "../support/scenarios/coverage-ledger.js";
import {
  REALISTIC_STATISTICAL_FACADE_COVERAGE_COUNTS,
  REALISTIC_STATISTICAL_FACADE_COVERAGE_EXPECTED_ACTIONS,
  REALISTIC_STATISTICAL_FACADE_COVERAGE_RECIPES,
  REALISTIC_STATISTICAL_FACADE_COVERAGE_SCHEDULES,
  REALISTIC_STATISTICAL_FACADE_COVERAGE_SHAPE_VALUE_KEYS,
  REALISTIC_STATISTICAL_FACADE_COVERAGE_TARGET_COUNTS,
  REALISTIC_STATISTICAL_FACADE_COVERAGE_TARGET_SHA256,
  realisticStatisticalFacadeCoverageFactors,
  realisticStatisticalFacadeWitnessFactors,
  statisticalFacadeRequirementTargets
} from "../support/scenarios/realistic-statistical-facade-coverage-recipes.js";

const PROJECTION_CHILD = process.env.GGACTION_STAT_FACADE_PROJECTION === "1" &&
  typeof process.send === "function";
const contractTest = PROJECTION_CHILD ? () => undefined : test;
const actionCards = PROJECTION_CHILD
  ? undefined
  : JSON.parse(readFileSync(
      new URL("../../knowledge/action-cards.json", import.meta.url),
      "utf8"
    ));
const inventoryPromise = PROJECTION_CHILD
  ? undefined
  : buildPublicOptionInventory(actionCards);
const baselineAuditUrl = new URL(
  "../../.artifacts/scenarios/realistic/audits/" +
  "2026-08-15T07-51-53-862Z-80731-9bd4261e/report.json",
  import.meta.url
);
const baselineAudit = !PROJECTION_CHILD && existsSync(baselineAuditUrl)
  ? JSON.parse(readFileSync(baselineAuditUrl, "utf8"))
  : undefined;
const COVERAGE_POLICY = Object.freeze({
  minimumSuccessfulScenarios: 0,
  maximumFailures: 0,
  exactTidyTuesdayDatasets: 50,
  minimumScenariosPerDataset: 0,
  minimumOccurrences: 5,
  minimumTidyTuesdayDatasets: 3,
  minimumTierDatasets: 0,
  maximumRecipeShare: 1,
  maximumChartFamilyShare: 1,
  targetRecipesPerRequirement: 0,
  targetTiersPerRequirement: 0,
  complexityBands: Object.freeze({
    simple: Object.freeze({ minimum: 0, maximum: 1 }),
    intermediate: Object.freeze({ minimum: 0, maximum: 1 }),
    advanced: Object.freeze({ minimum: 0, maximum: 1 }),
    composite: Object.freeze({ minimum: 0, maximum: 1 })
  })
});
const LEGACY_SCALE_ROOTS = Object.freeze({
  createBoxPlot: Object.freeze(["x.scale", "y.scale"]),
  createGradientPlot: Object.freeze(["x.scale", "y.scale"]),
  createViolinPlot: Object.freeze(["x.scale", "y.scale", "color.scale"]),
  createHeatmap: Object.freeze(["x.scale", "y.scale", "color.scale"]),
  createHistogram: Object.freeze(["xScale", "yScale", "color.scale"])
});
const LEGACY_SCALE_INVENTORY_COUNTS = Object.freeze({
  createBoxPlot: Object.freeze({ paths: 30, literals: 32, diversity: 0 }),
  createGradientPlot: Object.freeze({ paths: 30, literals: 32, diversity: 0 }),
  createViolinPlot: Object.freeze({ paths: 39, literals: 35, diversity: 2 }),
  createHeatmap: Object.freeze({ paths: 42, literals: 51, diversity: 2 }),
  createHistogram: Object.freeze({ paths: 32, literals: 32, diversity: 2 })
});
const TAIL_LITERAL_REQUIREMENT_IDS = Object.freeze([
  "option-value:createGradientPlot.y.fieldType=string:nominal",
  "option-value:createHeatmap.color.fieldType=string:nominal",
  "option-value:createViolinPlot.area.curve=string:basis",
  "option-value:createViolinPlot.color.fieldType=string:nominal",
  "option-value:createViolinPlot.y.fieldType=string:nominal"
]);
const TAIL_DIVERSITY_REQUIREMENT_IDS = Object.freeze([
  "literal-diversity:editBoxPlot.outlier.shape",
  "literal-diversity:editGradientPlot.gradient.palette",
  "literal-diversity:editGradientPlot.gradient.palette.name"
]);

function hashIds(ids) {
  return createHash("sha256").update([...ids].sort().join("\n")).digest("hex");
}

function fingerprint(program) {
  return createHash("sha256")
    .update(JSON.stringify(program.semanticSpec))
    .update("\0")
    .update(JSON.stringify(program.graphicSpec))
    .digest("hex");
}

function operations(node, values = []) {
  if (node === null || typeof node !== "object") return values;
  if (typeof node.op === "string") values.push(node.op);
  for (const child of node.children ?? []) operations(child, values);
  return values;
}

function directEntries(program, action) {
  return (program.trace.children ?? []).filter(entry => entry.op === action);
}

function assertMetadata(recipe, factors, program, metadata, label) {
  const definition = datasetDefinition(factors.dataset);
  assert.equal(definition.corpus, "tidytuesday", label);
  assert.equal(metadata.corpus, "tidytuesday", label);
  assert.deepEqual(metadata.sourceDatasetIds, [factors.dataset], label);
  assert.equal(metadata.provenance.sourceDataset, factors.dataset, label);
  assert.equal(
    metadata.provenance.sourceRowIndexBasis,
    "zero-based-data-row-in-pinned-csv",
    label
  );
  assert.ok(metadata.provenance.sourceRowCount >= 2, label);
  assert.ok(metadata.provenance.sourceRowCount <= 80, label);
  assert.ok(metadata.provenance.minimumSourceRow >= 0, label);
  assert.ok(metadata.provenance.maximumSourceRow < definition.rows, label);
  assert.match(metadata.provenance.sourceSelectionSha256, /^[a-f0-9]{64}$/u, label);
  assert.equal(
    metadata.provenance.sourceRowIndexes.length,
    metadata.provenance.sourceRowCount,
    label
  );
  assert.equal(
    new Set(metadata.provenance.sourceRowIndexes).size,
    metadata.provenance.sourceRowIndexes.length,
    label
  );
  assert.ok(metadata.sourceFields.length >= 2, label);
  assert.ok(metadata.sourceFields.every(field => definition.fields[field.field] !== undefined));
  assert.deepEqual(
    metadata.dataOperations,
    metadata.provenance.transformations.map(transformation => transformation.op),
    label
  );
  assert.ok(metadata.dataOperations.includes("positive-domain-shift"), label);
  assert.ok(metadata.dataOperations.includes("source-selection-order-rank"), label);
  assert.ok(metadata.dataOperations.includes("within-group-rank-split"), label);
  assert.deepEqual(metadata.activeFeatures, [], label);
  assert.deepEqual(recipe.observe(program, factors), [], label);
  assert.equal(program.semanticSpec.title?.text, metadata.title, label);
  assert.equal(program.semanticSpec.title?.subtitle, metadata.analysisQuestion, label);
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

function resultFor(recipe, factors, program, metadata, index) {
  const allOperations = [...new Set(operations(program.trace))];
  const directTrace = (program.trace.children ?? []).map(entry => Object.freeze({
    op: entry.op,
    args: entry.args ?? {}
  }));
  return Object.freeze({
    id: `${recipe.id}-${factors.variant.id}-${factors.dataset}-${index}`,
    dataset: factors.dataset,
    recipe: recipe.id,
    operations: Object.freeze(allOperations),
    directOperations: Object.freeze([...new Set(directTrace.map(entry => entry.op))]),
    directTrace: Object.freeze(directTrace),
    metadata,
    effectiveFeatures: Object.freeze([]),
    renderers: Object.freeze([])
  });
}

function withoutStatisticalFacadeTailEvidence(result) {
  const removedActions = new Set(["editBoxPlot", "editGradientPlot"]);
  const directTrace = result.directTrace.flatMap(entry => {
    if (removedActions.has(entry.op)) return [];
    let args = entry.args;
    if (entry.op === "createGradientPlot" && args.y?.fieldType === "nominal") {
      args = { ...args, y: { ...args.y, fieldType: "ordinal" } };
    }
    if (entry.op === "createHeatmap" && args.color?.fieldType === "nominal") {
      args = { ...args, color: { ...args.color, fieldType: "ordinal" } };
    }
    if (entry.op === "createViolinPlot") {
      args = {
        ...args,
        ...(args.y?.fieldType === "nominal"
          ? { y: { ...args.y, fieldType: "ordinal" } }
          : {}),
        ...(args.color?.fieldType === "nominal"
          ? { color: { ...args.color, fieldType: "ordinal" } }
          : {}),
        ...(args.area?.curve === "basis"
          ? { area: { ...args.area, curve: "cardinal" } }
          : {})
      };
    }
    return [{ ...entry, args }];
  });
  return Object.freeze({
    ...result,
    operations: Object.freeze(result.operations.filter(action => !removedActions.has(action))),
    directOperations: Object.freeze(
      result.directOperations.filter(action => !removedActions.has(action))
    ),
    directTrace: Object.freeze(directTrace)
  });
}

let projectionPromise;

async function buildProjectionChunk(planDescriptors) {
  const recipes = new Map(REALISTIC_STATISTICAL_FACADE_COVERAGE_RECIPES.map(recipe => [
    recipe.id,
    recipe
  ]));
  const plans = planDescriptors.map(descriptor => ({
    ...descriptor,
    recipe: recipes.get(descriptor.recipeId)
  }));
  const results = [];
  for (const [dataset, datasetPlans] of groupByDataset(plans)) {
    try {
      for (const { recipe, factors, index } of datasetPlans) {
        if (recipe === undefined) {
          throw new Error(`Unknown projection recipe in worker plan.`);
        }
        const action = recipe.expectedDirectActions[0];
        const label = `${recipe.id}-${dataset}-${factors.variant.id}`;
        let program;
        try {
          program = recipe.build(factors);
        } catch (error) {
          throw new Error(`${label}: ${error.message}`, { cause: error });
        }
        const metadata = recipe.describe(factors);
        assert.equal(directEntries(program, action).length, 1, `${label} direct root action`);
        assert.deepEqual(
          new Set(recipe.observeFactors(program, factors).map(effect => effect.factor)),
          new Set(["fieldPair", "variant"]),
          `${label} independently observed factors`
        );
        assertMetadata(recipe, factors, program, metadata, label);
        if (action === "createHistogram" && factors.variant.guideMode === "polar") {
          assert.equal(
            program.semanticSpec.layers.some(layer =>
              layer.id === "polarContextPoints"
            ),
            false,
            `${label} uses only the histogram's Cartesian coordinate`
          );
          assert.deepEqual(
            program.semanticSpec.guides.axis,
            {
              x: { coordinate: "main", scale: "mainValue", title: metadata.sourceFields[0].label },
              y: { coordinate: "main", scale: "mainCount", title: "Observation count" }
            },
            `${label} creates owned Cartesian axes for histogram marks`
          );
        }
        assertGraphicIntegrity(program, label);
        assertAnalyticLayerIntegrity(program, label);
        assertSvgIntegrity(renderToSVG(program, {
          title: metadata.title,
          description: metadata.analysisQuestion
        }), label);
        results.push(resultFor(recipe, factors, program, metadata, index));
      }
    } finally {
      releaseTidyTuesdaySourceCache(dataset);
    }
  }
  return results;
}

function runProjectionProcess(plans) {
  return new Promise((resolve, reject) => {
    const child = fork(fileURLToPath(import.meta.url), [], {
      env: {
        ...process.env,
        GGACTION_STAT_FACADE_PROJECTION: "1"
      },
      serialization: "advanced",
      stdio: ["ignore", "ignore", "inherit", "ipc"]
    });
    let payload;
    let failed = false;
    child.once("message", value => {
      payload = value;
    });
    child.once("error", error => {
      failed = true;
      reject(error);
    });
    child.once("exit", code => {
      if (failed) return;
      if (code !== 0 || payload?.ok !== true) {
        const error = new Error(
          payload?.error?.message ??
          `Statistical facade projection process exited with code ${code}.`
        );
        if (payload?.error?.stack !== undefined) error.stack = payload.error.stack;
        reject(error);
        return;
      }
      if (!Array.isArray(payload.results)) {
        reject(new Error("Statistical facade projection process returned no result array."));
        return;
      }
      resolve(payload.results);
    });
    child.send({ plans });
  });
}

async function buildProjection() {
  if (projectionPromise !== undefined) return projectionPromise;
  projectionPromise = (async () => {
    const inventory = await inventoryPromise;
    const ledger = createScenarioCoverageLedger({
      publicInventory: inventory,
      rendererFeatures: []
    });
    const plans = REALISTIC_STATISTICAL_FACADE_COVERAGE_RECIPES.flatMap(recipe =>
      realisticStatisticalFacadeCoverageFactors(recipe).map(factors => ({
        recipe,
        factors
      }))
    );
    const descriptors = plans.map(({ recipe, factors }, index) => ({
      recipeId: recipe.id,
      factors,
      index
    }));
    const results = [];
    const datasetGroups = [...groupByDataset(descriptors).values()];
    for (let index = 0; index < datasetGroups.length; index += 1) {
      const chunk = datasetGroups.slice(index, index + 1).flat();
      results.push(...await runProjectionProcess(chunk));
    }
    return Object.freeze({
      plans: Object.freeze(plans),
      results: Object.freeze(results),
      report: summarizeScenarioFeatureCoverage({
        results,
        datasetCorpus: DATASET_CORPUS,
        ledger,
        policy: COVERAGE_POLICY,
        includeScenarioIds: false
      })
    });
  })();
  return projectionPromise;
}

function requirementAction(id) {
  const match = /^(?:option-path|option-value|literal-diversity):([^.=]+)[.=]/u.exec(id);
  return match?.[1];
}

function legacyScaleTarget(option) {
  return (LEGACY_SCALE_ROOTS[option.action] ?? []).some(root =>
    option.path === root || option.path.startsWith(`${root}.`)
  );
}

function legacyScaleInventory(inventory) {
  const options = inventory.optionPaths.filter(option =>
    option.required && legacyScaleTarget(option)
  );
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

contractTest("defines five bounded statistical facade schedules totaling 460 real charts", () => {
  assert.deepEqual(REALISTIC_STATISTICAL_FACADE_COVERAGE_COUNTS, {
    recipes: 5,
    minimumVariantsPerRecipe: 14,
    maximumVariantsPerRecipe: 27,
    minimumSelections: 460,
    maximumRecipeSelections: 135,
    maximumFamilySelections: 460,
    intermediateSelections: 285,
    advancedSelections: 175,
    targetRequirements: 847
  });
  assert.deepEqual(
    REALISTIC_STATISTICAL_FACADE_COVERAGE_RECIPES.map(recipe =>
      recipe.expectedDirectActions[0]
    ),
    REALISTIC_STATISTICAL_FACADE_COVERAGE_EXPECTED_ACTIONS
  );
  assert.equal(Object.keys(REALISTIC_STATISTICAL_FACADE_COVERAGE_SCHEDULES).length, 5);
  for (const recipe of REALISTIC_STATISTICAL_FACADE_COVERAGE_RECIPES) {
    assert.equal(recipe.datasets.length, 50, recipe.id);
    assert.ok(recipe.datasets.every(dataset =>
      datasetDefinition(dataset).corpus === "tidytuesday"
    ));
    assert.equal(recipe.minimumSelections, recipe.coverageSchedule.minimumSelections, recipe.id);
    assert.ok(recipe.minimumSelections <= 540, recipe.id);
    assert.equal(recipe.coverageSchedule.minimumDatasetsPerRequirement, 3, recipe.id);
    assert.ok(recipe.coverageSchedule.variantRequirements.every(requirement =>
      requirement.minimumOccurrences === 5 && requirement.minimumDatasets === 3
    ), recipe.id);
  }
  assert.ok(REALISTIC_STATISTICAL_FACADE_COVERAGE_COUNTS.maximumFamilySelections <= 900);
  assert.equal(
    REALISTIC_STATISTICAL_FACADE_COVERAGE_RECIPES
      .filter(recipe => recipe.complexity === "intermediate")
      .reduce((sum, recipe) => sum + recipe.minimumSelections, 0),
    285
  );
  assert.equal(
    REALISTIC_STATISTICAL_FACADE_COVERAGE_RECIPES
      .filter(recipe => recipe.complexity === "advanced")
      .reduce((sum, recipe) => sum + recipe.minimumSelections, 0),
    175
  );
});

contractTest("distributes every orthogonal variant exactly five times across at least three datasets", () => {
  const familyDatasets = new Set();
  for (const recipe of REALISTIC_STATISTICAL_FACADE_COVERAGE_RECIPES) {
    const factors = realisticStatisticalFacadeCoverageFactors(recipe);
    assert.equal(factors.length, recipe.minimumSelections, recipe.id);
    const eligibleDatasets = recipe.datasets.filter(dataset =>
      recipe.factorsForDataset(dataset) !== undefined
    );
    const scheduledDatasets = new Set(factors.map(values => values.dataset));
    assert.equal(scheduledDatasets.size, eligibleDatasets.length, recipe.id);
    for (const dataset of scheduledDatasets) familyDatasets.add(dataset);
    const byVariant = new Map();
    for (const values of factors) {
      const stats = byVariant.get(values.variant.id) ?? { count: 0, datasets: new Set() };
      stats.count += 1;
      stats.datasets.add(values.dataset);
      byVariant.set(values.variant.id, stats);
    }
    assert.equal(byVariant.size, recipe.coverageSchedule.variantRequirements.length, recipe.id);
    for (const [variant, stats] of byVariant) {
      assert.equal(stats.count, 5, `${recipe.id}-${variant}`);
      assert.ok(stats.datasets.size >= 3, `${recipe.id}-${variant}`);
    }
  }
  assert.equal(familyDatasets.size, 50);
});

contractTest("locks the corrected audit target counts and exact requirement-set digests", async () => {
  assert.deepEqual(REALISTIC_STATISTICAL_FACADE_COVERAGE_TARGET_COUNTS, {
    createViolinPlot: 182,
    createBoxPlot: 171,
    createGradientPlot: 121,
    createHeatmap: 146,
    createHistogram: 225
  });
  assert.deepEqual(REALISTIC_STATISTICAL_FACADE_COVERAGE_TARGET_SHA256, {
    createViolinPlot: "7b1d5ffde2c065bc84ffdf6fc7bf42102439eb1a8c1fd3d8547058a6f2100f1a",
    createBoxPlot: "943a8363014f2068b6abd79b9ebdc3eed58246786406214bcd9d7a392ddae932",
    createGradientPlot: "3a1418ce97b6aa930faa839bb34d84af709422e6367522a03fbb8e55e531ea91",
    createHeatmap: "984d0da613e49603782c85ae79c45911c9565d006bfd5a0dbfb5e020d9c06e6a",
    createHistogram: "72053da2acaa3e29714468a9676a87239305440113f63b83bd77d59fe41fd7b6"
  });
  if (baselineAudit === undefined) return;
  const inventory = await inventoryPromise;
  const targets = statisticalFacadeRequirementTargets(
    inventory,
    baselineAudit.coverage.requirements
  );
  for (const action of REALISTIC_STATISTICAL_FACADE_COVERAGE_EXPECTED_ACTIONS) {
    const ids = targets.filter(id => requirementAction(id) === action);
    assert.equal(ids.length, REALISTIC_STATISTICAL_FACADE_COVERAGE_TARGET_COUNTS[action]);
    assert.equal(hashIds(ids), REALISTIC_STATISTICAL_FACADE_COVERAGE_TARGET_SHA256[action]);
  }
  assert.equal(baselineAudit.failureCount, 40);
  assert.deepEqual(
    new Set(baselineAudit.failures.map(failure => failure.descriptor.recipe)),
    new Set(["realistic-guide-scale-cartesian-lifecycle"])
  );
});

contractTest("460 actual direct-root witnesses close every corrected action target and diversity", async () => {
  const projection = await buildProjection();
  assert.equal(projection.results.length, 460);
  const details = new Map(projection.report.requirements.map(detail => [detail.id, detail]));
  const inventory = await inventoryPromise;
  const actionSet = new Set(REALISTIC_STATISTICAL_FACADE_COVERAGE_EXPECTED_ACTIONS);
  const actionOptions = inventory.optionPaths.filter(option => actionSet.has(option.action));
  const optionIds = new Set(actionOptions.map(option => option.id));
  const observedByAction = Object.fromEntries(
    [...actionSet].map(action => [action, projection.report.requirements.filter(detail =>
      requirementAction(detail.id) === action && detail.meetsMinimum
    ).length])
  );
  for (const action of actionSet) {
    assert.ok(
      observedByAction[action] >= REALISTIC_STATISTICAL_FACADE_COVERAGE_TARGET_COUNTS[action],
      `${action} observed target capacity`
    );
  }
  if (baselineAudit !== undefined) {
    const targets = statisticalFacadeRequirementTargets(
      inventory,
      baselineAudit.coverage.requirements
    );
    assert.deepEqual(
      targets.filter(id => !details.get(id)?.meetsMinimum),
      [],
      "corrected audit target requirements"
    );
  }
  const diversity = projection.report.literalDiversity.filter(requirement =>
    optionIds.has(requirement.optionPath)
  );
  assert.ok(diversity.length > 0);
  assert.deepEqual(diversity.filter(requirement => !requirement.meetsMinimum), []);

  const shapeOption = inventory.optionPaths.find(option =>
    option.id === "option-path:createBoxPlot.outlier.shape"
  );
  assert.notEqual(shapeOption, undefined);
  const shapeRequirements = inventory.familyLiteralRequirements.filter(requirement =>
    requirement.family === shapeOption.literalFamily &&
    REALISTIC_STATISTICAL_FACADE_COVERAGE_SHAPE_VALUE_KEYS.includes(requirement.valueKey)
  );
  assert.equal(shapeRequirements.length, 2);
  assert.deepEqual(
    shapeRequirements.filter(requirement => !details.get(requirement.id)?.meetsMinimum),
    []
  );
});

contractTest("the exact 460-chart tail counterfactual fails before and passes after real root evidence", async () => {
  const projection = await buildProjection();
  const inventory = await inventoryPromise;
  const counterfactualResults = projection.results.map(withoutStatisticalFacadeTailEvidence);
  const counterfactual = summarizeScenarioFeatureCoverage({
    results: counterfactualResults,
    datasetCorpus: DATASET_CORPUS,
    ledger: createScenarioCoverageLedger({
      publicInventory: inventory,
      rendererFeatures: []
    }),
    policy: COVERAGE_POLICY,
    includeScenarioIds: false
  });
  const counterfactualRequirements = new Map(
    counterfactual.requirements.map(detail => [detail.id, detail])
  );
  const actualRequirements = new Map(
    projection.report.requirements.map(detail => [detail.id, detail])
  );
  const counterfactualDiversity = new Map(
    counterfactual.literalDiversity.map(detail => [detail.id, detail])
  );
  const actualDiversity = new Map(
    projection.report.literalDiversity.map(detail => [detail.id, detail])
  );

  assert.deepEqual(
    TAIL_LITERAL_REQUIREMENT_IDS.filter(id =>
      counterfactualRequirements.get(id)?.meetsMinimum
    ),
    [],
    "the prior ordinal-only and curve-limited projection leaves all five literals open"
  );
  for (const id of TAIL_LITERAL_REQUIREMENT_IDS) {
    const detail = actualRequirements.get(id);
    assert.equal(detail?.meetsMinimum, true, id);
    assert.ok(detail.occurrences >= 5, id);
    assert.ok(detail.datasetCount >= 3, id);
  }

  assert.deepEqual(
    TAIL_DIVERSITY_REQUIREMENT_IDS.filter(id =>
      counterfactualDiversity.get(id)?.meetsMinimum
    ),
    [],
    "the create-only projection leaves all three edit-value diversity checks open"
  );
  for (const id of TAIL_DIVERSITY_REQUIREMENT_IDS) {
    const detail = actualDiversity.get(id);
    assert.equal(detail?.meetsMinimum, true, id);
    assert.ok(detail.qualifyingDistinctValues >= 2, id);
    assert.ok(detail.values.filter(value => value.meetsMinimum).every(value =>
      value.occurrences >= 5 && value.datasetCount >= 3
    ), id);
  }

  const boxShapes = new Set(projection.results.flatMap(result =>
    result.directTrace.filter(entry => entry.op === "editBoxPlot")
      .map(entry => entry.args.outlier?.shape)
  ));
  const gradientPalettes = projection.results.flatMap(result =>
    result.directTrace.filter(entry => entry.op === "editGradientPlot")
      .map(entry => entry.args.gradient?.palette)
  );
  assert.deepEqual(boxShapes, new Set(["star", "triangle-left"]));
  assert.deepEqual(
    new Set(gradientPalettes.filter(value => typeof value === "string")),
    new Set(["blues", "reds"])
  );
  assert.deepEqual(
    new Set(gradientPalettes.flatMap(value =>
      typeof value === "object" && value !== null ? [value.name] : []
    )),
    new Set(["magma", "viridis"])
  );
});

contractTest("the 460-chart projection losslessly subsumes the retired facade scale surface", async () => {
  const projection = await buildProjection();
  const inventory = await inventoryPromise;
  const target = legacyScaleInventory(inventory);
  const details = new Map(projection.report.requirements.map(detail => [detail.id, detail]));
  const diversity = new Map(projection.report.literalDiversity.map(detail => [
    detail.id,
    detail
  ]));
  const byAction = Object.fromEntries(
    REALISTIC_STATISTICAL_FACADE_COVERAGE_EXPECTED_ACTIONS.map(action => [
      action,
      {
        paths: target.options.filter(option => option.action === action).length,
        literals: target.literals.filter(requirement =>
          requirementAction(requirement.id) === action
        ).length,
        diversity: target.diversity.filter(requirement =>
          requirementAction(requirement.id) === action
        ).length
      }
    ])
  );
  assert.deepEqual(byAction, LEGACY_SCALE_INVENTORY_COUNTS);
  assert.deepEqual(
    {
      paths: target.options.length,
      literals: target.literals.length,
      diversity: target.diversity.length
    },
    { paths: 173, literals: 182, diversity: 6 }
  );
  assert.deepEqual(
    [...target.options, ...target.literals].filter(requirement =>
      !details.get(requirement.id)?.meetsMinimum
    ).map(requirement => requirement.id),
    [],
    "no legacy scale option or literal is lost"
  );
  assert.deepEqual(
    target.diversity.filter(requirement =>
      !diversity.get(requirement.id)?.meetsMinimum
    ).map(requirement => requirement.id),
    [],
    "no legacy scale palette diversity is lost"
  );
});

contractTest("every same-binding facade variant materially changes the final program", () => {
  const dataset = "tt-penguins";
  try {
    for (const recipe of REALISTIC_STATISTICAL_FACADE_COVERAGE_RECIPES) {
      const factors = realisticStatisticalFacadeWitnessFactors(recipe, dataset);
      const binding = factors[0].fieldPair;
      const fingerprints = new Set();
      for (const values of factors) {
        const stable = Object.freeze({ ...values, fieldPair: binding });
        const program = recipe.build(stable);
        fingerprints.add(fingerprint(program));
        assert.deepEqual(
          new Set(recipe.observeFactors(program, stable).map(effect => effect.factor)),
          new Set(["fieldPair", "variant"]),
          `${recipe.id}-${values.variant.id}`
        );
      }
      assert.equal(fingerprints.size, factors.length, recipe.id);
    }
  } finally {
    releaseTidyTuesdaySourceCache(dataset);
  }
});

if (PROJECTION_CHILD) {
  process.once("message", async message => {
    try {
      const results = await buildProjectionChunk(message.plans);
      process.send({ ok: true, results }, () => process.disconnect());
    } catch (error) {
      process.exitCode = 1;
      process.send({
        ok: false,
        error: {
          message: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined
        }
      }, () => process.disconnect());
    }
  });
}
