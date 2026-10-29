import assert from "node:assert/strict";
import test from "node:test";
import { createPartition } from "../../../examples/partition-layouts/program.js";
import { createPartitionPrimitive, partitionFixture } from "./primitive.program.js";
import { variants } from "./reference-values.js";
import { expectedCells, expectedRectangle, expectedSector } from "./reference.js";
import { serializeProgram, deserializeProgram } from "../../../src/persistence.js";
import { renderToSVG } from "../../../src/renderers/svg.js";
const flatten = (p, ids) => ids.flatMap(id => { const g = p.graphicSpec.objects[id]; return (g.items ?? [g]).map(item => ({ type: item.type ?? g.type, properties: item.properties })); });
for (const variant of variants) test(`public ${variant.variant} partition preserves primitive order and exact concrete properties`, () => {
  const p = createPartition(variant.variant), primitive = createPartitionPrimitive(variant.variant);
  assert.deepEqual(flatten(p, ["partitionPlot", "chartTitle", "chartSubtitle"]), flatten(primitive, ["partition-cells", "partition-labels", "heading"]));
  const fixture = partitionFixture(variant.variant), cells = expectedCells(variant);
  assert.deepEqual(fixture.shapes.map(shape => shape.label), cells.map(cell => cell[0]));
  fixture.shapes.forEach((shape, index) => {
    const expected = variant.kind === "rectangle" ? expectedRectangle(cells[index], variant) : expectedSector(cells[index], variant);
    for (const key of Object.keys(expected)) assert.ok(Math.abs(shape.geometry[key] - expected[key]) < 1e-9);
  });
  const identities = p.graphicSpec.objects.partitionPlot.items.map(item => JSON.stringify([item.identity.key, item.identity.role]));
  assert.equal(new Set(identities).size, identities.length);
  assert.equal(renderToSVG(deserializeProgram(serializeProgram(p))), renderToSVG(p));
});
