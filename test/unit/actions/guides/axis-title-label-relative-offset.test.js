import assert from "node:assert/strict";
import test from "node:test";
import { chart } from "../../../../src/index.js";
import { chart as basicChart } from "../../../../src/basic.js";
import { serializeProgram, deserializeProgram } from "../../../../src/persistence.js";
import { decodeValue, encodeValue } from "../../../../src/persistence/codec.js";
import { resolveConcreteGraphicBounds } from "../../../../src/grammar/schemas/graphicBounds.js";
import { buildNumericTitleReference, buildRelativeTitleFacet } from "../../../support/axis-title-label-relative.js";

const relative = gap => ({ from: "labels", gap });
const rows = [{ x: 0, y: 0, panel: "A" }, { x: 1, y: 4.3, panel: "A" },
  { x: 0, y: 0, panel: "B" }, { x: 1, y: 26.75, panel: "B" }];
function base(factory = chart) {
  return factory().createCanvas({ width: 1000, height: 900, margin: 200 })
    .createData({ id: "rows", values: rows })
    .createScatterPlot({ x: "x", y: "y", guides: false });
}
const bounds = (p, id) => resolveConcreteGraphicBounds(p.graphicSpec, id, p.materializationConfigs.textMetrics);
function gap(p, channel, side, axisId = channel) {
  const prefix = axisId === channel ? `${channel}Axis` : `axis_${axisId}__`;
  const labels = p.graphicSpec.objects[prefix + "Labels"].items.filter(i => i.properties.text !== "");
  const lb = labels.map(item => bounds(p, item.id)), tb = bounds(p, prefix + "Title");
  return side === "bottom" ? tb.top - Math.max(...lb.map(b => b.bottom))
    : side === "top" ? Math.min(...lb.map(b => b.top)) - tb.bottom
      : side === "right" ? tb.left - Math.max(...lb.map(b => b.right))
        : Math.min(...lb.map(b => b.left)) - tb.right;
}
function close(a, b) { assert.ok(Math.abs(a - b) < 1e-10, `${a} != ${b}`); }

for (const [channel, side] of [["x", "bottom"], ["x", "top"], ["y", "left"], ["y", "right"]]) {
  for (const reverse of [false, true]) {
    test(`${side} relative title preserves physical gap with reverse=${reverse}`, () => {
      const p = base().editScale({ id: channel, reverse })
        [channel === "x" ? "createXAxis" : "createYAxis"]({ position: side,
          title: { text: "Measure", offset: relative(7), alongOffset: 3 } });
      close(gap(p, channel, side), 7);
      assert.deepEqual(p.guideConfigs.axis[channel].title.offset, relative(7));
      assert.equal(p.guideConfigs.axis[channel].title.inferredOffset, false);
      assert.equal(Object.hasOwn(p.guideConfigs.axis[channel].title, "resolvedOffset"), false);
      assert.deepEqual(deserializeProgram(serializeProgram(p)).graphicSpec, p.graphicSpec);
      const zero = p[channel === "x" ? "editXAxisTitle" : "editYAxisTitle"]({ offset: relative(0) });
      close(gap(zero, channel, side), 0);
    });
  }
}

test("complete, whole, focused and Basic create converge on the same public intent", () => {
  const title = { text: "Measure", offset: relative(6) };
  const expected = base().createYAxis({ title });
  for (const p of [base().createYAxis().editYAxis({ title }),
    base().createYAxis().editYAxisTitle(title), base(basicChart).createYAxis({ title }),
    base().createAxes({ x: false, y: { title } }),
    base().createGuides({ axes: { x: false, y: { title } }, grid: false, legend: false })]) {
    assert.deepEqual(p.graphicSpec.objects.yAxisTitle, expected.graphicSpec.objects.yAxisTitle);
    assert.deepEqual(p.guideConfigs.axis.y.title.offset, relative(6));
  }
});

