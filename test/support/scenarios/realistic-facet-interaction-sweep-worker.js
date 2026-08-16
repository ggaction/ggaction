import assert from "node:assert/strict";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { resolveTextBounds, textBoundsIntersect } from "../../../src/core/textMetrics.js";
import { assertGraphicIntegrity } from "../../oracles/graphic-integrity.js";
import { releaseTidyTuesdaySourceCache } from "../datasets/tidytuesday.js";
import { realisticDatasetRoles } from "./realistic-data.js";
import { REALISTIC_ANALYSIS_RECIPES } from "./realistic-recipes.js";

const ANALYSIS_COLUMNS = Object.freeze([2, 3, 4]);
const FACET_SCALES = Object.freeze(["shared", "independent"]);
const FACET_AXES = Object.freeze(["each", "outer"]);
const FACET_INTERACTIONS = Object.freeze(ANALYSIS_COLUMNS.flatMap(columns =>
  FACET_SCALES.flatMap(facetScales =>
    FACET_AXES.map(facetAxes => Object.freeze({
      columns,
      facetScales,
      facetAxes
    }))
  )
));
const analysisRecipe = REALISTIC_ANALYSIS_RECIPES.find(recipe =>
  recipe.id === "realistic-faceted-distribution"
);

function baselineFactors(dataset, domains, overrides = {}) {
  return Object.freeze({
    dataset,
    ...Object.fromEntries(Object.entries(domains).map(([name, domain]) => [name, domain[0]])),
    ...overrides
  });
}

function facetInteractionKey({ columns, facetScales, facetAxes }) {
  return [columns, facetScales, facetAxes].join("/");
}

export function assertFacetGuideGeometry(program, label) {
  let childGuides = 0;
  for (const [childId, child] of Object.entries(program.children)) {
    const title = child.graphicSpec.objects.yAxisTitle;
    const labels = child.graphicSpec.objects.yAxisLabels;
    if (title === undefined && labels === undefined) continue;
    assert.notEqual(title, undefined, `${label}/${childId} title`);
    assert.ok(labels?.items.length > 0, `${label}/${childId} labels`);
    const titleBounds = resolveTextBounds(title.properties);
    for (const item of labels.items) {
      const labelBounds = resolveTextBounds(item.properties);
      assert.equal(
        textBoundsIntersect(titleBounds, labelBounds),
        false,
        `${label}/${childId}/${item.properties.text}`
      );
    }
    childGuides += 1;
  }
  assert.ok(childGuides > 0, `${label} materializes y-axis guides`);
  return childGuides;
}

export function runRealisticFacetInteractionSweep() {
  assert.equal(
    typeof globalThis.gc,
    "function",
    "facet interaction sweep worker requires --expose-gc"
  );
  globalThis.gc();

  let eligibleDatasets = 0;
  let eligibleFieldPairs = 0;
  let builds = 0;
  let assignmentIndex = 0;
  const builtFieldPairs = new Set();
  const interactionEvidence = new Map(FACET_INTERACTIONS.map(interaction => [
    facetInteractionKey(interaction),
    { occurrences: 0, datasets: new Set() }
  ]));
  for (const dataset of analysisRecipe.datasets) {
    try {
      const domains = analysisRecipe.factorsForDataset(dataset);
      if (domains === undefined) continue;
      assert.deepEqual(domains.columns, ANALYSIS_COLUMNS, `${dataset}/columns domain`);
      assert.deepEqual(domains.facetScales, FACET_SCALES, `${dataset}/facetScales domain`);
      assert.deepEqual(domains.facetAxes, FACET_AXES, `${dataset}/facetAxes domain`);

      eligibleDatasets += 1;
      eligibleFieldPairs += domains.fieldPair.length;
      const roles = realisticDatasetRoles(dataset);
      for (const fieldPair of domains.fieldPair) {
        const interaction = FACET_INTERACTIONS[assignmentIndex % FACET_INTERACTIONS.length];
        assignmentIndex += 1;
        assert.ok(
          domains.columns.includes(interaction.columns),
          `${dataset}/${fieldPair.bindingId}/columns advertised membership`
        );
        assert.ok(
          domains.facetScales.includes(interaction.facetScales),
          `${dataset}/${fieldPair.bindingId}/facetScales advertised membership`
        );
        assert.ok(
          domains.facetAxes.includes(interaction.facetAxes),
          `${dataset}/${fieldPair.bindingId}/facetAxes advertised membership`
        );
        const fieldPairKey = `${dataset}/${fieldPair.bindingId}`;
        assert.equal(builtFieldPairs.has(fieldPairKey), false, `${fieldPairKey}/unique`);
        const factors = baselineFactors(dataset, domains, {
          fieldPair,
          ...interaction,
          gap: 16,
          padding: 18
        });
        const label = [
          fieldPairKey,
          interaction.columns,
          interaction.facetScales,
          interaction.facetAxes
        ].join("/");
        try {
          const program = analysisRecipe.build(factors);
          assertGraphicIntegrity(program, label);
          assertFacetGuideGeometry(program, label);
          const effects = new Map(analysisRecipe.observeFactors(program, factors).map(effect =>
            [effect.factor, effect]
          ));
          assert.deepEqual(effects.get("fieldPair")?.value, fieldPair, `${label}/fieldPair`);
          assert.equal(
            effects.get("fieldPair")?.evidence,
            "provenance.fieldBindings",
            `${label}/fieldPair evidence`
          );
          for (const name of ["columns", "facetScales", "facetAxes"]) {
            assert.equal(effects.get(name)?.value, factors[name], `${label}/${name}`);
          }
          const provenance = analysisRecipe.describe(factors).provenance;
          assert.equal(
            provenance.fieldBindings.measure,
            roles.measures[fieldPair.measureIndex],
            `${label}/measure provenance`
          );
          assert.equal(
            provenance.fieldBindings.dimension,
            roles.dimensions[fieldPair.dimensionIndex],
            `${label}/dimension provenance`
          );

          const evidence = interactionEvidence.get(facetInteractionKey(interaction));
          evidence.occurrences += 1;
          evidence.datasets.add(dataset);
          builtFieldPairs.add(fieldPairKey);
          builds += 1;
        } finally {
          analysisRecipe.releaseResolution(factors);
        }
      }
    } finally {
      releaseTidyTuesdaySourceCache(dataset);
      globalThis.gc();
    }
  }
  assert.equal(eligibleDatasets, 38);
  assert.equal(eligibleFieldPairs, 548);
  assert.equal(assignmentIndex, eligibleFieldPairs);
  assert.equal(builtFieldPairs.size, eligibleFieldPairs);
  assert.equal(builds, 548);
  for (const [key, evidence] of interactionEvidence) {
    assert.ok(evidence.occurrences >= 5, `${key} occurrences`);
    assert.ok(evidence.datasets.size >= 3, `${key} datasets`);
  }
  globalThis.gc();
  return Object.freeze({
    eligibleDatasets,
    eligibleFieldPairs,
    builds,
    interactions: Object.fromEntries([...interactionEvidence].map(([key, evidence]) => [
      key,
      { occurrences: evidence.occurrences, datasets: evidence.datasets.size }
    ])),
    childMaxRssKiB: process.resourceUsage().maxRSS
  });
}

if (
  process.argv[1] &&
  fileURLToPath(import.meta.url) === path.resolve(process.argv[1])
) {
  try {
    const report = runRealisticFacetInteractionSweep();
    process.stdout.write(`${JSON.stringify(report)}\n`);
  } catch (error) {
    process.stderr.write(`${error?.stack ?? error}\n`);
    process.exitCode = 1;
  }
}
