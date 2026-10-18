import assert from "node:assert/strict";
import test from "node:test";
import { areaItems, expectedColors } from "./reference-values.js";
import { createContinuousAreaPrimitive } from "./primitive.program.js";

test("anchors nine uniform colors and independent stacked boundary conservation", () => {
  const items = areaItems();
  assert.equal(items.length, 9);
  assert.equal(expectedColors[4], "#000080");
  assert.deepEqual(items[0].properties.commands.map(command => command.y).filter(y => y !== undefined), [200, 200, 200, 191, 182, 191]);
  assert.equal(items.at(-1).properties.commands[4].y, 38);
  for (let i = 0; i < items.length; i++) {
    const { commands, fill, opacity } = items[i].properties;
    assert.equal(fill, expectedColors[i]);
    assert.equal(opacity, 0.7);
    assert.equal(commands.at(-1).op, "Z");
    const [a, b, c, d, e, f] = commands;
    assert.equal(a.y - f.y, 9);
    assert.ok(Math.abs(b.y - e.y - 18) < 1e-12);
    assert.equal(c.y - d.y, 9);
    if (i > 0) {
      const previous = items[i - 1].properties.commands;
      assert.deepEqual([a.y, b.y, c.y], [previous[5].y, previous[4].y, previous[3].y]);
    }
  }
  const primitive = createContinuousAreaPrimitive();
  assert.ok(primitive.trace.children.every(node => ["createGraphics", "editGraphics"].includes(node.op)));
  assert.deepEqual(primitive.graphicSpec.objects.areaPlot.items, items);
});
