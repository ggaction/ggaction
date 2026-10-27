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
import { comparePrograms, describeAction, getDatasetSchema, getMarkItems, inspectProgram } from "ggaction/inspection";
import {createFacetSharedTopLaneProgram} from "./facet-lane-public.js";
import {createPlotUnderlayProgram} from "./plot-underlay-public.js";

export const cases = [
  { id: "selection/keyed-revision", async run() {
    const before = chart().createCanvas().createData({ id: "rows", keyField: "id", values: [
      { id: "a", x: 1, y: 2 }, { id: "b", x: 2, y: 4 }
    ] }).createScatterPlot({ id: "points", x: "x", y: "y" })
      .highlightMarks({ id: "picked", target: "points", select: { rows: { data: "rows", indices: [1] } }, fill: "red" });
    const originalKeys = new Map(getMarkItems(before, { target: "points" }).map(item => [item.fields.id, item.key]));
    const saved = serializeProgram(before);
    assert.equal(JSON.parse(saved).schemaVersion, 4);
    const revised = deserializeProgram(saved).reviseData({ source: "rows", id: "next", values: [
      { id: "b", x: 3, y: 9 }, { id: "a", x: 1, y: 2 }
    ] });
    const items = getMarkItems(revised, { target: "points" });
    assert.deepEqual(new Map(items.map(item => [item.fields.id, item.key])), originalKeys);
    assert.deepEqual(items.filter(item => item.properties.fill === "red").map(item => item.fields.id), ["b"]);
    assert.equal(serializeProgram(before), saved);
    const graphic = deserializeGraphic(serializeGraphic(revised));
    for (const format of ["svg", "canvas"]) assert.deepEqual(createTransitionScene(graphic, { format }), createTransitionScene(revised, { format }));
    assert.equal(renderToSVG(graphic), renderToSVG(revised));
    assert.ok((await renderToPNGBuffer(graphic)).buffer.length > 100);
    assert.equal((await renderToPDFBuffer(graphic)).pages, 1);
    assert.equal(revised.removeMarkSelection({ selection: "picked" }).semanticSpec.resources.length, 0);
    assert.equal(basicChart().createData({ values: [{}], keys: [new Date(0)] }).semanticSpec.datasets[0].rowKeys.length, 1);
  } },

  { id: "selection/row-provenance", async run() {
    const p = chart().createCanvas({ margin: 80 }).createData({ id: "rows", values: [
      { x: 1, y: 2, g: "A" }, { x: 1, y: 2, g: "A" }, { x: 3, y: 5, g: "B" }
    ] }).createTextPlot({ id: "labels", x: "x", y: "y", text: { field: "g" } });
    const highlighted = p.highlightMarks({ id: "h", target: "labels", select: { rows: { data: "rows", indices: [1] } }, color: "red", fontSize: 24 });
    const restored = deserializeProgram(serializeProgram(highlighted));
    const selected = getMarkItems(restored, { target: "labels" }).filter(i => i.geometry.some(g => g.properties.fill === "red"));
    assert.equal(selected.length, 1);
    assert.deepEqual(selected[0].rows.map(({ data, index }) => ({ data, index })), [{ data: "rows", index: 1 }]);
    assert.equal(selected[0].geometry[0].properties.fontSize, 24);
    assert.equal(renderToSVG(restored.removeMarkSelection({ selection: "h" })), renderToSVG(p));
    assert.ok((await renderToPNGBuffer(restored)).buffer.length > 100);
    assert.equal((await renderToPDFBuffer(restored)).pages, 1);
  } },
  { id: "selection/temporal-rect", async run() {
const temporalRect = chart().createCanvas().createData({ values: [{ start: "2020-01-01", end: "2020-01-03" }] })
      .createRectMark({ data: "data" }).encodeX({ field: "start", fieldType: "temporal" })
      .encodeX2({ field: "end", fieldType: "temporal" });
assert.equal(temporalRect.filterMarks({ channel: "x", op: "gte", value: Date.UTC(2020, 0, 1) }).graphicSpec.objects.rect.items.length, 1);
  } }
];
