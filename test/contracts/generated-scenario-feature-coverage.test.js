import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import test from "node:test";

import { summarizeArgs } from "../../src/core/action.js";
import {
  assertScenarioFeatureCoverage,
  createScenarioCoverageLedger,
  MAX_EXPLICIT_SOURCE_ROW_INDEXES,
  scenarioFeatureCoverageDeficits,
  SOURCE_INDEX_ENCODING,
  summarizeScenarioFeatureCoverage
} from "../support/scenarios/coverage-ledger.js";
import {
  buildPublicOptionInventory,
  EXCLUDED_OPTION_PATH_SEGMENTS,
  TRACE_OPTION_EVIDENCE_ALIASES
} from "../support/scenarios/coverage-inventory.js";
import { LIFECYCLE_SCENARIO_RECIPES } from "../support/scenarios/lifecycle-recipes.js";
import { datasetDefinition } from "../support/datasets/catalog.js";

const actionCards = JSON.parse(readFileSync(
  new URL("../../knowledge/action-cards.json", import.meta.url),
  "utf8"
));

const permissiveBands = Object.freeze({
  simple: { minimum: 0, maximum: 1 },
  intermediate: { minimum: 0, maximum: 1 },
  advanced: { minimum: 0, maximum: 1 },
  composite: { minimum: 0, maximum: 1 }
});

function miniatureInventory() {
  const booleanValues = Object.freeze(["boolean:false", "boolean:true"]);
  const modeValues = Object.freeze(["string:alpha", "string:beta"]);
  return Object.freeze({
    schemaVersion: 1,
    publicActions: Object.freeze([
      Object.freeze({ name: "createThing", lifecycle: "Mutable resource" })
    ]),
    optionPaths: Object.freeze([
      Object.freeze({
        id: "option-path:createThing.flag",
        action: "createThing",
        path: "flag",
        topLevel: true,
        evidence: "direct-trace",
        literalFamily: "boolean-family",
        literalPolicy: "path-values",
        values: booleanValues
      }),
      Object.freeze({
        id: "option-path:createThing.values",
        action: "createThing",
        path: "values",
        topLevel: true,
        evidence: "direct-trace",
        traceAlias: "valuesCount",
        values: Object.freeze([])
      }),
      Object.freeze({
        id: "option-path:createThing.style.mode",
        action: "createThing",
        path: "style.mode",
        topLevel: false,
        evidence: "effective-feature",
        literalFamily: "mode-family",
        literalPolicy: "path-values",
        values: modeValues
      })
    ]),
    literalFamilies: Object.freeze([]),
    pathLiteralRequirements: Object.freeze([
      Object.freeze({
        id: "option-value:createThing.flag=boolean:false",
        optionPath: "option-path:createThing.flag",
        family: "boolean-family",
        valueKey: "boolean:false"
      }),
      Object.freeze({
        id: "option-value:createThing.flag=boolean:true",
        optionPath: "option-path:createThing.flag",
        family: "boolean-family",
        valueKey: "boolean:true"
      }),
      Object.freeze({
        id: "option-value:createThing.style.mode=string:alpha",
        optionPath: "option-path:createThing.style.mode",
        family: "mode-family",
        valueKey: "string:alpha"
      }),
      Object.freeze({
        id: "option-value:createThing.style.mode=string:beta",
        optionPath: "option-path:createThing.style.mode",
        family: "mode-family",
        valueKey: "string:beta"
      })
    ]),
    familyLiteralRequirements: Object.freeze([]),
    pathDiversityRequirements: Object.freeze([]),
    counts: Object.freeze({
      publicActions: 1,
      topLevelOptionPaths: 2,
      nestedOptionPaths: 1,
      optionPaths: 3
    })
  });
}

function corpus(ids) {
  return Object.freeze({
    datasets: Object.freeze(ids.map(id => Object.freeze({
      id,
      corpus: "tidytuesday",
      rows: 100,
      fields: Object.freeze({ value: Object.freeze({ type: "quantitative" }) })
    })))
  });
}

function result(index, {
  dataset,
  flag,
  mode,
  complexity,
  recipe = `recipe-${index % 2}`,
  direct = true,
  valuesAlias = true,
  activeFeatures,
  chartFamily = "scatter"
}) {
  const resolvedActiveFeatures = Object.freeze(activeFeatures ?? ["lifecycle:edit"]);
  const sourceRowIndexes = Object.freeze([index]);
  return Object.freeze({
    id: `scenario-${index}`,
    recipe,
    dataset,
    operations: Object.freeze(["createThing"]),
    directOperations: Object.freeze(["createThing"]),
    directTrace: direct
      ? Object.freeze([Object.freeze({
        op: "createThing",
        args: Object.freeze({
          ...(flag === undefined ? {} : { flag }),
          ...(valuesAlias ? { valuesCount: 3 } : {}),
          ...(mode === undefined ? {} : { style: { mode } })
        })
      })])
      : Object.freeze([]),
    metadata: Object.freeze({
      chartFamily,
      complexity,
      dataOperations: Object.freeze(["aggregate"]),
      activeFeatures: resolvedActiveFeatures,
      sourceDatasetIds: Object.freeze([dataset]),
      provenance: Object.freeze({
        sourceDataset: dataset,
        sourceRowIndexes,
        sourceRowIndexBasis: "zero-based-data-row-in-pinned-csv",
        sourceRowCount: sourceRowIndexes.length,
        minimumSourceRow: sourceRowIndexes[0],
        maximumSourceRow: sourceRowIndexes.at(-1),
        indexEncoding: SOURCE_INDEX_ENCODING,
        sourceSelectionSha256: createHash("sha256")
          .update(sourceRowIndexes.join(","))
          .digest("hex"),
        fieldBindings: Object.freeze({ measure: "value" }),
        transformations: Object.freeze([Object.freeze({ op: "aggregate" })])
      })
    }),
    effectiveFeatures: resolvedActiveFeatures,
    renderers: Object.freeze(["svg"])
  });
}

