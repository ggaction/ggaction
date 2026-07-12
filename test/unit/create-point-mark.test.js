import assert from "node:assert/strict";
import test from "node:test";

import { chart } from "../../src/core/ChartProgram.js";

test("creates a point mark from currentData with default circle shape", () => {
  const withData = chart().createData({
    id: "cars",
    values: [{ x: 1 }, { x: 2 }]
  });
  const program = withData.createPointMark({ id: "points" });

  assert.deepEqual(withData.semanticSpec.layers, []);
  assert.deepEqual(program.semanticSpec.layers, [
    { id: "points", mark: { type: "point" }, data: "cars" }
  ]);
  assert.deepEqual(program.graphicSpec.objects.points, {
    type: "circle",
    children: [
      { id: "points:0", properties: {} },
      { id: "points:1", properties: {} }
    ]
  });
  assert.equal(program.context.currentData, "cars");
  assert.equal(program.context.currentMark, "points");
});

test("uses an explicit dataset without changing currentData", () => {
  const program = chart()
    .createData({ id: "cars", values: [{ x: 1 }, { x: 2 }] })
    .createData({ id: "fit", values: [{ x: 1 }] })
    .createPointMark({ id: "points", data: "cars", shape: "circle" });

  assert.equal(program.semanticSpec.layers[0].data, "cars");
  assert.equal(program.graphicSpec.objects.points.children.length, 2);
  assert.equal(program.context.currentData, "fit");
  assert.equal(program.context.currentMark, "points");
});

test("supports empty datasets and multiple point marks", () => {
  const program = chart()
    .createData({ id: "empty", values: [] })
    .createPointMark({ id: "first" })
    .createPointMark({ id: "second" });

  assert.equal(program.graphicSpec.objects.first.children.length, 0);
  assert.equal(program.graphicSpec.objects.second.children.length, 0);
  assert.deepEqual(
    program.semanticSpec.layers.map(layer => layer.id),
    ["first", "second"]
  );
  assert.equal(program.context.currentMark, "second");
});

test("records resolved semantic and graphical child actions", () => {
  const program = chart()
    .createData({ id: "cars", values: [{ x: 1 }, { x: 2 }] })
    .createPointMark({ id: "points" });
  const createNode = program.trace.children[1];

  assert.equal(createNode.op, "createPointMark");
  assert.deepEqual(createNode.args, { id: "points" });
  assert.deepEqual(
    createNode.children.map(node => node.op),
    ["editSemantic", "editSemantic", "createGraphics"]
  );
  assert.deepEqual(createNode.children[0].args, {
    property: "layer[points].mark.type",
    value: "point"
  });
  assert.deepEqual(createNode.children[1].args, {
    property: "layer[points].data",
    value: "cars"
  });
  assert.deepEqual(createNode.children[2].args, {
    id: "points",
    type: "circle",
    length: 2
  });
  assert.deepEqual(program.actionStack, []);
});

test("rejects missing data, unsupported shapes, and unknown datasets", () => {
  assert.throws(
    () => chart().createPointMark({ id: "points" }),
    /requires data or a current dataset/
  );
  assert.throws(
    () =>
      chart()
        .createData({ id: "cars", values: [] })
        .createPointMark({ id: "points", shape: "square" }),
    /Unsupported point shape/
  );
  assert.throws(
    () =>
      chart()
        .createData({ id: "cars", values: [] })
        .createPointMark({ id: "points", data: "missing" }),
    /Unknown dataset/
  );
});

test("rejects invalid options and semantic or graphical duplicates", () => {
  const withData = chart().createData({ id: "cars", values: [] });

  assert.throws(
    () => withData.createPointMark({ id: "bad id" }),
    /Point mark id must contain/
  );
  assert.throws(
    () => withData.createPointMark({ id: "points", radius: 3 }),
    /Unknown createPointMark option/
  );

  const withMark = withData.createPointMark({ id: "points" });
  assert.throws(
    () => withMark.createPointMark({ id: "points" }),
    /Mark "points" already exists/
  );

  const withGraphic = withData.createGraphics({ id: "graphic", type: "circle" });
  assert.throws(
    () => withGraphic.createPointMark({ id: "graphic" }),
    /Graphic "graphic" already exists/
  );
});
