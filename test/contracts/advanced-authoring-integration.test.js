import assert from "node:assert/strict";
import test from "node:test";

import { chart } from "../../src/index.js";

function deepFreeze(value) {
  if (value !== null && typeof value === "object" && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const child of Object.values(value)) deepFreeze(child);
  }
  return value;
}

function dataset(program, id) {
  return program.semanticSpec.datasets.find(candidate => candidate.id === id);
}

function currentDataIds(program) {
  return Object.fromEntries(Object.entries(program.materializationConfigs.data).map(
    ([family, owners]) => [family, Object.fromEntries(Object.entries(owners).map(
      ([owner, state]) => [owner, state.current]
    ))]
  ));
}

function multiply(field, constant) {
  return {
    op: "multiply",
    left: { field },
    right: { constant }
  };
}

test("recomputes a complete derived-data provenance chain and releases every retired revision", () => {
  const rows = deepFreeze([
    { group: "A", t: 0, value: 2, weight: 1 },
    { group: "A", t: 2, value: 6, weight: 3 }
  ]);
  const before = chart()
    .createData({ id: "raw", values: rows })
    .createCompleteData({
      id: "complete",
      source: "raw",
      key: "t",
      groupBy: "group",
      values: [0, 1, 2],
      fill: { weight: 2 }
    })
    .createImputedData({
      id: "imputed",
      source: "complete",
      fields: "value",
      groupBy: "group",
      method: "linear",
      sortBy: [{ field: "t" }]
    })
    .createComputedData({
      id: "computed",
      source: "imputed",
      as: "doubled",
      expression: multiply("value", 2)
    })
    .createNormalizedData({
      id: "normalized",
      source: "computed",
      field: "doubled",
      as: "share",
      groupBy: "group",
      method: "share"
    })
    .createWindowData({
      id: "moving",
      source: "normalized",
      temporalUnit: "timestamp",
      partitionBy: "group",
      sortBy: [{ field: "t" }],
      operations: [{
        op: "movingSum",
        field: "share",
        as: "trailing",
        frame: { duration: { preceding: 1, unit: "millisecond" } }
      }]
    })
    .createSummaryData({
      id: "weighted",
      source: "moving",
      groupBy: "group",
      aggregates: [{ op: "mean", field: "trailing", as: "mean" }],
      weight: { field: "weight", kind: "frequency" }
    });
  const beforeSnapshot = JSON.stringify(before);
  const retiredIds = Object.values(currentDataIds(before)).flatMap(
    owners => Object.values(owners)
  );
  const options = deepFreeze({
    target: "complete",
    fill: { value: 8, weight: 2 },
    dependents: "recompute"
  });

  const after = before.editCompleteData(options);
  const ids = currentDataIds(after);
  const order = [
    ids.complete.complete,
    ids.impute.imputed,
    ids.computed.computed,
    ids.normalize.normalized,
    ids.window.moving,
    ids.summary.weighted
  ];

  assert.deepEqual(before.trace.children.map(node => node.op), [
    "createData",
    "createCompleteData",
    "createImputedData",
    "createComputedData",
    "createNormalizedData",
    "createWindowData",
    "createSummaryData"
  ]);
  assert.equal(after.trace.children.at(-1).op, "editCompleteData");
  assert.deepEqual(options, {
    target: "complete",
    fill: { value: 8, weight: 2 },
    dependents: "recompute"
  });
  assert.equal(JSON.stringify(before), beforeSnapshot);
  assert.equal(new Set(order).size, 6);
  assert.equal(order.every(id => !retiredIds.includes(id)), true);
  assert.equal(retiredIds.every(id => dataset(after, id) === undefined), true);
  assert.deepEqual(after.semanticSpec.datasets.map(value => value.id), ["raw", ...order]);
  assert.deepEqual(order.slice(1).map((id, index) => dataset(after, id).source),
    order.slice(0, -1));
  assert.deepEqual(dataset(after, order[0]).values.map(row => row.value), [2, 8, 6]);
  assert.deepEqual(dataset(after, order[1]).values.map(row => row.value), [2, 8, 6]);
  assert.deepEqual(dataset(after, order[2]).values.map(row => row.doubled), [4, 16, 12]);
  assert.deepEqual(dataset(after, order[3]).values.map(row => row.share), [0.125, 0.5, 0.375]);
  assert.deepEqual(dataset(after, order[4]).values.map(row => row.trailing), [0.125, 0.625, 0.875]);
  assert.deepEqual(dataset(after, order[5]).values, [{ group: "A", mean: 2 / 3 }]);
  assert.deepEqual(dataset(before, "weighted").values, [{
    group: "A",
    mean: 0.611111111111111
  }]);

  const revisionSteps = after.trace.children.at(-1).children[0].children;
  assert.deepEqual(revisionSteps.filter(node => node.op.startsWith("materialize"))
    .map(node => node.op), [
    "materializeCompleteData",
    "materializeImputedData",
    "materializeComputedData",
    "materializeNormalizedData",
    "materializeWindowData",
    "materializeSummaryData"
  ]);
  assert.equal(revisionSteps.filter(node => node.op === "releaseDerivedData").length, 6);
});