function miniatureLedger({ distributionWaivers = [] } = {}) {
  return createScenarioCoverageLedger({
    publicInventory: miniatureInventory(),
    rendererFeatures: ["renderer:svg"],
    requiredFeatures: [
      "chart-family:scatter",
      "data-operation:aggregate",
      {
        id: "lifecycle:edit",
        minimumRecipes: 2,
        minimumTiers: 2
      }
    ],
    interactions: [{
      members: ["action:createThing", "renderer:svg"]
    }],
    distributionWaivers
  });
}

function smallPolicy(overrides = {}) {
  return {
    minimumSuccessfulScenarios: 4,
    maximumFailures: 0,
    exactTidyTuesdayDatasets: 2,
    minimumScenariosPerDataset: 1,
    minimumOccurrences: 1,
    minimumTidyTuesdayDatasets: 1,
    minimumTierDatasets: 1,
    maximumRecipeShare: 0.5,
    maximumChartFamilyShare: 1,
    targetRecipesPerRequirement: 1,
    targetTiersPerRequirement: 1,
    complexityBands: permissiveBands,
    ...overrides
  };
}

test("derives a bounded public option inventory without runtime prototype paths", async () => {
  const inventory = await buildPublicOptionInventory(actionCards);

  assert.equal(inventory.counts.publicActions, 312);
  assert.equal(inventory.counts.topLevelOptionPaths, 2875);
  assert.equal(inventory.counts.nestedOptionPaths, 24574);
  assert.equal(inventory.counts.optionPaths, 27449);
  assert.equal(inventory.counts.requiredOptionPaths, 18523);
  assert.equal(inventory.counts.excludedOptionPaths, 8926);
  assert.deepEqual(inventory.optionPaths.filter(option =>
    ["createData", "reviseData"].includes(option.action) && option.topLevel &&
    ["keyField", "keyFields", "keys", "rowMap"].includes(option.path)
  ).map(option => option.id).sort(), [
    "option-path:createData.keyField", "option-path:createData.keyFields",
    "option-path:createData.keys", "option-path:reviseData.keys", "option-path:reviseData.rowMap"
  ]);
  assert.deepEqual(inventory.optionPaths.filter(option => option.path === "subtitleLineHeight")
    .map(option => option.id).sort(), [
      "option-path:createTitle.subtitleLineHeight",
      "option-path:editTitle.subtitleLineHeight"
    ]);
  assert.equal(inventory.counts.topLevelCategoricalPaths, 968);
  assert.equal(inventory.counts.topLevelLiteralValues, 3825);
  assert.equal(inventory.counts.literalFamilies, 231);
  assert.equal(inventory.counts.pathLiteralRequirements, 13813);
  assert.equal(inventory.counts.familyLiteralRequirements, 525);
  assert.equal(inventory.counts.pathDiversityRequirements, 488);
  for (const action of ["createHierarchyData", "editHierarchyData", "layoutHierarchy", "editLayout", "removeResource", "createTreePlot", "editTreePlot", "createTreemapPlot", "editTreemapPlot"]) {
    const options = inventory.optionPaths.filter(option => option.action === action && option.topLevel);
    assert.ok(options.length > 0 && options.every(option => option.required && option.evidence === "direct-trace"), action);
  }
  assert.deepEqual(inventory.optionPaths.find(option => option.id === "option-path:layoutHierarchy.method").values,
    ["string:partition", "string:tree", "string:treemap"]);
  assert.ok(inventory.optionPaths.some(option => option.id === "option-path:createTreePlot.labels.overrides[].key"));
  assert.ok(inventory.optionPaths.some(option => option.id === "option-path:createTreemapPlot.cells.overrides[].path"));
  for (const action of ["createPivotData", "editPivotData"]) {
    const options = inventory.optionPaths.filter(option => option.action === action && option.topLevel);
    assert.deepEqual(options.map(option => option.path), action === "createPivotData"
      ? ["columns", "field", "fill", "groupBy", "id", "op", "source", "target", "value"]
      : ["columns", "dependents", "field", "fill", "groupBy", "op", "target", "value"]);
    assert.ok(options.every(option => option.required && option.evidence === "direct-trace"));
    assert.deepEqual(options.find(option => option.path === "op").values,
      ["count", "max", "mean", "min", "none", "sum"].map(value => `string:${value}`));
  }
  assert.deepEqual(inventory.optionPaths.find(option =>
    option.id === "option-path:editPivotData.dependents").values,
  ["string:recompute", "string:reject"]);
  for (const action of ["createCompleteData", "editCompleteData"]) {
    for (const path of ["calendar", "calendar.end", "calendar.start", "calendar.timeZone", "calendar.unit"]) {
      const option = inventory.optionPaths.find(option => option.id === `option-path:${action}.${path}`);
      assert.ok(option?.required && option.evidence === "direct-trace", `${action}.${path}`);
      assert.deepEqual(option.values, path === "calendar.unit" ? ["string:day"] : []);
    }
  }
  const bootstrapMethodRoots = [
    "createDerivedData.transform[].aggregates[].op.method",
    "createDerivedData.transform[].method",
    "createIntervalData.method",
    "createSummaryData.aggregates[].op.method",
    "editDerivedData.definition.aggregates[].op.method",
    "editDerivedData.definition.method",
    "editIntervalData.method",
    "editSummaryData.aggregates[].op.method"
  ];
  const bootstrapTypePaths = inventory.optionPaths.filter(option =>
    option.values.includes("string:bootstrap"));
  assert.deepEqual(bootstrapTypePaths.map(option => option.id),
    bootstrapMethodRoots.map(root => `option-path:${root}.type`),
    "bootstrap methods are confined to summary and interval data definitions");
  for (const root of bootstrapMethodRoots) {
    const redacted = root.includes("[]");
    for (const key of ["samples", "seed", "type"]) {
      const option = inventory.optionPaths.find(candidate =>
        candidate.id === `option-path:${root}.${key}`);
      assert.ok(option, `${root}.${key}`);
      assert.equal(option.required, !redacted, option.id);
      assert.equal(option.evidence, redacted ? "redacted-trace" : "direct-trace", option.id);
      assert.deepEqual(option.values, key === "type" ? ["string:bootstrap"] : [], option.id);
    }
  }
  assert.equal(inventory.optionPaths.some(option => option.id ===
    "option-path:createCanvas.margin.top"), true);
  assert.equal(inventory.optionPaths.some(option => option.id ===
    "option-path:editCanvas.margin.right"), true);
  assert.equal(inventory.optionPaths.some(option => option.id ===
    "option-path:createErrorBar.xOffset.field"), true);
  assert.equal(inventory.optionPaths.some(option => option.id ===
    "option-path:createErrorBar.yOffset.scale.type"), true);
  assert.equal(inventory.optionPaths.some(option => option.id ===
    "option-path:createLinePlot.color.layout"), false);
  assert.equal(inventory.optionPaths.some(option => option.id ===
    "option-path:createParallelCoordinates.color.layout"), false);
  assert.equal(inventory.optionPaths.some(option => option.id ===
    "option-path:encodeY.bin"), false);
  const clipHeightPaths = [
    "createAdjacentPlot.plot.options.guides.legend.clipHeight",
    "createLayerPlot.plot.options.guides.legend.clipHeight",
    ...["createLegend", "editLegend", "editLegendBlock", "editLegendSymbols"].map(action => `${action}.clipHeight`),
    ...["createGuides", "editFacetGuides"].map(action => `${action}.legend.clipHeight`),
    ...["createAreaPlot", "createBarPlot", "createBeeswarmPlot", "createDensityPlot", "createDotPlot",
      "createDumbbellPlot", "createECDFPlot", "createHeatmap", "createHistogram", "createIntervalPlot",
      "createLinePlot", "createLollipopPlot", "createParallelCoordinates", "createPiePlot", "createPolarLinePlot",
      "createPolarScatterPlot", "createRadarPlot", "createRadialBarPlot", "createRaincloudPlot", "createRegressionPlot",
      "createRosePlot", "createScatterPlot", "createStripPlot", "createTextPlot", "createViolinPlot",
      "facet", "facetGrid", "repeatCharts"].map(action => `${action}.guides.legend.clipHeight`)
  ].map(path => `option-path:${path}`).sort((a, b) => a.localeCompare(b));
  assert.deepEqual(inventory.optionPaths.filter(option => option.path === "clipHeight" ||
    option.path.endsWith(".clipHeight")).map(option => option.id), clipHeightPaths,
  "point-bearing sample windows remain observable in direct, facade and parent inputs");
  const opacityPaths = [
    "createAdjacentPlot.plot.options.guides.legend.symbol.opacity",
    "createLayerPlot.plot.options.guides.legend.symbol.opacity",
    ...["createLegend", "editLegend", "editLegendBlock", "editLegendSymbols"].map(action => `${action}.symbol.opacity`),
    ...["createGuides", "editFacetGuides"].map(action => `${action}.legend.symbol.opacity`),
    ...["createBeeswarmPlot", "createRegressionPlot", "createScatterPlot", "createStripPlot", "facet", "facetGrid",
      "repeatCharts"].map(action => `${action}.guides.legend.symbol.opacity`)
  ].map(path => `option-path:${path}`).sort((a, b) => a.localeCompare(b));
  assert.deepEqual(inventory.optionPaths.filter(option => option.path === "symbol.opacity" ||
    option.path.endsWith(".symbol.opacity")).map(option => option.id), opacityPaths,
  "combined quantitative samples retain their flat point opacity option");
  const closedColorFamily = inventory.literalFamilies.find(family =>
    family.values.map(value => value.key).join("|") ===
      ["log","ordinal","pow","quantile","quantize","sequential","sqrt","symlog","threshold"]
        .map(value => `string:${value}`).join("|"));
  assert.equal(closedColorFamily.size,9);
  assert.equal(closedColorFamily.open,false);
  assert.equal(closedColorFamily.policy,"path-values");
  for (const path of closedColorFamily.requiredPaths) {
    assert.equal(inventory.pathLiteralRequirements.filter(requirement => requirement.optionPath===path).length,9,path);
  }
  const curves = inventory.literalFamilies.find(family =>
    family.values.some(value => value.key === "string:monotone-steffen"));
  assert.equal(curves.size, 9);
  assert.equal(curves.policy, "path-values", "new curves must not retire existing per-path witnesses");
  for (const optionPath of curves.requiredPaths) {
    const values = inventory.pathLiteralRequirements.filter(requirement => requirement.optionPath === optionPath);
    assert.equal(values.length, 9, optionPath);
    assert.ok(values.some(value => value.valueKey === "string:monotone-steffen"), optionPath);
  }
  for (const action of ["createImageResource", "replaceImageResource"]) {
    assert.deepEqual(inventory.optionPaths.filter(option => option.action === action).map(option => option.path),
      ["prepared", "requestToken"], "image authority remains an opaque handle");
    assert.ok(inventory.optionPaths.filter(option => option.action === action).every(option => option.required && option.evidence === "direct-trace"));
  }
  const otherNine = inventory.literalFamilies.find(family => family.values.some(value => value.key==="string:weekday") && family.size===9);
  assert.equal(otherNine.policy,"family-values","the general threshold remains eight");
  const optionById = new Map(inventory.optionPaths.map(option => [option.id, option]));
  for (const path of ["prepared", "requestToken"]) {
    const option = optionById.get(`option-path:applyDataUpdate.${path}`);
    assert.equal(option?.required, true, path);
    assert.equal(option?.evidence, "direct-trace", path);
    assert.equal(option?.topLevel, true, path);
  }
  assert.deepEqual(inventory.optionPaths.filter(option => option.action === "applyDataUpdate")
    .map(option => option.path), ["prepared", "requestToken"],
  "opaque handles expose inspection descriptors without adding nested authoring options");
  assert.deepEqual(inventory.publicActions.filter(action =>
    ["createParameter", "editParameter", "removeParameter"].includes(action.name)
  ), ["createParameter", "editParameter", "removeParameter"].map(name => ({
    name, lifecycle: "Mutable resource"
  })));
  for (const path of [
    "createParameter.id", "createParameter.type", "createParameter.value",
    "createParameter.nullable", "createParameter.target", "editParameter.target",
    "editParameter.value", "removeParameter.id", "removeParameter.target"
  ]) {
    const option = optionById.get(`option-path:${path}`);
    assert.equal(option?.required, true, path);
    assert.equal(option?.evidence, "direct-trace", path);
  }
  assert.deepEqual(optionById.get("option-path:createParameter.type").values,
    ["string:boolean", "string:number", "string:string"]);
  assert.deepEqual(optionById.get("option-path:createParameter.nullable").values,
    ["boolean:false", "boolean:true"]);
  for (const action of ["createComputedData", "editComputedData"]) {
    for (const path of ["version", "registry", "root", "root.id", "root.name"]) {
      const option = optionById.get(`option-path:${action}.expression.${path}`);
      assert.equal(option?.required, true, `${action}.expression.${path}`);
      assert.equal(option?.evidence, "direct-trace", `${action}.expression.${path}`);
    }
    assert.deepEqual(optionById.get(`option-path:${action}.expression.registry`).values,
      ["string:standard%401"]);
    assert.deepEqual(optionById.get(`option-path:${action}.expression.root.type`).values,
      ["binary", "call", "field", "fieldPath", "if", "literal", "parameter", "unary"]
        .map(type => `string:${type}`));
    assert.ok(optionById.get(`option-path:${action}.expression.root.name`).values
      .includes("string:timeFloor"), `${action} exposes the closed function registry`);
  }
  for (const action of ["editLegend", "editLegendBlock", "editLegendSymbols"]) {
    assert.deepEqual(optionById.get(`option-path:${action}.clipHeight`).values, ["string:auto"]);
  }
  for (const action of ["createAreaPlot", "createBarPlot", "createDensityPlot", "createDotPlot", "createDumbbellPlot",
    "createECDFPlot", "createHeatmap", "createHistogram", "createIntervalPlot", "createLinePlot", "createLollipopPlot",
    "createParallelCoordinates", "createPiePlot", "createPolarLinePlot", "createRadarPlot", "createRadialBarPlot",
    "createRosePlot", "createTextPlot", "createViolinPlot"]) {
    assert.deepEqual(optionById.get(`option-path:${action}.guides.legend.combine`).values, ["string:separate"],
      `${action} cannot author both encoded point fields on its facade target`);
  }
  for (const action of ["createAreaPlot", "createDensityPlot", "createECDFPlot", "createHistogram", "createLinePlot",
    "createParallelCoordinates", "createPiePlot", "createPolarLinePlot", "createRadarPlot", "createRadialBarPlot",
    "createRaincloudPlot", "createRosePlot", "createViolinPlot"]) {
    assert.deepEqual(optionById.get(`option-path:${action}.guides.legend.titlePosition`).values, ["string:left", "string:top"],
      `${action} cannot create the continuous gradient that owns bottom titles`);
  }
  for (const path of ["createLegend.combine", "editLegend.combine", "createGuides.legend.combine", "editFacetGuides.legend.combine",
    ...["createBeeswarmPlot", "createRegressionPlot", "createScatterPlot", "createStripPlot", "facet", "facetGrid", "repeatCharts"]
      .map(action => `${action}.guides.legend.combine`)]) {
    assert.deepEqual(optionById.get(`option-path:${path}`).values,
      ["string:color-size", "string:color-size-shape", "string:separate", "string:size-shape"], `${path} retains both approved combinations`);
  }
  for (const action of ["createPolarScatterPlot", "createRaincloudPlot"]) {
    assert.deepEqual(optionById.get(`option-path:${action}.guides.legend.combine`).values,
      ["string:separate", "string:size-shape"], `${action} retains categorical point fusion`);
  }
  for (const action of ["removeData", "removeScale", "removeCoordinate"]) {
    assert.equal(
      inventory.publicActions.some(candidate => candidate.name === action),
      true,
      `${action} must remain a public realistic-coverage requirement`
    );
    assert.equal(
      optionById.has(`option-path:${action}.id`),
      true,
      `${action}.id must remain a required direct-trace option path`
    );
  }
  for (const action of ["facet", "facetGrid", "repeatCharts"]) {
    for (const channel of ["theta", "r", "parallelDimensions"]) {
      assert.deepEqual(
        optionById.get(`option-path:${action}.scales.${channel}`)?.values,
        ["string:independent", "string:shared"]
      );
    }
  }
  assert.deepEqual(optionById.get("option-path:repeatCharts.channel")?.values, [
    "string:r", "string:theta", "string:x", "string:y"
  ]);
  assert.equal(optionById.has(
    "option-path:repeatCharts.channel.parallelDimension"
  ), true);
  for (const action of ["createParallelCoordinates", "createAreaPlot", "createDensityPlot"]) {
    assert.equal(optionById.has(`option-path:${action}.guides.legend.order.channel`), false,
      "an optional never property is not an executable option");
  }
  assert.equal(optionById.has("option-path:createScatterPlot.guides.legend.order.channel"), true,
    "a valid branch of an exclusive union remains executable");
  assert.equal(
    optionById.get("option-path:createXAxisLabels.format")?.literalPolicy,
    "family-values"
  );
  for (const id of [
    "option-path:createScatterPlot.x.aggregate",
    "option-path:createScatterPlot.x.bin",
    "option-path:createScatterPlot.x.stack",
    "option-path:createScatterPlot.color.aggregate",
    "option-path:createScatterPlot.color.layout",
    "option-path:createBarPlot.y.bin",
    "option-path:createLinePlot.x.stack",
    "option-path:createLinePlot.y.bin",
    "option-path:createLinePlot.y.stack",
    "option-path:createBoxPlot.guides.axes.theta",
    "option-path:createBoxPlot.guides.grid.theta",
    "option-path:createGradientPlot.guides.legend.align",
    "option-path:createHeatmap.color.aggregate",
    "option-path:createHeatmap.color.layout"
  ]) {
    assert.equal(optionById.has(id), false, id);
  }
  assert.equal(optionById.has("option-path:createLinePlot.x.aggregate"), true,
    "numeric line positions preserve explicit aggregation");
  assert.equal(inventory.optionPaths.some(option =>
    option.path.split(".").includes("resolved")
  ), false);
  assert.equal(inventory.optionPaths.some(option =>
    /__@|(?:^|\.)(?:charAt|toFixed|toString)(?:\.|$)|\.length\./u.test(option.path)
  ), false);
  assert.deepEqual(inventory.optionPaths
    .filter(option => option.path.endsWith(".anchor"))
    .map(option => option.id), [
    "option-path:createMarkLabels.placement.anchor",
    "option-path:editMarkLabelPlacement.placement.anchor",
    "option-path:facet.headers.anchor",
    "option-path:facet.headers.column.anchor",
    "option-path:facet.headers.row.anchor",
    "option-path:facetGrid.headers.anchor",
    "option-path:facetGrid.headers.column.anchor",
    "option-path:facetGrid.headers.row.anchor",
    "option-path:repeatCharts.headers.anchor",
    "option-path:repeatCharts.headers.column.anchor",
    "option-path:repeatCharts.headers.row.anchor"
  ]);
  assert.deepEqual(
    inventory.excludedOptionPaths.reduce((counts, value) => ({
      ...counts,
      [value.reason]: (counts[value.reason] ?? 0) + 1
    }), {}),
    { "redacted-array": 8926 }
  );
  const values = id => optionById.get(id)?.values ?? [];
  assert.equal(optionById.has("option-path:createScatterPlot.x.scale.palette"), false);
  assert.equal(optionById.has("option-path:createScatterPlot.x.scale.interpolate"), false);
  assert.equal(optionById.has("option-path:encodeSize.scale.nice"), false);
  assert.deepEqual(values("option-path:encodeSize.scale.type"), [
    "string:linear", "string:log", "string:ordinal", "string:pow", "string:quantile",
    "string:quantize", "string:sqrt", "string:threshold"
  ]);
  assert.equal(values("option-path:createBarPlot.y.scale.type").includes("string:log"), false);
  assert.deepEqual(values("option-path:createGradientPlot.guides.legend.position"), [
    "string:right"
  ]);
  assert.deepEqual(values("option-path:createViolinPlot.color.layout"), [
    "string:overlay"
  ]);
  assert.deepEqual(values("option-path:createHistogram.color.layout"), [
    "string:diverging", "string:fill", "string:group", "string:overlay", "string:stack"
  ]);
  assert.deepEqual(values("option-path:createHeatmap.x.scale.type"), [
    "string:band", "string:linear", "string:log", "string:pow", "string:sqrt",
    "string:symlog"
  ]);
  const scaleTypePaths = inventory.optionPaths.filter(option =>
    option.required &&
    /(?:^|\.)(?:xScale|yScale|valueScale|densityScale|scale)\.type$/u.test(option.path)
  );
  assert.equal(scaleTypePaths.length, 205);
  assert.equal(scaleTypePaths.reduce((sum, option) => sum + option.values.length, 0), 958);
  assert.equal(inventory.excludedOptionPaths.every(option =>
    optionById.get(option.replacement)?.required === true
  ), true);
  assert.equal(inventory.optionPaths.filter(option => option.required).every(option =>
    option.evidence === "direct-trace"
  ), true);
  for (const action of ["encodeColor", "encodeStroke", "encodeSize", "encodeShape", "encodeOpacity", "encodeStrokeWidth", "encodeStrokeDash", "encodeAngle"]) {
    for (const path of ["conditions", "otherwise", "otherwise.value"]) {
      const option = optionById.get(`option-path:${action}.${path}`);
      assert.equal(option?.required, true, `${action}.${path}`);
      assert.equal(option?.evidence, "direct-trace", `${action}.${path}`);
    }
    assert.equal(optionById.get(`option-path:${action}.conditions[].when`)?.evidence, "redacted-trace");
  }
  for (const action of ["filterData", "editFilteredData"]) for (const path of ["where", "where.version", "where.registry", "where.root.type"]) {
    assert.equal(optionById.get(`option-path:${action}.${path}`)?.evidence, "direct-trace");
  }
  const ledger = createScenarioCoverageLedger({
    publicInventory: inventory,
    rendererFeatures: []
  });
  const preparedRecipe = LIFECYCLE_SCENARIO_RECIPES.find(recipe =>
    recipe.id === "action-direct-data-resources");
  const preparedProgram = preparedRecipe.build({ dataset: preparedRecipe.datasets[0],
    ...Object.fromEntries(Object.entries(preparedRecipe.factors).map(([name, values]) =>
      [name, values[0]])) });
  const directTrace = preparedProgram.trace.children.map(({ op, args }) => ({ op, args }));
  const preparedReport = summarizeScenarioFeatureCoverage({
    results: [{ id: "prepared-source-options", recipe: preparedRecipe.id,
      dataset: preparedRecipe.datasets[0],
      operations: directTrace.map(node => node.op),
      directOperations: directTrace.map(node => node.op), directTrace,
      metadata: { chartFamily: "scatter", complexity: "advanced", activeFeatures: [],
        dataOperations: [] }, effectiveFeatures: [], renderers: ["svg"] }],
    datasetCorpus: { datasets: [datasetDefinition(preparedRecipe.datasets[0])] }, ledger
  });
  for (const id of ["action:applyDataUpdate", "option-path:applyDataUpdate.prepared",
    "option-path:applyDataUpdate.requestToken",
    "action:createFontResource", "option-path:createFontResource.prepared", "option-path:createFontResource.requestToken",
    "action:replaceFontResource", "option-path:replaceFontResource.prepared", "option-path:replaceFontResource.requestToken",
    "option-path:applyTextMetrics.prepared", "option-path:applyTextMetrics.requestToken",
    "action:createPivotData", "action:editPivotData",
    "option-path:createPivotData.source", "option-path:createPivotData.field",
    "option-path:createPivotData.value", "option-path:createPivotData.op",
    "option-path:editPivotData.op", "option-path:editPivotData.groupBy",
    "option-path:filterData.where", "option-path:editFilteredData.where"]) {
    assert.equal(preparedReport.requirements.find(requirement => requirement.id === id)?.occurrences,
      1, `${id} must be observed from an executed public action`);
  }
  const conditionalResults = ["action-direct-point-text", "action-direct-ranged-marks"].map(id => {
    const recipe = LIFECYCLE_SCENARIO_RECIPES.find(item => item.id === id);
    const program = recipe.build({ dataset: recipe.datasets[0], ...Object.fromEntries(Object.entries(recipe.factors).map(([name, values]) => [name, values[0]])) });
    const directTrace = program.trace.children.map(({ op, args }) => ({ op, args }));
    return { id, recipe: id, dataset: recipe.datasets[0], operations: directTrace.map(node => node.op),
      directOperations: directTrace.map(node => node.op), directTrace, metadata: { chartFamily: "scatter", complexity: "advanced", activeFeatures: [], dataOperations: [] }, effectiveFeatures: [], renderers: ["svg"] };
  });
  const conditionalReport = summarizeScenarioFeatureCoverage({ results: conditionalResults,
    datasetCorpus: { datasets: conditionalResults.map(result => datasetDefinition(result.dataset)) }, ledger });
  for (const action of ["encodeColor", "encodeStroke", "encodeSize", "encodeShape", "encodeOpacity", "encodeStrokeWidth", "encodeStrokeDash", "encodeAngle"]) {
    for (const path of ["conditions", "otherwise", "otherwise.value"]) {
      const id = `option-path:${action}.${path}`;
      assert.equal(conditionalReport.requirements.find(requirement => requirement.id === id)?.occurrences, 1, id);
    }
  }
  assert.equal(ledger.requirements.some(requirement => requirement.id ===
    "option-path:createData.values[]"), false);
  assert.equal(ledger.requirements.some(requirement => requirement.id ===
    "option-path:createDerivedData.transform[].type"), false);
  assert.equal(ledger.requirements.length, 33179);
  assert.deepEqual(ledger.requirements.filter(requirement =>
    /^(?:option-path:)(?:createTitle|editTitle)\.subtitleLineHeight$/u.test(requirement.id)
  ).map(requirement => requirement.id).sort(), [
    "option-path:createTitle.subtitleLineHeight",
    "option-path:editTitle.subtitleLineHeight"
  ]);
  const directBootstrapMethods = bootstrapMethodRoots.filter(root => !root.includes("[]"));
  const directBootstrapOptions = directBootstrapMethods.flatMap(root =>
    ["samples", "seed", "type"].map(key => `option-path:${root}.${key}`));
  assert.deepEqual(ledger.requirements.filter(requirement =>
    directBootstrapOptions.includes(requirement.id)).map(requirement => requirement.id).sort(),
  directBootstrapOptions.sort(), "all nine observable bootstrap options require scenario evidence");
  assert.equal(inventory.pathLiteralRequirements.filter(requirement =>
    directBootstrapMethods.some(root => requirement.optionPath === `option-path:${root}.type`)).length, 3,
  "each observable bootstrap discriminator requires literal evidence");
  assert.throws(() => createScenarioCoverageLedger({
    publicInventory: inventory,
    rendererFeatures: [],
    interactions: [{
      members: ["action:createData", "option-path:createData.values[]"]
    }]
  }), /known, distinct evidence ids/u);
  assert.deepEqual(summarizeArgs({
    symbol: { layers: [{ shape: "circle" }] },
    strokeDash: { field: "dash" },
    values: [1]
  }), {
    symbol: { layersCount: 1 },
    strokeDash: { field: "dash" },
    valuesCount: 1
  });
  assert.deepEqual(EXCLUDED_OPTION_PATH_SEGMENTS, {
    resolved: "Readonly derived-transform output; it is not accepted authoring input."
  });
  assert.deepEqual(TRACE_OPTION_EVIDENCE_ALIASES, {
    binBoundaries: "binBoundariesCount",
    dimensions: "dimensionsCount",
    domain: "domainCount",
    oneOf: "oneOfCount",
    operations: "operationsCount",
    program: "programType",
    range: "rangeCount",
    sortBy: "sortByCount",
    strokeDash: "strokeDashCount",
    transform: "transformCount",
    values: "valuesCount"
  });
});

