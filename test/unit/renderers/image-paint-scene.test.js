import assert from "node:assert/strict";
import test from "node:test";
import { createHash } from "node:crypto";
import { createCanvas, loadImage } from "@napi-rs/canvas";
import { prepareImageRendering, render } from "../../../src/index.js";
import { createTransitionScene, renderTransitionScene } from "../../../src/scene.js";
import { serializeGraphic, deserializeGraphic } from "../../../src/persistence.js";
import { renderToPNGBuffer } from "../../../src/renderers/png.js";

const bytes = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="2" height="2"><rect width="2" height="2" fill="#008000"/></svg>');
const image = { contentHash: createHash("sha256").update(bytes).digest("hex"), mimeType: "image/svg+xml",
  byteLength: bytes.length, width: 2, height: 2, payload: { encoding: "base64", data: bytes.toString("base64") } };
const host = { decode: async ({ bytes }) => {
  const image = await loadImage(bytes);
  return { image, width: image.width, height: image.height, originClean: true };
} };
const pattern = { type: "pattern", style: "cross", pitch: 8, strokeWidth: 2, phase: [1, 3],
  foreground: "rgba(255,0,0,.6)", background: "rgba(0,0,255,.3)", origin: { x: 4, y: 5 } };
const radial = { type: "radial-gradient", center: { x: .5, y: .5 }, focal: { x: .25, y: .4 }, radius: .7,
  stops: [{ offset: 0, color: "red" }, { offset: 1, color: "blue" }] };
const program = fill => ({ graphicSpec: { objects: {
  canvas: { type: "canvas", properties: { width: 120, height: 100, background: "white" }, children: ["nested"] },
  nested: { type: "canvas", properties: { x: 17, y: 13, width: 90, height: 60 }, children: ["image", "text"] },
  image: { type: "image", properties: { image, x: 2, y: 2, width: 12, height: 8 } },
  text: { type: "text", properties: { x: 32, y: 35, text: "AB", fontSize: 22, fontWeight: 400,
    fontFamily: "sans-serif", textAlign: "left", textBaseline: "alphabetic", fill, opacity: .65,
    fillBounds: { left: 32, right: 66, top: 13, bottom: 40 } } }
}, order: ["canvas"] } });
const pixels = canvas => canvas.getContext("2d").getImageData(0, 0, canvas.width, canvas.height).data;

for (const [name, fill] of [["pattern", pattern], ["radial", radial]]) {
  test(`prepared images and ${name} text share nested Canvas scene origins and offline pixels`, async () => {
    const p = program(fill), direct = createCanvas(1, 1), sceneCanvas = createCanvas(1, 1);
    const images = await prepareImageRendering(p, host);
    render(p, direct.getContext("2d"), { images });
    assert.deepEqual([...direct.getContext("2d").getImageData(23, 18, 1, 1).data], [0, 128, 0, 255]);
    const scene = createTransitionScene(p, { format: "canvas" });
    const sceneImages = await prepareImageRendering(scene, host);
    renderTransitionScene(scene, sceneCanvas.getContext("2d"), { images: sceneImages });
    assert.deepEqual(pixels(sceneCanvas), pixels(direct));
    const restored = deserializeGraphic(serializeGraphic(p));
    assert.deepEqual((await renderToPNGBuffer(restored)).buffer, await direct.encode("png"));
    assert.equal(p.graphicSpec.objects.text.properties.fillBounds.left, 32);
    if (name === "pattern") assert.deepEqual(p.graphicSpec.objects.text.properties.fill.origin, { x: 4, y: 5 });
  });
}

test("changing a mixed scene's text paint invalidates prepared images before Canvas mutation", async () => {
  const scene = structuredClone(createTransitionScene(program(pattern), { format: "canvas" }));
  const images = await prepareImageRendering(scene, host), canvas = createCanvas(7, 9);
  scene.nodes.find(node => node.type === "text").properties.fillBounds.left += 1;
  assert.throws(() => renderTransitionScene(scene, canvas.getContext("2d"), { images }),
    error => error.assetCode === "stale-result");
  assert.equal(canvas.width, 7); assert.equal(canvas.height, 9);
});
