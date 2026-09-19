import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { renderToSVG } from "../../src/renderers/svg.js";
import { assertGraphicIntegrity } from "../oracles/graphic-integrity.js";
import {
  buildScenario,
  generateScenarioDescriptors
} from "../support/scenarios/engine.js";
import { assertSvgIntegrity } from "../oracles/svg-integrity.js";
import {
  LIFECYCLE_EXPECTED_ACTIONS,
  LIFECYCLE_SCENARIO_RECIPES
} from "../support/scenarios/lifecycle-recipes.js";

function edgeFactors(recipe, index) {
  return Object.fromEntries(Object.entries(recipe.factors).map(([name, values]) =>
    [name, values.at(index)]
  ));
}

function directTraceOperations(program, operations = new Set()) {
  for (const child of program.trace.children ?? []) operations.add(child.op);
  return operations;
}

function buildLifecycleRecipe(id, overrides = {}) {
  const recipe = LIFECYCLE_SCENARIO_RECIPES.find(candidate => candidate.id === id);
  assert.ok(recipe, `unknown lifecycle recipe: ${id}`);
  return recipe.build({
    dataset: recipe.datasets[0],
    ...edgeFactors(recipe, 0),
    ...overrides
  });
}

function semanticResource(program, collection, id) {
  const resource = program.semanticSpec[collection].find(candidate => candidate.id === id);
  assert.ok(resource, `missing semantic ${collection} resource: ${id}`);
  return resource;
}

function currentDerivedDataset(program, family, id) {
  const current = program.materializationConfigs.data[family]?.[id]?.current;
  assert.equal(typeof current, "string", `missing ${family} owner: ${id}`);
  return semanticResource(program, "datasets", current);
}

function renderedObject(program, id) {
  const object = program.graphicSpec.objects[id];
  assert.ok(object, `missing rendered object: ${id}`);
  return object;
}

function assertRenderedItems(program, id) {
  const object = renderedObject(program, id);
  assert.ok(object.items?.length > 0, `${id} must retain rendered items`);
  return object.items;
}

test("executes deterministic lifecycle recipes through integrity and SVG oracles", () => {
  const operations = new Set();
  let scenarioCount = 0;
  let objectCount = 0;
  let svgBytes = 0;

  for (const recipe of LIFECYCLE_SCENARIO_RECIPES) {
    for (const index of [0, -1]) {
      const factors = {
        dataset: recipe.datasets[0],
        ...edgeFactors(recipe, index)
      };
      const first = recipe.build(factors);
      const replay = recipe.build(factors);
      const label = `${recipe.id}-${index === 0 ? "baseline" : "edge"}`;
      const graphic = assertGraphicIntegrity(first, label);
      const svg = renderToSVG(first, {
        title: label,
        description: `Generated lifecycle scenario for ${recipe.id}.`
      });

      assert.deepEqual(replay.semanticSpec, first.semanticSpec, `${label} semantic replay`);
      assert.deepEqual(replay.graphicSpec, first.graphicSpec, `${label} graphic replay`);
      assert.equal(renderToSVG(replay, {
        title: label,
        description: `Generated lifecycle scenario for ${recipe.id}.`
      }), svg, `${label} SVG replay`);
      assertSvgIntegrity(svg, label);
      directTraceOperations(first, operations);
      scenarioCount += 1;
      objectCount += graphic.objectCount;
      svgBytes += Buffer.byteLength(svg);
    }
  }

  assert.equal(scenarioCount, LIFECYCLE_SCENARIO_RECIPES.length * 2);
  assert.equal(objectCount >= 500, true);
  assert.equal(svgBytes >= 250_000, true);
  assert.deepEqual(
    LIFECYCLE_EXPECTED_ACTIONS.filter(operation => !operations.has(operation)),
    []
  );
});

test("calls every user-facing action directly from a generated scenario root", () => {
  const cards = JSON.parse(readFileSync(
    new URL("../../knowledge/action-cards.json", import.meta.url),
    "utf8"
  )).cards;
  const publicActions = cards
    .filter(card => card.layer === "user-facing")
    .map(card => card.name);
  const descriptors = generateScenarioDescriptors({
    mode: "smoke",
    includeTidyTuesday: false
  });
  const directOperations = new Set();

  for (const descriptor of descriptors) {
    directTraceOperations(buildScenario(descriptor), directOperations);
  }

  assert.equal(publicActions.length, 275);
  for (const operation of ["removeData", "removeScale", "removeCoordinate"]) {
    assert.equal(publicActions.includes(operation), true, operation);
    assert.equal(directOperations.has(operation), true, operation);
  }
  assert.deepEqual(
    publicActions.filter(operation => !directOperations.has(operation)),
    []
  );
});

