import assert from "node:assert/strict";
import test from "node:test";
import { renderToSVG } from "../../../src/renderers/svg.js";
import { normalizeHierarchyInput } from "../../../src/grammar/hierarchy/input.js";
import { layoutHierarchyTree } from "../../../src/grammar/hierarchy/tree.js";
import { createTreePrimitive } from "./primitive.program.js";
import { variants, rows, labels, parents, children } from "./reference-values.js";

for (const variant of variants) test(`tree primitive ${variant.id} preserves independent node and parent coordinates`, () => {
  const model = normalizeHierarchyInput(rows, { format: "flat", key: "id", parent: "parent", value: "value" });
  const result = layoutHierarchyTree(model, variant.options);
  result.nodes.forEach((node, index) => {
    assert.ok(Math.abs(node.x + variant.translate[0] - variant.positions[index][0]) < 1e-10);
    assert.ok(Math.abs(node.y + variant.translate[1] - variant.positions[index][1]) < 1e-10);
  });
  const program = createTreePrimitive(variant.id), objects = program.graphicSpec.objects;
  assert.deepEqual(objects.nodes.items.map(item => item.properties.x), variant.positions.map(point => point[0]));
  assert.deepEqual(objects.nodes.items.map(item => item.properties.y), variant.positions.map(point => point[1]));
  assert.deepEqual(objects.labels.items.map(item => item.properties.text), labels);
  for (const [property, indexes, coordinate] of [["x1", parents, 0], ["y1", parents, 1], ["x2", children, 0], ["y2", children, 1]]) {
    assert.deepEqual(objects.links.items.map(item => item.properties[property]), indexes.map(index => variant.positions[index][coordinate]));
  }
  assert.deepEqual(objects.labels.items.map(item => item.properties.x), variant.positions.map(point => point[0]));
  assert.deepEqual(objects.labels.items.map(item => item.properties.y), variant.positions.map(point => point[1] + 32));
  assert.ok(objects["plot-main"].children.indexOf("links") < objects["plot-main"].children.indexOf("nodes"));
  const svg = renderToSVG(program);
  assert.equal((svg.match(/<circle\b/g) ?? []).length, 5);
  assert.equal((svg.match(/<line\b/g) ?? []).length, 4);
});

test("tree review factory rejects unknown variants", () => assert.throws(() => createTreePrimitive("unknown")));
