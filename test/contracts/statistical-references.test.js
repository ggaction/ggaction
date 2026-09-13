import assert from "node:assert/strict";
import test from "node:test";

import { chart } from "../../src/index.js";
import { renderToSVG } from "../../src/renderers/svg.js";
import { assertChartProgramsEquivalent } from "../support/chart-equivalence.js";
import { assertRenderedPNG } from "../support/png.js";

function source(values = [2, 4, 6]) {
  return chart()
    .createCanvas({ width: 480, height: 320, margin: 40 })
    .createData({
      values: values.map((y, index) => ({ x: index, y, other: y * 10 }))
    })
    .createPointMark({ id: "points" })
    .encodeX({
      field: "x", fieldType: "quantitative",
      scale: { nice: false, zero: false }
    })
    .encodeY({
      field: "y", fieldType: "quantitative",
      scale: { nice: false, zero: false }
    });
}

function dataset(program, id) {
  return program.semanticSpec.datasets.find(candidate => candidate.id === id);
}

function referenceValues(program, id) {
  const dataId = program.markConfigs[id].statisticalReference.dataId;
  return dataset(program, dataId).values[0];
}

function layer(program, id) {
  return program.semanticSpec.layers.find(candidate => candidate.id === id);
}

test("stores normalized statistical reference recipes and exact one-row values", () => {
  const program = source([0, 10, 20, 30])
    .createReferenceLine({
      id: "average",
      source: "points",
      axis: "y",
      statistic: { op: "mean" }
    })
    .createReferenceBand({
      id: "middle",
      source: "points",
      axis: "y",
      statistics: [
        { op: "quantile", p: 0.25 },
        { op: "quantile", p: 0.75 }
      ]
    });

  assert.deepEqual(referenceValues(program, "average"), { value: 15 });
  assert.deepEqual(referenceValues(program, "middle"), {
    lower: 7.5,
    upper: 22.5
  });
  assert.deepEqual(program.markConfigs.average.statisticalReference, {
    source: "points",
    axis: "y",
    population: "boundData",
    field: { kind: "axis" },
    statistics: [{ op: "mean" }],
    dataId: "average-statistical-reference-data"
  });
  assert.deepEqual(
    dataset(program, "average-statistical-reference-data").transform,
    [{ type: "statisticalReference", target: "average" }]
  );
  assert.equal(layer(program, "average").encoding.y.field, "value");
  assert.equal(layer(program, "middle").encoding.y.field, "lower");
  assert.equal(layer(program, "middle").encoding.y2.field, "upper");

  const equal = source().createReferenceBand({
    id: "equal",
    source: "points",
    axis: "y",
    statistics: [{ op: "mean" }, { op: "median" }]
  });
  assert.deepEqual(referenceValues(equal, "equal"), { lower: 4, upper: 4 });
  assert.deepEqual(equal.graphicSpec.objects.equal.items, []);
});

test("matches literal Rule and Rect output through Canvas, SVG, and PNG", async () => {
  const base = source([0, 10, 20, 30]);
  const statistics = Object.freeze([
    Object.freeze({ op: "quantile", p: 0.25 }),
    Object.freeze({ op: "quantile", p: 0.75 })
  ]);
  const dynamic = base
    .createReferenceBand({
      id: "middle",
      source: "points",
      axis: "y",
      statistics
    })
    .createReferenceLine({
      id: "average",
      source: "points",
      axis: "y",
      statistic: Object.freeze({ op: "mean" })
    });
  const literal = base
    .createReferenceBand({ id: "middle", y: [7.5, 22.5] })
    .createReferenceLine({ id: "average", y: 15 });

  assertChartProgramsEquivalent({
    publicProgram: dynamic,
    primitiveProgram: literal,
    compareSemanticSpec: false
  });
  assert.equal(renderToSVG(dynamic), renderToSVG(literal));
  const options = {
    width: 480,
    height: 320,
    colors: ["#4c78a8", "#64748b"],
    minimumInkPixels: 100
  };
  const dynamicPng = await assertRenderedPNG(dynamic, {
    ...options,
    name: "statistical-reference-dynamic"
  });
  const literalPng = await assertRenderedPNG(literal, {
    ...options,
    name: "statistical-reference-literal"
  });
  assert.equal(dynamicPng.pixelHash, literalPng.pixelHash);
});

