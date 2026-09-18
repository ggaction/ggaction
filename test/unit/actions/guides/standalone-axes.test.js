import assert from "node:assert/strict";
import test from "node:test";
import { chart } from "../../../../src/index.js";
import { serializeProgram, deserializeProgram } from "../../../../src/persistence.js";
import { renderToSVG } from "../../../../src/renderers/svg.js";

const base = () => chart().createCanvas({ width: 600, height: 400, margin: 100 })
  .createCoordinate({ id: "frame", type: "cartesian" });

test("standalone axes bind explicit domains without data or invisible marks", () => {
  for (const channel of ["x", "y"]) for (const [type, domain] of [
    ["linear", [0, 100]], ["log", [1, 100]], ["symlog", [-10, 10]],
    ["time", [Date.UTC(2025, 0, 1), Date.UTC(2025, 0, 3)]],
    ["band", ["A", "B"]], ["point", ["A", "B"]]
  ]) {
    const op = channel === "x" ? "createXAxis" : "createYAxis";
    const p = base().createScale({ id: "measure", type, domain })[op]({ coordinate: "frame", scale: "measure",
      ticksAndLabels: { values: domain, ...(type === "time" ? { labels: { format: "%d %b" } } : {}) } });
    assert.equal(p.semanticSpec.layers.length, 0);
    assert.equal(p.semanticSpec.datasets.length, 0);
    assert.equal(p.semanticSpec.guides.axis[channel].title, "measure");
    const categorical = ["band", "point"].includes(type);
    assert.deepEqual(p.resolvedScales.measure.range, channel === "x" ? [100, 500] : categorical ? [100, 300] : [300, 100]);
    assert.match(renderToSVG(p), /<text/);
    assert.deepEqual(deserializeProgram(serializeProgram(p)).graphicSpec, p.graphicSpec);
    const resized = p.editCanvas({ width: 800, height: 500 });
    assert.deepEqual(resized.resolvedScales.measure.range, channel === "x" ? [100, 700] : categorical ? [100, 400] : [400, 100]);
  }
});

test("standalone scale and coordinate edits rematerialize axes and preserve earlier programs", () => {
  const p = base().createScale({ id: "amount", type: "linear", domain: [0, 100], nice: false })
    .createXAxis({ coordinate: "frame", scale: "amount" });
  const before = serializeProgram(p);
  const edited = p.editScale({ id: "amount", domain: [0, 200], reverse: true });
  assert.deepEqual(edited.resolvedScales.amount.domain, [0, 200]);
  assert.deepEqual(edited.resolvedScales.amount.range, [500, 100]);
  assert.deepEqual(p.editXScale({ domain: [0, 200], reverse: true }).graphicSpec, edited.graphicSpec);
  assert.notDeepEqual(edited.graphicSpec.objects.xAxisLabels, p.graphicSpec.objects.xAxisLabels);
  const aspect = p.editCoordinate({ target: "frame", aspect: { mode: "frame", ratio: 1 } });
  assert.equal(aspect.resolvedScales.amount.range[1] - aspect.resolvedScales.amount.range[0], 200);
  assert.equal(serializeProgram(p), before);
  assert.throws(() => p.editScale({ id: "amount", domain: "auto" }), /explicit nonempty domain/);
  const removed = p.removeXAxis();
  assert.equal(removed.graphicSpec.objects.xAxisLine, undefined);
  assert.doesNotThrow(() => removed.createXAxis({ coordinate: "frame", scale: "amount", title: false }));
});

test("standalone bindings reject ambiguity and incompatible scales before changing the input", () => {
  const p = base().createScale({ id: "amount", type: "linear", domain: [0, 100] });
  const before = serializeProgram(p);
  assert.throws(() => p.createXAxis({ scale: "amount" }), /requires scale/);
  assert.throws(() => p.createXAxis({ coordinate: "frame" }), /explicit unused scale/);
  assert.throws(() => p.createXAxis({ coordinate: "missing", scale: "amount" }), /Unknown coordinate/);
  const axis = p.createXAxis({ coordinate: "frame", scale: "amount", title: false });
  assert.throws(() => axis.createYAxis({ coordinate: "frame", scale: "amount" }), /across channels/);
  assert.equal(serializeProgram(p), before);
  const auto = base().createScale({ id: "amount", type: "linear" });
  assert.throws(() => auto.createXAxis({ coordinate: "frame", scale: "amount" }), /explicit nonempty/);
});

test("marks can join a standalone axis through its compatible coordinate and scale", () => {
  const axis = base().createScale({ id: "amount", type: "linear", domain: [0, 100] })
    .createXAxis({ coordinate: "frame", scale: "amount", title: false });
  const p = axis.createData({ values: [{ x: 50, y: 1 }] }).createScatterPlot({
    coordinate: "frame", x: { field: "x", scale: { id: "amount" } }, y: "y", guides: false
  });
  assert.equal(p.graphicSpec.objects.scatterPlot.items[0].properties.x, 300);
  assert.deepEqual(p.graphicSpec.objects.xAxisLine, axis.graphicSpec.objects.xAxisLine);
});
