import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { inflateSync } from "node:zlib";
import { createCanvas, loadImage } from "@napi-rs/canvas";
import { chart, render } from "ggaction";
import { chart as basicChart } from "ggaction/basic";
import { serializeProgram, deserializeProgram, serializeGraphic, deserializeGraphic } from "ggaction/persistence";
import { getExpressionFunctions, inspectProgram } from "ggaction/inspection";
import { createTransitionScene, renderTransitionScene } from "ggaction/scene";
import { renderToSVG } from "ggaction/svg";
import { renderToPNGBuffer } from "ggaction/png";
import { renderToPDFBuffer } from "ggaction/pdf";

function computed(factory = chart) {
  return factory().createCanvas({ width: 200, height: 140, margin: 20 })
    .createData({ id: "rows", values: [{ x: 1, y: 1 }, { x: 3, y: 3 }] })
    .createParameter({ id: "factor", value: 2 })
    .createComputedData({ id: "scaled", as: "value", expression: {
      version: 2, registry: "standard@1", root: { type: "binary", op: "multiply",
        left: { type: "field", name: "y" }, right: { type: "parameter", id: "factor" } }
    } }).createScatterPlot({ id: "points", x: { field: "x", scale: { domain: [0, 4], nice: false } },
      y: { field: "value", scale: { domain: [0, 20], nice: false } }, guides: false })
    .encodeColor({ target: "points", value: "#e63946" }).encodePointRadius({ target: "points", value: 6 });
}
const current = program => program.semanticSpec.datasets.find(dataset => dataset.id === program.materializationConfigs.data.computed.scaled.current);
const circles = scene => scene.nodes.filter(node => node.type === "circle");
function pdfStreams(buffer) {
  return [...buffer.toString("latin1").matchAll(/stream\r?\n([\s\S]*?)\r?\nendstream/g)].map(match => {
    const bytes = Buffer.from(match[1], "latin1");
    try { return inflateSync(bytes).toString("latin1"); } catch { return bytes.toString("latin1"); }
  });
}

export const cases = [
  { id: "parameters/fresh-process-lifecycle", async run() {
    for (const name of ["createParameter", "editParameter", "removeParameter"]) assert.equal(typeof chart()[name], "function");
    assert.match(import.meta.resolve("ggaction"), /\/node_modules\/ggaction\//);
    const original = computed(basicChart), saved = serializeProgram(original);
    assert.equal(original.editParameter, undefined);
    assert.equal(original.removeParameter, undefined);
    const script = `
      import assert from "node:assert/strict";
      import { readFileSync } from "node:fs";
      import { deserializeProgram, serializeProgram } from "ggaction/persistence";
      assert.match(import.meta.resolve("ggaction"), /\\/node_modules\\/ggaction\\//);
      const restored = deserializeProgram(readFileSync(0, "utf8"));
      const edited = restored.editParameter({ target: "factor", value: 3 });
      const revised = edited.reviseData({ source: "rows", id: "rowsV2", values: [{ x: 1, y: 2 }, { x: 3, y: 4 }], rowMap: [0, 1] });
      process.stdout.write(serializeProgram(revised));
    `;
    const output = execFileSync(process.execPath, ["--input-type=module", "-e", script], { input: saved, encoding: "utf8", timeout: 30_000 });
    const restored = deserializeProgram(output), dataset = current(restored);
    assert.deepEqual(dataset.values.map(row => row.value), [6, 12]);
    assert.deepEqual(dataset.transform[0].parameterInputs, [{ kind: "parameter", id: "factor", revision: 1 }]);
    assert.deepEqual(inspectProgram(restored).calculations.find(report => report.owner.id === dataset.id).parameterInputs, dataset.transform[0].parameterInputs);
    assert.equal(serializeProgram(restored), output);
    assert.equal(serializeProgram(original), saved);
    const catalog = getExpressionFunctions({ registry: "standard@1" });
    assert.equal(catalog.length, 30); assert.ok(Object.isFrozen(catalog));
    const without = restored.createParameter({ id: "unused", value: null, type: "boolean", nullable: true }).removeParameter({ id: "unused" });
    assert.deepEqual(without.semanticSpec.resources, restored.semanticSpec.resources);
  } },
  { id: "parameters/renderers-and-scene", async run() {
    const original = computed(), revised = original.editParameter({ target: "factor", value: 3 });
    const graphic = deserializeGraphic(serializeGraphic(revised));
    assert.equal(graphic.semanticSpec, undefined);
    assert.equal(renderToSVG(graphic), renderToSVG(revised));
    assert.notEqual(renderToSVG(revised), renderToSVG(original));
    const png = await renderToPNGBuffer(revised), restoredPNG = await renderToPNGBuffer(graphic);
    assert.deepEqual(png.buffer, restoredPNG.buffer);
    const canvas = createCanvas(1, 1), context = canvas.getContext("2d"); render(graphic, context);
    const canvasPixels = context.getImageData(0, 0, canvas.width, canvas.height).data;
    const image = await loadImage(png.buffer), pngCanvas = createCanvas(png.width, png.height);
    pngCanvas.getContext("2d").drawImage(image, 0, 0);
    assert.deepEqual(pngCanvas.getContext("2d").getImageData(0, 0, png.width, png.height).data, canvasPixels);
    const pdf = await renderToPDFBuffer(revised), restoredPDF = await renderToPDFBuffer(graphic);
    assert.deepEqual(pdfStreams(pdf.buffer), pdfStreams(restoredPDF.buffer));
    assert.doesNotMatch(pdf.buffer.toString("latin1"), /\/Subtype\s*\/Image/);
    assert.deepEqual([pdf.width, pdf.height, pdf.pages], [200, 140, 1]);
    const scene = createTransitionScene(revised, { format: "canvas" });
    assert.deepEqual(createTransitionScene(graphic, { format: "canvas" }), scene);
    assert.deepEqual(circles(scene).map(node => [node.properties.x, node.properties.y]), [[60, 105], [140, 75]]);
    assert.deepEqual(circles(scene).map(node => node.key), circles(createTransitionScene(original, { format: "canvas" })).map(node => node.key));
    const sceneCanvas = createCanvas(1, 1), sceneContext = sceneCanvas.getContext("2d"); renderTransitionScene(scene, sceneContext);
    assert.deepEqual(sceneContext.getImageData(0, 0, sceneCanvas.width, sceneCanvas.height).data, canvasPixels);
  } }
];
