import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import { chart, render } from "../../src/index.js";
import { renderToPNG } from "../../src/renderers/png.js";
import { ACTION_INDEX, REPOSITORY_ROOT } from "../support/action-contracts.js";
import {
  createMockCanvasContext,
  findCanvasCalls
} from "../support/canvas.js";

function bin2DLifecycleProgram() {
  return chart()
    .createCanvas({
      width: 260,
      height: 220,
      margin: { top: 20, right: 90, bottom: 30, left: 30 }
    })
    .createData({ id: "samples", values: [
      { x: 0, y: 0 },
      { x: 1, y: 1 },
      { x: 2, y: 2 },
      { x: 3, y: 3 }
    ] })
    .createBin2DData({
      id: "cells",
      x: "x",
      y: "y",
      bins: { x: 2, y: 2 },
      extent: { x: [0, 3], y: [0, 3] },
      includeEmpty: true,
      as: { x0: "x0", x1: "x1", y0: "y0", y1: "y1", count: "count" }
    })
    .createRectMark({ id: "cellRects", data: "cells", stroke: "#ffffff" })
    .encodeX({ target: "cellRects", field: "x0" })
    .encodeX2({ target: "cellRects", field: "x1" })
    .encodeY({ target: "cellRects", field: "y0" })
    .encodeY2({ target: "cellRects", field: "y1" })
    .encodeColor({ target: "cellRects", field: "count", fieldType: "quantitative" })
    .createLegend({ target: "cellRects", channels: ["color"], count: 3 })
    .editBin2DData({ target: "cells", bins: 1, includeEmpty: false });
}

test("publishes the logical Bin2D edit facade as current behavior", () => {
  const declarations = readFileSync(
    join(REPOSITORY_ROOT, "types/program.d.ts"),
    "utf8"
  );
  assert.equal(
    ACTION_INDEX.actions.some(action => action.name === "editBin2DData"),
    true
  );
  assert.equal(
    ACTION_INDEX.plannedActions.some(action => action.name === "editBin2DData"),
    false
  );
  assert.match(declarations, /export interface EditBin2DDataOptions/);
  assert.match(declarations, /^  editBin2DData\(options: EditBin2DDataOptions\)/m);
});

test("renders the rebound Bin2D revision in Canvas and Node PNG", async () => {
  const program = bin2DLifecycleProgram();
  const context = createMockCanvasContext();
  render(program, context);
  const current = program.materializationConfigs.data.bin2d.cells.current;

  assert.equal(current, "cellsBin2DDataRevision1");
  assert.equal(program.semanticSpec.layers[0].data, current);
  assert.equal(program.graphicSpec.objects.cellRects.items.length, 1);
  assert.equal(program.graphicSpec.objects.cellRects.items[0].properties.fill.length > 0, true);
  assert.equal(findCanvasCalls(context, "fillRect").length > 1, true);
  assert.equal(findCanvasCalls(context, "stroke").length > 0, true);

  const directory = await mkdtemp(join(tmpdir(), "ggaction-bin2d-lifecycle-"));
  try {
    const result = await renderToPNG(program, {
      output: join(directory, "bin2d-lifecycle.png"),
      pixelRatio: 2
    });
    assert.equal(result.width, 520);
    assert.equal(result.height, 440);
    assert.equal(result.bytes > 0, true);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
