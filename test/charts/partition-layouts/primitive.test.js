import assert from "node:assert/strict";
import test from "node:test";
import { createPartitionPrimitive, partitionFixture } from "./primitive.program.js";
import { colors, variants } from "./reference-values.js";
import { expectedCells, expectedRectangle, expectedSector } from "./reference.js";

const near = (actual, expected) => assert.ok(Math.abs(actual - expected) < 1e-9, `${actual} != ${expected}`);

for (const variant of variants) test(`partition primitive ${variant.variant} preserves independent intervals and concrete anchors`, () => {
  const fixture = partitionFixture(variant.variant), cells = expectedCells(variant);
  const program = createPartitionPrimitive(variant.variant), objects = program.graphicSpec.objects;
  const shapes = objects["partition-cells"].items, labels = objects["partition-labels"].items;
  assert.equal(shapes.length, cells.length);
  assert.equal(labels.length, cells.length);
  assert.ok(objects["plot-main"].children.indexOf("partition-cells") < objects["plot-main"].children.indexOf("partition-labels"));
  cells.forEach((cell, index) => {
    const [label, u0, u1, v0, v1] = cell, shape = shapes[index].properties;
    for (const [key, value] of Object.entries({ u0, u1, v0, v1 })) near(fixture.shapes[index].cell[key], value);
    assert.equal(shape.fill, colors[label]);
    const expected = variant.kind === "rectangle" ? expectedRectangle(cell, variant) : expectedSector(cell, variant);
    if (variant.kind === "rectangle") {
      for (const key of ["x", "y", "width", "height"]) near(shape[key], expected[key]);
      near(labels[index].properties.x, expected.x + expected.width / 2);
      near(labels[index].properties.y, expected.y + expected.height / 2);
    } else {
      const angle = (expected.startAngle + expected.endAngle) / 2;
      const radius = (expected.innerRadius + expected.outerRadius) / 2;
      near(labels[index].properties.x, 240 + radius * Math.sin(angle));
      near(labels[index].properties.y, 190 - radius * Math.cos(angle));
      assert.equal(shape.commands[0].op, "M");
      near(shape.commands[0].x, 240 + expected.outerRadius * Math.sin(expected.startAngle));
      near(shape.commands[0].y, 190 - expected.outerRadius * Math.cos(expected.startAngle));
      assert.equal(shape.commands.at(-1).op, "Z");
    }
    assert.ok(labels[index].properties.text.startsWith(label + " "));
  });
});

test("partition primitive rejects an unregistered variant", () => {
  assert.throws(() => createPartitionPrimitive("unknown"), /Unknown partition variant/);
});
