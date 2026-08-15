import assert from "node:assert/strict";
import { createHash } from "node:crypto";

import { renderToSVG } from "../../../src/renderers/svg.js";
import { assertAnalyticLayerIntegrity } from "../../oracles/analytic-layer-integrity.js";
import { assertGraphicIntegrity } from "../../oracles/graphic-integrity.js";
import { assertSvgIntegrity } from "../../oracles/svg-integrity.js";
import { datasetDefinition } from "../datasets/catalog.js";
import { releaseTidyTuesdaySourceCache } from "../datasets/tidytuesday.js";
import { scenarioDatasetAvailable } from "./data-views.js";
import { assertPairwiseCoverage, pairwiseCases } from "./pairwise.js";
import {
  REALISTIC_SCENARIO_RECIPES,
  SCENARIO_RECIPES,
  scenarioRecipe
} from "./recipes.js";

const REALISTIC_DATASET_QUOTAS = Object.freeze({
  simple: 14,
  intermediate: 28,
  advanced: 22,
  composite: 8
});
const REALISTIC_COMPLEXITIES = Object.freeze(Object.keys(REALISTIC_DATASET_QUOTAS));
const realisticGenerationDiagnostics = new WeakMap();

function stableValue(value) {
  if (Array.isArray(value)) return `[${value.map(stableValue).join(",")}]`;
  if (value !== null && typeof value === "object") {
    return `{${Object.entries(value).map(([key, child]) =>
      `${JSON.stringify(key)}:${stableValue(child)}`
    ).join(",")}}`;
  }
  return JSON.stringify(value);
}

function descriptorId(recipeId, factors) {
  const digest = createHash("sha256")
    .update(recipeId)
    .update("\0")
    .update(stableValue(factors))
    .digest("hex")
    .slice(0, 12);
  return `${recipeId}-${digest}`;
}

function freezeClone(value) {
  if (value === null || typeof value !== "object") return value;
  const copy = Array.isArray(value)
    ? value.map(freezeClone)
    : Object.fromEntries(Object.entries(value).map(([key, child]) =>
        [key, freezeClone(child)]
      ));
  return Object.freeze(copy);
}

function hashOffset(value) {
  return Number.parseInt(createHash("sha256").update(value).digest("hex").slice(0, 8), 16);
}

function availableDatasets(recipe, includeTidyTuesday) {
  const eligible = recipe.datasets.filter(id => {
    const definition = datasetDefinition(id);
    return includeTidyTuesday || definition.corpus !== "tidytuesday";
  });
  const unavailable = eligible.filter(id => !scenarioDatasetAvailable(id));
  if (unavailable.length > 0) {
    throw new Error(
      `Scenario recipe "${recipe.id}" requires unavailable datasets: ` +
      `${unavailable.join(", ")}. Run npm run datasets:sync first.`
    );
  }
  return eligible;
}

function smokeCases(recipe, datasets) {
  const entries = Object.entries(recipe.factors);
  const baseline = Object.fromEntries(entries.map(([name, values]) => [name, values[0]]));
  const edge = Object.fromEntries(entries.map(([name, values]) => [name, values.at(-1)]));
  return [
    ...datasets.map(dataset => ({ dataset, ...baseline })),
    { dataset: datasets.at(-1), ...edge }
  ].filter((value, index, values) =>
    values.findIndex(candidate => stableValue(candidate) === stableValue(value)) === index
  );
}

export function scenarioFactorContract(recipeId, {
  includeTidyTuesday = true,
  dataset
} = {}) {
  const recipe = scenarioRecipe(recipeId);
  const datasets = availableDatasets(recipe, includeTidyTuesday);
  if (datasets.length === 0) {
    throw new Error(`Scenario recipe "${recipeId}" has no available datasets.`);
  }
  if (dataset !== undefined) {
    if (!datasets.includes(dataset)) {
      throw new Error(`Scenario recipe "${recipeId}" does not support dataset "${dataset}".`);
    }
    const factorValues = recipe.factorsForDataset === undefined
      ? recipe.factors
      : recipe.factorsForDataset(dataset);
    if (factorValues === undefined) return undefined;
    return Object.freeze({ dataset: Object.freeze([dataset]), ...factorValues });
  }
  return Object.freeze({ dataset: Object.freeze(datasets), ...recipe.factors });
}

function factorPairKeys(values) {
  const entries = Object.entries(values).filter(([name]) => name !== "dataset");
  const keys = [];
  for (let left = 0; left < entries.length; left += 1) {
    for (let right = left + 1; right < entries.length; right += 1) {
      keys.push(
        `${entries[left][0]}=${stableValue(entries[left][1])}|` +
        `${entries[right][0]}=${stableValue(entries[right][1])}`
      );
    }
  }
  return keys;
}

