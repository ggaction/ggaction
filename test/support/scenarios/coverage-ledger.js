import { createHash } from "node:crypto";

const COMPLEXITY_TIERS = Object.freeze([
  "simple",
  "intermediate",
  "advanced",
  "composite"
]);

export const REALISTIC_SCENARIO_COVERAGE_POLICY = Object.freeze({
  minimumSuccessfulScenarios: 3_600,
  maximumFailures: 0,
  exactTidyTuesdayDatasets: 50,
  minimumScenariosPerDataset: 60,
  minimumOccurrences: 5,
  minimumTidyTuesdayDatasets: 3,
  minimumTierDatasets: 40,
  maximumRecipeShare: 0.15,
  maximumChartFamilyShare: 0.25,
  targetRecipesPerRequirement: 2,
  targetTiersPerRequirement: 2,
  strictFeatureInventory: true,
  complexityBands: Object.freeze({
    simple: Object.freeze({ minimum: 0.15, maximum: 0.25 }),
    intermediate: Object.freeze({ minimum: 0.30, maximum: 0.45 }),
    advanced: Object.freeze({ minimum: 0.25, maximum: 0.40 }),
    composite: Object.freeze({ minimum: 0.08, maximum: 0.18 })
  })
});

export const DEFAULT_RENDERER_FEATURES = Object.freeze([
  "renderer:svg",
  "renderer:canvas",
  "renderer:png",
  "renderer:pdf"
]);

export const SOURCE_INDEX_ENCODING = "sorted-zero-based-indexes-sha256-v1";
export const MAX_EXPLICIT_SOURCE_ROW_INDEXES = 160;
const DEFAULT_SCENARIO_WITNESS_LIMIT = 5;

function sortedUnique(values) {
  return Object.freeze([...new Set(values)].sort());
}

function nonNegativeInteger(value, label) {
  if (!Number.isInteger(value) || value < 0) {
    throw new RangeError(`${label} must be a non-negative integer.`);
  }
  return value;
}

function proportion(value, label) {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0 || value > 1) {
    throw new RangeError(`${label} must be between zero and one.`);
  }
  return value;
}

export function scenarioCoveragePolicy(overrides = {}) {
  if (overrides === null || typeof overrides !== "object" || Array.isArray(overrides)) {
    throw new TypeError("Scenario coverage policy overrides must be an object.");
  }
  const policy = {
    ...REALISTIC_SCENARIO_COVERAGE_POLICY,
    ...overrides,
    complexityBands: {
      ...REALISTIC_SCENARIO_COVERAGE_POLICY.complexityBands,
      ...(overrides.complexityBands ?? {})
    }
  };
  for (const name of [
    "minimumSuccessfulScenarios",
    "maximumFailures",
    "exactTidyTuesdayDatasets",
    "minimumScenariosPerDataset",
    "minimumOccurrences",
    "minimumTidyTuesdayDatasets",
    "minimumTierDatasets",
    "targetRecipesPerRequirement",
    "targetTiersPerRequirement"
  ]) {
    nonNegativeInteger(policy[name], name);
  }
  proportion(policy.maximumRecipeShare, "maximumRecipeShare");
  proportion(policy.maximumChartFamilyShare, "maximumChartFamilyShare");
  if (typeof policy.strictFeatureInventory !== "boolean") {
    throw new TypeError("strictFeatureInventory must be boolean.");
  }
  for (const tier of COMPLEXITY_TIERS) {
    const band = policy.complexityBands[tier];
    if (band === null || typeof band !== "object") {
      throw new TypeError(`Complexity band ${tier} must be an object.`);
    }
    proportion(band.minimum, `${tier} minimum`);
    proportion(band.maximum, `${tier} maximum`);
    if (band.minimum > band.maximum) {
      throw new RangeError(`Complexity band ${tier} is reversed.`);
    }
    policy.complexityBands[tier] = Object.freeze({ ...band });
  }
  return Object.freeze({
    ...policy,
    complexityBands: Object.freeze(policy.complexityBands)
  });
}

function slug(value) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/gu, "-")
    .replace(/^-|-$/gu, "");
}

function requiredFeature(value) {
  const feature = typeof value === "string" ? { id: value } : value;
  if (
    feature === null || typeof feature !== "object" || Array.isArray(feature) ||
    typeof feature.id !== "string" || feature.id.length === 0
  ) {
    throw new TypeError("Required features need a non-empty id.");
  }
  for (const name of [
    "minimumOccurrences",
    "minimumDatasets",
    "minimumRecipes",
    "minimumTiers"
  ]) {
    if (feature[name] !== undefined) nonNegativeInteger(feature[name], `${feature.id} ${name}`);
  }
  return Object.freeze({
    id: feature.id,
    kind: feature.kind ?? feature.id.split(":", 1)[0],
    ...(feature.minimumOccurrences === undefined
      ? {}
      : { minimumOccurrences: feature.minimumOccurrences }),
    ...(feature.minimumDatasets === undefined
      ? {}
      : { minimumDatasets: feature.minimumDatasets }),
    ...(feature.minimumRecipes === undefined
      ? {}
      : { minimumRecipes: feature.minimumRecipes }),
    ...(feature.minimumTiers === undefined
      ? {}
      : { minimumTiers: feature.minimumTiers })
  });
}

function interactionRequirement(value, knownEvidence) {
  if (
    value === null || typeof value !== "object" || Array.isArray(value) ||
    !Array.isArray(value.members) || value.members.length !== 2 ||
    new Set(value.members).size !== 2 ||
    value.members.some(member => typeof member !== "string" || !knownEvidence.has(member))
  ) {
    throw new TypeError("Coverage interactions require two known, distinct evidence ids.");
  }
  const members = [...value.members].sort();
  const id = value.id ?? `interaction:${members.join("&")}`;
  if (typeof id !== "string" || id.length === 0) {
    throw new TypeError("Coverage interaction ids must be non-empty strings.");
  }
  for (const name of [
    "minimumOccurrences",
    "minimumDatasets",
    "minimumRecipes",
    "minimumTiers"
  ]) {
    if (value[name] !== undefined) nonNegativeInteger(value[name], `${id} ${name}`);
  }
  return Object.freeze({
    id,
    members: Object.freeze(members),
    ...(value.minimumOccurrences === undefined
      ? {}
      : { minimumOccurrences: value.minimumOccurrences }),
    ...(value.minimumDatasets === undefined
      ? {}
      : { minimumDatasets: value.minimumDatasets }),
    ...(value.minimumRecipes === undefined
      ? {}
      : { minimumRecipes: value.minimumRecipes }),
    ...(value.minimumTiers === undefined
      ? {}
      : { minimumTiers: value.minimumTiers })
  });
}