test("named resource labels remain separate and whole-side edits follow the current labels", () => {
  const p = base().createYAxis({ id: "measure", position: "right", title: { offset: relative(9) } });
  close(gap(p, "y", "right", "measure"), 9);
  const q = p.editYAxisLabels({ target: "measure", fontSize: 18 });
  close(gap(q, "y", "right", "measure"), 9);
  assert.notEqual(q.graphicSpec.objects.axis_measure__Title.properties.x, p.graphicSpec.objects.axis_measure__Title.properties.x);
  const moved = q.editYAxis({ target: "measure", position: "left" });
  close(gap(moved, "y", "left", "measure"), 9);
});

test("canonical whole-axis side and numeric-mode transitions validate the final sibling state", () => {
  const p = base().createYAxis({ title: { offset: relative(4) } });
  const q = p.editYAxis({ position: "right" });
  close(gap(q, "y", "right"), 4);
  assert.equal(Object.hasOwn(q.context, "pendingRelativeTitleAxis"), false);
  const numeric = p.editYAxis({ labels: false, title: { offset: 60 } });
  assert.equal(numeric.guideConfigs.axis.y.title.offset, 60);
  assert.equal(numeric.graphicSpec.objects.yAxisLabels, undefined);
  assert.throws(() => p.editYAxis({ labels: false, title: { color: "red" } }), /nonempty|same axis side/);
});

test("offset modes preserve omitted edits, defaults and earlier caller/program objects", () => {
  const requested = relative(8), p = base().createYAxis({ title: { offset: requested } });
  requested.gap = 99;
  assert.deepEqual(p.guideConfigs.axis.y.title.offset, relative(8));
  const before = serializeProgram(p), colored = p.editYAxisTitle({ color: "red" });
  close(gap(colored, "y", "left"), 8);
  const numeric = colored.editYAxisTitle({ offset: 70 });
  assert.equal(numeric.guideConfigs.axis.y.title.offset, 70);
  assert.equal(numeric.graphicSpec.objects.yAxisTitle.properties.x, 130);
  assert.equal(numeric.editYAxisTitle({ color: "blue" }).guideConfigs.axis.y.title.offset, 70);
  close(gap(numeric.editYAxisTitle({ offset: relative(3) }), "y", "left"), 3);
  const absent = p.editYAxis({ title: false }).createYAxisTitle();
  assert.equal(absent.guideConfigs.axis.y.title.inferredOffset, true);
  assert.equal(absent.guideConfigs.axis.y.title.offset, 52);
  assert.equal(serializeProgram(p), before);
  assert.equal(base().createXAxisTitle().guideConfigs.axis.x.title.offset, 42);
  assert.equal(base().createYAxisTitle().guideConfigs.axis.y.title.offset, 52);
});

test("format, width, font, scale, Canvas, theme, metrics and data rematerialize title intent", () => {
  const p = base().createYAxis({ title: { text: "Measure", offset: relative(4) } });
  const variations = [p.editYAxisLabels({ fontSize: 20 }),
    p.editYAxisLabels({ labelMap: [{ value: 0, label: "Much wider zero" }] }),
    p.editYScale({ domain: [0, 1000] }), p.editCanvas({ width: 1100 }),
    p.applyTheme({ theme: "light" }),
    p.applyTextMetrics({ profile: { schemaVersion: 1, id: "wide-zero", measurements: [
      { text: "0", fontFamily: "sans-serif", fontSize: 11, fontWeight: 400, width: 80 }
    ] } }),
    p.reviseData({ source: "rows", id: "revised", values: rows.map(row => ({ ...row, y: row.y * 100 })) })];
  for (const q of variations) {
    close(gap(q, "y", "left"), 4);
    assert.deepEqual(q.guideConfigs.axis.y.title.offset, relative(4));
    assert.deepEqual(deserializeProgram(serializeProgram(q)).graphicSpec, q.graphicSpec);
  }
});

test("arbitrary rotations, alignment and hard breaks use the same occupied block", () => {
  for (const rotation of [0, Math.PI / 4, Math.PI / 2]) {
    for (const align of ["left", "center", "right"]) for (const baseline of ["top", "middle", "bottom"]) {
      const p = base().createXAxis({ ticksAndLabels: { values: [0, 1], labels: {
        labelMap: [{ value: 0, label: "First\nline" }, { value: 1, label: "Second" }], rotation: 0.2 } },
      title: { text: "Two\nlines", rotation, align, baseline, offset: relative(8) } });
      close(gap(p, "x", "bottom"), 8);
    }
  }
});

