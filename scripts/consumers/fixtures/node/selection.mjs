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
  { id: "selection/row-provenance", async run() {
    const p = chart().createCanvas({ margin: 80 }).createData({ id: "rows", values: [
      { x: 1, y: 2, g: "A" }, { x: 1, y: 2, g: "A" }, { x: 3, y: 5, g: "B" }
    ] }).createTextPlot({ id: "labels", x: "x", y: "y", text: { field: "g" } });
    const highlighted = p.highlightMarks({ id: "h", target: "labels", select: { rows: { data: "rows", indices: [1] } }, color: "red", fontSize: 24 });
    const restored = deserializeProgram(serializeProgram(highlighted));
    const selected = getMarkItems(restored, { target: "labels" }).filter(i => i.geometry.some(g => g.properties.fill === "red"));
    assert.equal(selected.length, 1);
    assert.deepEqual(selected[0].rows, [{ data: "rows", index: 1 }]);
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
