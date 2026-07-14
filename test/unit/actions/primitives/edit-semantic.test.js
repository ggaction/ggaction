import assert from "node:assert/strict";
import test from "node:test";

import { chart } from "../../../../src/core/ChartProgram.js";

test("creates and replaces semantic properties without mutating earlier programs", () => {
  const empty = chart();
  const withMark = empty.editSemantic({
    property: "layer[points].mark.type",
    value: "point"
  });
  const withData = withMark.editSemantic({
    property: "layer[points].data",
    value: "cars"
  });

  assert.deepEqual(empty.semanticSpec.layers, []);
  assert.deepEqual(withMark.semanticSpec.layers, [
    { id: "points", mark: { type: "point" } }
  ]);
  assert.deepEqual(withData.semanticSpec.layers, [
    { id: "points", mark: { type: "point" }, data: "cars" }
  ]);
  assert.equal(withMark.semanticSpec.datasets, empty.semanticSpec.datasets);
  assert.equal(withData.semanticSpec.datasets, withMark.semanticSpec.datasets);
  assert.equal(withData.semanticSpec.scales, withMark.semanticSpec.scales);
  assert.equal(withData.context.currentMark, "points");
  assert.equal(withData.trace.children.at(-1).op, "editSemantic");
});

test("takes ownership of dataset rows and keeps datasets immutable", () => {
  const rows = Object.freeze([{ nested: { value: 1 } }]);
  const program = chart().editSemantic({
    property: "dataset[cars].values",
    value: rows
  });

  rows[0].nested.value = 2;

  assert.equal(program.semanticSpec.datasets[0].values[0].nested.value, 1);
  assert.equal(program.context.currentData, "cars");
  assert.equal(Object.isFrozen(program.semanticSpec.datasets[0].values[0]), true);
  assert.throws(
    () =>
      program.editSemantic({
        property: "dataset[cars].values",
        value: []
      }),
    /immutable after creation/
  );
});

test("rejects unsupported paths and invalid dataset values", () => {
  assert.throws(
    () =>
      chart().editSemantic({
        property: "layer[points].appearance.fill",
        value: "red"
      }),
    /Unknown semantic property/
  );

  assert.throws(
    () =>
      chart().editSemantic({
        property: "dataset[cars].values",
        value: [1, 2]
      }),
    /array of plain row objects/
  );

  assert.throws(
    () =>
      chart().editSemantic({
        property: "layer[points].mark.type",
        value: "piont"
      }),
    /Unknown mark type/
  );
});

test("summarizes array values in the trace", () => {
  const program = chart().editSemantic({
    property: "dataset[cars].values",
    value: [{ x: 1 }, { x: 2 }]
  });

  assert.deepEqual(program.trace.children[0].args, {
    property: "dataset[cars].values",
    valueCount: 2
  });
});

test("validates semantic scale values through the primitive API", () => {
  assert.throws(
    () =>
      chart().editSemantic({
        property: "scale[x].type",
        value: "linar"
      }),
    /Unsupported scale type/
  );
  assert.throws(
    () =>
      chart().editSemantic({
        property: "scale[x].domain",
        value: []
      }),
    /non-empty array/
  );
  assert.throws(
    () =>
      chart().editSemantic({
        property: "scale[x].range",
        value: { palette: "unknown" }
      }),
    /Unknown palette/
  );
});

test("validates aggregate semantic values needed by primitive authoring", () => {
  const scalarOperations = [
    "count", "sum", "mean", "median", "min", "max",
    "distinct", "valid", "missing",
    "variance", "varianceP", "stdev", "stdevP", "stderr",
    "q1", "q3", "ciLower", "ciUpper"
  ];
  for (const aggregate of scalarOperations) {
    const program = chart().editSemantic({
      property: "layer[lines].encoding.y.aggregate",
      value: aggregate
    });
    assert.equal(program.semanticSpec.layers[0].encoding.y.aggregate, aggregate);
  }
  for (const aggregate of [
    { op: "quantile", probability: 0.75 },
    { op: "first", orderBy: "Horsepower" },
    { op: "last", orderBy: "Horsepower", order: "descending" }
  ]) {
    const program = chart().editSemantic({
      property: "layer[lines].encoding.y.aggregate",
      value: aggregate
    });
    assert.deepEqual(program.semanticSpec.layers[0].encoding.y.aggregate, aggregate);
  }

  for (const value of [
    "average",
    { op: "quantile", probability: -0.1 },
    { op: "quantile", probability: 0.5, orderBy: "x" },
    { op: "first", orderBy: "" },
    { op: "last", orderBy: "x", order: "sideways" }
  ]) {
    assert.throws(
      () => chart().editSemantic({
        property: "layer[lines].encoding.y.aggregate",
        value
      }),
      /aggregate|probability|orderBy|property|order/i
    );
  }
});
