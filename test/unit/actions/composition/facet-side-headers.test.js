import assert from "node:assert/strict";
import test from "node:test";
import { chart } from "../../../../src/index.js";
import { serializeProgram, deserializeProgram } from "../../../../src/persistence.js";
import { resolveFacetProgramLayout } from "../../../../src/materialization/facets.js";
import { resolveTextBounds, textBoundsIntersect } from "../../../../src/core/textMetrics.js";
import { renderToSVG } from "../../../../src/renderers/svg.js";

const rows = ["Alpha", "Longer category", "C", "Delta", "Last category"].map((group, i) => ({ group, k: "value", v: i + 1 }));
function source(values = rows) {
  return chart().createCanvas({ width: 180, height: 160, margin: 35 })
    .createData({ values }).createBarPlot({ x: "k", y: "v", guides: false });
}
function assertSide(program, side) {
  const { layout, plots } = resolveFacetProgramLayout(program);
  const headers = program.graphicSpec.objects[`${program.compositionSpec.id}-headers`].items;
  assert.equal(headers.length, rows.length);
  const boxes = layout.children.map(cell => ({ left: cell.x, right: cell.x + cell.width, top: cell.y, bottom: cell.y + cell.height }));
  const textBoxes = [];
  for (let i = 0; i < headers.length; i++) {
    const p = headers[i].properties, cell = layout.children[i], plot = plots[i];
    const b = resolveTextBounds(p);
    assert.equal(p.text, rows[i].group);
    assert.equal(p.textAlign, side === "right" ? "left" : "right");
    assert.equal(p.y, cell.y + plot.y + plot.height / 2);
    assert.ok(side === "right" ? b.left >= boxes[i].right : b.right <= boxes[i].left);
    assert.ok(b.left >= 0 && b.right <= layout.width);
    assert.ok(!boxes.some(box => textBoundsIntersect(b, box)));
    assert.ok(!textBoxes.some(box => textBoundsIntersect(b, box)));
    textBoxes.push(b);
  }
}

test("places one header beside each wrapped facet with zero gaps and padding", () => {
  for (const columns of [1, 2, 5]) for (const side of ["left", "right"]) {
    const original = source().facet({ field: "group", columns, gap: 0, padding: 0 });
    const snapshot = serializeProgram(original);
    const p = original.editFacetHeaders({ role: "column", side, offset: 3 });
    assertSide(p, side);
    assert.equal(p.children, original.children);
    assert.deepEqual(p.compositionSpec.facet.values, original.compositionSpec.facet.values);
    assert.equal(serializeProgram(original), snapshot);
    assertSide(deserializeProgram(serializeProgram(p)), side);
    assert.match(renderToSVG(p), /Longer category/u);
    assertSide(p.editCompositionLayout({ gap: 5 }), side);
    assertSide(p.editFacetSource({ program: source(rows.map(row => ({ ...row, v: row.v * 2 }))) }), side);
  }
});

test("side headers retain shared scales and converge after position and font edits", () => {
  const base = source().createGuides({ axes: { x: { title: false }, y: { title: false, ticksAndLabels: { count: 3 } } }, legend: false }).facet({ field: "group", columns: 2,
    gap: 0, padding: 0, scales: { y: "shared" }, guides: { axes: "outer" } });
  const direct = base.editFacetHeaders({ role: "column", side: "right", fontSize: 18 });
  const edited = base.editFacetHeaders({ role: "column", side: "left" })
    .editFacetHeaders({ role: "column", side: "right", fontSize: 18 });
  assert.deepEqual(edited.graphicSpec, direct.graphicSpec);
  assertSide(direct, "right");
  const hidden = direct.editFacetHeaders({ role: "column", labelMap: rows.map(row => ({ value: row.group, label: "" })) });
  assert.ok(hidden.graphicSpec.objects.canvas.properties.width < direct.graphicSpec.objects.canvas.properties.width);
  assert.deepEqual(hidden.compositionSpec.children, direct.compositionSpec.children);
});

test("repeated fields support side headers without altering their domains", () => {
  const original = chart().createCanvas({ width: 200, height: 160, margin: 30 })
    .createData({ values: [{ a: 1, b: 10, y: 2 }, { a: 3, b: 50, y: 4 }] })
    .createScatterPlot({ x: "a", y: "y", guides: false })
    .repeatCharts({ channel: "x", fields: ["a", "b"], gap: 0, padding: 0 });
  for (const side of ["left", "right"]) {
    const p = original.editFacetHeaders({ role: "column", side, offset: 0 });
    const headers = p.graphicSpec.objects[`${p.compositionSpec.id}-headers`].items;
    assert.deepEqual(headers.map(item => item.properties.text), ["a", "b"]);
    assert.equal(p.children, original.children);
    assert.ok(p.graphicSpec.objects.canvas.properties.width > original.graphicSpec.objects.canvas.properties.width);
    assert.match(renderToSVG(p), /<text/u);
  }
});