test("empty display labels are excluded, and removing the last label rejects atomically", () => {
  const p = base().createYAxis({ ticksAndLabels: { values: [0, 10], labels: {
    labelMap: [{ value: 10, label: "" }] } }, title: { offset: relative(5) } });
  close(gap(p, "y", "left"), 5);
  const before = serializeProgram(p);
  assert.throws(() => p.editYAxisLabels({ labelMap: [{ value: 0, label: "" }, { value: 10, label: "" }] }), /nonempty/);
  assert.throws(() => p.editYAxis({ labels: false }), /together/);
  assert.equal(serializeProgram(p), before);
  const removed = p.editYAxis({ labels: false, title: false });
  assert.equal(removed.graphicSpec.objects.yAxisTitle, undefined);
  assert.equal(removed.graphicSpec.objects.yAxisLabels, undefined);
  assert.doesNotThrow(() => p.editYAxis({ ticksAndLabels: false, title: false }));
  assert.equal(p.removeYAxis().guideConfigs.axis?.y, undefined);
});

test("missing, other-side or other-owner labels never substitute for the owner", () => {
  assert.throws(() => base().createYAxisTitle({ offset: relative(2) }), /same axis side/);
  assert.throws(() => base().createYAxis({ ticksAndLabels: false, title: { offset: relative(2) } }), /same axis side/);
  const p = base().createYAxisLabels({ position: "left" });
  assert.throws(() => p.createYAxisTitle({ position: "right", offset: relative(2), overlap: "allow" }), /same axis side/);
});

test("closed relative shape, finite bounds and persistence reject malformed input without mutations", () => {
  const p = base().createYAxis(), before = serializeProgram(p);
  for (const offset of [{}, { from: "labels" }, { gap: 1 }, { from: "plot", gap: 1 },
    { from: "labels", gap: -1 }, { from: "labels", gap: NaN }, { from: "labels", gap: Infinity },
    { from: "labels", gap: "1" }, { from: "labels", gap: 1, extra: 1 }, [], null, "auto"]) {
    assert.throws(() => p.editYAxisTitle({ offset }));
  }
  assert.throws(() => p.editYAxisTitle({ offset: relative(Number.MAX_VALUE), overlap: "allow" }), /Canvas|finite/);
  assert.equal(serializeProgram(p), before);
  const saved = JSON.parse(serializeProgram(p.editYAxisTitle({ offset: relative(4) })));
  for (const mutate of [s => { s.materializationConfigs.guides.axis.y.title.inferredOffset = true; },
    s => { s.materializationConfigs.guides.axis.y.title.offset.gap = -1; },
    s => { s.materializationConfigs.guides.axis.y.labels.position = "right"; }]) {
    const state = decodeValue(saved.payload); mutate(state);
    assert.throws(() => deserializeProgram(JSON.stringify({ ...saved, payload: encodeValue(state) })));
  }
});

test("independent facet children recompute label widths and retain one stored gap on replay", () => {
  const p = base().createYAxis({ title: { offset: relative(5) } })
    .facet({ field: "panel", guides: { axes: "each", legend: false } }).editFacetScales({ y: "independent" });
  const children = Object.values(p.children);
  assert.notEqual(children[0].graphicSpec.objects.yAxisTitle.properties.x, children[1].graphicSpec.objects.yAxisTitle.properties.x);
  for (const child of children) close(gap(child, "y", "left"), 5);
  for (const q of [p.editFacetScales({ y: "shared" }),
    p.editFacetSource({ action: { method: "editYAxisLabels", options: { fontSize: 16 } } }),
    deserializeProgram(serializeProgram(p))]) {
    for (const child of Object.values(q.children)) {
      close(gap(child, "y", "left"), 5);
      assert.deepEqual(child.guideConfigs.axis.y.title.offset, relative(5));
    }
  }
});