function factorPool(recipe, dataset, globalState) {
  const key = `${recipe.id}\0${dataset}`;
  if (globalState.factorPools.has(key)) {
    const cached = globalState.factorPools.get(key);
    globalState.factorPools.delete(key);
    globalState.factorPools.set(key, cached);
    return cached;
  }
  const contract = scenarioFactorContract(recipe.id, { dataset });
  if (contract === undefined) {
    globalState.factorPools.set(key, undefined);
    return undefined;
  }
  const cases = pairwiseCases(contract);
  assertPairwiseCoverage(cases, contract);
  const offset = hashOffset(key) % cases.length;
  const rotated = [
    ...cases.slice(offset),
    ...cases.slice(0, offset)
  ];
  const value = Object.freeze({ contract, cases: Object.freeze(rotated) });
  globalState.factorPools.set(key, value);
  if (globalState.factorPools.size > 8) {
    globalState.factorPools.delete(globalState.factorPools.keys().next().value);
  }
  return value;
}

function factorVariant(recipe, dataset, variant, globalState) {
  const pool = factorPool(recipe, dataset, globalState);
  if (pool === undefined) return undefined;
  const attemptedKey = `${recipe.id}\0${dataset}`;
  const attempted = globalState.attemptedFactorCases.get(attemptedKey) ?? new Set();
  globalState.attemptedFactorCases.set(attemptedKey, attempted);
  const schedule = recipe.coverageSchedule;
  const selectionIds = schedule?.selectionVariantIds;
  const selectionOrdinal = globalState.recipeCounts.get(recipe.id) ?? 0;
  const scheduledId = Array.isArray(selectionIds) && selectionIds.length > 0
    ? selectionIds[selectionOrdinal % selectionIds.length]
    : undefined;
  if (!globalState.baselineFactorCases.has(attemptedKey)) {
    globalState.baselineFactorCases.add(attemptedKey);
    const factors = Object.freeze(Object.fromEntries(Object.entries(pool.contract)
      .map(([name, domain]) => [name, domain[0]])));
    if (scheduledId === undefined || factors[schedule.factor]?.id === scheduledId) {
      return Object.freeze({
        factors,
        factorPairs: Object.freeze(factorPairKeys(factors)),
        factorValues: Object.freeze(Object.entries(factors)
          .filter(([name]) => name !== "dataset")
          .map(([name, child]) => Object.freeze({
            name,
            usageKey: `${recipe.id}\0${name}\0${stableValue(child)}`
          }))),
        caseKey: `${recipe.id}\0${stableValue(factors)}`
      });
    }
  }
  const eligibleIndexes = [];
  for (let index = 0; index < pool.cases.length; index += 1) {
    const candidate = pool.cases[index];
    if (
      scheduledId === undefined ||
      candidate[schedule.factor]?.id === scheduledId
    ) eligibleIndexes.push(index);
  }
  if (eligibleIndexes.length === 0) {
    throw new Error(
      `Scenario recipe "${recipe.id}" schedule requests unavailable ` +
      `${schedule.factor} variant "${scheduledId}" for dataset "${dataset}".`
    );
  }
  let best;
  const searchLimit = Math.min(96, eligibleIndexes.length);
  const start = eligibleIndexes.length === 0
    ? 0
    : hashOffset(`${attemptedKey}\0${variant}`) % eligibleIndexes.length;
  for (let ordinal = 0; ordinal < searchLimit; ordinal += 1) {
    const index = eligibleIndexes[(start + ordinal) % eligibleIndexes.length];
    if (attempted.has(index)) continue;
    const factors = pool.cases[index];
    const factorPairs = factorPairKeys(factors);
    const factorValues = Object.entries(factors)
      .filter(([name]) => name !== "dataset")
      .map(([name, child]) => ({
        name,
        usageKey: `${recipe.id}\0${name}\0${stableValue(child)}`
      }));
    let balanceScore = 0;
    for (const factorValue of factorValues) {
      balanceScore += 1 /
        (1 + (globalState.factorValueCounts.get(factorValue.usageKey) ?? 0));
    }
    const newPairs = factorPairs.filter(key =>
      !globalState.factorPairs.has(`${recipe.id}\0${key}`)
    ).length;
    const caseKey = `${recipe.id}\0${stableValue(factors)}`;
    const caseUse = globalState.factorCaseCounts.get(caseKey) ?? 0;
    const score = balanceScore * 1_000 + newPairs * 10 - caseUse;
    const tie = (index + variant) % pool.cases.length;
    if (
      best === undefined || score > best.score ||
      score === best.score && tie < best.tie
    ) best = { index, factors, factorPairs, factorValues, caseKey, score, tie };
  }
  if (best === undefined) {
    for (const index of eligibleIndexes) attempted.delete(index);
    return factorVariant(recipe, dataset, variant + 1, globalState);
  }
  attempted.add(best.index);
  return Object.freeze({
    factors: best.factors,
    factorPairs: best.factorPairs,
    factorValues: best.factorValues,
    caseKey: best.caseKey
  });
}

