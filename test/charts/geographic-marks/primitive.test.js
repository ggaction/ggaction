import assert from "node:assert/strict";
import test from "node:test";
import { createGeographicPrimitive } from "./primitive.program.js";

test("geographic primitives retain two polygon rings, literal stops and an open service path", () => {
  const program = createGeographicPrimitive();
  assert.deepEqual(program.semanticSpec.layers, []);
  const region = program.graphicSpec.objects.regions.items[0].properties;
  assert.equal(region.fillRule, "evenodd");
  assert.equal(region.commands.filter(command => command.op === "M").length, 2);
  assert.equal(region.commands.filter(command => command.op === "Z").length, 2);
  assert.deepEqual(program.graphicSpec.objects.cities.items.map(item => [item.properties.x, item.properties.y, item.properties.radius]), [[120, 130, 8], [400, 220, 8], [520, 330, 8]]);
  assert.deepEqual(program.graphicSpec.objects.routes.items[0].properties.commands.map(command => command.op), ["M", "L", "L"]);
});

test("graticule primitives use the independent four-pixels-per-degree projection", () => {
  const program = createGeographicPrimitive("graticule");
  assert.deepEqual(program.semanticSpec.layers, []);
  const lines = program.graphicSpec.objects.grid.items;
  assert.equal(lines.length, 6);
  const first = lines[0].properties.commands[0], last = lines[0].properties.commands.at(-1);
  for (const [actual, expected] of [[first.x, 160], [first.y, 320], [last.x, 160], [last.y, 160]]) assert.ok(Math.abs(actual - expected) < 1e-10);
  assert.equal(lines[0].properties.commands.length, 9);
  assert.equal(lines.at(-1).properties.commands.length, 17);
});
