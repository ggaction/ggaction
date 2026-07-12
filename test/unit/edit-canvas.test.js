import assert from "node:assert/strict";
import test from "node:test";

import { chart } from "../../src/core/ChartProgram.js";

function createConcreteCanvas() {
  return chart()
    .createGraphics({ id: "canvas", type: "canvas" })
    .editGraphics({ target: "canvas", property: "width", value: 640 })
    .editGraphics({ target: "canvas", property: "height", value: 400 })
    .editGraphics({ target: "canvas", property: "background", value: "white" });
}

test("partially edits a canvas and updates authoring bounds", () => {
  const original = createConcreteCanvas();
  const next = original.editCanvas({
    width: 800,
    margin: { left: 80 }
  });

  assert.deepEqual(original.graphicSpec.objects.canvas.properties, {
    width: 640,
    height: 400,
    background: "white"
  });
  assert.deepEqual(next.graphicSpec.objects.canvas.properties, {
    width: 800,
    height: 400,
    background: "white"
  });
  assert.deepEqual(next.context, {
    currentMargin: { top: 30, right: 30, bottom: 60, left: 80 },
    currentGraphicBounds: { x: 80, y: 30, width: 690, height: 310 }
  });

  const actionNode = next.trace.children.at(-1);
  assert.equal(actionNode.op, "editCanvas");
  assert.deepEqual(actionNode.children.map(node => node.op), ["editGraphics"]);
  assert.equal(actionNode.children[0].args.property, "width");
});

test("updates margin-only context without changing graphicSpec", () => {
  const original = createConcreteCanvas();
  const next = original.editCanvas({ margin: 20 });

  assert.equal(next.graphicSpec, original.graphicSpec);
  assert.deepEqual(next.context.currentMargin, {
    top: 20,
    right: 20,
    bottom: 20,
    left: 20
  });
  assert.deepEqual(next.context.currentGraphicBounds, {
    x: 20,
    y: 20,
    width: 600,
    height: 360
  });
  assert.deepEqual(next.trace.children.at(-1).children, []);
});

test("rejects invalid editCanvas calls", () => {
  assert.throws(() => chart().editCanvas({ width: 640 }), /existing canvas/);
  assert.throws(() => createConcreteCanvas().editCanvas({}), /at least one option/);
  assert.throws(
    () => createConcreteCanvas().editCanvas({ color: "red" }),
    /Unknown editCanvas option/
  );
  assert.throws(
    () => createConcreteCanvas().editCanvas({ width: 100 }),
    /horizontal margins/
  );
});

test("rematerializes auto-range position scales after bounds change", () => {
  const encoded = chart()
    .createCanvas({ width: 200, height: 120, margin: 10 })
    .createData({ id: "data", values: [{ x: 0 }, { x: 10 }] })
    .createPointMark({ id: "points" })
    .encodeX({ field: "x" });
  const resized = encoded.editCanvas({ width: 300, margin: 20 });
  const node = resized.trace.children.at(-1);

  assert.deepEqual(encoded.resolvedScales.x.range, [10, 190]);
  assert.deepEqual(resized.resolvedScales.x.range, [20, 280]);
  assert.deepEqual(
    resized.graphicSpec.objects.points.children.map(child => child.properties.x),
    [20, 280]
  );
  assert.deepEqual(
    node.children.map(child => child.op),
    ["editGraphics", "rematerializeScale"]
  );
});

test("does not rematerialize explicit ranges or background-only edits", () => {
  const encoded = chart()
    .createCanvas({ width: 200, height: 120, margin: 10 })
    .createData({ id: "data", values: [{ x: 0 }, { x: 10 }] })
    .createPointMark({ id: "points" })
    .encodeX({ field: "x", scale: { range: [0, 100] } });
  const resized = encoded.editCanvas({ width: 300 });
  const recolored = encoded.editCanvas({ background: "black" });

  assert.deepEqual(resized.resolvedScales.x.range, [0, 100]);
  assert.deepEqual(
    resized.trace.children.at(-1).children.map(child => child.op),
    ["editGraphics"]
  );
  assert.deepEqual(
    recolored.trace.children.at(-1).children.map(child => child.op),
    ["editGraphics"]
  );
});
