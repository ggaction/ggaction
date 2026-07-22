import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

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
