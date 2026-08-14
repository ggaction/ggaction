import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";

import { createCanvas, loadImage } from "@napi-rs/canvas";

import { chart } from "../../../src/index.js";
import { resolveConcreteGraphicBounds } from
  "../../../src/grammar/schemas/graphicBounds.js";
import { render } from "../../../src/renderers/canvas/index.js";
import { renderToPNG } from "../../../src/renderers/png.js";
import { renderToSVG } from "../../../src/renderers/svg.js";
import { createMockCanvasContext } from "../../support/canvas.js";

const temporaryDirectories = [];

test.afterEach(async () => {
  await Promise.all(temporaryDirectories.splice(0).map(directory =>
    rm(directory, { recursive: true, force: true })
  ));
});

function alphaBounds(canvas) {
  const pixels = canvas.getContext("2d")
    .getImageData(0, 0, canvas.width, canvas.height).data;
  let left = canvas.width;
  let right = -1;
  let top = canvas.height;
  let bottom = -1;
  for (let y = 0; y < canvas.height; y += 1) {
    for (let x = 0; x < canvas.width; x += 1) {
      if (pixels[(y * canvas.width + x) * 4 + 3] === 0) continue;
      left = Math.min(left, x);
      right = Math.max(right, x);
      top = Math.min(top, y);
      bottom = Math.max(bottom, y);
    }
  }
  return { left, right, top, bottom };
}

function acutePathProgram() {
  const commands = [
    { op: "M", x: 40, y: 100 },
    { op: "L", x: 140, y: 100 },
    { op: "L", x: 140 - 50 * Math.sqrt(3), y: 150 }
  ];
  return {
    graphicSpec: {
      objects: {
        canvas: {
          type: "canvas",
          properties: { width: 220, height: 210 },
          children: ["path"]
        },
        path: {
          type: "path",
          properties: { commands, stroke: "black", strokeWidth: 20 }
        }
      },
      order: ["canvas"]
    }
  };
}

test("acute path bounds contain Canvas and SVG miter ink", async () => {
  const program = acutePathProgram();
  const bounds = resolveConcreteGraphicBounds(program.graphicSpec, "path");
  const pixelRatio = 4;

  const canvas = createCanvas(1, 1);
  render(program, canvas.getContext("2d"), { pixelRatio });

  const svg = renderToSVG(program)
    .replace('width="220"', 'width="880"')
    .replace('height="210"', 'height="840"');
  const image = await loadImage(Buffer.from(svg));
  const svgCanvas = createCanvas(880, 840);
  svgCanvas.getContext("2d").drawImage(image, 0, 0);

  for (const ink of [alphaBounds(canvas), alphaBounds(svgCanvas)]) {
    assert.equal(ink.right / pixelRatio > 150, true);
    assert.equal(
      ink.right / pixelRatio <= bounds.right + 1 / pixelRatio,
      true
    );
  }
});

test("fractional logical dimensions stay aligned across raster and SVG output", async () => {
  const program = chart().createCanvas({
    width: 12.5,
    height: 8.5,
    margin: 0,
    background: "white"
  });
  const context = createMockCanvasContext();

  render(program, context);
  assert.equal(context.canvas.width, 13);
  assert.equal(context.canvas.height, 9);
  assert.equal(context.canvas.style.width, "12.5px");
  assert.equal(context.canvas.style.height, "8.5px");

  const svg = renderToSVG(program);
  assert.match(svg, /<svg[^>]*width="12\.5"[^>]*height="8\.5"/);
  assert.match(svg, /viewBox="0 0 12\.5 8\.5"/);

  const directory = await mkdtemp(path.join(tmpdir(), "ggaction-fractional-"));
  temporaryDirectories.push(directory);
  const output = path.join(directory, "chart.png");
  const result = await renderToPNG(program, { output });
  const png = await readFile(output);
  assert.equal(result.width, 13);
  assert.equal(result.height, 9);
  assert.equal(png.readUInt32BE(16), 13);
  assert.equal(png.readUInt32BE(20), 9);
});

test("a positive subpixel Canvas retains a one-pixel raster backing store", () => {
  const program = chart().createCanvas({ width: 0.4, height: 0.4, margin: 0 });
  const context = createMockCanvasContext();

  render(program, context);

  assert.equal(context.canvas.width, 1);
  assert.equal(context.canvas.height, 1);
  assert.equal(context.canvas.style.width, "0.4px");
  assert.equal(context.canvas.style.height, "0.4px");
});
