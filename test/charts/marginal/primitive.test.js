import test from "node:test";
import assert from "node:assert/strict";
import { xCounts, yCounts, xRects, yRects, points } from "./reference-values.js";
test("Marginal literal bins conserve source counts and align each dimension", () => {
  assert.equal(xCounts.reduce((a,b) => a+b), 6); assert.equal(yCounts.reduce((a,b) => a+b), 6);
  assert.deepEqual(xRects.map(item => item.properties.x), [40,92,144,196,248]);
  assert.deepEqual(yRects.map(item => item.properties.y), [196,152,108,64,20]);
  assert.equal(points.length, 6); assert.equal(points[0].properties.x, points[1].properties.x);
  assert.equal(points[2].properties.y, points[3].properties.y);
});
