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

function axisLifecycleProgram() {
  return chart()
    .createCanvas({ width: 240, height: 180, margin: 50 })
    .createData({ values: [{ x: 0, y: 2 }, { x: 10, y: 8 }] })
    .createPointMark({ id: "points" })
    .encodeX({ field: "x" })
    .encodeY({ field: "y" })
    .createAxes()
    .editXAxis({ ticksAndLabels: false })
    .editYAxis({ line: false, title: false });
}

test("publishes Cartesian axis component removal as current behavior", () => {
  const declarations = readFileSync(
    join(REPOSITORY_ROOT, "types/program.d.ts"),
    "utf8"
  );
  assert.equal(
    ACTION_INDEX.plannedCapabilities.some(
      capability => capability.id === "cartesian-axis-component-removal"
    ),
    false
  );
  assert.match(
    declarations,
    /export interface EditAxisOptions[\s\S]*?line\?: false \| VisibleGuide<AxisLineStyleOptions>;[\s\S]*?ticksAndLabels\?: false \|/
  );
});

test("renders only retained axis components in Canvas and Node PNG", async () => {
  const program = axisLifecycleProgram();
  const context = createMockCanvasContext();
  render(program, context);

  assert.equal(program.graphicSpec.objects.xAxisTicks, undefined);
  assert.equal(program.graphicSpec.objects.xAxisLabels, undefined);
  assert.equal(program.graphicSpec.objects.yAxisLine, undefined);
  assert.equal(program.graphicSpec.objects.yAxisTitle, undefined);
  assert.ok(program.graphicSpec.objects.xAxisLine);
  assert.ok(program.graphicSpec.objects.xAxisTitle);
  assert.ok(program.graphicSpec.objects.yAxisTicks);
  assert.ok(program.graphicSpec.objects.yAxisLabels);
  assert.equal(findCanvasCalls(context, "stroke").length > 0, true);
  assert.equal(findCanvasCalls(context, "fillText").length > 0, true);

  const directory = await mkdtemp(join(tmpdir(), "ggaction-axis-lifecycle-"));
  try {
    const result = await renderToPNG(program, {
      output: join(directory, "axis-lifecycle.png"),
      pixelRatio: 2
    });
    assert.equal(result.width, 480);
    assert.equal(result.height, 360);
    assert.equal(result.bytes > 0, true);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
