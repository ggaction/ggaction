import assert from "node:assert/strict";
import test from "node:test";

import { chart } from "../../../../src/index.js";
import { mapOrdinalPositionValues } from "../../../../src/grammar/scales/index.js";

const rows = Object.freeze([
  { category: "A", value: 1, id: "a1" },
  { category: "A", value: 2, id: "a2" },
  { category: "A", value: 2, id: "a3" },
  { category: "A", value: 4, id: "a4" },
  { category: "B", value: 2, id: "b1" },
  { category: "B", value: 3, id: "b2" },
  { category: "B", value: 3, id: "b3" },
  { category: "B", value: 6, id: "b4" }
]);

function base(values = rows) {
  return chart()
    .createCanvas({ width: 700, height: 480, margin: 70 })
    .createData({ id: "source", values });
}

function owner(program) {
  return Object.entries(program.markConfigs)
    .find(([, config]) => config.raincloudPlot !== undefined);
}

function create(options = {}) {
  return base().createRaincloudPlot({
    id: "rain",
    data: "source",
    category: "category",
    value: "value",
    points: { packing: { key: "id" } },
    guides: false,
    ...options
  });
}

test("creates the default half-cloud, box summary, and Beeswarm from one source", () => {
  const program = create();
  const [ownerId, config] = owner(program);
  const rain = config.raincloudPlot;
  assert.equal(ownerId, "rainCloud");
  assert.deepEqual(rain.childIds, {
    cloud: "rainCloud", summary: "rainSummary", points: "rainPoints"
  });
  assert.deepEqual(rain.ownedChildIds, ["rainCloud", "rainSummary", "rainPoints"]);
  assert.equal(rain.orientation, "vertical");
  assert.equal(rain.side, "before");
  assert.equal(program.semanticSpec.layers.find(layer => layer.id === "rainCloud").data,
    "rainCloudDensityData");
  assert.equal(program.semanticSpec.datasets.find(dataset => dataset.id ===
    "rainCloudDensityData").source, "source");
  assert.equal(program.semanticSpec.datasets.find(dataset => dataset.id ===
    "rainSummarySummaryData").source, "source");
  assert.equal(program.semanticSpec.layers.find(layer => layer.id === "rainPoints").data,
    "source");
  assert.equal(program.semanticSpec.datasets.find(dataset => dataset.id ===
    "rainCloudDensityData").transform[0].placement.side, "left");
  for (const id of ["rainCloud", "rainSummary", "rainPoints"]) {
    const layer = program.semanticSpec.layers.find(candidate => candidate.id === id);
    assert.equal(layer.encoding.x.scale, "rainCategory");
    assert.equal(layer.encoding.y.scale, "rainValue");
  }
  const categoryScale = program.resolvedScales.rainCategory;
  const centers = mapOrdinalPositionValues(["A", "B"], categoryScale);
  const summaryCenters = program.graphicSpec.objects.rainSummary.items.map(item =>
    item.properties.x + item.properties.width / 2);
  assert.deepEqual(summaryCenters, centers.map(value => value + categoryScale.bandwidth * 0.22));
  assert.equal(program.graphicSpec.objects.rainPoints.items.every((item, index) =>
    item.properties.x > centers[rows[index].category === "A" ? 0 : 1]
  ), true);
  const trace = program.trace.children.at(-1);
  assert.equal(trace.op, "createRaincloudPlot");
  assert.deepEqual(trace.children.filter(child => [
    "createViolinPlot", "createBoxPlot", "createBeeswarmPlot"
  ].includes(child.op)).map(child => child.op), [
    "createViolinPlot", "createBoxPlot", "createBeeswarmPlot"
  ]);
});

test("maps semantic side across orientation and composes interval plus strip children", () => {
  const program = create({
    orientation: "horizontal",
    side: "after",
    summary: { type: "interval", center: "median", extent: "iqr" },
    points: { type: "strip", jitter: { maxOffset: { band: 0.1 }, key: "id" } }
  });
  const rain = owner(program)[1].raincloudPlot;
  assert.equal(program.semanticSpec.datasets.find(dataset => dataset.id ===
    "rainCloudDensityData").transform[0].placement.side, "bottom");
  const interval = program.semanticSpec.datasets.find(dataset =>
    dataset.id === "rainSummaryIntervalIntervalData").transform[0];
  assert.equal(interval.center, "median");
  assert.equal(interval.extent, "iqr");
  assert.equal(program.materializationConfigs.jitters.rainPoints.channel, "y");
  assert.equal(program.markConfigs.rainSummary.categorySlotOffset.band, -0.22);
  assert.equal(program.markConfigs.rainPoints.categorySlotOffset.channel, "y");
  assert.equal(rain.summary.type, "interval");
  assert.equal(rain.points.type, "strip");
});

