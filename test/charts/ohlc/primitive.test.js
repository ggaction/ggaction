import assert from "node:assert/strict";
import test from "node:test";
import { createOHLCPrimitive } from "./primitive.program.js";

test("price primitives preserve literal high-low spans, body heights and a flat doji", () => {
  const program = createOHLCPrimitive();
  assert.deepEqual(program.semanticSpec.layers, []);
  const items = program.graphicSpec.objects.ohlc.items;
  assert.deepEqual(items.map(item => item.type), ["line", "rect", "line", "rect", "line", "line"]);
  assert.deepEqual([items[0].properties.y1, items[0].properties.y2], [240, 80]);
  assert.deepEqual([items[1].properties.width, items[1].properties.height, items[3].properties.height], [32, 80, 40]);
  assert.deepEqual([items[5].properties.y1, items[5].properties.y2], [160, 160]);
  assert.equal(createOHLCPrimitive("no-doji").graphicSpec.objects.ohlc.items.length, 5);
  assert.deepEqual(createOHLCPrimitive("labels").graphicSpec.objects.ohlc.items.filter(item => item.type === "text").map(item => item.properties.text), ["7", "4", "5"]);
});
