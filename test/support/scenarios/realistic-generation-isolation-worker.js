import assert from "node:assert/strict";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  generateRealisticDescriptorsIsolated,
  runRealisticGenerationChild
} from
  "../../../scripts/run-realistic-scenario-generation-coordinator.js";

export const REALISTIC_GENERATION_ISOLATION_LIMITS = Object.freeze([216, 360]);
export const REALISTIC_GENERATION_ISOLATION_TIMEOUT_MS = 570_000;

export async function realisticGenerationIsolationBoundary(limit) {
  if (!REALISTIC_GENERATION_ISOLATION_LIMITS.includes(limit)) {
    throw new RangeError("Generation isolation worker limit must be 216 or 360.");
  }

  const deadline = performance.now() + REALISTIC_GENERATION_ISOLATION_TIMEOUT_MS;
  const remainingTimeout = () => {
    const remaining = Math.floor(deadline - performance.now());
    if (remaining <= 0) {
      const error = new Error(
        "Generation isolation boundary exceeded its shared timeout."
      );
      error.name = "ScenarioGenerationTimeoutError";
      throw error;
    }
    return remaining;
  };
  const reference = await runRealisticGenerationChild({
    operation: "reference",
    options: { limit, strictScheduling: true }
  }, { timeout: remainingTimeout() });
  const isolated = await generateRealisticDescriptorsIsolated({
    limit,
    strictScheduling: true,
    timeout: remainingTimeout()
  });
  const monolith = reference.value.descriptors;

  assert.equal(isolated.descriptors.length, monolith.length);
  for (let index = 0; index < monolith.length; index += 1) {
    assert.deepEqual(
      isolated.descriptors[index],
      monolith[index],
      `descriptor ${index}`
    );
  }
  assert.deepEqual(isolated.generation, reference.value.generation);

  return Object.freeze({
    boundary: Object.freeze({
      limit,
      descriptors: isolated.descriptors.length,
      descriptorParity: true,
      generationParity: true,
      frozenResult: Object.isFrozen(isolated),
      frozenDescriptors: Object.isFrozen(isolated.descriptors),
      frozenGeneration: Object.isFrozen(isolated.generation)
    }),
    isolatedResources: isolated.resources,
    referenceResources: reference.resources
  });
}

if (
  process.argv[1] &&
  fileURLToPath(import.meta.url) === path.resolve(process.argv[1])
) {
  const report = await realisticGenerationIsolationBoundary(
    Number(process.argv[2])
  );
  process.stdout.write(`${JSON.stringify(report)}\n`);
}
