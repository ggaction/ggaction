import assert from "node:assert/strict";
import test from "node:test";
import { overlayPrimitive, adjacentPrimitive, rows } from "./primitive.program.js";

test("overlay reference has independent bar and line layers with shared position scales", () => {
  const program = overlayPrimitive();
  const [bars, line] = program.semanticSpec.layers;
  assert.equal(bars.mark.type, "bar");
  assert.equal(line.mark.type, "line");
  assert.equal(line.encoding.x.scale, bars.encoding.x.scale);
  assert.equal(line.encoding.y.scale, bars.encoding.y.scale);
  assert.deepEqual(program.resolvedScales[bars.encoding.y.scale].domain, [0, 80]);
  assert.deepEqual(rows.map(row => row.sales), [20, 45, 30, 65]);
  assert.deepEqual(program.graphicSpec.objects.trend.items[0].properties.commands,
    [{ op: "M", x: 105, y: 235 }, { op: "L", x: 185, y: 160 },
      { op: "L", x: 265, y: 205 }, { op: "L", x: 345, y: 100 }]);
  for (const [index, item] of program.graphicSpec.objects.bars.items.entries()) {
    const point = program.graphicSpec.objects.trend.items[0].properties.commands[index];
    assert.equal(item.properties.x + item.properties.width / 2, point.x);
    assert.equal(item.properties.y, point.y);
  }
});

test("adjacent reference keeps both plots aligned and uses one Y domain", () => {
  const program = adjacentPrimitive();
  assert.deepEqual(program.compositionSpec.children, ["bars", "trend"]);
  for (const child of Object.values(program.children)) {
    const layer = child.semanticSpec.layers[0];
    assert.deepEqual(child.resolvedScales[layer.encoding.y.scale].domain, [0, 80]);
    assert.deepEqual(child.resolvedScales[layer.encoding.y.scale].range, [295, 55]);
  }
});
