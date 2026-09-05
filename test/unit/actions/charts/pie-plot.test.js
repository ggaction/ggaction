import assert from "node:assert/strict";
import test from "node:test";
import { chart } from "../../../../src/index.js";
import { chart as basicChart } from "../../../../src/basic.js";
import { resolveStoredSelection } from "../../../../src/materialization/selection/state.js";

const values = Object.freeze([
  Object.freeze({ category: "A", value: 2 }), Object.freeze({ category: "A", value: 3 }),
  Object.freeze({ category: "B", value: 5 })
]);
const base = (rows = values) => chart().createCanvas({ width: 1000, height: 700, margin: 150 })
  .createData({ id: "source", values: rows });

test("completes the shortest pie call with categorical count, immutable data and legend only", () => {
  const source = base();
  const before = structuredClone({ semantic: source.semanticSpec, graphic: source.graphicSpec, trace: source.trace });
  const p = source.createPiePlot({ category: "category" });
  assert.equal(p.semanticSpec.layers[0].data, "source");
  assert.equal(p.semanticSpec.layers[0].encoding.theta.aggregate, "count");
  assert.equal(p.graphicSpec.objects.piePlot.items.length, 2);
  assert.equal(p.semanticSpec.guides.axis, undefined);
  assert.equal(p.semanticSpec.guides.grid, undefined);
  assert.deepEqual(p.guideConfigs.legend.color.domain, ["A", "B"]);
  assert.deepEqual({ semantic: source.semanticSpec, graphic: source.graphicSpec, trace: source.trace }, before);
  assert.equal(typeof basicChart().createPiePlot, "undefined");
  assert.equal(typeof p.createDonutPlot, "undefined");
});

const invalid = [
  {}, { category: 1 }, { category: "" }, { category: "category", value: "value" },
  { category: "category", aggregate: "sum" }, { category: "category", aggregate: "mean" },
  { category: "category", aggregate: null }, { category: "category", value: "value", aggregate: "count" },
  { category: { field: "category", fieldType: "quantitative" } },
  { category: { field: "category", scale: { type: "point" } } },
  { category: { field: "category", scale: { padding: 0.2 } } },
  { category: { field: "category", target: "foreign" } },
  { category: "category", target: "foreign" }, { category: "category", radius: 3 },
  { category: "category", color: 42 }, { category: "category", color: { field: "value", fieldType: "quantitative" } },
  { category: "category", color: { field: "category", layout: "stack" } },
  { category: "category", arc: { fill: "red" } }, { category: "category", arc: { stroke: false } },
  { category: "category", arc: { innerRadius: 1 } }, { category: "category", arc: { padAngle: -1 } },
  { category: "category", guides: { axes: {} } }, { category: "category", guides: { grid: {} } },
  { category: "category", guides: { legend: { gradient: {} } } },
  { category: "category", guides: { legend: { channels: ["size"] } } },
  { category: "category", color: false, guides: { legend: {} } },
  { category: "category", guides: { legend: { target: "foreign" } } }
];
for (const [index, options] of invalid.entries()) {
  test(`rejects invalid pie contract ${index + 1} without changing its source or caller`, () => {
    const source = base();
    const before = structuredClone({ semantic: source.semanticSpec, graphic: source.graphicSpec, trace: source.trace, options });
    assert.throws(() => source.createPiePlot(options));
    assert.deepEqual({ semantic: source.semanticSpec, graphic: source.graphicSpec, trace: source.trace, options }, before);
  });
}

test("uses numeric category shorthand nominally and rejects duplicate default identities", () => {
  const p = base([{ category: 1 }, { category: 1 }, { category: 2 }]).createPiePlot({ category: "category" });
  assert.equal(p.semanticSpec.layers[0].encoding.theta.fieldType, "nominal");
  assert.equal(p.graphicSpec.objects.piePlot.items.length, 2);
  assert.throws(() => p.createPiePlot({ category: "category" }), /id|exists|occupied/i);
});

