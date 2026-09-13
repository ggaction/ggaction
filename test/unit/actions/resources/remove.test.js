import assert from "node:assert/strict";
import test from "node:test";

import { ChartProgram } from "../../../../src/ChartProgram.js";
import { chart, hconcat } from "../../../../src/index.js";
import { chart as basicChart } from "../../../../src/basic.js";
import { planResourceRemoval } from "../../../../src/actions/resources/remove.js";
import { assertAtomicFailures } from "../../../support/program-state.js";

const rows = Object.freeze([
  Object.freeze({ group: "A", x: 1, y: 2 }),
  Object.freeze({ group: "B", x: 2, y: 3 }),
  Object.freeze({ group: "A", x: 3, y: 5 })
]);

test("removes unused named data, scale, and coordinate resources immutably", () => {
  const before = chart()
    .createCanvas({ width: 300, height: 200 })
    .createData({ id: "unusedData", values: rows })
    .createScale({ id: "unusedScale", type: "linear" })
    .createCoordinate({ id: "unusedCoordinate", type: "cartesian" });
  const graphic = before.graphicSpec;
  const children = before.children;
  const withoutData = before.removeData({ id: "unusedData" });
  const withoutScale = withoutData.removeScale({ id: "unusedScale" });
  const after = withoutScale.removeCoordinate({ id: "unusedCoordinate" });

  assert.deepEqual(after.semanticSpec.datasets, []);
  assert.deepEqual(after.semanticSpec.scales, []);
  assert.deepEqual(after.semanticSpec.coordinates, []);
  assert.equal(withoutData.context.currentData, undefined);
  assert.equal(withoutScale.context.currentScale, undefined);
  assert.equal(after.context.currentCoordinate, undefined);
  assert.strictEqual(after.graphicSpec, graphic);
  assert.strictEqual(after.children, children);
  assert.deepEqual(
    [withoutData, withoutScale, after].map(program => program.trace.children.at(-1).op),
    ["removeData", "removeScale", "removeCoordinate"]
  );
  assert.equal(before.semanticSpec.datasets[0].id, "unusedData");
});

test("removing a scale also drops its resolved cache entry", () => {
  const before = chart()
    .createScale({ id: "manual", type: "linear", domain: [0, 10], range: [0, 1] })
    ._withResolvedScale("manual", {
      type: "linear",
      domain: [0, 10],
      range: [0, 1]
    });
  const after = before.removeScale({ id: "manual" });

  assert.equal(after.resolvedScales.manual, undefined);
  assert.ok(before.resolvedScales.manual);
});

test("rejects every live semantic resource reference with stable owner paths", () => {
  const program = chart()
    .createCanvas({ width: 300, height: 200, margin: 20 })
    .createData({ id: "rows", values: rows })
    .createPointMark({ id: "points" })
    .encodeX({ field: "x", scale: { id: "horizontal" } })
    .encodeY({ field: "y" });
  const coordinate = program.semanticSpec.layers[0].coordinate;

  assertAtomicFailures(program, [
    {
      operation: () => program.removeData({ id: "rows" }),
      error: /Cannot remove data "rows"; live references: layer "points" at \.data/
    },
    {
      operation: () => program.removeScale({ id: "horizontal" }),
      error: /Cannot remove scale "horizontal"; live references: layer "points" at \.encoding\.x\.scale/
    },
    {
      operation: () => program.removeCoordinate({ id: coordinate }),
      error: new RegExp(
        `Cannot remove coordinate "${coordinate}"; live references: layer "points" at \\.coordinate`
      )
    }
  ]);
});

test("rejects transitive dataset sources and reports references deterministically", () => {
  const program = chart()
    .createData({ id: "source", values: rows })
    .createDerivedData({
      id: "derived",
      source: "source",
      transform: [{ type: "filter", field: "group", oneOf: ["A"] }]
    })
    .createPointMark({ id: "points", data: "source" });

  assert.throws(
    () => program.removeData({ id: "source" }),
    /dataset "derived" at \.source; layer "points" at \.data/
  );
});

test("rejects chart-owned generated datasets and wrong-kind or unknown IDs", () => {
  const program = chart()
    .createCanvas({ width: 300, height: 200, margin: 20 })
    .createData({ id: "rows", values: rows })
    .createPointMark({ id: "points" })
    .encodeX({ field: "x" })
    .encodeY({ field: "y" })
    .createRegression();

  assertAtomicFailures(program, [
    {
      operation: () => program.removeData({ id: "pointsRegressionData" }),
      error: /chart-owned; use its owning resource action/
    },
    {
      operation: () => program.removeScale({ id: "rows" }),
      error: /exists as data, not scale/
    },
    {
      operation: () => program.removeCoordinate({ id: "missing" }),
      error: /Unknown coordinate "missing"/
    }
  ]);
});

test("removes a standalone logical derived-data owner after its last consumer", () => {
  const before = chart()
    .createData({ id: "source", values: rows })
    .createComputedData({
      id: "computed",
      as: "doubleX",
      expression: { op: "multiply", left: { field: "x" }, right: { constant: 2 } }
    });
  const after = before.removeData({ id: "computed" });

  assert.deepEqual(after.semanticSpec.datasets.map(dataset => dataset.id), ["source"]);
  assert.equal(after.materializationConfigs.data, undefined);
  assert.equal(after.context.currentData, undefined);
  assert.ok(before.materializationConfigs.data.computed.computed);
  const plan = planResourceRemoval(before, {
    kind: "data",
    id: "computed",
    operation: "removeData"
  });
  assert.equal(Object.isFrozen(plan), true);
  assert.equal(Object.isFrozen(plan.semanticIds), true);
  assert.equal(Object.isFrozen(plan.dataOwner), true);
});

