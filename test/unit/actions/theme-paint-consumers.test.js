import assert from "node:assert/strict";
import test from "node:test";
import { createCanvas, loadImage } from "@napi-rs/canvas";
import { chart, render } from "../../../src/index.js";
import { renderToSVG } from "../../../src/renderers/svg.js";
import { renderToPNGBuffer } from "../../../src/renderers/png.js";
import { createTransitionScene, renderTransitionScene } from "../../../src/scene.js";
import { serializeProgram, deserializeProgram, serializeGraphic, deserializeGraphic } from "../../../src/persistence.js";

const image = async bytes => {
  const source = await loadImage(bytes), canvas = createCanvas(source.width, source.height);
  canvas.getContext("2d").drawImage(source, 0, 0); return canvas;
};
const pixels = canvas => canvas.getContext("2d").getImageData(0, 0, canvas.width, canvas.height).data;

test("categorical theme paint reaches Canvas, SVG, PNG, scene and offline snapshots", async () => {
  const seed = chart().createCanvas({ width: 240, height: 180, margin: 20 })
    .createData({ values: [{ x: 1, y: 1, g: "a" }, { x: 2, y: 2, g: "b" }] })
    .createPointMark({ stroke: "none" }).encodeSize({ value: Math.PI * 18 ** 2 }).encodeX({ field: "x" }).encodeY({ field: "y" }).encodeColor({ field: "g" });
  const theme = { base: "light", tokens: { palette: ["red", "blue"], patternPalette: [
    { type: "pattern", style: "horizontal", foreground: "red", background: "white", pitch: 8, strokeWidth: 2 },
    { type: "pattern", style: "vertical", foreground: "blue", background: "white", pitch: 8, strokeWidth: 2 }
  ] } };
  const p = seed.applyTheme({ theme });
  const canvas = createCanvas(240, 180); render(p, canvas.getContext("2d"));
  const png = await image((await renderToPNGBuffer(p)).buffer);
  assert.deepEqual(pixels(png), pixels(canvas));
  const values = Array.from(pixels(canvas));
  assert.ok(values.some((_, index) => index % 4 === 0 && values[index] === 255 && values[index + 1] === 0 && values[index + 2] === 0));
  assert.ok(values.some((_, index) => index % 4 === 0 && values[index] === 0 && values[index + 1] === 0 && values[index + 2] === 255));
  const scene = createTransitionScene(p, { format: "canvas" }), sceneCanvas = createCanvas(240, 180);
  renderTransitionScene(scene, sceneCanvas.getContext("2d"));
  assert.deepEqual(pixels(sceneCanvas), pixels(canvas));
  const svg = renderToSVG(p);
  assert.match(svg, /rgba\(255,0,0,1\)/); assert.match(svg, /rgba\(0,0,255,1\)/);
  for (const restored of [deserializeProgram(serializeProgram(p)), deserializeGraphic(serializeGraphic(p))]) {
    assert.equal(renderToSVG(restored), svg);
    const restoredCanvas = createCanvas(240, 180); render(restored, restoredCanvas.getContext("2d"));
    assert.deepEqual(pixels(restoredCanvas), pixels(canvas));
  }
  assert.equal(renderToSVG(p.removeTheme()), renderToSVG(seed));
});