test("passes only trace-backed action and recursive option evidence plus observed extras", () => {
  const results = [
    result(0, { dataset: "tt-a", flag: true, mode: "alpha", complexity: "simple" }),
    result(1, { dataset: "tt-b", flag: false, mode: "beta", complexity: "intermediate" }),
    result(2, { dataset: "tt-a", flag: true, mode: "alpha", complexity: "advanced" }),
    result(3, { dataset: "tt-b", flag: false, mode: "beta", complexity: "composite" })
  ];
  const report = summarizeScenarioFeatureCoverage({
    results,
    datasetCorpus: corpus(["tt-a", "tt-b"]),
    ledger: miniatureLedger(),
    policy: smallPolicy()
  });

  assert.equal(report.passed, true);
  assert.doesNotThrow(() => assertScenarioFeatureCoverage(report));
  assert.equal(report.execution.successfulScenarios, 4);
  assert.equal(report.execution.tidyTuesdayDatasets, 2);
  assert.equal(report.missing.actions.length, 0);
  assert.equal(report.missing.topLevelOptions.length, 0);
  assert.equal(report.missing.nestedOptions.length, 0);
  assert.equal(report.missing.literals.length, 0);
  assert.equal(report.missing.interactions.length, 0);
  assert.equal(report.rejectedEvidence.length, 0);
  assert.equal(report.requirements.every(requirement =>
    !Object.hasOwn(requirement, "scenarioIds") &&
    requirement.witnessScenarioIds.length <= 5
  ), true);
  assert.deepEqual(report.worst.byKind.action, {
    occurrences: 4,
    datasets: 2,
    recipes: 2,
    tiers: 4
  });
});

