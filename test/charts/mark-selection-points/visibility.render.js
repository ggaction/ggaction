import test from "node:test";
import assert from "node:assert/strict";
import { inflateSync } from "node:zlib";
import { chart, render } from "../../../src/index.js";
import { renderToSVG } from "../../../src/renderers/svg.js";
import { renderToPNGBuffer } from "../../../src/renderers/png.js";
import { renderToPDFBuffer } from "../../../src/renderers/pdf.js";
import { serializeProgram, deserializeProgram, serializeGraphic, deserializeGraphic } from "../../../src/persistence.js";
import { createTransitionScene, renderTransitionScene } from "../../../src/scene.js";
import { createMockCanvasContext } from "../../support/canvas.js";

function pdfStreams(buffer) {
  return [...buffer.toString("latin1").matchAll(/stream\r?\n([\s\S]*?)\r?\nendstream/g)].map(match => {
    const bytes = Buffer.from(match[1], "latin1");
    try { return inflateSync(bytes).toString("latin1"); } catch { return bytes.toString("latin1"); }
  });
}

test("category visibility equals explicit primitive omission on Canvas SVG PNG PDF and restored scenes", async () => {
  const p = chart().createCanvas({ width: 500, height: 350, margin: 100 }).createData({ keyField: "id", values: [
    { id: "a", x: 1, y: 2, category: "A" }, { id: "b", x: 2, y: 20, category: "B" }, { id: "c", x: 3, y: 4, category: "A" }
  ] }).createScatterPlot({ id: "points", x: "x", y: "y", color: "category", guides: false }).createLegend({ channels: ["color"] });
  // Independent literal oracle: retain exactly the first and third source glyphs.
  const expected = { graphicSpec: { ...p.graphicSpec, objects: { ...p.graphicSpec.objects,
    points: { ...p.graphicSpec.objects.points, items: [p.graphicSpec.objects.points.items[0], p.graphicSpec.objects.points.items[2]] }
  } } };
  const actual = p.setMarkVisibility({ channel: "color", values: ["B"], visible: false, scaleDomain: "all-data" });
  const restored = deserializeProgram(serializeProgram(actual)), graphic = deserializeGraphic(serializeGraphic(actual));
  const svg = renderToSVG(expected), expectedContext = createMockCanvasContext(); render(expected, expectedContext);
  const png = await renderToPNGBuffer(expected), pdf = await renderToPDFBuffer(expected);
  for (const value of [actual, restored, graphic]) {
    assert.equal(renderToSVG(value), svg);
    const context = createMockCanvasContext(); render(value, context); assert.deepEqual(context.calls, expectedContext.calls);
    assert.deepEqual((await renderToPNGBuffer(value)).buffer, png.buffer);
    assert.deepEqual(pdfStreams((await renderToPDFBuffer(value)).buffer), pdfStreams(pdf.buffer));
  }
  const scene = createTransitionScene(actual, { format: "canvas" }), sceneContext = createMockCanvasContext(); renderTransitionScene(scene, sceneContext);
  const expectedSceneContext = createMockCanvasContext();
  renderTransitionScene(createTransitionScene(expected, { format: "canvas" }), expectedSceneContext);
  assert.deepEqual(sceneContext.calls, expectedSceneContext.calls);
  assert.equal(actual.graphicSpec.objects.points.items.length, 2); assert.equal(p.graphicSpec.objects.points.items.length, 3);
});
