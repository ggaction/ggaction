import assert from "node:assert/strict";
import test from "node:test";

import { chart } from "../../../../src/ChartProgram.js";

const rows = Object.freeze([
  Object.freeze({ id: "a", amount: 0, grade: "high", score: 50 }),
  Object.freeze({ id: "b", amount: 10, grade: "low", score: 100 })
]);

function base(values = rows) {
  return chart()
    .createCanvas({ width: 160, height: 260, margin: 20 })
    .createData({ id: "values", values })
    .createLineMark({ id: "parallelLines" });
}

test("atomically encodes ordered mixed Parallel dimensions", () => {
  const program = base().encodeParallelCoordinates({
    target: "parallelLines",
    dimensions: [
      { field: "amount", scale: { domain: [0, 10] } },
      { field: "grade", fieldType: "ordinal", scale: { domain: ["low", "high"] } },
      { field: "score", scale: { domain: [0, 100] } }
    ],
    key: "id"
  });
  const layer = program.semanticSpec.layers[0];

  assert.equal(layer.coordinate, "parallel");
  assert.deepEqual(program.semanticSpec.coordinates, [
    { id: "parallel", type: "parallel" }
  ]);
  assert.deepEqual(
    layer.encoding.parallel.dimensions.map(dimension => [
      dimension.field,
      dimension.fieldType,
      dimension.scale
    ]),
    [
      ["amount", "quantitative", "parallelLines-parallel-0"],
      ["grade", "ordinal", "parallelLines-parallel-1"],
      ["score", "quantitative", "parallelLines-parallel-2"]
    ]
  );
  assert.deepEqual(
    program.graphicSpec.objects.parallelLines.items[0].properties.commands,
    [
      { op: "M", x: 20, y: 240 },
      { op: "L", x: 80, y: 185 },
      { op: "L", x: 140, y: 130 }
    ]
  );
  assert.equal(program.trace.children.at(-1).op, "encodeParallelCoordinates");
});

test("supports missing policies and stable source-row identity", () => {
  const values = [
    { a: 0, b: null, c: 5, d: 10 },
    { a: 10, b: 3, c: 2, d: 0 }
  ];
  const broken = base(values).encodeParallelCoordinates({
    target: "parallelLines",
    dimensions: ["a", "b", "c", "d"]
  });
  const dropped = base(values).encodeParallelCoordinates({
    target: "parallelLines",
    dimensions: ["a", "b", "c", "d"],
    missing: "drop-row"
  });

  assert.deepEqual(
    broken.graphicSpec.objects.parallelLines.items[0].properties.commands
      .map(command => command.op),
    ["M", "L"]
  );
  assert.equal(dropped.graphicSpec.objects.parallelLines.items.length, 1);
  assert.deepEqual(
    broken.selectMarks({
      target: "parallelLines",
      field: "a",
      op: "eq",
      value: 0
    })
      .materializationConfigs.selections.parallelLinesSelection.selector,
    { grain: "item", field: "a", op: "eq", value: 0 }
  );
  assert.throws(
    () => base(values).encodeParallelCoordinates({
      target: "parallelLines",
      dimensions: ["a", "b", "c", "d"],
      missing: "error"
    }),
    /missing dimension/
  );
});

test("treats the Parallel key as a dataset field rather than a resource id", () => {
  const values = [
    { "row key": "first", amount: 0, score: 5 },
    { "row key": "second", amount: 10, score: 8 }
  ];
  const program = base(values).encodeParallelCoordinates({
    target: "parallelLines",
    dimensions: ["amount", "score"],
    key: "row key"
  });

  assert.equal(
    program.semanticSpec.layers[0].encoding.parallel.key,
    "row key"
  );
  assert.equal(program.graphicSpec.objects.parallelLines.items.length, 2);
});

test("rejects invalid Parallel assignments without changing the prior program", () => {
  const before = base();
  const serialized = JSON.stringify(before);

  assert.throws(
    () => before.encodeParallelCoordinates({
      target: "parallelLines",
      dimensions: ["amount", "amount"]
    }),
    /unique fields/
  );
  assert.throws(
    () => before.encodeParallelCoordinates({
      target: "parallelLines",
      dimensions: [
        { field: "amount", scale: { id: "custom" } },
        "score"
      ]
    }),
    /Unknown .* option "id"/
  );
  assert.throws(
    () => base([{ id: "a", amount: 1, score: 2 }, { id: "a", amount: 2, score: 3 }])
      .encodeParallelCoordinates({
        target: "parallelLines",
        dimensions: ["amount", "score"],
        key: "id"
      }),
    /Duplicate Parallel key/
  );
  assert.equal(JSON.stringify(before), serialized);
});

test("rematerializes Parallel dimensions after Canvas, data, and scale edits", () => {
  const before = base().encodeParallelCoordinates({
    target: "parallelLines",
    dimensions: ["amount", "score"]
  });
  const resized = before.editCanvas({ width: 220 });
  const reversed = resized.editScale({
    id: "parallelLines-parallel-0",
    reverse: true
  });

  assert.notDeepEqual(resized.graphicSpec, before.graphicSpec);
  assert.equal(
    reversed.graphicSpec.objects.parallelLines.items[0].properties.commands[0].y,
    20
  );
  assert.equal(
    before.graphicSpec.objects.parallelLines.items[0].properties.commands[0].y,
    240
  );
});
