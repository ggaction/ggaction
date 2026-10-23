import test from "node:test";
import assert from "node:assert/strict";
import { createLinearNearestTicksPrimitives } from "./primitive.program.js";

test("literal axis uses eight ticks at 20-unit spacing without changing the plot", () => {
  const p = createLinearNearestTicksPrimitives();
  const labels = p.graphicSpec.objects.yAxisLabels.items;
  assert.deepEqual(labels.map(item => item.properties.text), ["0", "20", "40", "60", "80", "100", "120", "140"]);
  assert.deepEqual(p.graphicSpec.objects.linePlot.items[0].properties.commands,
    [{ op: "M", x: 40, y: 140 }, { op: "L", x: 240, y: 26 }]);
  assert.equal(labels[0].properties.y, 140);
  assert.equal(labels.at(-1).properties.y, 20);
  assert(Object.isFrozen(labels));
});
