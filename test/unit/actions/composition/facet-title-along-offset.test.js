import assert from "node:assert/strict";
import test from "node:test";
import { chart } from "../../../../src/index.js";
import { serializeProgram, deserializeProgram } from "../../../../src/persistence.js";

function unit() {
  return chart().createCanvas({ width: 400, height: 300, margin: 100 })
    .createData({ values: [
      { group: "A", row: "R", x: 1, y: 2 },
      { group: "B", row: "R", x: 3, y: 4 }
    ] }).createScatterPlot({ x: "x", y: "y", guides: false });
}
const options = { text: "Header\nDetail", subtitle: "Notes\nMore", titleStyle: { fontSize: 12 } };
function properties(program, id) {
  const graphic = program.graphicSpec.objects[id];
  return (graphic.items ?? [graphic]).map(item => item.properties);
}
function assertShift(before, after, distance) {
  for (const id of ["chartTitle", "chartSubtitle"]) {
    assert.deepEqual(properties(after, id), properties(before, id).map(p => ({ ...p, x: p.x + distance })));
  }
  const withoutTitles = graphic => ({ ...graphic, objects: Object.fromEntries(
    Object.entries(graphic.objects).filter(([id]) => !["chartTitle", "chartSubtitle"].includes(id))
  ) });
  assert.deepEqual(withoutTitles(after.graphicSpec), withoutTitles(before.graphicSpec));
  assert.deepEqual(after.semanticSpec, before.semanticSpec);
  assert.deepEqual(Object.values(after.children).map(p => [p.semanticSpec, p.graphicSpec, p.resolvedScales]),
    Object.values(before.children).map(p => [p.semanticSpec, p.graphicSpec, p.resolvedScales]));
}

test("facet parent title and subtitle move together for every alignment and signed offset", () => {
  for (const align of ["left", "center", "right"]) for (const distance of [0, 12]) {
    const before = unit().facet({ field: "group" }).createTitle({ ...options, align, alongOffset: align === "right" ? -20 : 20 });
    const saved = serializeProgram(before);
    const after = before.editTitle({ alongOffset: before.titleConfig.alongOffset + (align === "right" ? -distance : distance) });
    assertShift(before, after, align === "right" ? -distance : distance);
    assert.equal(serializeProgram(before), saved);
    assert.deepEqual(after.editTitle({ alongOffset: before.titleConfig.alongOffset }).graphicSpec, before.graphicSpec);
    assert.deepEqual(deserializeProgram(serializeProgram(after)).graphicSpec, after.graphicSpec);
  }
});

test("creation, later edits, and promotion of an existing title converge", () => {
  const source = unit(), facetOptions = { field: "group", columns: 2 };
  const created = source.facet(facetOptions).createTitle({ ...options, alongOffset: 10 });
  const edited = source.facet(facetOptions).createTitle(options).editTitle({ alongOffset: 10 });
  const promoted = source.createTitle({ ...options, alongOffset: 10 }).facet(facetOptions);
  assert.deepEqual(created.graphicSpec, edited.graphicSpec);
  assert.deepEqual(created.graphicSpec, promoted.graphicSpec);
});

test("grouped row/column headers and side header replay retain the title displacement", () => {
  const base = unit().facetGrid({ rows: { field: "row" }, columns: { field: "group" } })
    .editFacetHeaders({ role: "row", side: "left" })
    .editFacetHeaders({ role: "column", side: "bottom" }).createTitle(options);
  for (const rematerialize of [
    p => p.editCompositionLayout({ gap: 30 }),
    p => p.editFacetHeaders({ role: "column", side: "top" }),
    p => p.editFacetScales({ x: "independent" }),
    p => p.editFacetGuides({ axes: "outer" })
  ]) {
    const expected = rematerialize(base), shifted = rematerialize(base.editTitle({ alongOffset: 9 }));
    assertShift(expected, shifted, 9);
  }
});

test("unit title resolution stays unchanged and invalid facet offsets fail atomically", () => {
  const source = unit().createTitle(options), shifted = source.editTitle({ alongOffset: 7 });
  assertShift(source, shifted, 7);
  const facet = unit().facet({ field: "group" }).createTitle(options), saved = serializeProgram(facet);
  for (const alongOffset of [NaN, Infinity, -Infinity, "7"]) {
    assert.throws(() => facet.editTitle({ alongOffset }), /finite number/);
  }
  for (const alongOffset of [-10000, 10000]) assert.throws(() => facet.editTitle({ alongOffset }), /outside the Canvas/);
  assert.equal(serializeProgram(facet), saved);
});
