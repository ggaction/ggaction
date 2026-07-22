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

function selectionLifecycleProgram() {
  return chart()
    .createCanvas({ width: 160, height: 120, margin: 20 })
    .createData({ values: [
      { x: 1, y: 2 },
      { x: 2, y: 4 },
      { x: 3, y: 3 }
    ] })
    .createPointMark({ id: "points" })
    .encodeX({ field: "x" })
    .encodeY({ field: "y" })
    .selectMarks({ id: "focus", field: "x", op: "max" })
    .highlightMarks({
      selection: "focus",
      color: "#dc2626",
      size: 2,
      dimOthers: { opacity: 0.2 }
    })
    .editMarkSelection({ selection: "focus", field: "x", op: "min" });
}

test("renders edited selection keys and the clean removal baseline", async () => {
  const edited = selectionLifecycleProgram();
  const highlightedContext = createMockCanvasContext();
  render(edited, highlightedContext);
  const highlightedFills = findCanvasCalls(highlightedContext, "fill");
  assert.equal(highlightedFills.at(-1).fillStyle, "#dc2626");
  assert.equal(highlightedFills.slice(0, -1).every(
    call => call.globalAlpha === 0.2
  ), true);

  const clean = edited.removeMarkSelection({ selection: "focus" });
  const cleanContext = createMockCanvasContext();
  render(clean, cleanContext);
  assert.equal(findCanvasCalls(cleanContext, "fill").every(
    call => call.fillStyle === "#4c78a8" && call.globalAlpha === 1
  ), true);
  assert.equal(clean.materializationConfigs.selections, undefined);
  assert.equal(clean.materializationConfigs.highlights, undefined);

  const directory = await mkdtemp(join(tmpdir(), "ggaction-selection-lifecycle-"));
  try {
    const result = await renderToPNG(clean, {
      output: join(directory, "selection-lifecycle.png"),
      pixelRatio: 2
    });
    assert.equal(result.width, 320);
    assert.equal(result.height, 240);
    assert.equal(result.bytes > 0, true);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