test("distinguishes bound rows from visible items and ignores selections", () => {
  const base = source()
    .createReferenceLine({
      id: "bound",
      source: "points",
      axis: "y",
      population: "boundData",
      statistic: { op: "mean" }
    })
    .createReferenceLine({
      id: "visible",
      source: "points",
      axis: "y",
      population: "visibleItems",
      statistic: { op: "mean" }
    });
  const selected = base.selectMarks({
    id: "large",
    target: "points",
    field: "y",
    op: "gt",
    value: 3
  });
  assert.deepEqual(referenceValues(selected, "bound"), { value: 4 });
  assert.deepEqual(referenceValues(selected, "visible"), { value: 4 });

  const filtered = selected.filterMarks({
    target: "points",
    field: "y",
    op: "gt",
    value: 3
  });
  assert.deepEqual(referenceValues(filtered, "bound"), { value: 4 });
  assert.deepEqual(referenceValues(filtered, "visible"), { value: 5 });
  assert.equal(
    dataset(filtered, "bound-statistical-reference-data").source,
    "data"
  );
  assert.equal(
    dataset(filtered, "visible-statistical-reference-data").source,
    "pointsFilteredData"
  );
  const restored = filtered.removeMarkFilter({ target: "points" });
  assert.deepEqual(referenceValues(restored, "bound"), { value: 4 });
  assert.deepEqual(referenceValues(restored, "visible"), { value: 4 });
});

test("axis bindings follow source re-encoding while explicit fields persist", () => {
  const base = source()
    .createReferenceLine({
      id: "axisRole",
      source: "points",
      axis: "y",
      statistic: { op: "mean" }
    })
    .createReferenceLine({
      id: "explicitField",
      source: "points",
      axis: "y",
      field: "y",
      statistic: { op: "mean" }
    });
  const edited = base.encodeY({
    target: "points",
    field: "other",
    scale: { id: "otherY", nice: false, zero: false }
  });

  assert.deepEqual(referenceValues(edited, "axisRole"), { value: 40 });
  assert.deepEqual(referenceValues(edited, "explicitField"), { value: 4 });
  assert.equal(layer(edited, "axisRole").encoding.y.scale, "otherY");
  assert.equal(layer(edited, "explicitField").encoding.y.scale, "otherY");
  assert.deepEqual(
    edited.markConfigs.explicitField.statisticalReference.field,
    { kind: "explicit", field: "y" }
  );
});

test("keeps statistical values out of automatic source scale domains", () => {
  const program = chart()
    .createCanvas({ width: 480, height: 320, margin: 40 })
    .createData({ values: [{ x: 0, y: 0, far: 100 }, { x: 1, y: 1, far: 200 }] })
    .createPointMark({ id: "points" })
    .encodeX({ field: "x", scale: { nice: false, zero: false } })
    .encodeY({ field: "y", scale: { nice: false, zero: false } })
    .createReferenceLine({
      id: "farMean",
      source: "points",
      axis: "y",
      field: "far",
      statistic: { op: "mean" }
    });

  assert.deepEqual(referenceValues(program, "farMean"), { value: 150 });
  assert.deepEqual(program.resolvedScales.y.domain, [0, 1]);
  assert.ok(program.graphicSpec.objects.farMean.items[0].properties.y1 < 40);
});

test("follows binned scales without joining their scale policy", () => {
  const program = chart()
    .createCanvas({ width: 300, height: 200, margin: 30 })
    .createData({ values: [
      { value: 1 }, { value: 2 }, { value: 3 }, { value: 4 }
    ] })
    .createHistogram({
      id: "histogram",
      field: "value",
      maxBins: 2,
      guides: false
    })
    .createReferenceLine({
      id: "midpoint",
      source: "histogram",
      axis: "x",
      statistic: { op: "mean" }
    });

  assert.deepEqual(referenceValues(program, "midpoint"), { value: 2.5 });
  assert.deepEqual(program.resolvedScales.x.domain, [0, 4]);
  assert.equal(program.graphicSpec.objects.midpoint.items[0].properties.x1, 180);
});

