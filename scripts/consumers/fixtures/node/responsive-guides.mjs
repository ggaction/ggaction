import assert from "node:assert/strict";
import { createCanvas } from "@napi-rs/canvas";
import { chart, render } from "ggaction";
import { chart as basicChart } from "ggaction/basic";
import { inspectProgram } from "ggaction/inspection";
import { serializeProgram, deserializeProgram, serializeGraphic, deserializeGraphic } from "ggaction/persistence";
import { createTransitionScene, renderTransitionScene } from "ggaction/scene";
import { renderToSVG } from "ggaction/svg";
import { renderToPNGBuffer } from "ggaction/png";
import { renderToPDFBuffer } from "ggaction/pdf";
import { createResponsiveGuides, responsiveRows } from "./responsive-public.js";
export const cases = [
  { id: "responsive/full-basic-resize-restore", run() {
    assert.match(import.meta.resolve("ggaction"), /\/node_modules\/ggaction\//);
    const program = createResponsiveGuides(), original = serializeProgram(program);
    assert.equal(inspectProgram(program).layouts[0].labels[0].result.stage, "wrap");
    assert.equal(program.graphicSpec.objects.xAxisTicks.items.length, 4);
    assert.equal(program.graphicSpec.objects.xAxisLabels.items.length, 8);
    const resized = program.editCanvas({ width: 800 });
    assert.equal(inspectProgram(resized).layouts[0].labels[0].result.stage, "native");
    assert.equal(serializeProgram(program), original);
    assert.deepEqual(resized.editCanvas({ width: 400 }).graphicSpec, program.graphicSpec);
    assert.deepEqual(deserializeProgram(original).graphicSpec, program.graphicSpec);
    const basic = basicChart().createCanvas({ width: 400, height: 320, margin: 20, responsive: {} })
      .createData({ values: responsiveRows }).createBarPlot({ x: "x", y: "y", guides: {
        axes: { x: { ticksAndLabels: { labels: { responsive: {} } } }, y: {} }, legend: false
      } });
    assert.deepEqual(basic.materializationConfigs.canvas.responsiveResult, program.materializationConfigs.canvas.responsiveResult);
    assert.throws(() => chart().createCanvas({ responsive: {}, plot: { width: 100, height: 100 } }), /cannot be combined/);
  } },
  { id: "responsive/renderers-scene-codec", async run() {
    const program = deserializeProgram(serializeProgram(createResponsiveGuides()));
    const canvas = createCanvas(1, 1); render(program, canvas.getContext("2d"));
    const png = (await renderToPNGBuffer(program)).buffer;
    assert.deepEqual(canvas.toBuffer("image/png"), png);
    assert.match(renderToSVG(program), /A long alpha/);
    const scene = createTransitionScene(deserializeGraphic(serializeGraphic(program)), { format: "canvas" });
    renderTransitionScene(scene, canvas.getContext("2d"));
    assert.deepEqual(canvas.toBuffer("image/png"), png);
    assert.match((await renderToPDFBuffer(program)).buffer.toString("latin1"), /%PDF/);
  } }
];