function distributionWaiver(value, requirements) {
  if (
    value === null || typeof value !== "object" || Array.isArray(value) ||
    typeof value.requirementId !== "string" || value.requirementId.length === 0 ||
    typeof value.reason !== "string" || value.reason.trim().length === 0
  ) {
    throw new TypeError(
      "Distribution waivers require an exact requirementId and non-empty reason."
    );
  }
  const requirement = requirements.get(value.requirementId);
  if (requirement === undefined) {
    throw new Error(`Distribution waiver references unknown ${value.requirementId}.`);
  }
  const overrides = {};
  for (const [name, declaredName] of [
    ["minimumRecipes", "minimumRecipes"],
    ["minimumTiers", "minimumTiers"]
  ]) {
    if (value[name] === undefined) continue;
    nonNegativeInteger(value[name], `${value.requirementId} ${name}`);
    const declared = requirement[declaredName];
    if (declared === undefined || value[name] >= declared) {
      throw new RangeError(
        `${value.requirementId} ${name} waiver must lower an explicit hard minimum.`
      );
    }
    overrides[name] = value[name];
  }
  if (Object.keys(overrides).length === 0) {
    throw new TypeError("Distribution waivers must lower recipes or tiers.");
  }
  return Object.freeze({
    requirementId: value.requirementId,
    reason: value.reason.trim(),
    ...(requirement.minimumRecipes === undefined
      ? {}
      : { declaredMinimumRecipes: requirement.minimumRecipes }),
    ...(requirement.minimumTiers === undefined
      ? {}
      : { declaredMinimumTiers: requirement.minimumTiers }),
    ...overrides
  });
}

export function createScenarioCoverageLedger({
  publicInventory,
  requiredFeatures = [],
  rendererFeatures = DEFAULT_RENDERER_FEATURES,
  interactions = [],
  distributionWaivers = []
}) {
  if (
    publicInventory?.schemaVersion !== 1 ||
    !Array.isArray(publicInventory.publicActions) ||
    !Array.isArray(publicInventory.optionPaths)
  ) {
    throw new TypeError("A version 1 public option inventory is required.");
  }
  if (
    !Array.isArray(requiredFeatures) ||
    !Array.isArray(rendererFeatures) ||
    !Array.isArray(interactions) ||
    !Array.isArray(distributionWaivers)
  ) {
    throw new TypeError("Coverage features, interactions, and waivers must be arrays.");
  }
  const actions = publicInventory.publicActions.map(action => requiredFeature({
    id: `action:${action.name}`,
    kind: "action"
  }));
  const optionPaths = publicInventory.optionPaths
    .filter(option => option.required !== false)
    .map(option => requiredFeature({
      id: option.id,
      kind: option.topLevel ? "top-level-option" : "nested-option"
    }));
  const literalRequirements = [
    ...publicInventory.pathLiteralRequirements.map(requirement => requiredFeature({
      id: requirement.id,
      kind: "path-literal"
    })),
    ...publicInventory.familyLiteralRequirements.map(requirement => requiredFeature({
      id: requirement.id,
      kind: "family-literal"
    }))
  ];
  const actionLifecycles = [...new Set(publicInventory.publicActions
    .map(action => action.lifecycle)
    .filter(value => typeof value === "string" && value.length > 0))]
    .map(value => requiredFeature({
      id: `action-lifecycle:${slug(value)}`,
      kind: "action-lifecycle"
    }));
  const extras = [...rendererFeatures, ...requiredFeatures].map(requiredFeature);
  const requirements = [
    ...actions,
    ...optionPaths,
    ...literalRequirements,
    ...actionLifecycles,
    ...extras
  ];
  const ids = requirements.map(requirement => requirement.id);
  if (new Set(ids).size !== ids.length) {
    throw new Error("Coverage requirement ids must be unique.");
  }

  const knownEvidence = new Set(ids);
  for (const option of publicInventory.optionPaths) {
    if (option.required === false) continue;
    for (const valueKey of option.values) {
      knownEvidence.add(`option-value:${option.action}.${option.path}=${valueKey}`);
    }
  }
  let normalizedInteractions = interactions.map(value =>
    interactionRequirement(value, knownEvidence)
  );
  if (new Set(normalizedInteractions.map(value => value.id)).size !== normalizedInteractions.length) {
    throw new Error("Coverage interaction ids must be unique.");
  }
  if (normalizedInteractions.some(value => ids.includes(value.id))) {
    throw new Error("Coverage interaction ids must not collide with feature requirements.");
  }
  const requirementById = new Map([
    ...requirements.map(requirement => [requirement.id, requirement]),
    ...normalizedInteractions.map(interaction => [interaction.id, interaction])
  ]);
  const normalizedWaivers = distributionWaivers.map(value =>
    distributionWaiver(value, requirementById)
  );
  if (new Set(normalizedWaivers.map(value => value.requirementId)).size !==
    normalizedWaivers.length) {
    throw new Error("Distribution waivers must reference distinct requirements.");
  }
  const waiverById = new Map(normalizedWaivers.map(value => [value.requirementId, value]));
  const applyWaiver = requirement => {
    const waiver = waiverById.get(requirement.id);
    if (waiver === undefined) return requirement;
    return Object.freeze({
      ...requirement,
      ...(waiver.minimumRecipes === undefined
        ? {}
        : { minimumRecipes: waiver.minimumRecipes }),
      ...(waiver.minimumTiers === undefined
        ? {}
        : { minimumTiers: waiver.minimumTiers }),
      distributionWaiver: waiver
    });
  };
  const waivedRequirements = requirements.map(applyWaiver);
  normalizedInteractions = normalizedInteractions.map(applyWaiver);
  return Object.freeze({
    schemaVersion: 1,
    publicInventory,
    requirements: Object.freeze(waivedRequirements),
    interactions: Object.freeze(normalizedInteractions),
    distributionWaivers: Object.freeze(normalizedWaivers),
    knownEvidence: Object.freeze([...knownEvidence].sort())
  });
}

