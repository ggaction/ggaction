import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import test from "node:test";

import {
  releaseTidyTuesdaySourceCache,
  tidyTuesdaySourceEntries
} from "../support/datasets/tidytuesday.js";
import { realisticOrderedView } from "../support/scenarios/realistic-data.js";
import { REALISTIC_ANALYSIS_RECIPES } from "../support/scenarios/realistic-recipes.js";

function baselineFactors(recipe, dataset) {
  const domains = recipe.factorsForDataset(dataset);
  assert.notEqual(domains, undefined, `${recipe.id}/${dataset} eligibility`);
  return Object.freeze({
    dataset,
    ...Object.fromEntries(Object.entries(domains).map(([factor, values]) =>
      [factor, values[0]]
    ))
  });
}

test("single-series temporal provenance follows the actual full-source operations", () => {
  const dataset = "tt-global-temperatures";
  try {
    const view = realisticOrderedView(dataset, {
      aggregate: "mean",
      measureIndex: 0,
      dimensionIndex: 0,
      temporalOnly: true
    });
    const expectedIndexes = tidyTuesdaySourceEntries(dataset)
      .filter(({ row }) =>
        Number.isFinite(row["J-D"]) && Number.isFinite(Date.parse(row.Year))
      )
      .map(entry => entry.sourceRowIndex);
    const expectedHash = createHash("sha256")
      .update(expectedIndexes.join(","))
      .digest("hex");

    assert.equal(expectedIndexes.length, 143);
    assert.equal(view.provenance.sourceRowIndexes, undefined);
    assert.equal(view.provenance.sourceRowCount, expectedIndexes.length);
    assert.equal(view.provenance.minimumSourceRow, expectedIndexes[0]);
    assert.equal(view.provenance.maximumSourceRow, expectedIndexes.at(-1));
    assert.equal(view.provenance.sourceSelectionSha256, expectedHash);
    assert.equal(view.rows.length, 24);
    assert.deepEqual(new Set(view.rows.map(row => row.group)), new Set(["all-observations"]));
    assert.deepEqual(
      view.provenance.transformations.slice(0, 4),
      [
        { op: "filter-valid", fields: ["J-D", "Year"] },
        {
          op: "single-series-projection",
          source: "Year",
          as: "group",
          value: "all-observations",
          purpose: "avoid grouping an ordered field by itself"
        },
        { op: "top-groups", field: "group", limit: 4 },
        {
          op: "temporal-bin-aggregate",
          field: "J-D",
          orderBy: "Year",
          groupBy: "group",
          bins: 24,
          aggregate: "mean"
        }
      ]
    );

    const recipe = REALISTIC_ANALYSIS_RECIPES.find(candidate =>
      candidate.id === "realistic-ranked-line"
    );
    const factors = baselineFactors(recipe, dataset);
    const metadata = recipe.describe(factors);
    const program = recipe.build(factors);
    assert.equal(metadata.title, "Mean J-D (degC anomaly) over Year");
    assert.equal(metadata.analysisQuestion, "How does the mean J-D change over Year?");
    assert.equal(program.semanticSpec.title.text, metadata.title);
    assert.equal(program.semanticSpec.title.subtitle, metadata.analysisQuestion);
    assert.deepEqual(metadata.dataOperations.slice(0, 4), [
      "filter-valid",
      "single-series-projection",
      "top-groups",
      "temporal-bin-aggregate"
    ]);
  } finally {
    releaseTidyTuesdaySourceCache(dataset);
  }
});