test("keeps legends, selected labels, references, themes, and shape details on the final encoding state", () => {
  const rows = deepFreeze([
    { x: 0, y: 1, other: 9, group: "A", magnitude: 10 },
    { x: 1, y: 3, other: 4, group: "B", magnitude: 50 },
    { x: 2, y: 2, other: 12, group: "C", magnitude: 100 }
  ]);
  const initialChannels = deepFreeze({
    target: "points",
    channels: {
      x: { field: "x" },
      y: { field: "y" },
      color: { field: "group" },
      stroke: { field: "group" },
      size: { field: "magnitude", scale: { domain: [0, 100], range: [20, 120] } }
    }
  });
  const before = chart()
    .createCanvas({
      width: 760,
      height: 600,
      margin: { top: 140, right: 240, bottom: 140, left: 90 }
    })
    .createData({ id: "rows", values: rows })
    .createPointMark({
      id: "points",
      stroke: "#111827",
      strokeWidth: 3,
      lineCap: "round",
      lineJoin: "bevel",
      miterLimit: 4
    })
    .encodeChannels(initialChannels)
    .createLegend({ target: "points", channels: ["color", "stroke", "size"] })
    .editLegendBlock({ target: "points", channel: "size", values: [10, 50, 100] })
    .selectMarks({
      id: "selected",
      target: "points",
      field: "other",
      op: "max",
      count: 2
    })
    .createMarkLabels({
      id: "labels",
      source: "points",
      field: "other",
      selection: "selected",
      placement: { anchor: "center" }
    })
    .createReferenceLine({
      id: "mean",
      source: "points",
      axis: "y",
      statistic: { op: "mean" }
    });
  const beforeSnapshot = JSON.stringify(before);
  const revision = deepFreeze({
    target: "points",
    channels: {
      y: { field: "other", scale: { id: "otherY", nice: false, zero: false } },
      stroke: { value: "#0f172a" }
    }
  });
  const labelMap = deepFreeze([
    { value: "A", label: "Alpha" },
    { value: "B", label: "Beta" }
  ]);
  const edited = before
    .encodeChannels(revision)
    .editLegendBlock({
      target: "points",
      channel: "color",
      title: "Group",
      labelMap
    });
  const themed = edited.applyTheme({
    theme: {
      base: "light",
      tokens: {
        mark: "#ff0000",
        background: "#fff7ed",
        grid: "#00aa00",
        fontFamily: "RoadmapTest"
      }
    }
  });
  const styled = themed.editPointMark({
    target: "points",
    strokeWidth: 5,
    lineCap: "square",
    lineJoin: "round",
    miterLimit: 6,
    opacity: 0.75
  });
  const restored = styled.removeTheme();
  const pointLayer = styled.semanticSpec.layers.find(layer => layer.id === "points");

  assert.deepEqual(initialChannels.channels, {
    x: { field: "x" },
    y: { field: "y" },
    color: { field: "group" },
    stroke: { field: "group" },
    size: { field: "magnitude", scale: { domain: [0, 100], range: [20, 120] } }
  });
  assert.deepEqual(revision.channels.stroke, { value: "#0f172a" });
  assert.equal(JSON.stringify(before), beforeSnapshot);
  assert.deepEqual(styled.trace.children.slice(-4).map(node => node.op), [
    "encodeChannels",
    "editLegendBlock",
    "applyTheme",
    "editPointMark"
  ]);
  assert.equal(restored.trace.children.at(-1).op, "removeTheme");
  assert.equal(pointLayer.encoding.y.field, "other");
  assert.equal(pointLayer.encoding.y.scale, "otherY");
  assert.equal(pointLayer.encoding.stroke, undefined);
  assert.deepEqual(styled.graphicSpec.objects.points.items.map(item => item.properties.stroke),
    ["#0f172a", "#0f172a", "#0f172a"]);
  assert.deepEqual(styled.graphicSpec.objects.points.items.map(item => item.properties.fill),
    ["#4c78a8", "#f58518", "#e45756"]);
  assert.deepEqual(styled.graphicSpec.objects.points.items.map(item => [
    item.properties.strokeWidth,
    item.properties.lineCap,
    item.properties.lineJoin,
    item.properties.miterLimit,
    item.properties.opacity
  ]), Array(3).fill([5, "square", "round", 6, 0.75]));
  assert.deepEqual(styled.graphicSpec.objects.colorLegendLabels.items.map(
    item => item.properties.text
  ), ["Alpha", "Beta", "C"]);
  assert.deepEqual(styled.guideConfigs.legend.size.sampling.values, [10, 50, 100]);
  assert.deepEqual(styled.markConfigs.labels.labelAuthoring.selection, {
    kind: "named",
    id: "selected"
  });
  assert.deepEqual(styled.graphicSpec.objects.labels.items.map(
    item => item.properties.text
  ), ["9", "12"]);
  assert.deepEqual(dataset(styled, "mean-statistical-reference-data").values, [{
    value: 25 / 3
  }]);
  assert.equal(styled.graphicSpec.objects.canvas.properties.background, "#fff7ed");
  assert.deepEqual(styled.graphicSpec.objects.labels.items.map(
    item => item.properties.fontFamily
  ), ["RoadmapTest", "RoadmapTest"]);
  assert.equal(restored.graphicSpec.objects.canvas.properties.background, "white");
  assert.deepEqual(restored.graphicSpec.objects.labels.items.map(
    item => item.properties.fontFamily
  ), ["sans-serif", "sans-serif"]);
  assert.deepEqual(restored.graphicSpec.objects.points.items,
    styled.graphicSpec.objects.points.items);
});

