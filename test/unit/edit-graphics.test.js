import assert from "node:assert/strict";
import test from "node:test";

import { chart } from "../../src/core/ChartProgram.js";

test("edits a single graphic without mutating an earlier program", () => {
  const canvas = chart().createGraphics({ id: "canvas", type: "canvas" });
  const resized = canvas.editGraphics({
    target: "canvas",
    property: "width",
    value: 640
  });

  assert.deepEqual(canvas.graphicSpec.objects.canvas.properties, {});
  assert.deepEqual(resized.graphicSpec.objects.canvas.properties, { width: 640 });
  assert.equal(resized.graphicSpec.order, canvas.graphicSpec.order);
  assert.equal(resized.trace.children.at(-1).op, "editGraphics");
});

test("distributes arrays and broadcasts scalar values to collection children", () => {
  const points = chart().createGraphics({
    id: "points",
    type: "circle",
    length: 2
  });
  const positioned = points.editGraphics({
    target: "points",
    property: "x",
    value: [32.5, 81.4]
  });
  const sized = positioned.editGraphics({
    target: "points",
    property: "radius",
    value: 3
  });

  assert.deepEqual(
    sized.graphicSpec.objects.points.children.map(child => child.properties),
    [
      { x: 32.5, radius: 3 },
      { x: 81.4, radius: 3 }
    ]
  );
  assert.deepEqual(points.graphicSpec.objects.points.children[0].properties, {});
});

test("stores each outer array item intact and can target one child", () => {
  const styles = [
    { fill: "red", dash: [4, 2] },
    { fill: "blue", dash: [1, 1] }
  ];
  const program = chart()
    .createGraphics({ id: "points", type: "circle", length: 2 })
    .editGraphics({ target: "points", property: "style", value: styles })
    .editGraphics({ target: "points:1", property: "radius", value: 4 });

  styles[0].fill = "black";

  assert.deepEqual(program.graphicSpec.objects.points.children[0].properties.style, {
    fill: "red",
    dash: [4, 2]
  });
  assert.equal(
    program.graphicSpec.objects.points.children[1].properties.radius,
    4
  );
  assert.equal(
    "radius" in program.graphicSpec.objects.points.children[0].properties,
    false
  );
});

test("resizes a drawable collection while preserving existing children", () => {
  const onePoint = chart()
    .createGraphics({ id: "points", type: "circle", length: 1 })
    .editGraphics({ target: "points", property: "x", value: [10] });
  const twoPoints = onePoint.editGraphics({
    target: "points",
    property: "length",
    value: 2
  });

  assert.equal(twoPoints.graphicSpec.objects.points.children.length, 2);
  assert.deepEqual(twoPoints.graphicSpec.objects.points.children[0].properties, {
    x: 10
  });
  assert.equal(twoPoints.graphicSpec.objects.points.children[1].id, "points:1");
  assert.equal(onePoint.graphicSpec.objects.points.children.length, 1);
});

test("turns a single drawable into a collection through length", () => {
  const program = chart()
    .createGraphics({ id: "points", type: "circle" })
    .editGraphics({ target: "points", property: "length", value: 2 });

  assert.deepEqual(program.graphicSpec.objects.points, {
    type: "circle",
    children: [
      { id: "points:0", properties: {} },
      { id: "points:1", properties: {} }
    ]
  });
});

test("rejects unknown targets, properties, and mismatched value arrays", () => {
  const program = chart().createGraphics({
    id: "points",
    type: "circle",
    length: 2
  });

  assert.throws(
    () => program.editGraphics({ target: "missing", property: "x", value: 1 }),
    /Unknown graphic target/
  );
  assert.throws(
    () => program.editGraphics({ target: "points", property: "cx", value: 1 }),
    /Unknown circle graphic property/
  );
  assert.throws(
    () =>
      program.editGraphics({ target: "points", property: "x", value: [1] }),
    /requires 2 values/
  );
});
