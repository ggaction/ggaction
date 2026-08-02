import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import test from "node:test";

import { render } from "../../../src/index.js";
import { renderToPDF } from "../../../src/renderers/pdf.js";
import { renderToPNG } from "../../../src/renderers/png.js";
import { renderToSVG } from "../../../src/renderers/svg.js";
import { createMockCanvasContext } from "../../support/canvas.js";

import { createDirectionalTickPointPrimitives } from "./primitive.program.js";
import { DIRECTION_LAYOUT } from "./reference-values.js";

const artifactRoot = resolve(
  ".artifacts/test/renderers/review/directional-tick-plot/" +
  "baseline-tick-point-directions"
);

const expectedWidth = DIRECTION_LAYOUT.padding * 2 +
  DIRECTION_LAYOUT.panelWidth * 3 + DIRECTION_LAYOUT.gap * 2;
const expectedHeight = DIRECTION_LAYOUT.padding * 2 +
  DIRECTION_LAYOUT.panelHeight;

test("renders the directional primitive in Canvas, SVG, PNG, and PDF", async () => {
  const primitive = createDirectionalTickPointPrimitives();
  const canvas = createMockCanvasContext();

  render(primitive, canvas);
  assert.ok(canvas.calls.length > 0);

  await mkdir(artifactRoot, { recursive: true });
  await writeFile(
    `${artifactRoot}/canvas.json`,
    `${JSON.stringify(canvas.calls, null, 2)}\n`
  );

  const svg = renderToSVG(primitive);
  assert.match(svg, new RegExp(`<svg[^>]+width="${expectedWidth}"`));
  assert.match(svg, new RegExp(`height="${expectedHeight}"`));
  await writeFile(`${artifactRoot}/primitive.svg`, svg);

  const png = await renderToPNG(primitive, {
    output: `${artifactRoot}/primitive.png`,
    pixelRatio: 2
  });
  assert.deepEqual(
    [png.width, png.height],
    [expectedWidth * 2, expectedHeight * 2]
  );

  const pdf = await renderToPDF(primitive, {
    output: `${artifactRoot}/primitive.pdf`
  });
  assert.deepEqual(
    [pdf.width, pdf.height, pdf.pages],
    [expectedWidth, expectedHeight, 1]
  );
});
