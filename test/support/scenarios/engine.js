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

export const REALISTIC_DATASET_QUOTAS = Object.freeze({
  simple: 11,
  intermediate: 26,
  advanced: 28,
  composite: 7
});
const REALISTIC_COMPLEXITIES = Object.freeze(Object.keys(REALISTIC_DATASET_QUOTAS));
const REALISTIC_CANDIDATE_GC_INTERVAL = 8;
const REALISTIC_FACTOR_VALUE_MINIMUM = 3;
const GENERATION_FAILURE_RECIPE_LIMIT = 24;
const GENERATION_FAILURE_SAMPLE_LIMIT = 8;
const GENERATION_FAILURE_REJECTION_LIMIT = 8;
const GENERATION_FAILURE_EXHAUSTION_LIMIT = 12;
const GENERATION_FAILURE_MESSAGE_LIMIT = 240;
const realisticGenerationDiagnostics = new WeakMap();
const realisticFactorRequirementCache = new Map();

function stableValue(value) {
  if (Array.isArray(value)) return `[${value.map(stableValue).join(",")}]`;
  if (value !== null && typeof value === "object") {
    return `{${Object.entries(value).map(([key, child]) =>
      `${JSON.stringify(key)}:${stableValue(child)}`
    ).join(",")}}`;
  }
  return JSON.stringify(value);
}

