import {
  finalizeRealisticScenarioGenerationState,
  generateScenarioDescriptors,
  generateRealisticScenarioDataset,
  initializeRealisticScenarioGenerationState,
  mergeRealisticScenarioFactorRequirementFragments,
  realisticScenarioFactorRequirementFragment,
  realisticScenarioGenerationPlan,
  scenarioGenerationDiagnostics
} from "../test/support/scenarios/engine.js";
import {
  REALISTIC_REQUIRED_FEATURES,
  REALISTIC_REQUIRED_INTERACTIONS
} from "../test/support/scenarios/recipes.js";

function serializedError(error) {
  return Object.freeze({
    name: error?.name ?? "Error",
    message: error?.message ?? String(error),
    stack: error?.stack ?? String(error),
    ...(error?.diagnostics === undefined
      ? {}
      : { diagnostics: error.diagnostics })
  });
}

function resourceReport() {
  const rssBytes = process.memoryUsage().rss;
  return Object.freeze({
    rssBytes,
    maximumRssBytes: Math.max(rssBytes, process.resourceUsage().maxRSS * 1_024)
  });
}

function execute(message) {
  switch (message?.operation) {
    case "plan":
      return Object.freeze({
        plan: realisticScenarioGenerationPlan(message.options),
        requirements: Object.freeze({
          features: REALISTIC_REQUIRED_FEATURES,
          interactions: REALISTIC_REQUIRED_INTERACTIONS
        })
      });
    case "reference": {
      const descriptors = generateScenarioDescriptors({
        mode: "realistic",
        ...(message.options?.limit === undefined
          ? {}
          : { limit: message.options.limit }),
        ...(message.options?.recipeIds === undefined
          ? {}
          : { recipeIds: message.options.recipeIds }),
        strictScheduling: message.options?.strictScheduling ?? false
      });
      return Object.freeze({
        descriptors,
        generation: scenarioGenerationDiagnostics(descriptors)
      });
    }
    case "requirements":
      return Object.freeze({
        fragment: realisticScenarioFactorRequirementFragment(
          message.plan,
          message.dataset
        )
      });
    case "merge": {
      const manifest = mergeRealisticScenarioFactorRequirementFragments(
        message.plan,
        message.fragments
      );
      return Object.freeze({
        manifest,
        state: initializeRealisticScenarioGenerationState(message.plan, manifest)
      });
    }
    case "dataset":
      return generateRealisticScenarioDataset(
        message.plan,
        message.manifest,
        message.state
      );
    case "finalize": {
      const generated = finalizeRealisticScenarioGenerationState(
        message.plan,
        message.manifest,
        message.state,
        message.descriptors
      );
      return Object.freeze({
        ...generated,
        requirements: Object.freeze({
          features: REALISTIC_REQUIRED_FEATURES,
          interactions: REALISTIC_REQUIRED_INTERACTIONS
        })
      });
    }
    default:
      throw new Error(`Unknown realistic generation operation "${message?.operation}".`);
  }
}

process.once("message", message => {
  let response;
  try {
    response = Object.freeze({
      kind: "result",
      ok: true,
      value: execute(message),
      resources: resourceReport()
    });
  } catch (error) {
    response = Object.freeze({
      kind: "result",
      ok: false,
      error: serializedError(error),
      resources: resourceReport()
    });
  }
  process.send?.(response, error => {
    if (error !== null && error !== undefined) {
      process.disconnect();
      return;
    }
    process.send?.(Object.freeze({
      kind: "resources",
      resources: resourceReport()
    }), () => process.disconnect());
  });
});
