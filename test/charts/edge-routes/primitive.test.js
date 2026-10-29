import assert from "node:assert/strict";
import test from "node:test";
import { createEdgeRoutePrimitive } from "./primitive.program.js";
import { routePaths, routePositions } from "./reference-values.js";

test("edge-route primitive preserves explicit path order, node centers and label roles", () => {
  const { items } = createEdgeRoutePrimitive().graphicSpec.objects.network;
  assert.deepEqual(items.map(item => item.type), ["path", "path", "path", "circle", "circle", "circle", "text", "text", "text"]);
  assert.deepEqual(items.slice(0, 3).map(item => item.properties.commands), routePaths);
  assert.deepEqual(items.slice(3, 6).map(({ properties: p }) => [p.x, p.y, p.radius]), routePositions.map(p => [p.x, p.y, 6]));
  assert.deepEqual(items.slice(6).map(({ properties: p }) => [p.text, p.x, p.y]), routePositions.map(p => [p.key, p.x, p.y + 20]));
});
