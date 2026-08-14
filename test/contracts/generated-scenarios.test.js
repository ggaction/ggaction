import assert from "node:assert/strict";
import test from "node:test";

import {
  generateScenarioDescriptors,
  runScenario,
  scenarioFactorContract,
  summarizeScenarioResults
} from "../support/scenarios/engine.js";
import {
  assertPairwiseCoverage,
  pairwiseCases
} from "../support/scenarios/pairwise.js";
import { SCENARIO_RECIPES } from "../support/scenarios/recipes.js";

test("generates deterministic pairwise cases without a Cartesian explosion", () => {
  const factors = {
    scale: ["linear", "log", "sqrt"],
    reverse: [false, true],
    legend: ["right", "bottom"]
  };
  const cases = pairwiseCases(factors);
  assert.equal(cases.length, 6);
  assert.deepEqual(pairwiseCases(factors), cases);
  assert.deepEqual(assertPairwiseCoverage(cases, factors), {
    caseCount: 6,
    pairCount: 16
  });
});

test("covers every recipe factor pair in the deterministic deep descriptor set", () => {
  const first = generateScenarioDescriptors({
    mode: "deep",
    includeTidyTuesday: false
  });
  const second = generateScenarioDescriptors({
    mode: "deep",
    includeTidyTuesday: false
  });
  assert.deepEqual(second, first);
  assert.equal(first.length >= 200, true);
  assert.equal(new Set(first.map(descriptor => descriptor.id)).size, first.length);
  assert.deepEqual(
    new Set(first.map(descriptor => descriptor.recipe)),
    new Set(SCENARIO_RECIPES.map(recipe => recipe.id))
  );
  for (const recipe of SCENARIO_RECIPES) {
    const factors = scenarioFactorContract(recipe.id, { includeTidyTuesday: false });
    const cases = first
      .filter(descriptor => descriptor.recipe === recipe.id)
      .map(descriptor => descriptor.factors);
    assert.doesNotThrow(() => assertPairwiseCoverage(cases, factors), recipe.id);
  }
});

test("builds and independently validates every offline smoke scenario", () => {
  const descriptors = generateScenarioDescriptors({
    mode: "smoke",
    includeTidyTuesday: false
  });
  const results = descriptors.map(descriptor => runScenario(descriptor));
  const summary = summarizeScenarioResults(results, descriptors);

  assert.equal(summary.scenarioCount, descriptors.length);
  assert.equal(summary.recipeCount, SCENARIO_RECIPES.length);
  assert.equal(summary.datasetCount >= 15, true);
  assert.equal(summary.operationCount >= 150, true);
  assert.equal(summary.graphicObjects >= 600, true);
  assert.equal(summary.graphicItems >= 2_000, true);
  assert.equal(summary.svgBytes >= 300_000, true);
  assert.equal(results.every(result => result.svgSha256.length === 64), true);
});
