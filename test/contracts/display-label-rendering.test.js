import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";

import { chart, render } from "../../src/index.js";
import { renderToPDF } from "../../src/renderers/pdf.js";
import { renderToPNG } from "../../src/renderers/png.js";
import { renderToSVG } from "../../src/renderers/svg.js";
import {
  createMockCanvasContext,
  findCanvasCalls
} from "../support/canvas.js";
import { assertChartProgramsEquivalent } from "../support/chart-equivalence.js";
import { assertRenderedPNG } from "../support/png.js";

const DISPLAY_LABELS = Object.freeze([
  Object.freeze({ value: "A", label: "Alpha category" }),
  Object.freeze({ value: "B", label: "Beta category" })
]);

function axisAndLegendBase() {
  return chart()
    .createCanvas({
      width: 520,
      height: 360,
      margin: { top: 70, right: 180, bottom: 90, left: 70 }
    })
    .createData({ values: [
      { category: "A", value: 1 },
      { category: "B", value: 2 }
    ] })
    .createPointMark({ id: "points" })
    .encodeX({ field: "category", fieldType: "nominal" })
    .encodeY({ field: "value" })
    .encodeColor({ field: "category" })
    .createXAxisLabels()
    .createLegend({ target: "points", channels: ["color"] });
}

function axisAndLegend() {
  return axisAndLegendBase()
    .editXAxisLabels({ labelMap: DISPLAY_LABELS })
    .editLegendBlock({
      target: "points",
      channel: "color",
      labelMap: DISPLAY_LABELS
    });
}

function roleHeaders() {
  return chart()
    .createCanvas({ width: 240, height: 180, margin: 45 })
    .createData({ values: [
      { x: 1, y: 2, row: "A", column: "X" },
      { x: 2, y: 3, row: "B", column: "Y" }
    ] })
    .createPointMark()
    .encodeX({ field: "x" })
    .encodeY({ field: "y" })
    .facetGrid({ rows: { field: "row" }, columns: { field: "column" } })
    .editFacetHeaders({
      role: "row",
      labelMap: [{ value: "A", label: "Alpha row" }]
    })
    .editFacetHeaders({
      role: "column",
      side: "bottom",
      labelMap: [{ value: "X", label: "X column" }]
    });
}

test("renders mapped axis, legend, and role headers through every backend", async t => {
  const programs = [axisAndLegend(), roleHeaders()];
  const expected = [
    ["Alpha category", "Beta category"],
    ["X column", "Alpha row"]
  ];

  for (const [index, program] of programs.entries()) {
    const context = createMockCanvasContext();
    render(program, context);
    const drawn = findCanvasCalls(context, "fillText").map(call => call.args[0]);
    const svg = renderToSVG(program);
    for (const label of expected[index]) {
      assert.ok(drawn.includes(label), label);
      assert.ok(svg.includes(`>${label}</text>`), label);
    }
  }

  const directory = await mkdtemp(path.join(tmpdir(), "ggaction-display-labels-"));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const program = axisAndLegend();
  const pngPath = path.join(directory, "headers.png");
  const png = await renderToPNG(program, { output: pngPath, pixelRatio: 2 });
  assert.equal(
    png.width,
    Math.round(program.graphicSpec.objects.canvas.properties.width * 2)
  );
  assert.deepEqual(
    [...(await readFile(pngPath)).subarray(0, 8)],
    [137, 80, 78, 71, 13, 10, 26, 10]
  );

  const pdfPath = path.join(directory, "headers.pdf");
  const pdf = await renderToPDF(program, { output: pdfPath });
  assert.equal(pdf.pages, 1);
  assert.match((await readFile(pdfPath)).toString("latin1"), /^%PDF-/u);
});

test("mapped axis and legend text matches literal primitive edits and pixels", async () => {
  const publicProgram = axisAndLegend();
  const primitiveProgram = axisAndLegendBase()
    .editGraphics({
      target: "xAxisLabels",
      property: "text",
      value: ["Alpha category", "Beta category"]
    })
    .editGraphics({
      target: "colorLegendLabels",
      property: "text",
      value: ["Alpha category", "Beta category"]
    });

  assertChartProgramsEquivalent({
    primitiveProgram,
    publicProgram,
    compareSemanticSpec: false
  });

  const renderOptions = {
    width: 520,
    height: 360,
    pixelRatio: 1,
    colors: ["#4c78a8", "#f58518"],
    minimumInkPixels: 40
  };
  const primitivePixels = await assertRenderedPNG(primitiveProgram, {
    ...renderOptions,
    name: "display-labels-primitive"
  });
  const publicPixels = await assertRenderedPNG(publicProgram, {
    ...renderOptions,
    name: "display-labels-user-facing"
  });
  assert.equal(publicPixels.pixelHash, primitivePixels.pixelHash);
});