const POLAR_FRAME = deepFreeze({
  center: { x: 0.25, y: 0.5 },
  radius: { unit: "fraction", value: 0.8 }
});

const POLAR_ROWS = deepFreeze([
  { panel: "A", angle: 0, radius: 1 },
  { panel: "A", angle: 90, radius: 2 },
  { panel: "B", angle: 0, radius: 10 },
  { panel: "B", angle: 90, radius: 20 }
]);

function polarUnit(values = POLAR_ROWS, canvas = {
  width: 360,
  height: 300,
  margin: 50
}) {
  return chart()
    .createCanvas(canvas)
    .createData({ id: "values", values })
    .createPolarScatterPlot({
      id: "points",
      theta: { field: "angle", scale: { domain: [0, 360], nice: false, zero: false } },
      radius: { field: "radius", scale: { nice: false, zero: false } },
      guides: false
    })
    .createThetaGrid({ coordinate: "polar", scale: "theta", values: [0, 90] })
    .editCoordinate({
      target: "polar",
      aspect: { mode: "frame", ratio: 1 },
      polarFrame: POLAR_FRAME
    })
    .highlightMarks({
      target: "points",
      select: { field: "panel", op: "eq", value: "A" },
      fill: "#ff0066",
      bringToFront: false
    })
    .createMarkLabels({
      id: "labels",
      source: "points",
      field: "radius",
      select: { field: "radius", op: "max" },
      placement: {
        anchor: "outsideEnd",
        gap: 4,
        overflow: "allow"
      }
    });
}

