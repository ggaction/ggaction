import assert from "node:assert/strict";
import test from "node:test";
import { chart } from "../../../../src/index.js";

const rows = [
  { id: 1, category: "A", value: 2, series: "one", size: 1 },
  { id: 2, category: "A", value: 4, series: "two", size: 2 },
  { id: 3, category: "B", value: 3, series: "one", size: 3 }
];

function base() {
  return chart()
    .createCanvas({ width: 320, height: 240, margin: 40 })
    .createData({ id: "source", values: rows });
}

test("creates a one-measure Strip with a constant center slot", () => {
  const actual = base().createStripPlot({
    id: "strip",
    x: { field: "value", scale: { domain: [0, 5] } },
    point: { radius: 4, fill: "#2563eb" },
    guides: false
  });
  const expected = base()
    .createPointMark({ id: "strip", fill: "#2563eb" })
    .encodeX({ target: "strip", field: "value", fieldType: "quantitative", scale: { domain: [0, 5] } })
    .encodeY({
      target: "strip", datum: 0.5, fieldType: "quantitative",
      scale: { id: "stripAnchor", domain: [0, 1], zero: false, nice: false }
    })
    .encodePointRadius({ target: "strip", value: 4 });
  assert.deepEqual(actual.semanticSpec, expected.semanticSpec);
  assert.deepEqual(actual.graphicSpec, expected.graphicSpec);
  assert.equal(new Set(actual.graphicSpec.objects.strip.items.map(item =>
    item.properties.y
  )).size, 1);
});

test("accepts either category-measure orientation and jitters only the slot", () => {
  const vertical = base().createStripPlot({
    x: { field: "category", fieldType: "nominal" },
    y: "value",
    jitter: { maxOffset: { band: 0.15 }, seed: "vertical", key: "id" },
    guides: false
  });
  assert.equal(vertical.materializationConfigs.jitters.stripPlot.channel, "x");
  assert.deepEqual(vertical.semanticSpec.layers[0].encoding.y.field, "value");

  const horizontal = base().createStripPlot({
    id: "horizontal",
    x: "value",
    y: { field: "category", fieldType: "ordinal" },
    jitter: { maxOffset: { band: 0.12 }, seed: 2 },
    guides: false
  });
  assert.equal(horizontal.materializationConfigs.jitters.horizontal.channel, "y");
  assert.deepEqual(horizontal.semanticSpec.layers[0].encoding.x.field, "value");
});

test("uses pixel jitter only for a constant slot and forwards appearance encodings", () => {
  const program = base().createStripPlot({
    x: "value",
    color: "series",
    size: "size",
    shape: "category",
    jitter: { maxOffset: { pixels: 8 }, seed: "constant" },
    guides: false
  });
  assert.equal(program.materializationConfigs.jitters.stripPlot.channel, "y");
  assert.ok(program.semanticSpec.layers[0].encoding.color);
  assert.ok(program.semanticSpec.layers[0].encoding.size);
  assert.ok(program.semanticSpec.layers[0].encoding.shape);
});

test("creates axes only for real positions by default", () => {
  const program = chart()
    .createCanvas({ width: 360, height: 280, margin: 70 })
    .createData({ values: rows })
    .createStripPlot({ x: "value" });
  assert.ok(program.guideConfigs.axis.x);
  assert.equal(program.guideConfigs.axis.y, undefined);
});

test("rejects ambiguous roles, wrong jitter units and radius conflicts atomically", () => {
  const source = base();
  const before = JSON.stringify(source);
  for (const options of [
    {},
    { x: { field: "category", fieldType: "nominal" } },
    { x: "value", y: { field: "size", fieldType: "quantitative" } },
    { x: { field: "category", fieldType: "nominal" }, y: { field: "series", fieldType: "ordinal" } },
    { x: "value", jitter: { maxOffset: { band: 0.1 } } },
    { x: "value", y: "category", jitter: { maxOffset: { pixels: 4 } } },
    { x: "value", point: { radius: 3 }, size: "size" },
    { x: "value", guides: { axes: { y: {} } } },
    { x: "value", guides: { legend: {} } }
  ]) {
    assert.throws(() => source.createStripPlot(options));
    assert.equal(JSON.stringify(source), before);
  }
});
