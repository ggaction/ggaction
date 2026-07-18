import assert from "node:assert/strict";
import test from "node:test";

import { chart, hconcat, render } from "../../../../src/index.js";
import { createMockCanvasContext, findCanvasCalls } from
  "../../../support/canvas.js";

const rows = Object.freeze([
  Object.freeze({ x: 10, y: 30, group: "A", category: 4 }),
  Object.freeze({ x: 20, y: 20, group: "B", category: 6 }),
  Object.freeze({ x: 30, y: 10, group: "A", category: 8 }),
  Object.freeze({ x: 40, y: 40, group: "B", category: 4 })
]);

function pointBase() {
  return chart()
    .createCanvas({ width: 220, height: 160, margin: 20 })
    .createData({ values: rows })
    .createPointMark()
    .encodeX({ field: "x", scale: { nice: false, zero: false } })
    .encodeY({ field: "y", scale: { nice: false, zero: false } })
    .encodeRadius({ value: 3 })
    .encodeColor({ field: "category", fieldType: "ordinal" });
}

function facetCanvasChildren(program) {
  return program.graphicSpec.objects.canvas.children.map(
    id => program.graphicSpec.objects[id]
  );
}

test("facets one direct-source point chart into immutable shared-scale children", () => {
  const base = pointBase();
  const faceted = base.facet({
    field: "group",
    guides: { legend: "shared" }
  });

  assert.deepEqual(faceted.compositionSpec, {
    id: "facet",
    type: "facet",
    children: ["facet-cell-1", "facet-cell-2"],
    columns: 2,
    gap: 16,
    align: "center",
    padding: { top: 0, right: 0, bottom: 0, left: 0 },
    facet: {
      data: "data",
      field: "group",
      values: ["A", "B"],
      scales: "shared",
      guides: { axes: "each", legend: "shared" }
    }
  });
  assert.equal(base.compositionSpec, undefined);
  assert.equal(base.graphicSpec.objects.point.items.length, 4);
  assert.deepEqual(Object.values(faceted.children).map(child =>
    child.graphicSpec.objects.point.items.length
  ), [2, 2]);
  for (const child of Object.values(faceted.children)) {
    assert.deepEqual(child.resolvedScales.x.domain, [10, 40]);
    assert.deepEqual(child.resolvedScales.y.domain, [10, 40]);
    assert.deepEqual(child.resolvedScales.color.domain, [4, 6, 8]);
    assert.equal(child.actionStack.length, 0);
  }
  assert.equal(faceted.actionStack.length, 0);
  assert.deepEqual(facetCanvasChildren(faceted).slice(-2).map(graphic =>
    graphic.type
  ), ["collection", "collection"]);
  assert.deepEqual(
    faceted.graphicSpec.objects["facet-headers"].items.map(item =>
      item.properties.text
    ),
    ["A", "B"]
  );
  assert.deepEqual(
    faceted.graphicSpec.objects["facet-legend"].items.filter(
      item => item.type === "text"
    ).map(item => item.properties.text),
    ["category", "4", "6", "8"]
  );

  const facetTrace = faceted.trace.children.at(-1);
  assert.equal(facetTrace.op, "facet");
  assert.deepEqual(facetTrace.children.map(node => node.op), [
    "useProgram", "useProgram", "materializeComposition"
  ]);
  const childOps = faceted.children["facet-cell-1"].trace.children.at(-1)
    .children.map(node => node.op);
  assert.ok(childOps.includes("filterData"));
  assert.ok(childOps.includes("editSemantic"));
  assert.ok(childOps.includes("rematerializePointMark"));
});

test("renders only the materialized parent facet graphic tree", () => {
  const faceted = pointBase().facet({ field: "group" });
  const context = createMockCanvasContext();

  render(faceted, context);

  assert.equal(context.canvas.width, 456);
  assert.equal(context.canvas.height, 160);
  assert.equal(findCanvasCalls(context, "arc").length, 4);
});

