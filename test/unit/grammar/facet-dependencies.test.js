import assert from "node:assert/strict";
import test from "node:test";

import {
  collectFacetScaleBindings,
  planFacetDependencies,
  resolveFacetFamily
} from "../../../src/grammar/facets/dependencies.js";
import { expectedFacetReplay } from "../../oracles/facet-dependencies.js";

const rows = [
  { x: 1, y: 2, group: "A" },
  { x: 2, y: 3, group: "B" }
];

function source(id = "cars") {
  return { id, values: rows };
}

function derived(id, sourceId, type, extra = {}) {
  return {
    id,
    source: sourceId,
    transform: [{ type, ...extra }],
    values: []
  };
}

test("plans direct, prefiltered, and regression branch dependencies", () => {
  const direct = planFacetDependencies({
    datasets: [source()],
    layers: [{ id: "points", data: "cars" }]
  }, { field: "group" });
  assert.equal(direct.anchor, "cars");
  assert.deepEqual(direct.replay, []);

  const datasets = [
    source(),
    derived("selected", "cars", "filter", { field: "x", range: [1, 2] }),
    derived("fit", "selected", "regression", { x: "x", y: "y" })
  ];
  const semanticSpec = {
    datasets,
    layers: [
      { id: "points", data: "selected" },
      { id: "fitLine", data: "fit" }
    ]
  };
  const plan = planFacetDependencies(semanticSpec, { field: "group" });

  assert.equal(plan.anchor, "selected");
  assert.deepEqual(plan.replay.map(entry => entry.id), ["fit"]);
  assert.deepEqual(plan.replay.map(entry => entry.kind), ["statistical"]);
  assert.deepEqual(plan.layers, [
    { id: "points", data: "selected" },
    { id: "fitLine", data: "fit" }
  ]);
  assert.equal(Object.isFrozen(plan), true);
  assert.equal(Object.isFrozen(plan.replay), true);

  const explicitRoot = planFacetDependencies(semanticSpec, {
    field: "group",
    data: "cars"
  });
  assert.equal(explicitRoot.anchor, "cars");
  assert.deepEqual(
    explicitRoot.replay.map(entry => entry.id),
    expectedFacetReplay({
      anchor: "cars",
      datasets,
      layerData: { points: "selected", fitLine: "fit" }
    })
  );
});

test("orders divergent filter and box sibling branches topologically", () => {
  const datasets = [
    source(),
    derived("left", "cars", "filter", { field: "x", range: [1, 2] }),
    derived("right", "cars", "filter", { field: "y", range: [2, 3] }),
    derived("summary", "left", "boxSummary", { category: "group", field: "y" }),
    derived("outliers", "left", "boxOutlier", { category: "group", field: "y" }),
    derived("density", "right", "density", { field: "x", as: ["value", "density"] })
  ];
  const layerData = {
    box: "summary",
    boxOutliers: "outliers",
    densityArea: "density"
  };
  const plan = planFacetDependencies({
    datasets,
    layers: Object.entries(layerData).map(([id, data]) => ({ id, data }))
  }, { field: "group" });

  assert.equal(plan.anchor, "cars");
  assert.deepEqual(
    plan.replay.map(entry => entry.id),
    expectedFacetReplay({ anchor: "cars", datasets, layerData })
  );
  assert.deepEqual(plan.replay.map(entry => entry.id), [
    "left", "right", "summary", "outliers", "density"
  ]);
});

test("rejects cycles, missing ancestors, unsupported transforms, and ambiguous roots", () => {
  assert.throws(
    () => planFacetDependencies({
      datasets: [
        derived("a", "b", "filter"),
        derived("b", "a", "filter")
      ],
      layers: [{ id: "points", data: "a" }]
    }, { field: "group" }),
    /cycle/
  );
  assert.throws(
    () => planFacetDependencies({
      datasets: [derived("fit", "missing", "regression")],
      layers: [{ id: "fitLine", data: "fit" }]
    }, { field: "group" }),
    /missing dataset/
  );
  assert.throws(
    () => planFacetDependencies({
      datasets: [source(), derived("selected", "cars", "markFilter")],
      layers: [{ id: "points", data: "selected" }]
    }, { field: "group" }),
    /does not support.*markFilter/
  );
  assert.throws(
    () => planFacetDependencies({
      datasets: [source("left"), source("right")],
      layers: [
        { id: "leftPoints", data: "left" },
        { id: "rightPoints", data: "right" }
      ]
    }, { field: "group" }),
    /do not share one partition anchor/
  );
});

test("rejects invalid explicit anchors and absent facet fields", () => {
  const semanticSpec = {
    datasets: [source(), derived("fit", "cars", "regression")],
    layers: [{ id: "fitLine", data: "fit" }]
  };
  assert.throws(
    () => planFacetDependencies(semanticSpec, { field: "group", data: "fit" }),
    /not a common row-preserving ancestor/
  );
  assert.throws(
    () => planFacetDependencies(semanticSpec, { field: "missing" }),
    /Facet field "missing" is missing/
  );
});

test("classifies Polar and Parallel primary families with canonical bindings", () => {
  const polar = {
    coordinates: [{ id: "polar", type: "polar" }],
    layers: [{ id: "points", data: "cars", coordinate: "polar", mark: { type: "point" },
      encoding: { theta: { scale: "theta" }, radius: { scale: "radius" } } }]
  };
  const parallel = {
    coordinates: [{ id: "parallel", type: "parallel" }],
    layers: [{ id: "paths", data: "cars", coordinate: "parallel", mark: { type: "line" },
      encoding: { parallel: { dimensions: [
        { field: "a", scale: "aScale" }, { field: "b", scale: "bScale" }
      ] } } }]
  };
  assert.equal(resolveFacetFamily(polar).family, "polar");
  assert.equal(resolveFacetFamily(parallel).family, "parallel");
  assert.deepEqual(collectFacetScaleBindings(polar).map(binding =>
    [binding.policyKey, binding.semanticChannel]), [["theta", "theta"], ["r", "radius"]]);
  assert.deepEqual(collectFacetScaleBindings(parallel).map(binding =>
    [binding.policyKey, binding.dimensionField]),
  [["parallelDimensions", "a"], ["parallelDimensions", "b"]]);
  assert.throws(() => resolveFacetFamily({ layers: [
    polar.layers[0],
    { ...parallel.layers[0], id: "paths", data: "cars" }
  ], coordinates: [...polar.coordinates, ...parallel.coordinates] }), /one coordinate family/);
});
