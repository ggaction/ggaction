import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { createCanvas } from "@napi-rs/canvas";

import { resolveTextBounds, textBoundsIntersect } from "../../src/core/textMetrics.js";
import { render } from "../../src/renderers/canvas/index.js";
import { renderToPDF } from "../../src/renderers/pdf.js";
import { renderToPNG } from "../../src/renderers/png.js";
import { renderToSVG } from "../../src/renderers/svg.js";
import { assertAnalyticLayerIntegrity } from "../oracles/analytic-layer-integrity.js";
import { assertGraphicIntegrity } from "../oracles/graphic-integrity.js";
import { assertSvgIntegrity } from "../oracles/svg-integrity.js";
import { releaseTidyTuesdaySourceCache } from "../support/datasets/tidytuesday.js";
import { REALISTIC_LIFECYCLE_SCENARIO_RECIPES } from
  "../support/scenarios/lifecycle-recipes.js";
import { REALISTIC_GUIDE_SCALE_RECIPES } from
  "../support/scenarios/realistic-guide-scale-recipes.js";

const MAX_RASTER_PIXELS = 16_777_216;
const CHILD_OLD_SPACE_MIB = 224;
const CHILD_MAX_RSS_KIB = 512 * 1024;
const CHILD_TIMEOUT_MS = 60_000;
const GUIDE_RECIPE = "realistic-guide-scale-facet-policies";
const LIFECYCLE_RECIPE = "realistic-action-facet-scale-lifecycle";
const PNG_SIGNATURE = Object.freeze([137, 80, 78, 71, 13, 10, 26, 10]);

const GUIDE_CASES = Object.freeze([
  ["realistic-guide-scale-facet-policies-5eaef289ad52", "tt-london-marathon-winners", "curated:primary", "independent-then-shared-start"],
  ["realistic-guide-scale-facet-policies-21f16d70759c", "tt-us-tornadoes", "eligible:wid-by-fc", "shared-then-independent-center"],
  ["realistic-guide-scale-facet-policies-7d0ee0ad7b37", "tt-movie-profit", "eligible:domestic_gross-by-genre", "independent-then-shared-end"],
  ["realistic-guide-scale-facet-policies-520d6ed8c5c2", "tt-movie-profit", "eligible:production_budget-by-genre", "independent-then-shared-start"],
  ["realistic-guide-scale-facet-policies-877e33393ee7", "tt-tv-ratings", "eligible:share-by-genres", "shared-then-independent-center"],
  ["realistic-guide-scale-facet-policies-14ef0378ae56", "tt-space-launches", "eligible:JD-by-type", "independent-then-shared-end"],
  ["realistic-guide-scale-facet-policies-cf1decda5729", "tt-space-launches", "eligible:JD-by-agency", "independent-then-shared-start"],
  ["realistic-guide-scale-facet-policies-4e5a9968924b", "tt-space-launches", "eligible:JD-by-agency_type", "shared-then-independent-center"],
  ["realistic-guide-scale-facet-policies-b9c9cbcf69cf", "tt-meteorites", "eligible:long-by-name_type", "independent-then-shared-end"],
  ["realistic-guide-scale-facet-policies-f2385acc745b", "tt-meteorites", "eligible:long-by-fall", "independent-then-shared-start"],
  ["realistic-guide-scale-facet-policies-e42d6626d497", "tt-meteorites", "eligible:long-by-class", "shared-then-independent-center"],
  ["realistic-guide-scale-facet-policies-80dee462854d", "tt-video-games", "eligible:price-by-owners", "independent-then-shared-end"],
  ["realistic-guide-scale-facet-policies-74992a2f0393", "tt-video-games", "eligible:price-by-publisher", "independent-then-shared-start"],
  ["realistic-guide-scale-facet-policies-6558d142aa92", "tt-nuclear-explosions", "eligible:yield_upper-by-country", "shared-then-independent-center"],
  ["realistic-guide-scale-facet-policies-8ff566d4db9a", "tt-nuclear-explosions", "eligible:longitude-by-country", "independent-then-shared-end"],
  ["realistic-guide-scale-facet-policies-591900fe66ed", "tt-plastics", "eligible:ps-by-parent_company", "independent-then-shared-start"],
  ["realistic-guide-scale-facet-policies-997ab74436b8", "tt-animal-rescues", "eligible:incident_notional_cost-by-borough", "independent-then-shared-end"],
  ["realistic-guide-scale-facet-policies-40eecdc8d53c", "tt-spiders", "eligible:year-by-genus", "shared-then-independent-center"],
  ["realistic-guide-scale-facet-policies-930b87d9ef97", "tt-spiders", "eligible:year-by-family", "shared-then-independent-center"],
  ["realistic-guide-scale-facet-policies-b27faf8866fd", "tt-dog-breed-traits", "eligible:Affectionate With Family-by-Coat Type", "independent-then-shared-end"],
  ["realistic-guide-scale-facet-policies-27a356f6672a", "tt-eurovision", "eligible:total_points-by-section", "independent-then-shared-start"],
  ["realistic-guide-scale-facet-policies-7926acf36dae", "tt-cats-uk", "eligible:height_above_ellipsoid-by-tag_id", "independent-then-shared-end"],
  ["realistic-guide-scale-facet-policies-cf4f802e87b3", "tt-haunted-places", "eligible:city_longitude-by-state", "independent-then-shared-start"],
  ["realistic-guide-scale-facet-policies-be6f9ab31482", "tt-groundhogs", "eligible:longitude-by-type", "shared-then-independent-center"],
  ["realistic-guide-scale-facet-policies-7a8241eacfa3", "tt-trash-wheel", "eligible:GlassBottles-by-Name", "shared-then-independent-center"]
].map(([id, dataset, fieldPair, variant]) => Object.freeze({
  id,
  recipe: GUIDE_RECIPE,
  dataset,
  fieldPair,
  variant
})));

