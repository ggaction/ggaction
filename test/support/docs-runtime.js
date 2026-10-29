import assert from "node:assert/strict";
import { createCanvas, loadImage } from "@napi-rs/canvas";

export function documentationEnvironment(example, data) {
  const canvas = createCanvas(1, 1);
  return { canvas,
    document: example.environment === "browser-module" ? {
      createElement(tag) {
        assert.equal(tag, "canvas", "Undocumented element creation");
        return createCanvas(1, 1);
      },
      querySelector(selector) {
        assert.ok(["#chart", "canvas"].includes(selector), `Undocumented Canvas selector: ${selector}`);
        return canvas;
      }
    } : undefined,
    createImageBitmap: example.environment === "browser-module" ? async blob => {
      assert.ok(blob instanceof Blob, "Documented image decoding requires a Blob");
      return loadImage(new Uint8Array(await blob.arrayBuffer()));
    } : undefined,
    fetch: example.dataset ? async url => {
      assert.equal(url, `/${example.dataset}.json`, "The snippet must request its documented dataset URL");
      return { ok: true, status: 200, json: async () => structuredClone(data) };
    } : undefined
  };
}

export function assertDocumentationRendering(example, canvas) {
  if (example.rendering !== "renders-canvas") return;
  assert.ok(canvas.width > 1 && canvas.height > 1, "The displayed snippet must render its own Canvas");
  const pixels = canvas.getContext("2d").getImageData(0, 0, canvas.width, canvas.height).data;
  const colors = new Set();
  for (let i = 0; i < pixels.length; i += 4) {
    if (pixels[i + 3] > 0) colors.add(`${pixels[i]},${pixels[i+1]},${pixels[i+2]},${pixels[i+3]}`);
    if (colors.size > 1) return;
  }
  assert.fail("The displayed snippet must paint more than a uniform background");
}
