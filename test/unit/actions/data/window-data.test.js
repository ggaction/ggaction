import assert from "node:assert/strict";
import test from "node:test";

import { chart } from "../../../../src/index.js";

const rows = Object.freeze([
  Object.freeze({ group: "A", order: 2, value: 4 }),
  Object.freeze({ group: "A", order: 1, value: 3 }),
  Object.freeze({ group: "B", order: 1, value: 5 })
]);

function sourceProgram() {
  return chart().createData({ id: "source", values: rows });
}

test("every window operation stores prototype-named output fields as ordinary data", () => {
  const source = chart().createData({ values: [{ value: 10 }, { value: 10 }, { value: 20 }] });
  const before = JSON.stringify(source);
  const cases = [
    [{ op: "rowNumber" }, [1, 2, 3]],
    [{ op: "rank" }, [1, 1, 3]],
    [{ op: "denseRank" }, [1, 1, 2]],
    [{ op: "cumulativeSum", field: "value" }, [10, 20, 40]],
    [{ op: "lag", field: "value" }, [null, 10, 10]],
    [{ op: "lead", field: "value" }, [10, 20, null]],
    [{ op: "movingSum", field: "value", frame: { preceding: 1 } }, [10, 20, 30]],
    [{ op: "movingMean", field: "value", frame: { preceding: 1 } }, [10, 10, 15]]
  ];
  for (const as of ["__proto__", "constructor", "toString"]) {
    for (const [operation, expected] of cases) {
      const program = source.createWindowData({
        id: "result", sortBy: [{ field: "value" }], operations: [{ ...operation, as }]
      });
      const output = program.semanticSpec.datasets[1].values;
      assert.deepEqual(output.map(row => row[as]), expected);
      for (const row of output) {
        assert.ok(Object.hasOwn(row, as));
        assert.equal(Object.getPrototypeOf(row), Object.prototype);
        assert.ok(Object.isFrozen(row));
      }
      assert.deepEqual(JSON.parse(JSON.stringify(output)).map(row => row[as]), expected);
    }
  }
  const chained = source.createWindowData({
    id: "chained",
    operations: [
      { op: "rowNumber", as: "__proto__" },
      { op: "cumulativeSum", field: "__proto__", as: "running" }
    ]
  });
  assert.deepEqual(chained.semanticSpec.datasets[1].values.map(row => row.running), [1, 3, 6]);
  assert.equal(JSON.stringify(source), before);
});

test("creates immutable window provenance and concrete source-ordered rows", () => {
  const source = sourceProgram();
  const program = source.createWindowData({
    id: "ranked",
    partitionBy: "group",
    sortBy: [{ field: "order" }],
    operations: [
      { op: "rowNumber", as: "position" },
      { op: "cumulativeSum", field: "value", as: "running" }
    ]
  });
  const dataset = program.semanticSpec.datasets[1];

  assert.deepEqual(dataset, {
    id: "ranked",
    source: "source",
    transform: [{
      type: "window",
      partitionBy: ["group"],
      sortBy: [{ field: "order", order: "ascending" }],
      operations: [
        { op: "rowNumber", as: "position" },
        { op: "cumulativeSum", field: "value", as: "running" }
      ]
    }],
    values: [
      { group: "A", order: 2, value: 4, position: 2, running: 7 },
      { group: "A", order: 1, value: 3, position: 1, running: 3 },
      { group: "B", order: 1, value: 5, position: 1, running: 5 }
    ]
  });
  assert.equal(source.semanticSpec.datasets.length, 1);
  assert.deepEqual(
    program.trace.children.at(-1).children.map(node => node.op),
    ["createDerivedData", "materializeWindowData"]
  );
  assert.deepEqual(
    program.trace.children.at(-1).children[1].children.map(node => node.op),
    ["editSemantic"]
  );
});

test("uses an explicit source or infers the unique current dataset", () => {
  const inferred = sourceProgram().createWindowData({
    id: "inferred",
    operations: [{ op: "rowNumber", as: "position" }]
  });
  const explicit = sourceProgram().createWindowData({
    id: "explicit",
    source: "source",
    operations: [{ op: "lead", field: "value", as: "next" }]
  });

  assert.equal(inferred.semanticSpec.datasets[1].source, "source");
  assert.deepEqual(inferred.semanticSpec.datasets[1].values.map(row => row.position), [1, 2, 3]);
  assert.deepEqual(explicit.semanticSpec.datasets[1].values.map(row => row.next), [3, 5, null]);
});

test("stores normalized moving frames and materializes sequential moving values", () => {
  const source = chart().createData({ id: "source", values: [
    { group: "A", order: 3, value: 9 },
    { group: "A", order: 1, value: 1 },
    { group: "A", order: 2, value: 5 }
  ] });
  const options = [{
    op: "movingSum",
    field: "value",
    as: "trailingSum",
    frame: { preceding: 1 }
  }, {
    op: "movingMean",
    field: "trailingSum",
    as: "centeredMean",
    frame: { preceding: 1, following: 1 }
  }];
  const program = source.createWindowData({
    id: "moving",
    partitionBy: "group",
    sortBy: [{ field: "order" }],
    operations: options
  });
  const dataset = program.semanticSpec.datasets[1];

  assert.deepEqual(dataset.transform[0].operations, [
    {
      op: "movingSum",
      field: "value",
      as: "trailingSum",
      frame: { preceding: 1, following: 0 }
    },
    {
      op: "movingMean",
      field: "trailingSum",
      as: "centeredMean",
      frame: { preceding: 1, following: 1 }
    }
  ]);
  assert.deepEqual(dataset.values.map(row => [row.trailingSum, row.centeredMean]), [
    [14, 10],
    [1, 3.5],
    [6, 7]
  ]);
  options[0].frame.preceding = 0;
  assert.equal(dataset.transform[0].operations[0].frame.preceding, 1);
  assert.equal(source.semanticSpec.datasets.length, 1);
});