test("supports every enabled-component subset and one guide owner", () => {
  const cloud = create({ summary: false, points: false });
  assert.deepEqual(cloud.semanticSpec.layers.map(layer => layer.id), ["rainCloud"]);
  const summary = create({ density: false, points: false, color: "category" });
  assert.equal(owner(summary)[0], "rainSummary");
  assert.equal(summary.semanticSpec.layers.find(layer => layer.id === "rainSummary")
    .encoding.color.field, "category");
  const points = create({ density: false, summary: false, guides: {} });
  assert.equal(owner(points)[0], "rainPoints");
  assert.equal(points.semanticSpec.guides.axis.x.scale, "rainCategory");
  assert.equal(points.semanticSpec.guides.axis.y.scale, "rainValue");
});

test("atomically edits source, orientation, side, and child modes with stable ids", () => {
  const before = create();
  const revisedRows = rows.map(row => ({ ...row, group: row.category, score: row.value * 2 }));
  const withData = before.createData({ id: "revised", values: revisedRows });
  const after = withData.editRaincloudPlot({
    target: "rain",
    data: "revised",
    category: "group",
    value: "score",
    orientation: "horizontal",
    side: "after",
    density: { bandwidth: 0.5 },
    summary: { type: "interval", center: "mean", extent: "stderr" },
    points: { type: "strip", jitter: false }
  });
  const rain = owner(after)[1].raincloudPlot;
  assert.equal(rain.source, "revised");
  assert.equal(rain.category.field, "group");
  assert.equal(rain.value.field, "score");
  assert.equal(rain.orientation, "horizontal");
  assert.equal(rain.side, "after");
  assert.equal(rain.summary.type, "interval");
  assert.equal(rain.points.type, "strip");
  assert.equal(after.semanticSpec.datasets.some(dataset => dataset.id ===
    "rainSummarySummaryData"), false);
  assert.equal(after.semanticSpec.datasets.find(dataset => dataset.id ===
    "rainCloudDensityData").source, "revised");
  assert.equal(before.semanticSpec.datasets.find(dataset => dataset.id ===
    "rainCloudDensityData").source, "source");
  assert.deepEqual(rain.childIds, {
    cloud: "rainCloud", summary: "rainSummary", points: "rainPoints"
  });
});

test("replays category slot offsets through Canvas and lower style edits", () => {
  const before = create();
  const resized = before.editCanvas({ width: 900, height: 520 });
  const scale = resized.resolvedScales.rainCategory;
  const centers = mapOrdinalPositionValues(["A", "B"], scale);
  const boxes = resized.graphicSpec.objects.rainSummary.items.map(item =>
    item.properties.x + item.properties.width / 2);
  assert.deepEqual(boxes, centers.map(value => value + scale.bandwidth * 0.22));
  const styled = resized.encodePointRadius({ target: "rainPoints", value: 5 });
  assert.equal(styled.graphicSpec.objects.rainPoints.items.every(item =>
    item.properties.radius === 5), true);
  assert.equal(styled.markConfigs.rainPoints.categorySlotOffset.band, 0.22);
  assert.equal(before.graphicSpec.objects.canvas.properties.width, 700);
});

test("rejects invalid components, roles, colors, targets, and owned-child removal atomically", () => {
  const before = base();
  const failures = [
    () => before.createRaincloudPlot({ category: "category", value: "value",
      density: false, summary: false, points: false }),
    () => before.createRaincloudPlot({ category: "category", value: "value", side: "near" }),
    () => before.createRaincloudPlot({ category: "category", value: "value",
      summary: { type: "median" } }),
    () => before.createRaincloudPlot({ category: "category", value: "value",
      points: { type: "strip", packing: {} } }),
    () => before.createRaincloudPlot({ category: "category", value: "value", color: "value" })
  ];
  for (const operation of failures) assert.throws(operation);
  assert.equal(before.semanticSpec.layers.length, 0);
  const program = create();
  assert.throws(() => program.editRaincloudPlot({ target: "missing", side: "after" }),
    /Unknown Raincloud/);
  assert.throws(() => program.editRaincloudPlot({ target: "rain" }), /at least one/);
  assert.throws(() => program.removeMark({ target: "rainPoints" }), /owned by "rainCloud"/);
  assert.equal(program.semanticSpec.layers.some(layer => layer.id === "rainPoints"), true);
});

test("removes the parent closure and every owned derived dataset", () => {
  const program = create();
  const removed = program.removeMark({ target: "rainCloud" });
  assert.deepEqual(removed.semanticSpec.layers, []);
  assert.deepEqual(removed.semanticSpec.datasets.map(dataset => dataset.id), ["source"]);
  assert.equal(owner(removed), undefined);
});
