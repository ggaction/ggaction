import assert from "node:assert/strict";
import test from "node:test";

import { chart } from "../../../../src/index.js";
import { createCarsHistogram } from "../../../../examples/cars-histogram/program.js";
import { createCarsBoxPlot } from "../../../../examples/cars-box-plot/program.js";
import { createJobsGroupedBar } from "../../../../examples/jobs-grouped-bar/program.js";
import { loadCars, loadJobs } from "../../../support/data.js";

function uncoloredBar() {
  return chart()
    .createCanvas({ width: 260, height: 180, margin: 20 })
    .createData({ values: [
      { value: 1 },
      { value: 2 },
      { value: 3 },
      { value: 7 }
    ] })
    .createBarMark()
    .encodeHistogram({ field: "value", maxBins: 3 });
}

function uncoloredRangedBar() {
  return chart()
    .createCanvas({ width: 260, height: 180, margin: 20 })
    .createData({ values: [
      { category: "A", lower: 2, upper: 7 },
      { category: "B", lower: 4, upper: 9 }
    ] })
    .createBarMark()
    .encodeX({ field: "category", fieldType: "nominal" })
    .encodeY({ field: "lower" })
    .encodeY2({ field: "upper" });
}

test("edits whole-bar appearance and retains it after rematerialization", () => {
  const base = uncoloredBar();
  const edited = base.editBarMark({
    fill: "#0f766e",
    opacity: 0.6,
    stroke: "#134e4a",
    strokeWidth: 2
  });

  assert.equal(edited.graphicSpec.objects.bar.children.every(child =>
    child.properties.fill === "#0f766e" &&
    child.properties.opacity === 0.6 &&
    child.properties.stroke === "#134e4a" &&
    child.properties.strokeWidth === 2
  ), true);
  assert.deepEqual(
    edited.trace.children.at(-1).children.map(child => child.op),
    ["rematerializeBarMark"]
  );

  const resized = edited.editCanvas({ width: 320 });
  assert.equal(resized.graphicSpec.objects.bar.children.every(child =>
    child.properties.fill === "#0f766e" &&
    child.properties.opacity === 0.6 &&
    child.properties.strokeWidth === 2
  ), true);
  assert.equal(base.markConfigs.bar, undefined);
});

test("removes a visible outline and can later restore it", () => {
  const removed = uncoloredBar().editBarMark({ stroke: false });
  assert.equal(removed.graphicSpec.objects.bar.children.every(child =>
    child.properties.stroke === "transparent" &&
    child.properties.strokeWidth === 0
  ), true);

  const restored = removed.editBarMark({ stroke: "black" });
  assert.equal(restored.graphicSpec.objects.bar.children.every(child =>
    child.properties.stroke === "black" &&
    child.properties.strokeWidth === 0.5
  ), true);
});

test("edits encoded-color bars except for their field-driven fill", () => {
  const histogram = createCarsHistogram(loadCars());
  assert.throws(
    () => histogram.editBarMark({ fill: "red" }),
    /cannot be combined with a color encoding/
  );
  const outlined = histogram.editBarMark({
    stroke: "#111827",
    strokeWidth: 1.5,
    opacity: 0.8
  });
  assert.equal(new Set(outlined.graphicSpec.objects.bars.children.map(child =>
    child.properties.fill
  )).size > 1, true);
  assert.equal(outlined.graphicSpec.objects.bars.children.every(child =>
    child.properties.stroke === "#111827" &&
    child.properties.strokeWidth === 1.5 &&
    child.properties.opacity === 0.8
  ), true);
});

test("persists outline and opacity across grouped and ranged bar grains", () => {
  for (const [program, target] of [
    [createJobsGroupedBar(loadJobs()), "bars"],
    [createCarsBoxPlot(loadCars()), "boxPlot"]
  ]) {
    const edited = program.editBarMark({
      target,
      opacity: 0.55,
      stroke: "#111827",
      strokeWidth: 1.25
    });
    assert.equal(edited.graphicSpec.objects[target].children.every(child =>
      child.properties.opacity === 0.55 &&
      child.properties.stroke === "#111827" &&
      child.properties.strokeWidth === 1.25
    ), true);
    const resized = edited.editCanvas({ width: 700 });
    assert.equal(resized.graphicSpec.objects[target].children.every(child =>
      child.properties.opacity === 0.55 &&
      child.properties.stroke === "#111827"
    ), true);
  }
});

test("applies whole-mark fill to an uncolored ranged bar", () => {
  const edited = uncoloredRangedBar().editBarMark({ fill: "#0f766e" });
  assert.equal(edited.graphicSpec.objects.bar.children.every(child =>
    child.properties.fill === "#0f766e"
  ), true);
});

test("validates bar edits atomically", () => {
  const base = uncoloredBar();
  for (const [options, error] of [
    [{}, /requires fill, opacity, stroke, or strokeWidth/],
    [{ fill: "" }, /non-empty string/],
    [{ opacity: 2 }, /from 0 to 1/],
    [{ stroke: false, strokeWidth: 1 }, /while removing stroke/],
    [{ strokeWidth: -1 }, /non-negative finite/],
    [{ unknown: true }, /Unknown editBarMark option/],
    [{ target: "missing", opacity: 0.5 }, /Unknown bar mark target/]
  ]) {
    assert.throws(() => base.editBarMark(options), error);
  }
  assert.equal(base.markConfigs.bar, undefined);
});
