import assert from "node:assert/strict";
import test from "node:test";

import { chart } from "../../../../src/index.js";

const ROWS = Object.freeze([
  Object.freeze({ id: "a", category: "A", value: 2, series: "one" }),
  Object.freeze({ id: "b", category: "A", value: 2, series: "two" }),
  Object.freeze({ id: "c", category: "A", value: 2, series: "one" }),
  Object.freeze({ id: "d", category: "B", value: 4, series: "two" })
]);

function base() {
  return chart()
    .createCanvas({ width: 420, height: 300, margin: 50 })
    .createData({ id: "rows", values: ROWS });
}

test("creates a vertical Beeswarm through Strip and point-packing owners", () => {
  const actual = base().createBeeswarmPlot({
    id: "swarm",
    x: { field: "category", fieldType: "nominal" },
    y: "value",
    color: "series",
    point: { radius: 4, stroke: "white" },
    packing: { key: "id", padding: 2 },
    guides: false
  });
  const expected = base().createStripPlot({
    id: "swarm",
    x: { field: "category", fieldType: "nominal", scale: { id: "swarmX" } },
    y: { field: "value", scale: { id: "swarmY" } },
    color: "series",
    point: { radius: 4, stroke: "white" },
    guides: false
  }).packPoints({ target: "swarm", channel: "x", key: "id", padding: 2 });
  assert.deepEqual(actual.semanticSpec, expected.semanticSpec);
  assert.deepEqual(actual.graphicSpec, expected.graphicSpec);
  assert.deepEqual(
    actual.trace.children.at(-1).children.map(node => node.op),
    ["createStripPlot", "packPoints"]
  );
  assert.equal(actual.materializationConfigs.pointPacking.swarm.channel, "x");
});

test("supports the horizontal orientation and explicit packing omission", () => {
  const horizontal = base().createBeeswarmPlot({
    id: "horizontal", x: "value",
    y: { field: "category", fieldType: "ordinal" },
    packing: { maxOffset: { band: 0.4 }, overflow: "overlap" },
    guides: false
  });
  assert.equal(horizontal.materializationConfigs.pointPacking.horizontal.channel, "y");
  assert.deepEqual(horizontal.semanticSpec.scales.map(scale => scale.id), [
    "horizontalX", "horizontalY"
  ]);
  const unpacked = base().createBeeswarmPlot({
    x: { field: "category", fieldType: "nominal" }, y: "value",
    packing: false, guides: false
  });
  assert.equal(unpacked.materializationConfigs.pointPacking, undefined);
  assert.deepEqual(
    unpacked.trace.children.at(-1).children.map(node => node.op),
    ["createStripPlot"]
  );
});

test("isolates default scales while preserving explicit scale ids", () => {
  const program = base()
    .createBeeswarmPlot({
      id: "first", x: { field: "category", fieldType: "nominal" }, y: "value",
      packing: false, guides: false
    })
    .createBeeswarmPlot({
      id: "second",
      x: { field: "category", fieldType: "nominal", scale: { id: "sharedCategory" } },
      y: { field: "value", scale: { id: "sharedValue" } },
      packing: false, guides: false
    });
  assert.deepEqual(program.semanticSpec.layers.map(layer => [
    layer.encoding.x.scale, layer.encoding.y.scale
  ]), [["firstX", "firstY"], ["sharedCategory", "sharedValue"]]);
});

test("rejects role and packing mistakes without changing the source program", () => {
  const source = base();
  const before = JSON.stringify(source);
  for (const options of [
    { x: "value" },
    { x: "value", y: { field: "series", fieldType: "nominal" }, packing: { seed: 1 } },
    { x: "value", y: { field: "series", fieldType: "nominal" }, packing: { maxOffset: { band: 0.7 } } },
    { x: "value", y: { field: "series", fieldType: "nominal" }, packing: { padding: -1 } },
    { x: { field: "value", scale: false }, y: { field: "series", fieldType: "nominal" } },
    { x: "value", y: { field: "category", fieldType: "ordinal" }, point: { radius: 20 } }
  ]) {
    assert.throws(() => source.createBeeswarmPlot(options));
    assert.equal(JSON.stringify(source), before);
  }
});