const LIFECYCLE_CASES = Object.freeze([
  ["realistic-action-facet-scale-lifecycle-4c77a5ebae6e", "tt-us-births", 2, "shared", "outer"],
  ["realistic-action-facet-scale-lifecycle-3888706dbf95", "tt-tv-ratings", 2, "shared", "each"],
  ["realistic-action-facet-scale-lifecycle-0d7278977582", "tt-spotify-songs", 2, "independent", "each"],
  ["realistic-action-facet-scale-lifecycle-fdd0e58b1467", "tt-food-consumption", 3, "independent", "outer"],
  ["realistic-action-facet-scale-lifecycle-d6469182419b", "tt-tour-de-france-winners", 3, "shared", "each"],
  ["realistic-action-facet-scale-lifecycle-734e73af7a44", "tt-volcanoes", 2, "independent", "each"],
  ["realistic-action-facet-scale-lifecycle-692927a06aa4", "tt-big-mac", 2, "shared", "outer"],
  ["realistic-action-facet-scale-lifecycle-483b811e5be2", "tt-transit-costs", 3, "independent", "outer"],
  ["realistic-action-facet-scale-lifecycle-7ef1005e798d", "tt-plastics", 3, "shared", "each"],
  ["realistic-action-facet-scale-lifecycle-a6e29c62b765", "tt-formula-one-races", 2, "shared", "outer"],
  ["realistic-action-facet-scale-lifecycle-aec4eaed908a", "tt-spiders", 3, "independent", "outer"],
  ["realistic-action-facet-scale-lifecycle-07231abb73aa", "tt-spiders", 2, "independent", "each"],
  ["realistic-action-facet-scale-lifecycle-7595b916fd5e", "tt-spiders", 2, "shared", "outer"]
].map(([id, dataset, columns, yScale, axes]) => Object.freeze({
  id,
  recipe: LIFECYCLE_RECIPE,
  dataset,
  columns,
  yScale,
  axes
})));

const RASTER_CASES = Object.freeze([...GUIDE_CASES, ...LIFECYCLE_CASES]);

function recipeFor(id) {
  const recipes = id === GUIDE_RECIPE
    ? REALISTIC_GUIDE_SCALE_RECIPES
    : REALISTIC_LIFECYCLE_SCENARIO_RECIPES;
  const recipe = recipes.find(value => value.id === id);
  assert.notEqual(recipe, undefined, id);
  return recipe;
}

