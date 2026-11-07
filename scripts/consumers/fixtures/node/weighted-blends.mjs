import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { ChartProgram } from "ggaction/extension";
import { render } from "ggaction";
import { render as basicRender } from "ggaction/basic";
import { renderToSVG } from "ggaction/svg";
import { renderToPNGBuffer } from "ggaction/png";
import { renderToPDFBuffer } from "ggaction/pdf";
import { createTransitionScene, renderTransitionScene } from "ggaction/scene";
import { serializeProgram, deserializeProgram } from "ggaction/persistence";
import { createCanvas, loadImage } from "@napi-rs/canvas";

const source = (fill, weight = .5) => ({ weight, type: "rect", properties: {
  x: 8, y: 8, width: 16, height: 16, fill, stroke: "none", strokeWidth: 0
}, offset: [0, 0], clip: { x: 0, y: 0, width: 40, height: 40 }, clips: [] });
const program = () => new ChartProgram().createGraphics({ id: "canvas", type: "canvas" })
  .editGraphics({ target: "canvas", property: "width", value: 40 })
  .editGraphics({ target: "canvas", property: "height", value: 40 })
  .createGraphics({ id: "item", type: "weighted-blend" })
  .editGraphics({ target: "item", property: "sources", value: [source("red"), source("blue")] });
const pixel = canvas => [...canvas.getContext("2d").getImageData(12, 12, 1, 1).data];

export const cases = [
  { id: "weighted-blend/linear-pixels-and-four-renderers", async run() {
    const p = program(), canvas = createCanvas(1, 1);
    render(p, canvas.getContext("2d"));assert.deepEqual(pixel(canvas), [188, 0, 188, 255]);
    basicRender(p, canvas.getContext("2d"));assert.deepEqual(pixel(canvas), [188, 0, 188, 255]);
    const png = await renderToPNGBuffer(p), image = await loadImage(png.buffer);
    canvas.getContext("2d").clearRect(0, 0, 40, 40);canvas.getContext("2d").drawImage(image, 0, 0);
    assert.deepEqual(pixel(canvas), [188, 0, 188, 255]);
    assert.match(renderToSVG(p), /color-interpolation-filters="linearRGB"/);
    assert.match(renderToSVG(p), /operator="arithmetic"/);
    assert.equal((await renderToPDFBuffer(p)).buffer.subarray(0, 4).toString(), "%PDF");
  } },
  { id: "weighted-blend/fresh-process-codec-and-scene", run() {
    const p = program(), restored = deserializeProgram(serializeProgram(p)), canvas = createCanvas(1, 1);
    assert.deepEqual(restored.graphicSpec, p.graphicSpec);
    renderTransitionScene(createTransitionScene(restored, { format: "canvas" }), canvas.getContext("2d"));
    assert.deepEqual(pixel(canvas), [188, 0, 188, 255]);
    const child = spawnSync(process.execPath, ["--input-type=module", "-e", `
      import {readFileSync} from 'node:fs';import {deserializeProgram} from 'ggaction/persistence';
      import {renderToSVG} from 'ggaction/svg';console.log(renderToSVG(deserializeProgram(readFileSync(0,'utf8'))));
    `], { input: serializeProgram(p), encoding: "utf8" });
    assert.equal(child.status, 0, child.stderr);assert.equal(child.stdout.trim(), renderToSVG(p));
  } },
  { id: "weighted-blend/endpoints-limits-and-immutable-failure", run() {
    const p = program(), before = serializeProgram(p), canvas = createCanvas(1, 1);
    const endpoint = p.editGraphics({ target: "item", property: "sources", value: [source("red", 1), source("blue", 0)] });
    render(endpoint, canvas.getContext("2d"));assert.deepEqual(pixel(canvas), [255, 0, 0, 255]);
    assert.doesNotMatch(renderToSVG(endpoint), /feComposite/);
    const many = p.editGraphics({ target: "item", property: "sources", value: Array.from({ length: 64 }, () => source("red", 1 / 64)) });
    render(many, canvas.getContext("2d"));assert.deepEqual(pixel(canvas), [255, 0, 0, 255]);
    assert.throws(() => p.editGraphics({ target: "item", property: "sources", value: Array.from({ length: 65 }, () => source("red", 1 / 65)) }), /2..64/);
    assert.throws(() => p.editGraphics({ target: "item", property: "sources", value: [source("red", 1), { ...source("blue", 0), type: "weighted-blend" }] }), /nested/);
    assert.equal(serializeProgram(p), before);
  } }
];
