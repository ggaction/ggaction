import assert from "node:assert/strict";
import test from "node:test";

import { chart } from "../../../../src/index.js";
import { deriveFacetChildren } from
  "../../../../src/actions/facets/derive.js";
import { resolveFacetDefinition } from "../../../../src/grammar/facets/index.js";

const rows = [
  { x: 10, y: 10, group: "A", category: 4 },
  { x: 20, y: 20, group: "B", category: 6 },
  { x: 30, y: 30, group: "A", category: 8 },
  { x: 40, y: 40, group: "B", category: 4 }
];

function pointBase() {
  return chart()
    .createCanvas({ width: 220, height: 160, margin: 20 })
    .createData({ id: "source", values: rows })
    .createPointMark({ id: "points" })
    .encodeX({ field: "x", scale: { nice: false, zero: false } })
    .encodeY({ field: "y", scale: { nice: false, zero: false } })
    .encodeColor({ field: "category", fieldType: "ordinal" });
}

test("derives immutable filtered children and rebinds every repeated layer", () => {
  const base = pointBase();
  const definition = resolveFacetDefinition(base.semanticSpec, { field: "group" });
  const result = deriveFacetChildren(base, definition);
  const [first, second] = Object.values(result.children);

  assert.deepEqual(Object.keys(result.children), ["facet-cell-1", "facet-cell-2"]);
  assert.equal(first.semanticSpec.layers[0].data, "facet-cell-1-data");
  assert.equal(second.semanticSpec.layers[0].data, "facet-cell-2-data");
  assert.deepEqual(
    first.semanticSpec.datasets.find(dataset => dataset.id === "source").values,
    rows
  );
  assert.deepEqual(
    first.semanticSpec.datasets.find(
      dataset => dataset.id === "facet-cell-1-data"
    ).values.map(row => row.group),
    ["A", "A"]
  );
  assert.deepEqual(
    second.semanticSpec.datasets.find(
      dataset => dataset.id === "facet-cell-2-data"
    ).values.map(row => row.group),
    ["B", "B"]
  );
  assert.equal(first.graphicSpec.objects.points.items.length, 2);
  assert.equal(second.graphicSpec.objects.points.items.length, 2);
  assert.equal(base.semanticSpec.datasets.length, 1);
  assert.equal(base.graphicSpec.objects.points.items.length, 4);
  assert.equal(Object.isFrozen(result.children), true);
});

test("shares continuous and categorical scale domains after cell filtering", () => {
  const base = pointBase();
  const definition = resolveFacetDefinition(base.semanticSpec, { field: "group" });
  const { children, sharedScales } = deriveFacetChildren(base, definition);

  assert.deepEqual(sharedScales.x.domain, [10, 40]);
  assert.deepEqual(sharedScales.y.domain, [10, 40]);
  assert.deepEqual(sharedScales.color.domain, [4, 6, 8]);
  for (const child of Object.values(children)) {
    assert.deepEqual(child.resolvedScales.x.domain, [10, 40]);
    assert.deepEqual(child.resolvedScales.y.domain, [10, 40]);
    assert.deepEqual(child.resolvedScales.color.domain, [4, 6, 8]);
  }
  assert.notDeepEqual(
    children["facet-cell-1"].graphicSpec.objects.points.items.map(
      item => item.properties.x
    ),
    [20, 200]
  );
});

test("uses shared histogram boundaries and the union count domain", () => {
  const histogramRows = [
    { value: 0, group: "A", category: 4 },
    { value: 5, group: "A", category: 6 },
    { value: 9, group: "A", category: 4 },
    { value: 2, group: "B", category: 6 },
    { value: 8, group: "B", category: 8 }
  ];
  const base = chart()
    .createCanvas({ width: 240, height: 180, margin: 20 })
    .createData({ id: "source", values: histogramRows })
    .createBarMark({ id: "bars" })
    .encodeHistogram({ field: "value", maxBins: 2 })
    .encodeColor({ field: "category", fieldType: "ordinal" });
  const definition = resolveFacetDefinition(base.semanticSpec, { field: "group" });
  const { children, sharedScales } = deriveFacetChildren(base, definition);
  const bins = Object.values(children).map(
    child => child.semanticSpec.layers[0].encoding.x.bin.boundaries
  );

  assert.deepEqual(bins[0], bins[1]);
  assert.equal(Object.hasOwn(
    children["facet-cell-1"].semanticSpec.layers[0].encoding.x.bin,
    "maxBins"
  ), false);
  assert.deepEqual(sharedScales.y.domain, [0, 2]);
  for (const child of Object.values(children)) {
    assert.deepEqual(child.resolvedScales.y.domain, [0, 2]);
    assert.deepEqual(child.resolvedScales.color.domain, [4, 6, 8]);
  }
});

test("keeps meaningful derivation and rematerialization steps in child traces", () => {
  const base = pointBase();
  const definition = resolveFacetDefinition(base.semanticSpec, { field: "group" });
  const child = deriveFacetChildren(base, definition).children["facet-cell-1"];
  const operations = child.trace.children.map(node => node.op);

  assert.ok(operations.includes("filterData"));
  assert.ok(operations.includes("rebindLayerData"));
  assert.ok(operations.includes("rematerializePointMark"));
  assert.equal(child.actionStack.length, 0);
  assert.equal(base.actionStack.length, 0);
});