test("observes collection and named-axis array parents through recursive trace count aliases", async () => {
  const inventory = await buildPublicOptionInventory(actionCards);
  const ledger = createScenarioCoverageLedger({
    publicInventory: inventory,
    rendererFeatures: ["renderer:svg"],
    requiredFeatures: ["chart-family:scatter", "data-operation:aggregate"]
  });
  const base = result(0, {
    dataset: "tt-a",
    complexity: "simple",
    activeFeatures: []
  });
  const traced = Object.freeze({
    ...base,
    operations: Object.freeze(["createLegend", "createAxes", "createScatterPlot"]),
    directOperations: Object.freeze(["createLegend", "createAxes", "createScatterPlot"]),
    directTrace: Object.freeze([Object.freeze({
      op: "createLegend",
      args: Object.freeze({
        symbol: Object.freeze({ layersCount: 2 })
      })
    }), Object.freeze({ op: "createAxes", args: summarizeArgs({
      x: [{ id: "horizontal", title: { baseline: "top" } }],
      y: [{ id: "vertical", title: { baseline: "top" } }]
    }) }), Object.freeze({ op: "createScatterPlot", args: summarizeArgs({ guides: { axes: {
      x: [{ id: "horizontal", title: { baseline: "top" } }],
      y: [{ id: "vertical", title: { baseline: "top" } }]
    } } }) })])
  });
  const report = summarizeScenarioFeatureCoverage({
    results: [traced],
    datasetCorpus: corpus(["tt-a"]),
    ledger,
    policy: smallPolicy({
      minimumSuccessfulScenarios: 1,
      exactTidyTuesdayDatasets: 1,
      maximumRecipeShare: 1
    })
  });
  const parent = report.requirements.find(requirement =>
    requirement.id === "option-path:createLegend.symbol.layers"
  );
  assert.equal(parent.occurrences, 1);
  for (const [action, prefix] of [["createAxes", ""], ["createScatterPlot", "guides.axes."]]) {
    for (const channel of ["x", "y"]) {
      assert.equal(report.requirements.find(requirement =>
        requirement.id === `option-path:${action}.${prefix}${channel}`).occurrences, 1);
      assert.equal(report.requirements.find(requirement =>
        requirement.id === `option-path:${action}.${prefix}${channel}.title.baseline`).occurrences, 0,
      "a redacted array parent cannot claim an unseen object-branch leaf");
    }
  }
  assert.equal(ledger.requirements.some(requirement =>
    requirement.id === "option-path:createLegend.symbol.layers[]"
  ), false);
});