function factorsFor(definition, recipe) {
  const domains = recipe.factorsForDataset(definition.dataset);
  assert.notEqual(domains, undefined, `${definition.id} eligibility`);
  if (definition.recipe === GUIDE_RECIPE) {
    const fieldPair = domains.fieldPair.find(value =>
      value.bindingId === definition.fieldPair
    );
    const variant = domains.variant.find(value => value.id === definition.variant);
    assert.notEqual(fieldPair, undefined, `${definition.id} fieldPair`);
    assert.notEqual(variant, undefined, `${definition.id} variant`);
    return Object.freeze({ dataset: definition.dataset, fieldPair, variant });
  }
  for (const factor of ["columns", "yScale", "axes"]) {
    assert.ok(domains[factor].includes(definition[factor]), `${definition.id} ${factor}`);
  }
  return Object.freeze({
    dataset: definition.dataset,
    columns: definition.columns,
    yScale: definition.yScale,
    axes: definition.axes
  });
}

function textProperties(object) {
  if (object?.type === "text") {
    return object.items === undefined
      ? [object.properties]
      : object.items.map(item => item.properties);
  }
  return (object?.items ?? [])
    .filter(item => item.type === "text")
    .map(item => item.properties);
}

function assertFacetText(program, definition, svg) {
  const headerObject = Object.entries(program.graphicSpec.objects).find(([
    id,
    object
  ]) => id.endsWith("-headers") && object.type === "collection")?.[1];
  assert.notEqual(headerObject, undefined, `${definition.id} headers`);
  const headers = textProperties(headerObject);
  const expected = program.compositionSpec.facet.values.map(String);
  assert.deepEqual(headers.map(value => value.text), expected, `${definition.id} header text`);
  assert.ok(headers.every(value => value.fontSize >= 12), `${definition.id} header size`);

  const visibleText = Object.values(program.graphicSpec.objects).flatMap(textProperties);
  assert.ok(visibleText.length > headers.length, `${definition.id} visible text`);
  assert.ok(visibleText.every(value => value.fontSize >= 11), `${definition.id} text size`);
  for (const value of expected) {
    const escaped = value.replaceAll("&", "&amp;").replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;");
    assert.ok(svg.includes(`>${escaped}</text>`), `${definition.id} SVG header ${value}`);
  }
}

function assertAxisLabelsDoNotOverlapTitles(program, definition) {
  let checked = 0;
  for (const child of Object.values(program.children)) {
    for (const axis of ["x", "y"]) {
      const title = child.graphicSpec.objects[`${axis}AxisTitle`];
      const labels = child.graphicSpec.objects[`${axis}AxisLabels`];
      if (title === undefined || labels === undefined) continue;
      const titleBounds = resolveTextBounds(title.properties);
      const labelBounds = labels.items.map(item => resolveTextBounds(item.properties));
      assert.ok(labelBounds.length > 0, `${definition.id} ${axis} labels`);
      for (const bounds of labelBounds) {
        assert.equal(
          textBoundsIntersect(titleBounds, bounds),
          false,
          `${definition.id} ${axis} title/label overlap`
        );
      }
      checked += 1;
    }
  }
  assert.ok(checked > 0, `${definition.id} axis label geometry`);
}

function assertPanelGeometry(program, definition, factors) {
  const expectedWidth = definition.recipe === GUIDE_RECIPE
    ? 1_900
    : 1_300 + factors.columns * 200;
  const expectedHeight = definition.recipe === GUIDE_RECIPE ? 1_300 : 900;
  const expectedXSpan = definition.recipe === GUIDE_RECIPE
    ? 1_100
    : expectedWidth - 520;
  const expectedYSpan = definition.recipe === GUIDE_RECIPE ? 650 : 440;
  for (const child of Object.values(program.children)) {
    const canvas = child.graphicSpec.objects.canvas.properties;
    assert.deepEqual(
      { width: canvas.width, height: canvas.height },
      { width: expectedWidth, height: expectedHeight },
      `${definition.id} cell Canvas`
    );
    assert.equal(
      Math.abs(child.resolvedScales.x.range.at(-1) - child.resolvedScales.x.range[0]),
      expectedXSpan,
      `${definition.id} x plot span`
    );
    assert.equal(
      Math.abs(child.resolvedScales.y.range.at(-1) - child.resolvedScales.y.range[0]),
      expectedYSpan,
      `${definition.id} y plot span`
    );
  }
}

