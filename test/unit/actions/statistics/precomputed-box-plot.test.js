import assert from "node:assert/strict";
import test from "node:test";
import { chart } from "../../../../src/index.js";
import { serializeProgram, deserializeProgram } from "../../../../src/persistence.js";
import { renderToSVG } from "../../../../src/renderers/svg.js";
import { BOX_FIELDS } from "../../../../src/grammar/boxPlot.js";

const summary = { min: "min", q1: "q1", median: "median", q3: "q3", max: "max" };
const rows = [
  { group: "A", min: 3.07, q1: 13.3475, median: 17.795, q3: 24.1275, max: 50.81 },
  { group: "B", min: 2, q1: 5, median: 7, q3: 8, max: 15 }
];
const base = (values = rows) => chart().createCanvas({ width: 600, height: 400, margin: 80 })
  .createData({ id: "rows", values });
const options = { x: { field: "group", fieldType: "nominal" }, summary,
  width: { pixels: 30 }, median: { width: { pixels: 18 } }, whisker: { caps: false, stroke: "black" } };
const props = (program, id, index = 0) => program.graphicSpec.objects[id].items[index].properties;

test("precomputed boxes preserve exact summaries and explicit component geometry", () => {
  const source = base();
  const before = serializeProgram(source);
  const result = source.createBoxPlot(options);
  const data = result.semanticSpec.datasets.find(d => d.id === "boxPlotSummaryData");
  assert.equal(data.transform[0].method, "precomputed");
  assert.deepEqual(data.values[0], { group: "A", [BOX_FIELDS.q1]: 13.3475,
    [BOX_FIELDS.median]: 17.795, [BOX_FIELDS.q3]: 24.1275,
    [BOX_FIELDS.lowerWhisker]: 3.07, [BOX_FIELDS.upperWhisker]: 50.81 });
  assert.equal(props(result, "boxPlot").width, 30);
  const median = props(result, "boxPlotMedian");
  assert.equal(median.x2 - median.x1, 18);
  assert.equal(props(result, "boxPlotWhisker").stroke, "black");
  assert.equal(result.graphicSpec.objects.boxPlotWhiskerLowerCap, undefined);
  assert.equal(result.semanticSpec.layers.some(l => l.id === "boxPlotOutliers"), false);
  assert.equal(serializeProgram(source), before);
  assert.deepEqual(deserializeProgram(serializeProgram(result)).graphicSpec, result.graphicSpec);
  const resized = result.editCanvas({ width: 900 });
  assert.equal(props(resized, "boxPlot").width, 30);
  assert.equal(props(resized, "boxPlotMedian").x2 - props(resized, "boxPlotMedian").x1, 18);
});

test("summary boxes support horizontal roles, revisions and component edits", () => {
  const original = base().createBoxPlot(options);
  const styled = original.editBoxPlot({ width: { pixels: 40 }, median: { width: { pixels: 12 }, stroke: "blue" },
    whisker: { caps: true, capSize: 10, stroke: "red", strokeWidth: 2 } });
  assert.equal(props(styled, "boxPlot").width, 40);
  assert.equal(props(styled, "boxPlotMedian").x2 - props(styled, "boxPlotMedian").x1, 12);
  assert.equal(props(styled, "boxPlotWhiskerLowerCap").stroke, "red");
  const horizontal = styled.editBoxPlot({ x: { field: "median" }, y: { field: "group", fieldType: "nominal" } });
  assert.equal(props(horizontal, "boxPlot").height, 40);
  assert.equal(props(horizontal, "boxPlotMedian").y2 - props(horizontal, "boxPlotMedian").y1, 12);
  const revised = horizontal.createData({ id: "newRows", values: rows.map(row => ({ ...row, max: row.max + 10 })) })
    .editBoxPlot({ data: "newRows", whisker: { caps: false } });
  const config = revised.markConfigs.boxPlot.boxPlot;
  const data = revised.semanticSpec.datasets.find(d => d.id === config.summaryId);
  assert.equal(data.values[0][BOX_FIELDS.upperWhisker], 60.81);
  assert.equal(revised.graphicSpec.objects.boxPlotWhiskerLowerCap, undefined);
  const auto = revised.editBoxPlot({ median: { width: "auto" } });
  assert.equal(props(auto, "boxPlotMedian").y2 - props(auto, "boxPlotMedian").y1, 40);
  assert.equal(props(original, "boxPlot").width, 30);
});

