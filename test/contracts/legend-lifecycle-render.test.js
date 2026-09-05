import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import { assertRenderedPNG } from "../support/png.js";
import { assertChartProgramsEquivalent } from "../support/chart-equivalence.js";
import { chart, render } from "../../src/index.js";
import { renderToPNG } from "../../src/renderers/png.js";
import {
  createMockCanvasContext,
  findCanvasCalls
} from "../support/canvas.js";

function legendLifecycleProgram() {
  return chart()
    .createCanvas({
      width: 160,
      height: 120,
      margin: { top: 10, right: 80, bottom: 20, left: 20 }
    })
    .createData({ values: [
      { x: 1, y: 2, group: "A", weight: 2 },
      { x: 2, y: 4, group: "A", weight: 2 },
      { x: 1, y: 3, group: "B", weight: 8 },
      { x: 2, y: 5, group: "B", weight: 8 }
    ] })
    .createLineMark({ id: "lines" })
    .encodeX({ field: "x" })
    .encodeY({ field: "y" })
    .encodeGroup({ field: "group" })
    .encodeStrokeWidth({ field: "weight", scale: { range: [1, 7] } })
    .createLegend({ channels: ["strokeWidth"] })
    .editLegend({
      count: 3,
      title: "Weight",
      labels: { color: "#123456" },
      titleStyle: { color: "#654321" }
    });
}

test("renders the edited stroke-width block and its selective removal", async () => {
  const edited = legendLifecycleProgram();
  const editedContext = createMockCanvasContext();
  render(edited, editedContext);
  const strokes = findCanvasCalls(editedContext, "stroke");
  assert.equal(strokes.some(call => call.strokeStyle === "#4c78a8"), true);
  assert.deepEqual(
    edited.graphicSpec.objects.strokeWidthLegendSymbols.items.map(
      item => item.properties.strokeWidth
    ),
    [1, 4, 7]
  );
  assert.equal(
    edited.graphicSpec.objects.strokeWidthLegendLabels.items[0].properties.fill,
    "#123456"
  );
  assert.equal(
    edited.graphicSpec.objects.strokeWidthLegendTitle.properties.fill,
    "#654321"
  );

  const removed = edited.removeLegend({ channels: ["strokeWidth"] });
  const removedContext = createMockCanvasContext();
  render(removed, removedContext);
  assert.equal(removed.graphicSpec.objects.strokeWidthLegendSymbols, undefined);
  assert.equal(removed.guideConfigs.legend, undefined);
  assert.ok(removed.semanticSpec.layers[0].encoding.strokeWidth);
  assert.equal(
    findCanvasCalls(removedContext, "stroke").length < strokes.length,
    true
  );

  const directory = await mkdtemp(join(tmpdir(), "ggaction-legend-lifecycle-"));
  try {
    const result = await renderToPNG(edited, {
      output: join(directory, "legend-lifecycle.png"),
      pixelRatio: 2
    });
    assert.equal(result.width, 320);
    assert.equal(result.height, 240);
    assert.equal(result.bytes > 0, true);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});


function sizeLegendProgram(count) {
  return chart().createCanvas({ width: 640, height: 420,
    margin: { left: 60, right: 180, top: 40, bottom: 60 } })
    .createData({ values: [{ x: 1, y: 2, m: 10 }, { x: 2, y: 3, m: 20 }, { x: 3, y: 5, m: 30 }] })
    .createPointMark({ id: "points" }).encodeX({ field: "x" }).encodeY({ field: "y" })
    .encodeSize({ field: "m", scale: { range: [4 * Math.PI, 36 * Math.PI] } })
    .createLegend({ channels: ["size"], count });
}

test("matches standalone size content edits to explicit primitive styling and exact pixels", async () => {
  const primitive = sizeLegendProgram(3)
    .editGraphics({ target: "sizeLegendLabels", property: "fill", value: "#123456" })
    .editGraphics({ target: "sizeLegendLabels", property: "fontWeight", value: 700 })
    .editGraphics({ target: "sizeLegendTitle", property: "text", value: "Mass" })
    .editGraphics({ target: "sizeLegendTitle", property: "fill", value: "#654321" });
  const publicProgram = sizeLegendProgram(5).editLegend({ count: 3, title: "Mass",
    labels: { color: "#123456", fontWeight: 700 }, titleStyle: { color: "#654321" } });
  assertChartProgramsEquivalent({ primitiveProgram: primitive, publicProgram, compareSemanticSpec: false });
  assert.deepEqual(publicProgram.graphicSpec.objects.sizeLegendSymbols.items.map(item => item.properties.radius),
    [2, Math.sqrt(20), 6]);
  const artifact = { scope: "charts", capability: "legend-layout", chart: "legend-lifecycle", variant: "size-content",
    title: "Standalone size legend content editing",
    userFacingCallChain: 'sizeLegendProgram(5).editLegend({ count: 3, title: "Mass", labels: { color: "#123456", fontWeight: 700 }, titleStyle: { color: "#654321" } });' };
  const options = { width: 640, height: 420, colors: ["#123456", "#654321", "#4c78a8"],
    regions: [{ name: "plot", x: 55, y: 35, width: 410, height: 330, minimumInkPixels: 100 }] };
  const expected = await assertRenderedPNG(primitive, { ...options, artifact: { ...artifact, kind: "primitive" } });
  const actual = await assertRenderedPNG(publicProgram, { ...options, artifact: { ...artifact, kind: "user-facing" } });
  assert.equal(actual.pixelHash, expected.pixelHash);
});

test("preserves explicit bottom placement through focused styling and exact pixels", async () => {
  const base = chart().createCanvas({ width: 640, height: 600,
    margin: { left: 60, right: 100, top: 40, bottom: 150 } })
    .createData({ values: [{ x: 1, y: 2, g: "A" }, { x: 2, y: 3, g: "B" }] })
    .createPointMark({ id: "points" }).encodeX({ field: "x" }).encodeY({ field: "y" })
    .encodeColor({ field: "g" });
  for (const layout of ["edge", "legacy-bottom"]) {
    const original = base.createLegend({ channels: ["color"], position: "bottom", layout });
    const primitive = original.editGraphics({ target: "colorLegendLabels", property: "fill", value: "#b91c1c" });
    const publicProgram = original.editLegendLabels({ color: "#b91c1c" });
    assertChartProgramsEquivalent({ primitiveProgram: primitive, publicProgram });
    assert.deepEqual(publicProgram.graphicSpec.objects.colorLegendLabels.items.map(item => item.properties.y),
      layout === "edge" ? [489, 489] : [572, 572]);
    const artifact = { scope: "charts", capability: "legend-layout", chart: "legend-lifecycle", variant: layout,
      title: `Bottom legend ${layout}`, userFacingCallChain: `base.createLegend({ channels: ["color"], position: "bottom", layout: "${layout}" }).editLegendLabels({ color: "#b91c1c" })` };
    const options = { width: 640, height: 600, colors: ["#b91c1c", "#4c78a8"],
      regions: [{ name: "plot", x: 55, y: 35, width: 490, height: 420, minimumInkPixels: 40 }] };
    const expected = await assertRenderedPNG(primitive, { ...options, artifact: { ...artifact, kind: "primitive" } });
    const actual = await assertRenderedPNG(publicProgram, { ...options, artifact: { ...artifact, kind: "user-facing" } });
    assert.equal(actual.pixelHash, expected.pixelHash);
  }
});