test("retains direct action effects in final semantic and graphic state", () => {
  const resources = buildLifecycleRecipe("action-direct-data-resources");
  assert.equal(resources.graphicSpec.objects.canvas.properties.width, 920);
  assert.equal(resources.graphicSpec.objects.canvas.properties.background, "#ffffff");
  assert.ok(semanticResource(resources, "datasets", "directDensity").values.length > 0);
  assert.ok(semanticResource(resources, "datasets", "directBins").values.length > 0);
  assert.equal(
    semanticResource(resources, "datasets", "declaredFilter").transform[0].type,
    "filter"
  );
  assert.deepEqual(
    semanticResource(resources, "scales", "manualScale").range,
    [150, 800]
  );
  assert.deepEqual(
    currentDerivedDataset(resources, "computed", "editComputed")
      .values.map(row => row.computed),
    [2, 3, 4, 5]
  );
  assert.deepEqual(
    currentDerivedDataset(resources, "filter", "editFiltered")
      .values.map(row => row.group),
    ["b", "b"]
  );
  assert.deepEqual(
    currentDerivedDataset(resources, "fold", "editFold")
      .transform[0].fields,
    ["a"]
  );
  assert.equal(
    currentDerivedDataset(resources, "summary", "editSummary")
      .values[0].summaryValue,
    10
  );
  assert.deepEqual(
    currentDerivedDataset(resources, "bin", "editBin")
      .transform[0].resolved.boundaries,
    [0, 3, 4]
  );
  assert.equal(
    currentDerivedDataset(resources, "timeUnit", "editTime")
      .transform[0].unit,
    "month"
  );
  assert.equal(
    currentDerivedDataset(resources, "window", "editWindow")
      .transform[0].operations[0].op,
    "rank"
  );
  assert.equal(
    currentDerivedDataset(resources, "density", "editDensity")
      .transform[0].steps,
    10
  );
  assert.equal(
    currentDerivedDataset(resources, "stack", "editStack")
      .transform[0].mode,
    "fill"
  );
  assert.equal(
    currentDerivedDataset(resources, "regression", "editRegression")
      .transform[0].method,
    "polynomial"
  );
  assert.deepEqual(
    currentDerivedDataset(resources, "interval", "editInterval")
      .transform[0],
    {
      type: "interval",
      field: "value",
      groupBy: [],
      center: "median",
      extent: "iqr",
      as: {
        center: "__editInterval_center",
        lower: "__editInterval_lower",
        upper: "__editInterval_upper"
      }
    }
  );
  assert.equal(
    currentDerivedDataset(resources, "ecdf", "editECDF")
      .transform[0].missing,
    "error"
  );
  assert.deepEqual(
    currentDerivedDataset(resources, "normalize", "editNormalized")
      .values.map(row => row.normalized),
    [0, 1 / 3, 2 / 3, 1]
  );
  assert.deepEqual(
    currentDerivedDataset(resources, "complete", "editComplete")
      .values.filter(row => row.category === "c3").map(row => row.group),
    ["a", "b"]
  );
  assert.deepEqual(
    currentDerivedDataset(resources, "impute", "editImputed")
      .values.map(row => row.missing),
    [1, 2, 1, 4]
  );
  assertRenderedItems(resources, "resourcePoints");

  const appearance = buildLifecycleRecipe("action-direct-point-text");
  const points = assertRenderedItems(appearance, "appearancePoints");
  assert.ok(points.every(item => item.properties.radius === 3));
  assert.ok(points.every(item => item.properties.opacity >= 0.2));
  assert.ok(points.every(item => item.properties.opacity <= 0.9));
  assert.deepEqual(semanticResource(appearance, "scales", "stroke").range, {
    palette: "set1"
  });
  assert.equal(assertRenderedItems(appearance, "selectedAppearanceLabels").length, 2);
  assert.equal(appearance.graphicSpec.objects.removableAppearanceLabels, undefined);
  const labels = assertRenderedItems(appearance, "appearanceLabels");
  assert.ok(labels.every(item => item.properties.fill === "#111827"));
  assert.ok(labels.every(item => item.properties.fontSize === 10));
  assert.ok(labels.every(item => item.properties.fontWeight === 700));

  const ranges = buildLifecycleRecipe("action-direct-ranged-marks");
  const ruleLayer = semanticResource(ranges, "layers", "directRules");
  assert.deepEqual(
    Object.keys(ruleLayer.encoding).sort(),
    ["strokeWidth", "x", "x2", "y", "y2"]
  );
  assert.ok(assertRenderedItems(ranges, "directRules").every(item =>
    item.properties.stroke === "#be123c" && item.properties.opacity === 0.55
  ));
  assert.ok(assertRenderedItems(ranges, "directRects").every(item =>
    item.properties.fill === "#93c5fd" && item.properties.opacity === 0.18
  ));
  assertRenderedItems(ranges, "directBands");
  assert.ok(semanticResource(ranges, "layers", "directBands").encoding.x2);

  const horizontalBars = buildLifecycleRecipe("action-direct-bar-offsets");
  assert.ok(semanticResource(horizontalBars, "layers", "offsetBars").encoding.yOffset);
  assert.equal(semanticResource(horizontalBars, "scales", "yOffset").paddingInner, 0.04);
  assert.ok(assertRenderedItems(horizontalBars, "offsetBars").every(item =>
    item.properties.opacity === 0.8 && item.properties.stroke === "#334155"
  ));
  const verticalBars = buildLifecycleRecipe("action-direct-bar-offsets", {
    orientation: "vertical"
  });
  assert.ok(semanticResource(verticalBars, "layers", "offsetBars").encoding.xOffset);
  assert.equal(semanticResource(verticalBars, "scales", "xOffset").paddingInner, 0.04);
  assertRenderedItems(verticalBars, "offsetBars");

  const histogram = buildLifecycleRecipe("action-direct-histogram");
  assert.deepEqual(
    semanticResource(histogram, "layers", "directHistogram").encoding.x.bin,
    { maxBins: 5 }
  );
  assert.ok(assertRenderedItems(histogram, "directHistogram").every(item =>
    item.properties.fill === "#0ea5e9" && item.properties.opacity === 0.82
  ));

  const parallel = buildLifecycleRecipe("action-direct-parallel");
  assert.equal(
    semanticResource(parallel, "coordinates", "parallelDirect").type,
    "parallel"
  );
  assert.deepEqual(
    semanticResource(parallel, "coordinates", "parallelDirect").aspect,
    { mode: "frame", ratio: 1, alignX: "center", alignY: "center" }
  );
  assert.equal(
    semanticResource(parallel, "layers", "parallelLines").encoding.parallel.dimensions.length,
    4
  );
  assert.equal(
    semanticResource(parallel, "scales", "parallelLines-parallel-1").reverse,
    true
  );
  assertRenderedItems(parallel, "parallelLines");

  const regression = buildLifecycleRecipe("action-direct-regression-components");
  assert.equal(
    semanticResource(regression, "datasets", "componentFit").transform[0].type,
    "regression"
  );
  assertRenderedItems(regression, "directRegressionBand");
  assertRenderedItems(regression, "directRegressionLine");

  const aggregateGuides = buildLifecycleRecipe("action-direct-guide-aggregates");
  assert.equal(
    renderedObject(aggregateGuides, "xAxisLine").properties.strokeWidth,
    1.5
  );
  assertRenderedItems(aggregateGuides, "xAxisTicks");
  assertRenderedItems(aggregateGuides, "yAxisLabels");
  assertRenderedItems(aggregateGuides, "horizontalGridLines");
  assertRenderedItems(aggregateGuides, "colorLegendSymbols");
  renderedObject(aggregateGuides, "colorLegendTitle");

  const axisFacades = buildLifecycleRecipe("action-direct-axis-facades");
  for (const id of [
    "xAxisLine", "xAxisTicks", "xAxisLabels", "xAxisTitle",
    "yAxisLine", "yAxisTicks", "yAxisLabels", "yAxisTitle",
    "horizontalGridLines", "verticalGridLines"
  ]) renderedObject(axisFacades, id);

  const axisLeaves = buildLifecycleRecipe("action-direct-axis-parts");
  for (const id of [
    "xAxisLine", "xAxisTicks", "xAxisLabels", "xAxisTitle",
    "yAxisLine", "yAxisTicks", "yAxisLabels", "yAxisTitle"
  ]) renderedObject(axisLeaves, id);
  const axisGroups = buildLifecycleRecipe("action-direct-axis-parts", {
    mode: "groups"
  });
  for (const id of ["xAxisTicks", "xAxisLabels", "yAxisTicks", "yAxisLabels"]) {
    assertRenderedItems(axisGroups, id);
  }

  const polar = buildLifecycleRecipe("action-direct-polar-parts");
  assert.equal(renderedObject(polar, "thetaAxisLine").properties.strokeWidth, 2);
  for (const id of [
    "thetaAxisTicks", "thetaAxisLabels", "thetaAxisTitle",
    "radialAxisLine", "radialAxisTicks", "radialAxisLabels", "radialAxisTitle",
    "thetaGridLines", "radialGridCircles"
  ]) renderedObject(polar, id);
});