function recordFactorSelection(recipe, selection, globalState) {
  for (const factorValue of selection.factorValues) {
    globalState.factorValueCounts.set(
      factorValue.usageKey,
      (globalState.factorValueCounts.get(factorValue.usageKey) ?? 0) + 1
    );
  }
  for (const pair of selection.factorPairs) {
    globalState.factorPairs.add(`${recipe.id}\0${pair}`);
  }
  globalState.factorCaseCounts.set(
    selection.caseKey,
    (globalState.factorCaseCounts.get(selection.caseKey) ?? 0) + 1
  );
  const schedule = recipe.coverageSchedule;
  if (schedule !== undefined) {
    const variantId = selection.factors[schedule.factor]?.id;
    if (typeof variantId !== "string" || variantId.length === 0) {
      throw new Error(
        `Scenario recipe "${recipe.id}" selected no scheduled ${schedule.factor} id.`
      );
    }
    const key = `${recipe.id}\0${variantId}`;
    const current = globalState.scheduleFulfillment.get(key) ?? {
      recipe: recipe.id,
      factor: schedule.factor,
      variantId,
      count: 0,
      datasets: new Set()
    };
    current.count += 1;
    current.datasets.add(selection.factors.dataset);
    globalState.scheduleFulfillment.set(key, current);
  }
}

function assertPrimaryGraphic(program, label) {
  return assertAnalyticLayerIntegrity(program, label);
}

function observedFeatures(recipe, program, factors) {
  const values = recipe.observe?.(program, factors) ?? [];
  if (!Array.isArray(values) || values.some(value =>
    typeof value !== "string" || value.length === 0
  )) {
    throw new TypeError(`Scenario recipe "${recipe.id}" returned invalid observed features.`);
  }
  return Object.freeze([...new Set(values)]);
}

function assertRecipeEvidence(recipe, program, factors, metadata, label) {
  const claimed = metadata?.activeFeatures ?? [];
  if (!Array.isArray(claimed) || claimed.some(value =>
    typeof value !== "string" || value.length === 0
  )) {
    throw new TypeError(`Scenario recipe "${recipe.id}" declared invalid active features.`);
  }
  const effective = observedFeatures(recipe, program, factors);
  assert.deepEqual(
    [...new Set(claimed)].sort(),
    [...effective].sort(),
    `${label} claimed and independently observed features`
  );
  const expected = recipe.expectedDirectActionsFor?.(factors) ??
    recipe.expectedDirectActions ?? [];
  if (!Array.isArray(expected) || expected.some(value =>
    typeof value !== "string" || value.length === 0
  )) {
    throw new TypeError(`Scenario recipe "${recipe.id}" declared invalid direct actions.`);
  }
  const direct = new Set(collectDirectTraceOperations(program.trace));
  const missing = [...new Set(expected)].filter(operation => !direct.has(operation));
  assert.deepEqual(missing, [], `${label} expected direct actions`);
  return effective;
}

function observedFactorEffects(recipe, program, factors) {
  const values = recipe.observeFactors?.(program, factors) ?? [];
  if (!Array.isArray(values) || values.some(value =>
    value === null || typeof value !== "object" ||
    typeof value.factor !== "string" || value.factor.length === 0 ||
    typeof value.evidence !== "string" || value.evidence.length === 0
  )) {
    throw new TypeError(`Scenario recipe "${recipe.id}" returned invalid factor effects.`);
  }
  const effects = freezeClone(values);
  if (recipe.enforceFactorEffects === true) {
    const observed = new Set(effects.map(value => value.factor));
    const missing = Object.keys(factors).filter(name => name !== "dataset" && !observed.has(name));
    if (missing.length > 0) {
      throw new Error(
        `Scenario recipe "${recipe.id}" has inactive factors: ${missing.join(", ")}.`
      );
    }
  }
  return effects;
}

