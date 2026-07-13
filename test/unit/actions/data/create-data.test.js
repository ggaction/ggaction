import assert from "node:assert/strict";
import test from "node:test";

import { chart } from "../../../../src/core/ChartProgram.js";

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
