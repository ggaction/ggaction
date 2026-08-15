import { parentPort, workerData } from "node:worker_threads";

import {
  generateScenarioDescriptors,
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
    stack: error?.stack ?? String(error)
  });
}

try {
  const descriptors = generateScenarioDescriptors({
    mode: "realistic",
    ...(workerData.limit === undefined ? {} : { limit: workerData.limit })
  });
  parentPort.postMessage({
    ok: true,
    descriptors,
    generation: scenarioGenerationDiagnostics(descriptors),
    requirements: Object.freeze({
      features: REALISTIC_REQUIRED_FEATURES,
      interactions: REALISTIC_REQUIRED_INTERACTIONS
    })
  });
} catch (error) {
  parentPort.postMessage({ ok: false, error: serializedError(error) });
}
