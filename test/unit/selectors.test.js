import assert from "node:assert/strict";
import test from "node:test";

import {
  findCoordinate,
  findDataset,
  findLayer,
  findSemanticScale,
  hasDataset,
  hasLayer,
  requireCoordinate,
  requireDataset,
  requireLayer,
  requireResolvedScale,
  requireSemanticScale,
  resolveEligibleLayer
} from "../../src/selectors/index.js";

function program() {
  return {
    semanticSpec: {
      datasets: [{ id: "cars" }],
      layers: [
        { id: "points", mark: { type: "point" } },
        { id: "lines", mark: { type: "line" } }
      ],
      scales: [{ id: "x", type: "linear" }],
      coordinates: [{ id: "main", type: "cartesian" }]
    },
    resolvedScales: {
      x: { type: "linear", domain: [0, 1], range: [0, 100] }
    },
    context: { currentMark: "points" }
  };
}

test("finds, checks, and requires named semantic resources", () => {
  const value = program();
  assert.equal(findDataset(value, "cars").id, "cars");
  assert.equal(hasDataset(value, "cars"), true);
  assert.equal(requireDataset(value, "cars").id, "cars");
  assert.equal(findLayer(value, "points").id, "points");
  assert.equal(hasLayer(value, "points"), true);
  assert.equal(requireLayer(value, "points").id, "points");
  assert.equal(findCoordinate(value, "main").type, "cartesian");
  assert.equal(requireCoordinate(value, "main").id, "main");
  assert.equal(findSemanticScale(value, "x").type, "linear");
  assert.equal(requireSemanticScale(value, "x").id, "x");
  assert.equal(requireResolvedScale(value, "x", "linear").domain[1], 1);

  assert.throws(() => requireDataset(value, "missing"), /does not exist/);
  assert.throws(() => requireLayer(value, "missing"), /does not exist/);
  assert.throws(() => requireCoordinate(value, "missing"), /Unknown coordinate/);
  assert.throws(() => requireSemanticScale(value, "missing"), /Unknown scale/);
  assert.throws(
    () => requireResolvedScale(value, "x", "ordinal"),
    /Expected resolved ordinal scale/
  );
  assert.throws(
    () => requireResolvedScale(value, "missing"),
    /Unknown resolved scale/
  );
});

test("resolves explicit, current, unique, missing, and ambiguous layers", () => {
  const value = program();
  const point = layer => layer.mark.type === "point";
  const any = () => true;

  assert.equal(resolveEligibleLayer(value, {
    target: "points",
    predicate: point,
    label: "point"
  }).id, "points");
  assert.equal(resolveEligibleLayer(value, {
    predicate: point,
    label: "point"
  }).id, "points");
  assert.equal(resolveEligibleLayer(value, {
    predicate: layer => layer.mark.type === "line",
    label: "line",
    current: null
  }).id, "lines");
  assert.throws(() => resolveEligibleLayer(value, {
    target: "missing",
    predicate: point,
    label: "point"
  }), /Unknown point target/);
  assert.throws(() => resolveEligibleLayer(value, {
    predicate: () => false,
    label: "shape",
    current: null
  }), /requires an eligible layer/);
  assert.throws(() => resolveEligibleLayer(value, {
    predicate: any,
    label: "mark",
    current: null
  }), /target is ambiguous/);
});
