import assert from "node:assert/strict";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import test from "node:test";

import { render } from "../../../src/index.js";
import { renderToPDF } from "../../../src/renderers/pdf.js";
import { renderToPNG } from "../../../src/renderers/png.js";
import { renderToSVG } from "../../../src/renderers/svg.js";
import { createMockCanvasContext } from "../../support/canvas.js";

import { visualVariants } from "./manifest.js";

test("matches stable multi-legend output in Canvas, SVG, PNG, and PDF", async () => {
  for (const variant of visualVariants) {
    const primitive = variant.primitive();
    const userFacing = variant.userFacing();
    const primitiveCanvas = createMockCanvasContext();
    const userFacingCanvas = createMockCanvasContext();
    const artifactRoot = resolve(
      ".artifacts/test/renderers/charts/legend-layout",
      variant.chart,
      variant.variant
    );

    render(primitive, primitiveCanvas);
    render(userFacing, userFacingCanvas);
    assert.deepEqual(userFacingCanvas.calls, primitiveCanvas.calls);

    await mkdir(artifactRoot, { recursive: true });
    await writeFile(
      `${artifactRoot}/canvas.json`,
      `${JSON.stringify(primitiveCanvas.calls, null, 2)}\n`
    );

    const primitiveSVG = renderToSVG(primitive);
    const userFacingSVG = renderToSVG(userFacing);
    assert.equal(userFacingSVG, primitiveSVG);
    await writeFile(`${artifactRoot}/primitive.svg`, primitiveSVG);
    await writeFile(`${artifactRoot}/user-facing.svg`, userFacingSVG);

    const primitivePNG = await renderToPNG(primitive, {
      output: `${artifactRoot}/primitive.png`,
      pixelRatio: 2
    });
    const userFacingPNG = await renderToPNG(userFacing, {
      output: `${artifactRoot}/user-facing.png`,
      pixelRatio: 2
    });
    assert.deepEqual(
      [primitivePNG.width, primitivePNG.height],
      [variant.width * 2, variant.height * 2]
    );
    assert.deepEqual(
      await readFile(userFacingPNG.output),
      await readFile(primitivePNG.output)
    );

    const primitivePDF = await renderToPDF(primitive, {
      output: `${artifactRoot}/primitive.pdf`
    });
    const userFacingPDF = await renderToPDF(userFacing, {
      output: `${artifactRoot}/user-facing.pdf`
    });
    assert.deepEqual(
      [primitivePDF.width, primitivePDF.height, primitivePDF.pages],
      [variant.width, variant.height, 1]
    );
    assert.deepEqual(
      await readFile(userFacingPDF.output),
      await readFile(primitivePDF.output)
    );
  }
});