function wireDigest(value) {
  return createHash("sha256").update(stableValue(value)).digest("hex");
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

function factorValueUsageKey(recipeId, factor, value) {
  return `${recipeId}\0${factor}\0${stableValue(value)}`;
}

function scheduleRequirementKey(recipeId, variantId) {
  return `${recipeId}\0${variantId}`;
}

function scheduledValueId(value) {
  return typeof value === "string" ? value : value?.id;
}

function collectCoverageScheduleRequirements(recipes) {
  const requirements = new Map();
  const byRecipe = new Map();
  for (const recipe of recipes) {
    const schedule = recipe.coverageSchedule;
    if (schedule === undefined) continue;
    if (typeof schedule.factor !== "string" || schedule.factor.length === 0) {
      throw new TypeError(`Scenario recipe "${recipe.id}" schedule requires a factor.`);
    }
    if (
      !Array.isArray(schedule.selectionVariantIds) ||
      schedule.selectionVariantIds.length === 0
    ) {
      throw new TypeError(
        `Scenario recipe "${recipe.id}" schedule requires selection variant ids.`
      );
    }
    const declaredRequirements = new Map(
      (schedule.variantRequirements ?? []).map(requirement => [
        requirement.variantId,
        requirement
      ])
    );
    const recipeRequirements = [];
    for (let order = 0; order < schedule.selectionVariantIds.length; order += 1) {
      const variantId = schedule.selectionVariantIds[order];
      if (typeof variantId !== "string" || variantId.length === 0) {
        throw new TypeError(
          `Scenario recipe "${recipe.id}" schedule variant ids must be strings.`
        );
      }
      const key = scheduleRequirementKey(recipe.id, variantId);
      let requirement = requirements.get(key);
      if (requirement === undefined) {
        requirement = {
          key,
          recipe: recipe.id,
          factor: schedule.factor,
          variantId,
          requiredCount: 0,
          minimumDatasets: 0,
          order,
          eligibleDatasets: new Set()
        };
        requirements.set(key, requirement);
        recipeRequirements.push(requirement);
      }
      requirement.requiredCount += 1;
    }
    for (const requirement of recipeRequirements) {
      const declared = declaredRequirements.get(requirement.variantId);
      if (
        declared?.minimumOccurrences !== undefined &&
        declared.minimumOccurrences !== requirement.requiredCount
      ) {
        throw new Error(
          `Scenario recipe "${recipe.id}" schedule variant ` +
          `"${requirement.variantId}" count does not match its requirement.`
        );
      }
      requirement.minimumDatasets = Math.min(
        requirement.requiredCount,
        declared?.minimumDatasets ?? schedule.minimumDatasetsPerRequirement ?? 1
      );
    }
    byRecipe.set(recipe.id, recipeRequirements);
  }
  return { requirements, byRecipe };
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

function factorContractForDataset(recipe, dataset) {
  const factorValues = recipe.factorsForDataset === undefined
    ? recipe.factors
    : recipe.factorsForDataset(dataset);
  if (factorValues === undefined) return undefined;
  const scheduledFactor = recipe.coverageSchedule?.factor;
  for (const [factor, domain] of Object.entries(factorValues)) {
    if (["fieldPair", scheduledFactor].includes(factor)) continue;
    if (!Array.isArray(domain) || domain.length === 0) {
      throw new TypeError(
        `Scenario recipe "${recipe.id}" factor "${factor}" must have a non-empty domain.`
      );
    }
    const declared = recipe.factors[factor];
    const declaredKeys = new Set((declared ?? []).map(stableValue));
    const undeclared = domain.filter(value => !declaredKeys.has(stableValue(value)));
    if (undeclared.length > 0) {
      throw new Error(
        `Scenario recipe "${recipe.id}" factor "${factor}" returned undeclared values ` +
        `for dataset "${dataset}".`
      );
    }
  }
  return Object.freeze({ dataset: Object.freeze([dataset]), ...factorValues });
}

function collectFactorRequirementFragment(recipes, dataset) {
  const factorRequirements = [];
  const eligibleRecipes = [];
  const scheduleEligibility = [];
  try {
    for (const recipe of recipes) {
      if (!availableDatasets(recipe, true).includes(dataset)) continue;
      const contract = factorContractForDataset(recipe, dataset);
      if (contract === undefined) continue;
      eligibleRecipes.push(recipe.id);
      const scheduledFactor = recipe.coverageSchedule?.factor;
      if (scheduledFactor !== undefined) {
        const scheduledDomain = contract[scheduledFactor];
        if (!Array.isArray(scheduledDomain) || scheduledDomain.length === 0) {
          throw new TypeError(
            `Scenario recipe "${recipe.id}" scheduled factor ` +
            `"${scheduledFactor}" must have a non-empty domain.`
          );
        }
        const availableVariantIds = new Set(
          scheduledDomain.map(scheduledValueId).filter(id => typeof id === "string")
        );
        scheduleEligibility.push(...[...availableVariantIds].map(variantId =>
          Object.freeze({ recipe: recipe.id, variantId })
        ));
      }
      for (const [factor, domain] of Object.entries(contract)) {
        if (
          factor === "dataset" || factor === "fieldPair" ||
          factor === scheduledFactor
        ) continue;
        if (!Array.isArray(domain) || domain.length === 0) {
          throw new TypeError(
            `Scenario recipe "${recipe.id}" factor "${factor}" must have a non-empty domain.`
          );
        }
        const seen = new Set();
        for (const value of domain) {
          const usageKey = factorValueUsageKey(recipe.id, factor, value);
          if (seen.has(usageKey)) continue;
          seen.add(usageKey);
          factorRequirements.push(Object.freeze({
            usageKey,
            recipe: recipe.id,
            factor,
            value: freezeClone(value)
          }));
        }
      }
      globalThis.gc?.();
    }
  } finally {
    releaseTidyTuesdaySourceCache(dataset);
    globalThis.gc?.();
  }
  return Object.freeze({
    schemaVersion: 1,
    dataset,
    eligibleRecipes: Object.freeze(eligibleRecipes),
    factorRequirements: Object.freeze(factorRequirements),
    scheduleEligibility: Object.freeze(scheduleEligibility)
  });
}

function mergeFactorRequirementFragments(recipes, datasets, fragments) {
  if (
    !Array.isArray(fragments) || fragments.length !== datasets.length ||
    fragments.some((fragment, index) =>
      fragment?.schemaVersion !== 1 || fragment.dataset !== datasets[index]
    )
  ) {
    throw new Error("Realistic factor requirement fragments must match dataset order.");
  }
  const requirements = new Map();
  const scheduleContract = collectCoverageScheduleRequirements(recipes);
  const eligibleRecipeDatasets = new Map(recipes.map(recipe => [
    recipe.id,
    new Set()
  ]));
  for (const fragment of fragments) {
    if (
      !Array.isArray(fragment.eligibleRecipes) ||
      new Set(fragment.eligibleRecipes).size !== fragment.eligibleRecipes.length ||
      fragment.eligibleRecipes.some(recipe => !eligibleRecipeDatasets.has(recipe)) ||
      !Array.isArray(fragment.factorRequirements) ||
      !Array.isArray(fragment.scheduleEligibility)
    ) {
      throw new TypeError("Realistic factor requirement fragment is invalid.");
    }
    const eligibleRecipes = new Set(fragment.eligibleRecipes);
    for (const recipeId of fragment.eligibleRecipes) {
      const eligible = eligibleRecipeDatasets.get(recipeId);
      if (eligible === undefined) {
        throw new Error(
          `Realistic factor requirement fragment references unknown recipe "${recipeId}".`
        );
      }
      eligible.add(fragment.dataset);
    }
    for (const value of fragment.factorRequirements) {
      if (
        value === null || typeof value !== "object" ||
        !eligibleRecipes.has(value.recipe) ||
        typeof value.factor !== "string" || value.factor.length === 0 ||
        value.usageKey !== factorValueUsageKey(
          value.recipe,
          value.factor,
          value.value
        )
      ) {
        throw new TypeError("Realistic factor requirement fragment usage is invalid.");
      }
      const requirement = requirements.get(value.usageKey) ?? {
        usageKey: value.usageKey,
        recipe: value.recipe,
        factor: value.factor,
        value: freezeClone(value.value),
        eligibleDatasets: new Set()
      };
      if (
        requirement.recipe !== value.recipe || requirement.factor !== value.factor ||
        stableValue(requirement.value) !== stableValue(value.value)
      ) {
        throw new Error(
          `Realistic factor usage "${value.usageKey}" has inconsistent payloads.`
        );
      }
      requirement.eligibleDatasets.add(fragment.dataset);
      requirements.set(value.usageKey, requirement);
    }
    for (const value of fragment.scheduleEligibility) {
      if (
        value === null || typeof value !== "object" ||
        typeof value.variantId !== "string" || value.variantId.length === 0
      ) {
        throw new TypeError("Realistic factor requirement schedule eligibility is invalid.");
      }
      const requirement = scheduleContract.requirements.get(
        scheduleRequirementKey(value.recipe, value.variantId)
      );
      if (requirement === undefined || !eligibleRecipes.has(value.recipe)) {
        throw new TypeError("Realistic factor requirement schedule eligibility is invalid.");
      }
      requirement.eligibleDatasets.add(fragment.dataset);
    }
  }
  return Object.freeze({
    requirements,
    eligibleRecipeDatasets,
    scheduleRequirements: scheduleContract.requirements,
    scheduleRequirementsByRecipe: scheduleContract.byRecipe
  });
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
    return factorContractForDataset(recipe, dataset);
  }
  return Object.freeze({ dataset: Object.freeze(datasets), ...recipe.factors });
}

function collectFactorValueRequirements(recipes, datasets) {
  const cacheKey = `${recipes.map(recipe => recipe.id).join("\0")}\u0001${datasets.join("\0")}`;
  if (realisticFactorRequirementCache.has(cacheKey)) {
    const cached = realisticFactorRequirementCache.get(cacheKey);
    realisticFactorRequirementCache.delete(cacheKey);
    realisticFactorRequirementCache.set(cacheKey, cached);
    return cached;
  }
  const result = mergeFactorRequirementFragments(
    recipes,
    datasets,
    datasets.map(dataset => collectFactorRequirementFragment(recipes, dataset))
  );
  realisticFactorRequirementCache.set(cacheKey, result);
  if (realisticFactorRequirementCache.size > 4) {
    realisticFactorRequirementCache.delete(
      realisticFactorRequirementCache.keys().next().value
    );
  }
  return result;
}

function factorRequirementsByRecipe(requirements) {
  const byRecipe = new Map();
  for (const requirement of requirements.values()) {
    const values = byRecipe.get(requirement.recipe) ?? [];
    values.push(requirement);
    byRecipe.set(requirement.recipe, values);
  }
  return byRecipe;
}

function factorRequirementSelectionTargets(recipes, requirementsByRecipe) {
  return new Map(recipes.map(recipe => {
    const valueCounts = new Map();
    for (const requirement of requirementsByRecipe.get(recipe.id) ?? []) {
      valueCounts.set(
        requirement.factor,
        (valueCounts.get(requirement.factor) ?? 0) + 1
      );
    }
    const factorTarget = Math.max(0, ...valueCounts.values()) *
      REALISTIC_FACTOR_VALUE_MINIMUM;
    return [recipe.id, Math.max(minimumSelections(recipe), factorTarget)];
  }));
}

function assertFactorRequirementFeasibility(
  recipes,
  requirements,
  scheduleRequirements,
  selectionTargets
) {
  const unavailable = [...requirements.values()].filter(requirement =>
    requirement.eligibleDatasets.size < REALISTIC_FACTOR_VALUE_MINIMUM
  );
  if (unavailable.length > 0) {
    throw new Error(
      `Realistic factor values require three eligible datasets: ${unavailable
        .slice(0, 20)
        .map(value =>
          `${value.recipe}.${value.factor}=${stableValue(value.value)} ` +
          `eligible=${value.eligibleDatasets.size}/3`
        ).join("; ")}`
    );
  }
  const unavailableScheduleVariants = [...scheduleRequirements.values()]
    .filter(requirement =>
      requirement.eligibleDatasets.size < requirement.minimumDatasets
    );
  if (unavailableScheduleVariants.length > 0) {
    throw new Error(
      `Realistic coverage schedule variants require eligible datasets: ` +
      `${unavailableScheduleVariants.slice(0, 20).map(requirement =>
        `${requirement.recipe}.${requirement.factor}=${requirement.variantId} ` +
        `eligible=${requirement.eligibleDatasets.size}/${requirement.minimumDatasets}`
      ).join("; ")}`
    );
  }
  for (const complexity of REALISTIC_COMPLEXITIES) {
    const required = recipes.filter(recipe => recipe.complexity === complexity)
      .reduce((sum, recipe) => sum + selectionTargets.get(recipe.id), 0);
    const capacity = REALISTIC_DATASET_QUOTAS[complexity] * 50;
    if (required > capacity) {
      throw new Error(
        `Realistic ${complexity} factor value requirements need ` +
        `${required}/${capacity} slots.`
      );
    }
  }
}

function requirementDatasetPriority(requirement, dataset, globalState) {
  const selectedDatasets = globalState.factorValueDatasets.get(
    requirement.usageKey
  ) ?? new Set();
  if (
    selectedDatasets.size >= REALISTIC_FACTOR_VALUE_MINIMUM ||
    selectedDatasets.has(dataset)
  ) return { urgent: 0, deficit: 0 };
  const needed = REALISTIC_FACTOR_VALUE_MINIMUM - selectedDatasets.size;
  const currentIndex = globalState.datasetIndexes.get(dataset);
  const remaining = [...requirement.eligibleDatasets].filter(value =>
    globalState.datasetIndexes.get(value) >= currentIndex
  ).length;
  return {
    urgent: Number(remaining <= needed),
    deficit: needed
  };
}

function compareScheduleVariantPriority(left, right) {
  return right.deadlineUrgency - left.deadlineUrgency ||
    right.newDatasetDeficit - left.newDatasetDeficit ||
    right.occurrenceDeficit - left.occurrenceDeficit ||
    left.order - right.order ||
    left.variantId.localeCompare(right.variantId);
}

export function scenarioScheduleVariantPriorities(requirements, {
  dataset,
  datasetIndexes,
  fulfillment = new Map()
} = {}) {
  if (!Array.isArray(requirements)) {
    throw new TypeError("Scenario schedule priorities require an array of requirements.");
  }
  if (typeof dataset !== "string" || dataset.length === 0) {
    throw new TypeError("Scenario schedule priorities require a dataset id.");
  }
  if (!(datasetIndexes instanceof Map) || !datasetIndexes.has(dataset)) {
    throw new TypeError("Scenario schedule priorities require indexed datasets.");
  }
  if (!(fulfillment instanceof Map)) {
    throw new TypeError("Scenario schedule priorities require a fulfillment map.");
  }
  const currentIndex = datasetIndexes.get(dataset);
  return Object.freeze(requirements.flatMap(requirement => {
    const observed = fulfillment.get(requirement.key);
    const fulfilledCount = observed?.count ?? 0;
    const occurrenceDeficit = Math.max(
      0,
      requirement.requiredCount - fulfilledCount
    );
    if (
      occurrenceDeficit === 0 ||
      !requirement.eligibleDatasets.has(dataset)
    ) return [];
    const fulfilledDatasets = observed?.datasets ?? new Set();
    const missingDatasets = Math.max(
      0,
      requirement.minimumDatasets - fulfilledDatasets.size
    );
    const currentDatasetIsNew = !fulfilledDatasets.has(dataset);
    const remainingEligibleDatasets = [...requirement.eligibleDatasets].filter(value =>
      datasetIndexes.get(value) >= currentIndex
    );
    const remainingNewEligibleDatasets = remainingEligibleDatasets.filter(value =>
      !fulfilledDatasets.has(value)
    );
    const newDatasetDeficit = currentDatasetIsNew ? missingDatasets : 0;
    const diversityDeadlineUrgency = newDatasetDeficit > 0 &&
      remainingNewEligibleDatasets.length <= missingDatasets
      ? missingDatasets - remainingNewEligibleDatasets.length + 1
      : 0;
    const occurrencesCanRemainDatasetDistinct = requirement.requiredCount <=
      requirement.eligibleDatasets.size;
    const occurrenceDeadlineUrgency = occurrencesCanRemainDatasetDistinct &&
      remainingEligibleDatasets.length <= occurrenceDeficit
      ? occurrenceDeficit - remainingEligibleDatasets.length + 1
      : remainingEligibleDatasets.length === 1
        ? occurrenceDeficit
        : 0;
    return [{
      key: requirement.key,
      variantId: requirement.variantId,
      deadlineUrgency: Math.max(
        diversityDeadlineUrgency,
        occurrenceDeadlineUrgency
      ),
      newDatasetDeficit,
      occurrenceDeficit,
      order: requirement.order
    }];
  }).sort(compareScheduleVariantPriority).map(Object.freeze));
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

function selectedFactorValues(recipe, factors) {
  return Object.freeze(Object.entries(factors)
    .filter(([name]) => name !== "dataset")
    .map(([name, value]) => Object.freeze({
      name,
      usageKey: factorValueUsageKey(recipe.id, name, value)
    })));
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

function compareFactorCandidatePriority(left, right) {
  return left.urgentDatasetDeficit - right.urgentDatasetDeficit ||
    left.newDatasetDeficit - right.newDatasetDeficit ||
    left.countDeficit - right.countDeficit ||
    left.diversityScore - right.diversityScore ||
    right.tie - left.tie;
}

function scheduleSelectionState(recipe, dataset, pool, globalState) {
  const schedule = recipe.coverageSchedule;
  if (schedule === undefined) {
    return { hasOutstanding: false, priorities: Object.freeze([]) };
  }
  let requirements = globalState.scheduleRequirementsByRecipe?.get(recipe.id);
  if (requirements === undefined) {
    const local = collectCoverageScheduleRequirements([recipe]);
    requirements = local.byRecipe.get(recipe.id) ?? [];
    const availableVariantIds = new Set(
      pool.contract[schedule.factor].map(scheduledValueId)
    );
    for (const requirement of requirements) {
      if (availableVariantIds.has(requirement.variantId)) {
        requirement.eligibleDatasets.add(dataset);
      }
    }
  }
  const fulfillment = globalState.scheduleFulfillment ?? new Map();
  const hasOutstanding = requirements.some(requirement =>
    (fulfillment.get(requirement.key)?.count ?? 0) < requirement.requiredCount
  );
  const datasetIndexes = globalState.datasetIndexes ?? new Map([[dataset, 0]]);
  return {
    hasOutstanding,
    priorities: scenarioScheduleVariantPriorities(requirements, {
      dataset,
      datasetIndexes,
      fulfillment
    })
  };
}

function factorVariant(recipe, dataset, variant, globalState) {
  const pool = factorPool(recipe, dataset, globalState);
  if (pool === undefined) return undefined;
  const attemptedKey = `${recipe.id}\0${dataset}`;
  const attempted = globalState.attemptedFactorCases.get(attemptedKey) ?? new Set();
  globalState.attemptedFactorCases.set(attemptedKey, attempted);
  const schedule = recipe.coverageSchedule;
  const scheduleState = scheduleSelectionState(recipe, dataset, pool, globalState);
  if (scheduleState.hasOutstanding && scheduleState.priorities.length === 0) {
    return Object.freeze({
      unavailable: true,
      scheduledVariantIds: Object.freeze(
        (globalState.scheduleRequirementsByRecipe?.get(recipe.id) ?? [])
          .filter(requirement =>
            (globalState.scheduleFulfillment?.get(requirement.key)?.count ?? 0) <
              requirement.requiredCount
          )
          .map(requirement => requirement.variantId)
      )
    });
  }
  const scheduledIds = scheduleState.priorities.length > 0
    ? scheduleState.priorities.map(priority => priority.variantId)
    : [undefined];
  let baselineFactors;
  if (!globalState.baselineFactorCases.has(recipe.id)) {
    globalState.baselineFactorCases.add(recipe.id);
    baselineFactors = Object.freeze(Object.fromEntries(Object.entries(pool.contract)
      .map(([name, domain]) => [name, domain[0]])));
  }
  let firstEligibleIndexes = Object.freeze([]);
  for (const scheduledId of scheduledIds) {
    if (
      baselineFactors !== undefined &&
      (scheduledId === undefined ||
        scheduledValueId(baselineFactors[schedule.factor]) === scheduledId)
    ) {
      return Object.freeze({
        factors: baselineFactors,
        factorPairs: Object.freeze(factorPairKeys(baselineFactors)),
        factorValues: selectedFactorValues(recipe, baselineFactors),
        caseKey: `${recipe.id}\0${stableValue(baselineFactors)}`
      });
    }
    const eligibleIndexes = [];
    for (let index = 0; index < pool.cases.length; index += 1) {
      const candidate = pool.cases[index];
      if (
        scheduledId === undefined ||
        scheduledValueId(candidate[schedule.factor]) === scheduledId
      ) eligibleIndexes.push(index);
    }
    if (firstEligibleIndexes.length === 0) {
      firstEligibleIndexes = Object.freeze(eligibleIndexes);
    }
    if (eligibleIndexes.length === 0) {
      throw new Error(
        `Scenario recipe "${recipe.id}" schedule prepass marked unavailable ` +
        `${schedule.factor} variant "${scheduledId}" eligible for dataset "${dataset}".`
      );
    }
    let best;
    const searchLimit = globalState.strict
      ? eligibleIndexes.length
      : Math.min(96, eligibleIndexes.length);
    const start = hashOffset(
      `${attemptedKey}\0${scheduledId ?? "unscheduled"}\0${variant}`
    ) % eligibleIndexes.length;
    const consider = index => {
      if (attempted.has(index)) return;
      const factors = pool.cases[index];
      const factorPairs = factorPairKeys(factors);
      const factorValues = selectedFactorValues(recipe, factors);
      let urgentDatasetDeficit = 0;
      let countDeficit = 0;
      let newDatasetDeficit = 0;
      let balanceScore = 0;
      for (const factorValue of factorValues) {
        const count = globalState.factorValueCounts.get(factorValue.usageKey) ?? 0;
        balanceScore += 1 / (1 + count);
        const requirement = globalState.factorRequirements.get(factorValue.usageKey);
        if (requirement === undefined) continue;
        countDeficit += Math.max(0, REALISTIC_FACTOR_VALUE_MINIMUM - count);
        const datasetPriority = requirementDatasetPriority(
          requirement,
          dataset,
          globalState
        );
        urgentDatasetDeficit += datasetPriority.urgent;
        newDatasetDeficit += datasetPriority.deficit;
      }
      const newPairs = factorPairs.filter(key =>
        !globalState.factorPairs.has(`${recipe.id}\0${key}`)
      ).length;
      const caseKey = `${recipe.id}\0${stableValue(factors)}`;
      const caseUse = globalState.factorCaseCounts.get(caseKey) ?? 0;
      const diversityScore = balanceScore * 1_000 + newPairs * 10 - caseUse;
      const tie = (index + variant) % pool.cases.length;
      const candidate = {
        index,
        factors,
        factorPairs,
        factorValues,
        caseKey,
        urgentDatasetDeficit,
        newDatasetDeficit,
        countDeficit,
        diversityScore,
        tie
      };
      if (best === undefined || compareFactorCandidatePriority(candidate, best) > 0) {
        best = candidate;
      }
    };
    for (let ordinal = 0; ordinal < searchLimit; ordinal += 1) {
      consider(eligibleIndexes[(start + ordinal) % eligibleIndexes.length]);
    }
    if (best === undefined) {
      for (const index of eligibleIndexes) consider(index);
    }
    if (best !== undefined) {
      attempted.add(best.index);
      return Object.freeze({
        factors: best.factors,
        factorPairs: best.factorPairs,
        factorValues: best.factorValues,
        caseKey: best.caseKey
      });
    }
  }
  return Object.freeze({
    exhausted: true,
    eligibleFactorCases: firstEligibleIndexes.length,
    attemptedEligibleFactorCases: firstEligibleIndexes.filter(index =>
      attempted.has(index)
    ).length,
    scheduledVariantId: scheduledIds[0]
  });
}

export function scenarioFactorCandidateDomainReport(recipeId, { dataset } = {}) {
  const recipe = scenarioRecipe(recipeId);
  if (typeof dataset !== "string" || dataset.length === 0) {
    throw new TypeError("Scenario factor candidate diagnostics require a dataset id.");
  }
  const globalState = {
    factorPools: new Map(),
    attemptedFactorCases: new Map(),
    baselineFactorCases: new Set([recipe.id]),
    recipeCounts: new Map(),
    factorValueCounts: new Map(),
    factorValueDatasets: new Map(),
    factorRequirements: new Map(),
    factorPairs: new Set(),
    factorCaseCounts: new Map(),
    scheduleFulfillment: new Map(),
    datasetIndexes: new Map([[dataset, 0]]),
    strict: true
  };
  const pool = factorPool(recipe, dataset, globalState);
  if (pool === undefined) {
    return Object.freeze({
      recipe: recipe.id,
      dataset,
      eligibleFactorCases: 0,
      selectedFactorCases: Object.freeze([]),
      exhausted: true,
      attemptedEligibleFactorCases: 0
    });
  }
  const selectedFactorCases = [];
  let exhaustion;
  for (let variant = 0; variant <= pool.cases.length; variant += 1) {
    const selection = factorVariant(recipe, dataset, variant, globalState);
    if (selection?.exhausted === true) {
      exhaustion = selection;
      break;
    }
    if (selection === undefined || selection.unavailable === true) break;
    recordFactorSelection(recipe, selection, globalState);
    globalState.recipeCounts.set(
      recipe.id,
      (globalState.recipeCounts.get(recipe.id) ?? 0) + 1
    );
    selectedFactorCases.push(freezeClone(selection.factors));
  }
  return Object.freeze({
    recipe: recipe.id,
    dataset,
    eligibleFactorCases: exhaustion?.eligibleFactorCases ?? pool.cases.length,
    selectedFactorCases: Object.freeze(selectedFactorCases),
    exhausted: exhaustion !== undefined,
    attemptedEligibleFactorCases: exhaustion?.attemptedEligibleFactorCases ??
      globalState.attemptedFactorCases.get(`${recipe.id}\0${dataset}`)?.size ?? 0
  });
}

function recordFactorSelection(recipe, selection, globalState) {
  for (const factorValue of selection.factorValues) {
    globalState.factorValueCounts.set(
      factorValue.usageKey,
      (globalState.factorValueCounts.get(factorValue.usageKey) ?? 0) + 1
    );
    if (globalState.factorRequirements.has(factorValue.usageKey)) {
      if (!globalState.factorValueDatasets.has(factorValue.usageKey)) {
        globalState.factorValueDatasets.set(factorValue.usageKey, new Set());
      }
      globalState.factorValueDatasets.get(factorValue.usageKey)
        .add(selection.factors.dataset);
    }
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
    const variantId = scheduledValueId(selection.factors[schedule.factor]);
    if (typeof variantId !== "string" || variantId.length === 0) {
      throw new Error(
        `Scenario recipe "${recipe.id}" selected no scheduled ${schedule.factor} id.`
      );
    }
    const key = scheduleRequirementKey(recipe.id, variantId);
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

export function validateScenarioFactorEffects(recipe, factors, values) {
  if (!Array.isArray(values) || values.some(value =>
    value === null || typeof value !== "object" ||
    typeof value.factor !== "string" || value.factor.length === 0 ||
    !Object.hasOwn(value, "value") ||
    typeof value.evidence !== "string" || value.evidence.length === 0
  )) {
    throw new TypeError(`Scenario recipe "${recipe.id}" returned invalid factor effects.`);
  }
  const expected = new Set(Object.keys(factors).filter(name => name !== "dataset"));
  const unknown = [...new Set(values.map(value => value.factor))]
    .filter(factor => !expected.has(factor));
  if (unknown.length > 0) {
    throw new Error(
      `Scenario recipe "${recipe.id}" returned unknown factor effects: ${unknown.join(", ")}.`
    );
  }
  const seen = new Set();
  const duplicates = new Set();
  for (const value of values) {
    if (seen.has(value.factor)) duplicates.add(value.factor);
    seen.add(value.factor);
  }
  if (duplicates.size > 0) {
    throw new Error(
      `Scenario recipe "${recipe.id}" returned duplicate factor effects: ` +
      `${[...duplicates].join(", ")}.`
    );
  }
  for (const value of values) {
    try {
      assert.deepEqual(value.value, factors[value.factor]);
    } catch {
      throw new Error(
        `Scenario recipe "${recipe.id}" returned a mismatched value for factor ` +
        `"${value.factor}".`
      );
    }
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

function observedFactorEffects(recipe, program, factors) {
  const values = recipe.observeFactors?.(program, factors) ?? [];
  return validateScenarioFactorEffects(recipe, factors, values);
}

function metadataFor(recipe, factors) {
  const described = recipe.describe?.(factors);
  if (described === undefined) return undefined;
  return freezeClone(described);
}

function normalizedVisibleText(value) {
  return typeof value === "string" ? value.replace(/\p{White_Space}+/gu, "") : "";
}

export function scenarioHasVisibleTitle(program, title, visited = new Set()) {
  if (program === null || typeof program !== "object" || visited.has(program)) return false;
  visited.add(program);
  const expected = normalizedVisibleText(title);
  if (expected.length === 0) return false;
  if (Object.values(program.graphicSpec?.objects ?? {}).some(object =>
    object?.type === "text" && (
      normalizedVisibleText(object.properties?.text) === expected ||
      Array.isArray(object.items) && object.items.length > 0 &&
        object.items.every(item => typeof item?.properties?.text === "string") &&
        normalizedVisibleText(object.items.map(item => item.properties.text).join("")) === expected
    )
  )) return true;
  return Object.values(program.children ?? {}).some(child =>
    scenarioHasVisibleTitle(child, title, visited)
  );
}

function assertVisibleMetadataTitle(program, metadata, label) {
  assert.equal(typeof metadata?.title, "string", `${label} metadata.title must be a string.`);
  assert.notEqual(
    normalizedVisibleText(metadata.title).length,
    0,
    `${label} metadata.title must not be empty.`
  );
  assert.equal(
    scenarioHasVisibleTitle(program, metadata.title),
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

export function scenarioFactorDiagnostic(factors) {
  if (factors === undefined) return "unresolved";
  const full = stableValue(factors);
  const summarize = (value, depth = 0) => {
    if (Array.isArray(value)) {
      return value.length <= 8 && value.every(child =>
        child === null || !["object", "function"].includes(typeof child)
      )
        ? value.map(child => summarize(child, depth + 1))
        : `<array length=${value.length}>`;
    }
    if (value !== null && typeof value === "object") {
      const entries = Object.entries(value);
      if (depth >= 3) return `<object keys=${entries.length}>`;
      return Object.fromEntries(entries.slice(0, 16).map(([key, child]) =>
        [key, summarize(child, depth + 1)]
      ));
    }
    return value;
  };
  const serialized = stableValue(summarize(factors));
  const digest = createHash("sha256").update(full).digest("hex").slice(0, 12);
  const maximumLength = 320;
  const compact = serialized.length <= maximumLength
    ? serialized
    : `${serialized.slice(0, maximumLength - 3)}...`;
  return `${compact}#${digest}`;
}

export function scenarioCandidateFailureDiagnostic(value) {
  return `${value.dataset}/${value.recipe} ` +
    `factors=${scenarioFactorDiagnostic(value.factors)}: ${value.message}`;
}

function compactFactorDigest(factors) {
  if (factors === undefined) return undefined;
  return createHash("sha256")
    .update(stableValue(factors))
    .digest("hex")
    .slice(0, 12);
}

function boundedGenerationFailureMessage(value) {
  const text = typeof value === "string" ? value : String(value ?? "");
  return text.length <= GENERATION_FAILURE_MESSAGE_LIMIT
    ? text
    : `${text.slice(0, GENERATION_FAILURE_MESSAGE_LIMIT - 3)}...`;
}

function boundedEdgeSample(values, limit) {
  if (values.length <= limit) return values;
  const start = Math.ceil(limit / 2);
  return [...values.slice(0, start), ...values.slice(-(limit - start))];
}

export function scenarioGenerationFailureDiagnostics({
  kind,
  dataset,
  datasetIndex,
  tier,
  quota,
  produced,
  schedulingIterations,
  eligibleRecipes = [],
  selectedDescriptors = [],
  duplicates = [],
  rejections = [],
  skips = []
}) {
  const localDuplicates = duplicates.filter(value =>
    value.dataset === dataset && value.complexity === tier
  );
  const exhaustion = skips.filter(value =>
    value.dataset === dataset && value.complexity === tier &&
    value.reason === "factor-candidate-domain-exhausted"
  );
  const recentRejections = rejections.slice(-GENERATION_FAILURE_REJECTION_LIMIT);
  const implicatedRecipes = new Set([
    ...recentRejections.filter(value =>
      value.dataset === dataset && value.complexity === tier
    ).map(value => value.recipe),
    ...exhaustion.map(value => value.recipe)
  ]);
  const perRecipe = new Map(eligibleRecipes.map(recipe => [
    typeof recipe === "string" ? recipe : recipe.id,
    { recipe: typeof recipe === "string" ? recipe : recipe.id, selections: 0, duplicates: 0 }
  ]));
  const recipeCount = recipe => {
    if (!perRecipe.has(recipe)) {
      perRecipe.set(recipe, { recipe, selections: 0, duplicates: 0 });
    }
    return perRecipe.get(recipe);
  };
  for (const descriptor of selectedDescriptors) {
    recipeCount(descriptor.recipe).selections += 1;
  }
  for (const duplicate of localDuplicates) {
    recipeCount(duplicate.recipe).duplicates += 1;
  }
  const sortedRecipeCounts = [...perRecipe.values()].sort((left, right) =>
    Number(implicatedRecipes.has(right.recipe)) -
      Number(implicatedRecipes.has(left.recipe)) ||
    right.selections - left.selections ||
    right.duplicates - left.duplicates ||
    left.recipe.localeCompare(right.recipe)
  );
  const recipeCounts = sortedRecipeCounts.slice(0, GENERATION_FAILURE_RECIPE_LIMIT);
  const acceptedSamples = boundedEdgeSample(
    selectedDescriptors,
    GENERATION_FAILURE_SAMPLE_LIMIT
  ).map(descriptor => ({
    recipe: descriptor.recipe,
    factorDigest: compactFactorDigest(descriptor.factors),
    fingerprintPrefix: descriptor.semanticFingerprint.slice(0, 12)
  }));
  return freezeClone({
    schemaVersion: 1,
    kind,
    dataset,
    datasetIndex,
    tier,
    quota,
    produced,
    schedulingIterations,
    eligibleRecipeCount: eligibleRecipes.length,
    recipeCounts: {
      entries: recipeCounts,
      omitted: sortedRecipeCounts.length - recipeCounts.length
    },
    acceptedSamples,
    acceptedSampleOmitted: selectedDescriptors.length - acceptedSamples.length,
    duplicateCount: localDuplicates.length,
    rejectionCount: rejections.length,
    recentRejections: recentRejections.map(value => ({
      dataset: value.dataset,
      tier: value.complexity,
      recipe: value.recipe,
      factorDigest: compactFactorDigest(value.factors),
      message: boundedGenerationFailureMessage(value.message)
    })),
    exhaustionSkipCount: exhaustion.length,
    exhaustionSkips: exhaustion.slice(-GENERATION_FAILURE_EXHAUSTION_LIMIT)
      .map(value => ({
        recipe: value.recipe,
        eligibleFactorCases: value.eligibleFactorCases,
        attemptedEligibleFactorCases: value.attemptedEligibleFactorCases,
        scheduledVariantId: value.scheduledVariantId
      }))
  });
}

function scenarioGenerationFailureError(message, context, cause) {
  const error = new Error(message, cause === undefined ? undefined : { cause });
  error.name = "ScenarioGenerationError";
  error.diagnostics = scenarioGenerationFailureDiagnostics(context);
  return error;
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

function realisticDatasetIds() {
  const datasets = [...new Set(REALISTIC_SCENARIO_RECIPES.flatMap(recipe => recipe.datasets))]
    .filter(id => datasetDefinition(id).corpus === "tidytuesday");
  if (datasets.length !== 50) {
    throw new Error(
      `Realistic mode requires exactly 50 TidyTuesday datasets, received ${datasets.length}.`
    );
  }
  return datasets;
}

function realisticRecipesForIds(recipeIds) {
  if (!Array.isArray(recipeIds) || recipeIds.length === 0) {
    throw new TypeError("Scenario recipe ids must be a non-empty array.");
  }
  if (new Set(recipeIds).size !== recipeIds.length) {
    throw new Error("Scenario recipe ids must be unique.");
  }
  const recipes = recipeIds.map(scenarioRecipe);
  if (recipes.some(recipe => recipe.suite !== "realistic")) {
    throw new Error("Realistic mode accepts only realistic scenario recipes.");
  }
  return recipes;
}

function realisticGenerationPlanPayload(plan) {
  return {
    schemaVersion: plan.schemaVersion,
    recipeIds: plan.recipeIds,
    datasets: plan.datasets,
    activeDatasets: plan.activeDatasets,
    chartsPerDataset: plan.chartsPerDataset,
    selectedDescriptorCount: plan.selectedDescriptorCount,
    full: plan.full,
    strict: plan.strict
  };
}

function validateRealisticGenerationPlan(plan) {
  const payload = realisticGenerationPlanPayload(plan ?? {});
  if (
    payload.schemaVersion !== 1 ||
    !Array.isArray(payload.recipeIds) || payload.recipeIds.length === 0 ||
    payload.recipeIds.some(id => typeof id !== "string" || id.length === 0) ||
    new Set(payload.recipeIds).size !== payload.recipeIds.length ||
    !Array.isArray(payload.datasets) || payload.datasets.length !== 50 ||
    payload.datasets.some(id => typeof id !== "string" || id.length === 0) ||
    new Set(payload.datasets).size !== payload.datasets.length ||
    !Array.isArray(payload.activeDatasets) || payload.activeDatasets.length === 0 ||
    payload.activeDatasets.length > payload.datasets.length ||
    payload.activeDatasets.some((id, index) => id !== payload.datasets[index]) ||
    payload.chartsPerDataset !== 72 ||
    !Number.isSafeInteger(payload.selectedDescriptorCount) ||
      payload.selectedDescriptorCount <= 0 ||
    typeof payload.full !== "boolean" || typeof payload.strict !== "boolean" ||
    payload.full && (
      payload.selectedDescriptorCount !== 3_600 ||
      payload.activeDatasets.length !== 50 || payload.strict !== true
    ) ||
    !payload.full && payload.activeDatasets.length !== Math.min(
      50,
      Math.ceil(payload.selectedDescriptorCount / payload.chartsPerDataset)
    ) ||
    typeof plan.planId !== "string" || plan.planId !== wireDigest(payload)
  ) {
    throw new TypeError("Realistic generation plan is invalid.");
  }
}

export function realisticScenarioGenerationPlan({
  recipeIds = REALISTIC_SCENARIO_RECIPES.map(recipe => recipe.id),
  limit,
  strictScheduling = false
} = {}) {
  if (limit !== undefined && (!Number.isInteger(limit) || limit <= 0)) {
    throw new RangeError("Scenario limit must be a positive integer.");
  }
  if (typeof strictScheduling !== "boolean") {
    throw new TypeError("Scenario strictScheduling must be a boolean.");
  }
  const recipes = realisticRecipesForIds(recipeIds);
  const datasets = realisticDatasetIds();
  assertMinimumSelectionCapacity(recipes);
  const chartsPerDataset = Object.values(REALISTIC_DATASET_QUOTAS)
    .reduce((sum, quota) => sum + quota, 0);
  const activeDatasets = limit === undefined
    ? datasets
    : datasets.slice(0, Math.min(
        datasets.length,
        Math.ceil(limit / chartsPerDataset)
      ));
  const payload = {
    schemaVersion: 1,
    recipeIds,
    datasets,
    activeDatasets,
    chartsPerDataset,
    selectedDescriptorCount: limit ?? datasets.length * chartsPerDataset,
    full: limit === undefined,
    strict: limit === undefined || strictScheduling
  };
  return freezeClone({ ...payload, planId: wireDigest(payload) });
}

export function realisticScenarioFactorRequirementFragment(plan, dataset) {
  validateRealisticGenerationPlan(plan);
  if (!plan.activeDatasets.includes(dataset)) {
    throw new Error("Realistic factor requirement fragment requires a planned dataset.");
  }
  const fragment = collectFactorRequirementFragment(
    realisticRecipesForIds(plan.recipeIds),
    dataset
  );
  return Object.freeze({ ...fragment, planId: plan.planId });
}

function factorRequirementManifestPayload(manifest) {
  return {
    schemaVersion: manifest.schemaVersion,
    planId: manifest.planId,
    factorRequirements: manifest.factorRequirements,
    eligibleRecipeDatasets: manifest.eligibleRecipeDatasets,
    scheduleRequirements: manifest.scheduleRequirements
  };
}

function uniqueStrings(values, allowed) {
  return Array.isArray(values) &&
    values.every(value => typeof value === "string" &&
      (allowed === undefined || allowed.has(value))) &&
    new Set(values).size === values.length;
}

function uniqueEntryKeys(values) {
  return Array.isArray(values) && values.every(value =>
    Array.isArray(value) && value.length === 2 && typeof value[0] === "string"
  ) && new Set(values.map(value => value[0])).size === values.length;
}

function nonnegativeCount(value) {
  return Number.isSafeInteger(value) && value >= 0;
}

function validateFactorRequirementManifest(manifest, plan) {
  validateRealisticGenerationPlan(plan);
  const recipeIds = new Set(plan.recipeIds);
  const datasets = new Set(plan.activeDatasets);
  const payload = factorRequirementManifestPayload(manifest ?? {});
  if (
    payload.schemaVersion !== 1 || payload.planId !== plan.planId ||
    !Array.isArray(payload.factorRequirements) ||
    !Array.isArray(payload.eligibleRecipeDatasets) ||
    !Array.isArray(payload.scheduleRequirements) ||
    typeof manifest.manifestId !== "string" ||
    manifest.manifestId !== wireDigest(payload) ||
    new Set(payload.factorRequirements.map(value => value?.usageKey)).size !==
      payload.factorRequirements.length ||
    payload.factorRequirements.some(value =>
      value === null || typeof value !== "object" ||
      typeof value.usageKey !== "string" || value.usageKey.length === 0 ||
      typeof value.recipe !== "string" || !recipeIds.has(value.recipe) ||
      typeof value.factor !== "string" || value.factor.length === 0 ||
      !uniqueStrings(value.eligibleDatasets, datasets)
    ) ||
    !uniqueEntryKeys(payload.eligibleRecipeDatasets) ||
    payload.eligibleRecipeDatasets.length !== plan.recipeIds.length ||
    payload.eligibleRecipeDatasets.some(([recipe, values]) =>
      !recipeIds.has(recipe) || !uniqueStrings(values, datasets)
    ) ||
    new Set(payload.scheduleRequirements.map(value => value?.key)).size !==
      payload.scheduleRequirements.length ||
    payload.scheduleRequirements.some(value =>
      value === null || typeof value !== "object" ||
      typeof value.key !== "string" || value.key.length === 0 ||
      typeof value.recipe !== "string" || !recipeIds.has(value.recipe) ||
      typeof value.factor !== "string" || value.factor.length === 0 ||
      typeof value.variantId !== "string" || value.variantId.length === 0 ||
      !nonnegativeCount(value.requiredCount) ||
      !nonnegativeCount(value.minimumDatasets) ||
      !nonnegativeCount(value.order) ||
      !uniqueStrings(value.eligibleDatasets, datasets)
    )
  ) {
    throw new TypeError("Realistic factor requirement manifest is invalid.");
  }
}

function serializeFactorRequirementContract(contract, plan) {
  const payload = {
    schemaVersion: 1,
    planId: plan.planId,
    factorRequirements: [...contract.requirements.values()].map(requirement => ({
      usageKey: requirement.usageKey,
      recipe: requirement.recipe,
      factor: requirement.factor,
      value: requirement.value,
      eligibleDatasets: [...requirement.eligibleDatasets]
    })),
    eligibleRecipeDatasets: [...contract.eligibleRecipeDatasets]
      .map(([recipe, datasets]) => [recipe, [...datasets]]),
    scheduleRequirements: [...contract.scheduleRequirements.values()]
      .map(requirement => ({
        key: requirement.key,
        recipe: requirement.recipe,
        factor: requirement.factor,
        variantId: requirement.variantId,
        requiredCount: requirement.requiredCount,
        minimumDatasets: requirement.minimumDatasets,
        order: requirement.order,
        eligibleDatasets: [...requirement.eligibleDatasets]
      }))
  };
  return freezeClone({ ...payload, manifestId: wireDigest(payload) });
}

function factorRequirementContractFromManifest(manifest, plan) {
  validateFactorRequirementManifest(manifest, plan);
  const requirements = new Map(manifest.factorRequirements.map(requirement => [
    requirement.usageKey,
    {
      usageKey: requirement.usageKey,
      recipe: requirement.recipe,
      factor: requirement.factor,
      value: freezeClone(requirement.value),
      eligibleDatasets: new Set(requirement.eligibleDatasets)
    }
  ]));
  const eligibleRecipeDatasets = new Map(manifest.eligibleRecipeDatasets.map(
    ([recipe, datasets]) => [recipe, new Set(datasets)]
  ));
  const scheduleRequirements = new Map(manifest.scheduleRequirements.map(requirement => [
    requirement.key,
    {
      key: requirement.key,
      recipe: requirement.recipe,
      factor: requirement.factor,
      variantId: requirement.variantId,
      requiredCount: requirement.requiredCount,
      minimumDatasets: requirement.minimumDatasets,
      order: requirement.order,
      eligibleDatasets: new Set(requirement.eligibleDatasets)
    }
  ]));
  const scheduleRequirementsByRecipe = new Map();
  for (const requirement of scheduleRequirements.values()) {
    const values = scheduleRequirementsByRecipe.get(requirement.recipe) ?? [];
    values.push(requirement);
    scheduleRequirementsByRecipe.set(requirement.recipe, values);
  }
  return Object.freeze({
    requirements,
    eligibleRecipeDatasets,
    scheduleRequirements,
    scheduleRequirementsByRecipe
  });
}

export function mergeRealisticScenarioFactorRequirementFragments(plan, fragments) {
  validateRealisticGenerationPlan(plan);
  if (!Array.isArray(fragments) || fragments.some(fragment =>
    fragment?.planId !== plan.planId
  )) throw new TypeError("Realistic factor requirement fragments do not match their plan.");
  const recipes = realisticRecipesForIds(plan.recipeIds);
  const contract = mergeFactorRequirementFragments(
    recipes,
    plan.activeDatasets,
    fragments
  );
  const requirementsByRecipe = factorRequirementsByRecipe(contract.requirements);
  const selectionTargets = factorRequirementSelectionTargets(
    recipes,
    requirementsByRecipe
  );
  if (plan.full) {
    assertFactorRequirementFeasibility(
      recipes,
      contract.requirements,
      contract.scheduleRequirements,
      selectionTargets
    );
  }
  return serializeFactorRequirementContract(contract, plan);
}

export function realisticScenarioDeclaredCapacityReport(
  recipes = REALISTIC_SCENARIO_RECIPES
) {
  const datasets = new Set(recipes.flatMap(recipe => recipe.datasets)
    .filter(id => datasetDefinition(id).corpus === "tidytuesday"));
  const declaredFactorTarget = recipe => {
    const scheduledFactor = recipe.coverageSchedule?.factor;
    const domainSizes = Object.entries(recipe.factors)
      .filter(([factor]) => !["dataset", "fieldPair", scheduledFactor].includes(factor))
      .map(([factor, domain]) => {
        if (!Array.isArray(domain) || domain.length === 0) {
          throw new TypeError(
            `Scenario recipe "${recipe.id}" factor "${factor}" must have a non-empty domain.`
          );
        }
        return new Set(domain.map(stableValue)).size;
      });
    return Math.max(
      minimumSelections(recipe),
      Math.max(0, ...domainSizes) * REALISTIC_FACTOR_VALUE_MINIMUM
    );
  };
  const totals = valueFor => Object.freeze(Object.fromEntries(
    REALISTIC_COMPLEXITIES.map(complexity => [
      complexity,
      recipes.filter(recipe => recipe.complexity === complexity)
        .reduce((sum, recipe) => sum + valueFor(recipe), 0)
    ])
  ));
  const declaredFactorSelectionTargetsByRecipe = Object.freeze(
    Object.fromEntries(recipes.map(recipe => [
      recipe.id,
      declaredFactorTarget(recipe)
    ]))
  );
  return Object.freeze({
    datasetCount: datasets.size,
    recipeCounts: totals(() => 1),
    minimumSelections: totals(minimumSelections),
    declaredFactorSelectionTargetsByRecipe,
    declaredFactorSelectionTargets: totals(recipe =>
      declaredFactorSelectionTargetsByRecipe[recipe.id]
    ),
    capacity: Object.freeze(Object.fromEntries(
      REALISTIC_COMPLEXITIES.map(complexity => [
        complexity,
        REALISTIC_DATASET_QUOTAS[complexity] * datasets.size
      ])
    ))
  });
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
      const key = scheduleRequirementKey(recipe.id, variantId);
      const requirement = globalState.scheduleRequirements?.get(key);
      const observed = globalState.scheduleFulfillment.get(
        key
      );
      const scheduledCount = requirement?.requiredCount ?? requiredCount;
      const minimumDatasets = requirement?.minimumDatasets ?? Math.min(
        scheduledCount,
        schedule.minimumDatasetsPerRequirement ?? 1
      );
      const fulfilledCount = observed?.count ?? 0;
      const fulfilledDatasets = observed?.datasets.size ?? 0;
      records.push(Object.freeze({
        recipe: recipe.id,
        factor: schedule.factor,
        variantId,
        scheduledCount,
        fulfilledCount,
        minimumDatasets,
        fulfilledDatasets,
        missingCount: Math.max(0, scheduledCount - fulfilledCount),
        missingDatasets: Math.max(0, minimumDatasets - fulfilledDatasets)
      }));
    }
  }
  return Object.freeze(records);
}

export function scenarioCoverageSchedulePlan(recipeId, {
  datasets
} = {}) {
  const recipe = scenarioRecipe(recipeId);
  const schedule = recipe.coverageSchedule;
  if (schedule === undefined) {
    throw new Error(`Scenario recipe "${recipeId}" has no coverage schedule.`);
  }
  const selectedDatasets = datasets === undefined
    ? [...recipe.datasets]
    : [...datasets];
  if (
    selectedDatasets.length === 0 ||
    new Set(selectedDatasets).size !== selectedDatasets.length ||
    selectedDatasets.some(dataset => !recipe.datasets.includes(dataset))
  ) {
    throw new Error(
      `Scenario recipe "${recipeId}" schedule plan requires unique supported datasets.`
    );
  }
  const contract = collectFactorValueRequirements([recipe], selectedDatasets);
  const requirements = contract.scheduleRequirementsByRecipe.get(recipe.id) ?? [];
  const datasetIndexes = new Map(
    selectedDatasets.map((dataset, index) => [dataset, index])
  );
  const eligibleRecipeDatasets = contract.eligibleRecipeDatasets.get(recipe.id) ?? new Set();
  const globalState = {
    factorPools: new Map(),
    attemptedFactorCases: new Map(),
    baselineFactorCases: new Set(),
    recipeCounts: new Map(),
    factorValueCounts: new Map(),
    factorValueDatasets: new Map(),
    factorRequirements: contract.requirements,
    factorPairs: new Set(),
    factorCaseCounts: new Map(),
    scheduleFulfillment: new Map(),
    scheduleRequirements: contract.scheduleRequirements,
    scheduleRequirementsByRecipe: contract.scheduleRequirementsByRecipe,
    datasetIndexes,
    strict: true
  };
  const assignments = [];
  const unavailable = [];
  const exhausted = [];
  let eligibleOrdinal = 0;
  for (const dataset of selectedDatasets) {
    if (!eligibleRecipeDatasets.has(dataset)) continue;
    eligibleOrdinal += 1;
    const pacingTarget = scenarioSelectionPacingTarget(
      schedule.selectionVariantIds.length,
      eligibleOrdinal,
      eligibleRecipeDatasets.size
    );
    let variant = 0;
    try {
      while (assignments.length < schedule.selectionVariantIds.length) {
        const [priority] = scenarioScheduleVariantPriorities(requirements, {
          dataset,
          datasetIndexes,
          fulfillment: globalState.scheduleFulfillment
        });
        if (
          priority === undefined ||
          assignments.length >= pacingTarget && priority.deadlineUrgency === 0
        ) break;
        const selection = factorVariant(recipe, dataset, variant, globalState);
        variant += 1;
        if (selection === undefined) break;
        if (selection.unavailable === true) {
          unavailable.push(Object.freeze({
            dataset,
            scheduledVariantIds: selection.scheduledVariantIds
          }));
          break;
        }
        if (selection.exhausted === true) {
          exhausted.push(Object.freeze({
            dataset,
            scheduledVariantId: selection.scheduledVariantId,
            eligibleFactorCases: selection.eligibleFactorCases
          }));
          break;
        }
        recordFactorSelection(recipe, selection, globalState);
        globalState.recipeCounts.set(
          recipe.id,
          (globalState.recipeCounts.get(recipe.id) ?? 0) + 1
        );
        assignments.push(Object.freeze({
          recipe: recipe.id,
          factor: schedule.factor,
          variantId: scheduledValueId(selection.factors[schedule.factor]),
          dataset
        }));
      }
    } finally {
      releaseTidyTuesdaySourceCache(dataset);
      globalState.factorPools.clear();
      globalState.attemptedFactorCases.clear();
      globalThis.gc?.();
    }
  }
  const requirementReport = requirements.map(requirement => {
    const observed = globalState.scheduleFulfillment.get(requirement.key);
    const fulfilledCount = observed?.count ?? 0;
    const fulfilledDatasetIds = [...(observed?.datasets ?? [])].sort();
    return Object.freeze({
      recipe: recipe.id,
      factor: requirement.factor,
      variantId: requirement.variantId,
      scheduledCount: requirement.requiredCount,
      fulfilledCount,
      minimumDatasets: requirement.minimumDatasets,
      fulfilledDatasets: fulfilledDatasetIds.length,
      eligibleDatasetCount: requirement.eligibleDatasets.size,
      fulfilledDatasetIds: Object.freeze(fulfilledDatasetIds),
      missingCount: Math.max(0, requirement.requiredCount - fulfilledCount),
      missingDatasets: Math.max(
        0,
        requirement.minimumDatasets - fulfilledDatasetIds.length
      )
    });
  });
  return Object.freeze({
    recipe: recipe.id,
    factor: schedule.factor,
    assignments: Object.freeze(assignments),
    requirements: Object.freeze(requirementReport),
    unavailable: Object.freeze(unavailable),
    exhausted: Object.freeze(exhausted),
    complete: requirementReport.every(requirement =>
      requirement.missingCount === 0 && requirement.missingDatasets === 0
    ) && unavailable.length === 0 && exhausted.length === 0
  });
}

function factorValueRequirementReport(globalState, descriptors) {
  const selectedCounts = new Map();
  const selectedDatasets = new Map();
  for (const descriptor of descriptors) {
    for (const [factor, value] of Object.entries(descriptor.factors)) {
      if (factor === "dataset") continue;
      const usageKey = factorValueUsageKey(descriptor.recipe, factor, value);
      if (!globalState.factorRequirements.has(usageKey)) continue;
      selectedCounts.set(usageKey, (selectedCounts.get(usageKey) ?? 0) + 1);
      if (!selectedDatasets.has(usageKey)) selectedDatasets.set(usageKey, new Set());
      selectedDatasets.get(usageKey).add(descriptor.factors.dataset);
    }
  }
  return Object.freeze([...globalState.factorRequirements.values()]
    .map(requirement => {
      const fulfilledCount = selectedCounts.get(requirement.usageKey) ?? 0;
      const selectedDatasetIds = [...(selectedDatasets.get(requirement.usageKey) ?? [])]
        .sort();
      const fulfilledDatasets = selectedDatasetIds.length;
      return Object.freeze({
        recipe: requirement.recipe,
        factor: requirement.factor,
        value: freezeClone(requirement.value),
        valueKey: stableValue(requirement.value),
        requiredCount: REALISTIC_FACTOR_VALUE_MINIMUM,
        fulfilledCount,
        minimumDatasets: REALISTIC_FACTOR_VALUE_MINIMUM,
        fulfilledDatasets,
        eligibleDatasetCount: requirement.eligibleDatasets.size,
        selectedDatasetIds: Object.freeze(selectedDatasetIds),
        missingCount: Math.max(0, REALISTIC_FACTOR_VALUE_MINIMUM - fulfilledCount),
        missingDatasets: Math.max(
          0,
          REALISTIC_FACTOR_VALUE_MINIMUM - fulfilledDatasets
        )
      });
    })
    .sort((left, right) =>
      left.recipe.localeCompare(right.recipe) ||
      left.factor.localeCompare(right.factor) ||
      left.valueKey.localeCompare(right.valueKey)
    ));
}

export function assertScenarioFactorValueRequirements(requirements) {
  if (!Array.isArray(requirements) || requirements.some(value =>
    value === null || typeof value !== "object" ||
    typeof value.recipe !== "string" || value.recipe.length === 0 ||
    typeof value.factor !== "string" || value.factor.length === 0 ||
    typeof value.valueKey !== "string" || value.valueKey.length === 0 ||
    !Number.isInteger(value.requiredCount) || value.requiredCount < 1 ||
    !Number.isInteger(value.fulfilledCount) || value.fulfilledCount < 0 ||
    !Number.isInteger(value.minimumDatasets) || value.minimumDatasets < 1 ||
    !Number.isInteger(value.fulfilledDatasets) || value.fulfilledDatasets < 0 ||
    !Number.isInteger(value.eligibleDatasetCount) || value.eligibleDatasetCount < 0
  )) {
    throw new TypeError("Scenario factor value requirements must be valid records.");
  }
  const missing = requirements.filter(value =>
    value.fulfilledCount < value.requiredCount ||
    value.fulfilledDatasets < value.minimumDatasets
  );
  if (missing.length > 0) {
    throw new Error(
      `Realistic factor value requirements were not met: ` +
      `${missing.slice(0, 20).map(value =>
        `${value.recipe}.${value.factor}=${value.valueKey} ` +
        `count=${value.fulfilledCount}/${value.requiredCount},` +
        `datasets=${value.fulfilledDatasets}/${value.minimumDatasets},` +
        `eligible=${value.eligibleDatasetCount}`
      ).join("; ")}`
    );
  }
}

export function scenarioSelectionPacingTarget(
  selectionTarget,
  eligibleOrdinal,
  eligibleTotal
) {
  if (
    !Number.isSafeInteger(selectionTarget) || selectionTarget < 0 ||
    !Number.isSafeInteger(eligibleOrdinal) || eligibleOrdinal < 0 ||
    !Number.isSafeInteger(eligibleTotal) || eligibleTotal < 1 ||
    eligibleOrdinal > eligibleTotal
  ) {
    throw new RangeError(
      "Scenario selection pacing requires a nonnegative target and a valid eligible ordinal."
    );
  }
  return Math.ceil(selectionTarget * eligibleOrdinal / eligibleTotal);
}

function recipePacingDeficit(recipe, dataset, count, selectionTarget, globalState) {
  if (!globalState.strict || selectionTarget === 0) return 0;
  const eligible = globalState.eligibleRecipeDatasets.get(recipe.id) ?? new Set();
  if (!eligible.has(dataset)) return 0;
  const currentIndex = globalState.datasetIndexes.get(dataset);
  let eligibleOrdinal = 0;
  for (const value of eligible) {
    if (globalState.datasetIndexes.get(value) <= currentIndex) eligibleOrdinal += 1;
  }
  const pacedTarget = scenarioSelectionPacingTarget(
    selectionTarget,
    eligibleOrdinal,
    eligible.size
  );
  return Math.max(0, pacedTarget - count);
}

function recipeSchedulePriority(recipe, dataset, globalState) {
  const requirements = globalState.scheduleRequirementsByRecipe.get(recipe.id) ?? [];
  if (requirements.length === 0) {
    return { deadlineUrgency: 0, newDatasetDeficit: 0, occurrenceDeficit: 0 };
  }
  const [priority] = scenarioScheduleVariantPriorities(requirements, {
    dataset,
    datasetIndexes: globalState.datasetIndexes,
    fulfillment: globalState.scheduleFulfillment
  });
  return priority ?? {
    deadlineUrgency: 0,
    newDatasetDeficit: 0,
    occurrenceDeficit: 0
  };
}

function recipeSelectionPriority(recipe, dataset, globalState) {
  const count = globalState.recipeCounts.get(recipe.id) ?? 0;
  const minimum = minimumSelections(recipe);
  const deficit = Math.max(0, minimum - count);
  const selectionTarget = globalState.strict
    ? globalState.factorSelectionTargets.get(recipe.id) ?? minimum
    : minimum;
  const targetDeficit = Math.max(0, selectionTarget - count);
  const pacingDeficit = recipePacingDeficit(
    recipe,
    dataset,
    count,
    selectionTarget,
    globalState
  );
  const schedulePriority = globalState.strict
    ? recipeSchedulePriority(recipe, dataset, globalState)
    : { deadlineUrgency: 0, newDatasetDeficit: 0, occurrenceDeficit: 0 };
  let urgentFactorDatasets = 0;
  let newFactorDatasetDeficit = 0;
  if (globalState.strict) {
    for (const requirement of globalState.factorRequirementsByRecipe.get(recipe.id) ?? []) {
      if (!requirement.eligibleDatasets.has(dataset)) continue;
      const priority = requirementDatasetPriority(requirement, dataset, globalState);
      urgentFactorDatasets += priority.urgent;
      newFactorDatasetDeficit += priority.deficit;
    }
  }
  const datasets = globalState.recipeDatasets.get(recipe.id) ?? new Set();
  const needsNewDataset = minimum > 0 && datasets.size < 3 && !datasets.has(dataset);
  return {
    scheduleDeadlineUrgency: schedulePriority.deadlineUrgency,
    urgentFactorDatasets,
    pacingDeficit,
    newFactorDatasetDeficit,
    targetUnmet: Number(targetDeficit > 0),
    targetDeficitRatio: selectionTarget === 0 ? 0 : targetDeficit / selectionTarget,
    needsNewDataset: Number(needsNewDataset),
    unmet: Number(deficit > 0),
    deficitRatio: minimum === 0 ? 0 : deficit / minimum,
    count
  };
}

function compareRecipePriority(left, right, dataset, globalState) {
  const leftPriority = recipeSelectionPriority(left, dataset, globalState);
  const rightPriority = recipeSelectionPriority(right, dataset, globalState);
  return rightPriority.scheduleDeadlineUrgency - leftPriority.scheduleDeadlineUrgency ||
    rightPriority.urgentFactorDatasets - leftPriority.urgentFactorDatasets ||
    rightPriority.pacingDeficit - leftPriority.pacingDeficit ||
    rightPriority.newFactorDatasetDeficit - leftPriority.newFactorDatasetDeficit ||
    rightPriority.targetUnmet - leftPriority.targetUnmet ||
    rightPriority.targetDeficitRatio - leftPriority.targetDeficitRatio ||
    rightPriority.needsNewDataset - leftPriority.needsNewDataset ||
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
      const contract = scenarioFactorContract(recipe.id, { dataset });
      if (contract !== undefined) return true;
      globalState.skips.push(Object.freeze({
        dataset,
        complexity,
        recipe: recipe.id,
        reason: "no-eligible-factor-domain"
      }));
      return false;
    });
  let schedulingIterations = 0;
  const failureContext = kind => ({
    kind,
    dataset,
    datasetIndex,
    tier: complexity,
    quota,
    produced: selected.length,
    schedulingIterations,
    eligibleRecipes,
    selectedDescriptors: selected,
    duplicates: globalState.duplicates,
    rejections: globalState.rejections,
    skips: globalState.skips
  });
  if (eligibleRecipes.length === 0) {
    throw scenarioGenerationFailureError(
      `Dataset "${dataset}" has no realistic ${complexity} recipes.`,
      failureContext("quota")
    );
  }
  const disabledRecipes = new Set();
  const recipeFailures = new Map();
  const maximumSchedulingIterations = eligibleRecipes.length * 96;
  while (selected.length < quota && schedulingIterations < maximumSchedulingIterations) {
    const ordered = eligibleRecipes.filter(recipe => !disabledRecipes.has(recipe.id))
      .sort((left, right) =>
      compareRecipePriority(left, right, dataset, globalState) ||
      (hashOffset(`${left.id}\0${datasetIndex}\0${schedulingIterations}`) -
        hashOffset(`${right.id}\0${datasetIndex}\0${schedulingIterations}`))
    );
    if (ordered.length === 0) break;
    const leadingPriority = recipeSelectionPriority(ordered[0], dataset, globalState);
    const recipe = leadingPriority.scheduleDeadlineUrgency > 0 ||
      leadingPriority.urgentFactorDatasets > 0 ||
      leadingPriority.pacingDeficit > 0
      ? ordered[0]
      : ordered[schedulingIterations % Math.min(ordered.length, 4)];
    schedulingIterations += 1;
    const variant = variants.get(recipe.id) ?? 0;
    variants.set(recipe.id, variant + 1);
    let factors;
    try {
      const selection = factorVariant(recipe, dataset, variant, globalState);
      if (selection === undefined) continue;
      if (selection.unavailable === true) {
        disabledRecipes.add(recipe.id);
        globalState.skips.push(Object.freeze({
          dataset,
          complexity,
          recipe: recipe.id,
          reason: "scheduled-factor-unavailable-for-dataset",
          scheduledVariantIds: selection.scheduledVariantIds
        }));
        continue;
      }
      if (selection.exhausted === true) {
        disabledRecipes.add(recipe.id);
        globalState.skips.push(Object.freeze({
          dataset,
          complexity,
          recipe: recipe.id,
          reason: "factor-candidate-domain-exhausted",
          eligibleFactorCases: selection.eligibleFactorCases,
          attemptedEligibleFactorCases: selection.attemptedEligibleFactorCases,
          scheduledVariantId: selection.scheduledVariantId
        }));
        continue;
      }
      globalState.candidateOrdinal += 1;
      factors = selection.factors;
      const candidate = preflightRealisticCandidate(recipe, factors).descriptor;
      if (globalState.fingerprints.has(candidate.semanticFingerprint)) {
        globalState.duplicates.push(Object.freeze({
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
      const rejection = Object.freeze({
        dataset,
        complexity,
        recipe: recipe.id,
        factors,
        message: error.message
      });
      globalState.rejections.push(rejection);
      if (globalState.strict) {
        throw scenarioGenerationFailureError(
          `Realistic candidate preflight failed: ${scenarioCandidateFailureDiagnostic(rejection)}`,
          failureContext("preflight"),
          error
        );
      }
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
    } finally {
      if (
        globalState.candidateOrdinal % REALISTIC_CANDIDATE_GC_INTERVAL === 0
      ) globalThis.gc?.();
    }
  }
  if (selected.length !== quota) {
    const recent = globalState.rejections.slice(-8)
      .map(value => `${value.recipe}: ${value.message}`).join("; ");
    throw scenarioGenerationFailureError(
      `Dataset "${dataset}" produced ${selected.length}/${quota} ${complexity} charts ` +
      `after ${schedulingIterations} scheduling iterations.` +
      `${recent.length === 0 ? "" : ` Recent: ${recent}`}`,
      failureContext("quota")
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

function serializeMapOfSets(values) {
  return [...values].map(([key, set]) => [key, [...set]]);
}

function deserializeMapOfSets(values) {
  return new Map(values.map(([key, set]) => [key, new Set(set)]));
}

function serializeScheduleFulfillment(values) {
  return [...values].map(([key, value]) => [key, {
    recipe: value.recipe,
    factor: value.factor,
    variantId: value.variantId,
    count: value.count,
    datasets: [...value.datasets]
  }]);
}

function deserializeScheduleFulfillment(values) {
  return new Map(values.map(([key, value]) => [key, {
    recipe: value.recipe,
    factor: value.factor,
    variantId: value.variantId,
    count: value.count,
    datasets: new Set(value.datasets)
  }]));
}

function realisticGenerationStatePayload(state) {
  return {
    schemaVersion: state.schemaVersion,
    planId: state.planId,
    manifestId: state.manifestId,
    nextDatasetIndex: state.nextDatasetIndex,
    candidateOrdinal: state.candidateOrdinal,
    fingerprints: state.fingerprints,
    recipeCounts: state.recipeCounts,
    recipeDatasets: state.recipeDatasets,
    baselineFactorCases: state.baselineFactorCases,
    factorValueCounts: state.factorValueCounts,
    factorValueDatasets: state.factorValueDatasets,
    factorPairs: state.factorPairs,
    factorCaseCounts: state.factorCaseCounts,
    scheduleFulfillment: state.scheduleFulfillment,
    rejections: state.rejections,
    duplicates: state.duplicates,
    skips: state.skips
  };
}

function sealedRealisticGenerationState(payload) {
  return freezeClone({ ...payload, stateId: wireDigest(payload) });
}

function emptyRealisticGenerationState(plan, manifest) {
  return sealedRealisticGenerationState({
    schemaVersion: 1,
    planId: plan.planId,
    manifestId: manifest.manifestId,
    nextDatasetIndex: 0,
    candidateOrdinal: 0,
    fingerprints: [],
    recipeCounts: [],
    recipeDatasets: [],
    baselineFactorCases: [],
    factorValueCounts: [],
    factorValueDatasets: [],
    factorPairs: [],
    factorCaseCounts: [],
    scheduleFulfillment: [],
    rejections: [],
    duplicates: [],
    skips: []
  });
}

function validCountEntries(values, allowed) {
  return uniqueEntryKeys(values) && values.every(([key, count]) =>
    (allowed === undefined || allowed.has(key)) && nonnegativeCount(count)
  );
}

function validSetEntries(values, allowedKeys, allowedValues) {
  return uniqueEntryKeys(values) && values.every(([key, set]) =>
    (allowedKeys === undefined || allowedKeys.has(key)) &&
    uniqueStrings(set, allowedValues)
  );
}

function validateRealisticGenerationState(state, plan, manifest) {
  validateFactorRequirementManifest(manifest, plan);
  const payload = realisticGenerationStatePayload(state ?? {});
  const recipeIds = new Set(plan.recipeIds);
  const datasets = new Set(plan.activeDatasets);
  const scheduleByKey = new Map(manifest.scheduleRequirements.map(value => [
    value.key,
    value
  ]));
  const diagnostics = [payload.rejections, payload.duplicates, payload.skips];
  const accepted = Array.isArray(payload.recipeCounts)
    ? payload.recipeCounts.reduce((sum, value) =>
        sum + (Array.isArray(value) && nonnegativeCount(value[1]) ? value[1] : 0), 0
      )
    : -1;
  if (
    payload.schemaVersion !== 1 || payload.planId !== plan.planId ||
    payload.manifestId !== manifest.manifestId ||
    typeof state.stateId !== "string" || state.stateId !== wireDigest(payload) ||
    !Number.isInteger(payload.nextDatasetIndex) || payload.nextDatasetIndex < 0 ||
    payload.nextDatasetIndex > plan.activeDatasets.length ||
    !nonnegativeCount(payload.candidateOrdinal) ||
    !uniqueStrings(payload.fingerprints) ||
    payload.fingerprints.some(value => !/^[a-f0-9]{64}$/u.test(value)) ||
    !validCountEntries(payload.recipeCounts, recipeIds) ||
    !validSetEntries(payload.recipeDatasets, recipeIds, datasets) ||
    !uniqueStrings(payload.baselineFactorCases, recipeIds) ||
    !validCountEntries(payload.factorValueCounts) ||
    !validSetEntries(payload.factorValueDatasets, undefined, datasets) ||
    !uniqueStrings(payload.factorPairs) ||
    !validCountEntries(payload.factorCaseCounts) ||
    !uniqueEntryKeys(payload.scheduleFulfillment) ||
    payload.scheduleFulfillment.some(([key, value]) => {
      const requirement = scheduleByKey.get(key);
      return requirement === undefined || value === null || typeof value !== "object" ||
        value.recipe !== requirement.recipe || value.factor !== requirement.factor ||
        value.variantId !== requirement.variantId || !nonnegativeCount(value.count) ||
        !uniqueStrings(value.datasets, datasets);
    }) ||
    diagnostics.some(values => !Array.isArray(values) || values.some(value =>
      value === null || typeof value !== "object" || Array.isArray(value)
    )) ||
    accepted !== payload.nextDatasetIndex * plan.chartsPerDataset ||
    payload.fingerprints.length !== accepted ||
    payload.candidateOrdinal !== accepted + payload.rejections.length +
      payload.duplicates.length
  ) {
    throw new TypeError("Realistic generation state is invalid.");
  }
}

function hydrateRealisticGlobalState(plan, manifest, state) {
  validateRealisticGenerationState(state, plan, manifest);
  const recipes = realisticRecipesForIds(plan.recipeIds);
  const requirementContract = factorRequirementContractFromManifest(manifest, plan);
  const requirementsByRecipe = factorRequirementsByRecipe(
    requirementContract.requirements
  );
  return {
    recipes,
    globalState: {
      candidateOrdinal: state.candidateOrdinal,
      fingerprints: new Set(state.fingerprints),
      recipeCounts: new Map(state.recipeCounts),
      recipeDatasets: deserializeMapOfSets(state.recipeDatasets),
      factorPools: new Map(),
      attemptedFactorCases: new Map(),
      baselineFactorCases: new Set(state.baselineFactorCases),
      factorValueCounts: new Map(state.factorValueCounts),
      factorValueDatasets: deserializeMapOfSets(state.factorValueDatasets),
      factorRequirements: requirementContract.requirements,
      factorRequirementsByRecipe: requirementsByRecipe,
      factorSelectionTargets: factorRequirementSelectionTargets(
        recipes,
        requirementsByRecipe
      ),
      eligibleRecipeDatasets: requirementContract.eligibleRecipeDatasets,
      scheduleRequirements: requirementContract.scheduleRequirements,
      scheduleRequirementsByRecipe: requirementContract.scheduleRequirementsByRecipe,
      datasetIndexes: new Map(plan.datasets.map((dataset, index) => [dataset, index])),
      factorPairs: new Set(state.factorPairs),
      factorCaseCounts: new Map(state.factorCaseCounts),
      scheduleFulfillment: deserializeScheduleFulfillment(state.scheduleFulfillment),
      rejections: [...state.rejections],
      duplicates: [...state.duplicates],
      skips: [...state.skips],
      strict: plan.strict
    },
    requirementContract
  };
}

function serializeRealisticGlobalState(globalState, nextDatasetIndex, plan, manifest) {
  return sealedRealisticGenerationState({
    schemaVersion: 1,
    planId: plan.planId,
    manifestId: manifest.manifestId,
    nextDatasetIndex,
    candidateOrdinal: globalState.candidateOrdinal,
    fingerprints: [...globalState.fingerprints],
    recipeCounts: [...globalState.recipeCounts],
    recipeDatasets: serializeMapOfSets(globalState.recipeDatasets),
    baselineFactorCases: [...globalState.baselineFactorCases],
    factorValueCounts: [...globalState.factorValueCounts],
    factorValueDatasets: serializeMapOfSets(globalState.factorValueDatasets),
    factorPairs: [...globalState.factorPairs],
    factorCaseCounts: [...globalState.factorCaseCounts],
    scheduleFulfillment: serializeScheduleFulfillment(globalState.scheduleFulfillment),
    rejections: globalState.rejections,
    duplicates: globalState.duplicates,
    skips: globalState.skips
  });
}

export function initializeRealisticScenarioGenerationState(plan, manifest) {
  validateFactorRequirementManifest(manifest, plan);
  const state = emptyRealisticGenerationState(plan, manifest);
  hydrateRealisticGlobalState(plan, manifest, state);
  return state;
}

export function generateRealisticScenarioDataset(plan, manifest, state) {
  if (plan?.schemaVersion !== 1 || !Array.isArray(plan.activeDatasets)) {
    throw new TypeError("Realistic dataset generation requires a generation plan.");
  }
  const { recipes, globalState } = hydrateRealisticGlobalState(plan, manifest, state);
  const datasetIndex = state.nextDatasetIndex;
  const dataset = plan.activeDatasets[datasetIndex];
  if (dataset === undefined) {
    throw new Error("Realistic generation has no remaining dataset.");
  }
  let descriptors;
  try {
    const byTier = Object.fromEntries(REALISTIC_COMPLEXITIES.map(complexity => [
      complexity,
      realisticTierDescriptors(dataset, datasetIndex, complexity, recipes, globalState)
    ]));
    descriptors = Object.freeze(interleaveTiers(byTier));
  } finally {
    releaseTidyTuesdaySourceCache(dataset);
    globalState.factorPools.clear();
    globalState.attemptedFactorCases.clear();
    globalThis.gc?.();
  }
  if (descriptors.length !== plan.chartsPerDataset) {
    throw new Error(
      `Dataset "${dataset}" requires ${plan.chartsPerDataset} descriptors, ` +
      `received ${descriptors.length}.`
    );
  }
  return Object.freeze({
    dataset,
    datasetIndex,
    descriptors,
    state: serializeRealisticGlobalState(
      globalState,
      datasetIndex + 1,
      plan,
      manifest
    )
  });
}

function validateRealisticGeneratedDescriptors(plan, recipes, globalState, descriptors) {
  const expectedCount = plan.activeDatasets.length * plan.chartsPerDataset;
  const recipeIds = new Set(recipes.map(recipe => recipe.id));
  if (
    !Array.isArray(descriptors) || descriptors.length !== expectedCount ||
    descriptors.some((descriptor, index) =>
      descriptor === null || typeof descriptor !== "object" ||
      typeof descriptor.id !== "string" || descriptor.id.length === 0 ||
      typeof descriptor.recipe !== "string" || !recipeIds.has(descriptor.recipe) ||
      descriptor.factors === null || typeof descriptor.factors !== "object" ||
      descriptor.factors.dataset !==
        plan.activeDatasets[Math.floor(index / plan.chartsPerDataset)] ||
      typeof descriptor.semanticFingerprint !== "string" ||
      !/^[a-f0-9]{64}$/u.test(descriptor.semanticFingerprint)
    ) ||
    new Set(descriptors.map(descriptor => descriptor.id)).size !== expectedCount ||
    new Set(descriptors.map(descriptor => descriptor.semanticFingerprint)).size !==
      expectedCount
  ) {
    throw new TypeError("Realistic generated descriptor shards are invalid.");
  }
  const descriptorFingerprints = new Set(descriptors.map(value =>
    value.semanticFingerprint
  ));
  if (
    descriptorFingerprints.size !== globalState.fingerprints.size ||
    [...descriptorFingerprints].some(value => !globalState.fingerprints.has(value))
  ) {
    throw new TypeError("Realistic generated fingerprints do not match scheduler state.");
  }
  const recipeCounts = new Map();
  const recipeDatasets = new Map();
  for (const descriptor of descriptors) {
    recipeCounts.set(descriptor.recipe, (recipeCounts.get(descriptor.recipe) ?? 0) + 1);
    if (!recipeDatasets.has(descriptor.recipe)) {
      recipeDatasets.set(descriptor.recipe, new Set());
    }
    recipeDatasets.get(descriptor.recipe).add(descriptor.factors.dataset);
  }
  if (
    recipeCounts.size !== globalState.recipeCounts.size ||
    [...recipeCounts].some(([recipe, count]) =>
      globalState.recipeCounts.get(recipe) !== count
    ) ||
    recipeDatasets.size !== globalState.recipeDatasets.size ||
    [...recipeDatasets].some(([recipe, datasets]) => {
      const expected = globalState.recipeDatasets.get(recipe);
      return expected === undefined || expected.size !== datasets.size ||
        [...datasets].some(dataset => !expected.has(dataset));
    })
  ) {
    throw new TypeError("Realistic generated recipe counts do not match scheduler state.");
  }
}

function finalizeRealisticScenarioGenerationWithGlobalState(
  plan,
  recipes,
  globalState,
  descriptors
) {
  validateRealisticGeneratedDescriptors(plan, recipes, globalState, descriptors);
  const selected = Object.freeze(descriptors.slice(0, plan.selectedDescriptorCount));
  const factorValueRequirements = factorValueRequirementReport(globalState, selected);
  const missingFactorValueRequirements = factorValueRequirements.filter(value =>
    value.missingCount > 0 || value.missingDatasets > 0
  );
  if (plan.full && selected.length !== 3_600) {
    throw new Error(`Realistic mode requires exactly 3,600 descriptors, received ${selected.length}.`);
  }
  if (plan.full) {
    if (globalState.rejections.length > 0) {
      throw new Error(
        `Realistic candidate preflight failures must be fixed: ${globalState.rejections
          .slice(0, 20)
          .map(scenarioCandidateFailureDiagnostic)
          .join("; ")}`
      );
    }
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
    assertScenarioFactorValueRequirements(factorValueRequirements);
  }
  const schedules = coverageScheduleReport(recipes, globalState);
  const acceptedCandidates = [...globalState.recipeCounts.values()]
    .reduce((sum, count) => sum + count, 0);
  const generation = freezeClone({
    known: true,
    attemptedCandidates: globalState.candidateOrdinal,
    acceptedCandidates,
    selectedDescriptors: selected.length,
    rejectedCandidates: globalState.rejections.length,
    duplicateCandidates: globalState.duplicates.length,
    skippedRecipeDatasets: globalState.skips.length,
    rejections: globalState.rejections,
    duplicates: globalState.duplicates,
    skips: globalState.skips,
    factorPairCount: globalState.factorPairs.size,
    factorValueOccurrences: Object.fromEntries([...globalState.factorValueCounts].sort()),
    factorValueRequirements,
    missingFactorValueRequirements,
    coverageSchedules: schedules,
    missingCoverageSchedules: schedules.filter(value =>
      value.missingCount > 0 || value.missingDatasets > 0
    ),
    recipeSelections: Object.fromEntries([...globalState.recipeCounts].sort()),
    recipeDatasetCounts: Object.fromEntries([...globalState.recipeDatasets]
      .map(([id, values]) => [id, values.size]).sort())
  });
  realisticGenerationDiagnostics.set(selected, generation);
  return Object.freeze({ descriptors: selected, generation });
}

function finalizeRealisticScenarioGeneration(plan, manifest, state, descriptors) {
  const { recipes, globalState } = hydrateRealisticGlobalState(plan, manifest, state);
  if (state.nextDatasetIndex !== plan.activeDatasets.length) {
    throw new Error(
      `Realistic generation finalized ${state.nextDatasetIndex}/` +
      `${plan.activeDatasets.length} datasets.`
    );
  }
  return finalizeRealisticScenarioGenerationWithGlobalState(
    plan,
    recipes,
    globalState,
    descriptors
  );
}

export function finalizeRealisticScenarioGenerationState(
  plan,
  manifest,
  state,
  descriptors
) {
  if (!Array.isArray(descriptors)) {
    throw new TypeError("Realistic generation finalization requires descriptors.");
  }
  return finalizeRealisticScenarioGeneration(plan, manifest, state, descriptors);
}

function generateRealisticDescriptors(recipeIds, limit, strictScheduling) {
  const plan = realisticScenarioGenerationPlan({ recipeIds, limit, strictScheduling });
  const recipes = realisticRecipesForIds(plan.recipeIds);
  const requirementContract = collectFactorValueRequirements(
    recipes,
    plan.activeDatasets
  );
  const requirementsByRecipe = factorRequirementsByRecipe(
    requirementContract.requirements
  );
  const factorSelectionTargets = factorRequirementSelectionTargets(
    recipes,
    requirementsByRecipe
  );
  if (plan.full) {
    assertFactorRequirementFeasibility(
      recipes,
      requirementContract.requirements,
      requirementContract.scheduleRequirements,
      factorSelectionTargets
    );
  }
  const globalState = {
    candidateOrdinal: 0,
    fingerprints: new Set(),
    recipeCounts: new Map(),
    recipeDatasets: new Map(),
    factorPools: new Map(),
    attemptedFactorCases: new Map(),
    baselineFactorCases: new Set(),
    factorValueCounts: new Map(),
    factorValueDatasets: new Map(),
    factorRequirements: requirementContract.requirements,
    factorRequirementsByRecipe: requirementsByRecipe,
    factorSelectionTargets,
    eligibleRecipeDatasets: requirementContract.eligibleRecipeDatasets,
    scheduleRequirements: requirementContract.scheduleRequirements,
    scheduleRequirementsByRecipe: requirementContract.scheduleRequirementsByRecipe,
    datasetIndexes: new Map(plan.datasets.map((dataset, index) => [dataset, index])),
    factorPairs: new Set(),
    factorCaseCounts: new Map(),
    scheduleFulfillment: new Map(),
    rejections: [],
    duplicates: [],
    skips: [],
    strict: plan.strict
  };
  const descriptors = [];
  for (let datasetIndex = 0; datasetIndex < plan.activeDatasets.length; datasetIndex += 1) {
    const dataset = plan.activeDatasets[datasetIndex];
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
      globalThis.gc?.();
    }
  }
  return finalizeRealisticScenarioGenerationWithGlobalState(
    plan,
    recipes,
    globalState,
    descriptors
  ).descriptors;
}

export function scenarioGenerationDiagnostics(descriptors) {
  const diagnostics = realisticGenerationDiagnostics.get(descriptors);
  if (diagnostics !== undefined) return diagnostics;
  if (descriptors.some(descriptor => descriptor?.metadata?.corpus === "tidytuesday")) {
    throw new Error(
      "Realistic generation diagnostics require the original generated descriptor array."
    );
  }
  return Object.freeze({
    known: false,
    attemptedCandidates: descriptors.length,
    acceptedCandidates: descriptors.length,
    selectedDescriptors: descriptors.length,
    rejectedCandidates: 0,
    duplicateCandidates: 0,
    skippedRecipeDatasets: 0,
    rejections: Object.freeze([]),
    duplicates: Object.freeze([]),
    skips: Object.freeze([]),
    factorPairCount: 0,
    factorValueOccurrences: Object.freeze({}),
    factorValueRequirements: Object.freeze([]),
    missingFactorValueRequirements: Object.freeze([]),
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
  limit,
  strictScheduling = false
} = {}) {
  if (!["smoke", "deep", "realistic"].includes(mode)) {
    throw new Error('Scenario mode must be "smoke", "deep", or "realistic".');
  }
  if (limit !== undefined && (!Number.isInteger(limit) || limit <= 0)) {
    throw new RangeError("Scenario limit must be a positive integer.");
  }
  if (typeof strictScheduling !== "boolean") {
    throw new TypeError("Scenario strictScheduling must be a boolean.");
  }
  if (strictScheduling && mode !== "realistic") {
    throw new Error("Scenario strictScheduling is available only in realistic mode.");
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
  if (mode === "realistic") {
    return generateRealisticDescriptors(selectedRecipeIds, limit, strictScheduling);
  }
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

export function runScenario(descriptor, {
  deterministic = true,
  captureProgram
} = {}) {
  if (captureProgram !== undefined && typeof captureProgram !== "function") {
    throw new TypeError("runScenario captureProgram must be a function.");
  }
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
    const fingerprint = semanticFingerprint(program);
    if (descriptor.semanticFingerprint !== undefined) {
      assert.equal(
        fingerprint,
        descriptor.semanticFingerprint,
        `${descriptor.id} generated descriptor fingerprint`
      );
    }
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
    const result = Object.freeze({
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
      svgSha256: createHash("sha256").update(svg).digest("hex"),
      semanticFingerprint: fingerprint
    });
    captureProgram?.(program);
    return result;
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
