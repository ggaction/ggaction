import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import test from "node:test";

import { render } from "../../../src/index.js";
import { renderToPDF } from "../../../src/renderers/pdf.js";
import { renderToPNG } from "../../../src/renderers/png.js";
import { renderToSVG } from "../../../src/renderers/svg.js";
import { createMockCanvasContext } from "../../support/canvas.js";
import { loadJobs } from "../../support/data.js";

import { createCenteredAreaStreamPrimitives } from "./primitive.program.js";
import { visualVariants } from "./manifest.js";

test("renders the center-area review target in Canvas, SVG, PNG, and PDF", async () => {
  const [variant] = visualVariants;
  const program = createCenteredAreaStreamPrimitives(loadJobs());
  const canvas = createMockCanvasContext();
  const artifactRoot = resolve(
    ".artifacts/test/renderers/review/centered-area-stream/jobs-zero-vs-center"
  );

  render(program, canvas);
  assert.ok(canvas.calls.length > 0);
  await mkdir(artifactRoot, { recursive: true });
  await writeFile(
    `${artifactRoot}/canvas.json`,
    `${JSON.stringify(canvas.calls, null, 2)}\n`
  );

  const svg = renderToSVG(program);
  assert.match(svg, new RegExp(`<svg[^>]+width="${variant.width}"`));
  assert.match(svg, new RegExp(`height="${variant.height}"`));
  await writeFile(`${artifactRoot}/primitive.svg`, svg);

  const png = await renderToPNG(program, {
    output: `${artifactRoot}/primitive.png`,
    pixelRatio: 2
  });
  assert.deepEqual([png.width, png.height], [variant.width * 2, variant.height * 2]);

  const pdf = await renderToPDF(program, {
    output: `${artifactRoot}/primitive.pdf`
  });
  assert.deepEqual([pdf.width, pdf.height, pdf.pages], [
    variant.width,
    variant.height,
    1
  ]);
});