function metadataFor(recipe, factors) {
  const described = recipe.describe?.(factors);
  if (described === undefined) return undefined;
  return freezeClone(described);
}

function hasVisibleTitle(program, title, visited = new Set()) {
  if (program === null || typeof program !== "object" || visited.has(program)) return false;
  visited.add(program);
  if (Object.values(program.graphicSpec?.objects ?? {}).some(object =>
    object?.type === "text" && object.properties?.text === title
  )) return true;
  return Object.values(program.children ?? {}).some(child =>
    hasVisibleTitle(child, title, visited)
  );
}

function assertVisibleMetadataTitle(program, metadata, label) {
  assert.equal(typeof metadata?.title, "string", `${label} metadata.title must be a string.`);
  assert.notEqual(metadata.title.length, 0, `${label} metadata.title must not be empty.`);
  assert.equal(
    hasVisibleTitle(program, metadata.title),
    true,
    `${label} must render metadata.title as a visible chart title.`
  );
}

function semanticFingerprint(program) {
  return createHash("sha256")
    .update(stableValue(program.semanticSpec))
    .update("\0")
    .update(stableValue(program.graphicSpec))
    .digest("hex");
}

function preflightRealisticCandidate(recipe, factors) {
  const id = descriptorId(recipe.id, factors);
  try {
    const program = recipe.build(factors);
    scanFinite(program.semanticSpec, `${id}.semanticSpec`);
    scanFinite(program.resolvedScales, `${id}.resolvedScales`);
    assertGraphicIntegrity(program, `${id} preflight`);
    assertPrimaryGraphic(program, `${id} preflight`);
    const metadata = metadataFor(recipe, factors);
    assertVisibleMetadataTitle(program, metadata, `${id} preflight`);
    assertRecipeEvidence(recipe, program, factors, metadata, `${id} preflight`);
    const factorEffects = observedFactorEffects(recipe, program, factors);
    const svg = renderToSVG(program, {
      title: metadata?.title ?? id,
      description: metadata?.analysisQuestion ?? `Generated ${recipe.id} scenario.`
    });
    assertSvgIntegrity(svg, `${id} preflight`);
    return Object.freeze({
      descriptor: Object.freeze({
        id,
        recipe: recipe.id,
        factors,
        metadata,
        factorEffects,
        semanticFingerprint: semanticFingerprint(program)
      })
    });
  } finally {
    recipe.releaseResolution?.(factors);
  }
}

function minimumSelections(recipe) {
  const value = recipe.minimumSelections ?? recipe.coverageSchedule?.minimumSelections ?? 5;
  if (!Number.isInteger(value) || value < 0) {
    throw new RangeError(
      `Scenario recipe "${recipe.id}" minimumSelections must be a nonnegative integer.`
    );
  }
  return value;
}

function assertMinimumSelectionCapacity(recipes) {
  for (const complexity of REALISTIC_COMPLEXITIES) {
    const tierRecipes = recipes.filter(recipe => recipe.complexity === complexity);
    const required = tierRecipes.reduce((sum, recipe) => sum + minimumSelections(recipe), 0);
    const capacity = REALISTIC_DATASET_QUOTAS[complexity] * 50;
    if (required > capacity) {
      throw new Error(
        `Realistic ${complexity} minimumSelections require ${required}/${capacity} slots.`
      );
    }
  }
}

function coverageScheduleReport(recipes, globalState) {
  const records = [];
  for (const recipe of recipes) {
    const schedule = recipe.coverageSchedule;
    if (schedule === undefined) continue;
    const required = new Map();
    for (const variantId of schedule.selectionVariantIds ?? []) {
      required.set(variantId, (required.get(variantId) ?? 0) + 1);
    }
    for (const [variantId, requiredCount] of required) {
      const observed = globalState.scheduleFulfillment.get(
        `${recipe.id}\0${variantId}`
      );
      const minimumDatasets = Math.min(
        requiredCount,
        schedule.minimumDatasetsPerRequirement ?? 1
      );
      const fulfilledCount = observed?.count ?? 0;
      const fulfilledDatasets = observed?.datasets.size ?? 0;
      records.push(Object.freeze({
        recipe: recipe.id,
        factor: schedule.factor,
        variantId,
        scheduledCount: requiredCount,
        fulfilledCount,
        minimumDatasets,
        fulfilledDatasets,
        missingCount: Math.max(0, requiredCount - fulfilledCount),
        missingDatasets: Math.max(0, minimumDatasets - fulfilledDatasets)
      }));
    }
  }
  return Object.freeze(records);
}

