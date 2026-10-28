import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { inflateSync } from "node:zlib";
import { createCanvas, loadImage } from "@napi-rs/canvas";
import { chart, render } from "ggaction";
import { chart as basicChart } from "ggaction/basic";
import { serializeProgram, deserializeProgram, serializeGraphic, deserializeGraphic } from "ggaction/persistence";
import { createTransitionScene, renderTransitionScene } from "ggaction/scene";
import { renderToSVG } from "ggaction/svg";
import { renderToPNGBuffer } from "ggaction/png";
import { renderToPDFBuffer } from "ggaction/pdf";

const field = name => ({ type: "field", name });
const parameter = id => ({ type: "parameter", id });
const literal = value => ({ type: "literal", value });
const binary = (op, left, right) => ({ type: "binary", op, left, right });
const expression = root => ({ version: 2, registry: "standard@1", root });
function example(factory = chart) {
  let program = factory().createCanvas({ width: 200, height: 140, margin: 20 })
    .createData({ id: "rows", values: [{ x: 1, y: 1 }, { x: 3, y: 3 }] })
    .createParameter({ id: "minimum", value: 0 }).createParameter({ id: "hide", value: true });
  if (factory === chart) program = program.filterData({ id: "selected", where: expression(binary("gte", field("x"), parameter("minimum"))) });
  program = program
    .createScatterPlot({ id: "points", x: { field: "x", scale: { domain: [0, 4], nice: false } },
      y: { field: "y", scale: { domain: [0, 4], nice: false } }, guides: false })
    .encodeColor({ value: "#e63946" }).encodePointRadius({ value: 6 });
  const when = expression(binary("and", parameter("hide"), binary("gte", field("x"), literal(2))));
  return factory === chart
    ? program.encodeOpacity({ conditions: [{ when, value: { value: 0 } }], otherwise: { value: 1 } })
    : program.encodeColor({ conditions: [{ when, value: { value: "none" } }], otherwise: { value: "#e63946" } });
}
const values = program => program.graphicSpec.objects.points.items.map(item => item.properties.opacity);
function pdfStreams(buffer) {
  return [...buffer.toString("latin1").matchAll(/stream\r?\n([\s\S]*?)\r?\nendstream/g)].map(match => {
    const bytes = Buffer.from(match[1], "latin1");
    try { return inflateSync(bytes).toString("latin1"); } catch { return bytes.toString("latin1"); }
  });
}
export const cases = [
  { id: "conditional-encoding/fresh-process-lifecycle", async run() {
    assert.match(import.meta.resolve("ggaction"), /\/node_modules\/ggaction\//);
    for (const factory of [chart, basicChart]) {
      const original = example(factory), saved = serializeProgram(original);
      const channel = factory === chart ? "opacity" : "color", property = factory === chart ? "opacity" : "fill";
      const appearance = program => program.graphicSpec.objects.points.items.map(item => item.properties[property]);
      assert.deepEqual(appearance(original), factory === chart ? [1, 0] : ["#e63946", "none"]);
      const script = `
        import { readFileSync } from "node:fs";
        import { deserializeProgram, serializeProgram } from "ggaction/persistence";
        const restored = deserializeProgram(readFileSync(0, "utf8"));
        const changed = restored.editParameter({ target: "hide", value: false })
          .editParameter({ target: "minimum", value: 2 });
        process.stdout.write(serializeProgram(changed));
      `;
      const output = execFileSync(process.execPath, ["--input-type=module", "-e", script], { input: saved, encoding: "utf8", timeout: 30000 });
      const changed = deserializeProgram(output);
      assert.deepEqual(appearance(changed), factory === chart ? [1] : ["#e63946", "#e63946"]);
      assert.equal(changed.semanticSpec.layers[0].conditionals[channel].parameterInputs[0].revision, 1);
      assert.equal(changed.semanticSpec.layers[0].encoding[channel], undefined);
      assert.equal(changed.markConfigs.points[property], undefined);
      assert.throws(() => changed.removeParameter({ id: "hide" }), /referenced/);
      assert.equal(serializeProgram(original), saved);
    }
  } },
  { id: "conditional-encoding/renderers-and-scene", async run() {
    const original = example(), graphic = deserializeGraphic(serializeGraphic(original));
    assert.equal(graphic.semanticSpec, undefined);
    assert.equal(renderToSVG(graphic), renderToSVG(original));
    assert.deepEqual(values(original), [1, 0]);
    const png = await renderToPNGBuffer(original), restoredPNG = await renderToPNGBuffer(graphic);
    assert.deepEqual(png.buffer, restoredPNG.buffer);
    const canvas = createCanvas(1, 1), context = canvas.getContext("2d"); render(graphic, context);
    const pixels = context.getImageData(0, 0, canvas.width, canvas.height).data;
    const image = await loadImage(png.buffer), pngCanvas = createCanvas(png.width, png.height);
    pngCanvas.getContext("2d").drawImage(image, 0, 0);
    assert.deepEqual(pngCanvas.getContext("2d").getImageData(0, 0, png.width, png.height).data, pixels);
    const pdf = await renderToPDFBuffer(original), restoredPDF = await renderToPDFBuffer(graphic);
    assert.deepEqual(pdfStreams(pdf.buffer), pdfStreams(restoredPDF.buffer));
    assert.doesNotMatch(pdf.buffer.toString("latin1"), /\/Subtype\s*\/Image/);
    const scene = createTransitionScene(original, { format: "canvas" });
    assert.deepEqual(createTransitionScene(graphic, { format: "canvas" }), scene);
    assert.deepEqual(scene.nodes.filter(node => node.type === "circle").map(node => [node.properties.x, node.properties.y, node.properties.opacity]), [[60, 95, 1], [140, 45, 0]]);
    const sceneCanvas = createCanvas(1, 1), sceneContext = sceneCanvas.getContext("2d"); renderTransitionScene(scene, sceneContext);
    assert.deepEqual(sceneContext.getImageData(0, 0, sceneCanvas.width, sceneCanvas.height).data, pixels);
  } },
  { id: "conditional-encoding/position-text-lifecycle", async run() {
    const when = expression(binary("and", parameter("alternate"), binary("gt", field("x"), literal(1))));
    const choose = (value, otherwise) => ({ conditions: [{ when, value }], otherwise });
    const original = chart().createCanvas({ width: 300, height: 200, margin: 20 })
      .createData({ id: "rows", values: [{ x: 1, y: 1, other: 3, label: "A" }, { x: 3, y: 3, other: 1, label: "B" }] })
      .createParameter({ id: "alternate", value: true })
      .createPointMark({ id: "points" }).encodeX({ field: "x", scale: { domain: [0, 4], nice: false } })
      .encodeY({ field: "y", scale: { domain: [0, 4], nice: false } })
      .encodeX(choose({ field: "other" }, { field: "x" })).encodeY(choose({ datum: 0 }, { field: "y" }))
      .encodePointRadius(choose({ value: 0 }, { value: 6 }))
      .createTextMark({ id: "text", data: "rows" }).encodeX({ field: "x", scale: { domain: [0, 4], nice: false } })
      .encodeY({ field: "y", scale: { domain: [0, 4], nice: false } })
      .encodeChannels({ target: "text", channels: { text: choose({ value: "Selected" }, { field: "label" }), dx: choose({ value: 8 }, { value: 0 }), dy: choose({ value: -4 }, { value: 0 }) } });
    const points = program => program.graphicSpec.objects.points.items.map(item => [item.properties.x, item.properties.y, item.properties.radius]);
    const labels = program => program.graphicSpec.objects.text.items.map(item => [item.properties.text, item.properties.x, item.properties.y]);
    assert.deepEqual(points(original), [[85, 140, 6], [85, 180, 0]]);
    assert.deepEqual(labels(original), [["A", 85, 140], ["Selected", 223, 56]]);
    const output = execFileSync(process.execPath, ["--input-type=module", "-e", `
      import { readFileSync } from "node:fs";
      import { deserializeProgram, serializeProgram } from "ggaction/persistence";
      process.stdout.write(serializeProgram(deserializeProgram(readFileSync(0, "utf8")).editParameter({ target: "alternate", value: false })));
    `], { input: serializeProgram(original), encoding: "utf8", timeout: 30000 });
    const changed = deserializeProgram(output);
    assert.deepEqual(points(changed), [[85, 140, 6], [215, 60, 6]]);
    assert.deepEqual(labels(changed), [["A", 85, 140], ["B", 215, 60]]);
    const graphic = deserializeGraphic(serializeGraphic(original));
    assert.equal(renderToSVG(graphic), renderToSVG(original));
    const png = await renderToPNGBuffer(original), restoredPNG = await renderToPNGBuffer(graphic);
    assert.deepEqual(restoredPNG.buffer, png.buffer);
    const canvas = createCanvas(1, 1), context = canvas.getContext("2d"); render(graphic, context);
    const image = await loadImage(png.buffer), decoded = createCanvas(png.width, png.height);
    decoded.getContext("2d").drawImage(image, 0, 0);
    assert.deepEqual(context.getImageData(0, 0, canvas.width, canvas.height).data, decoded.getContext("2d").getImageData(0, 0, png.width, png.height).data);
    assert.deepEqual(pdfStreams((await renderToPDFBuffer(original)).buffer), pdfStreams((await renderToPDFBuffer(graphic)).buffer));
    assert.deepEqual(createTransitionScene(original, { format: "canvas" }), createTransitionScene(graphic, { format: "canvas" }));
  } }
];
