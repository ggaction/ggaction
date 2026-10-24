import { writeFile } from "node:fs/promises";
import assert from "node:assert/strict";
import { createCanvas, loadImage } from "@napi-rs/canvas";
import { renderToPNG } from "../../../src/renderers/png.js";
import { variants } from "./primitive.program.js";
import { createSharedAdjacent } from "../../../examples/shared-adjacent/program.js";
import { createLinkedOverlay } from "../../../examples/linked-overlay/program.js";

for (const variant of variants) {
  const directory = `.artifacts/test/png/charts/linked-composition/${variant.id}`;
  await renderToPNG(variant.create(), { output: `${directory}/primitive.png`, pixelRatio: 2 });
  const bitmap = await loadImage(`${directory}/primitive.png`);
  const canvas = createCanvas(bitmap.width, bitmap.height);
  const context = canvas.getContext("2d");
  context.drawImage(bitmap, 0, 0);
  const pixels = context.getImageData(140, 120, 600, 450).data;
  {
    const primitivePixels = context.getImageData(0, 0, bitmap.width, bitmap.height).data;
    await renderToPNG(variant.id === "bar-line" ? createLinkedOverlay() : createSharedAdjacent(), { output: `${directory}/public.png`, pixelRatio: 2 });
    const publicBitmap = await loadImage(`${directory}/public.png`);
    assert.equal(publicBitmap.width, bitmap.width);
    assert.equal(publicBitmap.height, bitmap.height);
    context.clearRect(0, 0, bitmap.width, bitmap.height);
    context.drawImage(publicBitmap, 0, 0);
    assert.deepEqual(context.getImageData(0, 0, bitmap.width, bitmap.height).data, primitivePixels);
  }
  let ink = 0;
  for (let offset = 0; offset < pixels.length; offset += 4) {
    if (Math.min(pixels[offset], pixels[offset + 1], pixels[offset + 2]) < 180) ink++;
  }
  assert.ok(ink > 2000, `${variant.id} must contain plot-region ink`);
  await writeFile(`${directory}/variant.json`, JSON.stringify({
    capability: "linked-composition", chart: variant.id, variant: "default",
    title: variant.id, proposedCall: variant.proposedCall,
    width: bitmap.width, height: bitmap.height, plotInkPixels: ink
  }, null, 2) + "\n");
}
