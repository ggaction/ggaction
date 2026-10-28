import assert from "node:assert/strict";
import test from "node:test";
import { renderToSVG } from "../../../src/renderers/svg.js";
import { normalizeHierarchyInput } from "../../../src/grammar/hierarchy/input.js";
import { layoutHierarchyTreemap } from "../../../src/grammar/hierarchy/treemap.js";
import { createTreemapPrimitive } from "./primitive.program.js";
import { variants, rows, labels, offset } from "./reference-values.js";

for (const variant of variants) test(`treemap primitive ${variant.id} preserves nested rectangles and independent value proportions`, () => {
  const model = normalizeHierarchyInput(rows, { format: "flat", key: "id", parent: "parent", value: "value" });
  const result = layoutHierarchyTreemap(model, variant.options);
  result.nodes.forEach((node, index) => {
    ["x0", "y0", "x1", "y1"].forEach((key, coordinate) => assert.ok(Math.abs(node.rect[key] - variant.rectangles[index][coordinate]) < 1e-10));
  });
  const program = createTreemapPrimitive(variant.id), objects = program.graphicSpec.objects;
  assert.equal(objects.cells.items.length, 5);
  assert.deepEqual(objects.cells.items.map(item => item.properties.x), variant.rectangles.map(box => box[0] + offset[0]));
  assert.deepEqual(objects.cells.items.map(item => item.properties.y), variant.rectangles.map(box => box[1] + offset[1]));
  assert.deepEqual(objects.cells.items.map(item => item.properties.width), variant.rectangles.map(box => box[2] - box[0]));
  assert.deepEqual(objects.cells.items.map(item => item.properties.height), variant.rectangles.map(box => box[3] - box[1]));
  assert.deepEqual(objects.labels.items.map(item => item.properties.text), labels);
  assert.deepEqual(objects.labels.items.map(item => item.properties.x), variant.labelPositions.map(point => point[0] + offset[0]));
  assert.deepEqual(objects.labels.items.map(item => item.properties.y), variant.labelPositions.map(point => point[1] + offset[1]));
  const area = box => (box[2] - box[0]) * (box[3] - box[1]);
  assert.ok(Math.abs(area(variant.rectangles[2]) / area(variant.rectangles[3]) - 0.5) < 1e-12);
  assert.ok(objects["plot-main"].children.indexOf("cells") < objects["plot-main"].children.indexOf("labels"));
  const svg = renderToSVG(program);
  assert.ok((svg.match(/<rect\b/g) ?? []).length >= 5);
  assert.ok(svg.includes("A1 · 2") && svg.includes("A2 · 4") && svg.includes("B · 4"));
});

test("treemap primitive factory rejects unknown variants", () => assert.throws(() => createTreemapPrimitive("unknown")));