function assertNonBlankCanvas(canvas, definition) {
  const scale = Math.min(1, 160 / Math.max(canvas.width, canvas.height));
  const width = Math.max(1, Math.round(canvas.width * scale));
  const height = Math.max(1, Math.round(canvas.height * scale));
  const sample = createCanvas(width, height);
  const context = sample.getContext("2d");
  context.drawImage(canvas, 0, 0, width, height);
  const pixels = context.getImageData(0, 0, width, height).data;
  const colors = new Set();
  for (let index = 0; index < pixels.length && colors.size < 2; index += 4) {
    colors.add(
      `${pixels[index]},${pixels[index + 1]},${pixels[index + 2]},${pixels[index + 3]}`
    );
  }
  assert.ok(colors.size >= 2, `${definition.id} Canvas is blank`);
}

async function renderCase(definition) {
  const recipe = recipeFor(definition.recipe);
  const factors = factorsFor(definition, recipe);
  let directory;
  try {
    const program = recipe.build(factors);
    const metadata = recipe.describe(factors);
    assertGraphicIntegrity(program, definition.id);
    assertAnalyticLayerIntegrity(program, definition.id);
    assert.equal(program.compositionSpec.type, "facet", definition.id);
    assert.equal(
      program.compositionSpec.children.length,
      program.compositionSpec.facet.values.length,
      `${definition.id} facet cells`
    );
    assertPanelGeometry(program, definition, factors);
    assertAxisLabelsDoNotOverlapTitles(program, definition);

    const target = program.graphicSpec.objects.canvas.properties;
    const pixels = target.width * target.height;
    assert.ok(Number.isSafeInteger(pixels), `${definition.id} integer pixels`);
    assert.ok(pixels <= MAX_RASTER_PIXELS, `${definition.id} raster pixel bound`);

    const svg = renderToSVG(program, {
      title: metadata.title,
      description: metadata.analysisQuestion
    });
    assertSvgIntegrity(svg, definition.id);
    assert.match(
      svg,
      new RegExp(`^<svg[^>]+width="${target.width}" height="${target.height}"`),
      definition.id
    );
    assertFacetText(program, definition, svg);

    const canvas = createCanvas(1, 1);
    render(program, canvas.getContext("2d"), { pixelRatio: 1 });
    assert.deepEqual(
      { width: canvas.width, height: canvas.height },
      { width: target.width, height: target.height },
      `${definition.id} Canvas dimensions`
    );
    assertNonBlankCanvas(canvas, definition);
    canvas.width = 1;
    canvas.height = 1;

    directory = await mkdtemp(path.join(tmpdir(), "ggaction-facet-raster-"));
    const pngOutput = path.join(directory, `${definition.id}.png`);
    const png = await renderToPNG(program, { output: pngOutput, pixelRatio: 1 });
    let pngBytes = await readFile(pngOutput);
    assert.deepEqual([...pngBytes.subarray(0, 8)], PNG_SIGNATURE, definition.id);
    assert.deepEqual(
      {
        width: png.width,
        height: png.height,
        headerWidth: pngBytes.readUInt32BE(16),
        headerHeight: pngBytes.readUInt32BE(20),
        pixelRatio: png.pixelRatio
      },
      {
        width: target.width,
        height: target.height,
        headerWidth: target.width,
        headerHeight: target.height,
        pixelRatio: 1
      },
      `${definition.id} PNG dimensions`
    );
    pngBytes = undefined;
    globalThis.gc?.();

    const pdfOutput = path.join(directory, `${definition.id}.pdf`);
    const pdf = await renderToPDF(program, {
      output: pdfOutput,
      metadata: { title: metadata.title }
    });
    const pdfBytes = await readFile(pdfOutput);
    const pdfSource = pdfBytes.toString("latin1");
    assert.deepEqual(
      { width: pdf.width, height: pdf.height, pages: pdf.pages },
      { width: target.width, height: target.height, pages: 1 },
      `${definition.id} PDF dimensions`
    );
    assert.match(pdfSource, /^%PDF-/u, `${definition.id} PDF signature`);
    assert.match(pdfSource, /%%EOF\s*$/u, `${definition.id} PDF trailer`);
    assert.ok(
      pdfSource.includes(`/MediaBox [0 0 ${target.width} ${target.height}]`),
      `${definition.id} PDF MediaBox`
    );

    return Object.freeze({
      id: definition.id,
      recipe: definition.recipe,
      dataset: definition.dataset,
      width: target.width,
      height: target.height,
      pixels,
      facetCount: program.compositionSpec.children.length,
      svgBytes: Buffer.byteLength(svg),
      pngBytes: png.bytes,
      pdfBytes: pdf.bytes,
      maxRssKiB: process.resourceUsage().maxRSS
    });
  } finally {
    recipe.releaseResolution?.(factors);
    releaseTidyTuesdaySourceCache(definition.dataset);
    if (directory !== undefined) {
      await rm(directory, { recursive: true, force: true });
    }
    globalThis.gc?.();
  }
}

