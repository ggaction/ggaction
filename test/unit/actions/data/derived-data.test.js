import assert from "node:assert/strict";
import test from "node:test";

import { chart } from "../../../../src/index.js";

const rows = [
  { group: "A", x: 1, y: 2 },
  { group: "B", x: 2, y: 4 }
];

function sourceProgram() {
  return chart().createData({ id: "source", values: rows });
}

test("createDerivedData accepts each documented transform branch as an array", () => {
  const transforms = [
    {
      id: "filtered",
      transform: { type: "filter", field: "group", oneOf: ["A"] }
    },
    {
      id: "regression",
      transform: {
        type: "regression",
        method: "linear",
        x: "x",
        y: "y",
        confidence: 0.95,
        interval: "mean"
      }
    },
    {
      id: "density",
      transform: {
        type: "density",
        field: "x",
        bandwidth: "auto",
        extent: "auto",
        steps: 100,
        kernel: "gaussian",
        normalization: "unit",
        as: ["xValue", "xDensity"],
        resolve: "shared"
      }
    },
    {
      id: "interval",
      transform: {
        type: "interval",
        field: "y",
        groupBy: ["group"],
        center: "mean",
        extent: "ci",
        level: 0.95,
        as: {
          center: "yCenter",
          lower: "yLower",
          upper: "yUpper"
        }
      }
    },
    {
      id: "window",
      transform: {
        type: "window",
        partitionBy: ["group"],
        sortBy: [{ field: "x", order: "ascending" }],
        operations: [{ op: "rowNumber", as: "position" }]
      }
    },
    {
      id: "bin2d",
      transform: {
        type: "bin2d",
        x: "x",
        y: "y",
        bins: { x: 2, y: 2 },
        extent: { x: "auto", y: "auto" },
        includeEmpty: false,
        members: false,
        as: {
          x0: "x0",
          x1: "x1",
          y0: "y0",
          y1: "y1",
          count: "count"
        }
      }
    }
  ];

  for (const { id, transform } of transforms) {
    const program = sourceProgram().createDerivedData({
      id,
      source: "source",
      transform: [transform]
    });
    const derived = program.semanticSpec.datasets.find(
      dataset => dataset.id === id
    );
    assert.equal(derived.source, "source");
    assert.deepEqual(derived.transform, [transform]);
    assert.equal(derived.values, undefined);
  }
});

test("createDerivedData rejects object, empty, multiple, and unknown transform inputs", () => {
  const source = sourceProgram();
  assert.throws(
    () => source.createDerivedData({
      id: "object",
      source: "source",
      transform: { type: "filter", field: "group", oneOf: ["A"] }
    }),
    /exactly one plain object/
  );
  assert.throws(
    () => source.createDerivedData({
      id: "empty",
      source: "source",
      transform: []
    }),
    /exactly one plain object/
  );
  assert.throws(
    () => source.createDerivedData({
      id: "multiple",
      source: "source",
      transform: [
        { type: "filter", field: "group", oneOf: ["A"] },
        { type: "filter", field: "group", oneOf: ["B"] }
      ]
    }),
    /exactly one plain object/
  );
  assert.throws(
    () => source.createDerivedData({
      id: "unknown",
      source: "source",
      transform: [{ type: "unknown" }]
    }),
    /Unsupported dataset transform/
  );
});

test("rebindLayerData records an explicit immutable consumer transition", () => {
  const before = sourceProgram()
    .createPointMark({ id: "points", data: "source" })
    .createDerivedData({
      id: "filtered",
      source: "source",
      transform: [{ type: "filter", field: "group", oneOf: ["A"] }]
    });
  const after = before.rebindLayerData({ id: "points", data: "filtered" });
  const action = after.trace.children.at(-1);

  assert.equal(before.semanticSpec.layers[0].data, "source");
  assert.equal(after.semanticSpec.layers[0].data, "filtered");
  assert.equal(action.op, "rebindLayerData");
  assert.deepEqual(action.children.map(child => child.op), ["editSemantic"]);
  assert.throws(
    () => before.rebindLayerData({ id: "points", data: "missing" }),
    /does not exist/
  );
});

test("createDerivedData structurally owns caller transform inputs", () => {
  const transform = {
    type: "filter",
    field: "group",
    predicate: { op: "eq", value: "A" }
  };
  const transforms = [transform];
  const program = sourceProgram().createDerivedData({
    id: "filtered",
    source: "source",
    transform: transforms
  });

  transform.predicate.value = "B";
  transforms.push({ type: "filter", field: "group", oneOf: ["B"] });

  const stored = program.semanticSpec.datasets[1].transform;
  assert.deepEqual(stored, [{
    type: "filter",
    field: "group",
    predicate: { op: "eq", value: "A" }
  }]);
  assert.equal(Object.isFrozen(stored), true);
  assert.equal(Object.isFrozen(stored[0]), true);
  assert.equal(Object.isFrozen(stored[0].predicate), true);
});
