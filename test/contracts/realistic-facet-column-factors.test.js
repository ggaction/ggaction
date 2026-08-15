import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import test from "node:test";

import { assertAnalyticLayerIntegrity } from "../oracles/analytic-layer-integrity.js";
import { assertGraphicIntegrity } from "../oracles/graphic-integrity.js";
import { releaseTidyTuesdaySourceCache } from "../support/datasets/tidytuesday.js";
import { REALISTIC_LIFECYCLE_SCENARIO_RECIPES } from
  "../support/scenarios/lifecycle-recipes.js";
import { REALISTIC_ANALYSIS_RECIPES } from
  "../support/scenarios/realistic-recipes.js";

const LIFECYCLE_COLUMNS = Object.freeze([2, 3]);
const ANALYSIS_COLUMNS = Object.freeze([2, 3, 4]);
const lifecycleRecipe = REALISTIC_LIFECYCLE_SCENARIO_RECIPES.find(recipe =>
  recipe.id === "realistic-action-facet-scale-lifecycle"
);
const analysisRecipe = REALISTIC_ANALYSIS_RECIPES.find(recipe =>
  recipe.id === "realistic-faceted-distribution"
);

function finalFingerprint(program) {
  return createHash("sha256")
    .update(JSON.stringify(program.semanticSpec))
    .update("\0")
    .update(JSON.stringify(program.graphicSpec))
    .digest("hex");
}

function baselineFactors(dataset, domains, overrides = {}) {
  return Object.freeze({
    dataset,
    ...Object.fromEntries(Object.entries(domains).map(([name, domain]) => [name, domain[0]])),
    ...overrides
  });
}

function buildObserved(recipe, factors, label) {
  try {
    const program = recipe.build(factors);
    assertGraphicIntegrity(program, label);
    assertAnalyticLayerIntegrity(program, label);
    return Object.freeze({
      program,
      fingerprint: finalFingerprint(program),
      effects: recipe.observeFactors(program, factors)
    });
  } finally {
    recipe.releaseResolution?.(factors);
  }
}

function columnEffect(result) {
  return result.effects.find(effect => effect.factor === "columns");
}

test("turns known clamped TT column requests into distinct final visual policies", () => {
  const cases = [
    {
      recipe: lifecycleRecipe,
      dataset: "tt-global-temperatures",
      columns: [2, 3],
      materializedColumns: 2
    },
    {
      recipe: analysisRecipe,
      dataset: "tt-nyc-squirrels",
      columns: [2, 3, 4],
      materializedColumns: 2
    },
    {
      recipe: analysisRecipe,
      dataset: "tt-penguins",
      columns: [3, 4],
      materializedColumns: 3
    }
  ];
  for (const { recipe, dataset, columns, materializedColumns } of cases) {
    try {
      const domains = recipe.factorsForDataset(dataset);
      assert.notEqual(domains, undefined, `${recipe.id}-${dataset}`);
      assert.ok(columns.every(columnsValue => domains.columns.includes(columnsValue)));
      const results = columns.map(columnsValue => {
        const factors = baselineFactors(dataset, domains, { columns: columnsValue });
        return buildObserved(recipe, factors, `${recipe.id}-${dataset}-${columnsValue}`);
      });
      assert.equal(new Set(results.map(result => result.fingerprint)).size, results.length);
      results.forEach(result => {
        assert.equal(result.program.compositionSpec.columns, materializedColumns);
        assert.equal(
          columnEffect(result)?.evidence,
          "final-semantic-or-graphic:facet.columns+canvas.width+composition+child-x-range"
        );
      });
    } finally {
      releaseTidyTuesdaySourceCache(dataset);
    }
  }
});

test("every lifecycle facet column produces a distinct final TT chart", () => {
  let eligibleDatasets = 0;
  for (const dataset of lifecycleRecipe.datasets) {
    try {
      const domains = lifecycleRecipe.factorsForDataset(dataset);
      if (domains === undefined) continue;
      eligibleDatasets += 1;
      assert.deepEqual(domains.columns, LIFECYCLE_COLUMNS, `${dataset} domain`);
      const results = domains.columns.map(columns => {
        const factors = baselineFactors(dataset, domains, { columns });
        return buildObserved(lifecycleRecipe, factors, `${dataset}-${columns}`);
      });
      assert.equal(new Set(results.map(result => result.fingerprint)).size, results.length, dataset);
      results.forEach(result => {
        assert.equal(
          columnEffect(result)?.evidence,
          "final-semantic-or-graphic:facet.columns+canvas.width+composition+child-x-range",
          dataset
        );
      });
    } finally {
      releaseTidyTuesdaySourceCache(dataset);
    }
  }
  assert.equal(eligibleDatasets, 43);
});

test("every analysis facet column produces a distinct final TT chart", () => {
  let eligibleDatasets = 0;
  for (const dataset of analysisRecipe.datasets) {
    try {
      const domains = analysisRecipe.factorsForDataset(dataset);
      if (domains === undefined) continue;
      eligibleDatasets += 1;
      assert.deepEqual(domains.columns, ANALYSIS_COLUMNS, `${dataset} domain`);
      const fieldPair = domains.fieldPair[0];
      const results = domains.columns.map(columns => {
        const factors = baselineFactors(dataset, domains, {
          fieldPair,
          columns
        });
        return buildObserved(analysisRecipe, factors, `${dataset}-${fieldPair.bindingId}-${columns}`);
      });
      assert.equal(new Set(results.map(result => result.fingerprint)).size, results.length, dataset);
      results.forEach(result => {
        assert.equal(
          columnEffect(result)?.evidence,
          "final-semantic-or-graphic:facet.columns+canvas.width+composition+child-x-range",
          dataset
        );
      });
    } finally {
      releaseTidyTuesdaySourceCache(dataset);
    }
  }
  assert.equal(eligibleDatasets, 38);
});
