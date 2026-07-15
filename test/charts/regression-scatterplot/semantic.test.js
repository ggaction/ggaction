import assert from "node:assert/strict";
import test from "node:test";

import { chart } from "../../../src/index.js";

test("stores derived-data provenance and regression layer channels", () => {
  const program = chart()
    .createData({ id: "cars", values: [{ x: 1, y: 2, group: "A" }] })
    .editSemantic({ property: "dataset[selected].source", value: "cars" })
    .editSemantic({
      property: "dataset[selected].transform",
      value: [{ type: "filter", field: "group", oneOf: ["A"] }]
    })
    .editSemantic({
      property: "dataset[selected].values",
      value: [{ x: 1, y: 2, group: "A" }]
    })
    .editSemantic({ property: "dataset[fit].source", value: "selected" })
    .editSemantic({
      property: "dataset[fit].transform",
      value: [{
        type: "regression",
        method: "linear",
        x: "x",
        y: "y",
        groupBy: "group",
        confidence: 0.95,
        interval: "mean"
      }]
    })
    .editSemantic({ property: "dataset[fit].values", value: [] })
    .editSemantic({
      property: "layer[band].encoding.y2.field",
      value: "upper"
    })
    .editSemantic({
      property: "layer[points].encoding.shape.field",
      value: "group"
    })
    .editSemantic({
      property: "layer[band].encoding.group.field",
      value: "group"
    })
    .editSemantic({
      property: "guide.legend.series.channels",
      value: ["color", "shape"]
    });

  assert.deepEqual(program.semanticSpec.datasets.slice(1), [
    {
      id: "selected",
      source: "cars",
      transform: [{ type: "filter", field: "group", oneOf: ["A"] }],
      values: [{ x: 1, y: 2, group: "A" }]
    },
    {
      id: "fit",
      source: "selected",
      transform: [{
        type: "regression",
        method: "linear",
        x: "x",
        y: "y",
        groupBy: "group",
        confidence: 0.95,
        interval: "mean"
      }],
      values: []
    }
  ]);
  assert.deepEqual(program.semanticSpec.layers, [
    { id: "band", encoding: { y2: { field: "upper" }, group: { field: "group" } } },
    { id: "points", encoding: { shape: { field: "group" } } }
  ]);
  assert.deepEqual(program.semanticSpec.guides.legend.series.channels, [
    "color",
    "shape"
  ]);
  assert.equal(Object.isFrozen(program.semanticSpec.datasets[1].transform[0]), true);
});

test("validates derived-data transform contracts", () => {
  const base = chart().createData({ id: "cars", values: [] });

  assert.throws(
    () => base.editSemantic({
      property: "dataset[selected].source",
      value: "missing"
    }),
    /Unknown source dataset/
  );
  assert.throws(
    () => base.editSemantic({
      property: "dataset[selected].transform",
      value: [{ type: "filter", field: "Origin", oneOf: [] }]
    }),
    /oneOf must be a non-empty array/
  );
  assert.throws(
    () => base.editSemantic({
      property: "dataset[fit].transform",
      value: [{
        type: "regression",
        method: "unknown",
        x: "x",
        y: "y",
        confidence: 0.95,
        interval: "mean"
      }]
    }),
    /Unsupported regression method/
  );
  assert.throws(
    () => base.editSemantic({
      property: "dataset[fit].transform",
      value: [{
        type: "regression",
        method: "linear",
        x: "x",
        y: "y",
        confidence: 1,
        interval: "mean"
      }]
    }),
    /confidence must be between 0 and 1/
  );
  assert.throws(
    () => base.editSemantic({
      property: "dataset[fit].transform",
      value: [{
        type: "regression",
        method: "linear",
        x: "x",
        y: "y",
        confidence: 0.95,
        interval: "unknown"
      }]
    }),
    /Unsupported regression interval/
  );
});

test("accepts regression method and interval provenance", () => {
  const base = chart().createData({ id: "cars", values: [] });
  const polynomial = base
    .editSemantic({ property: "dataset[quadratic].source", value: "cars" })
    .editSemantic({
      property: "dataset[quadratic].transform",
      value: [{
        type: "regression",
        method: "polynomial",
        x: "x",
        y: "y",
        degree: 2,
        confidence: 0.95,
        interval: "prediction"
      }]
    });
  const loess = polynomial
    .editSemantic({ property: "dataset[local].source", value: "cars" })
    .editSemantic({
      property: "dataset[local].transform",
      value: [{
        type: "regression",
        method: "loess",
        x: "x",
        y: "y",
        span: 0.55
      }]
    });

  assert.equal(polynomial.semanticSpec.datasets[1].transform[0].degree, 2);
  assert.equal(loess.semanticSpec.datasets[2].transform[0].span, 0.55);
  assert.throws(
    () => base.editSemantic({
      property: "dataset[invalid].transform",
      value: [{
        type: "regression",
        method: "loess",
        x: "x",
        y: "y",
        span: 0.55,
        confidence: 0.95
      }]
    }),
    /does not support degree or intervals/
  );
});