test("creates, edits, and removes one parent-owned facet title", () => {
  const faceted = pointBase()
    .facet({ field: "group" })
    .createTitle({ text: "Grouped points", subtitle: "A and B" });
  const originalHeight = faceted.graphicSpec.objects.canvas.properties.height;

  assert.equal(faceted.semanticSpec.title.text, "Grouped points");
  assert.equal(faceted.graphicSpec.objects.chartTitle.type, "text");
  assert.equal(faceted.graphicSpec.objects.chartSubtitle.type, "text");
  assert.equal(Object.values(faceted.children).some(child =>
    child.graphicSpec.objects.chartTitle !== undefined
  ), false);

  const edited = faceted.editTitle({ text: "Edited title", subtitle: false });
  assert.equal(edited.graphicSpec.objects.chartTitle.properties.text, "Edited title");
  assert.equal(edited.graphicSpec.objects.chartSubtitle, undefined);
  assert.equal(faceted.semanticSpec.title.text, "Grouped points");

  const removed = edited.removeTitle();
  assert.deepEqual(removed.semanticSpec.title, {});
  assert.equal(removed.titleConfig, undefined);
  assert.equal(removed.graphicSpec.objects.chartTitle, undefined);
  assert.ok(removed.graphicSpec.objects.canvas.properties.height < originalHeight);
});

test("promotes an existing unit title to the facet parent", () => {
  const base = pointBase()
    .editCanvas({ margin: { top: 60 } })
    .createTitle({
    text: "Existing title",
    subtitle: "Promoted once"
  });
  const faceted = base.facet({ field: "group" });

  assert.equal(faceted.semanticSpec.title.text, "Existing title");
  assert.equal(faceted.graphicSpec.objects.chartTitle.properties.text, "Existing title");
  for (const child of Object.values(faceted.children)) {
    assert.deepEqual(child.semanticSpec.title, {});
    assert.equal(child.graphicSpec.objects.chartTitle, undefined);
  }
  assert.equal(base.graphicSpec.objects.chartTitle.properties.text, "Existing title");
});

test("edits facet headers and layout without changing retained children", () => {
  const faceted = pointBase().facet({
    field: "group",
    columns: 1,
    padding: 4
  });
  const children = faceted.children;
  const edited = faceted
    .editFacetHeaders({ fontSize: 14, color: "#123456", offset: 7 })
    .editCompositionLayout({
      gap: 8,
      align: "end",
      padding: { left: 10 }
    });

  assert.equal(edited.children, children);
  assert.equal(edited.compositionSpec.gap, 8);
  assert.equal(edited.compositionSpec.align, "end");
  assert.deepEqual(edited.compositionSpec.padding, {
    top: 4, right: 4, bottom: 4, left: 10
  });
  assert.deepEqual(edited.graphicSpec.objects["facet-headers"].items.map(item => ({
    fontSize: item.properties.fontSize,
    fill: item.properties.fill,
    y: item.properties.y
  })), [
    { fontSize: 14, fill: "#123456", y: 11 },
    { fontSize: 14, fill: "#123456", y: 179 }
  ]);
  assert.equal(faceted.compositionSpec.gap, 16);
});

test("validates facet scope, sources, guides, and structural edits atomically", () => {
  const base = pointBase();
  const graphics = base.graphicSpec;
  const trace = base.trace;

  assert.throws(() => base.facet(), /non-empty field/);
  assert.throws(
    () => base.facet({ field: "missing" }),
    /Field "missing" must contain a nominal value/
  );
  assert.throws(
    () => base.facet({ field: "group", guides: { legend: true } }),
    /false or "shared"/
  );
  assert.throws(
    () => base.facet({ field: "group", columns: 0 }),
    /positive integer/
  );
  assert.equal(base.graphicSpec, graphics);
  assert.equal(base.trace, trace);

  const faceted = base.facet({ field: "group" });
  assert.throws(
    () => faceted.replaceCompositionChild({
      target: "facet-cell-1",
      program: base
    }),
    /not available on a facet/
  );
  assert.throws(
    () => faceted.editFacetHeaders(),
    /requires at least one change/
  );
  assert.throws(
    () => hconcat({ programs: [base, base] }).createTitle({ text: "No" }),
    /not available on this composition/
  );
});
