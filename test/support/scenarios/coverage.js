function sortedUnique(values) {
  return Object.freeze([...new Set(values)].sort());
}

function coverageFor(publicActions, observed) {
  const coveredActions = Object.freeze(publicActions.filter(action => observed.has(action)));
  const missingActions = Object.freeze(publicActions.filter(action => !observed.has(action)));
  return Object.freeze({ coveredActions, missingActions });
}

export function summarizeActionCoverage(results, publicActions) {
  const direct = new Set(results.flatMap(result => result.directOperations ?? []));
  const transitive = new Set(results.flatMap(result => result.operations ?? []));
  const directCoverage = coverageFor(publicActions, direct);
  const transitiveCoverage = coverageFor(publicActions, transitive);
  return Object.freeze({
    publicActionCount: publicActions.length,
    directCoveredActionCount: directCoverage.coveredActions.length,
    directCoveredActions: directCoverage.coveredActions,
    directMissingActions: directCoverage.missingActions,
    transitiveCoveredActionCount: transitiveCoverage.coveredActions.length,
    transitiveCoveredActions: transitiveCoverage.coveredActions,
    transitiveMissingActions: transitiveCoverage.missingActions
  });
}

function executionBreakdown(attemptedIds, successfulIds, failedIds, label) {
  const successfulSet = new Set(successfulIds);
  const failedSet = new Set(failedIds);
  const unknownIds = attemptedIds.filter(id => !successfulSet.has(id) && !failedSet.has(id));
  if (unknownIds.length > 0) {
    throw new Error(`Scenario ${label} outcomes are missing: ${unknownIds.join(", ")}.`);
  }
  return Object.freeze({
    attemptedIds,
    atLeastOneSuccessfulIds: successfulIds,
    fullySuccessfulIds: Object.freeze(successfulIds.filter(id => !failedSet.has(id))),
    partiallyFailedIds: Object.freeze(
      successfulIds.filter(id => failedSet.has(id))
    ),
    fullyFailedIds: Object.freeze(failedIds.filter(id => !successfulSet.has(id)))
  });
}

function validateOutcomePartition(descriptors, results, failures) {
  const attemptedIds = descriptors.map(descriptor => descriptor.id);
  const successfulIds = results.map(result => result.id);
  const failedIds = failures.map(failure => failure.descriptor.id);
  for (const [label, ids] of [
    ["descriptor", attemptedIds],
    ["successful result", successfulIds],
    ["failure", failedIds]
  ]) {
    if (ids.some(id => typeof id !== "string" || id.length === 0)) {
      throw new TypeError(`Scenario ${label} ids must be non-empty strings.`);
    }
    if (new Set(ids).size !== ids.length) {
      throw new Error(`Scenario ${label} ids must be unique.`);
    }
  }
  const observedIds = [...successfulIds, ...failedIds];
  if (
    new Set(observedIds).size !== observedIds.length ||
    observedIds.length !== attemptedIds.length ||
    observedIds.some(id => !attemptedIds.includes(id))
  ) {
    throw new Error("Scenario outcomes must partition the attempted descriptors.");
  }
}

export function summarizeDataCoverage(descriptors, results, failures, datasetCorpus) {
  validateOutcomePartition(descriptors, results, failures);
  const attemptedDatasetIds = sortedUnique(
    descriptors.map(descriptor => descriptor.factors.dataset)
  );
  const successfulDatasetIds = sortedUnique(results.map(result => result.dataset));
  const failedDatasetIds = sortedUnique(
    failures.map(failure => failure.descriptor.factors.dataset)
  );
  const attemptedRecipeIds = sortedUnique(descriptors.map(descriptor => descriptor.recipe));
  const successfulRecipeIds = sortedUnique(results.map(result => result.recipe));
  const failedRecipeIds = sortedUnique(failures.map(failure => failure.descriptor.recipe));
  const attemptedDefinitions = datasetCorpus.datasets.filter(dataset =>
    attemptedDatasetIds.includes(dataset.id)
  );

  return Object.freeze({
    executed: Object.freeze({
      datasets: executionBreakdown(
        attemptedDatasetIds,
        successfulDatasetIds,
        failedDatasetIds,
        "dataset"
      ),
      recipes: executionBreakdown(
        attemptedRecipeIds,
        successfulRecipeIds,
        failedRecipeIds,
        "recipe"
      )
    }),
    manifestPotential: Object.freeze({
      datasetIds: attemptedDatasetIds,
      profiles: sortedUnique(attemptedDefinitions.flatMap(dataset => dataset.profiles)),
      chartFamilies: sortedUnique(
        attemptedDefinitions.flatMap(dataset => dataset.chartFamilies)
      )
    })
  });
}
