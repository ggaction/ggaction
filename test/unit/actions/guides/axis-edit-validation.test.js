import assert from "node:assert/strict";
import test from "node:test";
import { chart } from "../../../../src/index.js";
import { serializeProgram } from "../../../../src/persistence.js";

function base() {
  return chart().createCanvas({ width: 600, height: 500, margin: 100 })
    .createData({ values: [{ x: 0, y: 0 }, { x: 20, y: 20 }] })
    .createScatterPlot({ x: "x", y: "y", guides: false })
    .createAxes({ x: { title: false }, y: { title: false } });
}
function errorFrom(fn) {
  try { fn(); } catch (error) { return error; }
  assert.fail("The invalid public edit must be rejected.");
}
for (const channel of ["X", "Y"]) test(`${channel}-axis complete edits preserve focused raw-option errors and atomicity`, () => {
  const p = base(), before = serializeProgram(p);
  for (const [component, options] of [
    ["Ticks", { alongOffset: undefined }], ["Ticks", { alongOffset: NaN }],
    ["Ticks", { rounding: undefined }], ["Ticks", { count: undefined }],
    ["Labels", { alongOffset: undefined }], ["Labels", { flush: undefined }],
    ["Labels", { fontSize: undefined }], ["Labels", { colorMap: undefined }],
    ["Labels", { labelMap: undefined }],
    ["Labels", { labelMap: [{ value: Infinity, label: "Invalid" }] }],
    ["Labels", { colorMap: [{ value: NaN, color: "red" }] }]
  ]) {
    const original = structuredClone(options), key = component.toLowerCase();
    const focused = errorFrom(() => p[`edit${channel}Axis${component}`](options));
    const complete = errorFrom(() => p[`edit${channel}Axis`]({ [key]: options }));
    assert.equal(complete.constructor, focused.constructor);
    assert.equal(complete.message, focused.message);
    assert.deepEqual(options, original);
    assert.equal(serializeProgram(p), before);
    assert.equal(Object.hasOwn(p.context, "pendingMaterializationPlan"), false);
  }
});
for (const channel of ["X", "Y"]) test(`${channel}-axis grouped edits reject original nested keys before planning`, () => {
  const p = base(), before = serializeProgram(p);
  for (const group of [
    { ticks: { alongOffset: undefined } }, { count: undefined },
    { labels: { colorMap: undefined } },
    { labels: { labelMap: [{ value: -Infinity, label: "Invalid" }] } },
    { labels: { colorMap: [{ value: Infinity, color: "red" }] } }
  ]) {
    const original = structuredClone(group);
    const focused = errorFrom(() => p[`edit${channel}AxisTicksAndLabels`](group));
    const complete = errorFrom(() => p[`edit${channel}Axis`]({ ticksAndLabels: group }));
    assert.equal(complete.constructor, focused.constructor);
    assert.equal(complete.message, focused.message);
    assert.deepEqual(group, original);
    assert.equal(serializeProgram(p), before);
  }
});
test("explicit named owner validation cannot be replaced by another axis or normalized options", () => {
  const p = base().createYAxis({ id: "alternate", scale: "y", position: "right", title: false });
  const before = serializeProgram(p), args = { target: "alternate", ticksAndLabels: { labels: { colorMap: undefined } } };
  assert.throws(() => p.editYAxis(args), /colorMap/);
  assert.throws(() => p.editYAxis({ ...args, target: "missing" }), /Unknown y-axis target/);
  assert.equal(serializeProgram(p), before);
  assert.equal(Object.hasOwn(p.context, "pendingMaterializationPlan"), false);
});
test("valid coupled selections and documented map resets still converge", () => {
  const p = base(), before = serializeProgram(p), options = {
    values: [0, 10, 20], labels: { labelMap: [{ value: 10, label: "Middle" }], colorMap: [{ value: 20, color: "red" }] }
  };
  const q = p.editXAxis({ ticksAndLabels: options });
  const expected = p.editXAxisTicksAndLabels(options);
  assert.deepEqual(q.graphicSpec, expected.graphicSpec);
  assert.deepEqual(q.guideConfigs, expected.guideConfigs);
  const reset = { labelMap: "auto", colorMap: "auto" };
  assert.deepEqual(q.editXAxis({ labels: reset }).graphicSpec, q.editXAxisLabels(reset).graphicSpec);
  assert.equal(serializeProgram(p), before);
  assert.equal(Object.hasOwn(q.context, "pendingMaterializationPlan"), false);
});