export function literalValueKey(value) {
  if (typeof value === "boolean") return `boolean:${value}`;
  if (typeof value === "string") return `string:${encodeURIComponent(value)}`;
  return undefined;
}

function resultMetadata(result) {
  const metadata = result.metadata ?? {};
  if (metadata === null || typeof metadata !== "object" || Array.isArray(metadata)) {
    throw new TypeError(`Scenario ${result.id} metadata must be an object.`);
  }
  return metadata;
}

function stringArray(value, label, fallback = []) {
  const resolved = value ?? fallback;
  if (!Array.isArray(resolved) || resolved.some(item =>
    typeof item !== "string" || item.length === 0
  )) {
    throw new TypeError(`${label} must contain non-empty strings.`);
  }
  return resolved;
}

function validateResults(results) {
  if (!Array.isArray(results)) throw new TypeError("Scenario results must be an array.");
  const ids = new Set();
  for (const result of results) {
    if (
      result === null || typeof result !== "object" ||
      typeof result.id !== "string" || result.id.length === 0 ||
      typeof result.dataset !== "string" || result.dataset.length === 0 ||
      typeof result.recipe !== "string" || result.recipe.length === 0
    ) {
      throw new TypeError("Scenario results require id, dataset, and recipe strings.");
    }
    if (ids.has(result.id)) throw new Error(`Scenario result repeats ${result.id}.`);
    ids.add(result.id);
    const metadata = resultMetadata(result);
    stringArray(metadata.activeFeatures, `${result.id} activeFeatures`);
    stringArray(result.effectiveFeatures, `${result.id} effectiveFeatures`);
    stringArray(metadata.dataOperations, `${result.id} dataOperations`);
    stringArray(result.renderers, `${result.id} renderers`);
    stringArray(result.operations, `${result.id} operations`);
    if (
      typeof metadata.chartFamily !== "string" || metadata.chartFamily.length === 0 ||
      !COMPLEXITY_TIERS.includes(metadata.complexity)
    ) {
      throw new TypeError(
        `Scenario ${result.id} requires a chartFamily and known complexity tier.`
      );
    }
    if (!Array.isArray(result.directTrace)) {
      throw new TypeError(`Scenario ${result.id} requires directTrace evidence.`);
    }
    for (const entry of result.directTrace) {
      if (
        entry === null || typeof entry !== "object" ||
        typeof entry.op !== "string" || entry.op.length === 0 ||
        entry.args === null || typeof entry.args !== "object" || Array.isArray(entry.args)
      ) {
        throw new TypeError(`Scenario ${result.id} has invalid directTrace evidence.`);
      }
    }
  }
}

function addObservation(observations, id) {
  observations.tokens.add(id);
}

function addPathValue(observations, option, valueKey) {
  const token = `option-value:${option.action}.${option.path}=${valueKey}`;
  observations.tokens.add(option.id);
  observations.tokens.add(token);
  const values = observations.pathValues.get(option.id) ?? new Set();
  values.add(valueKey);
  observations.pathValues.set(option.id, values);
  if (option.literalPolicy === "family-values") {
    observations.tokens.add(`literal-value:${option.literalFamily}=${valueKey}`);
  }
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

function nestedTraceValues(args, optionPath) {
  const presence = Object.freeze({ summarized: true });
  let values = [args];
  for (const segment of optionPath.split(".")) {
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
      if (
        !array && (
          Number.isInteger(count) && count > 0 ||
          typeof type === "string" && type.length > 0
        )
      ) next.push(presence);
    }
    values = next;
    if (values.length === 0) break;
  }
  return values;
}

function observeResult(result, ledger, maps) {
  const metadata = resultMetadata(result);
  const observations = { tokens: new Set(), pathValues: new Map(), rejected: [] };
  const directActions = new Set();
  for (const entry of result.directTrace) {
    const action = maps.actionByName.get(entry.op);
    if (action === undefined) continue;
    directActions.add(entry.op);
    addObservation(observations, `action:${entry.op}`);
    if (typeof action.lifecycle === "string" && action.lifecycle.length > 0) {
      addObservation(observations, `action-lifecycle:${slug(action.lifecycle)}`);
    }
    for (const option of maps.optionsByAction.get(entry.op) ?? []) {
      const values = option.topLevel
        ? (traceHasOption(entry, option) ? [entry.args[option.path]] : [])
        : nestedTraceValues(entry.args, option.path);
      if (values.length === 0) continue;
      addObservation(observations, option.id);
      for (const value of values) {
        const valueKey = literalValueKey(value);
        if (valueKey !== undefined && option.values.includes(valueKey)) {
          addPathValue(observations, option, valueKey);
        }
      }
    }
  }

  const claimedFeatures = new Set(metadata.activeFeatures ?? []);
  const effectiveFeatures = new Set(result.effectiveFeatures ?? []);
  for (const feature of claimedFeatures) {
    if (!effectiveFeatures.has(feature)) {
      observations.rejected.push(`${feature}:not-effective`);
      continue;
    }
    const option = maps.optionById.get(feature);
    if (option !== undefined) {
      observations.rejected.push(feature);
      continue;
    }
    const valueEvidence = maps.optionValueEvidence.get(feature);
    if (valueEvidence !== undefined) {
      observations.rejected.push(feature);
      continue;
    }
    if (maps.authoritativeEvidence.has(feature)) continue;
    if (maps.extraEvidence.has(feature)) {
      addObservation(observations, feature);
    } else {
      observations.rejected.push(feature);
    }
  }
  for (const feature of effectiveFeatures) {
    if (!claimedFeatures.has(feature)) {
      observations.rejected.push(`${feature}:not-claimed`);
    }
  }

  if (typeof metadata.chartFamily === "string" && metadata.chartFamily.length > 0) {
    const token = `chart-family:${metadata.chartFamily}`;
    if (maps.knownEvidence.has(token)) addObservation(observations, token);
    else observations.rejected.push(token);
  }
  for (const operation of metadata.dataOperations ?? []) {
    const token = `data-operation:${operation}`;
    if (maps.knownEvidence.has(token)) addObservation(observations, token);
    else observations.rejected.push(token);
  }
  for (const renderer of result.renderers ?? []) {
    const token = `renderer:${renderer}`;
    if (maps.knownEvidence.has(token)) addObservation(observations, token);
    else observations.rejected.push(token);
  }
  return Object.freeze({
    ...observations,
    directActions,
    metadata
  });
}