test("replays Polar frame, local domains, headers, labels, highlights, and theme after a revised source", () => {
  const base = polarUnit();
  const baseSnapshot = JSON.stringify(base);
  const shared = base
    .facet({ id: "panels", field: "panel" })
    .editFacetHeaders({
      labelMap: [
        { value: "A", label: "Alpha" },
        { value: "B", label: "Beta" }
      ]
    });
  const independent = shared
    .editFacetScales({ r: "independent" })
    .applyTheme({
      theme: {
        base: "light",
        tokens: {
          background: "#fff7ed",
          grid: "#00aa00",
          fontFamily: "RoadmapTest"
        }
      },
      scope: "descendants"
    });
  const revisedRows = deepFreeze(POLAR_ROWS.map(row => ({
    ...row,
    radius: row.radius * 2
  })));
  const revisedUnit = polarUnit(revisedRows, {
    width: 400,
    height: 360,
    margin: 60
  });
  const replayed = independent.editFacetSource({ program: revisedUnit });
  const children = Object.values(replayed.children);

  assert.equal(JSON.stringify(base), baseSnapshot);
  assert.deepEqual(Object.values(shared.children).map(child =>
    child.resolvedScales.radius.domain), [[1, 20], [1, 20]]);
  assert.deepEqual(children.map(child => child.resolvedScales.radius.domain), [
    [2, 4],
    [20, 40]
  ]);
  assert.deepEqual(children.map(child => child.resolvedScales.radius.range), [
    [0, 48],
    [0, 48]
  ]);
  assert.deepEqual(children.map(child => child.semanticSpec.coordinates[0]),
    Array(2).fill({
      id: "polar",
      type: "polar",
      aspect: { mode: "frame", ratio: 1, alignX: "center", alignY: "center" },
      polarFrame: POLAR_FRAME
    }));
  assert.deepEqual(replayed.graphicSpec.objects["panels-headers"].items.map(
    item => item.properties.text
  ), ["Alpha", "Beta"]);
  assert.deepEqual(children.map(child => child.graphicSpec.objects.labels.items.map(
    item => item.properties.text
  )), [["4"], ["40"]]);
  assert.equal(children.every(child =>
    child.materializationConfigs.selections.pointsSelection.target === "points" &&
    child.materializationConfigs.highlights.pointsSelection.style.fill === "#ff0066"
  ), true);
  assert.deepEqual(children.map(child => child.graphicSpec.objects.points.items.map(
    item => item.properties.fill
  )), [["#ff0066", "#ff0066"], ["#4c78a8", "#4c78a8"]]);
  assert.equal(children.every(child =>
    child.graphicSpec.objects.canvas.properties.width === 400 &&
    child.graphicSpec.objects.canvas.properties.height === 360 &&
    child.graphicSpec.objects.canvas.properties.background === "#fff7ed" &&
    child.graphicSpec.objects.thetaGridLines.items.length === 2
  ), true);
  assert.deepEqual(replayed.trace.children.slice(-5).map(node => node.op), [
    "facet",
    "editFacetHeaders",
    "editFacetScales",
    "applyTheme",
    "editFacetSource"
  ]);
});