function recipeSelectionPriority(recipe, dataset, globalState) {
  const count = globalState.recipeCounts.get(recipe.id) ?? 0;
  const minimum = minimumSelections(recipe);
  const deficit = Math.max(0, minimum - count);
  const datasets = globalState.recipeDatasets.get(recipe.id) ?? new Set();
  const needsNewDataset = minimum > 0 && datasets.size < 3 && !datasets.has(dataset);
  return {
    needsNewDataset: Number(needsNewDataset),
    unmet: Number(deficit > 0),
    deficitRatio: minimum === 0 ? 0 : deficit / minimum,
    count
  };
}

function compareRecipePriority(left, right, dataset, globalState) {
  const leftPriority = recipeSelectionPriority(left, dataset, globalState);
  const rightPriority = recipeSelectionPriority(right, dataset, globalState);
  return rightPriority.needsNewDataset - leftPriority.needsNewDataset ||
    rightPriority.unmet - leftPriority.unmet ||
    rightPriority.deficitRatio - leftPriority.deficitRatio ||
    leftPriority.count - rightPriority.count ||
    left.id.localeCompare(right.id);
}

function realisticTierDescriptors(dataset, datasetIndex, complexity, recipes, globalState) {
  const quota = REALISTIC_DATASET_QUOTAS[complexity];
  const selected = [];
  const variants = new Map();
  const eligibleRecipes = [...recipes]
    .filter(recipe => recipe.complexity === complexity && recipe.datasets.includes(dataset))
    .filter(recipe => {
      try {
        const contract = scenarioFactorContract(recipe.id, { dataset });
        if (contract !== undefined) return true;
        globalState.skips.push(Object.freeze({
          dataset,
          complexity,
          recipe: recipe.id,
          reason: "no-eligible-factor-domain"
        }));
        return false;
      } catch (error) {
        globalState.skips.push(Object.freeze({
          dataset,
          complexity,
          recipe: recipe.id,
          reason: error.message
        }));
        return false;
      }
    });
  if (eligibleRecipes.length === 0) {
    throw new Error(`Dataset "${dataset}" has no realistic ${complexity} recipes.`);
  }
  const disabledRecipes = new Set();
  const recipeFailures = new Map();
  let attempts = 0;
  const maximumAttempts = eligibleRecipes.length * 96;
  while (selected.length < quota && attempts < maximumAttempts) {
    const ordered = eligibleRecipes.filter(recipe => !disabledRecipes.has(recipe.id))
      .sort((left, right) =>
      compareRecipePriority(left, right, dataset, globalState) ||
      (hashOffset(`${left.id}\0${datasetIndex}\0${attempts}`) -
        hashOffset(`${right.id}\0${datasetIndex}\0${attempts}`))
    );
    if (ordered.length === 0) break;
    const recipe = ordered[attempts % Math.min(ordered.length, 4)];
    attempts += 1;
    const variant = variants.get(recipe.id) ?? 0;
    variants.set(recipe.id, variant + 1);
    globalState.candidateOrdinal += 1;
    let factors;
    try {
      const selection = factorVariant(recipe, dataset, variant, globalState);
      if (selection === undefined) continue;
      factors = selection.factors;
      const candidate = preflightRealisticCandidate(recipe, factors).descriptor;
      if (globalState.fingerprints.has(candidate.semanticFingerprint)) {
        globalState.rejections.push(Object.freeze({
          dataset,
          complexity,
          recipe: recipe.id,
          factors,
          message: "duplicate semantic and graphic fingerprint"
        }));
        continue;
      }
      globalState.fingerprints.add(candidate.semanticFingerprint);
      recordFactorSelection(recipe, selection, globalState);
      globalState.recipeCounts.set(
        recipe.id,
        (globalState.recipeCounts.get(recipe.id) ?? 0) + 1
      );
      recipeFailures.set(recipe.id, 0);
      if (!globalState.recipeDatasets.has(recipe.id)) {
        globalState.recipeDatasets.set(recipe.id, new Set());
      }
      globalState.recipeDatasets.get(recipe.id).add(dataset);
      selected.push(candidate);
    } catch (error) {
      globalState.rejections.push(Object.freeze({
        dataset,
        complexity,
        recipe: recipe.id,
        factors,
        message: error.message
      }));
      const failures = (recipeFailures.get(recipe.id) ?? 0) + 1;
      recipeFailures.set(recipe.id, failures);
      const quarantineThreshold = 3;
      if (failures >= quarantineThreshold) {
        disabledRecipes.add(recipe.id);
        globalState.skips.push(Object.freeze({
          dataset,
          complexity,
          recipe: recipe.id,
          reason: `${quarantineThreshold}-distinct-candidate-preflight-failures`,
          lastMessage: error.message
        }));
      }
    }
  }
  if (selected.length !== quota) {
    const recent = globalState.rejections.slice(-8)
      .map(value => `${value.recipe}: ${value.message}`).join("; ");
    throw new Error(
      `Dataset "${dataset}" produced ${selected.length}/${quota} ${complexity} charts ` +
      `after ${attempts} attempts.${recent.length === 0 ? "" : ` Recent: ${recent}`}`
    );
  }
  return selected;
}

