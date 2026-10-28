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
  { id: "conditional-encoding/bar-blend-lifecycle", async run() {
    for (const mode of ["multiply", "screen"]) {
      const original = chart().createCanvas({ width: 300, height: 240, margin: 30, background: "#336699" })
        .createData({ id: "rows", values: [{ category: "a", group: "east", y: 1 }, { category: "b", group: "west", y: 2 }] })
        .createParameter({ id: "warm", value: true })
        .createBarPlot({ id: "bars", x: "category", y: { field: "y", aggregate: "sum" }, guides: false })
        .editBarMark({ blend: mode, stroke: false })
        .encodeColor({ conditions: [{ when: expression(parameter("warm")), value: { value: "#ff0000" } }], otherwise: { value: "#0000ff" } })
        .selectMarks({ id: "chosen", target: "bars", grain: "item", field: "category", op: "eq", value: "a" })
        .encodeOpacity({ conditions: [{ when: { selection: "chosen" }, value: { value: 0.5 } }], otherwise: { value: 1 } });
      const program = deserializeProgram(serializeProgram(original)).editParameter({ target: "warm", value: false })
        .editMarkSelection({ selection: "chosen", field: "category", op: "eq", value: "b" });
      const bars = program.graphicSpec.objects.bars.items;
      assert.deepEqual(bars.map(item => [item.properties.blend, item.properties.fill, item.properties.opacity]), [[mode, "#0000ff", 1], [mode, "#0000ff", 0.5]]);
      assert.equal(program.semanticSpec.layers[0].conditionals.color.parameterInputs[0].revision, 1);
      assert.equal(program.semanticSpec.layers[0].conditionals.opacity.selectionInputs[0].revision, 1);
      const facets = program.facet({ id: "panels", field: "group" });
      assert.ok(Object.values(facets.children).every(child => child.graphicSpec.objects.bars.items.every(item => item.properties.blend === mode)));
      const reset = program.editBarMark({ blend: "normal" });
      assert.equal(reset.semanticSpec.layers[0].mark.blend, undefined);
      assert.deepEqual(reset.semanticSpec.layers[0].conditionals, program.semanticSpec.layers[0].conditionals);
      const graphic = deserializeGraphic(serializeGraphic(program));
      assert.equal(renderToSVG(graphic), renderToSVG(program));
      assert.match(renderToSVG(graphic), new RegExp(`mix-blend-mode:${mode}`));
      assert.deepEqual((await renderToPNGBuffer(graphic)).buffer, (await renderToPNGBuffer(program)).buffer);
      assert.deepEqual(pdfStreams((await renderToPDFBuffer(graphic)).buffer), pdfStreams((await renderToPDFBuffer(program)).buffer));
      const canvas = createCanvas(1, 1), context = canvas.getContext("2d"); render(graphic, context);
      const expected = mode === "multiply" ? [[0, 0, 153, 255], [26, 51, 153, 255]] : [[51, 102, 255, 255], [51, 102, 204, 255]];
      bars.forEach((item, index) => {
        const { x, y, width, height } = item.properties;
        const actual = [...context.getImageData(Math.floor(x + width / 2), Math.floor(y + height / 2), 1, 1).data];
        actual.forEach((value, channel) => assert.ok(Math.abs(value - expected[index][channel]) <= (channel === 3 ? 0 : 1)));
      });
      const scene = createTransitionScene(graphic, { format: "canvas" });
      assert.deepEqual(scene, createTransitionScene(program, { format: "canvas" }));
      const sceneCanvas = createCanvas(1, 1), sceneContext = sceneCanvas.getContext("2d"); renderTransitionScene(scene, sceneContext);
      assert.deepEqual(sceneContext.getImageData(0, 0, sceneCanvas.width, sceneCanvas.height).data, context.getImageData(0, 0, canvas.width, canvas.height).data);
    }
  } }
];
