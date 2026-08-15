import assert from "node:assert/strict";
import test from "node:test";

import {
  assertScenarioFactorValueRequirements,
  scenarioCandidateFailureDiagnostic,
  scenarioFactorDiagnostic,
  scenarioGenerationFailureDiagnostics,
  scenarioHasVisibleTitle,
  scenarioSelectionPacingTarget,
  validateScenarioFactorEffects
} from "../support/scenarios/engine.js";

test("paces large recipe reservations across every eligible dataset", () => {
  assert.equal(scenarioSelectionPacingTarget(327, 1, 50), 7);
  assert.equal(scenarioSelectionPacingTarget(327, 25, 50), 164);
  assert.equal(scenarioSelectionPacingTarget(327, 50, 50), 327);
  assert.equal(scenarioSelectionPacingTarget(272, 1, 50), 6);
  assert.equal(scenarioSelectionPacingTarget(272, 50, 50), 272);
  assert.equal(scenarioSelectionPacingTarget(15, 1, 15), 1);
  assert.throws(
    () => scenarioSelectionPacingTarget(5, 4, 3),
    /valid eligible ordinal/u
  );
});

test("matches wrapped visible titles while preserving every non-whitespace character", () => {
  const program = {
    graphicSpec: {
      objects: {
        title: {
          type: "text",
          items: [
            { properties: { text: "Deterministic sample" } },
            { properties: { text: "\u00a0(n=40/80" } },
            { properties: { text: " eligible)" } }
          ]
        }
      }
    },
    children: {}
  };
  assert.equal(
    scenarioHasVisibleTitle(program, "Deterministic sample (n=40/80 eligible)"),
    true
  );
  assert.equal(
    scenarioHasVisibleTitle(program, "Deterministic sample (n=80/40 eligible)"),
    false
  );
  assert.equal(scenarioHasVisibleTitle(program, "\u2003\n"), false);
});