test("retains zero categories in legend domains but draws only positive sectors", () => {
  const p = base([{ category: "A", value: 0 }, { category: "B", value: 5 }])
    .createPiePlot({ category: "category", value: "value", aggregate: "sum" });
  assert.equal(p.graphicSpec.objects.piePlot.items.length, 1);
  assert.deepEqual(p.guideConfigs.legend.color.domain, ["A", "B"]);
  for (const value of [-1, NaN, Infinity, undefined, 0]) {
    assert.throws(() => base([{ category: "A", value }])
      .createPiePlot({ category: "category", value: "value", aggregate: "sum" }));
  }
});

test("supports scalar fill, disabled guides and omitted optional undefined styles", () => {
  const p = base().createPiePlot({ category: "category", color: false,
    aggregate: undefined, arc: { fill: "red", innerRadius: undefined, opacity: undefined }, guides: false });
  assert.ok(p.graphicSpec.objects.piePlot.items.every(item => item.properties.fill === "red"));
  assert.deepEqual(p.semanticSpec.guides, {});
});

test("reuses compatible shared color legends and rejects explicit conflicting guide style", () => {
  const p = base().createPiePlot({ category: "category", color: { field: "category", scale: { id: "colors" } } });
  const options = { id: "second", data: "source", category: "category", color: { field: "category", scale: { id: "colors" } } };
  const next = p.createPiePlot(options);
  assert.deepEqual(next.guideConfigs.legend, p.guideConfigs.legend);
  assert.throws(() => p.createPiePlot({ ...options, guides: { legend: { title: "Conflicting title" } } }), /conflict/i);
});

test("treats supported optional undefined scale properties as omission and rejects non-object scales", () => {
  const source = base();
  const expected = source.createPiePlot({ category: "category" });
  for (const key of ["id", "type", "domain", "range", "reverse"]) {
    for (const role of ["category", "color"]) {
      const options = { category: "category", [role]: { field: "category", scale: { [key]: undefined } } };
      const actual = source.createPiePlot(options);
      assert.deepEqual(actual.semanticSpec, expected.semanticSpec);
      assert.deepEqual(actual.graphicSpec, expected.graphicSpec);
    }
  }
  for (const scale of [null, false, 0, [], new Date(0)]) {
    assert.throws(() => source.createPiePlot({ category: "category", color: { field: "category", scale } }));
  }
});

test("preserves final sector membership through selection and weighted aggregation", () => {
  const p = base().createPiePlot({ category: "category", value: "value", aggregate: "sum" });
  const selected = p.selectMarks({ target: "piePlot", field: "category", op: "eq", value: "A" });
  const selection = resolveStoredSelection(selected);
  assert.deepEqual(selection.keys, ["piePlot/sector/0"]);
  assert.equal(selection.items[0].members.length, 2);
  assert.equal(selected.graphicSpec, p.graphicSpec);
});

test("uses explicit coordinate, category order and reversed sweep without copying the source", () => {
  const p = base().createPiePlot({ category: { field: "category", fieldType: "ordinal",
    scale: { domain: ["B", "A"], range: [0, 240], reverse: true } }, coordinate: "wheel" });
  const layer = p.semanticSpec.layers[0];
  assert.equal(layer.coordinate, "wheel");
  assert.deepEqual(p.resolvedScales[layer.encoding.theta.scale].domain, ["B", "A"]);
  assert.equal(p.semanticSpec.datasets.length, 1);
  assert.throws(() => base().createCoordinate({ id: "wheel", type: "cartesian" })
    .createPiePlot({ category: "category", coordinate: "wheel" }), /coordinate|polar/i);
});

test("explicit data wins over current data and an ambiguous coordinate requires its id", () => {
  const p = base().createData({ id: "other", values: [{ unrelated: 1 }] })
    .createPiePlot({ data: "source", category: "category", guides: false });
  assert.equal(p.semanticSpec.layers[0].data, "source");
  const ambiguous = base().createCoordinate({ id: "one", type: "polar" })
    .createCoordinate({ id: "two", type: "polar" });
  assert.throws(() => ambiguous.createPiePlot({ category: "category" }), /coordinate|multiple|ambiguous/i);
  assert.equal(ambiguous.createPiePlot({ category: "category", coordinate: "two" }).semanticSpec.layers[0].coordinate, "two");
});