test("precomputed box source replay and facets retain summary semantics", () => {
  const result = base().createBoxPlot({ ...options, guides: {} });
  const facet = result.facet({ field: "group", columns: 2 });
  assert.match(renderToSVG(facet), /<svg/);
  assert.deepEqual(deserializeProgram(serializeProgram(facet)).graphicSpec, facet.graphicSpec);
  const revised = result.reviseData({ source: "rows", id: "updated", values: rows.map(row => ({ ...row, q1: row.q1 + 1 })) });
  assert.match(renderToSVG(revised), /<svg/);
  const updatedSummary = revised.semanticSpec.datasets.find(d => d.values?.[0]?.[BOX_FIELDS.q1] === rows[0].q1 + 1);
  assert.ok(updatedSummary);
});

test("precomputed summaries and dimensions reject invalid intent without source mutation", () => {
  const source = base();
  const before = serializeProgram(source);
  for (const patch of [{ summary: { min: "min" } }, { summary: null }, { whisker: null }, { whisker: 3 }, { width: { pixels: -1 } },
    { width: { pixels: 10, band: 0.5 } }, { median: { width: { band: 0.5 } } },
    { whisker: { type: "tukey" } }, { outliers: true }, { y: { field: "q1" } }]) {
    assert.throws(() => source.createBoxPlot({ ...options, ...patch }));
    assert.equal(serializeProgram(source), before);
  }
  const complete = source.createBoxPlot(options);
  const completeBefore = serializeProgram(complete);
  assert.throws(() => complete.editBoxPlot({ whisker: null }));
  assert.equal(serializeProgram(complete), completeBefore);
  for (const values of [[{ ...rows[0], min: 100 }], [{ ...rows[0], q1: null }]]) {
    assert.throws(() => base(values).createBoxPlot(options));
  }
});

test("box edits switch between observed samples and explicit summaries", () => {
  const raw = chart().createCanvas().createData({ id: "raw", values: [
    { group: "A", value: 1 }, { group: "A", value: 2 }, { group: "A", value: 3 }
  ] }).createBoxPlot({ x: { field: "group", fieldType: "nominal" }, y: { field: "value" } });
  const converted = raw.createData({ id: "summaries", values: rows })
    .editBoxPlot({ data: "summaries", y: { field: "median" }, summary });
  const config = converted.markConfigs.boxPlot.boxPlot;
  assert.equal(converted.semanticSpec.datasets.find(d => d.id === config.summaryId).values[0][BOX_FIELDS.q1], 13.3475);
  const styled = converted.editBoxPlot({ whisker: { caps: false, opacity: 0.5 } });
  assert.equal(styled.markConfigs.boxPlot.boxPlot.summaryId, config.summaryId);
  const restored = styled.editBoxPlot({ data: "raw", y: { field: "value" }, summary: false,
    whisker: { type: "tukey" }, outliers: true });
  const restoredData = restored.semanticSpec.datasets.find(d => d.id === restored.markConfigs.boxPlot.boxPlot.summaryId);
  assert.equal(restoredData.values[0][BOX_FIELDS.q1], 1.5);
  assert.equal(restoredData.values[0][BOX_FIELDS.count], 3);
  assert.equal(restored.markConfigs.boxPlotWhisker.errorBar.caps, false);
});

test("precomputed rows retain repeated categories until facet partitioning", () => {
  const values = [{ ...rows[0], panel: "one" }, { ...rows[1], group: "A", panel: "two" }];
  const result = base(values).createBoxPlot(options);
  assert.equal(result.graphicSpec.objects.boxPlot.items.length, 2);
  const faceted = result.facet({ field: "panel", columns: 2 });
  assert.match(renderToSVG(faceted), /one/);
  assert.match(renderToSVG(faceted), /two/);
});

test("statistical box revisions preserve focused whisker appearance edits", () => {
  const original = chart().createCanvas().createData({ values: [
    { group: "A", value: 1 }, { group: "A", value: 2 }, { group: "A", value: 3 }
  ] }).createBoxPlot({ x: { field: "group", fieldType: "nominal" }, y: { field: "value" } })
    .editErrorBar({ target: "boxPlotWhisker", caps: false, stroke: "purple" });
  const result = original.editBoxPlot({ whisker: { factor: 2 } });
  assert.equal(result.markConfigs.boxPlotWhisker.errorBar.caps, false);
  assert.equal(props(result, "boxPlotWhisker").stroke, "purple");
  const recolored = result.editBoxPlot({ whisker: { stroke: "red" } });
  assert.equal(recolored.markConfigs.boxPlotWhisker.errorBar.caps, false);
  assert.equal(props(recolored, "boxPlotWhisker").stroke, "red");
});
