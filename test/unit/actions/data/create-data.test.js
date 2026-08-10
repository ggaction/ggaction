import assert from "node:assert/strict";
import test from "node:test";

import { chart } from "../../../../src/ChartProgram.js";

test("creates an immutable dataset and updates currentData", () => {
  const values = [
    { id: 1, nested: { tags: ["a", "b"] } },
    { id: 2, nested: { tags: ["c"] } }
  ];
  const empty = chart();
  const program = empty.createData({ id: "cars", values });

  values[0].nested.tags.push("changed");
  values.push({ id: 3 });

  assert.deepEqual(empty.semanticSpec.datasets, []);
  assert.deepEqual(program.semanticSpec.datasets, [
    {
      id: "cars",
      values: [
        { id: 1, nested: { tags: ["a", "b"] } },
        { id: 2, nested: { tags: ["c"] } }
      ]
    }
  ]);
  assert.equal(program.context.currentData, "cars");
  assert.equal(Object.isFrozen(program.semanticSpec.datasets[0].values), true);
  assert.equal(
    Object.isFrozen(program.semanticSpec.datasets[0].values[0].nested.tags),
    true
  );
});

test("infers one stable dataset id and requires a name after that", () => {
  const first = chart().createData({ values: [{ x: 1 }] });

  assert.equal(first.semanticSpec.datasets[0].id, "data");
  assert.equal(first.context.currentData, "data");
  assert.deepEqual(first.trace.children[0].args, { valuesCount: 1 });
  assert.throws(
    () => first.createData({ values: [] }),
    /requires an explicit dataset id because its default is ambiguous/
  );
  assert.deepEqual(
    first.createData({ id: "other", values: [] })
      .semanticSpec.datasets.map(dataset => dataset.id),
    ["data", "other"]
  );
});

test("records lightweight nested data actions", () => {
  const program = chart().createData({
    id: "cars",
    values: [{ x: 1 }, { x: 2 }]
  });
  const createNode = program.trace.children[0];

  assert.equal(createNode.op, "createData");
  assert.deepEqual(createNode.args, { id: "cars", valuesCount: 2 });
  assert.equal(createNode.children.length, 1);
  assert.equal(createNode.children[0].op, "editSemantic");
  assert.deepEqual(createNode.children[0].args, {
    property: "dataset[cars].values",
    valueCount: 2
  });
  assert.deepEqual(program.actionStack, []);
});

test("supports empty and multiple datasets", () => {
  const program = chart()
    .createData({ id: "cars", values: [] })
    .createData({ id: "fit", values: [{ x: 1, y: 2 }] });

  assert.deepEqual(
    program.semanticSpec.datasets.map(dataset => dataset.id),
    ["cars", "fit"]
  );
  assert.equal(program.context.currentData, "fit");
  assert.equal(program.editData, undefined);
});

test("owns deeply nested rows and unusual scalar cells", () => {
  const values = [{
    nested: { arrays: [[1], [{ flag: true }]] },
    nullable: null,
    missing: undefined,
    notANumber: Number.NaN,
    infinity: Number.POSITIVE_INFINITY,
    large: 12n
  }];
  const program = chart().createData({ id: "values", values });

  values[0].nested.arrays[1][0].flag = false;

  const stored = program.semanticSpec.datasets[0].values[0];
  assert.equal(stored.nested.arrays[1][0].flag, true);
  assert.equal(stored.nullable, null);
  assert.equal(stored.missing, undefined);
  assert.equal(Number.isNaN(stored.notANumber), true);
  assert.equal(stored.infinity, Number.POSITIVE_INFINITY);
  assert.equal(stored.large, 12n);
  assert.equal(Object.isFrozen(stored.nested.arrays[1][0]), true);
});

test("rejects invalid and duplicate datasets", () => {
  assert.throws(
    () => chart().createData({ id: "cars data", values: [] }),
    /Dataset id must contain/
  );
  assert.throws(
    () => chart().createData({ id: "cars", values: {} }),
    /values to be an array/
  );
  assert.throws(
    () => chart().createData({ id: "cars", values: [1] }),
    /every row to be a plain object/
  );
  assert.throws(
    () => chart().createData({ id: "cars", values: [], url: "cars.json" }),
    /Unknown createData option/
  );

  const program = chart().createData({ id: "cars", values: [] });
  assert.throws(
    () => program.createData({ id: "cars", values: [] }),
    /already exists/
  );
});
