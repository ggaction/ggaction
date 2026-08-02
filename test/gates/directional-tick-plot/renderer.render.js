import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import test from "node:test";

import { render } from "../../../src/index.js";
import { renderToPDF } from "../../../src/renderers/pdf.js";
import { renderToPNG } from "../../../src/renderers/png.js";
import { renderToSVG } from "../../../src/renderers/svg.js";
import { createMockCanvasContext } from "../../support/canvas.js";

import { visualVariants } from "./manifest.js";

test("renders every Tick visual target in Canvas, SVG, PNG, and PDF", async () => {
  for (const variant of visualVariants) {
    const primitive = variant.primitive();
    const canvas = createMockCanvasContext();
    const artifactRoot = resolve(
      ".artifacts/test/renderers/review",
      variant.chart,
      variant.variant
    );

    render(primitive, canvas);
    assert.ok(canvas.calls.length > 0);

    await mkdir(artifactRoot, { recursive: true });
    await writeFile(
      `${artifactRoot}/canvas.json`,
      `${JSON.stringify(canvas.calls, null, 2)}\n`
    );

    const svg = renderToSVG(primitive);
    assert.match(svg, new RegExp(`<svg[^>]+width="${variant.width}"`));
    assert.match(svg, new RegExp(`height="${variant.height}"`));
    await writeFile(`${artifactRoot}/primitive.svg`, svg);

    const png = await renderToPNG(primitive, {
      output: `${artifactRoot}/primitive.png`,
      pixelRatio: 2
    });
    assert.deepEqual(
      [png.width, png.height],
      [variant.width * 2, variant.height * 2]
    );

    const pdf = await renderToPDF(primitive, {
      output: `${artifactRoot}/primitive.pdf`
    });
    assert.deepEqual(
      [pdf.width, pdf.height, pdf.pages],
      [variant.width, variant.height, 1]
    );
  }
});
