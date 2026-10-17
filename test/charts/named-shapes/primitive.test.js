import assert from "node:assert/strict";
import test from "node:test";
import { createNamedShapesPrimitive } from "./primitive.program.js";
import { directionalCommands, signedPolygonArea } from "../../oracles/directional-point-scenes.js";

test("independent named shapes preserve area, centroid and bounds-center without semantic marks", () => {
  const p = createNamedShapesPrimitive();
  assert.deepEqual(p.semanticSpec.layers, []); assert.deepEqual(p.semanticSpec.datasets, []);
  const glyphs = p.graphicSpec.objects.scatterPlot.items;
  assert.deepEqual(glyphs.map(item => item.id), ["scatterPlot:0", "scatterPlot:1", "scatterPlot:2", "scatterPlot:3"]);
  for (const [i, item] of glyphs.entries()) {
    const points = item.properties.commands.filter(command => command.op !== "Z");
    assert.ok(Math.abs(Math.abs(signedPolygonArea(points)) - [100, 225, 100, 225][i]) < 1e-10);
    if (i < 2) {
      assert.ok(Math.abs(points.reduce((sum, point) => sum + point.x, 0) / 3 - [85, 195][i]) < 1e-12);
      assert.equal(points.reduce((sum, point) => sum + point.y, 0) / 3, 100);
    } else {
      assert.equal((Math.min(...points.map(p => p.x)) + Math.max(...points.map(p => p.x))) / 2, [85, 195][i - 2]);
      assert.equal((Math.min(...points.map(p => p.y)) + Math.max(...points.map(p => p.y))) / 2, 180);
    }
  }
  assert.deepEqual(directionalCommands("wedge", 100, 0, 85, 100)[0], {op:"M",x:85,y:82.45234649396677});
  assert.deepEqual(directionalCommands("arrow", 225, 90, 195, 180)[4], {op:"L",x:213.30591114855318,y:180});
});
