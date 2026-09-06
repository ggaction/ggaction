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

  assert.equal(inventory.counts.publicActions, 228);
  assert.equal(inventory.counts.topLevelOptionPaths, 1665);
  assert.equal(inventory.counts.nestedOptionPaths, 8287);
  assert.equal(inventory.counts.optionPaths, 9952);
  assert.equal(inventory.counts.requiredOptionPaths, 8692);
  assert.equal(inventory.counts.excludedOptionPaths, 1260);
  assert.equal(inventory.counts.topLevelCategoricalPaths, 461);
  assert.equal(inventory.counts.topLevelLiteralValues, 2137);
  assert.equal(inventory.counts.literalFamilies, 121);
  assert.equal(inventory.counts.pathLiteralRequirements, 5222);
  assert.equal(inventory.counts.familyLiteralRequirements, 236);
  assert.equal(inventory.counts.pathDiversityRequirements, 267);
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
  const optionById = new Map(inventory.optionPaths.map(option => [option.id, option]));
  for (const action of ["createLinePlot", "createParallelCoordinates", "createAreaPlot", "createDensityPlot"]) {
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
    "option-path:createLinePlot.x.aggregate",
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
  assert.equal(inventory.optionPaths.some(option =>
    option.path.split(".").includes("resolved")
  ), false);
  assert.equal(inventory.optionPaths.some(option =>
    /__@|(?:^|\.)(?:anchor|charAt|toFixed|toString)(?:\.|$)|\.length\./u.test(option.path)
  ), false);
  assert.deepEqual(
    inventory.excludedOptionPaths.reduce((counts, value) => ({
      ...counts,
      [value.reason]: (counts[value.reason] ?? 0) + 1
    }), {}),
    { "redacted-array": 1260 }
  );
  const values = id => optionById.get(id)?.values ?? [];
  assert.equal(optionById.has("option-path:createScatterPlot.x.scale.palette"), false);
  assert.equal(optionById.has("option-path:createScatterPlot.x.scale.interpolate"), false);
  assert.equal(optionById.has("option-path:encodeSize.scale.nice"), false);
  assert.deepEqual(values("option-path:encodeSize.scale.type"), ["string:linear"]);
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
  assert.equal(scaleTypePaths.length, 142);
  assert.equal(scaleTypePaths.reduce((sum, option) => sum + option.values.length, 0), 541);
  assert.equal(inventory.excludedOptionPaths.every(option =>
    optionById.get(option.replacement)?.required === true
  ), true);
  assert.equal(inventory.optionPaths.filter(option => option.required).every(option =>
    option.evidence === "direct-trace"
  ), true);
  const ledger = createScenarioCoverageLedger({
    publicInventory: inventory,
    rendererFeatures: []
  });
  assert.equal(ledger.requirements.some(requirement => requirement.id ===
    "option-path:createData.values[]"), false);
  assert.equal(ledger.requirements.some(requirement => requirement.id ===
    "option-path:createDerivedData.transform[].type"), false);
  assert.equal(ledger.requirements.length, 14383);
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

test("observes nested collection parents through recursive trace count aliases", async () => {
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
    operations: Object.freeze(["createLegend"]),
    directOperations: Object.freeze(["createLegend"]),
    directTrace: Object.freeze([Object.freeze({
      op: "createLegend",
      args: Object.freeze({
        symbol: Object.freeze({ layersCount: 2 })
      })
    })])
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
