import assert from "node:assert/strict";
import test from "node:test";
import { createPyramidPrimitive } from "./primitive.program.js";

test("ordered-stage primitives preserve literal area ratios and complete wrapped labels", () => {
  const program = createPyramidPrimitive("area");
  assert.deepEqual(program.semanticSpec.layers, []);
  const items = program.graphicSpec.objects.pyramid.items;
  assert.deepEqual(items.map(item => item.type), ["path", "text", "path", "text", "path", "text"]);
  const areas = items.filter(item => item.type === "path").map(item => {
    const vertices = item.properties.commands.filter(command => command.op !== "Z");
    return Math.abs(vertices.reduce((sum, point, i) => {
      const next = vertices[(i + 1) % vertices.length];
      return sum + point.x * next.y - next.x * point.y;
    }, 0)) / 2;
  });
  for (const [index, expected] of [24300, 14580, 4860].entries()) assert.ok(Math.abs(areas[index] - expected) < 1e-8);
  assert.equal(items.at(-1).properties.lines.map(line => line.text).join(""), "Returned");
  assert.deepEqual(program.graphicSpec.objects.pyramid.clip, { x: 60, y: 60, width: 300, height: 270 });
});
