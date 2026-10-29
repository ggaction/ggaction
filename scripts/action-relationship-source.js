import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { chart, prepareDataUpdate, prepareImageResource, prepareFontResource, prepareTextMetrics } from "../src/index.js";
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

function numericTextOffsetPrograms() {
  const program = chart().createCanvas({ width: 500, height: 300, margin: 80 })
    .createData({ values: [{ x: 1, y: 2, label: "A", shift: 8 }] })
    .createTextPlot({ x: "x", y: "y", text: "label" })
    .encodeDx({ field: "shift" }).encodeDy({ value: -4 });
  return [program, program.removeEncoding({ channel: "dx" })];
}

function radarEditorPrograms() {
  return [chart()
    .createCanvas({ width: 320, height: 320, margin: 40 })
    .createData({ values: [
      { series: "a", first: 1, second: 2, third: 3 },
      { series: "b", first: 2, second: 3, third: 4 }
    ] })
    .createRadarPlot({
      id: "radarLines",
      wide: { fields: ["first", "second", "third"] },
      groupBy: "series",
      color: "series",
      guides: false
    })
    .editRadarPlot({
      target: "radarLines",
      wide: { fields: ["third", "first"] }
    })];
}

function legendBlockPrograms() {
  return [chart()
    .createCanvas({ width: 760, height: 600, margin: 160 })
    .createData({ values: [
      { x: 0, y: 0, group: "A", value: 0 },
      { x: 1, y: 1, group: "B", value: 100 }
    ] })
    .createPointMark({ id: "legendBlockPoints" })
    .encodeX({ field: "x" })
    .encodeY({ field: "y" })
    .encodeColor({ field: "group" })
    .encodeSize({ field: "value" })
    .createLegend({ channels: ["color", "size"] })
    .editLegendBlock({
      target: "legendBlockPoints",
      channel: "size",
      title: "Magnitude"
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
    labeled.editMarkLabelPlacement({
      target: "relationshipLabels",
      placement: { anchor: "outsideEnd" }
    }),
    labeled.removeMarkLabels({ source: "relationshipBars" })
  ];
}

function resourceRemovalPrograms() {
  const program = chart()
    .createData({ id: "unusedData", values: [] })
    .createScale({ id: "unusedScale", type: "linear" })
    .createCoordinate({ id: "unusedCoordinate", type: "cartesian" });
  return [program
    .removeData({ id: "unusedData" })
    .removeScale({ id: "unusedScale" })
    .removeCoordinate({ id: "unusedCoordinate" })];
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
    .createPivotData({ id: "editPivot", source: "editSource", field: "category", groupBy: "group", value: "value", op: "sum" })
    .editPivotData({ target: "editPivot", op: "mean" })
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
    .createRegressionData({ id: "statisticsFit", source: "editSource", x: "x", y: "y" })
    .createRegressionStatisticsData({ id: "fitStatistics", source: "statisticsFit" })
    .editRegressionStatisticsData({ target: "fitStatistics", source: "editRegression" })
    .removeData({ id: "fitStatistics" })
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
    .createSortedData({
      id: "editSorted", source: "editSource",
      sortBy: [{ field: "group" }, { field: "value", order: "descending" }]
    })
    .editSortedData({
      target: "editSorted", sortBy: [{ field: "value" }]
    })
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

async function imageResourcePrograms() {
  const base = chart().createCanvas({width: 100, height: 80, margin: 0});
  const bytes = new TextEncoder().encode('<svg xmlns="http://www.w3.org/2000/svg" width="2" height="1"><rect width="2" height="1" fill="red"/></svg>');
  const source = {uri: "fixture:relationship-image", expectedHash: "3a12088d5970454aebf783f37e77640d75dab6494850606f04ca6646a62d005c", mimeType: "image/svg+xml"};
  const host = {requestToken: "image", load: () => ({bytes, mimeType: source.mimeType}), decode: () => ({width: 2, height: 1, originClean: true})};
  const prepared = await prepareImageResource(base, {kind: "create", id: "logo", ...source}, host);
  const marked = base.createImageResource({prepared, requestToken: "image"})
    .createImageMark({image: "logo", alt: "Logo"}).editImageMark({fit: "cover", opacity: 0.5});
  const replacement = await prepareImageResource(marked, {kind: "replace", target: "logo", ...source}, host);
  return [marked.replaceImageResource({prepared: replacement, requestToken: "image"})
    .removeResource({kind: "image", id: "logo", cascade: true})];
}

async function fontResourcePrograms() {
  const bytes = new Uint8Array(await readFile(new URL("../test/fixtures/fonts/metric-fixture.ttf", import.meta.url)));
  const source = { uri: "fixture:relationship-font", expectedHash: "cd7546c63196b68eda1205ca5544da143e0626cfb5623aa8a8988bf69b287878",
    mimeType: "font/ttf", family: "ggaction Metric Fixture", style: "normal", weight: 400, metricsProviderVersion: "fixture@1" };
  const host = { requestToken: "font", load: () => ({ bytes, mimeType: source.mimeType }),
    decode: value => Object.fromEntries(["contentHash", "family", "style", "weight", "metricsProviderVersion"].map(key => [key, value[key]])),
    measure() { throw new Error("An empty font fixture requires no measurements."); } };
  const base = chart().createCanvas();
  const created = base.createFontResource({ prepared: await prepareFontResource(base, { kind: "create", id: "font", ...source }, host), requestToken: "font" });
  const { load: _load, ...metricHost } = host;
  const measured = created.applyTextMetrics({ prepared: await prepareTextMetrics(created, { id: "metrics", fonts: ["font"] }, metricHost), requestToken: "font" });
  return [measured.replaceFontResource({ prepared: await prepareFontResource(measured, { kind: "replace", target: "font", ...source }, host), requestToken: "font" })
    .removeResource({ kind: "font", id: "font", cascade: true })];
}

export async function buildActionRelationships() {
  const catalog = JSON.parse(await readFile(catalogFile, "utf8"));
  const actionNames = catalog.actions.map(action => action.name);
  const directNames = new Set(actionNames);
  const relationships = new Map(actionNames.map(name => [name, new Set()]));
  const observed = new Set();
  const preparedBase = chart();
  const prepared = await prepareDataUpdate(preparedBase, { kind: "create", id: "received",
    source: { kind: "inline", values: [{ x: 1 }] } }, { requestToken: "received" });
  const programs = [...await fontResourcePrograms(), ...await imageResourcePrograms(), preparedBase.applyDataUpdate({ prepared, requestToken: "received" }), ...buildActionRelationshipPrograms(), chart()
    .createCanvas({ width: 500, height: 400, margin: 70 })
    .createData({ values: [{ x: 1, y: 2 }, { x: 2, y: 3 }] })
    .createScatterPlot({ x: "x", y: "y" })
    .editAxes({ x: { labels: { fontSize: 11 } }, y: { labels: { fontSize: 11 } } })];
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

export function buildActionRelationshipPrograms() {
  const descriptors = generateScenarioDescriptors({
    mode: "smoke",
    includeTidyTuesday: false
  });
  return [
    ...descriptors.map(buildScenario),
    chart().createCanvas({plot:{width:300,height:220},margin:60})
      .createData({values:[{group:"A",value:2},{group:"A",value:3},{group:"B",value:4}]})
      .createBeeswarmPlot({id:"points",x:"group",y:"value",guides:false})
      .createLayerPlot({id:"summary",source:"points",plot:{action:"createBoxPlot"}}),
    chart()
    .createCanvas({ plot: { width: 200, height: 200 }, margin: 70 })
    .createData({ values: [{ x: "A", y: 2 }, { x: "B", y: 3 }] })
    .createBarPlot({ id: "bars", x: "x", y: { field: "y", aggregate: "sum" } })
    .createAdjacentPlot({ id: "line" })
    .editCompositionScales({ share: { y: false } }),

    chart().createCanvas({ width: 400, height: 300, margin: 40 })
      .createData({ values: [{ x: "A", y: 2 }, { x: "B", y: 4 }] })
      .createBarPlot({ id: "bars", x: "x", y: "y", guides: false })
      .createOverlay({ id: "trend", source: "bars" })
      .editOverlay({ target: "trend", missing: "connect" }),
    ...[false, true].map(band => chart()
      .createCanvas({ width: 400, height: 300, margin: 40 })
      .createData({ values: [{ x: 1, y: 2 }, { x: 2, y: 4 }] })
      .createScatterPlot({ id: "points", x: "x", y: "y", guides: false })
      .createStatisticalReference({ source: "points", axis: "y",
        ...(band ? { statistics: [{ op: "quantile", p: 0.025 }, { op: "quantile", p: 0.975 }] } : {}) })),
    chart().createCanvas().createData({ values: [{ group: "A", min: 1, q1: 2, median: 3, q3: 4, max: 5 }] })
      .createBoxPlot({ x: { field: "group", fieldType: "nominal" },
        summary: { min: "min", q1: "q1", median: "median", q3: "q3", max: "max" },
        width: { pixels: 30 }, median: { width: { pixels: 18 } }, whisker: { caps: false } })
      .editBoxPlot({ whisker: { caps: true, stroke: "black" } }),
    chart().createCanvas({ width: 600, height: 400, margin: 100 })
      .createData({ values: [{ x: 1, y: 2, label: "A", group: "one" }] })
      .createTextPlot({ x: "x", y: "y", text: "label", color: "group" }),
    chart().createCanvas({ width: 400, height: 300, margin: 40 })
      .createData({ values: [{ x: 1, y: 2, group: "A" }] })
      .createScatterPlot({ x: "x", y: "y", stroke: "group", point: { strokeWidth: 2 }, guides: false }),
    chart().createCanvas({ width: 400, height: 300, margin: 40 })
      .createData({ values: [{ x: 1, y: 2, amount: 3 }, { x: 2, y: 4, amount: 8 }] })
      .createScatterPlot({ x: "x", y: "y", size: "amount", guides: false }),
    chart().createCanvas({ width: 400, height: 300, margin: 40 })
      .createData({ values: [{ x: 1, y: 2 }] })
      .createScatterPlot({ x: "x", y: "y", point: { radius: 4 }, guides: false }),
    ...[true, false].map(vertical => chart()
      .createCanvas({ width: 400, height: 300, margin: 40 })
      .createData({ values: [{ category: "A", lo: 2, hi: 6 }, { category: "B", lo: 3, hi: 7 }] })
      .createBarPlot({
        x: vertical ? "category" : { lower: "lo", upper: "hi" },
        y: vertical ? { lower: "lo", upper: "hi" } : "category", guides: false
      })),
    chart().createCanvas().createData({ values: [{ category: "A", amount: 3 }, { category: "B", amount: 8 }] })
      .createPiePlot({ category: "category", radius: { field: "amount", aggregate: "sum" }, guides: false }),
    ...selectionLifecyclePrograms(),
    ...focusedScaleEditorPrograms(),
    ...atomicEncodingPrograms(),
    ...numericTextOffsetPrograms(),
    ...radarEditorPrograms(),
    ...legendBlockPrograms(),
    ...coordinateAspectPrograms(),
    ...labelRemovalPrograms(),
    ...resourceRemovalPrograms(),
    ...normalizedDataPrograms(),
    ...missingDataPrograms(),
    ...derivedEditingPrograms(),
    chart().createCanvas().createData({ values: [{ day: "2024-02-29", value: 1 }] })
      .createCalendarLayout({ date: "day", value: "value", start: "2024-02-01", end: "2024-02-29", timeZone: "UTC", weekStartsOn: 1, aggregate: "sum", missing: "empty" })
      .createCalendarPlot().editCalendarPlot({ cells: { opacity: .5 } }).editLayout({ options: { missing: "omit" } }),
    chart().createCanvas().createContourData({ id: "surface", grid: { origin: [0, 0], dx: 1, dy: 1, width: 2, height: 2, values: [0, 1, 1, 2] }, thresholds: [0, 1, 2] })
      .createContourMark().editContourMark({ opacity: .5 }).editContourData({ target: "surface", thresholds: [0, .5, 2] }),
    chart().createData({ id: "samples", values: [{ x: 0, y: 0 }, { x: 1, y: 1 }] })
      .createDensityContourData({ id: "density", x: "x", y: "y", grid: { origin: [0, 0], dx: 1, dy: 1, width: 2, height: 2 }, estimator: "histogram", normalization: "count", thresholds: [0, 1] }),
    chart().createCanvas().createData({ id: "flowNodesSource", values: [{ id: "a" }, { id: "b" }] })
      .createData({ id: "flowEdgesSource", values: [{ id: "ab", from: "a", to: "b", amount: 5 }] })
      .createFlowData({ id: "flow", nodes: "flowNodesSource", edges: "flowEdgesSource", nodeKey: "id", source: "from", target: "to", edgeKey: "id", value: "amount" })
      .layoutFlow({ id: "flow-layout", method: "dag" })
      .createFlowLinks().createFlowNodes({ labels: {} })
      .editFlowLinks({ links: { opacity: .6 } }).editFlowNodes({ nodes: { fill: "#123456" } })
      .editLayout({ target: "flow-layout", options: { nodePadding: 10 } })
      .editFlowData({ target: "flow", definition: { balance: "strict" } }),
    chart().createCanvas().createData({ id: "graphNodes", values: [{ id: "a" }, { id: "b" }], keyField: "id" })
      .createData({ id: "graphEdges", values: [{ from: "a", to: "b" }] })
      .createGraphData({ id: "network", nodes: "graphNodes", edges: "graphEdges", nodeKey: "id", source: "from", target: "to" })
      .layoutGraph({ id: "network-layout", method: "circular" })
      .bundleGraphEdges({ id: "edge-routes", method: "edge-path", coordinateSpace: "screen" })
      .createGraphPlot({ labels: {}, routes: "edge-routes" }).editGraphPlot({ nodes: { radius: 8 } })
      .editEdgeRoute({ options: { exponent: 3 } }).editCanvas({ width: 650 })
      .editLayout({ target: "network-layout", options: { radius: 80 } })
      .editGraphData({ definition: { directed: true } }),
    chart().createCanvas().createGeometryData({ id: "geoPoints", format: "geojson", coordinateKind: "planar", values: { type: "MultiPoint", coordinates: [[10, 10], [30, 20]] } })
      .createProjection({ id: "geoPlane", type: "identity" }).createCoordinate({ id: "geo", type: "geo", projection: "geoPlane" })
      .createGeoShapeMark({ id: "geoShape", coordinate: "geo", geometry: "geoPoints" }).editGeoShapeMark({ opacity: .8 })
      .createGeoPointMark({ id: "geoCities", coordinate: "geo", geometry: "geoPoints" }).editGeoPointMark({ radiusPx: 5 })
      .createGeometryData({ id: "geoLines", format: "geojson", coordinateKind: "planar", values: { type: "LineString", coordinates: [[10, 10], [30, 20]] } })
      .createGeoLineMark({ id: "geoRoutes", coordinate: "geo", geometry: "geoLines" }).editGeoLineMark({ strokeWidth: 3 })
      .createProjection({ id: "geoSphere", type: "equirectangular", translatePx: [200, 150] })
      .createCoordinate({ id: "sphere", type: "geo", projection: "geoSphere" }).createGraticule({ id: "geoGrid", coordinate: "sphere" })
      .editGraticule({ opacity: .3 }).editProjection({ target: "geoPlane", scalePx: 2 }).editCoordinate({ target: "geo", projection: "geoPlane" }),
    chart().createData({ id: "measurements", values: [{ code: "place", value: 10 }] })
      .createGeometryData({ id: "geometry", format: "geojson", coordinateKind: "planar", featureKey: "id",
        values: { type: "Feature", id: "place", properties: {}, geometry: { type: "Point", coordinates: [10, 20] } } })
      .createGeoJoinData({ id: "joinedGeometry", geometry: "geometry", data: "measurements", geometryKey: "id", dataKey: "code" })
      .createProjection({ id: "joinedFit", type: "identity", fit: { width: 100, height: 100 } })
      .editGeoJoinData({ target: "joinedGeometry", dataKey: "code" }),
    chart().createGeometryData({ id: "fitShape", format: "geojson", coordinateKind: "planar",
      values: { type: "LineString", coordinates: [[0, 0], [10, 20]] } })
      .createProjection({ id: "fittedMap", type: "identity", fit: { geometry: "fitShape", width: 100, height: 100 } })
      .editProjection({ reflectX: true }).editGeometryData({ target: "fitShape", values: { type: "LineString", coordinates: [[0, 0], [20, 20]] } }),
    chart().createGeometryData({ id: "geometry", format: "geojson", coordinateKind: "geographic", featureKey: "id",
      values: { type: "Feature", id: "place", properties: {}, geometry: { type: "Point", coordinates: [12.6, 55.7] } } })
      .editGeometryData({ coordinateKind: "planar" }),
    chart().createCanvas().createData({ id: "features", values: [{ id: "a", x: 0 }, { id: "b", x: 1 }, { id: "c", x: 3 }] })
      .createInferredGraphData({ id: "neighbors", nodeKey: "id", ruleId: "nearest", rule: "knn", features: ["x"], metric: "euclidean" })
      .layoutGraph({ id: "neighbor-layout", method: "circular" }).createGraphPlot({ labels: {} })
      .editInferredGraphData({ definition: { options: { k: 2 } } }),
    chart().createCanvas().createData({ id: "hierarchyRows", values: [{ id: "root", parent: null, value: 3 }, { id: "a", parent: "root", value: 3 }] })
      .createHierarchyData({ id: "hierarchy", key: "id", parent: "parent", value: "value" })
      .layoutHierarchy({ id: "tree-layout", method: "tree", options: { nodeSize: [20, 10], siblingGap: 10, depthGap: 20, orientation: "vertical" } })
      .createTreePlot({ id: "tree", labels: {} }).editTreePlot({ nodes: { radius: 8 } })
      .editHierarchyData({ target: "hierarchy", valueMode: "inclusive" })
      .editLayout({ target: "tree-layout", options: { siblingGap: 12 } })
      .layoutHierarchy({ id: "treemap-layout", hierarchy: "hierarchy", method: "treemap", options: { size: [200, 100], padding: 3, method: "squarify" } })
      .createTreemapPlot({ id: "treemap", layout: "treemap-layout", labels: {} }).editTreemapPlot({ cells: { opacity: .8 } })
      .layoutHierarchy({ id: "partition-layout", hierarchy: "hierarchy", method: "partition" })
      .createPartitionPlot({ id: "partition", layout: "partition-layout", labels: {} })
      .selectMarks({ id: "partition-choice", target: "partition", field: "id", op: "eq", value: "root" })
      .editPartitionPlot({ focus: { key: "a" }, prunedSelection: "drop", padding: [2, 3] })
      .removeMark({ target: "partition" }).removeResource({ kind: "layout", id: "partition-layout" })
      .removeMark({ target: "tree" }).removeMark({ target: "treemap" })
      .removeResource({ kind: "layout", id: "tree-layout" }).removeResource({ kind: "layout", id: "treemap-layout" })
      .removeResource({ kind: "hierarchy", id: "hierarchy" }),
    chart().createParameter({ id: "factor", value: 2 })
      .editParameter({ target: "factor", value: 3 }).removeParameter({ id: "factor" }),
    chart().createData({ id: "parameterSource", values: [{ value: 2 }] })
      .createParameter({ id: "factor", value: 2 })
      .createComputedData({
        id: "parameterComputed", source: "parameterSource", as: "scaled",
        expression: {
          version: 2, registry: "standard@1",
          root: {
            type: "binary", op: "multiply",
            left: { type: "field", name: "value" },
            right: { type: "parameter", id: "factor" }
          }
        }
      })
      .editParameter({ target: "factor", value: 3 }),
    chart().createData({id:"people",values:[{name:"A",age:25}]}).createData({id:"groups",values:[{person:"A"}]})
      .createLookupData({id:"ages",field:"person",lookup:{data:"people",key:"name",fields:["age"]}})
      .editLookupData({target:"ages",lookup:{data:"people",key:"name",fields:["age"],as:["years"]}}),
    chart().createData({values:[{amounts:[1,2],labels:["A"]}]})
      .createFlattenData({id:"expandedArrays",fields:["amounts","labels"],as:["amount","label"]})
      .editFlattenData({target:"expandedArrays",as:["value","category"]}),
    chart().createData({ id: "revisionSource", values: [{ x: 1 }] })
      .reviseData({ source: "revisionSource", id: "revisionNext", values: [{ x: 2 }] }),
    chart().applyTextMetrics({ profile: { schemaVersion: 1, id: "host", measurements: [] } }).removeTextMetrics()
  ];
}
