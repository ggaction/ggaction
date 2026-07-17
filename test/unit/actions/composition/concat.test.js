import assert from "node:assert/strict";
import test from "node:test";

import { chart, hconcat, render, vconcat } from
  "../../../../src/index.js";
import { createMockCanvasContext, findCanvasCalls } from
  "../../../support/canvas.js";

function child({ width, height, autoWidth = false, autoHeight = false, color }) {
  let program = chart()
    .createCanvas({ width, height, margin: 10 })
    .createGraphics({ id: "dot", type: "circle", parent: "plot-main" })
    .editGraphics({ target: "dot", property: "x", value: 20 })
    .editGraphics({ target: "dot", property: "y", value: 20 })
    .editGraphics({ target: "dot", property: "radius", value: 4 })
    .editGraphics({ target: "dot", property: "fill", value: color });
  if (autoWidth || autoHeight) {
    program = program._withCanvasConfig({
      ...program.materializationConfigs.canvas,
      size: {
        width: autoWidth ? "auto" : "explicit",
        height: autoHeight ? "auto" : "explicit"
      }
    });
  }
  return program;
}

function nestedCanvases(program) {
  return program.graphicSpec.objects.canvas.children.map(
    id => program.graphicSpec.objects[id]
  );
}

test("composes auto-height children horizontally without mutating sources", () => {
  const left = child({
    width: 200,
    height: 120,
    autoHeight: true,
    color: "red"
  });
  const right = child({
    width: 160,
    height: 80,
    autoHeight: true,
    color: "blue"
  });
  const pair = hconcat({
    id: "pair",
    programs: [{ id: "left", program: left }, { id: "right", program: right }]
  });
  const [leftCanvas, rightCanvas] = nestedCanvases(pair);

  assert.deepEqual(pair.compositionSpec, {
    id: "pair",
    direction: "horizontal",
    children: ["left", "right"],
    gap: 16,
    align: "center",
    padding: { top: 0, right: 0, bottom: 0, left: 0 }
  });
  assert.equal(pair.children.left, left);
  assert.equal(pair.children.right, right);
  assert.deepEqual(pair.semanticSpec.layers, []);
  assert.deepEqual(pair.graphicSpec.objects.canvas.properties, {
    width: 376,
    height: 120,
    background: "white"
  });
  assert.deepEqual(leftCanvas.properties, {
    width: 200,
    height: 120,
    background: "white",
    x: 0,
    y: 0
  });
  assert.deepEqual(rightCanvas.properties, {
    width: 160,
    height: 120,
    background: "white",
    x: 216,
    y: 0
  });
  assert.equal(right.graphicSpec.objects.canvas.properties.height, 80);
  assert.equal(Object.isFrozen(pair.children), true);
  assert.deepEqual(pair.trace.children.map(node => node.op), ["hconcat"]);
  assert.deepEqual(pair.trace.children[0].children.map(node => node.op), [
    "useProgram", "useProgram", "materializeComposition"
  ]);
  assert.ok(Object.keys(pair.graphicSpec.objects).every(
    id => /^[A-Za-z0-9_-]+$/.test(id)
  ));
});

test("composes a nested dashboard and renders only the parent graphicSpec", () => {
  const overview = hconcat({
    programs: [
      child({ width: 200, height: 120, autoHeight: true, color: "red" }),
      child({ width: 160, height: 80, autoHeight: true, color: "blue" })
    ]
  });
  const trend = child({
    width: 300,
    height: 100,
    autoWidth: true,
    color: "green"
  });
  const dashboard = vconcat({
    id: "dashboard",
    programs: [
      { id: "overview", program: overview },
      { id: "trend", program: trend }
    ]
  });
  const [, trendCanvas] = nestedCanvases(dashboard);
  const context = createMockCanvasContext();

  assert.deepEqual(dashboard.graphicSpec.objects.canvas.properties, {
    width: 376,
    height: 236,
    background: "white"
  });
  assert.equal(trendCanvas.properties.width, 376);
  assert.deepEqual([trendCanvas.properties.x, trendCanvas.properties.y], [0, 136]);
  render(dashboard, context);
  assert.equal(context.canvas.width, 376);
  assert.equal(context.canvas.height, 236);
  assert.equal(findCanvasCalls(context, "arc").length, 3);
  assert.equal(dashboard.children.overview, overview);
  assert.equal(overview.graphicSpec.objects.canvas.properties.width, 376);
  assert.equal(trend.graphicSpec.objects.canvas.properties.width, 300);
});

test("preserves explicit cross sizes and applies alignment to remaining space", () => {
  const pair = hconcat({
    programs: [
      child({ width: 200, height: 120, color: "red" }),
      child({ width: 160, height: 80, color: "blue" })
    ],
    gap: 8,
    align: "end",
    padding: { top: 3, right: 4, bottom: 5, left: 6 }
  });
  const [, rightCanvas] = nestedCanvases(pair);

  assert.deepEqual(pair.graphicSpec.objects.canvas.properties, {
    width: 378,
    height: 128,
    background: "white"
  });
  assert.equal(rightCanvas.properties.y, 43);
  assert.equal(rightCanvas.properties.height, 80);
});

test("validates every child before creating composition state", () => {
  const complete = child({ width: 200, height: 120, color: "red" });
  assert.throws(() => hconcat({ programs: [complete] }), /at least two programs/);
  assert.throws(
    () => hconcat({
      programs: [
        { id: "same", program: complete },
        { id: "same", program: complete }
      ]
    }),
    /must be unique/
  );
  assert.throws(
    () => hconcat({ programs: [complete, chart()] }),
    /exactly one ordered canvas/
  );
  assert.throws(
    () => vconcat({ programs: [complete, complete], padding: { inline: 2 } }),
    /Unknown composition padding/
  );
  assert.throws(
    () => hconcat({ programs: [complete, complete], color: "red" }),
    /Unknown hconcat option/
  );
  assert.equal(complete.compositionSpec, undefined);
});
