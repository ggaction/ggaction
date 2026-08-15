import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";
import { runInNewContext } from "node:vm";
import { setFlagsFromString } from "node:v8";

import { renderToSVG } from "../../src/renderers/svg.js";
import { assertAnalyticLayerIntegrity } from "../oracles/analytic-layer-integrity.js";
import { assertGraphicIntegrity } from "../oracles/graphic-integrity.js";
import { assertSvgIntegrity } from "../oracles/svg-integrity.js";
import { datasetDefinition } from "../support/datasets/catalog.js";
import { releaseTidyTuesdaySourceCache } from "../support/datasets/tidytuesday.js";
import { buildPublicOptionInventory } from "../support/scenarios/coverage-inventory.js";
import {
  SOURCE_INDEX_ENCODING,
  literalValueKey
} from "../support/scenarios/coverage-ledger.js";
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
  return observeDirectTargets(program, metadata, index);
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
    const plans = REALISTIC_DIRECT_LIFECYCLE_COVERAGE_RECIPES.flatMap(recipe =>
      realisticDirectLifecycleCoverageFactors(recipe).map(factors => ({ recipe, factors }))
    );
    let chartCount = 0;
    for (const [dataset, datasetPlans] of groupPlansByDataset(plans)) {
      try {
        for (const { recipe, factors } of datasetPlans) {
          try {
            for (const target of evaluatePlan(recipe, factors, index)) {
              const targetStats = stats.get(target);
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
    return Object.freeze({ chartCount, targetIds, stats });
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

test("fifty direct-root builds close every assigned gap with material graphics", async () => {
  if (baselineAudit === undefined) return;
  const projection = await buildProjection();
  assert.equal(projection.chartCount, 50);
  assert.equal(projection.targetIds.length, 918);
  assert.deepEqual(
    projection.targetIds.filter(id => !meetsMinimum(projection.stats.get(id))),
    []
  );
});