function interleaveTiers(byTier) {
  const values = [];
  let index = 0;
  while (REALISTIC_COMPLEXITIES.some(tier => index < byTier[tier].length)) {
    for (const tier of REALISTIC_COMPLEXITIES) {
      if (index < byTier[tier].length) values.push(byTier[tier][index]);
    }
    index += 1;
  }
  return values;
}

function generateRealisticDescriptors(recipeIds, limit) {
  const recipes = recipeIds.map(scenarioRecipe);
  if (recipes.some(recipe => recipe.suite !== "realistic")) {
    throw new Error("Realistic mode accepts only realistic scenario recipes.");
  }
  const datasets = [...new Set(REALISTIC_SCENARIO_RECIPES.flatMap(recipe => recipe.datasets))]
    .filter(id => datasetDefinition(id).corpus === "tidytuesday");
  if (datasets.length !== 50) {
    throw new Error(`Realistic mode requires exactly 50 TidyTuesday datasets, received ${datasets.length}.`);
  }
  assertMinimumSelectionCapacity(recipes);
  const descriptors = [];
  const globalState = {
    candidateOrdinal: 0,
    fingerprints: new Set(),
    recipeCounts: new Map(),
    recipeDatasets: new Map(),
    factorPools: new Map(),
    attemptedFactorCases: new Map(),
    baselineFactorCases: new Set(),
    factorValueCounts: new Map(),
    factorPairs: new Set(),
    factorCaseCounts: new Map(),
    scheduleFulfillment: new Map(),
    rejections: [],
    skips: []
  };
  for (let datasetIndex = 0; datasetIndex < datasets.length; datasetIndex += 1) {
    const dataset = datasets[datasetIndex];
    try {
      const byTier = Object.fromEntries(REALISTIC_COMPLEXITIES.map(complexity => [
        complexity,
        realisticTierDescriptors(dataset, datasetIndex, complexity, recipes, globalState)
      ]));
      descriptors.push(...interleaveTiers(byTier));
    } finally {
      releaseTidyTuesdaySourceCache(dataset);
      globalState.factorPools.clear();
      globalState.attemptedFactorCases.clear();
      globalState.baselineFactorCases.clear();
    }
    if (limit !== undefined && descriptors.length >= limit) break;
  }
  const selected = limit === undefined ? descriptors : descriptors.slice(0, limit);
  if (limit === undefined && selected.length !== 3_600) {
    throw new Error(`Realistic mode requires exactly 3,600 descriptors, received ${selected.length}.`);
  }
  if (limit === undefined) {
    const failures = recipes.flatMap(recipe => {
      const count = globalState.recipeCounts.get(recipe.id) ?? 0;
      const datasetsUsed = globalState.recipeDatasets.get(recipe.id)?.size ?? 0;
      const minimum = minimumSelections(recipe);
      return count < minimum || minimum > 0 && datasetsUsed < 3
        ? [{ id: recipe.id, count, minimum, datasetsUsed }]
        : [];
    });
    if (failures.length > 0) {
      throw new Error(
        `Realistic minimumSelections were not met: ${failures.map(value =>
          `${value.id}=${value.count}/${value.minimum} across ${value.datasetsUsed}/3 datasets`
        ).join(", ")}.`
      );
    }
    const scheduleFailures = coverageScheduleReport(recipes, globalState).filter(value =>
      value.missingCount > 0 || value.missingDatasets > 0
    );
    if (scheduleFailures.length > 0) {
      throw new Error(
        `Realistic coverage schedules were not met: ${scheduleFailures.map(value =>
          `${value.recipe}.${value.variantId} count=${value.fulfilledCount}/` +
          `${value.scheduledCount},datasets=${value.fulfilledDatasets}/${value.minimumDatasets}`
        ).join(", ")}.`
      );
    }
  }
  const schedules = coverageScheduleReport(recipes, globalState);
  const acceptedCandidates = [...globalState.recipeCounts.values()]
    .reduce((sum, count) => sum + count, 0);
  realisticGenerationDiagnostics.set(selected, freezeClone({
    attemptedCandidates: globalState.candidateOrdinal,
    acceptedCandidates,
    selectedDescriptors: selected.length,
    rejectedCandidates: globalState.rejections.length,
    skippedRecipeDatasets: globalState.skips.length,
    rejections: globalState.rejections,
    skips: globalState.skips,
    factorPairCount: globalState.factorPairs.size,
    factorValueOccurrences: Object.fromEntries([...globalState.factorValueCounts].sort()),
    coverageSchedules: schedules,
    missingCoverageSchedules: schedules.filter(value =>
      value.missingCount > 0 || value.missingDatasets > 0
    ),
    recipeSelections: Object.fromEntries([...globalState.recipeCounts].sort()),
    recipeDatasetCounts: Object.fromEntries([...globalState.recipeDatasets]
      .map(([id, values]) => [id, values.size]).sort())
  }));
  return Object.freeze(selected);
}

