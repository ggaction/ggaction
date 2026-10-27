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
  { id: "selection/temporal-rect", async run() {
const temporalRect = chart().createCanvas().createData({ values: [{ start: "2020-01-01", end: "2020-01-03" }] })
      .createRectMark({ data: "data" }).encodeX({ field: "start", fieldType: "temporal" })
      .encodeX2({ field: "end", fieldType: "temporal" });
assert.equal(temporalRect.filterMarks({ channel: "x", op: "gte", value: Date.UTC(2020, 0, 1) }).graphicSpec.objects.rect.items.length, 1);
  } }
];
