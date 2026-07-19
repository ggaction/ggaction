import assert from "node:assert/strict";
import test from "node:test";

import {
  findScale,
  findScaleConsumers,
  resolveConsumerValues,
  resolveHistogramCountValues
} from "../../../../src/actions/scales/consumers/index.js";

function program(layer, datasets = []) {
  return {
    semanticSpec: {
      datasets,
      layers: [layer],
      scales: [{ id: "x", type: "linear", domain: "auto", range: "auto" }]
    }
  };
}

test("finds scale definitions and channel consumers", () => {
  const layer = {
    id: "points",
    data: "values",
    mark: { type: "point" },
    encoding: {
      x: { field: "value", fieldType: "quantitative", scale: "x" },
      theta: { field: "value", fieldType: "quantitative", scale: "theta" },
      color: { field: "group", fieldType: "nominal", scale: "color" }
    }
  };
  const current = program(layer, [{ id: "values", values: [] }]);

  assert.equal(findScale(current, "x").id, "x");
  assert.deepEqual(findScaleConsumers(current, "x").map(item => item.channel), ["x"]);
  assert.deepEqual(
    findScaleConsumers(current, "theta").map(item => item.channel),
    ["theta"]
  );
  assert.throws(() => findScale(current, "missing"), /Unknown scale/);
});

test("rejects incomplete or incompatible scale consumers", () => {
  const missingData = {
    id: "points",
    data: "missing",
    mark: { type: "point" },
    encoding: { x: { field: "value", fieldType: "quantitative", scale: "x" } }
  };
  assert.throws(
    () => resolveConsumerValues(program(missingData), {
      layer: missingData,
      channel: "x",
      encoding: missingData.encoding.x
    }),
    /unknown dataset/
  );

  const invalidDash = {
    id: "points",
    data: "values",
    mark: { type: "point" },
    encoding: {
      strokeDash: { field: "group", fieldType: "nominal", scale: "dash" }
    }
  };
  assert.throws(
    () => resolveConsumerValues(
      program(invalidDash, [{ id: "values", values: [{ group: "A" }] }]),
      { layer: invalidDash, channel: "strokeDash", encoding: invalidDash.encoding.strokeDash }
    ),
    /requires a line mark/
  );

  const invalidType = {
    id: "points",
    data: "values",
    mark: { type: "point" },
    encoding: { x: { field: "value", fieldType: "nominal", scale: "x" } }
  };
  assert.throws(
    () => resolveConsumerValues(
      program(invalidType, [{ id: "values", values: [{ value: "A" }] }]),
      { layer: invalidType, channel: "x", encoding: invalidType.encoding.x }
    ),
    /requires a quantitative encoding/
  );
});

test("rejects incomplete histogram count consumers", () => {
  const layer = {
    id: "bars",
    data: "values",
    mark: { type: "bar" },
    encoding: { y: { aggregate: "count", fieldType: "quantitative", scale: "y" } }
  };
  const consumer = { layer, channel: "y", encoding: layer.encoding.y };

  assert.throws(
    () => resolveHistogramCountValues(program(layer), consumer),
    /requires a binned x scale/
  );
});
