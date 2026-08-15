import { fork } from "node:child_process";
import { createHash } from "node:crypto";
import { performance } from "node:perf_hooks";
import { fileURLToPath } from "node:url";

const childPath = fileURLToPath(new URL(
  "./run-realistic-scenario-generation-child.js",
  import.meta.url
));

const MAX_DIAGNOSTIC_OUTPUT = 8_192;
const GENERATION_CHILD_OLD_SPACE_MIB = 288;
const DEFAULT_GENERATION_TIMEOUT = 30 * 60_000;
const CHILD_TERMINATION_GRACE_MS = 5_000;
const CHILD_FAILURE_RESOURCES = Symbol("realisticGenerationChildFailureResources");

function deepFreeze(value, visited = new Set()) {
  if (value === null || typeof value !== "object" || visited.has(value)) return value;
  visited.add(value);
  for (const child of Object.values(value)) deepFreeze(child, visited);
  return Object.freeze(value);
}

function childError(value, fallback = "Realistic generation child failed.") {
  const error = new Error(value?.message ?? fallback);
  error.name = value?.name ?? "ScenarioGenerationError";
  if (value?.stack !== undefined) error.stack = value.stack;
  if (value?.diagnostics !== undefined) {
    error.diagnostics = deepFreeze(value.diagnostics);
  }
  return error;
}

function appendDiagnostic(current, chunk) {
  const value = `${current}${chunk}`;
  return value.length <= MAX_DIAGNOSTIC_OUTPUT
    ? value
    : value.slice(value.length - MAX_DIAGNOSTIC_OUTPUT);
}

function stableWireValue(value) {
  if (Array.isArray(value)) return `[${value.map(stableWireValue).join(",")}]`;
  if (value !== null && typeof value === "object") {
    return `{${Object.entries(value).map(([key, child]) =>
      `${JSON.stringify(key)}:${stableWireValue(child)}`
    ).join(",")}}`;
  }
  return JSON.stringify(value);
}

function wireDigest(value) {
  return createHash("sha256").update(stableWireValue(value)).digest("hex");
}