function boundedCaseGroups() {
  const groups = new Map();
  for (const [index, definition] of RASTER_CASES.entries()) {
    const key = `${definition.recipe}\0${definition.dataset}`;
    const indexes = groups.get(key) ?? [];
    indexes.push(index);
    groups.set(key, indexes);
  }
  return [...groups.values()];
}

function runBoundedCases(indexes) {
  const result = spawnSync(process.execPath, [
    "--expose-gc",
    `--max-old-space-size=${CHILD_OLD_SPACE_MIB}`,
    fileURLToPath(import.meta.url)
  ], {
    encoding: "utf8",
    env: {
      ...process.env,
      GGACTION_FACET_RASTER_CASES: indexes.join(",")
    },
    maxBuffer: 1024 * 1024,
    timeout: CHILD_TIMEOUT_MS
  });
  assert.equal(
    result.status,
    0,
    `facet raster child ${indexes.join(",")}: ${result.error?.message ?? result.stderr}`
  );
  assert.equal(
    result.signal,
    null,
    `facet raster child ${indexes.join(",")} signal`
  );
  const summaries = JSON.parse(result.stdout.trim());
  assert.equal(summaries.length, indexes.length, "facet raster child summaries");
  for (const summary of summaries) {
    assert.ok(summary.maxRssKiB <= CHILD_MAX_RSS_KIB, `${summary.id} child max RSS`);
  }
  return summaries;
}

const childCases = process.env.GGACTION_FACET_RASTER_CASES;
if (childCases !== undefined) {
  const indexes = childCases.split(",").map(Number);
  assert.ok(indexes.length > 0 && indexes.every(index =>
    Number.isSafeInteger(index) && index >= 0 && index < RASTER_CASES.length
  ));
  const summaries = [];
  for (const index of indexes) summaries.push(await renderCase(RASTER_CASES[index]));
  process.stdout.write(`${JSON.stringify(summaries)}\n`);
} else {
  test("renders every formerly oversized realistic facet through SVG, Canvas, PNG, and PDF", () => {
    assert.equal(GUIDE_CASES.length, 25);
    assert.equal(LIFECYCLE_CASES.length, 13);
    assert.equal(new Set(RASTER_CASES.map(value => value.id)).size, 38);

    const groups = boundedCaseGroups();
    assert.equal(groups.length, 28);
    const results = groups.flatMap(runBoundedCases);
    assert.ok(results.every(value => value.pixels <= MAX_RASTER_PIXELS));
    assert.ok(results.every(value =>
      value.svgBytes > 0 && value.pngBytes > 0 && value.pdfBytes > 0
    ));
    assert.equal(
      Math.max(...results.filter(value => value.recipe === GUIDE_RECIPE)
        .map(value => value.pixels)),
      16_120_420
    );
    assert.equal(
      Math.max(...results.filter(value => value.recipe === LIFECYCLE_RECIPE)
        .map(value => value.pixels)),
      15_831_784
    );
  });
}