export function scenarioGenerationDiagnostics(descriptors) {
  return realisticGenerationDiagnostics.get(descriptors) ?? Object.freeze({
    attemptedCandidates: descriptors.length,
    acceptedCandidates: descriptors.length,
    selectedDescriptors: descriptors.length,
    rejectedCandidates: 0,
    skippedRecipeDatasets: 0,
    rejections: Object.freeze([]),
    skips: Object.freeze([]),
    factorPairCount: 0,
    factorValueOccurrences: Object.freeze({}),
    coverageSchedules: Object.freeze([]),
    missingCoverageSchedules: Object.freeze([]),
    recipeSelections: Object.freeze({}),
    recipeDatasetCounts: Object.freeze({})
  });
}

export function generateScenarioDescriptors({
  mode = "smoke",
  includeTidyTuesday = true,
  recipeIds,
  limit
} = {}) {
  if (!["smoke", "deep", "realistic"].includes(mode)) {
    throw new Error('Scenario mode must be "smoke", "deep", or "realistic".');
  }
  if (limit !== undefined && (!Number.isInteger(limit) || limit <= 0)) {
    throw new RangeError("Scenario limit must be a positive integer.");
  }
  const selectedRecipeIds = recipeIds ?? (mode === "realistic"
    ? REALISTIC_SCENARIO_RECIPES.map(recipe => recipe.id)
    : SCENARIO_RECIPES.map(recipe => recipe.id));
  if (!Array.isArray(selectedRecipeIds) || selectedRecipeIds.length === 0) {
    throw new TypeError("Scenario recipe ids must be a non-empty array.");
  }
  if (new Set(selectedRecipeIds).size !== selectedRecipeIds.length) {
    throw new Error("Scenario recipe ids must be unique.");
  }
  if (mode === "realistic") return generateRealisticDescriptors(selectedRecipeIds, limit);
  const descriptors = [];
  for (const recipeId of selectedRecipeIds) {
    const recipe = scenarioRecipe(recipeId);
    const factors = scenarioFactorContract(recipeId, { includeTidyTuesday });
    const cases = mode === "deep"
      ? pairwiseCases(factors)
      : smokeCases(recipe, factors.dataset);
    if (mode === "deep") assertPairwiseCoverage(cases, factors);
    for (const factorValues of cases) {
      descriptors.push(Object.freeze({
        id: descriptorId(recipeId, factorValues),
        recipe: recipeId,
        factors: Object.freeze({ ...factorValues })
      }));
    }
  }
  const selected = limit === undefined ? descriptors : descriptors.slice(0, limit);
  return Object.freeze(selected);
}

function collectTraceOperations(node, operations = []) {
  if (node === null || typeof node !== "object") return operations;
  if (typeof node.op === "string") operations.push(node.op);
  for (const child of node.children ?? []) collectTraceOperations(child, operations);
  return operations;
}

function collectDirectTraceOperations(trace) {
  return (trace?.children ?? [])
    .map(node => node?.op)
    .filter(operation => typeof operation === "string");
}

function collectDirectTrace(trace) {
  return Object.freeze((trace?.children ?? []).flatMap(node =>
    typeof node?.op !== "string"
      ? []
      : [freezeClone({ op: node.op, args: node.args ?? {} })]
  ));
}