test("composes after filtering and can feed ordinary marks", () => {
  const program = chart()
    .createCanvas({ width: 400, height: 300, margin: 40 })
    .createData({ id: "source", values: rows })
    .filterData({
      id: "groupA",
      source: "source",
      field: "group",
      oneOf: ["A"]
    })
    .createWindowData({
      id: "rankedA",
      operations: [{ op: "rowNumber", as: "position" }]
    })
    .createPointMark({ id: "points", data: "rankedA" })
    .encodeX({ target: "points", field: "position" })
    .encodeY({ target: "points", field: "value" });

  assert.equal(program.semanticSpec.datasets[2].source, "groupA");
  assert.equal(program.graphicSpec.objects.points.items.length, 2);
});

test("replays the registered window materializer for a facet child", () => {
  const transform = {
    type: "window",
    partitionBy: [],
    sortBy: [{ field: "order", order: "ascending" }],
    operations: [{ op: "rowNumber", as: "position" }]
  };
  const program = sourceProgram().replayDerivedData({
    id: "cellWindow",
    source: "source",
    transform
  });
  const action = program.trace.children.at(-1);

  assert.equal(action.op, "replayDerivedData");
  assert.deepEqual(action.children.map(node => node.op), [
    "createDerivedData", "materializeWindowData"
  ]);
  assert.deepEqual(
    program.semanticSpec.datasets[1].values.map(row => row.position),
    [3, 1, 2]
  );
});

test("facets source rows before replaying window values in every child", () => {
  const base = chart()
    .createCanvas({ width: 320, height: 220, margin: 30 })
    .createData({ id: "source", values: [
      { facet: "left", order: 3, value: 30 },
      { facet: "left", order: 1, value: 10 },
      { facet: "right", order: 2, value: 20 },
      { facet: "right", order: 1, value: 10 }
    ] })
    .createWindowData({
      id: "ranked",
      sortBy: [{ field: "order" }],
      operations: [{ op: "rowNumber", as: "position" }]
    })
    .createPointMark({ id: "points", data: "ranked" })
    .encodeX({ target: "points", field: "position" })
    .encodeY({ target: "points", field: "value" });
  const faceted = base.facet({ field: "facet", guides: { legend: false } });

  for (const id of faceted.compositionSpec.children) {
    const child = faceted.children[id];
    const replayed = child.semanticSpec.datasets.find(dataset =>
      dataset.id.startsWith(`${id}-ranked-data`)
    );
    assert.ok(replayed);
    assert.deepEqual(replayed.values.map(row => row.position).sort(), [1, 2]);
    assert.equal(child.semanticSpec.layers[0].data, replayed.id);
    assert.equal(
      child.trace.children.at(-1).children.some(node => node.op === "replayDerivedData"),
      true
    );
  }
});

test("replays moving windows independently after facet partitioning", () => {
  const base = chart()
    .createCanvas({ width: 320, height: 220, margin: 30 })
    .createData({ id: "source", values: [
      { facet: "left", order: 2, value: 30 },
      { facet: "left", order: 1, value: 10 },
      { facet: "right", order: 2, value: 20 },
      { facet: "right", order: 1, value: 10 }
    ] })
    .createWindowData({
      id: "moving",
      sortBy: [{ field: "order" }],
      operations: [{
        op: "movingMean",
        field: "value",
        as: "movingMean",
        frame: { preceding: 1 }
      }]
    })
    .createPointMark({ id: "points", data: "moving" })
    .encodeX({ target: "points", field: "order" })
    .encodeY({ target: "points", field: "movingMean" });
  const faceted = base.facet({ field: "facet", guides: { legend: false } });
  const expected = new Map([
    ["left", [20, 10]],
    ["right", [15, 10]]
  ]);

  for (const id of faceted.compositionSpec.children) {
    const child = faceted.children[id];
    const sourceRows = child.semanticSpec.datasets.find(dataset =>
      dataset.id === `${id}-data`
    ).values;
    const replayed = child.semanticSpec.datasets.find(dataset =>
      dataset.id.startsWith(`${id}-moving-data`)
    );
    assert.deepEqual(
      replayed.values.map(row => row.movingMean),
      expected.get(sourceRows[0].facet)
    );
  }
});

test("rejects duplicate IDs and invalid calls without changing the source", () => {
  const source = sourceProgram();
  const created = source.createWindowData({
    id: "ranked",
    operations: [{ op: "rowNumber", as: "position" }]
  });

  assert.throws(
    () => created.createWindowData({
      id: "ranked",
      operations: [{ op: "rowNumber", as: "another" }]
    }),
    /Dataset "ranked" already exists/
  );
  assert.throws(
    () => source.createWindowData({
      id: "invalid",
      operations: [{ op: "cumulativeSum", field: "value", as: "value" }]
    }),
    /output field "value" already exists/
  );
  assert.throws(
    () => chart().createWindowData({
      id: "missingSource",
      operations: [{ op: "rowNumber", as: "position" }]
    }),
    /Source dataset id/
  );
  assert.equal(source.semanticSpec.datasets.length, 1);
});

test("owns operation options and lag defaults deeply", () => {
  const fallback = { missing: true };
  const operations = [{
    op: "lag",
    field: "value",
    as: "previous",
    default: fallback
  }];
  const program = sourceProgram().createWindowData({
    id: "lagged",
    operations
  });

  fallback.missing = false;
  operations[0].as = "changed";
  assert.deepEqual(program.semanticSpec.datasets[1].values[0].previous, {
    missing: true
  });
  assert.equal(program.semanticSpec.datasets[1].transform[0].operations[0].as, "previous");
});
