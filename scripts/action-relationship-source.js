import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { chart } from "../src/index.js";
import {
  buildScenario,
  generateScenarioDescriptors
} from "../test/support/scenarios/engine.js";

const root = fileURLToPath(new URL("../", import.meta.url));
const catalogFile = path.join(root, "agent_docs/contract/ACTION_INDEX.json");

function selectionLifecyclePrograms() {
  const selected = chart()
    .createCanvas({ width: 160, height: 120, margin: 20 })
    .createData({ values: [
      { x: 1, y: 2 },
      { x: 2, y: 4 },
      { x: 3, y: 3 }
    ] })
    .createPointMark({ id: "points" })
    .encodeX({ field: "x" })
    .encodeY({ field: "y" })
    .selectMarks({ id: "focus", field: "x", op: "max" })
    .highlightMarks({ selection: "focus", color: "#dc2626" })
    .editMarkSelection({ selection: "focus", field: "x", op: "min" });
  return [selected, selected.removeMarkSelection({ selection: "focus" })];
}

function focusedScaleEditorPrograms() {
  const values = [
    { x: 1, y: 2, group: "a", amount: 2 },
    { x: 2, y: 3, group: "a", amount: 2 },
    { x: 3, y: 4, group: "b", amount: 5 },
    { x: 4, y: 5, group: "b", amount: 5 }
  ];
  const point = chart()
    .createCanvas({ width: 320, height: 240, margin: 30 })
    .createData({ values })
    .createPointMark()
    .encodeX({ field: "x" })
    .encodeY({ field: "y" })
    .encodeColor({ field: "group" })
    .encodeStroke({ field: "group" })
    .encodeSize({ field: "amount" })
    .encodeOpacity({ field: "amount" })
    .encodeShape({ field: "group" })
    .editXScale({ reverse: true })
    .editYScale({ reverse: true })
    .editColorScale({ palette: "set2" })
    .editStrokeScale({ target: "point", palette: "set1" })
    .editSizeScale({ range: [20, 80] })
    .editOpacityScale({ range: [0.2, 0.9] })
    .editShapeScale({ range: ["circle", "diamond"] });
  const polar = chart()
    .createCanvas({ width: 240, height: 240, margin: 30 })
    .createData({ values })
    .createPointMark()
    .encodeTheta({ field: "x" })
    .encodeR({ field: "amount" })
    .editThetaScale({ reverse: true })
    .editRScale({ domain: [0, 8] });
  const line = chart()
    .createCanvas({ width: 320, height: 240, margin: 30 })
    .createData({ values })
    .createLineMark()
    .encodeX({ field: "x" })
    .encodeY({ field: "y" })
    .encodeGroup({ field: "group" })
    .encodeStrokeWidth({ field: "amount" })
    .encodeStrokeDash({ field: "group" })
    .editStrokeWidthScale({ range: [1, 8] })
    .editStrokeDashScale({ range: [[], [6, 2]] });
  const parallel = chart()
    .createCanvas({ width: 320, height: 240, margin: 30 })
    .createData({ values })
    .createParallelCoordinates({
      id: "parallelLines", dimensions: ["x", "y", "amount"], guides: false
    })
    .editParallelScale({
      target: "parallelLines", dimension: "amount", reverse: true
    });
  const offsets = chart()
    .createCanvas({ width: 320, height: 240, margin: 30 })
    .createData({ values })
    .createBarMark({ id: "offsetBars" })
    .encodeX({
      target: "offsetBars", field: "group", fieldType: "nominal"
    })
    .encodeY({ target: "offsetBars", field: "amount" })
    .encodeXOffset({ target: "offsetBars", field: "group" })
    .editXOffsetScale({ target: "offsetBars", padding: 0.2 });
  const yOffsets = chart()
    .createCanvas({ width: 320, height: 240, margin: 30 })
    .createData({ values })
    .createPointMark({ id: "offsetPoints" })
    .encodeX({ target: "offsetPoints", field: "x" })
    .encodeY({
      target: "offsetPoints", field: "group", fieldType: "nominal"
    })
    .encodeYOffset({ target: "offsetPoints", field: "group" })
    .editYOffsetScale({ target: "offsetPoints", reverse: true });
  return [point, polar, line, parallel, offsets, yOffsets];
}

