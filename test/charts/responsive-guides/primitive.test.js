import assert from "node:assert/strict";
import test from "node:test";
import { createResponsiveGuidesPrimitive } from "./primitive.program.js";

test("literal responsive bars retain the measured plot, wrapped labels and uniform count geometry", () => {
  const p = createResponsiveGuidesPrimitive();
  assert.deepEqual(p.semanticSpec.layers, []);
  assert.deepEqual(p.graphicSpec.objects.canvas.properties, { width: 400, height: 320, background: "white" });
  const bars = p.graphicSpec.objects.barPlot.items;
  assert.equal(bars.length, 4);
  for (let i = 0; i < bars.length; i++) {
    const box = bars[i].properties;
    assert.equal(box.x + box.width / 2, 58.5 + (i + 0.5) * 321.5 / 4);
    assert.equal(box.height, (i + 1) * 238.5 / 4);
  }
  assert.equal(p.graphicSpec.objects.xAxisLabels.items.length, 8);
});
