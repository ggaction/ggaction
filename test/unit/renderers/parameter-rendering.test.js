import test from "node:test";
import assert from "node:assert/strict";
import { inflateSync } from "node:zlib";
import { createCanvas, loadImage } from "@napi-rs/canvas";
import { chart, render } from "../../../src/index.js";
import { renderToSVG } from "../../../src/renderers/svg.js";
import { renderToPNGBuffer } from "../../../src/renderers/png.js";
import { renderToPDFBuffer } from "../../../src/renderers/pdf.js";
import { serializeGraphic, deserializeGraphic } from "../../../src/persistence.js";
import { createTransitionScene, renderTransitionScene } from "../../../src/scene.js";
import { createMockCanvasContext } from "../../support/canvas.js";

function program() {
  return chart().createCanvas({ width: 200, height: 140, margin: 20 })
    .createData({ id: "rows", values: [{ x: 1, y: 1 }, { x: 3, y: 3 }] })
    .createParameter({ id: "factor", value: 2 })
    .createComputedData({ id: "scaled", as: "value", expression: {
      version: 2, registry: "standard@1", root: { type: "binary", op: "multiply",
        left: { type: "field", name: "y" }, right: { type: "parameter", id: "factor" } }
    } })
    .createScatterPlot({ id: "points", x: { field: "x", scale: { domain: [0, 4], nice: false } },
      y: { field: "value", scale: { domain: [0, 10], nice: false } }, guides: false })
    .encodeColor({ target: "points", value: "#e63946" })
    .encodePointRadius({ target: "points", value: 6 });
}

const points = value => value.graphicSpec.objects.points.items.map(item => item.properties);
const centers = value => points(value).map(({ x, y }) => [x, y]);
function pixels(value, scene) {
  const canvas = createCanvas(1, 1), context = canvas.getContext("2d");
  if (scene) renderTransitionScene(scene, context); else render(value, context);
  return context.getImageData(0, 0, canvas.width, canvas.height).data;
}
async function imagePixels(buffer) {
  const image = await loadImage(buffer), canvas = createCanvas(image.width, image.height);
  const context = canvas.getContext("2d"); context.drawImage(image, 0, 0);
  return context.getImageData(0, 0, canvas.width, canvas.height).data;
}
const pixel = (bytes, x, y) => [...bytes.slice((y * 200 + x) * 4, (y * 200 + x) * 4 + 4)];
function pdfStreams(buffer) {
  return [...buffer.toString("latin1").matchAll(/stream\r?\n([\s\S]*?)\r?\nendstream/g)].map(match => {
    const bytes = Buffer.from(match[1], "latin1");
    try { return inflateSync(bytes).toString("latin1"); } catch { return bytes.toString("latin1"); }
  });
}

test("parameter edits publish explicit revised coordinates to Canvas and SVG", () => {
  const before = program(), after = before.editParameter({ target: "factor", value: 3 });
  assert.deepEqual(centers(before), [[60, 100], [140, 60]]);
  assert.deepEqual(centers(after), [[60, 90], [140, 30]]);
  const restored = deserializeGraphic(serializeGraphic(after));
  const concreteOnly = Object.defineProperty({ graphicSpec: restored.graphicSpec }, "semanticSpec", {
    get() { throw new Error("Renderer read semantic state"); }
  });
  for (const value of [after, restored, concreteOnly]) {
    const context = createMockCanvasContext(); render(value, context);
    assert.deepEqual(context.calls.filter(call => call.op === "arc").map(call => call.args.slice(0, 3)), [[60, 90, 6], [140, 30, 6]]);
    const svg = renderToSVG(value);
    assert.match(svg, /cx="60" cy="90" r="6"/);
    assert.match(svg, /cx="140" cy="30" r="6"/);
    assert.doesNotMatch(svg, /parameterInputs|standard@1|factor/);
    assert.equal(svg, renderToSVG(after));
  }
});

test("revised PNG and SVG ink follows concrete coordinates and survives graphic-only restoration", async () => {
  const before = program(), after = before.editParameter({ target: "factor", value: 3 });
  const restored = deserializeGraphic(serializeGraphic(after));
  const originalPNG = await renderToPNGBuffer(before);
  const png = await renderToPNGBuffer(after), restoredPNG = await renderToPNGBuffer(restored);
  assert.deepEqual({ width: png.width, height: png.height }, { width: 200, height: 140 });
  assert.deepEqual(png.buffer, restoredPNG.buffer);
  assert.notDeepEqual(png.buffer, originalPNG.buffer);
  const nativePixels = pixels(after), pngPixels = await imagePixels(png.buffer);
  assert.deepEqual(pngPixels, nativePixels);
  const svgPixels = await imagePixels(Buffer.from(renderToSVG(after)));
  for (const bytes of [nativePixels, pngPixels, svgPixels]) {
    assert.deepEqual(pixel(bytes, 60, 90), [230, 57, 70, 255]);
    assert.deepEqual(pixel(bytes, 140, 30), [230, 57, 70, 255]);
    assert.deepEqual(pixel(bytes, 60, 100), [255, 255, 255, 255]);
    assert.deepEqual(pixel(bytes, 140, 60), [255, 255, 255, 255]);
  }
});

test("PDF consumes revised vector geometry identically from full and graphic-only state", async () => {
  const before = program(), after = before.editParameter({ target: "factor", value: 3 });
  const restored = deserializeGraphic(serializeGraphic(after));
  const oldPDF = await renderToPDFBuffer(before), pdf = await renderToPDFBuffer(after), graphicPDF = await renderToPDFBuffer(restored);
  assert.deepEqual({ width: pdf.width, height: pdf.height, pages: pdf.pages }, { width: 200, height: 140, pages: 1 });
  assert.match(pdf.buffer.toString("latin1"), /\/MediaBox \[0 0 200 140\]/);
  assert.doesNotMatch(pdf.buffer.toString("latin1"), /\/Subtype\s*\/Image/);
  assert.deepEqual(pdfStreams(pdf.buffer), pdfStreams(graphicPDF.buffer));
  assert.notDeepEqual(pdfStreams(pdf.buffer), pdfStreams(oldPDF.buffer));
  assert.match(pdfStreams(pdf.buffer).join("\n"), /\bc\b/);
});

test("transition scene endpoints retain row identity and revised geometry after parameter edits", () => {
  const before = program(), after = before.editParameter({ target: "factor", value: 3 });
  const oldScene = createTransitionScene(before, { format: "canvas" });
  const scene = createTransitionScene(after, { format: "canvas" });
  const circles = value => value.nodes.filter(node => node.type === "circle");
  assert.deepEqual(circles(scene).map(node => node.key), circles(oldScene).map(node => node.key));
  assert.deepEqual(circles(scene).map(node => [node.properties.x, node.properties.y]), [[60, 90], [140, 30]]);
  assert.deepEqual(circles(oldScene).map(node => [node.properties.x, node.properties.y]), [[60, 100], [140, 60]]);
  assert.deepEqual(pixels(after, scene), pixels(after));
  const restored = deserializeGraphic(serializeGraphic(after));
  assert.deepEqual(createTransitionScene(restored, { format: "canvas" }), scene);
  const svgScene = createTransitionScene(after);
  assert.deepEqual(circles(svgScene).map(node => node.key), circles(scene).map(node => node.key));
  assert.match(circles(svgScene)[0].svg, /cx="60" cy="90"/);
  assert.deepEqual(structuredClone(scene), scene);
});
