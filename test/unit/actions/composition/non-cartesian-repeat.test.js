import assert from "node:assert/strict";
import test from "node:test";

import { chart } from "../../../../src/index.js";

const rows = Object.freeze([
  Object.freeze({ angle: 0, bearing: 10, radius: 1, distance: 10, a: 0, b: 100, c: 5 }),
  Object.freeze({ angle: 90, bearing: 20, radius: 2, distance: 20, a: 1, b: 200, c: 6 })
]);

function source() {
  return chart().createCanvas({ width: 240, height: 220, margin: 30 })
    .createData({ id: "values", values: rows });
}

test("repeats Polar Point and Line theta/r field roles with independent defaults", () => {
  for (const operation of ["createPolarScatterPlot", "createPolarLinePlot"]) {
    const base = source()[operation]({
      id: "mark", theta: "angle",
      radius: { field: "radius", scale: { zero: false, nice: false } },
      guides: false
    });
    const theta = base.repeatCharts({ channel: "theta", fields: ["angle", "bearing"] });
    const radius = base.repeatCharts({ channel: "r", fields: ["radius", "distance"] });
    assert.deepEqual(Object.values(theta.children).map(child =>
      child.semanticSpec.layers[0].encoding.theta.field), ["angle", "bearing"]);
    assert.deepEqual(Object.values(radius.children).map(child =>
      child.semanticSpec.layers[0].encoding.radius.field), ["radius", "distance"]);
    assert.equal(theta.compositionSpec.facet.scales.theta, "independent");
    assert.equal(radius.compositionSpec.facet.scales.r, "independent");
  }
});

test("repeats direct Arc and Rose roles while rejecting Pie and Radar roles", () => {
  const direct = source().createArcMark({ id: "mark" })
    .encodeTheta({ field: "angle" });
  const rose = source().createRosePlot({
    id: "mark", category: "angle", value: "radius", aggregate: "sum", guides: false
  });
  const directRepeat = direct.repeatCharts({
    channel: "theta", fields: ["angle", "bearing"]
  });
  const roseRepeat = rose.repeatCharts({
    channel: "r", fields: ["radius", "distance"]
  });
  assert.deepEqual(Object.values(directRepeat.children).map(child =>
    child.semanticSpec.layers[0].encoding.theta.field), ["angle", "bearing"]);
  assert.deepEqual(Object.values(roseRepeat.children).map(child =>
    child.semanticSpec.layers[0].encoding.radius.field), ["radius", "distance"]);

  const pie = source().createPiePlot({ category: "angle", guides: false });
  const radarRows = ["a", "b", "c"].map((category, index) => ({
    category, value: index + 1, other: index + 2
  }));
  const radar = chart().createCanvas().createData({ values: radarRows })
    .createRadarPlot({ category: "category", value: "value", guides: false });
  assert.throws(
    () => pie.repeatCharts({ channel: "theta", fields: ["angle", "bearing"] }),
    /eligible complete mark/
  );
  assert.throws(
    () => radar.repeatCharts({ channel: "r", fields: ["value", "other"] }),
    /eligible complete mark/
  );
});

test("repeats exactly one Parallel dimension and preserves sibling roles", () => {
  const base = source().createParallelCoordinates({
    id: "mark",
    dimensions: [
      { field: "a", title: "Primary", scale: { zero: false, nice: false } },
      { field: "b", scale: { zero: false, nice: false } }
    ],
    guides: false
  });
  const repeated = base.repeatCharts({
    channel: { parallelDimension: "a" }, fields: ["a", "c"]
  });
  assert.deepEqual(Object.values(repeated.children).map(child =>
    child.semanticSpec.layers[0].encoding.parallel.dimensions.map(dimension =>
      [dimension.field, dimension.title])), [
    [["a", "Primary"], ["b", "b"]],
    [["c", "Primary"], ["b", "b"]]
  ]);
  assert.equal(repeated.compositionSpec.facet.scales.parallelDimensions, "independent");
  assert.deepEqual(repeated.compositionSpec.facet.repeat.channel, {
    parallelDimension: "a"
  });
  assert.throws(
    () => base.repeatCharts({ channel: {}, fields: ["c"] }),
    /exactly one.*parallelDimension/
  );
  assert.throws(
    () => base.repeatCharts({
      channel: { parallelDimension: "a" }, fields: ["b"]
    }),
    /unique fields/
  );
});

test("repeats a Polar role together with its attached label lifecycle", () => {
  const base = source().createPolarScatterPlot({
    id: "mark",
    theta: "angle",
    radius: { field: "radius", scale: { zero: false, nice: false } },
    guides: false
  }).createMarkLabels({
    id: "labels", source: "mark", field: "radius"
  });
  const repeated = base.repeatCharts({
    target: "mark", channel: "r", fields: ["radius", "distance"]
  });

  assert.deepEqual(Object.values(repeated.children).map(child =>
    child.semanticSpec.layers.map(layer => [layer.id, layer.source])), [
    [["mark", undefined], ["labels", "mark"]],
    [["mark", undefined], ["labels", "mark"]]
  ]);
  assert.deepEqual(Object.values(repeated.children).map(child =>
    child.graphicSpec.objects.labels.items.map(item => item.properties.text)), [
    ["1", "2"],
    ["1", "2"]
  ]);
  assert.deepEqual(Object.values(repeated.children).map(child =>
    child.graphicSpec.objects.labels.items.map(item => item.properties.y)), [
    [110, 30],
    [110, 30]
  ]);
  assert.throws(
    () => base.createTextMark({ id: "note", data: "values" })
      .repeatCharts({
        target: "mark", channel: "r", fields: ["radius", "distance"]
      }),
    /Facet text layer "note" requires a text encoding/
  );
});

test("repeats a primary mark together with its statistical-reference dependent", () => {
  const base = source()
    .createPointMark({ id: "mark", data: "values" })
    .encodeX({ target: "mark", field: "a" })
    .encodeY({ target: "mark", field: "b" })
    .createReferenceLine({
      id: "average", source: "mark", axis: "y", statistic: { op: "mean" }
    });
  const repeated = base.repeatCharts({
    target: "mark", channel: "x", fields: ["a", "c"]
  });

  assert.equal(Object.values(repeated.children).every(child =>
    child.semanticSpec.layers.some(layer => layer.id === "average") &&
    child.markConfigs.average.statisticalReference.source === "mark" &&
    child.graphicSpec.objects.average.items.length === 1), true);
});
