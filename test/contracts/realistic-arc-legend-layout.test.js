import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import test from "node:test";

import { renderToSVG } from "../../src/renderers/svg.js";
import { assertAnalyticLayerIntegrity } from
  "../oracles/analytic-layer-integrity.js";
import { assertGraphicIntegrity } from "../oracles/graphic-integrity.js";
import { assertSvgIntegrity } from "../oracles/svg-integrity.js";
import { releaseTidyTuesdaySourceCache } from
  "../support/datasets/tidytuesday.js";
import { REALISTIC_ANALYSIS_RECIPES } from
  "../support/scenarios/realistic-recipes.js";

const ARC_RECIPE_IDS = Object.freeze([
  "realistic-category-donut",
  "realistic-padded-donut"
]);
const LEGEND_POSITIONS = Object.freeze(["right", "bottom", "left", "top"]);
const VOLCANO_LABELS = Object.freeze([
  "Subduction zone / Continental crust (>25 km)",
  "Intraplate / Continental crust (>25 km)",
  "Subduction zone / Oceanic crust (< 15 km)",
  "Rift zone / Continental crust (>25 km)",
  "Rift zone / Oceanic crust (< 15 km)",
  "Subduction zone / Intermediate crust (15-25 km)",
  "Subduction zone / Crustal thickness unknown",
  "Rift zone / Intermediate crust (15-25 km)"
]);

function recipeById(id) {
  const recipe = REALISTIC_ANALYSIS_RECIPES.find(candidate => candidate.id === id);
  assert.ok(recipe, `missing ${id}`);
  return recipe;
}

function directArgs(program, operation) {
  return program.trace.children.find(node => node.op === operation)?.args;
}

function fingerprint(program) {
  return createHash("sha256")
    .update(JSON.stringify(program.semanticSpec))
    .update("\0")
    .update(JSON.stringify(program.graphicSpec))
    .digest("hex");
}

function xmlText(value) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

test("lays out the exact volcano padded-donut top legend without changing source labels", () => {
  const dataset = "tt-volcanoes";
  const recipe = recipeById("realistic-padded-donut");
  let factors;
  try {
    const domains = recipe.factorsForDataset(dataset);
    const fieldPair = domains.fieldPair.find(value =>
      value.bindingId === "eligible:latitude-by-tectonic_settings"
    );
    assert.ok(fieldPair, "the authentic volcano binding remains eligible");
    factors = Object.freeze({
      dataset,
      fieldPair,
      titleAlign: "left",
      aggregate: "median",
      palette: "paired",
      legendPosition: "top",
      opacity: 1,
      padRatio: 0.05
    });

    const program = recipe.build(factors);
    const metadata = recipe.describe(factors);
    assertAnalyticLayerIntegrity(program, "tt-volcanoes-padded-donut-top");
    assertGraphicIntegrity(program, "tt-volcanoes-padded-donut-top");

    assert.deepEqual(directArgs(program, "createGuides").legend, {
      position: "top",
      title: "Tectonic Settings",
      columns: 3
    });
    assert.deepEqual(
      program.graphicSpec.objects.colorLegendLabels.items.map(item =>
        item.properties.text
      ),
      VOLCANO_LABELS
    );
    assert.deepEqual(
      program.semanticSpec.datasets[0].values.map(row => row.category),
      VOLCANO_LABELS
    );
    assert.deepEqual(metadata.sourceDatasetIds, [dataset]);
    assert.deepEqual(metadata.provenance.fieldBindings, {
      measure: "latitude",
      dimension: "tectonic_settings"
    });

    const effects = new Map(recipe.observeFactors(program, factors).map(effect =>
      [effect.factor, effect]
    ));
    assert.deepEqual([...effects.keys()].sort(), [
      "aggregate", "fieldPair", "legendPosition", "opacity", "padRatio", "palette",
      "titleAlign"
    ]);
    assert.deepEqual(effects.get("legendPosition"), {
      factor: "legendPosition",
      value: "top",
      evidence:
        "trace.createGuides.legend.position+final-graphic:colorLegendLabels.position"
    });

    const svg = renderToSVG(program, {
      title: metadata.title,
      description: metadata.analysisQuestion
    });
    assertSvgIntegrity(svg, "tt-volcanoes-padded-donut-top");
    for (const label of VOLCANO_LABELS) assert.ok(svg.includes(xmlText(label)), label);

    const topFingerprint = fingerprint(program);
    recipe.releaseResolution(factors);
    factors = Object.freeze({ ...factors, legendPosition: "right" });
    const right = recipe.build(factors);
    assertGraphicIntegrity(right, "tt-volcanoes-padded-donut-right");
    assert.notEqual(fingerprint(right), topFingerprint);
    assert.equal(
      recipe.observeFactors(right, factors).find(effect =>
        effect.factor === "legendPosition"
      )?.evidence,
      "trace.createGuides.legend.position+final-graphic:colorLegendLabels.position"
    );
  } finally {
    if (factors !== undefined) recipe.releaseResolution(factors);
    releaseTidyTuesdaySourceCache(dataset);
  }
});

test("builds both arc recipes at every legend position across all fifty TT sources", () => {
  const recipes = ARC_RECIPE_IDS.map(recipeById);
  let builds = 0;
  for (const dataset of recipes[0].datasets) {
    try {
      for (const recipe of recipes) {
        const domains = recipe.factorsForDataset(dataset);
        assert.ok(domains?.fieldPair.length > 0, `${recipe.id}/${dataset} eligible pair`);
        const baseline = { dataset };
        for (const [factor, values] of Object.entries(domains)) baseline[factor] = values[0];
        for (const legendPosition of LEGEND_POSITIONS) {
          const factors = Object.freeze({ ...baseline, legendPosition });
          try {
            const program = recipe.build(factors);
            assertGraphicIntegrity(program, `${recipe.id}/${dataset}/${legendPosition}`);
            assert.equal(directArgs(program, "createGuides").legend.position, legendPosition);
            assert.ok(recipe.observeFactors(program, factors).some(effect =>
              effect.factor === "legendPosition" && effect.value === legendPosition &&
              effect.evidence.includes("final-graphic")
            ));
            builds += 1;
          } finally {
            recipe.releaseResolution(factors);
          }
        }
      }
    } finally {
      releaseTidyTuesdaySourceCache(dataset);
    }
  }
  assert.equal(builds, 50 * ARC_RECIPE_IDS.length * LEGEND_POSITIONS.length);
});