test("hard-gates explicit distribution minima and reports exact scoped waivers", () => {
  const results = [0, 1, 2, 3].map(index => result(index, {
    dataset: index % 2 === 0 ? "tt-a" : "tt-b",
    flag: index % 2 === 0,
    mode: index % 2 === 0 ? "alpha" : "beta",
    complexity: "simple",
    recipe: "single-recipe"
  }));
  const options = {
    results,
    datasetCorpus: corpus(["tt-a", "tt-b"]),
    policy: smallPolicy({ maximumRecipeShare: 1, minimumTierDatasets: 0 })
  };
  const failed = summarizeScenarioFeatureCoverage({
    ...options,
    ledger: miniatureLedger()
  });

  assert.equal(failed.passed, false);
  assert.deepEqual(failed.missing.hardDistribution, ["lifecycle:edit"]);
  const lifecycleGap = scenarioFeatureCoverageDeficits(failed).requirements
    .find(gap => gap.id === "lifecycle:edit");
  assert.deepEqual(lifecycleGap, {
    id: "lifecycle:edit",
    kind: "lifecycle",
    missingOccurrences: 0,
    missingDatasets: 0,
    missingRecipes: 1,
    missingTiers: 1,
    targetRecipeGap: 0,
    targetTierGap: 0,
    hardSatisfied: false
  });

  const waiver = {
    requirementId: "lifecycle:edit",
    minimumRecipes: 1,
    minimumTiers: 1,
    reason: "The miniature contract intentionally has one owning workflow."
  };
  const passed = summarizeScenarioFeatureCoverage({
    ...options,
    ledger: miniatureLedger({ distributionWaivers: [waiver] })
  });
  assert.equal(passed.passed, true);
  assert.equal(passed.inventory.distributionWaivers, 1);
  assert.equal(passed.distributionTargets.waivers[0].reason, waiver.reason);
  assert.throws(() => createScenarioCoverageLedger({
    publicInventory: miniatureInventory(),
    rendererFeatures: [],
    distributionWaivers: [{
      requirementId: "action:createThing",
      minimumRecipes: 1,
      reason: "Automatic requirements have no hard distribution minimum."
    }]
  }), /must lower an explicit hard minimum/u);
});