test("keeps strict candidate diagnostics reproducible without dumping row arrays", () => {
  const factors = {
    dataset: "tt-penguins",
    fieldPair: { id: "bill-by-species", measureIndex: 0, dimensionIndex: 1 },
    rows: Array.from({ length: 100 }, (_, index) => ({ secretRowValue: index }))
  };
  const compact = scenarioFactorDiagnostic(factors);
  assert.match(compact, /tt-penguins/u);
  assert.match(compact, /bill-by-species/u);
  assert.match(compact, /<array length=100>/u);
  assert.doesNotMatch(compact, /secretRowValue/u);
  assert.match(compact, /#[a-f0-9]{12}$/u);
  assert.match(scenarioCandidateFailureDiagnostic({
    dataset: "tt-penguins",
    recipe: "realistic-example",
    factors,
    message: "intentional failure"
  }), /tt-penguins\/realistic-example factors=.*intentional failure/u);
});

test("bounds structured preflight diagnostics without raw factors", () => {
  const recipes = Array.from({ length: 40 }, (_, index) => ({
    id: `realistic-recipe-${String(index).padStart(2, "0")}`
  }));
  const factors = index => ({
    dataset: "tt-penguins",
    profile: `profile-${index}`,
    rows: Array.from({ length: 100 }, (_, row) => ({
      secretRowValue: `${index}-${row}`
    }))
  });
  const selectedDescriptors = recipes.map((recipe, index) => ({
    recipe: recipe.id,
    factors: factors(index),
    semanticFingerprint: String(index % 10).repeat(64)
  }));
  const diagnostics = scenarioGenerationFailureDiagnostics({
    kind: "preflight",
    dataset: "tt-penguins",
    datasetIndex: 0,
    tier: "advanced",
    quota: 28,
    produced: 27,
    schedulingIterations: 480,
    eligibleRecipes: recipes,
    selectedDescriptors,
    duplicates: recipes.slice(0, 30).map((recipe, index) => ({
      dataset: "tt-penguins",
      complexity: "advanced",
      recipe: recipe.id,
      factors: factors(index)
    })),
    rejections: recipes.slice(0, 12).map((recipe, index) => ({
      dataset: "tt-penguins",
      complexity: "advanced",
      recipe: recipe.id,
      factors: factors(index),
      message: `intentional rejection ${index}`
    })),
    skips: recipes.slice(0, 20).map((recipe, index) => ({
      dataset: "tt-penguins",
      complexity: "advanced",
      recipe: recipe.id,
      reason: "factor-candidate-domain-exhausted",
      eligibleFactorCases: index + 1,
      attemptedEligibleFactorCases: index + 1,
      scheduledVariantId: `variant-${index}`
    }))
  });
  assert.deepEqual({
    kind: diagnostics.kind,
    dataset: diagnostics.dataset,
    datasetIndex: diagnostics.datasetIndex,
    tier: diagnostics.tier,
    quota: diagnostics.quota,
    produced: diagnostics.produced,
    schedulingIterations: diagnostics.schedulingIterations,
    eligibleRecipeCount: diagnostics.eligibleRecipeCount
  }, {
    kind: "preflight",
    dataset: "tt-penguins",
    datasetIndex: 0,
    tier: "advanced",
    quota: 28,
    produced: 27,
    schedulingIterations: 480,
    eligibleRecipeCount: 40
  });
  assert.equal(diagnostics.recipeCounts.entries.length, 24);
  assert.equal(diagnostics.recipeCounts.omitted, 16);
  assert.equal(diagnostics.acceptedSamples.length, 8);
  assert.equal(diagnostics.acceptedSampleOmitted, 32);
  assert.equal(diagnostics.duplicateCount, 30);
  assert.equal(diagnostics.rejectionCount, 12);
  assert.equal(diagnostics.recentRejections.length, 8);
  assert.equal(diagnostics.exhaustionSkipCount, 20);
  assert.equal(diagnostics.exhaustionSkips.length, 12);
  assert.equal(diagnostics.acceptedSamples.every(value =>
    /^[a-f0-9]{12}$/u.test(value.factorDigest) &&
    /^[a-f0-9]{12}$/u.test(value.fingerprintPrefix)
  ), true);
  const serialized = JSON.stringify(diagnostics);
  assert.doesNotMatch(serialized, /secretRowValue|profile-39/u);
  assert.equal(serialized.length < 12_000, true);
});

test("rejects unknown, duplicate, mismatched, and missing factor-effect claims", () => {
  const recipe = { id: "realistic-example", enforceFactorEffects: true };
  const factors = {
    dataset: "tt-penguins",
    palette: "tableau10",
    reverse: false
  };
  const valid = [
    { factor: "palette", value: "tableau10", evidence: "trace:palette" },
    { factor: "reverse", value: false, evidence: "final:reverse" }
  ];

  assert.deepEqual(validateScenarioFactorEffects(recipe, factors, valid), valid);
  assert.throws(
    () => validateScenarioFactorEffects(recipe, factors, [
      ...valid,
      { factor: "dataset", value: "tt-penguins", evidence: "invalid" }
    ]),
    /unknown factor effects: dataset/u
  );
  assert.throws(
    () => validateScenarioFactorEffects(recipe, factors, [valid[0], ...valid]),
    /duplicate factor effects: palette/u
  );
  assert.throws(
    () => validateScenarioFactorEffects(recipe, factors, [
      { ...valid[0], value: "viridis" },
      valid[1]
    ]),
    /mismatched value for factor "palette"/u
  );
  assert.throws(
    () => validateScenarioFactorEffects(recipe, factors, [valid[0]]),
    /inactive factors: reverse/u
  );
  assert.throws(
    () => validateScenarioFactorEffects(recipe, factors, [
      { factor: "palette", evidence: "missing-value" },
      valid[1]
    ]),
    /invalid factor effects/u
  );
});

test("hard-fails incomplete factor-value requirement reports", () => {
  const complete = {
    recipe: "realistic-example",
    factor: "palette",
    valueKey: '"tableau10"',
    requiredCount: 3,
    fulfilledCount: 3,
    minimumDatasets: 3,
    fulfilledDatasets: 3,
    eligibleDatasetCount: 50
  };
  assert.equal(assertScenarioFactorValueRequirements([complete]), undefined);
  assert.throws(
    () => assertScenarioFactorValueRequirements([{
      ...complete,
      fulfilledCount: 3,
      fulfilledDatasets: 2
    }]),
    /realistic-example\.palette="tableau10" count=3\/3,datasets=2\/3,eligible=50/u
  );
  assert.throws(
    () => assertScenarioFactorValueRequirements([{
      ...complete,
      fulfilledCount: 2,
      fulfilledDatasets: 3
    }]),
    /realistic-example\.palette="tableau10" count=2\/3,datasets=3\/3,eligible=50/u
  );
  assert.throws(
    () => assertScenarioFactorValueRequirements([{ ...complete, requiredCount: 0 }]),
    /must be valid records/u
  );
  assert.throws(
    () => assertScenarioFactorValueRequirements([{ ...complete, valueKey: undefined }]),
    /must be valid records/u
  );
});