function coverageMaps(ledger) {
  const actionByName = new Map(ledger.publicInventory.publicActions.map(action =>
    [action.name, action]
  ));
  const optionById = new Map(ledger.publicInventory.optionPaths.map(option =>
    [option.id, option]
  ));
  const optionsByAction = new Map();
  const optionValueEvidence = new Map();
  for (const option of ledger.publicInventory.optionPaths) {
    const values = optionsByAction.get(option.action) ?? [];
    values.push(option);
    optionsByAction.set(option.action, values);
    for (const valueKey of option.values) {
      optionValueEvidence.set(
        `option-value:${option.action}.${option.path}=${valueKey}`,
        Object.freeze({ option, valueKey })
      );
    }
  }
  const automaticKinds = new Set([
    "action",
    "top-level-option",
    "nested-option",
    "path-literal",
    "family-literal",
    "action-lifecycle",
    "chart-family",
    "data-operation",
    "renderer"
  ]);
  const authoritativeKinds = new Set(["chart-family", "data-operation", "renderer"]);
  const extraEvidence = new Set(ledger.requirements
    .filter(requirement => !automaticKinds.has(requirement.kind))
    .map(requirement => requirement.id));
  const authoritativeEvidence = new Set(ledger.requirements
    .filter(requirement => authoritativeKinds.has(requirement.kind))
    .map(requirement => requirement.id));
  return {
    actionByName,
    optionById,
    optionsByAction,
    optionValueEvidence,
    extraEvidence,
    authoritativeEvidence,
    knownEvidence: new Set(ledger.knownEvidence)
  };
}

function blankStats(includeScenarioIds = false) {
  return {
    occurrences: 0,
    witnessScenarioIds: [],
    ...(includeScenarioIds ? { scenarioIds: [] } : {}),
    datasets: new Set(),
    recipes: new Set(),
    tiers: new Set()
  };
}

function recordStats(stats, result, metadata, tidyTuesday) {
  stats.occurrences += 1;
  if (stats.witnessScenarioIds.length < DEFAULT_SCENARIO_WITNESS_LIMIT) {
    stats.witnessScenarioIds.push(result.id);
  }
  stats.scenarioIds?.push(result.id);
  if (tidyTuesday) stats.datasets.add(result.dataset);
  stats.recipes.add(result.recipe);
  if (COMPLEXITY_TIERS.includes(metadata.complexity)) stats.tiers.add(metadata.complexity);
}

function minimumFor(requirement, name, policy) {
  if (name === "occurrences") {
    return requirement.minimumOccurrences ?? policy.minimumOccurrences;
  }
  if (name === "datasets") {
    return requirement.minimumDatasets ?? policy.minimumTidyTuesdayDatasets;
  }
  if (name === "recipes") return requirement.minimumRecipes;
  if (name === "tiers") return requirement.minimumTiers;
  throw new Error(`Unknown coverage minimum ${name}.`);
}

function summarizeRequirement(requirement, stats, policy) {
  const minimumOccurrences = minimumFor(requirement, "occurrences", policy);
  const minimumDatasets = minimumFor(requirement, "datasets", policy);
  const minimumRecipes = minimumFor(requirement, "recipes", policy);
  const minimumTiers = minimumFor(requirement, "tiers", policy);
  const occurrences = stats.occurrences;
  const datasetCount = stats.datasets.size;
  const recipeCount = stats.recipes.size;
  const tierCount = stats.tiers.size;
  return Object.freeze({
    ...requirement,
    occurrences,
    datasetCount,
    recipeCount,
    tierCount,
    witnessScenarioIds: Object.freeze([...stats.witnessScenarioIds]),
    ...(stats.scenarioIds === undefined
      ? {}
      : { scenarioIds: Object.freeze([...stats.scenarioIds]) }),
    datasetIds: sortedUnique(stats.datasets),
    recipeIds: sortedUnique(stats.recipes),
    tiers: sortedUnique(stats.tiers),
    minimumOccurrences,
    minimumDatasets,
    ...(minimumRecipes === undefined ? {} : { minimumRecipes }),
    ...(minimumTiers === undefined ? {} : { minimumTiers }),
    meetsMinimum: occurrences >= minimumOccurrences && datasetCount >= minimumDatasets,
    meetsDistributionMinimum:
      (minimumRecipes === undefined || recipeCount >= minimumRecipes) &&
      (minimumTiers === undefined || tierCount >= minimumTiers),
    meetsDistributionTarget:
      recipeCount >= policy.targetRecipesPerRequirement &&
      tierCount >= policy.targetTiersPerRequirement
  });
}

function worstFor(details) {
  if (details.length === 0) {
    return Object.freeze({ occurrences: 0, datasets: 0, recipes: 0, tiers: 0 });
  }
  return Object.freeze({
    occurrences: Math.min(...details.map(detail => detail.occurrences)),
    datasets: Math.min(...details.map(detail => detail.datasetCount)),
    recipes: Math.min(...details.map(detail => detail.recipeCount)),
    tiers: Math.min(...details.map(detail => detail.tierCount))
  });
}

function shareBreakdown(results, selector) {
  const counts = new Map();
  for (const result of results) {
    const value = selector(result);
    if (typeof value !== "string" || value.length === 0) continue;
    counts.set(value, (counts.get(value) ?? 0) + 1);
  }
  return Object.freeze([...counts]
    .map(([id, count]) => Object.freeze({
      id,
      count,
      share: results.length === 0 ? 0 : count / results.length
    }))
    .sort((left, right) => right.count - left.count || left.id.localeCompare(right.id)));
}

