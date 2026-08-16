import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { renderToSVG } from "../../src/renderers/svg.js";
import { assertAnalyticLayerIntegrity } from "../oracles/analytic-layer-integrity.js";
import { assertGraphicIntegrity } from "../oracles/graphic-integrity.js";
import { assertSvgIntegrity } from "../oracles/svg-integrity.js";
import { releaseTidyTuesdaySourceCache } from "../support/datasets/tidytuesday.js";
import { assertFacetGuideGeometry } from
  "../support/scenarios/realistic-facet-interaction-sweep-worker.js";
import { REALISTIC_LIFECYCLE_SCENARIO_RECIPES } from
  "../support/scenarios/lifecycle-recipes.js";
import { REALISTIC_ANALYSIS_RECIPES } from
  "../support/scenarios/realistic-recipes.js";

const LIFECYCLE_COLUMNS = Object.freeze([2, 3]);
const ANALYSIS_COLUMNS = Object.freeze([2, 3, 4]);
const FACET_INTERACTION_SWEEP_TEST_NAME =
  "covers every eligible facet binding plus every column-scale-axis interaction";
// Cached Node 20.20.2 reference run: 36,219.158417 ms.
const FACET_INTERACTION_SWEEP_BENCHMARK_MS = 36_220;
const FACET_INTERACTION_SWEEP_CHILD_TIMEOUT_MS =
  FACET_INTERACTION_SWEEP_BENCHMARK_MS * 4;
const FACET_INTERACTION_SWEEP_TEST_TIMEOUT_MS =
  FACET_INTERACTION_SWEEP_CHILD_TIMEOUT_MS + 10_000;
const MAX_FACET_INTERACTION_CHILD_RSS_KIB = 512 * 1_024;
const FACET_INTERACTION_SWEEP_WORKER = fileURLToPath(new URL(
  "../support/scenarios/realistic-facet-interaction-sweep-worker.js",
  import.meta.url
));
const EXPECTED_FACET_INTERACTION_OCCURRENCES = Object.freeze({
  "2/shared/each": 46,
  "2/shared/outer": 46,
  "2/independent/each": 46,
  "2/independent/outer": 46,
  "3/shared/each": 46,
  "3/shared/outer": 46,
  "3/independent/each": 46,
  "3/independent/outer": 46,
  "4/shared/each": 45,
  "4/shared/outer": 45,
  "4/independent/each": 45,
  "4/independent/outer": 45
});
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

function runFacetInteractionSweepInDisposableProcess() {
  const child = spawnSync(process.execPath, [
    "--expose-gc",
    "--max-old-space-size=288",
    FACET_INTERACTION_SWEEP_WORKER
  ], {
    encoding: "utf8",
    maxBuffer: 2 * 1_024 * 1_024,
    timeout: FACET_INTERACTION_SWEEP_CHILD_TIMEOUT_MS
  });
  assert.equal(
    child.error,
    undefined,
    child.error?.stack ??
      `facet interaction worker exceeded ${FACET_INTERACTION_SWEEP_CHILD_TIMEOUT_MS} ms`
  );
  assert.equal(child.signal, null, child.stderr || child.stdout);
  assert.equal(child.status, 0, child.stderr || child.stdout);
  assert.equal(child.stderr, "", child.stderr);
  const reportLines = child.stdout.trim().split("\n");
  assert.equal(reportLines.length, 1, child.stdout);
  const resources = JSON.parse(reportLines[0]);
  assert.deepEqual({
    eligibleDatasets: resources.eligibleDatasets,
    eligibleFieldPairs: resources.eligibleFieldPairs,
    builds: resources.builds
  }, {
    eligibleDatasets: 38,
    eligibleFieldPairs: 548,
    builds: 548
  });
  assert.deepEqual(
    Object.fromEntries(Object.entries(resources.interactions).map(([key, evidence]) => [
      key,
      evidence.occurrences
    ])),
    EXPECTED_FACET_INTERACTION_OCCURRENCES
  );
  for (const [key, evidence] of Object.entries(resources.interactions)) {
    assert.ok(evidence.occurrences >= 5, `${key} occurrences`);
    assert.ok(evidence.datasets >= 3, `${key} datasets`);
  }
  assert.equal(
    Number.isSafeInteger(resources.childMaxRssKiB),
    true,
    JSON.stringify(resources)
  );
  assert.ok(
    resources.childMaxRssKiB < MAX_FACET_INTERACTION_CHILD_RSS_KIB,
    `${resources.childMaxRssKiB} < ${MAX_FACET_INTERACTION_CHILD_RSS_KIB} ` +
      "per-process child RSS bound"
  );
}

function columnEffect(result) {
  return result.effects.find(effect => effect.factor === "columns");
}

test("schedules each facet axis policy five times across real datasets", () => {
  const schedule = analysisRecipe.coverageSchedule;
  assert.equal(schedule.factor, "facetAxes");
  assert.equal(schedule.minimumSelections, 10);
  assert.deepEqual(schedule.variantRequirements, [
    { variantId: "each", minimumOccurrences: 5, minimumDatasets: 3 },
    { variantId: "outer", minimumOccurrences: 5, minimumDatasets: 3 }
  ]);

  const datasets = Object.freeze([
    "tt-penguins",
    "tt-us-births",
    "tt-space-launches",
    "tt-nuclear-explosions",
    "tt-christmas-songs"
  ]);
  const assignments = datasets.flatMap(dataset => ["each", "outer"].map(variantId =>
    Object.freeze({ dataset, variantId })
  ));

  const literalEvidence = new Map();
  for (const assignment of assignments) {
    const dataset = assignment.dataset;
    let factors;
    try {
      const domains = analysisRecipe.factorsForDataset(dataset);
      factors = baselineFactors(dataset, domains, {
        facetAxes: assignment.variantId
      });
      const program = analysisRecipe.build(factors);
      const label = `${dataset}/${assignment.variantId}`;
      assertGraphicIntegrity(program, label);
      assertAnalyticLayerIntegrity(program, label);
      assert.equal(program.compositionSpec.facet.guides.axes, assignment.variantId);
      assert.equal(
        analysisRecipe.observeFactors(program, factors).find(effect =>
          effect.factor === "facetAxes"
        )?.evidence,
        "trace.facet.guides.axes+final-semantic:composition.facet.guides.axes"
      );
      assertSvgIntegrity(renderToSVG(program), label);
      const evidence = literalEvidence.get(assignment.variantId) ?? {
        occurrences: 0,
        datasets: new Set()
      };
      evidence.occurrences += 1;
      evidence.datasets.add(dataset);
      literalEvidence.set(assignment.variantId, evidence);
    } finally {
      if (factors !== undefined) analysisRecipe.releaseResolution(factors);
      releaseTidyTuesdaySourceCache(dataset);
    }
  }
  for (const variantId of ["each", "outer"]) {
    assert.equal(literalEvidence.get(variantId)?.occurrences, 5, variantId);
    assert.equal(literalEvidence.get(variantId)?.datasets.size, 5, variantId);
  }
});

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

test(FACET_INTERACTION_SWEEP_TEST_NAME, {
  timeout: FACET_INTERACTION_SWEEP_TEST_TIMEOUT_MS
}, () => {
  runFacetInteractionSweepInDisposableProcess();
});
