import assert from "node:assert/strict";
import test from "node:test";

import { chart, hconcat } from "../../../../src/index.js";
import { renderToSVG } from "../../../../src/renderers/svg.js";
import { namespaceGraphicId } from
  "../../../../src/materialization/compositionSnapshot.js";

const rows = Object.freeze([
  Object.freeze({ x: 0, y: 1, group: "A", category: "u" }),
  Object.freeze({ x: 10, y: 2, group: "A", category: "u" }),
  Object.freeze({ x: 100, y: 3, group: "B", category: "v" }),
  Object.freeze({ x: 110, y: 4, group: "B", category: "v" })
]);

function pointBase(values = rows) {
  return chart()
    .createCanvas({
      width: 300,
      height: 220,
      margin: { top: 30, right: 100, bottom: 50, left: 50 }
    })
    .createData({ id: "source", values })
    .createPointMark({ id: "points" })
    .encodeX({ field: "x", scale: { nice: false, zero: false } })
    .encodeY({ field: "y", scale: { nice: false, zero: false } })
    .encodeColor({ field: "category" })
    .createGuides();
}

test("parent-inferred facet legends stay outside child rederivation", () => {
  for (const fieldType of ["quantitative", "nominal"]) {
    const base = chart().createCanvas({
      width: 280, height: 320,
      margin: { top: 36, right: 18, bottom: 50, left: 58 }
    }).createData({ values: [
      { g: "A", x: 1, y: 1, c: 10 }, { g: "A", x: 2, y: 2, c: 20 },
      { g: "B", x: 3, y: 3, c: 30 }, { g: "B", x: 4, y: 4, c: 40 }
    ] }).createScatterPlot({
      id: "points", x: "x", y: "y", color: { field: "c", fieldType }, guides: false
    });
    const options = { field: "g", columns: 2, gap: 20 };
    const before = base.facet({ ...options, guides: { axes: "outer", legend: "shared" } });
    const snapshot = JSON.stringify(before);
    const unchanged = before.editFacetGuides({ axes: "outer", legend: "shared" });
    assert.deepEqual(unchanged.graphicSpec, before.graphicSpec);
    const independent = before.editFacetScales({ x: "independent" });
    assert.deepEqual(Object.values(independent.children).map(child => child.resolvedScales.x.domain), [[1, 2], [3, 4]]);
    const without = before.editFacetGuides({ legend: false });
    assert.deepEqual(without.graphicSpec, base.facet({
      ...options, guides: { axes: "outer", legend: false }
    }).graphicSpec);
    assert.equal(without.guideConfigs.legend, undefined);
    const restored = without.editFacetGuides({ axes: "each", legend: "shared" })
      .editFacetGuides({ axes: "outer" });
    assert.deepEqual(restored.graphicSpec, before.graphicSpec);
    for (const child of Object.values(restored.children)) {
      assert.equal(child.materializationConfigs.canvas.margin.right, 18);
      assert.equal(child.guideConfigs.legend, undefined);
    }
    assert.doesNotThrow(() => renderToSVG(restored));
    assert.equal(JSON.stringify(before), snapshot);
  }
});

function snapshotId(child, graphic) {
  return namespaceGraphicId(`facet-${child}`, graphic);
}

test("edits facet columns while retaining children and rejecting concat dispatch", () => {
  const base = pointBase();
  const faceted = base.facet({ field: "group", columns: 1, gap: 8 });
  const children = faceted.children;
  const edited = faceted.editCompositionLayout({ columns: 2 });

  assert.equal(edited.children, children);
  assert.equal(edited.compositionSpec.columns, 2);
  assert.equal(edited.compositionSpec.gap, 8);
  assert.deepEqual(edited.compositionSpec.facet.values, ["A", "B"]);
  assert.deepEqual(
    edited.graphicSpec.objects["facet-headers"].items.map(
      item => item.properties.y
    ),
    [10, 10]
  );
  assert.ok(
    edited.graphicSpec.objects.canvas.properties.height <
      faceted.graphicSpec.objects.canvas.properties.height
  );
  assert.equal(faceted.compositionSpec.columns, 1);
  assert.throws(
    () => hconcat({ programs: [base, base] })
      .editCompositionLayout({ columns: 2 }),
    /only on a facet composition/
  );
});

test("rederives every child for a partial shared-to-independent scale edit", () => {
  const highlighted = pointBase().highlightMarks({
    select: { field: "group", op: "eq", value: "A" },
    opacity: 0.25,
    bringToFront: false
  });
  const faceted = highlighted
    .facet({ field: "group", columns: 1 })
    .createTitle({ text: "Retained title" });
  const children = faceted.children;
  const options = { x: "independent" };
  const edited = faceted.editFacetScales(options);

  options.x = "shared";
  assert.notEqual(edited.children, children);
  assert.deepEqual(Object.keys(edited.children), Object.keys(children));
  assert.equal(edited.compositionSpec.facet.data, "source");
  assert.equal(edited.compositionSpec.facet.field, "group");
  assert.deepEqual(edited.compositionSpec.facet.values, ["A", "B"]);
  assert.equal(edited.compositionSpec.facet.scales.x, "independent");
  assert.equal(edited.compositionSpec.facet.scales.y, "shared");
  assert.equal(edited.compositionSpec.facet.guides.axes, "each");
  assert.deepEqual(
    Object.values(edited.children).map(child => child.resolvedScales.x.domain),
    [[0, 10], [100, 110]]
  );
  assert.deepEqual(
    Object.values(edited.children).map(child => child.resolvedScales.y.domain),
    [[1, 4], [1, 4]]
  );
  assert.deepEqual(
    edited.children["facet-cell-1"].graphicSpec.objects.points.items.map(
      item => item.properties.opacity
    ),
    [0.25, 0.25]
  );
  assert.equal(edited.semanticSpec.title.text, "Retained title");
  assert.equal(
    edited.graphicSpec.objects.chartTitle.properties.text,
    "Retained title"
  );
  assert.deepEqual(Object.values(edited.children).map(child => child.semanticSpec.title), [
    {}, {}
  ]);
  const actionNode = edited.trace.children.at(-1);
  assert.equal(actionNode.op, "editFacetScales");
  assert.deepEqual(actionNode.children.map(node => node.op), [
    "useProgram", "useProgram", "materializeComposition"
  ]);
  const childOps = edited.children["facet-cell-1"].trace.children.at(-1)
    .children.map(node => node.op);
  assert.ok(childOps.includes("filterData"));
  assert.ok(childOps.includes("rebindLayerData"));
  assert.equal(faceted.compositionSpec.facet.scales.x, "shared");
});

