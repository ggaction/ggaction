import assert from "node:assert/strict";
import test from "node:test";
import { chart } from "../../../../src/index.js";
import { serializeProgram, deserializeProgram } from "../../../../src/persistence.js";
import { resolveConcreteGraphicBounds } from "../../../../src/grammar/schemas/graphicBounds.js";
import { applyMaterializationPlan } from "../../../../src/materialization/dependencies.js";
import { hasPendingAxisTitleRematerialization } from "../../../../src/materialization/guides/resources.js";

const title = { text: "Y", fontSize: 11, fontWeight: 700, offset: 35.7412109375 };
const margin = { left: 47, top: 40, right: 7, bottom: 37 };
function original() {
  return chart().createCanvas({ plot: { width: 100, height: 100 },
    margin: { left: 58.5, top: 40, right: 79.25, bottom: 48.5 } })
    .createData({ values: [{ x: 0, y: -5 }, { x: 1, y: 0 }, { x: 2, y: 5 }] })
    .createScatterPlot({ x: { field: "x", scale: { domain: [0, 2], nice: false, zero: false } },
      y: { field: "y", scale: { domain: [-5, 5], nice: false, zero: false } }, guides: false })
    .createYAxis({ ticksAndLabels: { values: [-5, 0, 5], ticks: { length: 5 },
      labels: { fontSize: 10, format: ".1f", offset: 6.5 } }, title });
}
const bounds = (p, id) => resolveConcreteGraphicBounds(p.graphicSpec, id, p.materializationConfigs.textMetrics);

test("Canvas replay compares labels with the same owner's prospective numeric title", () => {
  const p = original(), before = serializeProgram(p);
  const next = p.editCanvas({ margin });
  const reference = p.editYAxis({ title: false }).editCanvas({ margin }).createYAxisTitle(title);
  assert.deepEqual(next.graphicSpec, reference.graphicSpec);
  assert.equal(bounds(next, "yAxisTitle").left, 5.7587890625);
  assert.equal(bounds(next, "yAxisTitle").right, 16.7587890625);
  assert.equal(next.guideConfigs.axis.y.title.offset, title.offset);
  assert.equal(serializeProgram(p), before);
  assert.equal(Object.hasOwn(next.context, "pendingMaterializationPlan"), false);
  assert.deepEqual(deserializeProgram(serializeProgram(next)).graphicSpec, next.graphicSpec);
  const expanded = next.editCanvas({ margin: p.materializationConfigs.canvas.margin });
  assert.deepEqual(expanded.graphicSpec, p.graphicSpec);
});

test("focused label-only edits still reject a genuine numeric-title collision atomically", () => {
  const p = original(), before = serializeProgram(p);
  assert.throws(() => p.editYAxisLabels({ fontSize: 30 }), /overlap the axis title/);
  assert.equal(serializeProgram(p), before);
  assert.equal(Object.hasOwn(p.context, "pendingMaterializationPlan"), false);
});

test("horizontal numeric title replay uses its future position too", () => {
  const xTitle = { text: "X", fontSize: 11, fontWeight: 700, offset: 35.7412109375 };
  const p = chart().createCanvas({ plot: { width: 100, height: 100 }, margin: 60 })
    .createData({ values: [{ x: 0, y: 0 }, { x: 1, y: 1 }] })
    .createScatterPlot({ x: "x", y: "y", guides: false })
    .createXAxis({ ticksAndLabels: { values: [0, 1], labels: { fontSize: 10, offset: 6.5 } }, title: xTitle });
  const delta = bounds(p, "xAxisTitle").top - bounds(p, "xAxisLabels").bottom + 1;
  assert(delta > 0);
  const edit = { margin: { top: 60 + delta } };
  const q = p.editCanvas(edit);
  const reference = p.editXAxis({ title: false }).editCanvas(edit).createXAxisTitle(xTitle);
  assert.deepEqual(q.graphicSpec, reference.graphicSpec);
  assert.equal(q.graphicSpec.objects.xAxisTitle.properties.y - p.graphicSpec.objects.xAxisTitle.properties.y, delta);
});

test("a scheduled title rebuild still rejects the final overlapping geometry", () => {
  const p = original(), before = serializeProgram(p);
  assert.throws(() => applyMaterializationPlan(p, [
    { op: "editYAxisLabels", args: { fontSize: 30 } },
    { op: "editYAxisTitle" }
  ]), /overlap/);
  assert.equal(serializeProgram(p), before);
});

test("missing or different-channel pending titles cannot defer a fixed title check", () => {
  const p = original();
  for (const later of [[], [{ op: "editXAxisTitle" }]]) {
    assert.throws(() => applyMaterializationPlan(p, [
      { op: "editYAxisLabels", args: { fontSize: 30 } }, ...later
    ]), /overlap the axis title/);
  }
  assert.equal(hasPendingAxisTitleRematerialization(p, "y", "y"), false);
});

