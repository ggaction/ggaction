import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";

import { chart, hconcat, render } from "../../src/index.js";
import { renderToPDF } from "../../src/renderers/pdf.js";
import { renderToPNG } from "../../src/renderers/png.js";
import { renderToSVG } from "../../src/renderers/svg.js";
import { createMockCanvasContext, findCanvasCalls } from "../support/canvas.js";

const rows = Object.freeze([
  Object.freeze({ x: 1, y: 2, angle: "A", radius: 2, a: 1, b: 4, group: "one" }),
  Object.freeze({ x: 2, y: 4, angle: "B", radius: 3, a: 2, b: 3, group: "two" }),
  Object.freeze({ x: 3, y: 3, angle: "C", radius: 1, a: 3, b: 2, group: "one" })
]);

function cartesian() {
  return chart()
    .createCanvas({ width: 240, height: 200, margin: 40 })
    .createData({ values: rows })
    .createScatterPlot({ x: "x", y: "y", color: "group", guides: false });
}

function polar() {
  return chart()
    .createCanvas({ width: 220, height: 220, margin: 35 })
    .createData({ values: rows })
    .createPolarScatterPlot({
      theta: { field: "angle", fieldType: "nominal" },
      radius: "radius", color: "group", guides: false
    });
}

function parallel() {
  return chart()
    .createCanvas({ width: 280, height: 220, margin: 45 })
    .createData({ values: rows })
    .createParallelCoordinates({ dimensions: ["a", "b"], guides: false });
}

test("executes named composition edits across Cartesian, Polar, and Parallel children", async () => {
  const cart = cartesian();
  const radial = polar();
  const profile = parallel();
  const original = hconcat({
    id: "families",
    programs: [{ id: "cartesian", program: cart }, { id: "polar", program: radial }]
  });
  const composed = original
    .insertCompositionChild({ id: "parallel", program: profile, after: "cartesian" })
    .reorderCompositionChildren({ order: ["polar", "cartesian", "parallel"] })
    .replaceCompositionChild({
      target: "cartesian",
      program: cart.applyTheme({ theme: "dark" })
    });

  assert.deepEqual(composed.compositionSpec.children, ["polar", "cartesian", "parallel"]);
  assert.equal(original.children.cartesian, cart);
  assert.equal(composed.children.polar, radial);
  assert.equal(composed.children.parallel, profile);

  const context = createMockCanvasContext();
  render(composed, context);
  assert.ok(findCanvasCalls(context, "arc").length >= rows.length * 2);
  assert.ok(findCanvasCalls(context, "moveTo").length > 0);
  const svg = renderToSVG(composed);
  assert.match(svg, /<svg/u);
  assert.match(svg, /<circle/u);
  assert.match(svg, /<path/u);

  const directory = await mkdtemp(path.join(tmpdir(), "ggaction-composition-matrix-"));
  try {
    const png = path.join(directory, "matrix.png");
    const pdf = path.join(directory, "matrix.pdf");
    const pngResult = await renderToPNG(composed, { output: png });
    const pdfResult = await renderToPDF(composed, { output: pdf });
    assert.ok(pngResult.bytes > 0);
    assert.ok(pdfResult.bytes > 0);
    assert.equal((await readFile(png)).subarray(1, 4).toString(), "PNG");
    assert.equal((await readFile(pdf)).subarray(0, 4).toString(), "%PDF");
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test("keeps Polar and Parallel facet/repeat combinations explicitly unsupported", () => {
  for (const program of [polar(), parallel()]) {
    const graphics = program.graphicSpec;
    const trace = program.trace;
    assert.throws(
      () => program.facetGrid({
        rows: { field: "group" }, columns: { field: "angle" }
      }),
      /complete materializable Cartesian mark/
    );
    assert.throws(
      () => program.repeatCharts({ channel: "x", fields: ["x", "y"] }),
      /complete Cartesian mark/
    );
    assert.equal(program.graphicSpec, graphics);
    assert.equal(program.trace, trace);
  }
});
