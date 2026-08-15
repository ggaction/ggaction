import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { runInNewContext } from "node:vm";
import { setFlagsFromString } from "node:v8";

import { resolveConcreteGraphicBounds } from
  "../../src/grammar/schemas/graphicBounds.js";
import { renderToSVG } from "../../src/renderers/svg.js";
import { assertAnalyticLayerIntegrity } from "../oracles/analytic-layer-integrity.js";
import { assertGraphicIntegrity } from "../oracles/graphic-integrity.js";
import { assertSvgIntegrity } from "../oracles/svg-integrity.js";
import { datasetDefinition } from "../support/datasets/catalog.js";
import {
  releaseTidyTuesdaySourceCache,
  tidyTuesdaySourceEntries
} from "../support/datasets/tidytuesday.js";
import { buildPublicOptionInventory } from "../support/scenarios/coverage-inventory.js";
import {
  SOURCE_INDEX_ENCODING,
  literalValueKey
} from "../support/scenarios/coverage-ledger.js";
import { runScenario } from "../support/scenarios/engine.js";
import {
  realisticDatasetIds,
  realisticDatasetRoles,
  realisticDatasetSupports,
  realisticLifecycleEligible
} from "../support/scenarios/realistic-data.js";
import {
  REALISTIC_DIRECT_LIFECYCLE_COVERAGE_ASSIGNED_LITERAL_FAMILIES,
  REALISTIC_DIRECT_LIFECYCLE_COVERAGE_COUNTS,
  REALISTIC_DIRECT_LIFECYCLE_COVERAGE_EXCLUDED_ACTIONS,
  REALISTIC_DIRECT_LIFECYCLE_COVERAGE_EXPECTED_ACTIONS,
  REALISTIC_DIRECT_LIFECYCLE_COVERAGE_RECIPES,
  REALISTIC_DIRECT_LIFECYCLE_COVERAGE_SCHEDULES,
  REALISTIC_DIRECT_LIFECYCLE_COVERAGE_TARGET_COUNTS,
  REALISTIC_DIRECT_LIFECYCLE_COVERAGE_TARGET_SHA256,
  realisticDirectLifecycleCoverageFactors,
  realisticDirectLifecycleErrorBandFailure,
  realisticDirectLifecycleReplayCorrectedRequirementIds,
  realisticDirectLifecycleRequirementTargets
} from "../support/scenarios/realistic-direct-lifecycle-coverage-recipes.js";

const WITNESS_DATASETS = Object.freeze([
  "tt-penguins",
  "tt-global-temperatures",
  "tt-london-marathon-winners",
  "tt-himalayan-peaks",
  "tt-us-tornadoes"
]);
const EXPECTED_TIER_SELECTIONS = Object.freeze({
  simple: 5,
  intermediate: 10,
  advanced: 15,
  composite: 20
});
const AUTO_REPLAY_FAMILY_REQUIREMENT =
  "literal-value:literal-1984130ce594=string:auto";
const REPLAY_CORRECTED_SHA256 =
  "e58f38f8c129884aa7ea3d364b52d67e5927593052ff39cc3b8199c7dca20059";
const FACET_SWEEP_CHILD_ENV = "GGACTION_DIRECT_FACET_SWEEP_CHILD";
const FACET_SWEEP_RESOURCE_PREFIX = "direct-facet-sweep-resource:";
const FACET_SWEEP_TEST_NAME =
  "preflights the maximal facet profile on all fifty eligible TT datasets";
const REGRESSION_SWEEP_CHILD_ENV = "GGACTION_DIRECT_REGRESSION_SWEEP_CHILD";
const REGRESSION_SWEEP_RESOURCE_PREFIX = "direct-regression-sweep-resource:";
const REGRESSION_SWEEP_TEST_NAME =
  "preflights the maximal regression profile on all fifty eligible TT datasets";
const MAX_DISPOSABLE_SWEEP_RSS_KIB = 512 * 1_024;
const REGRESSION_ANALYSIS_QUESTION =
  "How does the selected measure vary across stable source-record order within full-source-supported groups?";
const STATISTICAL_SWEEP_CHILD_ENV = "GGACTION_DIRECT_STATISTICAL_SWEEP_CHILD";
const STATISTICAL_SWEEP_RESOURCE_PREFIX = "direct-statistical-sweep-resource:";
const STATISTICAL_SWEEP_TEST_NAME =
  "preflights the maximal statistical profile on all temporal-eligible TT datasets";
const STATISTICAL_ANALYSIS_QUESTION =
  "How do interval estimates and distribution shapes vary across source time and observed categories?";
const DERIVED_SWEEP_CHILD_ENV = "GGACTION_DIRECT_DERIVED_SWEEP_CHILD";
const DERIVED_SWEEP_RESOURCE_PREFIX = "direct-derived-sweep-resource:";
const DERIVED_SWEEP_TEST_NAME =
  "preflights the maximal derived-encoding profile on all temporal-eligible TT datasets";
const DERIVED_ENCODING_ANALYSIS_QUESTION =
  "How do overall temporal horizon patterns, histograms, and category densities describe the selected measure?";
const REMOVAL_SWEEP_CHILD_ENV = "GGACTION_DIRECT_REMOVAL_SWEEP_CHILD";
const REMOVAL_SWEEP_RESOURCE_PREFIX = "direct-removal-sweep-resource:";
const REMOVAL_SWEEP_TEST_NAME =
  "preflights the maximal removal profile on all fifty eligible TT datasets";
const REMOVAL_ANALYSIS_QUESTION =
  "How does the selected measure vary across stable selected source-record order and authentic source categories?";
const REMOVAL_CHANNELS = Object.freeze([
  "color", "group", "opacity", "radius", "size", "strokeDash", "strokeWidth",
  "text", "theta", "x", "x2", "xOffset", "y", "y2", "yOffset"
]);
const DIRECT_COVERAGE_TAIL_IDS = Object.freeze([
  "option-value:createErrorBand.boundaries=boolean:false",
  "option-value:createRegressionData.interval=string:mean",
  "option-value:editErrorBar.caps=boolean:true",
  "option-value:encodeDensity.placement.side=string:top",
  "literal-diversity:createAxes.radius.ticksAndLabels.labels.format",
  "literal-diversity:createAxes.theta.ticksAndLabels.labels.format",
  "literal-diversity:createGuides.axes.radius.ticksAndLabels.labels.format",
  "literal-diversity:createGuides.axes.theta.ticksAndLabels.labels.format",
  "literal-diversity:createRadialAxis.ticksAndLabels.labels.format",
  "literal-diversity:createThetaAxis.ticksAndLabels.labels.format",
  "literal-diversity:editHorizon.palette.negative",
  "literal-diversity:editHorizon.palette.positive",
  "literal-diversity:editRadialAxis.labels.format",
  "literal-diversity:editRadialAxis.ticksAndLabels.labels.format",
  "literal-diversity:editRadialAxisLabels.format",
  "literal-diversity:editThetaAxis.labels.format",
  "literal-diversity:editThetaAxis.ticksAndLabels.labels.format",
  "literal-diversity:editThetaAxisLabels.format",
  "literal-diversity:encodeHorizon.palette.negative",
  "literal-diversity:encodeHorizon.palette.positive",
  "literal-diversity:filterMarks.property"
]);
const ALTERNATE_POLAR_FORMAT_PATHS = Object.freeze([
  ["createAxes", "radius.ticksAndLabels.labels.format"],
  ["createAxes", "theta.ticksAndLabels.labels.format"],
  ["createGuides", "axes.radius.ticksAndLabels.labels.format"],
  ["createGuides", "axes.theta.ticksAndLabels.labels.format"],
  ["createRadialAxis", "ticksAndLabels.labels.format"],
  ["createThetaAxis", "ticksAndLabels.labels.format"],
  ["editRadialAxis", "labels.format"],
  ["editRadialAxis", "ticksAndLabels.labels.format"],
  ["editRadialAxisLabels", "format"],
  ["editThetaAxis", "labels.format"],
  ["editThetaAxis", "ticksAndLabels.labels.format"],
  ["editThetaAxisLabels", "format"]
]);
let inventoryPromise = buildPublicOptionInventory(JSON.parse(readFileSync(
  new URL("../../knowledge/action-cards.json", import.meta.url),
  "utf8"
)));
const baselineAuditUrl = new URL(
  "../../.artifacts/scenarios/realistic/audits/" +
  "2026-08-15T07-51-53-862Z-80731-9bd4261e/report.json",
  import.meta.url
);

function loadBaselineAudit() {
  if (!existsSync(baselineAuditUrl)) return undefined;
  const report = JSON.parse(readFileSync(baselineAuditUrl, "utf8"));
  return Object.freeze({
    failureCount: report.failureCount,
    failureRecipes: Object.freeze(report.failures.map(failure =>
      failure.descriptor.recipe
    )),
    requirements: Object.freeze(report.coverage.requirements.map(requirement => Object.freeze({
      id: requirement.id,
      kind: requirement.kind,
      occurrences: requirement.occurrences,
      datasetCount: requirement.datasetCount,
      minimumDatasets: requirement.minimumDatasets,
      meetsMinimum: requirement.meetsMinimum
    })))
  });
}

const baselineAudit = loadBaselineAudit();

function createGarbageCollector() {
  if (typeof globalThis.gc === "function") return globalThis.gc;
  // The scenario CLI normally runs with --expose-gc. Contract runners do not,
  // so expose one isolated collector long enough to keep fifty large immutable
  // chart programs streaming rather than resident together.
  setFlagsFromString("--expose_gc");
  const collect = runInNewContext("gc");
  setFlagsFromString("--no-expose_gc");
  return collect;
}

const collectGarbage = createGarbageCollector();

function runSweepInDisposableProcess({
  childEnvironmentName,
  expectedResources,
  resourcePrefix,
  testName
}) {
  const childEnvironment = {
    ...process.env,
    [childEnvironmentName]: "1"
  };
  delete childEnvironment.NODE_TEST_CONTEXT;
  const child = spawnSync(process.execPath, [
    "--test",
    `--test-name-pattern=^${testName}$`,
    fileURLToPath(import.meta.url)
  ], {
    encoding: "utf8",
    env: childEnvironment,
    maxBuffer: 2 * 1_024 * 1_024
  });
  assert.equal(child.error, undefined, child.error?.message);
  assert.equal(child.signal, null, child.stderr);
  assert.equal(child.status, 0, `${child.stdout}\n${child.stderr}`);
  const resourceLine = child.stdout.split("\n").find(line =>
    line.includes(resourcePrefix)
  );
  assert.notEqual(resourceLine, undefined, child.stdout);
  const resources = JSON.parse(
    resourceLine.slice(resourceLine.indexOf(resourcePrefix) + resourcePrefix.length)
  );
  for (const [key, value] of Object.entries(expectedResources)) {
    assert.deepEqual(resources[key], value, `${testName} ${key}`);
  }
  assert.ok(resources.maxRssKiB < MAX_DISPOSABLE_SWEEP_RSS_KIB, resources);
}