test("preserves Parallel siblings across scale, repeat, and facet edits before complete resource cleanup", () => {
  const rows = deepFreeze([
    { panel: "A", a: 1, b: 100, c: 5, d: 50 },
    { panel: "A", a: 2, b: 200, c: 6, d: 60 },
    { panel: "B", a: 10, b: 1000, c: 50, d: 500 },
    { panel: "B", a: 20, b: 2000, c: 60, d: 600 }
  ]);
  const base = chart()
    .createCanvas({ width: 360, height: 260, margin: 50 })
    .createData({ id: "rows", values: rows })
    .createParallelCoordinates({
      id: "paths",
      data: "rows",
      dimensions: [
        { field: "a", scale: { zero: false, nice: false } },
        { field: "b", scale: { zero: false, nice: false } }
      ],
      guides: false
    })
    .createParallelAxes()
    .editParallelAxis({
      field: "a",
      title: { text: "Primary" },
      labels: { format: ".1f" }
    });
  const baseSnapshot = JSON.stringify(base);
  const scaleEdit = deepFreeze({
    target: "paths",
    dimension: "a",
    domain: [0, 20]
  });
  const edited = base.editParallelScale(scaleEdit);
  const dimensions = edited.semanticSpec.layers[0].encoding.parallel.dimensions;
  const [aScale, bScale] = dimensions.map(dimension => dimension.scale);
  const originalB = structuredClone(base.semanticSpec.scales.find(scale =>
    scale.id === bScale
  ));
  const repeatOptions = deepFreeze({
    id: "profiles",
    target: "paths",
    channel: { parallelDimension: "a" },
    fields: ["c", "d"]
  });
  const repeated = edited.repeatCharts(repeatOptions);
  const faceted = edited.facet({
    id: "panels",
    field: "panel",
    scales: { parallelDimensions: "shared" }
  });

  assert.equal(JSON.stringify(base), baseSnapshot);
  assert.deepEqual(scaleEdit, {
    target: "paths",
    dimension: "a",
    domain: [0, 20]
  });
  assert.deepEqual(edited.semanticSpec.scales.find(scale => scale.id === aScale).domain,
    [0, 20]);
  assert.deepEqual(edited.semanticSpec.scales.find(scale => scale.id === bScale),
    originalB);
  assert.deepEqual(Object.values(repeated.children).map(child =>
    child.semanticSpec.layers[0].encoding.parallel.dimensions.map(
      dimension => dimension.field
    )), [["c", "b"], ["d", "b"]]);
  assert.deepEqual(Object.values(repeated.children).map(child =>
    child.graphicSpec.objects.parallelAxisTitles.items.map(
      item => item.properties.text
    )), [["c", "b"], ["d", "b"]]);
  assert.equal(Object.values(repeated.children).every(child =>
    child.semanticSpec.layers[0].encoding.parallel.dimensions[1].scale === bScale
  ), true);
  assert.deepEqual(Object.values(faceted.children).map(child => [
    child.resolvedScales[aScale].domain,
    child.resolvedScales[bScale].domain
  ]), [
    [[0, 20], [100, 2000]],
    [[0, 20], [100, 2000]]
  ]);
  assert.deepEqual(Object.values(faceted.children).map(child =>
    child.graphicSpec.objects.parallelAxisTitles.items.map(
      item => item.properties.text
    )), [["Primary", "b"], ["Primary", "b"]]);
  assert.equal(edited.trace.children.at(-1).op, "editParallelScale");
  assert.equal(repeated.trace.children.at(-1).op, "repeatCharts");
  assert.equal(faceted.trace.children.at(-1).op, "facet");

  const withoutOwner = edited.removeMark({ target: "paths" });
  assert.deepEqual(withoutOwner.semanticSpec.layers, []);
  assert.deepEqual(withoutOwner.semanticSpec.guides, {});
  assert.deepEqual(withoutOwner.guideConfigs, {});
  assert.equal(withoutOwner.context.currentGuide, undefined);
  for (const id of [
    "parallelAxisLines",
    "parallelAxisTicks",
    "parallelAxisLabels",
    "parallelAxisTitles"
  ]) assert.equal(withoutOwner.graphicSpec.objects[id], undefined);

  const cleaned = withoutOwner
    .removeScale({ id: aScale })
    .removeScale({ id: bScale })
    .removeData({ id: "rows" })
    .removeCoordinate({ id: "parallel" });
  assert.deepEqual(cleaned.semanticSpec.datasets, []);
  assert.deepEqual(cleaned.semanticSpec.scales, []);
  assert.deepEqual(cleaned.semanticSpec.coordinates, []);
  assert.deepEqual(Object.keys(cleaned.graphicSpec.objects), ["canvas", "plot-main"]);
  assert.deepEqual(cleaned.trace.children.slice(-5).map(node => node.op), [
    "removeMark",
    "removeScale",
    "removeScale",
    "removeData",
    "removeCoordinate"
  ]);
});