test("named owners are resolved with the existing explicit target selector", () => {
  const p = original().editYAxis({ visible: false }).createYAxis({ id: "other", scale: "y", position: "right",
    title: { text: "Other", offset: 30 } });
  const pending = steps => p._withContext({ pendingMaterializationPlan: { steps, next: 0 } });
  assert.equal(hasPendingAxisTitleRematerialization(pending([
    { op: "editYAxisTitle", args: { target: "other" } }
  ]), "y", "y"), false);
  assert.equal(hasPendingAxisTitleRematerialization(pending([
    { op: "editYAxisTitle", args: { target: "other" } }
  ]), "y", "other"), true);
  assert.throws(() => applyMaterializationPlan(p, [
    { op: "editYAxisLabels", args: { fontSize: 30 } },
    { op: "editYAxisTitle", args: { target: "other" } }
  ]), /overlap the axis title/);
  assert.throws(() => hasPendingAxisTitleRematerialization(pending([
    { op: "editYAxisTitle", args: { target: "missing" } }
  ]), "y", "y"), /Unknown y-axis target/);
  const moved = p.editCanvas({ margin });
  assert.equal(moved.guideConfigs.axis.other.title.offset, 30);
  assert.equal(Object.hasOwn(moved.context, "pendingMaterializationPlan"), false);
  const ambiguous = p.removeYAxis().editYAxis({ target: "other", visible: false }).createYAxis({ id: "left", scale: "y", position: "left", title });
  assert.throws(() => hasPendingAxisTitleRematerialization(ambiguous._withContext({
    pendingMaterializationPlan: { steps: [{ op: "editYAxisTitle" }], next: 0 }
  }), "y", "left"), /Multiple y-axes require an explicit target/);
});

test("X and Y numeric and omitted offsets converge through Canvas shrink and expansion", () => {
  for (const channel of ["X", "Y"]) for (const explicit of [false, true]) {
    const p = chart().createCanvas({ width: 600, height: 500, margin: 130 })
      .createData({ values: [{ x: 0, y: 0 }, { x: 1, y: 100 }] })
      .createScatterPlot({ x: "x", y: "y", guides: false })
      [`create${channel}Axis`]({ title: { text: "Measure", ...(explicit ? { offset: 60 } : {}) } });
    const q = p.editCanvas({ width: 700, height: 550, margin: 140 });
    const r = q.editCanvas({ width: 600, height: 500, margin: 130 });
    assert.deepEqual(r.graphicSpec, p.graphicSpec);
    assert.deepEqual(r.guideConfigs, p.guideConfigs);
    assert.equal(Object.hasOwn(r.context, "pendingMaterializationPlan"), false);
  }
});

function compactAxis(axisId = "y", position = "left") {
  return chart().createCanvas({ width: 340, height: 295,
    margin: { left: 57, right: 83, top: 57, bottom: 38 } })
    .createData({ values: [{ x: 0, y: 6 }, { x: 1, y: 10 }, { x: 2, y: 16 }] })
    .createLinePlot({ x: { field: "x", scale: { domain: [0, 2] } },
      y: { field: "y", scale: { domain: [5, 16] } }, guides: false })
    .createYAxis({ ...(axisId === "y" ? {} : { id: axisId, scale: "y" }), position,
      ticksAndLabels: { values: [6, 8, 10, 12, 14, 16],
        ticks: { length: 5, alongOffset: 0.5 },
        labels: { fontSize: 10, format: ".2f", offset: 6.5, alongOffset: 0.890625 } },
      title: { text: "Quantity", fontSize: 11, fontWeight: 700, offset: 40.5, alongOffset: 0.5 } });
}

for (const [axisId, position] of [["y", "left"], ["measure", "right"]]) {
  test(`whole ${position} frame edits compare numeric titles in their final owner geometry`, () => {
    const p = compactAxis(axisId, position), before = serializeProgram(p);
    const target = axisId === "y" ? {} : { target: axisId };
    const originalTitle = { text: "Quantity", fontSize: 11, fontWeight: 700, offset: 40.5, alongOffset: 0.5 };
    const q = p.editYAxis({ ...target, offset: 4 });
    const reference = p.editYAxis({ ...target, title: false })
      .editYAxis({ ...target, offset: 4 })
      .createYAxisTitle({ ...target, ...originalTitle });
    assert.deepEqual(q.graphicSpec, reference.graphicSpec);
    assert.deepEqual(q.editYAxis({ ...target, offset: 0 }).graphicSpec, p.graphicSpec);
    assert.deepEqual(deserializeProgram(serializeProgram(q)).graphicSpec, q.graphicSpec);
    assert.equal(Object.hasOwn(q.context, "pendingMaterializationPlan"), false);
    assert.equal(Object.hasOwn(q.context, "pendingRelativeTitleAxis"), false);
    assert.throws(() => q.editYAxisLabels({ ...target, offset: 20 }), /overlap/);
    assert.throws(() => p.editYAxis({ ...target, offset: 4, labels: { offset: 20 } }), /overlap/);
    assert.equal(serializeProgram(p), before);
  });
}