test("edits outer axes and shared legend ownership from canonical children", () => {
  const faceted = pointBase().facet({ field: "group", columns: 1 });
  const firstXAxis = snapshotId("facet-cell-1", "xAxisLine");
  const secondXAxis = snapshotId("facet-cell-2", "xAxisLine");
  const firstYAxis = snapshotId("facet-cell-1", "yAxisLine");
  const secondYAxis = snapshotId("facet-cell-2", "yAxisLine");
  assert.ok(faceted.graphicSpec.objects[firstXAxis]);
  assert.ok(faceted.graphicSpec.objects[secondXAxis]);
  assert.ok(faceted.graphicSpec.objects[firstYAxis]);
  assert.ok(faceted.graphicSpec.objects[secondYAxis]);

  const edited = faceted.editFacetGuides({
    axes: "outer",
    legend: "shared"
  });

  assert.deepEqual(edited.compositionSpec.facet.guides, {
    axes: "outer",
    legend: "shared"
  });
  assert.equal(edited.graphicSpec.objects[firstXAxis], undefined);
  assert.ok(edited.graphicSpec.objects[secondXAxis]);
  assert.ok(edited.graphicSpec.objects[firstYAxis]);
  assert.ok(edited.graphicSpec.objects[secondYAxis]);
  assert.ok(edited.graphicSpec.objects["facet-legend"]);
  assert.equal(faceted.graphicSpec.objects["facet-legend"], undefined);
  assert.notEqual(edited.children, faceted.children);
  assert.deepEqual(
    Object.values(edited.children).map(child => child.resolvedScales.x.domain),
    [[0, 110], [0, 110]]
  );
});

test("replays histogram bins when x changes from shared to independent", () => {
  const values = Object.freeze([
    Object.freeze({ value: 0, group: "A" }),
    Object.freeze({ value: 1, group: "A" }),
    Object.freeze({ value: 2, group: "A" }),
    Object.freeze({ value: 100, group: "B" }),
    Object.freeze({ value: 150, group: "B" }),
    Object.freeze({ value: 200, group: "B" })
  ]);
  const faceted = chart()
    .createCanvas({ width: 260, height: 180, margin: 20 })
    .createData({ values })
    .createBarMark({ id: "bars" })
    .encodeHistogram({ field: "value", maxBins: 2 })
    .facet({ field: "group" });
  assert.deepEqual(
    Object.values(faceted.children).map(
      child => child.semanticSpec.layers[0].encoding.x.bin.boundaries
    ),
    [[0, 100, 200], [0, 100, 200]]
  );

  const edited = faceted.editFacetScales({ x: "independent" });

  assert.deepEqual(
    Object.values(edited.children).map(
      child => child.semanticSpec.layers[0].encoding.x.bin
    ),
    [{ maxBins: 2 }, { maxBins: 2 }]
  );
  assert.deepEqual(
    Object.values(edited.children).map(child => child.resolvedScales.x.domain),
    [[0, 2], [100, 200]]
  );
  assert.deepEqual(
    Object.values(edited.children).map(
      child => child.graphicSpec.objects.bars.items.length
    ),
    [2, 2]
  );
});

test("rejects invalid or incompatible facet policy edits atomically", () => {
  const values = Object.freeze([
    Object.freeze({ x: 1, y: 1, group: "A", category: "u" }),
    Object.freeze({ x: 2, y: 2, group: "A", category: "u" }),
    Object.freeze({ x: 3, y: 3, group: "B", category: "v" }),
    Object.freeze({ x: 4, y: 4, group: "B", category: "v" })
  ]);
  const faceted = pointBase(values).facet({
    field: "group",
    scales: { color: "independent" }
  });
  const children = faceted.children;
  const graphics = faceted.graphicSpec;
  const trace = faceted.trace;

  assert.throws(
    () => faceted.editFacetGuides({ legend: "shared" }),
    /incompatible resolved legend scale/
  );
  assert.throws(
    () => faceted.editFacetScales({ color: "independent" }),
    /requires at least one channel policy change/
  );
  assert.throws(
    () => faceted.editFacetScales({ shape: "independent" }),
    /not used by an affected layer/
  );
  assert.throws(
    () => faceted.editFacetGuides({}),
    /requires at least one guide policy/
  );
  assert.throws(
    () => pointBase().editFacetScales({ x: "independent" }),
    /requires a composition ChartProgram/
  );
  assert.throws(
    () => hconcat({ programs: [pointBase(), pointBase()] })
      .editFacetGuides({ axes: "outer" }),
    /requires a facet composition/
  );
  assert.equal(faceted.children, children);
  assert.equal(faceted.graphicSpec, graphics);
  assert.equal(faceted.trace, trace);
  assert.equal(faceted.compositionSpec.facet.guides.legend, false);
});
