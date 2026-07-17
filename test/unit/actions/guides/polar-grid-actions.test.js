import { graphicDrawOrder } from "../../../support/graphic-tree.js";
import assert from "node:assert/strict";
import test from "node:test";

import { chart } from "../../../../src/index.js";

function polarProgram() {
  return chart()
    .createCanvas({ width: 300, height: 300, margin: 30 })
    .createData({ values: [
      { a: 0, r: 0 },
      { a: 10, r: 20 }
    ] })
    .createPointMark()
    .encodeTheta({ field: "a" })
    .encodeR({ field: "r", scale: { zero: true } });
}

test("creates Polar spoke and concentric-circle grids behind marks", () => {
  const base = polarProgram();
  const program = base.createGrid({
    theta: { values: [0, 10] },
    radial: { values: [0, 10, 20] }
  });

  assert.deepEqual(program.semanticSpec.guides.grid, {
    theta: { scale: "theta", coordinate: "polar" },
    radial: { scale: "radius", coordinate: "polar" }
  });
  assert.equal(program.graphicSpec.objects.thetaGridLines.items.length, 2);
  assert.equal(program.graphicSpec.objects.radialGridCircles.items.length, 2);
  assert.equal(
    program.graphicSpec.objects.radialGridCircles.items.every(item =>
      item.properties.commands.at(-1).op === "Z"
    ),
    true
  );
  const order = graphicDrawOrder(program);
  assert.equal(order.indexOf("thetaGridLines") < order.indexOf("point"), true);
  assert.equal(order.indexOf("radialGridCircles") < order.indexOf("point"), true);
  assert.deepEqual(
    program.trace.children.at(-1).children.map(child => child.op),
    ["createThetaGrid", "createRadialGrid"]
  );
  assert.equal(base.semanticSpec.guides.grid, undefined);
});

test("edits Polar grid ticks and appearance through focused actions", () => {
  const created = polarProgram().createGrid();
  const edited = created
    .editThetaGrid({ count: 3, color: "#111827", strokeDash: [2, 2] })
    .editRadialGrid({ values: [0, 20], lineWidth: 2 });

  assert.equal(edited.guideConfigs.grid.theta.count, 3);
  assert.equal(edited.guideConfigs.grid.theta.color, "#111827");
  assert.equal(edited.guideConfigs.grid.radial.inferredValues, false);
  assert.equal(edited.graphicSpec.objects.radialGridCircles.items.length, 1);
  assert.equal(edited.graphicSpec.objects.radialGridCircles.items[0]
    .properties.strokeWidth, 2);
  assert.notEqual(edited.graphicSpec, created.graphicSpec);
});

test("rematerializes Polar grids after Canvas and scale edits", () => {
  const created = polarProgram().createGrid({
    theta: { values: [0, 10] },
    radial: { values: [0, 20] }
  });
  const beforeRadius = created.graphicSpec.objects.radialGridCircles
    .items[0].properties.commands[0].x;
  const resized = created.editCanvas({ width: 400, height: 400 });
  const afterRadius = resized.graphicSpec.objects.radialGridCircles
    .items[0].properties.commands[0].x;
  const reversed = resized.editScale({ id: "theta", reverse: true });

  assert.notEqual(afterRadius, beforeRadius);
  assert.notDeepEqual(
    reversed.graphicSpec.objects.thetaGridLines,
    resized.graphicSpec.objects.thetaGridLines
  );
});

test("validates Polar grid ownership and option conflicts atomically", () => {
  const base = polarProgram();
  assert.throws(
    () => base.createThetaGrid({ count: 3, values: [0] }),
    /cannot use count and values together/
  );
  assert.throws(
    () => base.createRadialGrid({ values: [100] }),
    /inside the scale domain/
  );
  assert.equal(base.semanticSpec.guides.grid, undefined);
  assert.equal(base.graphicSpec.objects.thetaGridLines, undefined);
});