test("relative offset remains Cartesian-only in runtime and editable persisted state", () => {
  const p = chart().createCanvas({ width: 800, height: 700, margin: 180 })
    .createData({ values: [{ x: 0, y: 1 }, { x: 1, y: 2 }] })
    .createPolarScatterPlot({ theta: "x", radius: "y", guides: false });
  assert.throws(() => p.createThetaAxisTitle({ offset: relative(4) }), /offset/);
  const titled = p.createThetaAxisTitle();
  const snapshot = JSON.parse(serializeProgram(titled)), state = decodeValue(snapshot.payload);
  state.materializationConfigs.guides.axis.theta.title.offset = relative(4);
  assert.throws(() => deserializeProgram(JSON.stringify({ ...snapshot, payload: encodeValue(state) })), /Cartesian/);
  const parallel = chart().createCanvas({ width: 800, height: 700, margin: 180 })
    .createData({ values: [{ x: 0, y: 1 }, { x: 1, y: 2 }] })
    .createParallelCoordinates({ dimensions: ["x", "y"], guides: false });
  assert.throws(() => parallel.createParallelAxis({ field: "x", title: { offset: relative(4) } }), /offset/);
});

test("four independent domains produce the exact numeric public reference anchors", () => {
  for (const p of [buildNumericTitleReference(), buildRelativeTitleFacet()]) {
    assert.equal(p.graphicSpec.objects.canvas.properties.width, 1016);
    assert.equal(p.graphicSpec.objects.canvas.properties.height, 302);
    const children = Object.values(p.children);
    assert.deepEqual(children.map(child => child.graphicSpec.objects.yAxisTitle.properties.x),
      [13.0166015625, 7.455078125, 7.455078125, 13.0166015625]);
    assert(children.every(child => child.graphicSpec.objects.yAxisTitle.properties.y === 159.5));
  }
});

test("plot-sized Canvas fits relative title font and gap changes on every physical side", () => {
  const p = chart().createCanvas({ plot: { width: 300, height: 240 }, margin: 8 })
    .createData({ id: "rows", values: rows }).createScatterPlot({ x: "x", y: "y", guides: false });
  const before = serializeProgram(p);
  let combinations = 0;
  for (const [channel, side] of [["x", "bottom"], ["x", "top"], ["y", "left"], ["y", "right"]]) {
    const create = channel === "x" ? "createXAxis" : "createYAxis";
    const edit = channel === "x" ? "editXAxisTitle" : "editYAxisTitle";
    for (const spacing of [0, 15, 30]) for (const fontSize of [8, 16, 24]) {
      const title = { offset: relative(spacing), fontSize };
      for (const q of [p[create]({ position: side, title }), p[create]({ position: side })[edit](title)]) {
        close(gap(q, channel, side), spacing);
        assert.deepEqual(q.materializationConfigs.canvas.plot, { width: 300, height: 240 });
        assert.deepEqual(q.guideConfigs.axis[channel].title.offset, relative(spacing));
        assert.equal(q.guideConfigs.axis[channel].title.fontSize, fontSize);
        const titleBounds = bounds(q, `${channel}AxisTitle`), canvas = q.graphicSpec.objects.canvas.properties;
        assert.ok(titleBounds.left >= -1e-9 && titleBounds.top >= -1e-9);
        assert.ok(titleBounds.right <= canvas.width + 1e-9 && titleBounds.bottom <= canvas.height + 1e-9);
        assert.deepEqual(deserializeProgram(serializeProgram(q)).graphicSpec, q.graphicSpec);
        combinations += 1;
      }
    }
  }
  assert.equal(combinations, 72);
  assert.equal(serializeProgram(p), before);
});

test("fixed outer Canvas still rejects relative titles outside its authored margins", () => {
  const p = base(), before = serializeProgram(p);
  for (const [channel, side] of [["x", "bottom"], ["x", "top"], ["y", "left"], ["y", "right"]]) {
    assert.throws(() => p[channel === "x" ? "createXAxis" : "createYAxis"]({ position: side,
      title: { offset: relative(500), fontSize: 24 } }), /label-relative title does not fit the Canvas margin/);
  }
  assert.equal(serializeProgram(p), before);
});
