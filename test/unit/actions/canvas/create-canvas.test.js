import assert from "node:assert/strict";
import test from "node:test";

import { chart } from "../../../../src/core/ChartProgram.js";
import { resolveGraphicBounds } from "../../../../src/layout/canvas.js";

test("creates a canvas with defaults through nested actions", () => {
  const empty = chart();
  const program = empty.createCanvas();

  assert.deepEqual(empty.graphicSpec, { objects: {}, order: [] });
  assert.deepEqual(program.graphicSpec.objects.canvas, {
    type: "canvas",
    properties: {
      width: 640,
      height: 400,
      background: "white"
    }
  });
  assert.deepEqual(program.materializationConfigs.canvas, {
    margin: { top: 30, right: 30, bottom: 60, left: 70 }
  });
  assert.deepEqual(resolveGraphicBounds(program), {
    x: 70, y: 30, width: 540, height: 310
  });
  assert.deepEqual(program.context, {});

  const createNode = program.trace.children[0];
  assert.equal(createNode.op, "createCanvas");
  assert.deepEqual(
    createNode.children.map(node => node.op),
    ["createGraphics", "editCanvas"]
  );
  assert.deepEqual(
    createNode.children[1].children.map(node => node.op),
    ["editGraphics", "editGraphics", "editGraphics"]
  );
  assert.deepEqual(
    createNode.children[1].children.map(node => node.args.property),
    ["width", "height", "background"]
  );
  assert.deepEqual(program.actionStack, []);
});

test("creates a canvas with explicit and partially specified options", () => {
  const program = chart().createCanvas({
    width: 800,
    height: 500,
    background: "#f8fafc",
    margin: { left: 80, bottom: 70 }
  });

  assert.deepEqual(program.materializationConfigs.canvas.margin, {
    top: 30,
    right: 30,
    bottom: 70,
    left: 80
  });
  assert.deepEqual(resolveGraphicBounds(program), {
    x: 80,
    y: 30,
    width: 690,
    height: 400
  });
});

test("rejects duplicate and invalid createCanvas calls", () => {
  const program = chart().createCanvas();

  assert.throws(() => program.createCanvas(), /without a canvas/);
  assert.throws(
    () => chart().createCanvas({ canvasId: "other" }),
    /Unknown createCanvas option/
  );
  assert.throws(
    () => chart().createCanvas({ width: -1 }),
    /width must be a positive integer/
  );
  assert.throws(
    () => chart().createCanvas({ margin: { left: 610 } }),
    /horizontal margins/
  );
});
