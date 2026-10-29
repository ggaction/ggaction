import test from "node:test";
import assert from "node:assert/strict";
import { createBulletPrimitive } from "./primitive.program.js";
test("Bullet literal reference extents, measure and target share a 0 to 100 axis", () => {
  const objects = createBulletPrimitive().graphicSpec.objects;
  assert.equal(objects.ranges.items.reduce((sum,item) => sum+item.properties.width, 0), 300);
  assert.equal(objects.measure.items[0].properties.width / 3, 65);
  assert.equal((objects.target.items[0].properties.x1 - 30) / 3, 80);
  assert.deepEqual(objects["plot-main"].children, ["ranges","measure","target","measure-label"]);
});