test("does not let descriptors, transitive calls, duplicates, or option claims inflate coverage", () => {
  const spoofed = result(0, {
    dataset: "tt-a",
    flag: undefined,
    mode: "alpha",
    complexity: "simple",
    direct: false,
    valuesAlias: false,
    activeFeatures: [
      "option-path:createThing.flag",
      "option-value:createThing.flag=boolean:false",
      "option-value:createThing.style.mode=string:alpha",
      "option-value:createThing.style.mode=string:alpha",
      "lifecycle:edit"
    ]
  });
  const report = summarizeScenarioFeatureCoverage({
    results: [{
      ...spoofed,
      factors: { flag: false, values: [1, 2, 3], style: { mode: "beta" } },
      effectiveFeatures: [
        "option-value:createThing.style.mode=string:alpha",
        "lifecycle:edit"
      ]
    }],
    datasetCorpus: corpus(["tt-a"]),
    ledger: miniatureLedger(),
    policy: smallPolicy({
      minimumSuccessfulScenarios: 1,
      exactTidyTuesdayDatasets: 1,
      minimumTierDatasets: 0,
      maximumRecipeShare: 1
    })
  });

  assert.equal(report.passed, false);
  assert.equal(report.actionCoverage.direct.details[0].occurrences, 0);
  assert.equal(report.actionCoverage.transitive.details[0].occurrences, 1);
  assert.ok(report.missing.actions.includes("action:createThing"));
  assert.ok(report.missing.topLevelOptions.includes("option-path:createThing.flag"));
  assert.ok(report.missing.topLevelOptions.includes("option-path:createThing.values"));
  assert.ok(report.missing.literals.includes(
    "option-value:createThing.flag=boolean:false"
  ));
  assert.equal(report.requirements.find(requirement => requirement.id ===
    "option-value:createThing.style.mode=string:alpha").occurrences, 0);
  assert.ok(report.missing.nestedOptions.includes(
    "option-path:createThing.style.mode"
  ));
  assert.deepEqual(report.rejectedEvidence, [
    "scenario-0:option-path:createThing.flag:not-effective",
    "scenario-0:option-value:createThing.flag=boolean:false:not-effective",
    "scenario-0:option-value:createThing.style.mode=string:alpha"
  ]);
  assert.throws(
    () => assertScenarioFeatureCoverage(report),
    /missing actions|rejected or untracked feature evidence/u
  );

  const emptyCollection = result(1, {
    dataset: "tt-a",
    flag: true,
    mode: "alpha",
    complexity: "simple",
    valuesAlias: false
  });
  const emptyReport = summarizeScenarioFeatureCoverage({
    results: [{
      ...emptyCollection,
      directTrace: [{
        ...emptyCollection.directTrace[0],
        args: { ...emptyCollection.directTrace[0].args, valuesCount: 0 }
      }]
    }],
    datasetCorpus: corpus(["tt-a"]),
    ledger: miniatureLedger(),
    policy: smallPolicy({
      minimumSuccessfulScenarios: 1,
      exactTidyTuesdayDatasets: 1,
      minimumTierDatasets: 0,
      maximumRecipeShare: 1
    })
  });
  assert.equal(emptyReport.requirements.find(requirement => requirement.id ===
    "option-path:createThing.values").occurrences, 0);
});

