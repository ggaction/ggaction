import assert from "node:assert/strict";
import test from "node:test";
import { mkdtemp, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { createCanvas, loadImage } from "@napi-rs/canvas";
import { prepareShadowRendering, render } from "../../../src/index.js";
import { renderToPNGBuffer } from "../../../src/renderers/png.js";
import { serializeGraphic, deserializeGraphic } from "../../../src/persistence.js";
import { createTransitionScene, renderTransitionScene } from "../../../src/scene.js";
import { tableEffectPair } from "./effects.js";
import { renderToSVG } from "../../../src/renderers/svg.js";
import { renderToPDFBuffer } from "../../../src/renderers/pdf.js";
import { createMockCanvasContext } from "../../support/canvas.js";
import { visualVariants } from "./manifest.js";
for (const variant of visualVariants) test(`table ${variant.variant} preserves primitive Canvas calls, SVG and exact PDF pixels`, async () => {
  const programs = [variant.primitive(), variant.userFacing()], contexts = programs.map(() => createMockCanvasContext());
  programs.forEach((p, i) => render(p, contexts[i]));
  assert.deepEqual(contexts[1].calls, contexts[0].calls);
  assert.equal(renderToSVG(programs[1], { resourceNamespace: "same" }), renderToSVG(programs[0], { resourceNamespace: "same" }));
  const directory = await mkdtemp(path.join(tmpdir(), "table-pdf-"));
  try {
    const pixels = [];
    for (const [i, program] of programs.entries()) {
      const pdf = await renderToPDFBuffer(program), stem = path.join(directory, `table-${i}`);
      await writeFile(`${stem}.pdf`, pdf.buffer);
      execFileSync("pdftoppm", ["-r", "72", "-singlefile", "-png", `${stem}.pdf`, stem], { stdio: "pipe" });
      const canvas = createCanvas(variant.width, variant.height), ctx = canvas.getContext("2d");
      ctx.drawImage(await loadImage(`${stem}.png`), 0, 0);
      pixels.push(Buffer.from(ctx.getImageData(0, 0, variant.width, variant.height).data));
    }
    assert.equal(Buffer.compare(pixels[0], pixels[1]), 0);
  } finally { await rm(directory, { recursive: true, force: true }); }
});

test("Table cell effects retain primitive pixels, clips and offline scene endpoints", async () => {
  const pair = tableEffectPair(), snapshot = deserializeGraphic(serializeGraphic(pair[1]));
  const programs = [...pair, snapshot], pixels = canvas => Buffer.from(canvas.getContext("2d").getImageData(0, 0, canvas.width, canvas.height).data);
  const decode = async ({ bytes }) => { const image = await loadImage(bytes); return { image, width: image.width, height: image.height, originClean: true }; };
  const pngPixels = [];
  for (const program of programs) {
    const png = (await renderToPNGBuffer(program)).buffer, image = await loadImage(png), canvas = createCanvas(image.width, image.height);
    canvas.getContext("2d").drawImage(image, 0, 0); pngPixels.push(pixels(canvas));
    const shadows = await prepareShadowRendering(program, { createCanvas, decode });
    try { render(program, canvas.getContext("2d"), { shadows }); assert.deepEqual(pixels(canvas), pngPixels.at(-1)); }
    finally { shadows.dispose(); }
  }
  assert.deepEqual(pngPixels[0], pngPixels[1]); assert.deepEqual(pngPixels[1], pngPixels[2]);
  const scene = createTransitionScene(snapshot, { format: "canvas" }), shadows = await prepareShadowRendering(scene, { createCanvas, decode });
  try { const canvas = createCanvas(1, 1); renderTransitionScene(scene, canvas.getContext("2d"), { shadows }); assert.deepEqual(pixels(canvas), pngPixels[1]); }
  finally { shadows.dispose(); }
  const directory = await mkdtemp(path.join(tmpdir(), "table-effects-pdf-"));
  try {
    const pdfPixels = [];
    for (const [i, program] of programs.entries()) {
      const pdf = await renderToPDFBuffer(program), stem = path.join(directory, `effects-${i}`);
      await writeFile(`${stem}.pdf`, pdf.buffer); execFileSync("pdftoppm", ["-r", "72", "-singlefile", "-png", `${stem}.pdf`, stem], { stdio: "pipe" });
      const canvas = createCanvas(360, 220); canvas.getContext("2d").drawImage(await loadImage(`${stem}.png`), 0, 0); pdfPixels.push(pixels(canvas));
    }
    assert.deepEqual(pdfPixels[0], pdfPixels[1]); assert.deepEqual(pdfPixels[1], pdfPixels[2]);
  } finally { await rm(directory, { recursive: true, force: true }); }
});