test("recomputes after derived edits and removes the owned closure", () => {
  const multiply = constant => ({
    op: "multiply",
    left: { field: "y" },
    right: { constant }
  });
  const original = chart()
    .createCanvas({ width: 480, height: 320, margin: 40 })
    .createData({ id: "raw", values: [
      { x: 1, y: 2 }, { x: 2, y: 4 }, { x: 3, y: 6 }
    ] })
    .createComputedData({
      id: "derived",
      source: "raw",
      as: "value",
      expression: multiply(1)
    })
    .createPointMark({ id: "points", data: "derived" })
    .encodeX({ field: "x" })
    .encodeY({ field: "value" })
    .createReferenceLine({
      id: "average",
      source: "points",
      axis: "y",
      statistic: { op: "mean" }
    });
  const edited = original.editComputedData({
    target: "derived",
    expression: multiply(2)
  });
  assert.deepEqual(referenceValues(original, "average"), { value: 4 });
  assert.deepEqual(referenceValues(edited, "average"), { value: 8 });
  assert.match(
    dataset(edited, "average-statistical-reference-data").source,
    /^derivedComputedDataRevision/
  );

  const withoutReference = edited.removeMark({ target: "average" });
  assert.equal(layer(withoutReference, "points")?.id, "points");
  assert.equal(dataset(withoutReference, "average-statistical-reference-data"), undefined);
  const withoutSource = original.removeMark({ target: "points" });
  assert.deepEqual(withoutSource.semanticSpec.layers, []);
  assert.equal(dataset(withoutSource, "average-statistical-reference-data"), undefined);
});

test("computes facet-cell statistics from each partition", () => {
  const base = chart()
    .createCanvas({ width: 320, height: 220, margin: 30 })
    .createData({ values: [
      { group: "A", x: 1, y: 2 },
      { group: "A", x: 2, y: 4 },
      { group: "B", x: 1, y: 10 },
      { group: "B", x: 2, y: 20 }
    ] })
    .createPointMark({ id: "points" })
    .encodeX({ field: "x", scale: { nice: false, zero: false } })
    .encodeY({ field: "y", scale: { nice: false, zero: false } })
    .createReferenceLine({
      id: "average",
      source: "points",
      axis: "y",
      statistic: { op: "mean" }
    });
  const faceted = base.facet({
    field: "group",
    guides: { legend: false }
  });
  const values = faceted.compositionSpec.children.map(id =>
    referenceValues(faceted.children[id], "average").value
  );
  assert.deepEqual(values, [3, 15]);
});

test("rejects invalid dynamic recipes atomically", () => {
  const base = source([0, 10, 20, 30]);
  const snapshot = JSON.stringify([
    base.semanticSpec,
    base.graphicSpec,
    base.materializationConfigs,
    base.trace
  ]);
  const invalid = [
    ["createReferenceLine", {
      source: "points", axis: "y", statistic: { op: "quantile", p: 1.1 }
    }],
    ["createReferenceLine", {
      source: "points", axis: "y", y: 2, statistic: { op: "mean" }
    }],
    ["createReferenceLine", {
      source: "points", axis: "y", statistics: [{ op: "mean" }]
    }],
    ["createReferenceBand", {
      source: "points", axis: "y",
      statistics: [{ op: "max" }, { op: "min" }]
    }]
  ];
  for (const [method, options] of invalid) {
    assert.throws(() => base[method](options));
    assert.equal(JSON.stringify([
      base.semanticSpec,
      base.graphicSpec,
      base.materializationConfigs,
      base.trace
    ]), snapshot);
  }

  const empty = chart()
    .createCanvas({ width: 480, height: 320, margin: 40 })
    .createData({ values: [] })
    .createPointMark({ id: "points" })
    .encodeX({
      field: "x", fieldType: "quantitative", scale: { domain: [0, 1] }
    })
    .encodeY({
      field: "y", fieldType: "quantitative", scale: { domain: [0, 1] }
    });
  assert.throws(() => empty.createReferenceLine({
    source: "points", axis: "y", statistic: { op: "mean" }
  }), /at least one value/);
  assert.throws(() => base.createReferenceLine({
    id: "missingField",
    source: "points",
    axis: "y",
    field: "missing",
    statistic: { op: "mean" }
  }), /missing/);
  assert.throws(() => source([0, Number.NaN, 10]).createReferenceLine({
    source: "points",
    axis: "y",
    statistic: { op: "mean" }
  }), /finite/);
  const missing = source().createReferenceLine({ y: 4 });
  assert.throws(() => missing.createReferenceLine({
    id: "dynamic",
    source: "referenceLine",
    axis: "y",
    statistic: { op: "mean" }
  }), /non-reference/);

  const line = chart()
    .createCanvas({ width: 480, height: 320, margin: 40 })
    .createData({ values: [{ x: 1, y: 2 }, { x: 2, y: 4 }] })
    .createLineMark({ id: "series" })
    .encodeX({ field: "x" })
    .encodeY({ field: "y" });
  assert.throws(() => line.createReferenceLine({
    source: "series",
    axis: "y",
    population: "visibleItems",
    statistic: { op: "mean" }
  }), /ambiguous for series/);
});