function atomicEncodingPrograms() {
  return [chart()
    .createCanvas({ width: 240, height: 180, margin: 20 })
    .createData({ values: [
      { x: 1, y: 4, nextX: 2, nextY: 3 },
      { x: 2, y: 3, nextX: 3, nextY: 2 }
    ] })
    .createPointMark({ id: "atomicPoints" })
    .encodeX({ target: "atomicPoints", field: "x" })
    .encodeY({ target: "atomicPoints", field: "y" })
    .encodeChannels({
      target: "atomicPoints",
      channels: {
        x: { field: "nextX" },
        y: { field: "nextY" }
      }
    })];
}

function coordinateAspectPrograms() {
  const base = chart()
    .createCanvas({ width: 320, height: 240, margin: 20 })
    .createData({ values: [
      { x: 0, y: 0 },
      { x: 10, y: 5 }
    ] })
    .createPointMark({ id: "aspectPoints" })
    .encodeX({ target: "aspectPoints", field: "x" })
    .encodeY({ target: "aspectPoints", field: "y" });
  const polar = chart()
    .createCanvas({ width: 320, height: 240, margin: 20 })
    .createData({ values: [
      { theta: 0, radius: 1 },
      { theta: 90, radius: 2 }
    ] })
    .createPolarScatterPlot({
      theta: "theta",
      radius: "radius",
      guides: false
    });
  return [
    base.editCoordinate({
      target: "main",
      aspect: { mode: "data", ratio: 1 }
    }),
    polar.editCoordinate({
      target: "polar",
      polarFrame: {
        center: { x: 0.25, y: 0.5 },
        radius: { unit: "fraction", value: 0.8 }
      }
    })
  ];
}

function labelRemovalPrograms() {
  const labeled = chart()
    .createCanvas({ width: 240, height: 180, margin: 20 })
    .createData({ values: [
      { category: "a", value: 2 },
      { category: "b", value: 4 }
    ] })
    .createBarPlot({
      id: "relationshipBars",
      x: "category",
      y: { field: "value", aggregate: "sum" },
      guides: false
    })
    .selectMarks({
      id: "relationshipSelection",
      target: "relationshipBars",
      field: "value",
      op: "max"
    })
    .createMarkLabels({
      id: "relationshipLabels",
      source: "relationshipBars",
      field: "value",
      selection: "relationshipSelection"
    });
  return [
    labeled.editMarkLabelSelection({
      target: "relationshipLabels",
      select: { field: "value", op: "min" }
    }),
    labeled.removeMarkLabels({ source: "relationshipBars" })
  ];
}

function normalizedDataPrograms() {
  return [chart()
    .createData({ id: "normalizationSource", values: [
      { group: "a", value: 1 },
      { group: "a", value: 3 }
    ] })
    .createNormalizedData({
      id: "normalized",
      field: "value",
      as: "share",
      groupBy: "group",
      method: "share"
    })];
}

function missingDataPrograms() {
  const source = chart().createData({ id: "missingSource", values: [
    { series: "a", period: 1, amount: 2 },
    { series: "a", period: 3, amount: 6 }
  ] });
  const completed = source.createCompleteData({
    id: "completed",
    groupBy: "series",
    key: "period",
    values: [1, 2, 3],
    members: "sourceRows"
  });
  return [completed, completed.createImputedData({
    id: "imputed",
    fields: "amount",
    groupBy: "series",
    sortBy: [{ field: "period" }],
    method: "linear"
  })];
}

