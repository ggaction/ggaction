import assert from "node:assert/strict";
import test from "node:test";
import { renderToSVG } from "../../../src/renderers/svg.js";
import { createGraphPrimitive } from "./primitive.program.js";
import { variants } from "./reference-values.js";

for (const variant of variants) test(`graph primitive ${variant.id} keeps explicit routes, circles and labels`, () => {
  const program = createGraphPrimitive(variant.id), objects = program.graphicSpec.objects;
  const items = objects.network.items;
  assert.deepEqual(items.filter(item => item.type === "path").map(item => item.properties.commands), variant.paths);
  assert.deepEqual(items.filter(item => item.type === "circle").map(item => [item.properties.x, item.properties.y]), variant.positions.map(node => [node.x, node.y]));
  assert.deepEqual(items.filter(item => item.type === "text").map(item => item.properties.text), variant.positions.map(node => node.key));
  assert.deepEqual(items.map(item => item.type), [...variant.paths.map(() => "path"), ...variant.nodes.map(() => "circle"), ...variant.nodes.map(() => "text")]);
  const svg = renderToSVG(program);
  assert.equal((svg.match(/<circle\b/g) ?? []).length, variant.nodes.length);
  assert.equal((svg.match(/<path\b/g) ?? []).length, variant.paths.length);
});
test("graph primitive rejects an unknown variant", () => assert.throws(() => createGraphPrimitive("unknown")));
