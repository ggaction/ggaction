import assert from "node:assert/strict";
import test from "node:test";

import { chart } from "../../../../src/index.js";

function dataset(program, id) {
  return program.semanticSpec.datasets.find(candidate => candidate.id === id);
}

test("createCompleteData fills one typed key domain with explicit membership", () => {
  const source = chart().createData({ id: "source", values: [
    { g: "A", t: 1, v: 2 },
    { g: "A", t: 3, v: 6 }
  ] });
  const values = [1, 2, 3];
  const program = source.createCompleteData({
    id: "complete", key: "t", groupBy: "g", values,
    members: "sourceRows"
  });
  values[1] = 99;

  assert.deepEqual(dataset(program, "complete"), {
    schema: dataset(program, "complete").schema,
    id: "complete",
    source: "source",
    transform: [{
      type: "complete",
      key: "t",
      groupBy: ["g"],
      fill: {},
      values: [1, 2, 3],
      members: "sourceRows"
    }],
    values: [
      { g: "A", t: 1, v: 2, sourceRows: [0] },
      { g: "A", t: 2, v: null, sourceRows: [] },
      { g: "A", t: 3, v: 6, sourceRows: [1] }
    ]
  });
  assert.deepEqual(
    program.trace.children.at(-1).children.map(child => child.op),
    ["createDerivedData", "materializeCompleteData"]
  );
  assert.equal(source.semanticSpec.datasets.length, 1);
});

test("createCompleteData preserves group and domain order without Cartesian groups", () => {
  const program = chart()
    .createData({ id: "source", values: [
      { g: "B", h: 2, t: 2, v: 5 },
      { g: "A", h: 1, t: 1, v: 3 }
    ] })
    .createCompleteData({
      id: "complete", key: "t", groupBy: ["g", "h"],
      sequence: { start: 1, end: 2, step: 1 }, fill: { v: 0 }
    });
  assert.deepEqual(dataset(program, "complete").values, [
    { g: "B", h: 2, t: 1, v: 0 },
    { g: "B", h: 2, t: 2, v: 5 },
    { g: "A", h: 1, t: 1, v: 3 },
    { g: "A", h: 1, t: 2, v: 0 }
  ]);
});

test("createCompleteData handles empty global and grouped sources explicitly", () => {
  const source = chart().createData({ id: "source", values: [], schema: { fields: [
    { name: "t", storageType: "number" },
    { name: "g", storageType: "string" }
  ] } });
  const global = source.createCompleteData({
    id: "global", key: "t", values: [1, 2], fill: { v: 0 }
  });
  const grouped = source.createCompleteData({
    id: "grouped", source: "source", key: "t", groupBy: "g", values: [1, 2]
  });
  assert.deepEqual(dataset(global, "global").values, [{ t: 1, v: 0 }, { t: 2, v: 0 }]);
  assert.deepEqual(dataset(grouped, "grouped").values, []);
});

test("createCompleteData rejects ambiguous or oversized definitions atomically", () => {
  const source = chart().createData({ id: "source", values: [
    { g: "A", t: 1, v: 2 },
    { g: "A", t: 1, v: 4 }
  ] });
  const before = JSON.stringify(source);
  const invalid = [
    [{ key: "t", groupBy: "g", values: [1, 2] }, /duplicate group and key/],
    [{ key: "missing", values: [1] }, /does not contain field/],
    [{ key: "t", values: [1, 1] }, /must be unique/],
    [{ key: "t", values: [1, "2"] }, /one scalar type/],
    [{ key: "t", values: [2] }, /outside the requested domain/],
    [{ key: "t", values: [1], sequence: { start: 1, end: 2, step: 1 } }, /mutually exclusive/],
    [{ key: "t", sequence: { start: 0, end: 10_000, step: 1 } }, /cannot exceed 10000/],
    [{ key: "t", values: [1], members: "v" }, /already exists/],
    [{ key: "t", values: [1], fill: { t: 0 } }, /protected field/]
  ];
  invalid.forEach(([options, error], index) => {
    assert.throws(() => source.createCompleteData({
      id: `invalid${index}`, ...options
    }), error);
    assert.equal(JSON.stringify(source), before);
  });
});

test("createImputedData performs constant and distance-based linear filling", () => {
  const source = chart().createData({ id: "source", values: [
    { t: 1, v: 2 },
    { t: 2, v: null },
    { t: 5, v: 10 }
  ] });
  const linear = source.createImputedData({
    id: "linear", fields: ["v"], method: "linear", sortBy: [{ field: "t" }]
  });
  const constant = source.createImputedData({
    id: "constant", fields: "v", method: "constant", value: 0
  });
  assert.deepEqual(dataset(linear, "linear").values.map(row => row.v), [2, 4, 10]);
  assert.deepEqual(dataset(constant, "constant").values.map(row => row.v), [2, 0, 10]);
  assert.deepEqual(
    linear.trace.children.at(-1).children.map(child => child.op),
    ["createDerivedData", "materializeImputedData"]
  );
});

