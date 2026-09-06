import assert from "node:assert/strict";
import test from "node:test";

import { chart } from "../../../../src/index.js";

const rows = Object.freeze([
  Object.freeze({ x: 1, y: 2, category: "A" }),
  Object.freeze({ x: 2, y: 4, category: "B" })
]);

function guidedProgram() {
  return chart()
    .createCanvas({
      width: 420,
      height: 300,
      margin: { top: 80, right: 100, bottom: 60, left: 60 }
    })
    .createData({ id: "rows", values: rows })
    .createPointMark({ id: "points" })
    .encodeX({ field: "x" })
    .encodeY({ field: "y" })
    .encodeColor({ field: "category", fieldType: "nominal" })
    .createGuides({ grid: { horizontal: {}, vertical: {} }, legend: {} })
    .createTitle({ text: "Example", subtitle: "Removal contract" });
}

test("removes complete guide and title resources without changing the mark", () => {
  const before = guidedProgram();
  const after = before
    .removeXAxis()
    .removeYAxis()
    .removeGrid()
    .removeLegend({ target: "points" })
    .removeTitle();

  assert.deepEqual(after.semanticSpec.guides, {});
  assert.deepEqual(after.semanticSpec.title, {});
  assert.ok(after.graphicSpec.objects.points);
  assert.ok(after.semanticSpec.layers.find(layer => layer.id === "points"));
  for (const id of [
    "xAxisLine", "xAxisTicks", "xAxisLabels", "xAxisTitle",
    "yAxisLine", "yAxisTicks", "yAxisLabels", "yAxisTitle",
    "horizontalGridLines", "verticalGridLines",
    "colorLegendSymbols", "colorLegendLabels", "colorLegendTitle",
    "chartTitle", "chartSubtitle"
  ]) {
    assert.equal(after.graphicSpec.objects[id], undefined, id);
  }
  assert.ok(before.graphicSpec.objects.xAxisLine);
  assert.ok(before.graphicSpec.objects.chartTitle);
});

test("removes one selected grid direction and allows recreation", () => {
  const before = guidedProgram();
  const removed = before.removeGrid({ vertical: true });
  const recreated = removed.createGrid({ horizontal: false, vertical: true });

  assert.ok(removed.semanticSpec.guides.grid.horizontal);
  assert.equal(removed.semanticSpec.guides.grid.vertical, undefined);
  assert.equal(removed.graphicSpec.objects.verticalGridLines, undefined);
  assert.ok(recreated.graphicSpec.objects.verticalGridLines);
  assert.throws(
    () => removed.removeGrid({ horizontal: false, vertical: false }),
    /at least one selected direction/
  );
});

test("validates removal selectors before changing existing resources", () => {
  const program = guidedProgram();

  assert.throws(() => program.removeXAxis({ scale: "missing" }), /no axis for scale/);
  assert.throws(() => program.removeLegend({ target: "missing" }), /Unknown legend target/);
  assert.throws(() => program.removeTitle({ text: true }), /does not accept options/);
  assert.ok(program.graphicSpec.objects.xAxisLine);
  assert.ok(program.graphicSpec.objects.colorLegendLabels);
  assert.ok(program.graphicSpec.objects.chartTitle);
});