test("a standalone logical derived-data owner remains blocked while consumed", () => {
  const program = chart()
    .createData({ id: "source", values: rows })
    .createComputedData({
      id: "computed",
      as: "doubleX",
      expression: { op: "multiply", left: { field: "x" }, right: { constant: 2 } }
    })
    .createPointMark({ id: "points", data: "computed" });

  assert.throws(
    () => program.removeData({ id: "computed" }),
    /layer "points" at \.data/
  );
});

test("validates the narrow one-id option contract atomically", () => {
  const program = chart().createData({ id: "rows", values: rows });
  const invalid = [
    { operation: () => program.removeData(), error: /removeData id/ },
    { operation: () => program.removeData({ id: "" }), error: /removeData id/ },
    {
      operation: () => program.removeData({ id: "rows", cascade: true }),
      error: /Unknown removeData option/
    }
  ];
  assertAtomicFailures(program, invalid);
});

test("supports facet parents but rejects concat composition programs", () => {
  const faceted = chart()
    .createCanvas({ width: 300, height: 200, margin: 20 })
    .createData({ id: "rows", values: rows })
    .createScale({ id: "unused", type: "linear" })
    .createPointMark({ id: "points" })
    .encodeX({ field: "x" })
    .encodeY({ field: "y" })
    .facet({ field: "group" });
  const after = faceted.removeScale({ id: "unused" });

  assert.equal(after.semanticSpec.scales.some(scale => scale.id === "unused"), false);
  assert.strictEqual(after.children, faceted.children);
  assert.throws(
    () => faceted.removeData({ id: "rows" }),
    /composition ".*" at \.facet\.data/
  );

  const concatenated = hconcat({ programs: [
    chart()
      .createCanvas({ width: 100, height: 100, margin: 10 })
      .createData({ id: "left", values: rows }),
    chart()
      .createCanvas({ width: 100, height: 100, margin: 10 })
      .createData({ id: "right", values: rows })
  ] });
  assert.throws(
    () => concatenated.removeData({ id: "left" }),
    /supports unit and facet composition programs/
  );
});

function storedReferenceProgram({
  datasets = [],
  scales = [],
  coordinates = [],
  layers = [],
  markConfigs = {},
  guideConfigs = {},
  trace
}) {
  return new ChartProgram({
    semanticSpec: {
      datasets,
      scales,
      coordinates,
      layers,
      guides: {}
    },
    markConfigs,
    guideConfigs,
    ...(trace === undefined ? {} : { trace })
  });
}

test("blocks offset, legend, Polar-guide, and annotation reference paths", () => {
  const offset = storedReferenceProgram({
    scales: [{ id: "slots", type: "band" }],
    layers: [{
      id: "bars",
      mark: "bar",
      encoding: { xOffset: { field: "group", scale: "slots" } }
    }]
  });
  const legend = storedReferenceProgram({
    scales: [{ id: "stroke", type: "ordinal" }],
    guideConfigs: {
      legend: { stroke: { scales: ["stroke"], target: "lines" } }
    }
  });
  const polarGuide = storedReferenceProgram({
    coordinates: [{ id: "polar", type: "polar" }],
    guideConfigs: {
      axis: { theta: { line: { coordinate: "polar" } } }
    }
  });
  const annotation = storedReferenceProgram({
    coordinates: [{ id: "plot", type: "cartesian" }],
    layers: [{ id: "note", mark: "text", coordinate: "plot", encoding: {} }]
  });

  assert.throws(
    () => offset.removeScale({ id: "slots" }),
    /layer "bars" at \.encoding\.xOffset\.scale/
  );
  assert.throws(
    () => legend.removeScale({ id: "stroke" }),
    /legend "stroke" at \.scales\[0\]/
  );
  assert.throws(
    () => polarGuide.removeCoordinate({ id: "polar" }),
    /axis "theta\.line" at \.coordinate/
  );
  assert.throws(
    () => annotation.removeCoordinate({ id: "plot" }),
    /layer "note" at \.coordinate/
  );
});

test("sorts referrers independently of semantic insertion order", () => {
  const build = order => storedReferenceProgram({
    datasets: [{ id: "rows", values: rows }],
    layers: order.map(id => ({ id, mark: "point", data: "rows", encoding: {} }))
  });
  const message = program => {
    try {
      program.removeData({ id: "rows" });
    } catch (error) {
      return error.message;
    }
    return undefined;
  };

  assert.equal(message(build(["zeta", "alpha"])), message(build(["alpha", "zeta"])));
  assert.match(message(build(["zeta", "alpha"])),
    /layer "alpha" at \.data; layer "zeta" at \.data$/);
});

test("ignores matching trace, text, color, field, and role strings", () => {
  const before = storedReferenceProgram({
    datasets: [{ id: "token", values: [] }],
    scales: [{ id: "style", type: "linear" }],
    coordinates: [{ id: "role", type: "cartesian" }],
    markConfigs: {
      decoration: {
        labelAuthoring: { text: "token", color: "style" },
        compositionRole: "role",
        regression: { x: "style", y: "role" }
      }
    },
    trace: {
      id: "trace",
      op: "root",
      description: "token style role",
      args: { data: "token", scale: "style", coordinate: "role" },
      children: []
    }
  });
  const after = before
    .removeData({ id: "token" })
    .removeScale({ id: "style" })
    .removeCoordinate({ id: "role" });

  assert.deepEqual(after.semanticSpec.datasets, []);
  assert.deepEqual(after.semanticSpec.scales, []);
  assert.deepEqual(after.semanticSpec.coordinates, []);
});

test("keeps resource-removal actions out of the Basic surface", () => {
  const program = basicChart();
  assert.equal(program.removeData, undefined);
  assert.equal(program.removeScale, undefined);
  assert.equal(program.removeCoordinate, undefined);
});