function corpusMap(datasetCorpus) {
  if (!Array.isArray(datasetCorpus?.datasets)) {
    throw new TypeError("Dataset corpus requires a datasets array.");
  }
  const entries = new Map();
  for (const dataset of datasetCorpus.datasets) {
    if (
      typeof dataset?.id !== "string" ||
      !["tidytuesday", "zoo"].includes(dataset.corpus) ||
      entries.has(dataset.id)
    ) {
      throw new TypeError("Dataset corpus entries require unique ids and known corpora.");
    }
    entries.set(dataset.id, dataset);
  }
  return entries;
}

function validateLineage(result, metadata, definition) {
  if (
    !Array.isArray(metadata.sourceDatasetIds) ||
    metadata.sourceDatasetIds.length !== 1 ||
    metadata.sourceDatasetIds[0] !== result.dataset
  ) {
    throw new Error(
      `Scenario ${result.id} sourceDatasetIds must be exactly [${result.dataset}].`
    );
  }
  const provenance = metadata.provenance;
  const indexes = provenance?.sourceRowIndexes;
  if (
    provenance === null || typeof provenance !== "object" || Array.isArray(provenance) ||
    provenance.sourceDataset !== result.dataset ||
    provenance.sourceRowIndexBasis !== "zero-based-data-row-in-pinned-csv" ||
    provenance.indexEncoding !== SOURCE_INDEX_ENCODING ||
    !Number.isInteger(provenance.sourceRowCount) || provenance.sourceRowCount <= 0 ||
    provenance.sourceRowCount > definition.rows ||
    !Number.isInteger(provenance.minimumSourceRow) ||
    !Number.isInteger(provenance.maximumSourceRow) ||
    provenance.minimumSourceRow < 0 ||
    provenance.maximumSourceRow >= definition.rows ||
    provenance.minimumSourceRow > provenance.maximumSourceRow ||
    provenance.sourceRowCount >
      provenance.maximumSourceRow - provenance.minimumSourceRow + 1 ||
    !/^[a-f0-9]{64}$/u.test(provenance.sourceSelectionSha256)
  ) {
    throw new Error(`Scenario ${result.id} has invalid source-row lineage.`);
  }
  if (indexes !== undefined) {
    if (
      !Array.isArray(indexes) || indexes.length === 0 ||
      indexes.length > MAX_EXPLICIT_SOURCE_ROW_INDEXES ||
      indexes.length !== provenance.sourceRowCount ||
      indexes[0] !== provenance.minimumSourceRow ||
      indexes.at(-1) !== provenance.maximumSourceRow ||
      indexes.some((index, position) =>
        !Number.isInteger(index) || index < 0 || index >= definition.rows ||
        (position > 0 && index <= indexes[position - 1])
      )
    ) {
      throw new Error(`Scenario ${result.id} has invalid source-row lineage (explicit indexes).`);
    }
    const digest = createHash("sha256").update(indexes.join(",")).digest("hex");
    if (provenance.sourceSelectionSha256 !== digest) {
      throw new Error(`Scenario ${result.id} has an invalid source selection digest.`);
    }
  }
  const bindings = provenance.fieldBindings;
  if (
    bindings === null || typeof bindings !== "object" || Array.isArray(bindings) ||
    Object.keys(bindings).length === 0 ||
    Object.values(bindings).some(field =>
      typeof field !== "string" || !Object.hasOwn(definition.fields, field)
    )
  ) {
    throw new Error(`Scenario ${result.id} has invalid source field bindings.`);
  }
  const transformations = provenance.transformations;
  if (
    !Array.isArray(transformations) || transformations.length === 0 ||
    transformations.some(value =>
      value === null || typeof value !== "object" ||
      typeof value.op !== "string" || value.op.length === 0
    )
  ) {
    throw new Error(`Scenario ${result.id} has invalid provenance transformations.`);
  }
  const provenanceOperations = transformations.map(value => value.op);
  if (
    provenanceOperations.length !== metadata.dataOperations.length ||
    provenanceOperations.some((value, index) => value !== metadata.dataOperations[index])
  ) {
    throw new Error(`Scenario ${result.id} data operations drift from provenance.`);
  }
  return Object.freeze({
    dataset: result.dataset,
    lineageId: `${result.dataset}:${provenance.sourceSelectionSha256}`,
    sourceRowCount: provenance.sourceRowCount,
    minimumSourceRow: provenance.minimumSourceRow,
    maximumSourceRow: provenance.maximumSourceRow,
    sourceSelectionSha256: provenance.sourceSelectionSha256,
    indexEncoding: SOURCE_INDEX_ENCODING,
    explicitSourceRowIndexes: indexes !== undefined,
    fieldBindings: Object.freeze({ ...bindings }),
    transformations: Object.freeze([...provenanceOperations])
  });
}

