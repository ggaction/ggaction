import assert from "node:assert/strict";
import test from "node:test";

import { chart } from "../../src/index.js";

function histogram() {
  return chart()
    .createCanvas({
      width: 432,
      height: 460,
      margin: { top: 80, right: 60, bottom: 130, left: 80 }
    })
    .createData({
      id: "cars",
      values: [
        { displacement: 60 },
        { displacement: 100 },
        { displacement: 200 },
        { displacement: 480 }
      ]
    })
    .createBarMark({ id: "bars" })
    .encodeHistogram({ field: "displacement", maxBins: 10 });
}

test("creates inferred histogram axes with bin-boundary ticks", () => {
  const program = histogram().createAxes();

  assert.deepEqual(program.semanticSpec.guides.axis, {
    x: {
      coordinate: "main",
      scale: "x",
      title: "displacement"
    },
    y: {
      coordinate: "main",
      scale: "y",
      title: "count(displacement)"
    }
  });
  assert.deepEqual(
    program.graphicSpec.objects.xAxisLabels.children.map(
      child => child.properties.text
    ),
    ["50", "100", "150", "200", "250", "300", "350", "400", "450", "500"]
  );
  assert.deepEqual(
    program.trace.children.at(-1).children.map(child => child.op),
    ["createXAxis", "createYAxis"]
  );
});

test("keeps explicit histogram tick values ahead of bin inference", () => {
  const program = histogram().createAxes({
    x: { ticksAndLabels: { values: [100, 300, 500] } }
  });

  assert.deepEqual(
    program.graphicSpec.objects.xAxisLabels.children.map(
      child => child.properties.text
    ),
    ["100", "300", "500"]
  );
});

test("rematerializes inferred histogram axes after Canvas edits", () => {
  const before = histogram().createAxes();
  const after = before.editCanvas({ width: 500, margin: 30 });

  assert.notEqual(
    after.graphicSpec.objects.xAxisTicks.children.at(-1).properties.x1,
    before.graphicSpec.objects.xAxisTicks.children.at(-1).properties.x1
  );
  assert.deepEqual(
    after.graphicSpec.objects.xAxisLabels.children.map(
      child => child.properties.text
    ),
    before.graphicSpec.objects.xAxisLabels.children.map(
      child => child.properties.text
    )
  );
  assert.equal(before.graphicSpec.objects.canvas.properties.width, 432);
});
