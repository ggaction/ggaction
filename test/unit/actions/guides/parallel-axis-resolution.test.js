import assert from "node:assert/strict";
import test from "node:test";

import {
  requireParallelAxisLayer,
  resolveParallelAxisTarget,
  resolveStyledParallelAxes
} from "../../../../src/actions/guides/axes/parallel/resolve.js";

function program({ layers, coordinates, scales = {} }) {
  return {
    semanticSpec: { layers, coordinates, guides: {} },
    guideConfigs: {},
    resolvedScales: scales,
    graphicSpec: {
      objects: {
        canvas: {
          type: "canvas",
          properties: { width: 220, height: 140 }
        }
      }
    },
    materializationConfigs: {
      canvas: { margin: { top: 10, right: 10, bottom: 10, left: 10 } }
    }
  };
}

const dimensions = Object.freeze([
  Object.freeze({ field: "amount", fieldType: "quantitative", scale: "amount" }),
  Object.freeze({ field: "grade", fieldType: "ordinal", scale: "grade" }),
  Object.freeze({ field: "ratio", fieldType: "quantitative", scale: "ratio" })
]);

function encodedProgram(overrides = {}) {
  return program({
    layers: [{
      id: "lines",
      mark: { type: "line" },
      coordinate: "parallel",
      encoding: { parallel: { dimensions } }
    }],
    coordinates: [{ id: "parallel", type: "parallel" }],
    scales: {
      amount: { type: "linear", domain: [0, 2000], range: [120, 10] },
      grade: { type: "ordinal", domain: ["low", "high"], range: [120, 10] },
      ratio: { type: "log", domain: [1, 100], range: [120, 10], base: 10 }
    },
    ...overrides
  });
}

test("resolves Parallel axis ownership and inferred targets", () => {
  const current = encodedProgram();
  assert.equal(requireParallelAxisLayer(current, "lines").dimensions, dimensions);
  assert.equal(resolveParallelAxisTarget(current), "lines");
  assert.equal(resolveParallelAxisTarget(current, "lines"), "lines");

  assert.throws(() => requireParallelAxisLayer(current, "missing"), /require an encoded/);
  assert.throws(() => requireParallelAxisLayer(program({
    layers: [{
      id: "points",
      mark: { type: "point" },
      coordinate: "parallel",
      encoding: { parallel: { dimensions } }
    }],
    coordinates: [{ id: "parallel", type: "parallel" }]
  }), "points"), /require an encoded/);
  assert.throws(() => resolveParallelAxisTarget(program({
    layers: [],
    coordinates: []
  })), /one Parallel layer cannot be inferred/);
  assert.throws(() => resolveParallelAxisTarget(program({
    layers: [
      ...current.semanticSpec.layers,
      { ...current.semanticSpec.layers[0], id: "other" }
    ],
    coordinates: current.semanticSpec.coordinates
  })), /one Parallel layer cannot be inferred/);
});

test("resolves numeric, ordinal, and transformed ticks into concrete axes", () => {
  const current = encodedProgram();
  const result = resolveStyledParallelAxes(current, dimensions);

  assert.deepEqual(result.bounds, { x: 10, y: 10, width: 200, height: 120 });
  assert.deepEqual(result.axes.map(axis => axis.x), [10, 110, 210]);
  assert.deepEqual(result.axes[1].ticks.values, ["low", "high"]);
  assert.deepEqual(result.axes[1].labels.text, ["low", "high"]);
  assert.equal(result.axes[0].labels.text.includes("2k"), true);
  assert.equal(result.axes[2].ticks.values.includes(10), true);

  assert.throws(() => resolveStyledParallelAxes({
    ...current,
    resolvedScales: { ...current.resolvedScales, ratio: undefined }
  }, dimensions), /requires resolved scale "ratio"/);
});