export function summarizeScenarioFeatureCoverage({
  results,
  failures = [],
  datasetCorpus,
  ledger,
  policy: policyOverrides = {},
  includeScenarioIds = false
}) {
  validateResults(results);
  if (!Array.isArray(failures)) throw new TypeError("Scenario failures must be an array.");
  if (ledger?.schemaVersion !== 1) throw new TypeError("A version 1 coverage ledger is required.");
  if (typeof includeScenarioIds !== "boolean") {
    throw new TypeError("includeScenarioIds must be boolean.");
  }
  const policy = scenarioCoveragePolicy(policyOverrides);
  const datasets = corpusMap(datasetCorpus);
  const tidyDefinitions = [...datasets.values()].filter(dataset =>
    dataset.corpus === "tidytuesday"
  );
  const maps = coverageMaps(ledger);
  const requirementStats = new Map(ledger.requirements.map(requirement =>
    [requirement.id, blankStats(includeScenarioIds)]
  ));
  const interactionStats = new Map(ledger.interactions.map(interaction =>
    [interaction.id, blankStats(includeScenarioIds)]
  ));
  const transitiveActionStats = new Map(ledger.publicInventory.publicActions.map(action =>
    [action.name, blankStats(includeScenarioIds)]
  ));
  const diversityStats = new Map(ledger.publicInventory.pathDiversityRequirements.map(value =>
    [value.id, new Map()]
  ));
  const rejectedEvidence = [];
  const lineageByResult = new Map();

  for (const result of results) {
    const definition = datasets.get(result.dataset);
    if (definition === undefined) throw new Error(`Unknown scenario dataset ${result.dataset}.`);
    const tidyTuesday = definition.corpus === "tidytuesday";
    const observed = observeResult(result, ledger, maps);
    const lineage = tidyTuesday
      ? validateLineage(result, observed.metadata, definition)
      : undefined;
    if (lineage !== undefined) lineageByResult.set(result.id, lineage);
    rejectedEvidence.push(...observed.rejected.map(feature => `${result.id}:${feature}`));
    for (const token of observed.tokens) {
      const stats = requirementStats.get(token);
      if (stats !== undefined) recordStats(stats, result, observed.metadata, tidyTuesday);
    }
    for (const action of new Set(result.operations ?? [])) {
      const stats = transitiveActionStats.get(action);
      if (stats !== undefined) recordStats(stats, result, observed.metadata, tidyTuesday);
    }
    for (const interaction of ledger.interactions) {
      if (interaction.members.every(member => observed.tokens.has(member))) {
        recordStats(
          interactionStats.get(interaction.id),
          result,
          observed.metadata,
          tidyTuesday
        );
      }
    }
    for (const diversity of ledger.publicInventory.pathDiversityRequirements) {
      const values = observed.pathValues.get(diversity.optionPath);
      if (values === undefined) continue;
      const byValue = diversityStats.get(diversity.id);
      for (const valueKey of values) {
        const stats = byValue.get(valueKey) ?? blankStats(includeScenarioIds);
        recordStats(stats, result, observed.metadata, tidyTuesday);
        byValue.set(valueKey, stats);
      }
    }
  }

  const requirementDetails = ledger.requirements.map(requirement =>
    summarizeRequirement(requirement, requirementStats.get(requirement.id), policy)
  );
  const directActionDetails = requirementDetails.filter(requirement =>
    requirement.kind === "action"
  );
  const transitiveActionDetails = ledger.publicInventory.publicActions.map(action =>
    summarizeRequirement(
      { id: `action:${action.name}`, kind: "transitive-action" },
      transitiveActionStats.get(action.name),
      policy
    )
  );
  const interactionDetails = ledger.interactions.map(interaction =>
    summarizeRequirement(interaction, interactionStats.get(interaction.id), policy)
  );
  const diversityDetails = ledger.publicInventory.pathDiversityRequirements.map(requirement => {
    const values = [...diversityStats.get(requirement.id)].map(([valueKey, stats]) => {
      const detail = summarizeRequirement({ id: valueKey }, stats, policy);
      return Object.freeze({ valueKey, ...detail });
    });
    const qualifyingValues = values.filter(value => value.meetsMinimum);
    return Object.freeze({
      ...requirement,
      observedDistinctValues: values.length,
      qualifyingDistinctValues: qualifyingValues.length,
      values: Object.freeze(values),
      meetsMinimum: qualifyingValues.length >= requirement.minimumDistinctValues
    });
  });

  const byDataset = new Map(tidyDefinitions.map(dataset => [dataset.id, 0]));
  for (const result of results) {
    if (byDataset.has(result.dataset)) {
      byDataset.set(result.dataset, byDataset.get(result.dataset) + 1);
    }
  }
  const datasetDetails = [...byDataset]
    .map(([id, count]) => Object.freeze({ id, count }))
    .sort((left, right) => left.id.localeCompare(right.id));
  const successfulTidyIds = datasetDetails.filter(dataset => dataset.count > 0).map(dataset => dataset.id);

  const tierDetails = COMPLEXITY_TIERS.map(tier => {
    const matching = results.filter(result => resultMetadata(result).complexity === tier);
    const datasetIds = sortedUnique(matching
      .filter(result => datasets.get(result.dataset).corpus === "tidytuesday")
      .map(result => result.dataset));
    const share = results.length === 0 ? 0 : matching.length / results.length;
    const band = policy.complexityBands[tier];
    return Object.freeze({
      tier,
      count: matching.length,
      share,
      datasetCount: datasetIds.length,
      datasetIds,
      band,
      meetsMinimum: datasetIds.length >= policy.minimumTierDatasets &&
        share >= band.minimum && share <= band.maximum
    });
  });
  const recipes = shareBreakdown(results, result => result.recipe);
  const chartFamilies = shareBreakdown(results, result => resultMetadata(result).chartFamily);
  const nonTidyResults = results.filter(result =>
    datasets.get(result.dataset).corpus !== "tidytuesday"
  );
  const lineageSelections = new Map();
  for (const lineage of lineageByResult.values()) {
    const key = lineage.lineageId;
    const current = lineageSelections.get(key) ?? {
      lineageId: lineage.lineageId,
      dataset: lineage.dataset,
      sourceRowCount: lineage.sourceRowCount,
      minimumSourceRow: lineage.minimumSourceRow,
      maximumSourceRow: lineage.maximumSourceRow,
      sourceSelectionSha256: lineage.sourceSelectionSha256,
      indexEncoding: lineage.indexEncoding,
      explicitScenarioCount: 0,
      scenarioCount: 0,
      views: new Map()
    };
    if (
      current.sourceRowCount !== lineage.sourceRowCount ||
      current.minimumSourceRow !== lineage.minimumSourceRow ||
      current.maximumSourceRow !== lineage.maximumSourceRow ||
      current.indexEncoding !== lineage.indexEncoding
    ) {
      throw new Error(`Lineage ${lineage.lineageId} has inconsistent compact bounds.`);
    }
    current.scenarioCount += 1;
    if (lineage.explicitSourceRowIndexes) current.explicitScenarioCount += 1;
    const viewKey = JSON.stringify({
      fieldBindings: Object.entries(lineage.fieldBindings).sort(([left], [right]) =>
        left.localeCompare(right)
      ),
      transformations: lineage.transformations
    });
    const view = current.views.get(viewKey) ?? {
      fieldBindings: lineage.fieldBindings,
      transformations: lineage.transformations,
      scenarioCount: 0
    };
    view.scenarioCount += 1;
    current.views.set(viewKey, view);
    lineageSelections.set(key, current);
  }
  const compactLineage = Object.freeze([...lineageSelections.values()]
    .map(value => Object.freeze({
      lineageId: value.lineageId,
      dataset: value.dataset,
      sourceRowCount: value.sourceRowCount,
      minimumSourceRow: value.minimumSourceRow,
      maximumSourceRow: value.maximumSourceRow,
      sourceSelectionSha256: value.sourceSelectionSha256,
      indexEncoding: value.indexEncoding,
      scenarioCount: value.scenarioCount,
      explicitScenarioCount: value.explicitScenarioCount,
      views: Object.freeze([...value.views.values()].map(view => Object.freeze({
        fieldBindings: view.fieldBindings,
        transformations: view.transformations,
        scenarioCount: view.scenarioCount
      })))
    }))
    .sort((left, right) =>
      left.dataset.localeCompare(right.dataset) ||
      left.sourceSelectionSha256.localeCompare(right.sourceSelectionSha256)
    ));

  const missing = Object.freeze({
    actions: sortedUnique(requirementDetails
      .filter(detail => detail.kind === "action" && !detail.meetsMinimum)
      .map(detail => detail.id)),
    topLevelOptions: sortedUnique(requirementDetails
      .filter(detail => detail.kind === "top-level-option" && !detail.meetsMinimum)
      .map(detail => detail.id)),
    nestedOptions: sortedUnique(requirementDetails
      .filter(detail => detail.kind === "nested-option" && !detail.meetsMinimum)
      .map(detail => detail.id)),
    literals: sortedUnique(requirementDetails
      .filter(detail => ["path-literal", "family-literal"].includes(detail.kind) &&
        !detail.meetsMinimum)
      .map(detail => detail.id)),
    features: sortedUnique(requirementDetails
      .filter(detail => ![
        "action", "top-level-option", "nested-option", "path-literal", "family-literal"
      ].includes(detail.kind) && !detail.meetsMinimum)
      .map(detail => detail.id)),
    interactions: sortedUnique(interactionDetails
      .filter(detail => !detail.meetsMinimum)
      .map(detail => detail.id)),
    diversity: sortedUnique(diversityDetails
      .filter(detail => !detail.meetsMinimum)
      .map(detail => detail.id)),
    hardDistribution: sortedUnique([
      ...requirementDetails,
      ...interactionDetails
    ].filter(detail => !detail.meetsDistributionMinimum).map(detail => detail.id))
  });
  const violations = [];
  if (results.length < policy.minimumSuccessfulScenarios) {
    violations.push(`successful scenarios ${results.length}/${policy.minimumSuccessfulScenarios}`);
  }
  if (failures.length > policy.maximumFailures) {
    violations.push(`scenario failures ${failures.length}/${policy.maximumFailures}`);
  }
  if (tidyDefinitions.length !== policy.exactTidyTuesdayDatasets) {
    violations.push(
      `manifest TidyTuesday datasets ${tidyDefinitions.length}/${policy.exactTidyTuesdayDatasets}`
    );
  }
  if (successfulTidyIds.length !== policy.exactTidyTuesdayDatasets) {
    violations.push(
      `successful TidyTuesday datasets ${successfulTidyIds.length}/${policy.exactTidyTuesdayDatasets}`
    );
  }
  if (nonTidyResults.length > 0) {
    violations.push(`non-TidyTuesday successful scenarios ${nonTidyResults.length}/0`);
  }
  const underusedDatasets = datasetDetails.filter(dataset =>
    dataset.count < policy.minimumScenariosPerDataset
  );
  if (underusedDatasets.length > 0) {
    violations.push(`datasets below ${policy.minimumScenariosPerDataset}: ${underusedDatasets.length}`);
  }
  for (const [label, values] of Object.entries(missing)) {
    if (values.length > 0) violations.push(`missing ${label}: ${values.length}`);
  }
  if (tierDetails.some(tier => !tier.meetsMinimum)) {
    violations.push(`complexity tiers outside coverage bands: ${tierDetails
      .filter(tier => !tier.meetsMinimum).map(tier => tier.tier).join(", ")}`);
  }
  if (recipes.some(recipe => recipe.share > policy.maximumRecipeShare)) {
    violations.push("recipe concentration exceeds policy");
  }
  if (chartFamilies.some(family => family.share > policy.maximumChartFamilyShare)) {
    violations.push("chart-family concentration exceeds policy");
  }
  if (policy.strictFeatureInventory && rejectedEvidence.length > 0) {
    violations.push(`rejected or untracked feature evidence: ${rejectedEvidence.length}`);
  }

  const kinds = sortedUnique(requirementDetails.map(detail => detail.kind));
  const worstByKind = Object.freeze(Object.fromEntries(kinds.map(kind => [
    kind,
    worstFor(requirementDetails.filter(detail => detail.kind === kind))
  ])));
  return Object.freeze({
    schemaVersion: 1,
    passed: violations.length === 0,
    policy,
    inventory: Object.freeze({
      ...ledger.publicInventory.counts,
      requirements: ledger.requirements.length,
      interactions: ledger.interactions.length,
      distributionWaivers: ledger.distributionWaivers?.length ?? 0,
      optionPathExclusions: ledger.publicInventory.excludedOptionPaths ?? Object.freeze([])
    }),
    execution: Object.freeze({
      successfulScenarios: results.length,
      failures: failures.length,
      tidyTuesdayDatasets: successfulTidyIds.length,
      nonTidyTuesdayScenarios: nonTidyResults.length,
      minimumDatasetScenarios: datasetDetails.length === 0
        ? 0
        : Math.min(...datasetDetails.map(dataset => dataset.count)),
      datasets: Object.freeze(datasetDetails),
      tiers: Object.freeze(tierDetails),
      recipes,
      chartFamilies,
      lineage: Object.freeze({
        validScenarios: lineageByResult.size,
        uniqueSelections: compactLineage.length,
        minimumSourceRows: compactLineage.length === 0
          ? 0
          : Math.min(...compactLineage.map(value => value.sourceRowCount)),
        maximumSourceRows: compactLineage.length === 0
          ? 0
          : Math.max(...compactLineage.map(value => value.sourceRowCount)),
        selections: compactLineage
      })
    }),
    requirements: Object.freeze(requirementDetails),
    actionCoverage: Object.freeze({
      publicActions: ledger.publicInventory.publicActions.length,
      direct: Object.freeze({
        covered: directActionDetails.filter(detail => detail.occurrences > 0).length,
        meetingMinimum: directActionDetails.filter(detail => detail.meetsMinimum).length,
        details: Object.freeze(directActionDetails)
      }),
      transitive: Object.freeze({
        covered: transitiveActionDetails.filter(detail => detail.occurrences > 0).length,
        meetingMinimum: transitiveActionDetails.filter(detail => detail.meetsMinimum).length,
        details: Object.freeze(transitiveActionDetails)
      })
    }),
    interactions: Object.freeze(interactionDetails),
    literalDiversity: Object.freeze(diversityDetails),
    missing,
    worst: Object.freeze({
      byKind: worstByKind,
      interactions: worstFor(interactionDetails)
    }),
    distributionTargets: Object.freeze({
      requirementsBelowRecipeTarget: requirementDetails.filter(detail =>
        detail.recipeCount < policy.targetRecipesPerRequirement
      ).length,
      requirementsBelowTierTarget: requirementDetails.filter(detail =>
        detail.tierCount < policy.targetTiersPerRequirement
      ).length,
      interactionsBelowRecipeTarget: interactionDetails.filter(detail =>
        detail.recipeCount < policy.targetRecipesPerRequirement
      ).length,
      interactionsBelowTierTarget: interactionDetails.filter(detail =>
        detail.tierCount < policy.targetTiersPerRequirement
      ).length,
      hardMinimumFailures: missing.hardDistribution.length,
      waivers: ledger.distributionWaivers ?? Object.freeze([])
    }),
    rejectedEvidence: sortedUnique(rejectedEvidence),
    violations: Object.freeze(violations)
  });
}