test("createImputedData keeps groups, source order, maxGap, and edge priority", () => {
  const grouped = chart()
    .createData({ id: "source", values: [
      { g: "A", t: 2, v: null },
      { g: "B", t: 2, v: null },
      { g: "A", t: 1, v: 2 },
      { g: "B", t: 1, v: 8 }
    ] })
    .createImputedData({
      id: "forward", fields: ["v"], groupBy: "g", method: "forward",
      sortBy: [{ field: "t" }]
    });
  assert.deepEqual(dataset(grouped, "forward").values.map(row => row.v), [2, 8, 2, 8]);

  const runs = chart()
    .createData({ id: "source", values: [
      { t: 0, v: 2 }, { t: 1, v: null }, { t: 2, v: null },
      { t: 3, v: 8 }, { t: 4, v: null }
    ] })
    .createImputedData({
      id: "bounded", fields: ["v"], method: "forward",
      sortBy: [{ field: "t" }], maxGap: 1, edges: "error"
    });
  assert.deepEqual(dataset(runs, "bounded").values.map(row => row.v), [2, null, null, 8, 8]);
});

test("createImputedData applies edge errors only to eligible missing runs", () => {
  const source = chart().createData({ id: "source", values: [
    { t: 0, v: null }, { t: 1, v: 2 }, { t: 2, v: null },
    { t: 3, v: null }, { t: 4, v: 8 }, { t: 5, v: null }
  ] });
  assert.throws(() => source.createImputedData({
    id: "error", fields: ["v"], method: "forward",
    sortBy: [{ field: "t" }], maxGap: 1, edges: "error"
  }), /edge run/);
  const kept = source.createImputedData({
    id: "keep", fields: ["v"], method: "forward",
    sortBy: [{ field: "t" }], maxGap: 1
  });
  assert.deepEqual(dataset(kept, "keep").values.map(row => row.v),
    [null, 2, null, null, 8, 8]);
});

test("createImputedData rejects invalid values and method contracts atomically", () => {
  const source = chart().createData({ id: "source", values: [
    { t: 1, v: 2 }, { t: 2, v: null }, { t: 3, v: 4 }
  ] });
  const invalid = [
    [{ fields: [], method: "constant", value: 0 }, /non-empty field array/],
    [{ fields: ["v"], method: "constant" }, /requires a value/],
    [{ fields: ["v"], method: "forward", value: 0, sortBy: [{ field: "t" }] }, /not available/],
    [{ fields: ["v"], method: "linear", sortBy: [{ field: "t", order: "descending" }] }, /one ascending/],
    [{ fields: ["v"], method: "linear", sortBy: [{ field: "t" }, { field: "v" }] }, /one ascending/],
    [{ fields: ["v"], method: "forward" }, /non-empty sortBy/],
    [{ fields: ["missing"], method: "constant", value: 0 }, /does not contain field/],
    [{ fields: ["v"], method: "constant", value: undefined }, /JSON-safe scalar/],
    [{ fields: ["v"], method: "constant", value: Infinity }, /NaN and Infinity/],
    [{ fields: ["v"], method: "forward", sortBy: [{ field: "t" }], maxGap: 0 }, /positive safe integer/]
  ];
  const before = JSON.stringify(source);
  invalid.forEach(([options, error], index) => {
    assert.throws(() => source.createImputedData({ id: `invalid${index}`, ...options }), error);
    assert.equal(JSON.stringify(source), before);
  });

  const duplicate = chart().createData({ id: "source", values: [
    { t: 1, v: 2 }, { t: 1, v: null }, { t: 2, v: 4 }
  ] });
  assert.throws(() => duplicate.createImputedData({
    id: "duplicate", fields: ["v"], method: "linear", sortBy: [{ field: "t" }]
  }), /positions must be unique/);

  const mixedGroups = chart().createData({ id: "source", values: [
    { g: "A", t: 1, v: 2 }, { g: "B", t: 1, v: "two" }
  ] });
  assert.throws(() => mixedGroups.createImputedData({
    id: "mixed", fields: ["v"], groupBy: "g", method: "constant", value: 0
  }), /field "v" must contain one scalar type/);
});

test("facets replay completion, imputation, and duration windows from local source rows", () => {
  const faceted = chart()
    .createCanvas({ width: 320, height: 220, margin: 30 })
    .createData({ id: "source", values: [
      { facet: "A", t: 1, v: 2 }, { facet: "A", t: 3, v: 6 },
      { facet: "B", t: 1, v: 4 }, { facet: "B", t: 3, v: 8 }
    ] })
    .createCompleteData({
      id: "complete", key: "t", groupBy: "facet", values: [1, 2, 3]
    })
    .createImputedData({
      id: "imputed", fields: ["v"], groupBy: "facet", method: "linear",
      sortBy: [{ field: "t" }]
    })
    .createWindowData({
      id: "moving",
      temporalUnit: "timestamp",
      sortBy: [{ field: "t" }],
      operations: [{
        op: "movingMean",
        field: "v",
        as: "mean",
        frame: { duration: { preceding: 1, unit: "millisecond" } }
      }]
    })
    .createPointMark({ id: "points", data: "moving" })
    .encodeX({ target: "points", field: "t" })
    .encodeY({ target: "points", field: "mean" })
    .facet({ field: "facet", guides: { legend: false } });
  const expected = new Map([["A", [2, 3, 5]], ["B", [4, 5, 7]]]);
  for (const id of faceted.compositionSpec.children) {
    const child = faceted.children[id];
    const output = child.semanticSpec.datasets.find(candidate =>
      candidate.id.startsWith(`${id}-moving-data`)
    );
    assert.ok(output);
    assert.deepEqual(output.values.map(row => row.mean), expected.get(output.values[0].facet));
    assert.equal(child.semanticSpec.layers[0].data, output.id);
  }
});
