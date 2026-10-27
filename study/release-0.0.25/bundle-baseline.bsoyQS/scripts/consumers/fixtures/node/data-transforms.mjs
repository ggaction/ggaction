import { fileURLToPath as consumerPath } from "node:url";
import assert from "node:assert/strict";
import { chart, hconcat, render, vconcat } from "ggaction";
import { chart as basicChart, render as basicRender } from "ggaction/basic";
import { action, ChartProgram, registerExtension } from "ggaction/extension";
import { renderToPDF, renderToPDFBuffer } from "ggaction/pdf";
import { renderToPNG, renderToPNGBuffer } from "ggaction/png";
import { renderToSVG } from "ggaction/svg";
import { createTransitionScene } from "ggaction/scene";
import { serializeProgram, deserializeProgram, serializeGraphic, deserializeGraphic } from "ggaction/persistence";
import { exportAccessibleData } from "ggaction/accessibility";
import { comparePrograms, describeAction, getDatasetSchema, inspectProgram } from "ggaction/inspection";
import {createFacetSharedTopLaneProgram} from "./facet-lane-public.js";
import {createPlotUnderlayProgram} from "./plot-underlay-public.js";

export const cases = [
  { id: "data-transforms/bootstrap-rows", async run() {
const bootstrapRows = [{x:0,y:0},{x:0,y:1},{x:0,y:2},{x:0,y:30}];
const bootstrapSummary = chart().createData({values:bootstrapRows}).createSummaryData({id:"ci",groupBy:"x",aggregates:[
      {field:"y",op:{op:"ciLower",method:{type:"bootstrap",seed:1}},as:"lower"},
      {field:"y",op:{op:"ciUpper",method:{type:"bootstrap",seed:1}},as:"upper"}
    ]});
const bootstrapInterval = chart().createData({values:bootstrapRows}).createIntervalData({id:"ci",groupBy:"x",field:"y",method:{type:"bootstrap",seed:1},as:{center:"mean",lower:"lower",upper:"upper"}});
const summaryCI = bootstrapSummary.semanticSpec.datasets.find(dataset=>dataset.id==="ci").values[0];
const intervalCI = bootstrapInterval.semanticSpec.datasets.find(dataset=>dataset.id==="ci").values[0];
assert.equal(summaryCI.lower,intervalCI.lower);
assert.equal(summaryCI.upper,intervalCI.upper);
assert.deepEqual(deserializeProgram(serializeProgram(bootstrapSummary)).graphicSpec,bootstrapSummary.graphicSpec);
  } },
  { id: "data-transforms/extracted", async run() {
const extracted = chart().createCanvas({ width: 440, height: 340, margin: 20 })
      .createData({ values: [{ item: { value: 1 }, text: "1.5%" }, { text: "2%" }] })
      .createComputedData({ id: "nested", as: "x", expression: { op: "getPath", operand: { field: "item" }, path: ["value"] } })
      .createComputedData({ id: "stripped", as: "numberText", expression: { op: "replaceLiteral", operand: { field: "text" }, search: "%", replacement: "" } })
      .createComputedData({ id: "numbers", as: "y", expression: { op: "toNumber", operand: { field: "numberText" } } })
      .filterData({ id: "defined", field: "x", noneOf: [null] })
      .createScatterPlot({ x: "x", y: "y", guides: false });
assert.deepEqual(extracted.semanticSpec.datasets.find(d => d.id === "nested").values.map(row => row.x), [1, null]);
assert.equal(extracted.graphicSpec.objects.scatterPlot.items.length, 1);
assert.deepEqual(deserializeProgram(serializeProgram(extracted)).graphicSpec, extracted.graphicSpec);
assert.ok((await renderToPNGBuffer(extracted)).buffer.length > 100);
  } },
  { id: "data-transforms/calendar", async run() {
const calendar = chart().createData({ values: [{ issued: "1986-12-30", redeemed: "2024-07-17", value: -1.8 }] })
      .createComputedData({ id: "years", as: "year", expression: { op: "datePart", part: "year", operand: { op: "parseTime", operand: { field: "redeemed" } } } })
      .createComputedData({ id: "rounded", as: "lower", expression: { op: "floor", operand: { field: "value" } } });
assert.equal(calendar.semanticSpec.datasets.find(d => d.id === "years").values[0].year, 2024);
assert.equal(calendar.semanticSpec.datasets.find(d => d.id === "rounded").values[0].lower, -2);
assert.deepEqual(deserializeProgram(serializeProgram(calendar)).semanticSpec, calendar.semanticSpec);
  } },
  { id: "data-transforms/installed-data-flow", async run() {
const installedDataFlow = chart()
      .createData({ id: "flowRaw", values: [
        { group: "A", t: 0, value: 2, weight: 1 },
        { group: "A", t: 2, value: 6, weight: 3 }
      ] })
      .createCompleteData({
        id: "flowComplete", source: "flowRaw", key: "t", groupBy: "group",
        values: [0, 1, 2], fill: { weight: 2 }
      })
      .createImputedData({
        id: "flowImputed", source: "flowComplete", fields: "value",
        groupBy: "group", method: "linear", sortBy: [{ field: "t" }]
      })
      .createComputedData({
        id: "flowComputed", source: "flowImputed", as: "doubled",
        expression: { op: "multiply", left: { field: "value" }, right: { constant: 2 } }
      })
      .createNormalizedData({
        id: "flowNormalized", source: "flowComputed", field: "doubled",
        as: "share", groupBy: "group", method: "share"
      })
      .createWindowData({
        id: "flowMoving", source: "flowNormalized", temporalUnit: "timestamp",
        partitionBy: "group", sortBy: [{ field: "t" }], operations: [{
          op: "movingSum", field: "share", as: "trailing",
          frame: { duration: { preceding: 1, unit: "millisecond" } }
        }]
      })
      .createSummaryData({
        id: "flowWeighted", source: "flowMoving", groupBy: "group",
        aggregates: [{ op: "mean", field: "trailing", as: "mean" }],
        weight: { field: "weight", kind: "frequency" }
      });
const installedDataRevision = installedDataFlow.editCompleteData({
      target: "flowComplete", fill: { value: 8, weight: 2 },
      dependents: "recompute"
    });
const installedSummaryId = installedDataRevision.materializationConfigs
      .data.summary.flowWeighted.current;
assert.deepEqual(installedDataRevision.semanticSpec.datasets.find(
      dataset => dataset.id === installedSummaryId
    ).values, [{ group: "A", mean: 2 / 3 }]);
assert.equal(installedDataRevision.semanticSpec.datasets.some(
      dataset => dataset.id === "flowComplete"
    ), false);
  } },
  { id: "data-transforms/monthly", async run() {
const monthly = chart()
      .createData({
        id: "datedEvents",
        values: [{ date: "2024-05-17T13:45:00Z", value: 2 }]
      })
      .createTimeUnitData({
        id: "monthlyEvents",
        field: "date",
        unit: "month",
        as: "month"
      });
assert.equal(
      monthly.semanticSpec.datasets.find(dataset => dataset.id === "monthlyEvents")
        .values[0].month,
      Date.UTC(2024, 4, 1)
    );
  } },
  { id: "data-transforms/local-week", async run() {
const localWeek = chart()
      .createData({ id: "weekEvents", values: [{ date: "2024-01-03T12:00:00Z" }] })
      .createTimeUnitData({
        id: "localWeek",
        field: "date",
        unit: "week",
        as: "week",
        timeZone: "Asia/Seoul",
        weekStartsOn: 1
      });
assert.equal(
      localWeek.semanticSpec.datasets.find(dataset => dataset.id === "localWeek").values[0].week,
      Date.parse("2023-12-31T15:00:00Z")
    );
  } },
  { id: "data-transforms/summarized", async run() {
const summarized = chart()
      .createData({
        id: "sales",
        values: [
          { region: "East", value: 2 },
          { region: "East", value: 3 },
          { region: "West", value: 4 }
        ]
      })
      .createSummaryData({
        id: "regionalSales",
        groupBy: "region",
        aggregates: [
          { op: "sum", field: "value", as: "total" },
          { op: "count", as: "records" }
        ]
      });
assert.deepEqual(
      summarized.semanticSpec.datasets.find(dataset => dataset.id === "regionalSales").values,
      [
        { region: "East", total: 5, records: 2 },
        { region: "West", total: 4, records: 1 }
      ]
    );
  } },
  { id: "data-transforms/large-summary", async run() {
const largeSummary = chart().createData({ values: Array.from({length: 10001}, (_,group) => ({group,value:group%17})) })
      .createSummaryData({id:"largeSummary",groupBy:"group",aggregates:[{op:"mean",field:"value",as:"average"}]});
assert.equal(largeSummary.semanticSpec.datasets.at(-1).values.length,10001);
assert.equal(largeSummary.semanticSpec.datasets.at(-1).values.at(-1).average,10000%17);
assert.deepEqual(deserializeProgram(serializeProgram(largeSummary)).semanticSpec,largeSummary.semanticSpec);
  } },
  { id: "data-transforms/weighted-summary", async run() {
const weightedSummary = chart()
      .createData({ id: "weighted", values: [
        { value: 1, weight: 1 },
        { value: 3, weight: 3 }
      ] })
      .createSummaryData({
        id: "weightedSummary",
        aggregates: [
          { op: "count", as: "count" },
          { op: "mean", field: "value", as: "mean" }
        ],
        weight: { field: "weight", kind: "frequency" }
      });
assert.deepEqual(
      weightedSummary.semanticSpec.datasets.at(-1).values,
      [{ count: 4, mean: 2.5 }]
    );
  } },
  { id: "data-transforms/reusable-bins", async run() {
const reusableBins = chart()
      .createData({ id: "binValues", values: [{ value: 0 }, { value: 2 }, { value: 4 }] })
      .createBinData({
        id: "valueBins",
        field: "value",
        boundaries: [0, 2, 4]
      });
assert.deepEqual(
      reusableBins.semanticSpec.datasets.find(dataset => dataset.id === "valueBins").values,
      [
        { value_start: 0, value_end: 2, count: 1 },
        { value_start: 2, value_end: 4, count: 2 }
      ]
    );
  } },
  { id: "data-transforms/folded", async run() {
const folded = chart()
      .createData({
        id: "wideValues",
        values: [{ region: "North", apples: 2, pears: 3 }]
      })
      .createFoldData({
        id: "longValues",
        fields: ["apples", "pears"],
        as: { key: "fruit", value: "amount" }
      });
assert.deepEqual(
      folded.semanticSpec.datasets.find(dataset => dataset.id === "longValues").values,
      [
        { region: "North", apples: 2, pears: 3, fruit: "apples", amount: 2 },
        { region: "North", apples: 2, pears: 3, fruit: "pears", amount: 3 }
      ]
    );
  } },
  { id: "data-transforms/computed", async run() {
const computed = chart()
      .createData({ id: "parts", values: [{ part: 2, whole: 8 }] })
      .createComputedData({
        id: "shares",
        as: "share",
        expression: {
          op: "divide",
          left: { field: "part" },
          right: { field: "whole" }
        }
      });
assert.equal(
      computed.semanticSpec.datasets.find(dataset => dataset.id === "shares").values[0].share,
      0.25
    );
const editedComputed = computed.editComputedData({
      target: "shares",
      expression: {
        op: "multiply",
        left: { field: "part" },
        right: { constant: 2 }
      }
    });
assert.equal(
      editedComputed.semanticSpec.datasets.find(dataset =>
        dataset.id === editedComputed.materializationConfigs.data.computed.shares.current
      ).values[0].share,
      4
    );
assert.equal(
      computed.semanticSpec.datasets.find(dataset => dataset.id === "shares").values[0].share,
      0.25
    );
const genericallyEditedComputed = editedComputed.editDerivedData({
      target: "shares",
      definition: {
        type: "computed",
        as: "share",
        expression: {
          op: "add",
          left: { field: "part" },
          right: { field: "whole" }
        }
      }
    });
assert.equal(
      genericallyEditedComputed.semanticSpec.datasets.find(dataset =>
        dataset.id === genericallyEditedComputed.materializationConfigs.data.computed.shares.current
      ).values[0].share,
      10
    );
  } },
  { id: "data-transforms/classified", async run() {
const classified = chart()
      .createData({ id: "measurements", values: [{ value: -1 }, { value: 4 }] })
      .createComputedData({
        id: "classified",
        as: "class",
        expression: {
          op: "if",
          condition: { op: "gt", left: { field: "value" }, right: { constant: 0 } },
          then: { constant: "positive" },
          else: { constant: "non-positive" }
        }
      })
      .createNormalizedData({
        id: "indexed",
        source: "classified",
        field: "value",
        as: "index",
        method: "index",
        baseline: { value: -1 }
      });
assert.deepEqual(
      classified.semanticSpec.datasets.find(dataset => dataset.id === "classified")
        .values.map(row => row.class),
      ["non-positive", "positive"]
    );
assert.deepEqual(
      classified.semanticSpec.datasets.find(dataset => dataset.id === "indexed")
        .values.map(row => row.index),
      [100, -400]
    );
  } },
  { id: "data-transforms/completed", async run() {
const completed = chart()
      .createData({ id: "sparse", values: [
        { series: "A", period: 1, amount: 2 },
        { series: "A", period: 3, amount: 6 }
      ] })
      .createCompleteData({
        id: "completed",
        key: "period",
        groupBy: "series",
        values: [1, 2, 3],
        members: "sourceRows"
      });
assert.deepEqual(
      completed.semanticSpec.datasets.find(dataset => dataset.id === "completed").values,
      [
        { series: "A", period: 1, amount: 2, sourceRows: [0] },
        { series: "A", period: 2, amount: null, sourceRows: [] },
        { series: "A", period: 3, amount: 6, sourceRows: [1] }
      ]
    );
const imputed = completed.createImputedData({
      id: "imputed",
      fields: "amount",
      groupBy: "series",
      sortBy: [{ field: "period" }],
      method: "linear"
    });
assert.deepEqual(
      imputed.semanticSpec.datasets.find(dataset => dataset.id === "imputed")
        .values.map(row => row.amount),
      [2, 4, 6]
    );
  } },
  { id: "data-transforms/stacked", async run() {
const stacked = chart()
      .createData({
        id: "stackCells",
        values: [
          { category: "A", series: "one", amount: 2 },
          { category: "A", series: "two", amount: 3 }
        ]
      })
      .createStackData({
        id: "stackedCells",
        category: "category",
        group: "series",
        value: "amount"
      });
assert.deepEqual(
      stacked.semanticSpec.datasets.find(dataset => dataset.id === "stackedCells")
        .values.map(row => [row.amount_start, row.amount_end, row.amount_share]),
      [[0, 2, 0.4], [2, 5, 0.6]]
    );
  } },
  { id: "data-transforms/elapsed", async run() {
const elapsed = chart()
      .createData({ id: "elapsedSource", values: [
        { time: 0, value: 2 },
        { time: 86_400_000, value: null },
        { time: 604_800_000, value: 6 }
      ] })
      .createWindowData({
        id: "elapsed",
        temporalUnit: "timestamp",
        sortBy: [{ field: "time" }],
        operations: [{
          op: "movingMean",
          field: "value",
          as: "mean",
          frame: { duration: { preceding: 7, unit: "day" } },
          missing: "skip",
          minPeriods: 1
        }]
      });
assert.deepEqual(
      elapsed.semanticSpec.datasets.find(dataset => dataset.id === "elapsed")
        .values.map(row => row.mean),
      [2, 2, 4]
    );
  } },
  { id: "data-transforms/normal-interval", async run() {
const normalInterval = chart().createData({ values: [
      { value: 1 }, { value: 2 }, { value: 3 }
    ] }).createIntervalData({ id: "normalInterval", field: "value", method: "normal" });
assert.equal(normalInterval.semanticSpec.datasets.at(-1).transform[0].method, "normal");
assert.equal(normalInterval.semanticSpec.datasets.at(-1).values[0].__normalInterval_upper, 3.131606527612);
  } },
  { id: "data-transforms/normal-regression", async run() {
const normalRegression = chart().createData({ values: [
      { x: 0, y: 1 }, { x: 1, y: 2 }, { x: 2, y: 4 }
    ] }).createRegressionData({
      id: "normalRegression", x: "x", y: "y",
      confidenceMethod: "normal", level: 0.9
    });
assert.equal(normalRegression.semanticSpec.datasets.at(-1).transform[0].confidenceMethod, "normal");
assert.equal(normalRegression.semanticSpec.datasets.at(-1).transform[0].level, 0.9);
const regressionStatistics = normalRegression.createRegressionStatisticsData({id:"fitStatistics",source:"normalRegression"});
assert.equal(regressionStatistics.semanticSpec.datasets.at(-1).values[0].count,3);
assert.equal(regressionStatistics.semanticSpec.datasets.at(-1).values[0].slope,1.5);
assert.equal(regressionStatistics.semanticSpec.datasets.at(-1).values[0].rSquared,27/28);
const statisticsRevision = regressionStatistics.createRegressionData({id:"anotherFit",source:"data",x:"x",y:"y",interval:false})
      .editRegressionStatisticsData({source:"anotherFit"});
assert.equal(statisticsRevision.semanticSpec.datasets.at(-1).source,"anotherFit");
assert.deepEqual(deserializeProgram(serializeProgram(statisticsRevision)).semanticSpec,statisticsRevision.semanticSpec);
  } }
];