export function assertScenarioFeatureCoverage(report) {
  if (report?.passed !== true) {
    const violations = Array.isArray(report?.violations)
      ? report.violations
      : ["invalid coverage report"];
    throw new Error(`Scenario feature coverage failed:\n${violations.join("\n")}`);
  }
  return report;
}

function requirementDeficit(detail, policy) {
  const missingOccurrences = Math.max(0, detail.minimumOccurrences - detail.occurrences);
  const missingDatasets = Math.max(0, detail.minimumDatasets - detail.datasetCount);
  const missingRecipes = detail.minimumRecipes === undefined
    ? 0
    : Math.max(0, detail.minimumRecipes - detail.recipeCount);
  const missingTiers = detail.minimumTiers === undefined
    ? 0
    : Math.max(0, detail.minimumTiers - detail.tierCount);
  const targetRecipeGap = Math.max(
    0,
    policy.targetRecipesPerRequirement - detail.recipeCount
  );
  const targetTierGap = Math.max(0, policy.targetTiersPerRequirement - detail.tierCount);
  if (
    missingOccurrences === 0 && missingDatasets === 0 &&
    missingRecipes === 0 && missingTiers === 0 &&
    targetRecipeGap === 0 && targetTierGap === 0
  ) {
    return undefined;
  }
  return Object.freeze({
    id: detail.id,
    kind: detail.kind ?? "interaction",
    missingOccurrences,
    missingDatasets,
    missingRecipes,
    missingTiers,
    targetRecipeGap,
    targetTierGap,
    hardSatisfied:
      missingOccurrences === 0 && missingDatasets === 0 &&
      missingRecipes === 0 && missingTiers === 0
  });
}

