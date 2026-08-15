import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import test from "node:test";

import { assertGraphicIntegrity } from "../oracles/graphic-integrity.js";
import { releaseTidyTuesdaySourceCache } from "../support/datasets/tidytuesday.js";
import { REALISTIC_LIFECYCLE_SCENARIO_RECIPES } from
  "../support/scenarios/lifecycle-recipes.js";

function fingerprint(value) {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

function finalFingerprint(program) {
  return fingerprint([program.semanticSpec, program.graphicSpec, program.children]);
}

function factorsAtBaseline(dataset, domains) {
  return {
    dataset,
    ...Object.fromEntries(Object.entries(domains).map(([factor, values]) =>
      [factor, values[0]]
    ))
  };
}

test("schedules every two-way chart-family lifecycle at five TT witnesses per family", () => {
  const expected = new Map([
    ["realistic-action-interval-lifecycle", ["kind", ["bar", "band"]]],
    ["realistic-action-direct-bar-offsets", [
      "orientation",
      ["horizontal", "vertical"]
    ]],
    ["realistic-action-direct-axis-parts", ["mode", ["leaves", "groups"]]]
  ]);
  const scheduled = REALISTIC_LIFECYCLE_SCENARIO_RECIPES.filter(recipe =>
    recipe.coverageSchedule !== undefined
  );
  assert.deepEqual(scheduled.map(recipe => recipe.id), [...expected.keys()]);
  for (const recipe of scheduled) {
    const [factor, variants] = expected.get(recipe.id);
    const schedule = recipe.coverageSchedule;
    assert.equal(schedule.factor, factor, recipe.id);
    assert.equal(recipe.minimumSelections, 10, recipe.id);
    assert.equal(schedule.minimumSelections, 10, recipe.id);
    assert.equal(schedule.minimumDatasetsPerRequirement, 3, recipe.id);
    assert.equal(schedule.assignment, "round-robin-datasets-per-variant", recipe.id);
    assert.deepEqual(schedule.variantRequirements, variants.map(variantId => ({
      variantId,
      minimumOccurrences: 5,
      minimumDatasets: 3
    })), recipe.id);
    assert.deepEqual(
      Object.fromEntries(variants.map(variantId => [
        variantId,
        schedule.selectionVariantIds.filter(value => value === variantId).length
      ])),
      Object.fromEntries(variants.map(variantId => [variantId, 5])),
      recipe.id
    );
  }
});

test("every realistic lifecycle factor has a final or explicit transient effect", () => {
  assert.equal(REALISTIC_LIFECYCLE_SCENARIO_RECIPES.length, 28);
  for (const recipe of REALISTIC_LIFECYCLE_SCENARIO_RECIPES) {
    assert.equal(recipe.enforceFactorEffects, true, recipe.id);
    assert.equal(typeof recipe.observeFactors, "function", recipe.id);
    const witnesses = [];
    for (const dataset of recipe.datasets) {
      const domains = recipe.factorsForDataset(dataset);
      if (domains !== undefined) witnesses.push([dataset, domains]);
      if (witnesses.length === 3) break;
    }
    assert.equal(witnesses.length, 3, `${recipe.id} TidyTuesday witnesses`);

    for (const [dataset, domains] of witnesses) {
      try {
        const baseline = factorsAtBaseline(dataset, domains);
        for (const [factor, values] of Object.entries(domains)) {
          const finals = new Set();
          const traces = new Set();
          const evidence = [];
          for (const value of values) {
            const factors = Object.freeze({ ...baseline, [factor]: value });
            const label = `${recipe.id}/${dataset}/${factor}=${JSON.stringify(value)}`;
            const program = recipe.build(factors);
            assertGraphicIntegrity(program, label);
            finals.add(finalFingerprint(program));
            traces.add(fingerprint(program.trace));
            const effects = recipe.observeFactors(program, factors);
            assert.deepEqual(
              new Set(effects.map(effect => effect.factor)),
              new Set(Object.keys(domains)),
              `${label} observed factors`
            );
            assert.ok(effects.length > 0, `${label} factorEffects`);
            evidence.push(effects.find(effect => effect.factor === factor).evidence);
          }
          if (finals.size === values.length) {
            assert.ok(
              evidence.every(value => value.startsWith("final-semantic-or-graphic:")),
              `${recipe.id}/${dataset}/${factor} final evidence`
            );
          } else {
            assert.equal(finals.size, 1, `${recipe.id}/${dataset}/${factor} final states`);
            assert.equal(traces.size, values.length, `${recipe.id}/${dataset}/${factor} traces`);
            assert.ok(
              evidence.every(value => value.startsWith("trace-only:")),
              `${recipe.id}/${dataset}/${factor} transient evidence`
            );
          }
        }

        if (recipe.id === "realistic-action-interval-lifecycle") {
          const finals = new Set(domains.capSize.map(capSize =>
            finalFingerprint(recipe.build({ ...baseline, kind: "band", capSize }))
          ));
          assert.equal(finals.size, domains.capSize.length, `${dataset} band capSize effect`);
        }
      } finally {
        releaseTidyTuesdaySourceCache(dataset);
      }
    }
  }
});