function record(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function resourceSnapshot(value) {
  return record(value) && Number.isFinite(value.rssBytes) && value.rssBytes >= 0 &&
    Number.isFinite(value.maximumRssBytes) &&
    value.maximumRssBytes >= value.rssBytes;
}

function nonnegativeCount(value) {
  return Number.isSafeInteger(value) && value >= 0;
}

function uniqueStrings(values, allowed) {
  return Array.isArray(values) && values.every(value =>
    typeof value === "string" && value.length > 0 &&
    (allowed === undefined || allowed.has(value))
  ) && new Set(values).size === values.length;
}

function uniqueEntries(values) {
  return Array.isArray(values) && values.every(value =>
    Array.isArray(value) && value.length === 2 &&
    typeof value[0] === "string" && value[0].length > 0
  ) && new Set(values.map(value => value[0])).size === values.length;
}

function invalidPayload(stage) {
  return new TypeError(`Realistic generation ${stage} child response is invalid.`);
}

function planPayload(plan) {
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

function assertPlan(plan) {
  if (!record(plan)) throw invalidPayload("plan");
  const payload = planPayload(plan);
  if (
    payload.schemaVersion !== 1 ||
    !uniqueStrings(payload.recipeIds) ||
    !uniqueStrings(payload.datasets) || payload.datasets.length !== 50 ||
    !uniqueStrings(payload.activeDatasets, new Set(payload.datasets)) ||
    payload.activeDatasets.length === 0 ||
    payload.activeDatasets.length > payload.datasets.length ||
    payload.activeDatasets.some((dataset, index) => dataset !== payload.datasets[index]) ||
    payload.chartsPerDataset !== 72 ||
    !nonnegativeCount(payload.selectedDescriptorCount) ||
      payload.selectedDescriptorCount === 0 ||
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
  ) throw invalidPayload("plan");
}

function assertRequirementFragment(fragment, plan, dataset) {
  const recipes = new Set(plan.recipeIds);
  if (
    !record(fragment) || fragment.schemaVersion !== 1 ||
    fragment.planId !== plan.planId || fragment.dataset !== dataset ||
    !uniqueStrings(fragment.eligibleRecipes, recipes) ||
    !Array.isArray(fragment.factorRequirements) ||
    new Set(fragment.factorRequirements.map(value => value?.usageKey)).size !==
      fragment.factorRequirements.length ||
    fragment.factorRequirements.some(value =>
      !record(value) || typeof value.usageKey !== "string" || value.usageKey.length === 0 ||
      !recipes.has(value.recipe) || typeof value.factor !== "string" ||
      value.factor.length === 0 || value.usageKey !==
        `${value.recipe}\0${value.factor}\0${stableWireValue(value.value)}`
    ) ||
    !Array.isArray(fragment.scheduleEligibility) ||
    new Set(fragment.scheduleEligibility.map(value =>
      `${value?.recipe}\0${value?.variantId}`
    )).size !== fragment.scheduleEligibility.length ||
    fragment.scheduleEligibility.some(value =>
      !record(value) || !recipes.has(value.recipe) ||
      typeof value.variantId !== "string" || value.variantId.length === 0
    )
  ) throw invalidPayload(`requirements for "${dataset}"`);
}

function manifestPayload(manifest) {
  return {
    schemaVersion: manifest.schemaVersion,
    planId: manifest.planId,
    factorRequirements: manifest.factorRequirements,
    eligibleRecipeDatasets: manifest.eligibleRecipeDatasets,
    scheduleRequirements: manifest.scheduleRequirements
  };
}

function assertManifest(manifest, plan) {
  if (!record(manifest)) throw invalidPayload("merge");
  const payload = manifestPayload(manifest);
  const recipes = new Set(plan.recipeIds);
  const datasets = new Set(plan.activeDatasets);
  if (
    payload.schemaVersion !== 1 || payload.planId !== plan.planId ||
    !Array.isArray(payload.factorRequirements) ||
    new Set(payload.factorRequirements.map(value => value?.usageKey)).size !==
      payload.factorRequirements.length ||
    payload.factorRequirements.some(value =>
      !record(value) || typeof value.usageKey !== "string" || value.usageKey.length === 0 ||
      !recipes.has(value.recipe) || typeof value.factor !== "string" ||
      value.factor.length === 0 || !uniqueStrings(value.eligibleDatasets, datasets)
    ) ||
    !uniqueEntries(payload.eligibleRecipeDatasets) ||
    payload.eligibleRecipeDatasets.length !== plan.recipeIds.length ||
    payload.eligibleRecipeDatasets.some(([recipe, values]) =>
      !recipes.has(recipe) || !uniqueStrings(values, datasets)
    ) ||
    !Array.isArray(payload.scheduleRequirements) ||
    new Set(payload.scheduleRequirements.map(value => value?.key)).size !==
      payload.scheduleRequirements.length ||
    payload.scheduleRequirements.some(value =>
      !record(value) || typeof value.key !== "string" || value.key.length === 0 ||
      !recipes.has(value.recipe) || typeof value.factor !== "string" ||
      value.factor.length === 0 || typeof value.variantId !== "string" ||
      value.variantId.length === 0 || !nonnegativeCount(value.requiredCount) ||
      !nonnegativeCount(value.minimumDatasets) || !nonnegativeCount(value.order) ||
      !uniqueStrings(value.eligibleDatasets, datasets)
    ) ||
    typeof manifest.manifestId !== "string" ||
    manifest.manifestId !== wireDigest(payload)
  ) throw invalidPayload("merge");
}

function assertFragmentManifestConsistency(fragments, manifest, plan) {
  const factorByKey = new Map(manifest.factorRequirements.map(value => [
    value.usageKey,
    value
  ]));
  const scheduleByKey = new Map(manifest.scheduleRequirements.map(value => [
    `${value.recipe}\0${value.variantId}`,
    value
  ]));
  const recipeDatasets = new Map(plan.recipeIds.map(recipe => [recipe, []]));
  const factorDatasets = new Map();
  const scheduleDatasets = new Map();
  for (const fragment of fragments) {
    for (const recipe of fragment.eligibleRecipes) {
      recipeDatasets.get(recipe).push(fragment.dataset);
    }
    for (const value of fragment.factorRequirements) {
      const canonical = factorByKey.get(value.usageKey);
      if (
        canonical === undefined || canonical.recipe !== value.recipe ||
        canonical.factor !== value.factor || !sameWireValue(canonical.value, value.value)
      ) throw invalidPayload("factor requirement merge");
      const datasets = factorDatasets.get(value.usageKey) ?? [];
      datasets.push(fragment.dataset);
      factorDatasets.set(value.usageKey, datasets);
    }
    for (const value of fragment.scheduleEligibility) {
      const key = `${value.recipe}\0${value.variantId}`;
      if (!scheduleByKey.has(key)) throw invalidPayload("schedule requirement merge");
      const datasets = scheduleDatasets.get(key) ?? [];
      datasets.push(fragment.dataset);
      scheduleDatasets.set(key, datasets);
    }
  }
  if (
    manifest.eligibleRecipeDatasets.some(([recipe, datasets]) =>
      !sameWireValue(datasets, recipeDatasets.get(recipe))
    ) ||
    manifest.factorRequirements.some(value =>
      !sameWireValue(value.eligibleDatasets, factorDatasets.get(value.usageKey) ?? [])
    ) ||
    manifest.scheduleRequirements.some(value =>
      !sameWireValue(
        value.eligibleDatasets,
        scheduleDatasets.get(`${value.recipe}\0${value.variantId}`) ?? []
      )
    )
  ) throw invalidPayload("requirement merge");
}

const STATE_ARRAY_FIELDS = Object.freeze([
  "fingerprints",
  "recipeCounts",
  "recipeDatasets",
  "baselineFactorCases",
  "factorValueCounts",
  "factorValueDatasets",
  "factorPairs",
  "factorCaseCounts",
  "scheduleFulfillment",
  "rejections",
  "duplicates",
  "skips"
]);

function statePayload(state) {
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

function validCountEntries(values, allowed) {
  return uniqueEntries(values) && values.every(([key, value]) =>
    (allowed === undefined || allowed.has(key)) && nonnegativeCount(value)
  );
}

function validSetEntries(values, allowedKeys, allowedValues) {
  return uniqueEntries(values) && values.every(([key, entries]) =>
    (allowedKeys === undefined || allowedKeys.has(key)) &&
    uniqueStrings(entries, allowedValues)
  );
}

function assertState(state, plan, manifest, expectedDatasetIndex) {
  if (!record(state)) throw invalidPayload("state");
  const payload = statePayload(state);
  const recipes = new Set(plan.recipeIds);
  const datasets = new Set(plan.activeDatasets);
  const schedules = new Map(manifest.scheduleRequirements.map(value => [value.key, value]));
  const accepted = expectedDatasetIndex * plan.chartsPerDataset;
  if (
    payload.schemaVersion !== 1 || payload.planId !== plan.planId ||
    payload.manifestId !== manifest.manifestId ||
    payload.nextDatasetIndex !== expectedDatasetIndex ||
    !nonnegativeCount(payload.candidateOrdinal) ||
    STATE_ARRAY_FIELDS.some(field => !Array.isArray(payload[field])) ||
    !uniqueStrings(payload.fingerprints) ||
    payload.fingerprints.some(value => !/^[a-f0-9]{64}$/u.test(value)) ||
    payload.fingerprints.length !== accepted ||
    !validCountEntries(payload.recipeCounts, recipes) ||
    payload.recipeCounts.reduce((sum, [, count]) => sum + count, 0) !== accepted ||
    !validSetEntries(payload.recipeDatasets, recipes, datasets) ||
    !uniqueStrings(payload.baselineFactorCases, recipes) ||
    !validCountEntries(payload.factorValueCounts) ||
    !validSetEntries(payload.factorValueDatasets, undefined, datasets) ||
    !uniqueStrings(payload.factorPairs) || !validCountEntries(payload.factorCaseCounts) ||
    !uniqueEntries(payload.scheduleFulfillment) ||
    payload.scheduleFulfillment.some(([key, value]) => {
      const schedule = schedules.get(key);
      return schedule === undefined || !record(value) ||
        value.recipe !== schedule.recipe || value.factor !== schedule.factor ||
        value.variantId !== schedule.variantId || !nonnegativeCount(value.count) ||
        !uniqueStrings(value.datasets, datasets);
    }) ||
    [payload.rejections, payload.duplicates, payload.skips].some(values =>
      values.some(value => !record(value))
    ) ||
    payload.candidateOrdinal !== accepted + payload.rejections.length +
      payload.duplicates.length ||
    typeof state.stateId !== "string" || state.stateId !== wireDigest(payload)
  ) throw invalidPayload("state");
}

function sameWireValue(left, right) {
  return wireDigest(left) === wireDigest(right);
}

function appendOnlyValues(previous, next) {
  return next.length >= previous.length && previous.every((value, index) =>
    sameWireValue(value, next[index])
  );
}

function monotonicCountEntries(previous, next) {
  if (next.length < previous.length) return false;
  return previous.every(([key, count], index) =>
    next[index]?.[0] === key && next[index][1] >= count
  );
}

function monotonicSetEntries(previous, next) {
  if (next.length < previous.length) return false;
  return previous.every(([key, values], index) =>
    next[index]?.[0] === key && appendOnlyValues(values, next[index][1])
  );
}

function assertStateTransition(previous, next) {
  const previousSchedules = previous.scheduleFulfillment;
  const nextSchedules = next.scheduleFulfillment;
  if (
    next.nextDatasetIndex !== previous.nextDatasetIndex + 1 ||
    next.candidateOrdinal < previous.candidateOrdinal ||
    !appendOnlyValues(previous.fingerprints, next.fingerprints) ||
    !monotonicCountEntries(previous.recipeCounts, next.recipeCounts) ||
    !monotonicSetEntries(previous.recipeDatasets, next.recipeDatasets) ||
    !appendOnlyValues(previous.baselineFactorCases, next.baselineFactorCases) ||
    !monotonicCountEntries(previous.factorValueCounts, next.factorValueCounts) ||
    !monotonicSetEntries(previous.factorValueDatasets, next.factorValueDatasets) ||
    !appendOnlyValues(previous.factorPairs, next.factorPairs) ||
    !monotonicCountEntries(previous.factorCaseCounts, next.factorCaseCounts) ||
    nextSchedules.length < previousSchedules.length ||
    previousSchedules.some(([key, value], index) => {
      const candidate = nextSchedules[index];
      return candidate?.[0] !== key || candidate[1].count < value.count ||
        !appendOnlyValues(value.datasets, candidate[1].datasets);
    }) ||
    !appendOnlyValues(previous.rejections, next.rejections) ||
    !appendOnlyValues(previous.duplicates, next.duplicates) ||
    !appendOnlyValues(previous.skips, next.skips)
  ) throw invalidPayload("state transition");
}

function assertAccumulatedDescriptors(descriptors, plan, state) {
  const expectedCount = state.nextDatasetIndex * plan.chartsPerDataset;
  const recipes = new Set(plan.recipeIds);
  if (
    !Array.isArray(descriptors) || descriptors.length !== expectedCount ||
    descriptors.some((descriptor, index) =>
      !record(descriptor) || typeof descriptor.id !== "string" ||
      descriptor.id.length === 0 || !recipes.has(descriptor.recipe) ||
      !record(descriptor.factors) || descriptor.factors.dataset !==
        plan.activeDatasets[Math.floor(index / plan.chartsPerDataset)] ||
      typeof descriptor.semanticFingerprint !== "string" ||
      !/^[a-f0-9]{64}$/u.test(descriptor.semanticFingerprint)
    ) ||
    new Set(descriptors.map(value => value.id)).size !== expectedCount ||
    new Set(descriptors.map(value => value.semanticFingerprint)).size !== expectedCount
  ) throw invalidPayload("dataset");
  const stateFingerprints = new Set(state.fingerprints);
  if (descriptors.some(value => !stateFingerprints.has(value.semanticFingerprint))) {
    throw invalidPayload("dataset");
  }
  const recipeCounts = new Map();
  const recipeDatasets = new Map();
  for (const descriptor of descriptors) {
    recipeCounts.set(descriptor.recipe, (recipeCounts.get(descriptor.recipe) ?? 0) + 1);
    const used = recipeDatasets.get(descriptor.recipe) ?? new Set();
    used.add(descriptor.factors.dataset);
    recipeDatasets.set(descriptor.recipe, used);
  }
  const stateCounts = new Map(state.recipeCounts);
  const stateDatasets = new Map(state.recipeDatasets.map(([recipe, values]) =>
    [recipe, new Set(values)]
  ));
  if (
    recipeCounts.size !== stateCounts.size ||
    [...recipeCounts].some(([recipe, count]) => stateCounts.get(recipe) !== count) ||
    recipeDatasets.size !== stateDatasets.size ||
    [...recipeDatasets].some(([recipe, values]) => {
      const expected = stateDatasets.get(recipe);
      return expected === undefined || expected.size !== values.size ||
        [...values].some(value => !expected.has(value));
    })
  ) throw invalidPayload("dataset");
}

function assertResources(result, operation) {
  const resources = result?.resources;
  if (
    !record(result) || !resourceSnapshot(resources) ||
    resources.wallTimeMs !== undefined &&
      (!Number.isFinite(resources.wallTimeMs) || resources.wallTimeMs < 0)
  ) throw invalidPayload(`${operation} resources`);
}

function assertRequirements(requirements) {
  return record(requirements) && uniqueStrings(requirements.features) &&
    requirements.features.length > 0 && Array.isArray(requirements.interactions) &&
    requirements.interactions.length > 0 &&
    requirements.interactions.every(value =>
      record(value) && uniqueStrings(value.members) && value.members.length >= 2
    ) && new Set(requirements.interactions.map(wireDigest)).size ===
      requirements.interactions.length;
}

function assertFinalized(finalized, plan, state, descriptors, plannedRequirements) {
  if (!record(finalized) || !Array.isArray(finalized.descriptors)) {
    throw invalidPayload("finalize");
  }
  const expectedCount = Math.min(plan.selectedDescriptorCount, descriptors.length);
  if (
    finalized.descriptors.length !== expectedCount ||
    finalized.descriptors.some((descriptor, index) =>
      wireDigest(descriptor) !== wireDigest(descriptors[index])
    )
  ) throw invalidPayload("finalize");
  const generation = finalized.generation;
  const requirements = finalized.requirements;
  const stateCounts = new Map(state.recipeCounts);
  const stateDatasets = new Map(state.recipeDatasets);
  if (
    !record(generation) || generation.known !== true ||
    generation.attemptedCandidates !== state.candidateOrdinal ||
    generation.acceptedCandidates !== descriptors.length ||
    generation.selectedDescriptors !== expectedCount ||
    generation.rejectedCandidates !== state.rejections.length ||
    generation.duplicateCandidates !== state.duplicates.length ||
    generation.skippedRecipeDatasets !== state.skips.length ||
    generation.attemptedCandidates !== generation.acceptedCandidates +
      generation.rejectedCandidates + generation.duplicateCandidates ||
    !record(generation.recipeSelections) ||
    Object.entries(generation.recipeSelections).some(([recipe, count]) =>
      stateCounts.get(recipe) !== count
    ) || Object.keys(generation.recipeSelections).length !== stateCounts.size ||
    !record(generation.recipeDatasetCounts) ||
    Object.entries(generation.recipeDatasetCounts).some(([recipe, count]) =>
      stateDatasets.get(recipe)?.length !== count
    ) || Object.keys(generation.recipeDatasetCounts).length !== stateDatasets.size ||
    !Array.isArray(generation.rejections) || !Array.isArray(generation.duplicates) ||
    !Array.isArray(generation.skips) ||
    wireDigest(generation.rejections) !== wireDigest(state.rejections) ||
    wireDigest(generation.duplicates) !== wireDigest(state.duplicates) ||
    wireDigest(generation.skips) !== wireDigest(state.skips) ||
    !assertRequirements(requirements) ||
    !sameWireValue(requirements, plannedRequirements)
  ) throw invalidPayload("finalize");
}

export function runRealisticGenerationChild(message, {
  timeout,
  spawn = fork
} = {}) {
  if (!Number.isSafeInteger(timeout) || timeout <= 0) {
    throw new RangeError("Realistic generation child timeout must be positive.");
  }
  return new Promise((resolve, reject) => {
    const started = performance.now();
    const child = spawn(childPath, [], {
      execArgv: [
        "--expose-gc",
        `--max-old-space-size=${GENERATION_CHILD_OLD_SPACE_MIB}`
      ],
      serialization: "advanced",
      stdio: ["ignore", "pipe", "pipe", "ipc"]
    });
    let response;
    let finalResources;
    let stdout = "";
    let stderr = "";
    let settled = false;
    let pendingFailure;
    let exitCode;
    let exitSignal;
    let exitObserved = false;
    let killRequested = false;
    let timer;
    let terminationTimer;
    const finish = (callback, value) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      clearTimeout(terminationTimer);
      callback(value);
    };
    const terminalFailure = (code, signal) => {
      if (pendingFailure !== undefined) return pendingFailure;
      if (response?.ok === false) return childError(response.error);
      const detail = stderr.trim() || stdout.trim();
      return new Error(
        `Realistic generation ${message.operation} child exited ` +
        `${signal === null ? `with code ${code}` : `on ${signal}`}.` +
        `${detail.length === 0 ? "" : ` ${detail}`}`
      );
    };
    const completeAfterTermination = (code, signal) => {
      if (settled) return;
      clearTimeout(timer);
      if (pendingFailure === undefined && response?.ok === true && code === 0) {
        if (!resourceSnapshot(finalResources)) {
          finish(reject, invalidPayload("post-serialization resources"));
          return;
        }
        finish(resolve, deepFreeze({
          value: response.value,
          resources: {
            ...finalResources,
            wallTimeMs: performance.now() - started
          }
        }));
        return;
      }
      const failure = terminalFailure(code, signal);
      if (resourceSnapshot(finalResources) && Object.isExtensible(failure)) {
        failure[CHILD_FAILURE_RESOURCES] = deepFreeze({
          ...finalResources,
          wallTimeMs: performance.now() - started
        });
      }
      finish(reject, failure);
    };
    const scheduleTerminationFallback = () => {
      if (settled || terminationTimer !== undefined) return;
      terminationTimer = setTimeout(() => {
        completeAfterTermination(
          exitObserved ? exitCode : null,
          exitObserved ? exitSignal : "SIGKILL"
        );
      }, CHILD_TERMINATION_GRACE_MS);
    };
    const terminateWith = error => {
      if (settled) return;
      pendingFailure ??= error;
      clearTimeout(timer);
      if (!exitObserved && !killRequested) {
        killRequested = true;
        try {
          child.kill("SIGKILL");
        } catch {
          // Preserve the original process failure while awaiting terminal cleanup.
        }
      }
      scheduleTerminationFallback();
    };
    child.stdout?.on("data", chunk => {
      stdout = appendDiagnostic(stdout, chunk.toString());
    });
    child.stderr?.on("data", chunk => {
      stderr = appendDiagnostic(stderr, chunk.toString());
    });
    child.on("error", error => {
      if (child.pid === undefined && !exitObserved) {
        finish(reject, error);
        return;
      }
      terminateWith(error);
    });
    child.on("message", value => {
      if (value?.kind === "resources") {
        finalResources = value.resources;
      } else {
        response = value;
      }
    });
    child.once("exit", (code, signal) => {
      exitObserved = true;
      exitCode = code;
      exitSignal = signal;
      clearTimeout(timer);
      scheduleTerminationFallback();
    });
    child.once("close", (code, signal) => {
      completeAfterTermination(
        exitObserved ? exitCode : code,
        exitObserved ? exitSignal : signal
      );
    });
    timer = setTimeout(() => {
      const error = new Error(
        `Realistic generation ${message.operation} child exceeded ${timeout} ms.`
      );
      error.name = "ScenarioGenerationTimeoutError";
      terminateWith(error);
    }, timeout);
    try {
      child.send(message, error => {
        if (error !== null && error !== undefined) terminateWith(error);
      });
    } catch (error) {
      terminateWith(error);
    }
  });
}

export async function generateRealisticDescriptorsIsolated({
  limit,
  recipeIds,
  strictScheduling = false,
  timeout = DEFAULT_GENERATION_TIMEOUT
} = {}, {
  runChild = runRealisticGenerationChild
} = {}) {
  if (!Number.isSafeInteger(timeout) || timeout <= 0) {
    throw new RangeError("Realistic generation timeout must be positive.");
  }
  const started = performance.now();
  const deadline = started + timeout;
  const resources = [];
  const coordinatorRss = () => Math.max(
    process.memoryUsage().rss,
    process.resourceUsage().maxRSS * 1_024
  );
  let maximumCoordinatorRssBytes = coordinatorRss();
  const sampleCoordinatorRss = () => {
    maximumCoordinatorRssBytes = Math.max(
      maximumCoordinatorRssBytes,
      coordinatorRss()
    );
  };
  const wallTimeFor = operation => resources
    .filter(value => value.operation === operation)
    .reduce((sum, value) => sum + value.wallTimeMs, 0);
  const generationResourceSnapshot = complete => {
    const frozenChildren = deepFreeze([...resources]);
    sampleCoordinatorRss();
    const maximumChildRssBytes = Math.max(
      0,
      ...resources.map(value => value.maximumRssBytes)
    );
    return deepFreeze({
      complete,
      children: frozenChildren,
      maximumChildRssBytes,
      maximumCoordinatorRssBytes,
      maximumCombinedRssBytes: maximumChildRssBytes + maximumCoordinatorRssBytes,
      wallTimeMs: {
        total: performance.now() - started,
        children: resources.reduce((sum, value) => sum + value.wallTimeMs, 0),
        plan: wallTimeFor("plan"),
        factorRequirements: wallTimeFor("requirements"),
        merge: wallTimeFor("merge"),
        datasetGeneration: wallTimeFor("dataset"),
        finalize: wallTimeFor("finalize")
      }
    });
  };
  const generate = async () => {
  const step = async message => {
    const remaining = Math.ceil(deadline - performance.now());
    if (remaining <= 0) {
      const error = new Error(`Realistic generation exceeded ${timeout} ms.`);
      error.name = "ScenarioGenerationTimeoutError";
      throw error;
    }
    const stepStarted = performance.now();
    sampleCoordinatorRss();
    let result;
    try {
      result = await runChild(message, { timeout: remaining });
    } catch (error) {
      const childResources = error?.[CHILD_FAILURE_RESOURCES];
      if (resourceSnapshot(childResources)) {
        resources.push(Object.freeze({
          operation: message.operation,
          ...(message.dataset === undefined ? {} : { dataset: message.dataset }),
          ...childResources
        }));
      }
      throw error;
    }
    sampleCoordinatorRss();
    assertResources(result, message.operation);
    resources.push(Object.freeze({
      operation: message.operation,
      ...(message.dataset === undefined ? {} : { dataset: message.dataset }),
      ...result.resources,
      wallTimeMs: result.resources?.wallTimeMs ?? performance.now() - stepStarted
    }));
    return result.value;
  };
  const planned = await step({
    operation: "plan",
    options: {
      ...(limit === undefined ? {} : { limit }),
      ...(recipeIds === undefined ? {} : { recipeIds }),
      strictScheduling
    }
  });
  const { plan, requirements: plannedRequirements } = planned;
  assertPlan(plan);
  if (!assertRequirements(plannedRequirements)) throw invalidPayload("plan requirements");
  const fragments = [];
  for (const dataset of plan.activeDatasets) {
    const { fragment } = await step({
      operation: "requirements",
      plan,
      dataset
    });
    assertRequirementFragment(fragment, plan, dataset);
    fragments.push(fragment);
  }
  const merged = await step({ operation: "merge", plan, fragments });
  const manifest = merged.manifest;
  let state = merged.state;
  assertManifest(manifest, plan);
  assertFragmentManifestConsistency(fragments, manifest, plan);
  assertState(state, plan, manifest, 0);
  fragments.length = 0;
  const descriptors = [];
  assertAccumulatedDescriptors(descriptors, plan, state);
  while (state.nextDatasetIndex < plan.activeDatasets.length) {
    const datasetIndex = state.nextDatasetIndex;
    const dataset = plan.activeDatasets[datasetIndex];
    const generated = await step({
      operation: "dataset",
      plan,
      manifest,
      state,
      dataset
    });
    if (
      generated.dataset !== dataset ||
      generated.datasetIndex !== datasetIndex ||
      !Array.isArray(generated.descriptors) ||
      generated.descriptors.length !== plan.chartsPerDataset ||
      generated.state?.nextDatasetIndex !== datasetIndex + 1
    ) {
      throw new Error(`Realistic generation child returned invalid state for "${dataset}".`);
    }
    assertState(generated.state, plan, manifest, datasetIndex + 1);
    assertStateTransition(state, generated.state);
    const nextDescriptors = descriptors.concat(generated.descriptors);
    assertAccumulatedDescriptors(nextDescriptors, plan, generated.state);
    descriptors.push(...generated.descriptors);
    state = generated.state;
  }
  const finalized = await step({
    operation: "finalize",
    plan,
    manifest,
    state,
    descriptors
  });
  assertFinalized(finalized, plan, state, descriptors, plannedRequirements);
  if (performance.now() > deadline) {
    const error = new Error(`Realistic generation exceeded ${timeout} ms.`);
    error.name = "ScenarioGenerationTimeoutError";
    throw error;
  }
  const frozenDescriptors = deepFreeze(finalized.descriptors);
  const frozenGeneration = deepFreeze(finalized.generation);
  const frozenRequirements = deepFreeze(finalized.requirements);
  const generationResources = generationResourceSnapshot(true);
  return Object.freeze({
    descriptors: frozenDescriptors,
    generation: frozenGeneration,
    requirements: frozenRequirements,
    resources: generationResources
  });
  };
  const rssSampler = setInterval(sampleCoordinatorRss, 10);
  rssSampler.unref?.();
  try {
    return await generate();
  } catch (error) {
    try {
      if (
        error !== null && typeof error === "object" && Object.isExtensible(error) &&
        error.generationResources === undefined
      ) {
        error.generationResources = generationResourceSnapshot(false);
      }
    } catch {
      // Never mask the original generation failure with audit-metadata collection.
    }
    throw error;
  } finally {
    clearInterval(rssSampler);
  }
}