function hashIds(ids) {
  return createHash("sha256").update([...ids].sort().join("\n")).digest("hex");
}

function requirementAction(id) {
  return /^(?:option-path|option-value):([^.=]+)[.=]/u.exec(id)?.[1];
}

function hardRequirement(requirement) {
  return !requirement.meetsMinimum ||
    requirement.datasetCount < requirement.minimumDatasets;
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

function traceHasOption(entry, option) {
  if (Object.hasOwn(entry.args, option.path) && entry.args[option.path] !== undefined) {
    return true;
  }
  const aliases = new Set([
    `${option.path}Count`,
    ...(option.traceAlias === undefined ? [] : [option.traceAlias])
  ]);
  return [...aliases].some(alias => {
    if (!Object.hasOwn(entry.args, alias) || entry.args[alias] === undefined) return false;
    if (alias.endsWith("Count")) {
      return Number.isInteger(entry.args[alias]) && entry.args[alias] > 0;
    }
    return typeof entry.args[alias] === "string" && entry.args[alias].length > 0;
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

function directTraceValues(entry, option) {
  return option.topLevel
    ? (traceHasOption(entry, option) ? [entry.args[option.path]] : [])
    : nestedTraceValues(entry.args, option.path);
}

function observeDirectCoverageTail(program) {
  const observed = new Set();
  const traces = program.trace.children ?? [];
  const has = (operation, predicate) => traces.some(entry =>
    entry.op === operation && predicate(entry.args)
  );
  if (has("createErrorBand", args => args.boundaries === false)) {
    observed.add("option-value:createErrorBand.boundaries=boolean:false");
  }
  if (has("createRegressionData", args => args.interval === "mean")) {
    observed.add("option-value:createRegressionData.interval=string:mean");
  }
  if (has("editErrorBar", args => args.caps === true)) {
    observed.add("option-value:editErrorBar.caps=boolean:true");
  }
  if (has("encodeDensity", args => args.placement?.side === "top")) {
    observed.add("option-value:encodeDensity.placement.side=string:top");
  }
  if (has("encodeHorizon", args => args.palette?.positive === "purpleblue")) {
    observed.add("literal-diversity:encodeHorizon.palette.positive");
  }
  if (has("encodeHorizon", args => args.palette?.negative === "goldred")) {
    observed.add("literal-diversity:encodeHorizon.palette.negative");
  }
  if (has("editHorizon", args => args.palette?.positive === "purpleblue")) {
    observed.add("literal-diversity:editHorizon.palette.positive");
  }
  if (has("editHorizon", args => args.palette?.negative === "goldred")) {
    observed.add("literal-diversity:editHorizon.palette.negative");
  }
  if (has("filterMarks", args => args.property === "y")) {
    observed.add("literal-diversity:filterMarks.property");
  }
  for (const [operation, path] of ALTERNATE_POLAR_FORMAT_PATHS) {
    if (has(operation, args => nestedTraceValues(args, path).includes(".2f"))) {
      observed.add(`literal-diversity:${operation}.${path}`);
    }
  }
  return observed;
}

function targetEvidenceIndex(inventory, targetIds) {
  const targets = new Set(targetIds);
  const pathLiterals = inventory.pathLiteralRequirements.filter(requirement =>
    targets.has(requirement.id)
  );
  const familyLiterals = inventory.familyLiteralRequirements.filter(requirement =>
    targets.has(requirement.id)
  );
  const literalsByOption = new Map();
  for (const requirement of pathLiterals) {
    const values = literalsByOption.get(requirement.optionPath) ?? [];
    values.push(requirement);
    literalsByOption.set(requirement.optionPath, values);
  }
  const familyByKey = new Map(familyLiterals.map(requirement => [
    `${requirement.family}\0${requirement.valueKey}`,
    requirement.id
  ]));
  const assignedFamilies = new Set(
    REALISTIC_DIRECT_LIFECYCLE_COVERAGE_ASSIGNED_LITERAL_FAMILIES
  );
  const options = inventory.optionPaths.filter(option =>
    targets.has(option.id) || literalsByOption.has(option.id) ||
    assignedFamilies.has(option.literalFamily)
  );
  const optionsByAction = new Map();
  for (const option of options) {
    const values = optionsByAction.get(option.action) ?? [];
    values.push(option);
    optionsByAction.set(option.action, values);
  }
  return Object.freeze({ targets, literalsByOption, familyByKey, optionsByAction });
}

function observeDirectTargets(program, metadata, index) {
  const observed = new Set();
  for (const entry of program.trace.children ?? []) {
    for (const option of index.optionsByAction.get(entry.op) ?? []) {
      const values = directTraceValues(entry, option);
      if (values.length === 0) continue;
      if (index.targets.has(option.id)) observed.add(option.id);
      const keys = new Set(values.map(literalValueKey).filter(value =>
        value !== undefined && option.values.includes(value)
      ));
      for (const requirement of index.literalsByOption.get(option.id) ?? []) {
        if (keys.has(requirement.valueKey)) observed.add(requirement.id);
      }
      for (const valueKey of keys) {
        const familyId = index.familyByKey.get(`${option.literalFamily}\0${valueKey}`);
        if (familyId !== undefined) observed.add(familyId);
      }
    }
  }
  if (metadata.dataOperations.includes("single-series-projection")) {
    observed.add("data-operation:single-series-projection");
  }
  return observed;
}

function assertTruthfulMetadata(recipe, factors, program, metadata, label) {
  const definition = datasetDefinition(factors.dataset);
  const provenance = metadata.provenance;
  assert.equal(definition.corpus, "tidytuesday", label);
  assert.equal(metadata.corpus, "tidytuesday", label);
  assert.deepEqual(metadata.sourceDatasetIds, [factors.dataset], label);
  assert.equal(provenance.sourceDataset, factors.dataset, label);
  assert.equal(
    provenance.sourceRowIndexBasis,
    "zero-based-data-row-in-pinned-csv",
    label
  );
  assert.equal(provenance.indexEncoding, SOURCE_INDEX_ENCODING, label);
  assert.ok(provenance.sourceRowCount > 0, label);
  assert.ok(provenance.sourceRowCount <= definition.rows, label);
  assert.ok(provenance.minimumSourceRow >= 0, label);
  assert.ok(provenance.maximumSourceRow < definition.rows, label);
  assert.match(provenance.sourceSelectionSha256, /^[a-f0-9]{64}$/u, label);
  if (provenance.sourceRowIndexes !== undefined) {
    assert.equal(provenance.sourceRowIndexes.length, provenance.sourceRowCount, label);
    assert.ok(provenance.sourceRowIndexes.length <= 160, label);
    assert.equal(new Set(provenance.sourceRowIndexes).size, provenance.sourceRowCount, label);
    assert.equal(
      createHash("sha256").update(provenance.sourceRowIndexes.join(",")).digest("hex"),
      provenance.sourceSelectionSha256,
      label
    );
  }
  assert.ok(Object.keys(provenance.fieldBindings).length > 0, label);
  assert.ok(Object.values(provenance.fieldBindings).every(field =>
    definition.fields[field] !== undefined
  ), label);
  assert.ok(metadata.sourceFields.length >= 2, label);
  assert.ok(metadata.sourceFields.every(field => definition.fields[field.field] !== undefined), label);
  assert.deepEqual(
    metadata.dataOperations,
    provenance.transformations.map(transformation => transformation.op),
    label
  );
  assert.deepEqual(metadata.activeFeatures, [], label);
  assert.deepEqual(recipe.observe(program, factors), [], label);
  assert.deepEqual(
    recipe.observeFactors(program, factors).map(effect => effect.factor),
    ["profile"],
    label
  );
  assert.equal(program.semanticSpec.title?.text, metadata.title, label);
  assert.equal(program.semanticSpec.title?.subtitle, metadata.analysisQuestion, label);
}

function groupPlansByDataset(plans) {
  const groups = new Map();
  for (const plan of plans) {
    const values = groups.get(plan.factors.dataset) ?? [];
    values.push(plan);
    groups.set(plan.factors.dataset, values);
  }
  return groups;
}

function evaluatePlan(recipe, factors, index) {
  const label = `${recipe.id}/${factors.dataset}/${factors.profile.id}`;
  const program = recipe.build(factors);
  const metadata = recipe.describe(factors);
  const directActions = new Set(program.trace.children?.map(entry => entry.op) ?? []);
  assert.ok(recipe.expectedDirectActions.every(action => directActions.has(action)), label);
  assertTruthfulMetadata(recipe, factors, program, metadata, label);
  assertGraphicIntegrity(program, label);
  assertAnalyticLayerIntegrity(program, label);
  assertSvgIntegrity(renderToSVG(program, {
    title: metadata.title,
    description: metadata.analysisQuestion
  }), label);
  return Object.freeze({
    targets: observeDirectTargets(program, metadata, index),
    coverageTail: observeDirectCoverageTail(program)
  });
}

let projectionPromise;

async function buildProjection() {
  if (projectionPromise !== undefined) return projectionPromise;
  projectionPromise = (async () => {
    assert.notEqual(baselineAudit, undefined, "the corrected baseline audit is available");
    const inventory = await inventoryPromise;
    const targetIds = realisticDirectLifecycleRequirementTargets(
      inventory,
      baselineAudit.requirements
    );
    const index = targetEvidenceIndex(inventory, targetIds);
    inventoryPromise = undefined;
    collectGarbage();
    const stats = new Map(targetIds.map(id => [id, emptyStats()]));
    const coverageTailStats = new Map(DIRECT_COVERAGE_TAIL_IDS.map(id => [id, emptyStats()]));
    const plans = REALISTIC_DIRECT_LIFECYCLE_COVERAGE_RECIPES.flatMap(recipe =>
      realisticDirectLifecycleCoverageFactors(recipe).map(factors => ({ recipe, factors }))
    );
    let chartCount = 0;
    for (const [dataset, datasetPlans] of groupPlansByDataset(plans)) {
      try {
        for (const { recipe, factors } of datasetPlans) {
          try {
            const observed = evaluatePlan(recipe, factors, index);
            for (const target of observed.targets) {
              const targetStats = stats.get(target);
              if (targetStats !== undefined) record(targetStats, dataset);
            }
            for (const target of observed.coverageTail) {
              const targetStats = coverageTailStats.get(target);
              if (targetStats !== undefined) record(targetStats, dataset);
            }
            chartCount += 1;
          } finally {
            releaseTidyTuesdaySourceCache(dataset);
            collectGarbage();
          }
        }
      } finally {
        releaseTidyTuesdaySourceCache(dataset);
        collectGarbage();
      }
    }
    return Object.freeze({ chartCount, targetIds, stats, coverageTailStats });
  })();
  return projectionPromise;
}

test("defines ten bounded schedules totaling fifty authentic TT charts", () => {
  assert.deepEqual(REALISTIC_DIRECT_LIFECYCLE_COVERAGE_COUNTS, {
    recipes: 10,
    simple: 1,
    intermediate: 2,
    advanced: 3,
    composite: 4,
    minimumSelections: 50,
    maximumRecipeSelections: 5,
    maximumFamilySelections: 50,
    targetRequirements: 918
  });
  assert.equal(new Set(REALISTIC_DIRECT_LIFECYCLE_COVERAGE_RECIPES.map(recipe =>
    recipe.id
  )).size, 10);
  assert.equal(Object.keys(REALISTIC_DIRECT_LIFECYCLE_COVERAGE_SCHEDULES).length, 10);
  assert.equal(new Set(REALISTIC_DIRECT_LIFECYCLE_COVERAGE_RECIPES.flatMap(recipe =>
    recipe.datasets
  )).size, 50);
  assert.deepEqual(
    Object.fromEntries(Object.keys(EXPECTED_TIER_SELECTIONS).map(tier => [
      tier,
      REALISTIC_DIRECT_LIFECYCLE_COVERAGE_RECIPES
        .filter(recipe => recipe.complexity === tier)
        .reduce((sum, recipe) => sum + recipe.minimumSelections, 0)
    ])),
    EXPECTED_TIER_SELECTIONS
  );
  for (const recipe of REALISTIC_DIRECT_LIFECYCLE_COVERAGE_RECIPES) {
    assert.equal(recipe.suite, "realistic", recipe.id);
    assert.equal(recipe.enforceFactorEffects, true, recipe.id);
    assert.ok(recipe.minimumSelections <= 540, recipe.id);
    assert.ok(recipe.datasets.length >= 31, recipe.id);
    assert.equal(new Set(recipe.datasets).size, recipe.datasets.length, recipe.id);
    assert.ok(recipe.datasets.every(dataset =>
      datasetDefinition(dataset).corpus === "tidytuesday"
    ), recipe.id);
    assert.equal(
      REALISTIC_DIRECT_LIFECYCLE_COVERAGE_SCHEDULES[recipe.id],
      recipe.coverageSchedule,
      recipe.id
    );
    const factors = realisticDirectLifecycleCoverageFactors(recipe);
    assert.equal(factors.length, 5, recipe.id);
    assert.deepEqual(factors.map(value => value.dataset), WITNESS_DATASETS, recipe.id);
    for (const requirement of recipe.coverageSchedule.variantRequirements) {
      const selected = factors.filter(value => value.profile.id === requirement.variantId);
      assert.equal(selected.length, requirement.minimumOccurrences, recipe.id);
      assert.ok(new Set(selected.map(value => value.dataset)).size >= 3, recipe.id);
      assert.equal(requirement.minimumDatasets, 3, recipe.id);
    }
  }
  assert.ok(REALISTIC_DIRECT_LIFECYCLE_COVERAGE_COUNTS.maximumFamilySelections <= 900);
});

test("materializes every alternate direct coverage-tail witness", () => {
  const dataset = "tt-global-temperatures";
  const recipeIds = [
    "realistic-direct-lifecycle-selection-coverage",
    "realistic-direct-lifecycle-statistical-coverage",
    "realistic-direct-lifecycle-derived-encoding-coverage",
    "realistic-direct-lifecycle-regression-coverage",
    "realistic-direct-lifecycle-polar-guide-coverage"
  ];
  const observed = new Set();
  try {
    for (const recipeId of recipeIds) {
      const recipe = REALISTIC_DIRECT_LIFECYCLE_COVERAGE_RECIPES.find(value =>
        value.id === recipeId
      );
      const profile = recipe.factorsForDataset(dataset).profile[0];
      const factors = { dataset, profile };
      const program = recipe.build(factors);
      const metadata = recipe.describe(factors);
      for (const id of observeDirectCoverageTail(program)) observed.add(id);
      assertTruthfulMetadata(recipe, factors, program, metadata, recipeId);
      assertGraphicIntegrity(program, recipeId);
      assertAnalyticLayerIntegrity(program, recipeId);
      assertSvgIntegrity(renderToSVG(program, {
        title: metadata.title,
        description: metadata.analysisQuestion
      }), recipeId);
    }
    assert.deepEqual([...observed].sort(), [...DIRECT_COVERAGE_TAIL_IDS].sort());
  } finally {
    releaseTidyTuesdaySourceCache(dataset);
    collectGarbage();
  }
});

test("keeps authentic Christmas Song selection lines materially continuous", () => {
  const dataset = "tt-christmas-songs";
  const recipe = REALISTIC_DIRECT_LIFECYCLE_COVERAGE_RECIPES.find(value =>
    value.id === "realistic-direct-lifecycle-selection-coverage"
  );
  const profile = recipe.factorsForDataset(dataset).profile[0];
  const factors = { dataset, profile };
  try {
    const program = recipe.build(factors);
    const metadata = recipe.describe(factors);
    const rows = program.semanticSpec.datasets.find(value =>
      value.id === "analysisRows"
    ).values;
    assert.equal(rows.length, 124);
    assert.equal(new Set(rows.map(row => row.sourceRowIndex)).size, rows.length);
    assert.equal(new Set(rows.map(row => row.group)).size, 8);
    assert.deepEqual([...new Set(rows.map(row => row.selectionSeries))], [
      "All observations"
    ]);
    assert.equal(metadata.provenance.sourceRowCount, rows.length);
    assert.equal(
      metadata.provenance.sourceSelectionSha256,
      "f1a7dfe2ebec175f586b91e357bdfa98027e388e7ec8fa98fad0ab7a13736628"
    );
    assert.equal(
      createHash("sha256")
        .update(metadata.provenance.sourceRowIndexes.join(","))
        .digest("hex"),
      metadata.provenance.sourceSelectionSha256
    );
    assert.deepEqual(
      metadata.provenance.transformations.find(value =>
        value.op === "overall-selection-line-cohort-projection"
      ),
      {
        op: "overall-selection-line-cohort-projection",
        groupProjection: "all-observations",
        derivedField: "selectionSeries",
        value: "All observations",
        purpose:
          "form one truthful overall source-order line cohort for selection witnesses " +
          "without dropping rows or changing source categories"
      }
    );
    const continuousTargets = new Set([
      "channel-selection-group",
      "channel-selection-strokeDash",
      "selectionLine"
    ]);
    const grouped = program.trace.children.filter(value =>
      value.op === "encodeGroup" && continuousTargets.has(value.args.target)
    );
    const ordered = program.trace.children.filter(value =>
      value.op === "encodeX" && continuousTargets.has(value.args.target)
    );
    assert.equal(grouped.length, continuousTargets.size);
    assert.ok(grouped.every(value => value.args.field === "selectionSeries"));
    assert.equal(ordered.length, continuousTargets.size);
    assert.ok(ordered.every(value => value.args.field === "rowOrdinal"));
    assertTruthfulMetadata(recipe, factors, program, metadata, dataset);
    assertGraphicIntegrity(program, dataset);
    assertAnalyticLayerIntegrity(program, dataset);
    assertSvgIntegrity(renderToSVG(program, {
      title: metadata.title,
      description: metadata.analysisQuestion
    }), dataset);
  } finally {
    releaseTidyTuesdaySourceCache(dataset);
    collectGarbage();
  }
});

test("falls back to authentic source order for one-measure Spiders selection", () => {
  const dataset = "tt-spiders";
  const recipe = REALISTIC_DIRECT_LIFECYCLE_COVERAGE_RECIPES.find(value =>
    value.id === "realistic-direct-lifecycle-selection-coverage"
  );
  const factors = { dataset, profile: recipe.factorsForDataset(dataset).profile[0] };
  try {
    const program = recipe.build(factors);
    const metadata = recipe.describe(factors);
    const rows = program.semanticSpec.datasets.find(value =>
      value.id === "analysisRows"
    ).values;
    assert.equal(rows.length, 160);
    assert.equal(new Set(rows.map(row => row.sourceRowIndex)).size, rows.length);
    assert.deepEqual([...new Set(rows.map(row => row.selectionSeries))], [
      "All observations"
    ]);
    assert.equal(
      metadata.provenance.sourceSelectionSha256,
      "76c3c4bd8e4428fa9b9e2f77f3382459a6737cf7c728bfe7a1abb49d0c4a225b"
    );
    assert.deepEqual(
      metadata.provenance.transformations.find(value =>
        value.op === "lifecycle-projection" && value.kind === "selection"
      ),
      { op: "lifecycle-projection", kind: "selection" }
    );
    assert.ok(rows.every((row, index) =>
      row.x === index + 1 &&
      row.y === row.value &&
      (index === 0 || rows[index - 1].sourceRowIndex < row.sourceRowIndex)
    ));
    assertTruthfulMetadata(recipe, factors, program, metadata, dataset);
    assertGraphicIntegrity(program, dataset);
    assertAnalyticLayerIntegrity(program, dataset);
    assertSvgIntegrity(renderToSVG(program), dataset);
  } finally {
    releaseTidyTuesdaySourceCache(dataset);
    collectGarbage();
  }
});

test("locks the disjoint corrected hard-requirement partition at 918", async () => {
  assert.deepEqual(REALISTIC_DIRECT_LIFECYCLE_COVERAGE_TARGET_COUNTS, {
    optionPaths: 389,
    optionValues: 478,
    familyLiterals: 50,
    dataOperations: 1,
    total: 918,
    replayCorrectedOptions: 70
  });
  assert.equal(
    REALISTIC_DIRECT_LIFECYCLE_COVERAGE_TARGET_SHA256,
    "5b820744f77368e073c15120cbcb53aa325758e123408615ceed6c8556c7f655"
  );
  assert.deepEqual(REALISTIC_DIRECT_LIFECYCLE_COVERAGE_ASSIGNED_LITERAL_FAMILIES, [
    "literal-3442700b9eeb",
    "literal-6371c9690063",
    "MarkGraphicProperty-fd2942b95187",
    "literal-dfcfe8a02b6b"
  ]);
  assert.equal(REALISTIC_DIRECT_LIFECYCLE_COVERAGE_EXCLUDED_ACTIONS.length, 27);
  assert.equal(new Set(REALISTIC_DIRECT_LIFECYCLE_COVERAGE_EXCLUDED_ACTIONS).size, 27);
  if (baselineAudit === undefined) return;

  const inventory = await inventoryPromise;
  const targets = realisticDirectLifecycleRequirementTargets(
    inventory,
    baselineAudit.requirements
  );
  assert.equal(targets.length, 918);
  assert.equal(hashIds(targets), REALISTIC_DIRECT_LIFECYCLE_COVERAGE_TARGET_SHA256);
  assert.deepEqual({
    optionPaths: targets.filter(id => id.startsWith("option-path:")).length,
    optionValues: targets.filter(id => id.startsWith("option-value:")).length,
    familyLiterals: targets.filter(id => id.startsWith("literal-value:")).length,
    dataOperations: targets.filter(id => id.startsWith("data-operation:")).length
  }, {
    optionPaths: 389,
    optionValues: 478,
    familyLiterals: 50,
    dataOperations: 1
  });
  const requirementById = new Map(baselineAudit.requirements.map(requirement => [
    requirement.id,
    requirement
  ]));
  assert.ok(targets.every(id => hardRequirement(requirementById.get(id))));
  const targetActions = new Set(targets.map(requirementAction).filter(Boolean));
  assert.equal(targetActions.size, 55);
  assert.deepEqual(
    [...targetActions].filter(action =>
      REALISTIC_DIRECT_LIFECYCLE_COVERAGE_EXCLUDED_ACTIONS.includes(action)
    ),
    []
  );
  assert.deepEqual(
    REALISTIC_DIRECT_LIFECYCLE_COVERAGE_EXPECTED_ACTIONS.filter(action =>
      !targetActions.has(action)
    ),
    ["removeEncoding"]
  );
  assert.deepEqual(
    [...targetActions].filter(action =>
      !REALISTIC_DIRECT_LIFECYCLE_COVERAGE_EXPECTED_ACTIONS.includes(action)
    ),
    []
  );

  const corrected = realisticDirectLifecycleReplayCorrectedRequirementIds(
    baselineAudit.requirements
  );
  assert.equal(corrected.length, 70);
  assert.equal(hashIds(corrected), REPLAY_CORRECTED_SHA256);
  assert.ok(!corrected.includes(AUTO_REPLAY_FAMILY_REQUIREMENT));
  assert.ok(hardRequirement(requirementById.get(AUTO_REPLAY_FAMILY_REQUIREMENT)));
  assert.equal(corrected.length + 1, 71);
  assert.equal(baselineAudit.failureCount, 40);
  assert.deepEqual(
    new Set(baselineAudit.failureRecipes),
    new Set(["realistic-guide-scale-cartesian-lifecycle"])
  );

  const partial = baselineAudit.requirements.filter(requirement =>
    targets.includes(requirement.id) && requirement.occurrences > 0
  );
  assert.deepEqual({
    density: partial.filter(requirement => /Density/u.test(requirement.id)).length,
    errorBand: partial.filter(requirement => /ErrorBand/u.test(requirement.id)).length,
    dataOperation: partial.filter(requirement =>
      requirement.id.startsWith("data-operation:")
    ).length,
    total: partial.length
  }, { density: 17, errorBand: 8, dataOperation: 1, total: 26 });
});

test("keeps every authentic TV-ratings series label inside the shared facet legend", () => {
  const dataset = "tt-tv-ratings";
  const recipe = REALISTIC_DIRECT_LIFECYCLE_COVERAGE_RECIPES.find(value =>
    value.id === "realistic-direct-lifecycle-facet-coverage"
  );
  const expectedLabels = [
    "Bones",
    "CSI: Crime Scene Investigation",
    "Criminal Minds",
    "ER",
    "Grey's Anatomy",
    "Law & Order",
    "Law & Order: Special Victims Unit",
    "Midsomer Murders"
  ];
  let captured = false;
  try {
    const result = runScenario({
      id: "regression-direct-facet-tv-ratings",
      recipe: recipe.id,
      factors: { dataset, profile: { id: "maximal" } }
    }, {
      deterministic: false,
      captureProgram(program) {
        captured = true;
        const labelItems = program.graphicSpec.objects.colorLegendLabels.items;
        const labels = labelItems.map(item => item.properties.text);
        const rows = program.semanticSpec.datasets.find(value =>
          value.id === "analysisRows"
        ).values;
        assert.deepEqual(labels, expectedLabels);
        assert.deepEqual(labels, [...new Set(rows.map(row => row.group))]);
        assert.deepEqual(
          program.compositionSpec.facet.values,
          [...new Set(rows.map(row => row.category))]
        );
        assert.ok(labelItems.every(item => item.properties.fontSize === 10.5));
        const canvas = program.graphicSpec.objects.canvas.properties;
        const legendBounds = resolveConcreteGraphicBounds(
          program.graphicSpec,
          "facetedCoverage-shared-legend"
        );
        assert.notEqual(legendBounds, undefined);
        assert.ok(canvas.width - legendBounds.right >= 8);
        assert.ok(legendBounds.right - legendBounds.left > 132);
        assert.ok(canvas.width < 4_500);
        assertGraphicIntegrity(program, dataset);
        assertAnalyticLayerIntegrity(program, dataset);
        assertSvgIntegrity(renderToSVG(program), dataset);
      }
    });
    assert.equal(captured, true);
    assert.ok(result.directOperations.includes("facet"));
    assert.ok(result.directOperations.includes("editCompositionLayout"));
    assert.deepEqual(result.renderers, ["svg"]);
  } finally {
    releaseTidyTuesdaySourceCache(dataset);
    collectGarbage();
  }
});

test(FACET_SWEEP_TEST_NAME, () => {
  if (process.env[FACET_SWEEP_CHILD_ENV] !== "1") {
    runSweepInDisposableProcess({
      childEnvironmentName: FACET_SWEEP_CHILD_ENV,
      expectedResources: {
        builds: 50,
        maximumWidth: 4_648,
        maximumHeight: 2_210
      },
      resourcePrefix: FACET_SWEEP_RESOURCE_PREFIX,
      testName: FACET_SWEEP_TEST_NAME
    });
    return;
  }
  const recipe = REALISTIC_DIRECT_LIFECYCLE_COVERAGE_RECIPES.find(value =>
    value.id === "realistic-direct-lifecycle-facet-coverage"
  );
  let builds = 0;
  let maximumWidth = 0;
  let maximumHeight = 0;
  assert.equal(recipe.datasets.length, 50);
  for (const dataset of recipe.datasets) {
    try {
      const domains = recipe.factorsForDataset(dataset);
      const profile = domains?.profile.find(value => value.id === "maximal");
      assert.notEqual(profile, undefined, `${dataset} maximal facet eligibility`);
      const program = recipe.build({ dataset, profile });
      const rows = program.semanticSpec.datasets.find(value =>
        value.id === "analysisRows"
      ).values;
      const expectedSeries = [...new Set(rows.map(row => row.group))];
      const expectedFacets = [...new Set(rows.map(row => row.category))];
      assert.deepEqual(
        program.graphicSpec.objects.colorLegendLabels.items.map(item =>
          item.properties.text
        ),
        expectedSeries,
        `${dataset} complete legend labels`
      );
      assert.deepEqual(
        program.compositionSpec.facet.values,
        expectedFacets,
        `${dataset} complete facet labels`
      );
      const canvas = program.graphicSpec.objects.canvas.properties;
      const legendBounds = resolveConcreteGraphicBounds(
        program.graphicSpec,
        "facetedCoverage-shared-legend"
      );
      assert.ok(canvas.width - legendBounds.right >= 8, `${dataset} legend safety`);
      assert.ok(canvas.width <= 5_000, `${dataset} bounded facet width`);
      assert.ok(canvas.height <= 2_500, `${dataset} bounded facet height`);
      maximumWidth = Math.max(maximumWidth, canvas.width);
      maximumHeight = Math.max(maximumHeight, canvas.height);
      assertGraphicIntegrity(program, dataset);
      assertAnalyticLayerIntegrity(program, dataset);
      assertSvgIntegrity(renderToSVG(program), dataset);
      builds += 1;
    } finally {
      releaseTidyTuesdaySourceCache(dataset);
      collectGarbage();
    }
  }
  assert.equal(builds, 50);
  assert.equal(maximumWidth, 4_648);
  assert.equal(maximumHeight, 2_210);
  collectGarbage();
  const maxRssKiB = process.resourceUsage().maxRSS;
  assert.ok(maxRssKiB < MAX_DISPOSABLE_SWEEP_RSS_KIB, { maxRssKiB });
  console.log(`${FACET_SWEEP_RESOURCE_PREFIX}${JSON.stringify({
    builds,
    maximumWidth,
    maximumHeight,
    maxRssKiB
  })}`);
});

test("selects polynomial-safe Space Launch groups before sampling", () => {
  const dataset = "tt-space-launches";
  const recipe = REALISTIC_DIRECT_LIFECYCLE_COVERAGE_RECIPES.find(value =>
    value.id === "realistic-direct-lifecycle-regression-coverage"
  );
  const factors = { dataset, profile: { id: "maximal" } };
  let captured = false;
  let semanticDigest;
  let provenanceSnapshot;
  try {
    const result = runScenario({
      id: "regression-direct-polynomial-space-launches",
      recipe: recipe.id,
      factors
    }, {
      deterministic: false,
      captureProgram(program) {
        captured = true;
        const metadata = recipe.describe(factors);
        const provenance = metadata.provenance;
        const rows = program.semanticSpec.datasets.find(value =>
          value.id === "analysisRows"
        ).values;
        const sourceByIndex = new Map(tidyTuesdaySourceEntries(dataset).map(entry => [
          entry.sourceRowIndex,
          entry.row
        ]));
        const groups = new Map();
        for (const row of rows) {
          const values = groups.get(row.group) ?? [];
          values.push(row);
          groups.set(row.group, values);
          const source = sourceByIndex.get(row.sourceRowIndex);
          assert.equal(row.group, String(source.agency_type));
          assert.equal(row.label, String(source.mission ?? source.agency_type));
        }
        assert.deepEqual(
          Object.fromEntries([...groups].map(([group, values]) => [group, values.length])),
          { state: 127, private: 27, startup: 6 }
        );
        assert.ok([...groups.values()].every(values =>
          values.length >= 4 &&
          new Set(values.map(row => row.rowOrdinal)).size >= 3 &&
          new Set(values.map(row => row.positiveY)).size >= 2
        ));
        const fullSourceFilterIndex = provenance.transformations.findIndex(value =>
          value.op === "filter-supported-groups"
        );
        const sampleIndex = provenance.transformations.findIndex(value =>
          value.op === "witness-preserving-even-sample"
        );
        assert.ok(fullSourceFilterIndex >= 0);
        assert.ok(fullSourceFilterIndex < sampleIndex);
        assert.deepEqual(provenance.transformations[fullSourceFilterIndex], {
          op: "filter-supported-groups",
          field: "agency_type",
          minimumRows: 4,
          requireVariation: true
        });
        assert.deepEqual(
          provenance.transformations.find(value =>
            value.op === "polynomial-supported-group-projection"
          ),
          {
            op: "polynomial-supported-group-projection",
            groupProjection: "source-dimension",
            field: "agency_type",
            selectionBasis: "full-source-before-sample",
            minimumRows: 4,
            minimumDistinctX: 3,
            minimumDistinctY: 2,
            eligibleRowCount: 5_726,
            retainedGroups: ["state", "private", "startup"]
          }
        );
        assert.deepEqual(metadata.sampling, {
          method: "deterministic-stratified-witness-sample",
          eligibleRowCount: 5_726,
          displayedRowCount: 160,
          limit: 160,
          strata: ["agency_type"],
          outputRowCount: 160
        });
        assert.equal(provenance.sourceRowCount, 160);
        assert.equal(provenance.sourceRowIndexes.length, 160);
        assert.equal(new Set(provenance.sourceRowIndexes).size, 160);
        assert.equal(
          provenance.sourceSelectionSha256,
          "cdea226599db8c6a2f7904fffe380046617641b299570c25472799788f66b77f"
        );
        assert.equal(
          createHash("sha256").update(provenance.sourceRowIndexes.join(",")).digest("hex"),
          provenance.sourceSelectionSha256
        );
        assert.equal(metadata.analysisQuestion, REGRESSION_ANALYSIS_QUESTION);
        assert.equal(program.semanticSpec.title.subtitle, REGRESSION_ANALYSIS_QUESTION);
        assert.equal(metadata.dataOperations.includes("single-series-projection"), false);
        assertGraphicIntegrity(program, dataset);
        assertAnalyticLayerIntegrity(program, dataset);
        assertSvgIntegrity(renderToSVG(program), dataset);
        semanticDigest = createHash("sha256")
          .update(JSON.stringify(program.semanticSpec))
          .digest("hex");
        provenanceSnapshot = provenance;
      }
    });
    assert.equal(captured, true);
    assert.deepEqual(result.renderers, ["svg"]);
    assert.ok(result.directOperations.includes("createRegression"));
    assert.ok(result.directOperations.includes("createRegressionData"));
    assert.ok(result.directOperations.includes("createRegressionBand"));
    assert.ok(result.directOperations.includes("createRegressionLine"));
    releaseTidyTuesdaySourceCache(dataset);
    collectGarbage();
    const repeated = recipe.build(factors);
    const repeatedMetadata = recipe.describe(factors);
    assert.equal(
      createHash("sha256").update(JSON.stringify(repeated.semanticSpec)).digest("hex"),
      semanticDigest
    );
    assert.deepEqual(repeatedMetadata.provenance, provenanceSnapshot);
  } finally {
    releaseTidyTuesdaySourceCache(dataset);
    collectGarbage();
  }
});

test("keeps the assigned single-series operation truthful and removal-only", () => {
  const removal = REALISTIC_DIRECT_LIFECYCLE_COVERAGE_RECIPES.find(value =>
    value.id === "realistic-direct-lifecycle-removal-coverage"
  );
  const expectedCategoryCounts = {
    "tt-penguins": 3,
    "tt-global-temperatures": 8,
    "tt-london-marathon-winners": 4,
    "tt-himalayan-peaks": 1,
    "tt-us-tornadoes": 8
  };
  for (const dataset of WITNESS_DATASETS) {
    try {
      const factors = { dataset, profile: { id: "maximal" } };
      const program = removal.build(factors);
      const metadata = removal.describe(factors);
      const rows = program.semanticSpec.datasets.find(value =>
        value.id === "analysisRows"
      ).values;
      assert.deepEqual([...new Set(rows.map(row => row.group))], ["All observations"]);
      assert.deepEqual([...new Set(rows.map(row => row.series))], ["All observations"]);
      assert.equal(
        new Set(rows.map(row => row.category)).size,
        expectedCategoryCounts[dataset],
        `${dataset} authentic categories remain intact`
      );
      assert.ok(rows.every(row => row.category !== "All observations"), dataset);
      assert.deepEqual(
        metadata.provenance.transformations.find(value =>
          value.op === "single-series-projection"
        ),
        {
          op: "single-series-projection",
          groupProjection: "all-observations",
          derivedField: "group",
          value: "All observations",
          purpose:
            "collapse only derived grouping channels while preserving authentic category labels and rows"
        }
      );
    } finally {
      releaseTidyTuesdaySourceCache(dataset);
      collectGarbage();
    }
  }
  for (const recipe of REALISTIC_DIRECT_LIFECYCLE_COVERAGE_RECIPES) {
    if (recipe.id === removal.id) continue;
    const dataset = recipe.datasets[0];
    const profile = recipe.factorsForDataset(dataset)?.profile?.[0];
    if (profile === undefined) continue;
    assert.equal(
      recipe.describe({ dataset, profile }).dataOperations.includes(
        "single-series-projection"
      ),
      false,
      recipe.id
    );
    releaseTidyTuesdaySourceCache(dataset);
  }
  collectGarbage();
});

test("uses stable selected source order for the one-measure Spiders removal view", () => {
  const dataset = "tt-spiders";
  const recipe = REALISTIC_DIRECT_LIFECYCLE_COVERAGE_RECIPES.find(value =>
    value.id === "realistic-direct-lifecycle-removal-coverage"
  );
  const factors = { dataset, profile: { id: "maximal" } };
  const roles = realisticDatasetRoles(dataset);
  assert.deepEqual(roles.measures, ["year"]);
  assert.deepEqual(roles.order, ["year"]);
  assert.equal(realisticDatasetSupports(dataset, "style"), true);
  assert.equal(realisticLifecycleEligible(dataset, "style"), false);
  assert.ok(recipe.datasets.includes(dataset));
  let captured = false;
  try {
    const result = runScenario({
      id: "regression-direct-removal-spiders",
      recipe: recipe.id,
      factors
    }, {
      deterministic: false,
      captureProgram(program) {
        captured = true;
        const metadata = recipe.describe(factors);
        const rows = program.semanticSpec.datasets.find(value =>
          value.id === "analysisRows"
        ).values;
        const selectedIndexes = new Set(rows.map(row => row.sourceRowIndex));
        const sourceByIndex = new Map(tidyTuesdaySourceEntries(dataset)
          .filter(entry => selectedIndexes.has(entry.sourceRowIndex))
          .map(entry => [entry.sourceRowIndex, entry.row]));
        assert.equal(rows.length, 160);
        assert.deepEqual(metadata.provenance.fieldBindings, {
          measure: "year",
          dimension: "parentheses",
          secondaryDimension: "family",
          order: "year",
          identifier: "speciesId",
          label: "species"
        });
        for (const [index, row] of rows.entries()) {
          const source = sourceByIndex.get(row.sourceRowIndex);
          assert.notEqual(source, undefined);
          assert.equal(row.x, index + 1);
          assert.equal(row.position, index + 1);
          assert.equal(row.y, source.year);
          assert.equal(row.value, source.year);
          assert.equal(row.category, String(source.parentheses));
          assert.equal(row.sourceGroup, String(source.family));
          assert.equal(row.label, String(source.species));
          assert.equal(row.group, "All observations");
          assert.equal(row.series, "All observations");
          if (index > 0) {
            assert.ok(rows[index - 1].sourceRowIndex < row.sourceRowIndex);
          }
        }
        assert.deepEqual(metadata.sampling, {
          method: "deterministic-stratified-witness-sample",
          eligibleRowCount: 25_791,
          displayedRowCount: 160,
          limit: 160,
          strata: ["parentheses", "family"],
          outputRowCount: 160
        });
        assert.equal(
          metadata.provenance.sourceSelectionSha256,
          "76c3c4bd8e4428fa9b9e2f77f3382459a6737cf7c728bfe7a1abb49d0c4a225b"
        );
        assert.equal(
          createHash("sha256")
            .update(metadata.provenance.sourceRowIndexes.join(","))
            .digest("hex"),
          metadata.provenance.sourceSelectionSha256
        );
        const transformations = metadata.provenance.transformations;
        const sampleIndex = transformations.findIndex(value =>
          value.op === "witness-preserving-even-sample"
        );
        const rankIndex = transformations.findIndex(value =>
          value.op === "stable-selected-source-order-rank"
        );
        assert.ok(sampleIndex >= 0 && sampleIndex < rankIndex);
        assert.deepEqual(transformations[rankIndex], {
          op: "stable-selected-source-order-rank",
          source: "sourceRowIndex",
          sort: "ascending",
          as: "x"
        });
        assert.deepEqual(
          transformations.find(value => value.op === "project-real-analysis-pair"),
          { op: "project-real-analysis-pair", x: "sourceRowIndex", y: "year" }
        );
        assert.deepEqual(
          transformations.find(value =>
            value.op === "lifecycle-projection" && value.kind === "removal"
          ),
          { op: "lifecycle-projection", kind: "removal" }
        );
        assert.equal(
          transformations.some(value => value.op === "filter-valid-analysis-x"),
          false
        );
        assert.deepEqual(
          transformations.find(value => value.op === "single-series-projection"),
          {
            op: "single-series-projection",
            groupProjection: "all-observations",
            derivedField: "group",
            value: "All observations",
            purpose:
              "collapse only derived grouping channels while preserving authentic category labels and rows"
          }
        );
        assert.equal(metadata.analysisQuestion, REMOVAL_ANALYSIS_QUESTION);
        assert.equal(program.semanticSpec.title.subtitle, REMOVAL_ANALYSIS_QUESTION);
        assert.deepEqual(
          program.trace.children
            .filter(value => value.op === "removeEncoding")
            .map(value => value.args.channel),
          REMOVAL_CHANNELS
        );
        assert.deepEqual(recipe.observeFactors(program, factors), [{
          factor: "profile",
          value: { id: "maximal" },
          evidence:
            "direct-root-trace:maximal-lifecycle-actions;final:graphic-program"
        }]);
        assert.deepEqual(recipe.observe(program, factors), []);
        assertGraphicIntegrity(program, dataset);
        assertAnalyticLayerIntegrity(program, dataset);
        assertSvgIntegrity(renderToSVG(program), dataset);
      }
    });
    assert.equal(captured, true);
    assert.deepEqual(result.renderers, ["svg"]);
    assert.ok(result.directOperations.includes("removeEncoding"));
    assert.deepEqual(result.factorEffects, [{
      factor: "profile",
      value: { id: "maximal" },
      evidence: "direct-root-trace:maximal-lifecycle-actions;final:graphic-program"
    }]);
  } finally {
    releaseTidyTuesdaySourceCache(dataset);
    collectGarbage();
  }
});

test(REMOVAL_SWEEP_TEST_NAME, () => {
  if (process.env[REMOVAL_SWEEP_CHILD_ENV] !== "1") {
    runSweepInDisposableProcess({
      childEnvironmentName: REMOVAL_SWEEP_CHILD_ENV,
      expectedResources: {
        builds: 50,
        eligibleDatasets: 50,
        minimumRows: 8,
        maximumRows: 160,
        maximumCategories: 8,
        maximumSourceGroups: 8
      },
      resourcePrefix: REMOVAL_SWEEP_RESOURCE_PREFIX,
      testName: REMOVAL_SWEEP_TEST_NAME
    });
    return;
  }
  const recipe = REALISTIC_DIRECT_LIFECYCLE_COVERAGE_RECIPES.find(value =>
    value.id === "realistic-direct-lifecycle-removal-coverage"
  );
  const allDatasets = realisticDatasetIds();
  assert.equal(allDatasets.length, 50);
  assert.deepEqual(recipe.datasets, allDatasets);
  assert.ok(recipe.datasets.every(dataset =>
    realisticDatasetSupports(dataset, "style")
  ));
  let builds = 0;
  let minimumRows = Number.POSITIVE_INFINITY;
  let maximumRows = 0;
  let maximumCategories = 0;
  let maximumSourceGroups = 0;
  for (const dataset of recipe.datasets) {
    try {
      const domains = recipe.factorsForDataset(dataset);
      const profile = domains?.profile.find(value => value.id === "maximal");
      assert.notEqual(profile, undefined, `${dataset} maximal removal eligibility`);
      const factors = { dataset, profile };
      let captured = false;
      const result = runScenario({
        id: `preflight-direct-removal-${dataset}`,
        recipe: recipe.id,
        factors
      }, {
        deterministic: false,
        captureProgram(program) {
          captured = true;
          const metadata = recipe.describe(factors);
          const rows = program.semanticSpec.datasets.find(value =>
            value.id === "analysisRows"
          ).values;
          const bindings = metadata.provenance.fieldBindings;
          const orderedMeasures = rows.map(row => row.value)
            .sort((left, right) => left - right);
          const middle = Math.floor(orderedMeasures.length / 2);
          const selectedMedian = orderedMeasures.length % 2 === 0
            ? (orderedMeasures[middle - 1] + orderedMeasures[middle]) / 2
            : orderedMeasures[middle];
          const selectedIndexes = new Set(rows.map(row => row.sourceRowIndex));
          const sourceByIndex = new Map(tidyTuesdaySourceEntries(dataset)
            .filter(entry => selectedIndexes.has(entry.sourceRowIndex))
            .map(entry => [entry.sourceRowIndex, entry.row]));
          assert.ok(rows.length >= 2, `${dataset} removal rows`);
          for (const [index, row] of rows.entries()) {
            const source = sourceByIndex.get(row.sourceRowIndex);
            assert.notEqual(source, undefined, `${dataset} source row ${row.sourceRowIndex}`);
            assert.equal(row.x, index + 1, `${dataset} stable x rank`);
            assert.equal(row.position, index + 1, `${dataset} stable position rank`);
            assert.equal(row.y, source[bindings.measure], `${dataset} source measure`);
            assert.equal(row.value, source[bindings.measure], `${dataset} source value`);
            assert.equal(
              row.category,
              String(source[bindings.dimension]),
              `${dataset} authentic category`
            );
            assert.equal(
              row.sourceGroup,
              bindings.secondaryDimension === undefined
                ? source[bindings.measure] < selectedMedian
                  ? "below-median"
                  : "at-or-above-median"
                : String(source[bindings.secondaryDimension]),
              `${dataset} authentic source group`
            );
            assert.equal(row.group, "All observations", `${dataset} derived group`);
            assert.equal(row.series, "All observations", `${dataset} derived series`);
            if (index > 0) {
              assert.ok(
                rows[index - 1].sourceRowIndex < row.sourceRowIndex,
                `${dataset} ascending source order`
              );
            }
          }
          assert.equal(metadata.provenance.sourceRowCount, rows.length, dataset);
          assert.equal(metadata.provenance.sourceRowIndexes.length, rows.length, dataset);
          assert.equal(
            createHash("sha256")
              .update(metadata.provenance.sourceRowIndexes.join(","))
              .digest("hex"),
            metadata.provenance.sourceSelectionSha256,
            dataset
          );
          const transformations = metadata.provenance.transformations;
          assert.equal(
            transformations.some(value => value.op === "median-split"),
            bindings.secondaryDimension === undefined,
            `${dataset} declared derived subgroup`
          );
          assert.deepEqual(
            transformations.find(value =>
              value.op === "stable-selected-source-order-rank"
            ),
            {
              op: "stable-selected-source-order-rank",
              source: "sourceRowIndex",
              sort: "ascending",
              as: "x"
            },
            dataset
          );
          assert.deepEqual(
            transformations.find(value => value.op === "project-real-analysis-pair"),
            {
              op: "project-real-analysis-pair",
              x: "sourceRowIndex",
              y: bindings.measure
            },
            dataset
          );
          assert.deepEqual(
            transformations.find(value =>
              value.op === "lifecycle-projection" && value.kind === "removal"
            ),
            { op: "lifecycle-projection", kind: "removal" },
            dataset
          );
          assert.equal(metadata.analysisQuestion, REMOVAL_ANALYSIS_QUESTION);
          assert.equal(program.semanticSpec.title.subtitle, REMOVAL_ANALYSIS_QUESTION);
          assert.deepEqual(
            program.trace.children
              .filter(value => value.op === "removeEncoding")
              .map(value => value.args.channel),
            REMOVAL_CHANNELS,
            dataset
          );
          assert.deepEqual(recipe.observeFactors(program, factors), [{
            factor: "profile",
            value: { id: "maximal" },
            evidence:
              "direct-root-trace:maximal-lifecycle-actions;final:graphic-program"
          }], `${dataset} maximal factor effect`);
          assert.deepEqual(recipe.observe(program, factors), []);
          assertGraphicIntegrity(program, dataset);
          assertAnalyticLayerIntegrity(program, dataset);
          assertSvgIntegrity(renderToSVG(program), dataset);
          minimumRows = Math.min(minimumRows, rows.length);
          maximumRows = Math.max(maximumRows, rows.length);
          maximumCategories = Math.max(
            maximumCategories,
            new Set(rows.map(row => row.category)).size
          );
          maximumSourceGroups = Math.max(
            maximumSourceGroups,
            new Set(rows.map(row => row.sourceGroup)).size
          );
        }
      });
      assert.equal(captured, true, dataset);
      assert.deepEqual(result.renderers, ["svg"], dataset);
      assert.ok(result.directOperations.includes("removeEncoding"), dataset);
      assert.deepEqual(result.factorEffects, [{
        factor: "profile",
        value: { id: "maximal" },
        evidence: "direct-root-trace:maximal-lifecycle-actions;final:graphic-program"
      }], dataset);
      builds += 1;
    } finally {
      releaseTidyTuesdaySourceCache(dataset);
      collectGarbage();
    }
  }
  assert.equal(builds, 50);
  collectGarbage();
  const maxRssKiB = process.resourceUsage().maxRSS;
  assert.ok(maxRssKiB < MAX_DISPOSABLE_SWEEP_RSS_KIB, { maxRssKiB });
  console.log(`${REMOVAL_SWEEP_RESOURCE_PREFIX}${JSON.stringify({
    builds,
    eligibleDatasets: recipe.datasets.length,
    minimumRows,
    maximumRows,
    maximumCategories,
    maximumSourceGroups,
    maxRssKiB
  })}`);
});

test("uses one truthful horizon cohort for sparse Nuclear Explosion purposes", () => {
  const dataset = "tt-nuclear-explosions";
  const recipe = REALISTIC_DIRECT_LIFECYCLE_COVERAGE_RECIPES.find(value =>
    value.id === "realistic-direct-lifecycle-derived-encoding-coverage"
  );
  const factors = { dataset, profile: { id: "maximal" } };
  let captured = false;
  try {
    const result = runScenario({
      id: "regression-direct-derived-encoding-nuclear-explosions",
      recipe: recipe.id,
      factors
    }, {
      deterministic: false,
      captureProgram(program) {
        captured = true;
        const metadata = recipe.describe(factors);
        const rows = program.semanticSpec.datasets.find(value =>
          value.id === "analysisRows"
        ).values;
        const sourceByIndex = new Map(tidyTuesdaySourceEntries(dataset).map(entry => [
          entry.sourceRowIndex,
          entry.row
        ]));
        assert.equal(rows.length, 160);
        assert.deepEqual(
          Object.fromEntries([...new Set(rows.map(row => row.group))].map(group => [
            group,
            rows.filter(row => row.group === group).length
          ])),
          {
            WR: 117,
            WE: 20,
            SE: 6,
            FMS: 3,
            SAM: 1,
            "PNE:PLO": 4,
            PNE: 8,
            "WR/SE": 1
          }
        );
        for (const row of rows) {
          const source = sourceByIndex.get(row.sourceRowIndex);
          assert.notEqual(source, undefined);
          assert.equal(row.group, String(source.purpose));
          assert.equal(row.category, String(source.purpose));
        }
        assert.deepEqual([...new Set(rows.map(row => row.horizonGroup))], [
          "All observations"
        ]);
        assert.deepEqual(
          metadata.provenance.transformations.find(value =>
            value.op === "overall-horizon-cohort-projection"
          ),
          {
            op: "overall-horizon-cohort-projection",
            groupProjection: "all-observations",
            derivedField: "horizonGroup",
            value: "All observations",
            purpose:
              "form one truthful overall horizon cohort without dropping rows or changing source categories"
          }
        );
        assert.equal(metadata.provenance.sourceRowCount, 160);
        assert.equal(
          metadata.provenance.sourceSelectionSha256,
          "2e8226c4924e481312697ea34b8c2b3d0eeb8ec320e2bb1ff6f406b8914c270d"
        );
        assert.equal(
          createHash("sha256")
            .update(metadata.provenance.sourceRowIndexes.join(","))
            .digest("hex"),
          metadata.provenance.sourceSelectionSha256
        );
        const encodedHorizons = program.trace.children.filter(value =>
          value.op === "encodeHorizon"
        );
        const editedHorizons = program.trace.children.filter(value =>
          value.op === "editHorizon"
        );
        assert.equal(encodedHorizons.length, 6);
        assert.ok(encodedHorizons.every(value =>
          value.args.groupBy === "horizonGroup"
        ));
        assert.equal(editedHorizons.length, 6);
        assert.equal(
          editedHorizons.filter(value => value.args.groupBy === "horizonGroup").length,
          5
        );
        assert.equal(
          editedHorizons.filter(value => value.args.groupBy === false).length,
          1
        );
        assert.equal(metadata.analysisQuestion, DERIVED_ENCODING_ANALYSIS_QUESTION);
        assert.equal(
          program.semanticSpec.title.subtitle,
          DERIVED_ENCODING_ANALYSIS_QUESTION
        );
        assert.deepEqual(recipe.observeFactors(program, factors), [{
          factor: "profile",
          value: { id: "maximal" },
          evidence:
            "direct-root-trace:maximal-lifecycle-actions;final:graphic-program"
        }]);
        assert.deepEqual(recipe.observe(program, factors), []);
        assertGraphicIntegrity(program, dataset);
        assertAnalyticLayerIntegrity(program, dataset);
        assertSvgIntegrity(renderToSVG(program), dataset);
      }
    });
    assert.equal(captured, true);
    assert.deepEqual(result.renderers, ["svg"]);
    for (const operation of recipe.expectedDirectActions) {
      assert.ok(result.directOperations.includes(operation), operation);
    }
  } finally {
    releaseTidyTuesdaySourceCache(dataset);
    collectGarbage();
  }
});

test(DERIVED_SWEEP_TEST_NAME, () => {
  if (process.env[DERIVED_SWEEP_CHILD_ENV] !== "1") {
    runSweepInDisposableProcess({
      childEnvironmentName: DERIVED_SWEEP_CHILD_ENV,
      expectedResources: {
        builds: 31,
        eligibleDatasets: 31,
        skippedDatasets: 19,
        minimumRows: 8,
        maximumRows: 160,
        maximumGroups: 8
      },
      resourcePrefix: DERIVED_SWEEP_RESOURCE_PREFIX,
      testName: DERIVED_SWEEP_TEST_NAME
    });
    return;
  }
  const recipe = REALISTIC_DIRECT_LIFECYCLE_COVERAGE_RECIPES.find(value =>
    value.id === "realistic-direct-lifecycle-derived-encoding-coverage"
  );
  const allDatasets = realisticDatasetIds();
  const skipped = allDatasets.filter(dataset => !recipe.datasets.includes(dataset));
  assert.equal(allDatasets.length, 50);
  assert.equal(recipe.datasets.length, 31);
  assert.equal(skipped.length, 19);
  assert.ok(skipped.every(dataset =>
    realisticDatasetSupports(dataset, "temporal") === false
  ));
  let builds = 0;
  let minimumRows = Number.POSITIVE_INFINITY;
  let maximumRows = 0;
  let maximumGroups = 0;
  for (const dataset of recipe.datasets) {
    try {
      const domains = recipe.factorsForDataset(dataset);
      const profile = domains?.profile.find(value => value.id === "maximal");
      assert.notEqual(profile, undefined, `${dataset} maximal derived eligibility`);
      const factors = { dataset, profile };
      let captured = false;
      const result = runScenario({
        id: `preflight-direct-derived-${dataset}`,
        recipe: recipe.id,
        factors
      }, {
        deterministic: false,
        captureProgram(program) {
          captured = true;
          const metadata = recipe.describe(factors);
          const rows = program.semanticSpec.datasets.find(value =>
            value.id === "analysisRows"
          ).values;
          const horizonGroups = new Map();
          for (const row of rows) {
            horizonGroups.set(
              row.horizonGroup,
              (horizonGroups.get(row.horizonGroup) ?? 0) + 1
            );
          }
          assert.deepEqual([...horizonGroups], [["All observations", rows.length]]);
          assert.ok(rows.length >= 2, `${dataset} horizon cohort points`);
          assert.ok(
            new Set(rows.map(row => row.group)).size >= 1,
            `${dataset} authentic groups remain`
          );
          assert.deepEqual(
            metadata.provenance.transformations.find(value =>
              value.op === "overall-horizon-cohort-projection"
            ),
            {
              op: "overall-horizon-cohort-projection",
              groupProjection: "all-observations",
              derivedField: "horizonGroup",
              value: "All observations",
              purpose:
                "form one truthful overall horizon cohort without dropping rows or changing source categories"
            },
            dataset
          );
          assert.equal(metadata.provenance.sourceRowCount, rows.length, dataset);
          assert.equal(
            createHash("sha256")
              .update(metadata.provenance.sourceRowIndexes.join(","))
              .digest("hex"),
            metadata.provenance.sourceSelectionSha256,
            dataset
          );
          const encodedHorizons = program.trace.children.filter(value =>
            value.op === "encodeHorizon"
          );
          const editedHorizons = program.trace.children.filter(value =>
            value.op === "editHorizon"
          );
          assert.equal(encodedHorizons.length, 6, `${dataset} encoded horizons`);
          assert.ok(encodedHorizons.every(value =>
            value.args.groupBy === "horizonGroup"
          ), `${dataset} encoded overall horizons`);
          assert.equal(editedHorizons.length, 6, `${dataset} edited horizons`);
          assert.equal(
            editedHorizons.filter(value =>
              value.args.groupBy === "horizonGroup"
            ).length,
            5,
            `${dataset} edited overall horizons`
          );
          assert.equal(
            editedHorizons.filter(value => value.args.groupBy === false).length,
            1,
            `${dataset} ungrouped edit witness`
          );
          assert.equal(
            program.trace.children.filter(value =>
              value.op === "encodeHistogram"
            ).length,
            5,
            `${dataset} histogram variants`
          );
          assert.equal(metadata.analysisQuestion, DERIVED_ENCODING_ANALYSIS_QUESTION);
          assert.equal(
            program.semanticSpec.title.subtitle,
            DERIVED_ENCODING_ANALYSIS_QUESTION
          );
          assert.deepEqual(recipe.observeFactors(program, factors), [{
            factor: "profile",
            value: { id: "maximal" },
            evidence:
              "direct-root-trace:maximal-lifecycle-actions;final:graphic-program"
          }], `${dataset} maximal factor effect`);
          assert.deepEqual(recipe.observe(program, factors), []);
          assertGraphicIntegrity(program, dataset);
          assertAnalyticLayerIntegrity(program, dataset);
          assertSvgIntegrity(renderToSVG(program), dataset);
          minimumRows = Math.min(minimumRows, rows.length);
          maximumRows = Math.max(maximumRows, rows.length);
          maximumGroups = Math.max(
            maximumGroups,
            new Set(rows.map(row => row.group)).size
          );
        }
      });
      assert.equal(captured, true, dataset);
      assert.deepEqual(result.renderers, ["svg"], dataset);
      for (const operation of recipe.expectedDirectActions) {
        assert.ok(result.directOperations.includes(operation), `${dataset} ${operation}`);
      }
      builds += 1;
    } finally {
      releaseTidyTuesdaySourceCache(dataset);
      collectGarbage();
    }
  }
  assert.equal(builds, 31);
  collectGarbage();
  const maxRssKiB = process.resourceUsage().maxRSS;
  assert.ok(maxRssKiB < MAX_DISPOSABLE_SWEEP_RSS_KIB, { maxRssKiB });
  console.log(`${DERIVED_SWEEP_RESOURCE_PREFIX}${JSON.stringify({
    builds,
    eligibleDatasets: recipe.datasets.length,
    skippedDatasets: skipped.length,
    minimumRows,
    maximumRows,
    maximumGroups,
    maxRssKiB
  })}`);
});

test("uses one truthful statistical cohort for sparse Nuclear Explosion bands", () => {
  const dataset = "tt-nuclear-explosions";
  const recipe = REALISTIC_DIRECT_LIFECYCLE_COVERAGE_RECIPES.find(value =>
    value.id === "realistic-direct-lifecycle-statistical-coverage"
  );
  const factors = { dataset, profile: { id: "maximal" } };
  let captured = false;
  try {
    const result = runScenario({
      id: "regression-direct-statistical-nuclear-explosions",
      recipe: recipe.id,
      factors
    }, {
      deterministic: false,
      captureProgram(program) {
        captured = true;
        const metadata = recipe.describe(factors);
        const rows = program.semanticSpec.datasets.find(value =>
          value.id === "analysisRows"
        ).values;
        assert.equal(rows.length, 160);
        assert.deepEqual(
          Object.fromEntries([...new Set(rows.map(row => row.group))].map(group => [
            group,
            rows.filter(row => row.group === group).length
          ])),
          {
            WR: 117,
            WE: 20,
            SE: 6,
            FMS: 3,
            SAM: 1,
            "PNE:PLO": 4,
            PNE: 8,
            "WR/SE": 1
          }
        );
        assert.deepEqual([...new Set(rows.map(row => row.bandGroup))], [
          "All observations"
        ]);
        assert.deepEqual(
          metadata.provenance.transformations.find(value =>
            value.op === "overall-statistical-cohort-projection"
          ),
          {
            op: "overall-statistical-cohort-projection",
            groupProjection: "all-observations",
            derivedField: "bandGroup",
            value: "All observations",
            purpose:
              "form one truthful overall bar-and-band cohort without dropping rows or changing source categories"
          }
        );
        assert.equal(metadata.provenance.sourceRowCount, 160);
        assert.equal(
          metadata.provenance.sourceSelectionSha256,
          "2e8226c4924e481312697ea34b8c2b3d0eeb8ec320e2bb1ff6f406b8914c270d"
        );
        assert.equal(
          createHash("sha256")
            .update(metadata.provenance.sourceRowIndexes.join(","))
            .digest("hex"),
          metadata.provenance.sourceSelectionSha256
        );
        const bands = program.trace.children.filter(value =>
          value.op === "createErrorBand"
        );
        assert.equal(bands.length, 20);
        assert.equal(bands.filter(value => value.args.groupBy === "bandGroup").length, 12);
        assert.equal(bands.filter(value => value.args.groupBy === undefined).length, 8);
        const intervalBars = program.trace.children.filter(value =>
          value.op === "createErrorBar" && /error-[xy]-stat-/u.test(value.args.id)
        );
        assert.equal(intervalBars.length, 8);
        assert.ok(intervalBars.every(value =>
          value.args.x?.field === "bandGroup" || value.args.y?.field === "bandGroup"
        ));
        assert.equal(metadata.analysisQuestion, STATISTICAL_ANALYSIS_QUESTION);
        assert.equal(program.semanticSpec.title.subtitle, STATISTICAL_ANALYSIS_QUESTION);
        assertGraphicIntegrity(program, dataset);
        assertAnalyticLayerIntegrity(program, dataset);
        assertSvgIntegrity(renderToSVG(program), dataset);
      }
    });
    assert.equal(captured, true);
    assert.deepEqual(result.renderers, ["svg"]);
    assert.ok(result.directOperations.includes("createErrorBar"));
    assert.ok(result.directOperations.includes("editErrorBar"));
    assert.ok(result.directOperations.includes("createErrorBand"));
    assert.ok(result.directOperations.includes("editErrorBand"));
  } finally {
    releaseTidyTuesdaySourceCache(dataset);
    collectGarbage();
  }
});

test("preserves a bounded root cause in statistical band diagnostics", () => {
  const cause = new Error(
    'Area series on mark "error-band-0" requires at least two points.'
  );
  const failure = realisticDirectLifecycleErrorBandFailure(0, cause);
  assert.equal(
    failure.message,
    'Direct lifecycle error-band variant 0 failed: Area series on mark "error-band-0" requires at least two points.'
  );
  assert.equal(failure.cause, cause);
  const bounded = realisticDirectLifecycleErrorBandFailure(
    19,
    new Error(`large\n${"factor".repeat(80)}`)
  );
  assert.equal(bounded.message.includes("\n"), false);
  assert.ok(bounded.message.endsWith("…"));
  assert.ok(bounded.message.length <= 230);
});

test(STATISTICAL_SWEEP_TEST_NAME, () => {
  if (process.env[STATISTICAL_SWEEP_CHILD_ENV] !== "1") {
    runSweepInDisposableProcess({
      childEnvironmentName: STATISTICAL_SWEEP_CHILD_ENV,
      expectedResources: {
        builds: 31,
        eligibleDatasets: 31,
        skippedDatasets: 19,
        minimumRows: 8,
        maximumRows: 160,
        maximumGroups: 8
      },
      resourcePrefix: STATISTICAL_SWEEP_RESOURCE_PREFIX,
      testName: STATISTICAL_SWEEP_TEST_NAME
    });
    return;
  }
  const recipe = REALISTIC_DIRECT_LIFECYCLE_COVERAGE_RECIPES.find(value =>
    value.id === "realistic-direct-lifecycle-statistical-coverage"
  );
  const allDatasets = realisticDatasetIds();
  const skipped = allDatasets.filter(dataset => !recipe.datasets.includes(dataset));
  assert.equal(allDatasets.length, 50);
  assert.equal(recipe.datasets.length, 31);
  assert.equal(skipped.length, 19);
  assert.ok(skipped.every(dataset =>
    realisticDatasetSupports(dataset, "temporal") === false
  ));
  let builds = 0;
  let minimumRows = Number.POSITIVE_INFINITY;
  let maximumRows = 0;
  let maximumGroups = 0;
  for (const dataset of recipe.datasets) {
    try {
      const domains = recipe.factorsForDataset(dataset);
      const profile = domains?.profile.find(value => value.id === "maximal");
      assert.notEqual(profile, undefined, `${dataset} maximal statistical eligibility`);
      const factors = { dataset, profile };
      let captured = false;
      const result = runScenario({
        id: `preflight-direct-statistical-${dataset}`,
        recipe: recipe.id,
        factors
      }, {
        deterministic: false,
        captureProgram(program) {
          captured = true;
          const metadata = recipe.describe(factors);
          const rows = program.semanticSpec.datasets.find(value =>
            value.id === "analysisRows"
          ).values;
          const bandGroups = new Map();
          for (const row of rows) {
            bandGroups.set(
              row.bandGroup,
              (bandGroups.get(row.bandGroup) ?? 0) + 1
            );
          }
          assert.deepEqual([...bandGroups], [["All observations", rows.length]]);
          assert.ok(rows.length >= 2, `${dataset} error-band cohort points`);
          const cohort = metadata.provenance.transformations.find(value =>
            value.op === "overall-statistical-cohort-projection"
          );
          assert.notEqual(cohort, undefined, `${dataset} cohort provenance`);
          const bands = program.trace.children.filter(value =>
            value.op === "createErrorBand"
          );
          assert.equal(bands.length, 20, `${dataset} error bands`);
          assert.equal(
            bands.filter(value => value.args.groupBy === "bandGroup").length,
            12,
            `${dataset} grouped error bands`
          );
          assert.equal(
            bands.filter(value => value.args.groupBy === undefined).length,
            8,
            `${dataset} aggregate error bands`
          );
          assert.equal(metadata.provenance.sourceRowCount, rows.length, dataset);
          assert.equal(
            createHash("sha256")
              .update(metadata.provenance.sourceRowIndexes.join(","))
              .digest("hex"),
            metadata.provenance.sourceSelectionSha256,
            dataset
          );
          assert.equal(metadata.analysisQuestion, STATISTICAL_ANALYSIS_QUESTION);
          assertGraphicIntegrity(program, dataset);
          assertAnalyticLayerIntegrity(program, dataset);
          assertSvgIntegrity(renderToSVG(program), dataset);
          minimumRows = Math.min(minimumRows, rows.length);
          maximumRows = Math.max(maximumRows, rows.length);
          maximumGroups = Math.max(
            maximumGroups,
            new Set(rows.map(row => row.group)).size
          );
        }
      });
      assert.equal(captured, true, dataset);
      assert.deepEqual(result.renderers, ["svg"], dataset);
      builds += 1;
    } finally {
      releaseTidyTuesdaySourceCache(dataset);
      collectGarbage();
    }
  }
  assert.equal(builds, 31);
  collectGarbage();
  const maxRssKiB = process.resourceUsage().maxRSS;
  assert.ok(maxRssKiB < MAX_DISPOSABLE_SWEEP_RSS_KIB, { maxRssKiB });
  console.log(`${STATISTICAL_SWEEP_RESOURCE_PREFIX}${JSON.stringify({
    builds,
    eligibleDatasets: recipe.datasets.length,
    skippedDatasets: skipped.length,
    minimumRows,
    maximumRows,
    maximumGroups,
    maxRssKiB
  })}`);
});

test(REGRESSION_SWEEP_TEST_NAME, () => {
  if (process.env[REGRESSION_SWEEP_CHILD_ENV] !== "1") {
    runSweepInDisposableProcess({
      childEnvironmentName: REGRESSION_SWEEP_CHILD_ENV,
      expectedResources: {
        builds: 50,
        minimumRows: 49,
        maximumRows: 160,
        minimumGroups: 1,
        maximumGroups: 8,
        fallbackDatasets: ["tt-global-temperatures", "tt-cats-vs-dogs"]
      },
      resourcePrefix: REGRESSION_SWEEP_RESOURCE_PREFIX,
      testName: REGRESSION_SWEEP_TEST_NAME
    });
    return;
  }
  const recipe = REALISTIC_DIRECT_LIFECYCLE_COVERAGE_RECIPES.find(value =>
    value.id === "realistic-direct-lifecycle-regression-coverage"
  );
  let builds = 0;
  let minimumRows = Number.POSITIVE_INFINITY;
  let maximumRows = 0;
  let minimumGroups = Number.POSITIVE_INFINITY;
  let maximumGroups = 0;
  const fallbackDatasets = [];
  assert.equal(recipe.datasets.length, 50);
  for (const dataset of recipe.datasets) {
    try {
      const domains = recipe.factorsForDataset(dataset);
      const profile = domains?.profile.find(value => value.id === "maximal");
      assert.notEqual(profile, undefined, `${dataset} maximal regression eligibility`);
      const factors = { dataset, profile };
      const program = recipe.build(factors);
      const metadata = recipe.describe(factors);
      const rows = program.semanticSpec.datasets.find(value =>
        value.id === "analysisRows"
      ).values;
      const groups = new Map();
      for (const row of rows) {
        const values = groups.get(row.group) ?? [];
        values.push(row);
        groups.set(row.group, values);
      }
      assert.ok([...groups.values()].every(values =>
        values.length >= 4 &&
        new Set(values.map(row => row.rowOrdinal)).size >= 3 &&
        new Set(values.map(row => row.positiveY)).size >= 2
      ), `${dataset} polynomial group support`);
      const projection = metadata.provenance.transformations.find(value =>
        value.op === "polynomial-supported-group-projection"
      );
      assert.notEqual(projection, undefined, `${dataset} polynomial projection`);
      assert.equal(projection.selectionBasis, "full-source-before-sample");
      if (projection.groupProjection === "all-observations") {
        fallbackDatasets.push(dataset);
      } else {
        const filterIndex = metadata.provenance.transformations.findIndex(value =>
          value.op === "filter-supported-groups"
        );
        const sampleIndex = metadata.provenance.transformations.findIndex(value =>
          value.op === "witness-preserving-even-sample"
        );
        assert.ok(filterIndex >= 0 && filterIndex < sampleIndex, dataset);
      }
      assert.equal(metadata.provenance.sourceRowCount, rows.length, dataset);
      assert.equal(metadata.provenance.sourceRowIndexes.length, rows.length, dataset);
      assert.equal(
        createHash("sha256")
          .update(metadata.provenance.sourceRowIndexes.join(","))
          .digest("hex"),
        metadata.provenance.sourceSelectionSha256,
        dataset
      );
      assert.equal(metadata.analysisQuestion, REGRESSION_ANALYSIS_QUESTION);
      assert.equal(metadata.dataOperations.includes("single-series-projection"), false);
      assertGraphicIntegrity(program, dataset);
      assertAnalyticLayerIntegrity(program, dataset);
      assertSvgIntegrity(renderToSVG(program), dataset);
      minimumRows = Math.min(minimumRows, rows.length);
      maximumRows = Math.max(maximumRows, rows.length);
      minimumGroups = Math.min(minimumGroups, groups.size);
      maximumGroups = Math.max(maximumGroups, groups.size);
      builds += 1;
    } finally {
      releaseTidyTuesdaySourceCache(dataset);
      collectGarbage();
    }
  }
  assert.equal(builds, 50);
  collectGarbage();
  const maxRssKiB = process.resourceUsage().maxRSS;
  assert.ok(maxRssKiB < MAX_DISPOSABLE_SWEEP_RSS_KIB, { maxRssKiB });
  console.log(`${REGRESSION_SWEEP_RESOURCE_PREFIX}${JSON.stringify({
    builds,
    minimumRows,
    maximumRows,
    minimumGroups,
    maximumGroups,
    fallbackDatasets,
    maxRssKiB
  })}`);
});

test("fifty direct-root builds close every assigned gap with material graphics", async () => {
  if (baselineAudit === undefined) return;
  const projection = await buildProjection();
  assert.equal(projection.chartCount, 50);
  assert.equal(projection.targetIds.length, 918);
  assert.deepEqual(
    projection.targetIds.filter(id => !meetsMinimum(projection.stats.get(id))),
    []
  );
  assert.deepEqual(
    DIRECT_COVERAGE_TAIL_IDS.filter(id =>
      !meetsMinimum(projection.coverageTailStats.get(id))
    ),
    []
  );
});
