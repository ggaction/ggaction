import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import test from "node:test";

import { resolveTextBounds, textBoundsIntersect } from "../../src/core/textMetrics.js";
import { renderToSVG } from "../../src/renderers/svg.js";
import { assertAnalyticLayerIntegrity } from "../oracles/analytic-layer-integrity.js";
import { assertGraphicIntegrity } from "../oracles/graphic-integrity.js";
import { assertSvgIntegrity } from "../oracles/svg-integrity.js";
import { releaseTidyTuesdaySourceCache } from "../support/datasets/tidytuesday.js";
import { REALISTIC_LIFECYCLE_SCENARIO_RECIPES } from
  "../support/scenarios/lifecycle-recipes.js";
import { REALISTIC_ANALYSIS_RECIPES } from
  "../support/scenarios/realistic-recipes.js";

const LIFECYCLE_COLUMNS = Object.freeze([2, 3]);
const ANALYSIS_COLUMNS = Object.freeze([2, 3, 4]);
const CHRISTMAS_SONG_LABELS = Object.freeze([
  "JINGLE BELL ROCK",
  "WHITE CHRISTMAS",
  "THE CHIPMUNK SONG (CHRISTMAS DON'T BE LATE)",
  "ROCKIN' AROUND THE CHRISTMAS TREE",
  "THIS ONE'S FOR THE CHILDREN",
  "ALL I WANT FOR CHRISTMAS IS YOU",
  "BETTER DAYS",
  "MISTLETOE"
]);
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

function assertFacetGuideGeometry(program, label) {
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

test("reserves data-aware facet guide space for the exact Christmas-song case", () => {
  const dataset = "tt-christmas-songs";
  let factors;
  try {
    const domains = analysisRecipe.factorsForDataset(dataset);
    const fieldPair = domains.fieldPair.find(value =>
      value.bindingId === "eligible:peak_position-by-song"
    );
    assert.ok(fieldPair, "the authentic song binding remains eligible");
    factors = Object.freeze({
      dataset,
      fieldPair,
      titleAlign: "left",
      palette: "goldorange",
      opacity: 0.9,
      columns: 2,
      gap: 16,
      padding: 18,
      facetScales: "independent",
      facetAxes: "each"
    });
    const program = analysisRecipe.build(factors);
    const metadata = analysisRecipe.describe(factors);
    assertGraphicIntegrity(program, "tt-christmas-songs-independent-facets");
    assertAnalyticLayerIntegrity(program, "tt-christmas-songs-independent-facets");
    assert.equal(assertFacetGuideGeometry(
      program,
      "tt-christmas-songs-independent-facets"
    ), CHRISTMAS_SONG_LABELS.length);

    const canvas = program.trace.children.find(node => node.op === "createCanvas").args;
    const guides = program.trace.children.find(node => node.op === "createGuides").args;
    assert.deepEqual(canvas, {
      width: 725,
      height: 420,
      margin: { top: 90, right: 100, bottom: 120, left: 325 }
    });
    assert.deepEqual(guides.axes.y, { title: { text: "Song", offset: 309 } });
    assert.equal(canvas.width - canvas.margin.left - canvas.margin.right, 300);
    assert.equal(program.compositionSpec.facet.scales.y, "independent");
    assert.equal(program.compositionSpec.facet.guides.axes, "each");

    const materializedLabels = Object.values(program.children).flatMap(child =>
      child.graphicSpec.objects.yAxisLabels.items.map(item => item.properties.text)
    );
    assert.deepEqual(materializedLabels, CHRISTMAS_SONG_LABELS);
    assert.deepEqual(metadata.sourceDatasetIds, [dataset]);
    assert.deepEqual(metadata.provenance.fieldBindings, {
      measure: "peak_position",
      dimension: "song",
      secondaryDimension: "performer",
      temporal: "year",
      order: "year",
      identifier: "songid",
      label: "song"
    });

    const effects = new Map(analysisRecipe.observeFactors(program, factors).map(effect =>
      [effect.factor, effect.evidence]
    ));
    assert.equal(
      effects.get("facetScales"),
      "trace.facet.scales+final-semantic:composition.facet.scales"
    );
    assert.equal(
      effects.get("facetAxes"),
      "trace.facet.guides.axes+final-semantic:composition.facet.guides.axes"
    );
    assert.equal(
      effects.get("columns"),
      "final-semantic-or-graphic:facet.columns+canvas.width+composition+child-x-range"
    );

    const svg = renderToSVG(program, {
      title: metadata.title,
      description: metadata.analysisQuestion
    });
    assertSvgIntegrity(svg, "tt-christmas-songs-independent-facets");
    for (const song of CHRISTMAS_SONG_LABELS) assert.ok(svg.includes(song), song);
  } finally {
    if (factors !== undefined) analysisRecipe.releaseResolution(factors);
    releaseTidyTuesdaySourceCache(dataset);
  }
});

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

test("covers every eligible facet binding plus every column-scale-axis interaction", () => {
  let eligibleDatasets = 0;
  let eligibleFieldPairs = 0;
  let builds = 0;
  for (const dataset of analysisRecipe.datasets) {
    try {
      const domains = analysisRecipe.factorsForDataset(dataset);
      if (domains === undefined) continue;
      eligibleDatasets += 1;
      eligibleFieldPairs += domains.fieldPair.length;
      const selections = new Map();
      const add = (fieldPair, columns, facetScales, facetAxes) => {
        const key = [fieldPair.bindingId, columns, facetScales, facetAxes].join("/");
        selections.set(key, { fieldPair, columns, facetScales, facetAxes });
      };
      for (const fieldPair of domains.fieldPair) {
        add(fieldPair, 2, "independent", "each");
      }
      for (const columns of domains.columns) {
        for (const facetScales of domains.facetScales) {
          for (const facetAxes of domains.facetAxes) {
            add(domains.fieldPair[0], columns, facetScales, facetAxes);
          }
        }
      }

      for (const selection of selections.values()) {
        const factors = baselineFactors(dataset, domains, {
          ...selection,
          gap: 16,
          padding: 18
        });
        const label = [
          dataset,
          selection.fieldPair.bindingId,
          selection.columns,
          selection.facetScales,
          selection.facetAxes
        ].join("/");
        try {
          const program = analysisRecipe.build(factors);
          assertGraphicIntegrity(program, label);
          assertFacetGuideGeometry(program, label);
          const effects = new Map(analysisRecipe.observeFactors(program, factors).map(effect =>
            [effect.factor, effect]
          ));
          for (const name of ["columns", "facetScales", "facetAxes"]) {
            assert.equal(effects.get(name)?.value, factors[name], `${label}/${name}`);
          }
          builds += 1;
        } finally {
          analysisRecipe.releaseResolution(factors);
        }
      }
    } finally {
      releaseTidyTuesdaySourceCache(dataset);
    }
  }
  assert.equal(eligibleDatasets, 38);
  assert.equal(eligibleFieldPairs, 548);
  assert.equal(builds, 966);
});
