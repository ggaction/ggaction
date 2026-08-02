import assert from "node:assert/strict";
import test from "node:test";

import { createDirectionalTickPointPrimitives } from "./primitive.program.js";
import { DIRECTION_LAYOUT } from "./reference-values.js";

test("authors the three-panel directional target without future actions", () => {
  const program = createDirectionalTickPointPrimitives();

  assert.deepEqual(Object.keys(program.children), [
    "baseline", "directionalTicks", "directionalPoints"
  ]);
  assert.equal(program.children.baseline.graphicSpec.objects.ticks.items.length, 8);
  assert.equal(program.children.directionalTicks.graphicSpec.objects.ticks.items.length, 8);
  assert.equal(program.children.directionalPoints.graphicSpec.objects.points.items.length, 8);
  for (const child of Object.values(program.children)) {
    assert.deepEqual(child.semanticSpec.datasets[0].values.map(row => row.direction), [
      0, 45, 90, 135, 180, 225, 270, 315
    ]);
    assert.equal(
      child.trace.children.some(node =>
        ["createTickMark", "encodeAngle"].includes(node.op)
      ),
      false
    );
  }
  assert.deepEqual(
    program.graphicSpec.objects.canvas.properties,
    { width: 1072, height: 372, background: "white" }
  );
  assert.equal(DIRECTION_LAYOUT.tickLength, 26);
});