function scanFinite(value, path = "program", visited = new Set()) {
  if (typeof value === "number") {
    assert.equal(Number.isFinite(value), true, `${path} must be finite.`);
    return;
  }
  if (value === null || typeof value !== "object" || visited.has(value)) return;
  visited.add(value);
  if (Array.isArray(value)) {
    value.forEach((child, index) => scanFinite(child, `${path}[${index}]`, visited));
    return;
  }
  for (const [key, child] of Object.entries(value)) {
    scanFinite(child, `${path}.${key}`, visited);
  }
}

export function buildScenario(descriptor) {
  if (
    descriptor === null || typeof descriptor !== "object" ||
    typeof descriptor.recipe !== "string" ||
    descriptor.factors === null || typeof descriptor.factors !== "object"
  ) {
    throw new TypeError("Scenario descriptor requires a recipe and factors.");
  }
  return scenarioRecipe(descriptor.recipe).build(descriptor.factors);
}

export function runScenario(descriptor, { deterministic = true } = {}) {
  const recipe = scenarioRecipe(descriptor.recipe);
  try {
    const program = buildScenario(descriptor);
    scanFinite(program.semanticSpec, `${descriptor.id}.semanticSpec`);
    scanFinite(program.resolvedScales, `${descriptor.id}.resolvedScales`);
    const graphic = assertGraphicIntegrity(program, descriptor.id);
    if (recipe.suite === "realistic") assertPrimaryGraphic(program, descriptor.id);
    const metadata = metadataFor(recipe, descriptor.factors) ?? descriptor.metadata;
    if (recipe.suite === "realistic") {
      assertVisibleMetadataTitle(program, metadata, descriptor.id);
    }
    const effectiveFeatures = recipe.suite === "realistic"
      ? assertRecipeEvidence(recipe, program, descriptor.factors, metadata, descriptor.id)
      : observedFeatures(recipe, program, descriptor.factors);
    const svg = renderToSVG(program, {
      title: metadata?.title ?? descriptor.id,
      description: metadata?.analysisQuestion ?? `Generated ${descriptor.recipe} scenario.`
    });
    assertSvgIntegrity(svg, descriptor.id);
    if (deterministic) {
      const replay = buildScenario(descriptor);
      assert.deepEqual(replay.semanticSpec, program.semanticSpec, `${descriptor.id} semantic replay`);
      assert.deepEqual(replay.graphicSpec, program.graphicSpec, `${descriptor.id} graphic replay`);
      assert.equal(renderToSVG(replay, {
        title: metadata?.title ?? descriptor.id,
        description: metadata?.analysisQuestion ?? `Generated ${descriptor.recipe} scenario.`
      }), svg, `${descriptor.id} SVG replay`);
    }
    const operations = collectTraceOperations(program.trace);
    const directOperations = collectDirectTraceOperations(program.trace);
    const factorEffects = observedFactorEffects(recipe, program, descriptor.factors);
    return Object.freeze({
      id: descriptor.id,
      recipe: descriptor.recipe,
      dataset: descriptor.factors.dataset,
      operations: Object.freeze([...new Set(operations)]),
      directOperations: Object.freeze([...new Set(directOperations)]),
      directTrace: collectDirectTrace(program.trace),
      metadata,
      effectiveFeatures,
      factorEffects,
      renderers: Object.freeze(["svg"]),
      actionCount: operations.length,
      graphic,
      layerCount: program.semanticSpec.layers.length,
      datasetCount: program.semanticSpec.datasets.length,
      svgBytes: Buffer.byteLength(svg),
      svgSha256: createHash("sha256").update(svg).digest("hex")
    });
  } finally {
    recipe.releaseResolution?.(descriptor.factors);
  }
}

export function summarizeScenarioResults(results, descriptors) {
  const operations = new Set(results.flatMap(result => result.operations));
  const directOperations = new Set(results.flatMap(result => result.directOperations));
  const recipes = new Set(results.map(result => result.recipe));
  const datasets = new Set(results.map(result => result.dataset));
  return Object.freeze({
    scenarioCount: results.length,
    recipeCount: recipes.size,
    datasetCount: datasets.size,
    operationCount: operations.size,
    operations: Object.freeze([...operations].sort()),
    directOperationCount: directOperations.size,
    directOperations: Object.freeze([...directOperations].sort()),
    graphicObjects: results.reduce((sum, result) => sum + result.graphic.objectCount, 0),
    graphicItems: results.reduce((sum, result) => sum + result.graphic.itemCount, 0),
    svgBytes: results.reduce((sum, result) => sum + result.svgBytes, 0),
    descriptorCount: descriptors.length,
    generationDiagnostics: scenarioGenerationDiagnostics(descriptors)
  });
}
