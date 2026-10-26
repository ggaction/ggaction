import test from "node:test";
import assert from "node:assert/strict";
import { chart, hconcat, vconcat } from "../../../../src/index.js";
import { prepareCompositionSnapshots } from "../../../../src/materialization/composition.js";
import { serializeProgram, deserializeProgram } from "../../../../src/persistence.js";

const rows = [{ category: "A", value: 10, group: "one" }, { category: "A", value: 20, group: "one" },
  { category: "A", value: 50, group: "two" }, { category: "A", value: 70, group: "two" }];
function unit(axis, values = rows, aggregate = "sum") {
  return chart().createCanvas({ plot: { width: 200, height: 200 }, margin: 70 })
    .createData({ id: "data", values }).createBarPlot({ id: "bars", data: "data",
      [axis]: { field: "value", aggregate, scale: { nice: false } },
      [axis === "x" ? "y" : "x"]: { field: "category", fieldType: "nominal" }, color: { field: "group" } });
}
const domain = (p, axis) => p.resolvedScales[p.semanticSpec.layers[0].encoding[axis].scale].domain;
const cellDomains = (p, axis) => p.compositionSpec.children.map(id => domain(p.children[id], axis));

for (const axis of ["x", "y"]) for (const policy of ["shared", "independent"]) {
  test(`${axis} sharing uses displayed ${policy} facet domains, not the unpartitioned aggregate`, () => {
    const source = unit(axis).layoutSeries({ target: "bars", mode: "stack" })
      .createOverlay({ source: "bars", id: "line", type: "line" })
      .facet({ field: "group", columns: 2, scales: { [axis]: policy }, guides: { legend: "shared" } });
    assert.deepEqual(domain(source, axis), [0, 150]);
    const original = serializeProgram(source);
    const other = unit(axis, [{ category: "A", value: 5, group: "one" }]);
    const p = (axis === "x" ? vconcat : hconcat)({ programs: [{ id: "facets", program: source }, { id: "other", program: other }],
      share: { [axis]: true }, align: "plot" });
    const shared = prepareCompositionSnapshots(p).children;
    assert.deepEqual(domain(shared.other, axis), [0, 120]);
    assert.deepEqual(cellDomains(shared.facets, axis), [[0, 120], [0, 120]]);
    assert.equal(serializeProgram(source), original);
    assert.deepEqual(deserializeProgram(serializeProgram(p)).graphicSpec, p.graphicSpec);
    const independent = prepareCompositionSnapshots(p.editCompositionScales({ share: { [axis]: false } })).children;
    assert.deepEqual(domain(independent.other, axis), [0, 5]);
    assert.deepEqual(cellDomains(independent.facets, axis), cellDomains(source, axis));
  });
}

test("a union equal to the source template still rematerializes smaller facet cell scales", () => {
  const source = unit("y").facet({ field: "group", columns: 2 });
  const p = hconcat({ programs: [{ id: "facets", program: source },
    { id: "other", program: unit("y", [{ category: "A", value: 150, group: "one" }]) }], share: { y: true } });
  assert.deepEqual(cellDomains(prepareCompositionSnapshots(p).children.facets, "y"), [[0, 150], [0, 150]]);
  const nested = hconcat({ programs: [{ id: "pair", program: p },
    { id: "high", program: unit("y", [{ category: "A", value: 200, group: "one" }]) }], share: { y: true } });
  const outer = prepareCompositionSnapshots(nested).children;
  assert.deepEqual(cellDomains(prepareCompositionSnapshots(outer.pair).children.facets, "y"), [[0, 200], [0, 200]]);
  const smaller = nested.replaceCompositionChild({ target: "high", program: unit("y", [{ category: "A", value: 1, group: "one" }]) });
  assert.deepEqual(domain(prepareCompositionSnapshots(smaller).children.high, "y"), [0, 150]);
});

test("facet means use the partition result and authored explicit domains remain authoritative", () => {
  const source = unit("y", rows, "mean").facet({ field: "group", columns: 2 });
  assert.deepEqual(domain(source, "y"), [0, 60]);
  const other = unit("y", [{ category: "A", value: 5, group: "one" }], "mean");
  const p = hconcat({ programs: [source, other], share: { y: true } });
  assert.deepEqual(Object.values(prepareCompositionSnapshots(p).children).map(p => domain(p, "y")), [[0, 60], [0, 60]]);
  const fixed = source.editFacetSource({ action: { method: "editYScale", options: { target: "bars", domain: [0, 90] } } });
  const q = hconcat({ programs: [fixed, other], share: { y: true } });
  assert.deepEqual(Object.values(prepareCompositionSnapshots(q).children).map(p => domain(p, "y")), [[0, 90], [0, 90]]);
});