export function scenarioFeatureCoverageDeficits(report) {
  if (
    report?.schemaVersion !== 1 || !Array.isArray(report.requirements) ||
    !Array.isArray(report.interactions) || !Array.isArray(report.literalDiversity) ||
    !Array.isArray(report.execution?.datasets) || !Array.isArray(report.execution?.tiers)
  ) {
    throw new TypeError("A version 1 scenario feature coverage report is required.");
  }
  const requirementGaps = report.requirements
    .map(detail => requirementDeficit(detail, report.policy))
    .filter(value => value !== undefined);
  const interactionGaps = report.interactions
    .map(detail => requirementDeficit(detail, report.policy))
    .filter(value => value !== undefined);
  const datasetGaps = report.execution.datasets
    .map(dataset => Object.freeze({
      id: dataset.id,
      missingScenarios: Math.max(
        0,
        report.policy.minimumScenariosPerDataset - dataset.count
      )
    }))
    .filter(dataset => dataset.missingScenarios > 0);
  const tierGaps = report.execution.tiers
    .map(tier => Object.freeze({
      tier: tier.tier,
      missingDatasets: Math.max(
        0,
        report.policy.minimumTierDatasets - tier.datasetCount
      ),
      belowMinimumShare: tier.share < tier.band.minimum,
      aboveMaximumShare: tier.share > tier.band.maximum
    }))
    .filter(tier =>
      tier.missingDatasets > 0 || tier.belowMinimumShare || tier.aboveMaximumShare
    );
  const diversityGaps = report.literalDiversity
    .filter(detail => !detail.meetsMinimum)
    .map(detail => Object.freeze({
      id: detail.id,
      missingQualifyingValues: Math.max(
        0,
        detail.minimumDistinctValues - detail.qualifyingDistinctValues
      )
    }));
  return Object.freeze({
    successfulScenarioGap: Math.max(
      0,
      report.policy.minimumSuccessfulScenarios - report.execution.successfulScenarios
    ),
    failureExcess: Math.max(0, report.execution.failures - report.policy.maximumFailures),
    tidyTuesdayDatasetGap: Math.max(
      0,
      report.policy.exactTidyTuesdayDatasets - report.execution.tidyTuesdayDatasets
    ),
    requirements: Object.freeze(requirementGaps),
    interactions: Object.freeze(interactionGaps),
    datasets: Object.freeze(datasetGaps),
    tiers: Object.freeze(tierGaps),
    diversity: Object.freeze(diversityGaps),
    distributionWaivers: report.distributionTargets.waivers
  });
}