test("validates explicit and compact source lineage without reporting raw indexes", () => {
  const valid = result(0, {
    dataset: "tt-a",
    flag: true,
    mode: "alpha",
    complexity: "simple"
  });
  const summarize = candidate => summarizeScenarioFeatureCoverage({
    results: [candidate],
    datasetCorpus: corpus(["tt-a"]),
    ledger: miniatureLedger(),
    policy: smallPolicy({
      minimumSuccessfulScenarios: 1,
      exactTidyTuesdayDatasets: 1,
      minimumTierDatasets: 0,
      maximumRecipeShare: 1
    })
  });
  const withMetadata = metadata => ({ ...valid, metadata: { ...valid.metadata, ...metadata } });
  const compactProvenance = Object.fromEntries(
    Object.entries(valid.metadata.provenance).filter(([key]) => key !== "sourceRowIndexes")
  );
  const compact = summarize(withMetadata({ provenance: compactProvenance }));

  assert.equal(compact.execution.lineage.validScenarios, 1);
  assert.equal(compact.execution.lineage.selections[0].explicitScenarioCount, 0);
  assert.equal(Object.hasOwn(compact.execution.lineage.selections[0], "sourceRowIndexes"), false);
  assert.equal(MAX_EXPLICIT_SOURCE_ROW_INDEXES, 160);

  assert.throws(() => summarize(withMetadata({
    sourceDatasetIds: ["tt-a", "tt-b"]
  })), /sourceDatasetIds must be exactly/u);
  assert.throws(() => summarize(withMetadata({
    provenance: {
      ...valid.metadata.provenance,
      sourceRowIndexes: [0, 0],
      sourceRowCount: 2
    }
  })), /invalid source-row lineage/u);
  assert.throws(() => summarize(withMetadata({
    provenance: {
      ...valid.metadata.provenance,
      sourceRowIndexes: [100]
    }
  })), /invalid source-row lineage/u);
  assert.throws(() => summarize(withMetadata({
    provenance: {
      ...valid.metadata.provenance,
      sourceSelectionSha256: "0".repeat(64)
    }
  })), /invalid source selection digest/u);
  assert.throws(() => summarize(withMetadata({
    provenance: {
      ...compactProvenance,
      sourceSelectionSha256: "not-a-sha"
    }
  })), /invalid source-row lineage/u);
  assert.throws(() => summarize(withMetadata({
    dataOperations: ["filter"],
    provenance: {
      ...valid.metadata.provenance,
      transformations: [{ op: "aggregate" }]
    }
  })), /data operations drift/u);
});

test("reports dataset, tier, recipe, and chart-family concentration failures", () => {
  const results = [0, 1, 2, 3].map(index => result(index, {
    dataset: "tt-a",
    flag: index % 2 === 0,
    mode: index % 2 === 0 ? "alpha" : "beta",
    complexity: "simple",
    recipe: "only-recipe",
    chartFamily: "scatter"
  }));
  const report = summarizeScenarioFeatureCoverage({
    results,
    datasetCorpus: corpus(["tt-a", "tt-b"]),
    ledger: miniatureLedger(),
    policy: smallPolicy({
      minimumScenariosPerDataset: 2,
      maximumRecipeShare: 0.75,
      maximumChartFamilyShare: 0.75,
      complexityBands: {
        ...permissiveBands,
        simple: { minimum: 0, maximum: 0.75 }
      }
    })
  });

  assert.equal(report.passed, false);
  assert.ok(report.violations.some(value => value.includes("datasets below")));
  assert.ok(report.violations.some(value => value.includes("complexity tiers")));
  assert.ok(report.violations.includes("recipe concentration exceeds policy"));
  assert.ok(report.violations.includes("chart-family concentration exceeds policy"));
});