function derivedEditingPrograms() {
  const rows = [
    {
      group: "a", category: "c1", x: 1, y: 2, value: 1,
      a: 1, b: 2, when: "2024-01-01T00:00:00Z", order: 1,
      missing: null
    },
    {
      group: "a", category: "c2", x: 2, y: 4, value: 2,
      a: 2, b: 3, when: "2024-01-02T00:00:00Z", order: 2,
      missing: 2
    },
    {
      group: "b", category: "c1", x: 3, y: 6, value: 3,
      a: 3, b: 4, when: "2024-01-03T00:00:00Z", order: 3,
      missing: null
    },
    {
      group: "b", category: "c2", x: 4, y: 8, value: 4,
      a: 4, b: 5, when: "2024-01-04T00:00:00Z", order: 4,
      missing: 4
    }
  ];
  let program = chart().createData({ id: "editSource", values: rows });
  program = program
    .createComputedData({
      id: "editComputed", source: "editSource", as: "computed",
      expression: { field: "x" }
    })
    .editComputedData({ target: "editComputed", expression: {
      op: "multiply", left: { field: "x" }, right: { constant: 2 }
    } })
    .filterData({
      id: "editFiltered", source: "editSource", field: "group", oneOf: ["a"]
    })
    .editFilteredData({ target: "editFiltered", oneOf: ["b"] })
    .createFoldData({
      id: "editFold", source: "editSource", fields: ["a", "b"],
      as: { key: "foldKey", value: "foldValue" }
    })
    .editFoldData({ target: "editFold", fields: ["a"] })
    .createSummaryData({
      id: "editSummary", source: "editSource",
      aggregates: [{ op: "mean", field: "value", as: "mean" }]
    })
    .editSummaryData({
      target: "editSummary",
      aggregates: [{ op: "sum", field: "value", as: "mean" }]
    })
    .createBinData({
      id: "editBin", source: "editSource", field: "value",
      boundaries: [0, 2, 4]
    })
    .editBinData({ target: "editBin", boundaries: [0, 3, 4] })
    .createTimeUnitData({
      id: "editTime", source: "editSource", field: "when", unit: "day",
      as: "bucket"
    })
    .editTimeUnitData({ target: "editTime", unit: "month" })
    .createWindowData({
      id: "editWindow", source: "editSource", sortBy: [{ field: "order" }],
      operations: [{ op: "rowNumber", as: "rank" }]
    })
    .editWindowData({
      target: "editWindow", operations: [{ op: "rank", as: "rank" }]
    })
    .createDensityData({
      id: "editDensity", source: "editSource", field: "value", steps: 8
    })
    .editDensityData({ target: "editDensity", steps: 10 })
    .createStackData({
      id: "editStack", source: "editSource", category: "category",
      group: "group", value: "value"
    })
    .editStackData({ target: "editStack", mode: "fill" })
    .createRegressionData({
      id: "editRegression", source: "editSource", x: "x", y: "y"
    })
    .editRegressionData({ target: "editRegression", method: "polynomial" })
    .createIntervalData({
      id: "editInterval", source: "editSource", field: "value"
    })
    .editIntervalData({
      target: "editInterval", center: "median", extent: "iqr"
    })
    .createECDFData({ id: "editECDF", source: "editSource", field: "value" })
    .editECDFData({ target: "editECDF", missing: "error" })
    .createNormalizedData({
      id: "editNormalized", source: "editSource", field: "value",
      as: "normalized", method: "share"
    })
    .editNormalizedData({ target: "editNormalized", method: "minmax" })
    .createCompleteData({
      id: "editComplete", source: "editSource", key: "category",
      groupBy: "group", values: ["c1", "c2"]
    })
    .editCompleteData({ target: "editComplete", values: ["c1", "c2", "c3"] })
    .createImputedData({
      id: "editImputed", source: "editSource", fields: "missing",
      method: "constant", value: 0
    })
    .editImputedData({ target: "editImputed", value: 1 });
  return [program];
}

function collectDirectRelationships(trace, directNames, relationships, observed) {
  if (directNames.has(trace.op)) {
    observed.add(trace.op);
    const wraps = relationships.get(trace.op);
    for (const child of trace.children ?? []) {
      if (directNames.has(child.op) && child.op !== trace.op) wraps.add(child.op);
    }
  }
  for (const child of trace.children ?? []) {
    collectDirectRelationships(child, directNames, relationships, observed);
  }
}

export async function buildActionRelationships() {
  const catalog = JSON.parse(await readFile(catalogFile, "utf8"));
  const actionNames = catalog.actions.map(action => action.name);
  const directNames = new Set(actionNames);
  const relationships = new Map(actionNames.map(name => [name, new Set()]));
  const observed = new Set();
  const descriptors = generateScenarioDescriptors({
    mode: "smoke",
    includeTidyTuesday: false
  });
  const programs = [
    ...descriptors.map(buildScenario),
    ...selectionLifecyclePrograms(),
    ...focusedScaleEditorPrograms(),
    ...atomicEncodingPrograms(),
    ...coordinateAspectPrograms(),
    ...labelRemovalPrograms(),
    ...normalizedDataPrograms(),
    ...missingDataPrograms(),
    ...derivedEditingPrograms()
  ];
  for (const program of programs) {
    collectDirectRelationships(program.trace, directNames, relationships, observed);
  }
  const missing = actionNames.filter(name => !observed.has(name));
  if (missing.length > 0) {
    throw new Error(`Action relationship corpus is missing: ${missing.join(", ")}.`);
  }
  return {
    schemaVersion: 1,
    source: "generated lifecycle smoke corpus plus selection lifecycle",
    actionCount: actionNames.length,
    relationships: actionNames.map(name => ({
      name,
      wraps: [...relationships.get(name)]
    }))
  };
}
