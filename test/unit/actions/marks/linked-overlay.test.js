import test from "node:test";
import assert from "node:assert/strict";
import { chart } from "../../../../src/index.js";
import { serializeProgram, deserializeProgram } from "../../../../src/persistence.js";
import { resolveMarkItems } from "../../../../src/materialization/selection/policies/index.js";
import { POINT_SHAPES } from "../../../../src/grammar/pointShapes.js";

const rows = [
  { x: "A", y: 10, group: "one" }, { x: "A", y: 20, group: "one" },
  { x: "B", y: 15, group: "one" }, { x: "B", y: 25, group: "two" },
  { x: "A", y: 5, group: "two" }
];
function bars({ values = rows, horizontal = false, color } = {}) {
  const category = { field: "x", fieldType: "nominal" };
  const measure = { field: "y", fieldType: "quantitative", aggregate: "sum" };
  return chart().createCanvas({ plot: { width: 300, height: 200 }, margin: 60 })
    .createData({ id: "data", values })
    .createBarPlot({ id: "bars", data: "data", x: horizontal ? measure : category,
      y: horizontal ? category : measure, ...(color ? { color } : {}), guides: false });
}
const commands = p => p.graphicSpec.objects.trend.items.flatMap(item => item.properties.commands);
function assertEndpoints(p, horizontal = false) {
  const endpoints = p.graphicSpec.objects.bars.items.map(item => ({
    x: item.properties.x + (horizontal ? item.properties.width : item.properties.width / 2),
    y: item.properties.y + (horizontal ? item.properties.height / 2 : 0)
  }));
  const positions = commands(p).map(({ x, y }) => ({ x, y }));
  const sorted = values => values.toSorted((a, b) => a.x - b.x || a.y - b.y);
  assert.deepEqual(sorted(positions), sorted(endpoints));
}

test("linked line follows aggregate results and subsequent source edits", () => {
  const base = bars();
  const p = base.createOverlay({ id: "trend", source: "bars" });
  assert.equal(commands(p).length, 2);
  assertEndpoints(p);
  const mean = p.encodeY({ target: "bars", field: "y", aggregate: "mean" });
  assertEndpoints(mean);
  assert.notDeepEqual(commands(mean), commands(p));
  assert.equal(base.semanticSpec.layers.length, 1);
  assert.equal(p.trace.children.at(-1).op, "createOverlay");
});
test("horizontal and grouped bars keep their actual category slot centers", () => {
  for (const horizontal of [false, true]) {
    const p = bars({ horizontal, color: { field: "group", layout: "group" } })
      .createOverlay({ id: "trend", source: "bars" });
    assert.equal(p.graphicSpec.objects.trend.items.length, 2);
    assertEndpoints(p, horizontal);
  }
});
test("stack and normalized stack follow cumulative endpoints", () => {
  for (const layout of ["stack", "fill"]) {
    const p = bars({ color: { field: "group", layout } }).createOverlay({ id: "trend", source: "bars" });
    assertEndpoints(p);
    const total = p.editOverlay({ target: "trend", series: "total" });
    assert.equal(commands(total).length, 2);
    const high = Math.min(...p.graphicSpec.objects.bars.items.map(item => item.properties.y));
    assert.equal(Math.min(...commands(total).map(point => point.y)), high);
  }
});
test("points follow final aggregate cells, not source row count", () => {
  const p = bars().createOverlay({ id: "points", source: "bars", type: "point" });
  assert.equal(p.graphicSpec.objects.points.items.length, 2);
  const styled = p.encodeSize({ target: "points", value: 100 })
    .encodeColor({ target: "points", value: "#ff0000" });
  for (const item of styled.graphicSpec.objects.points.items) {
    assert.equal(item.properties.fill, "#ff0000");
    assert.ok(Math.abs(Math.PI * item.properties.radius ** 2 - 100) < 1e-9);
  }
});
test("overlay survives serialization and source guide rebuilding", () => {
  const p = bars().createOverlay({ id: "trend", source: "bars" }).createGuides();
  const restored = deserializeProgram(serializeProgram(p));
  assert.deepEqual(restored.graphicSpec, p.graphicSpec);
  assertEndpoints(restored.encodeY({ target: "bars", field: "y", aggregate: "mean" }));
});
test("invalid overlay dependencies and position overrides leave input untouched", () => {
  const base = bars();
  assert.throws(() => base.createOverlay({ source: "absent" }), /absent/);
  const p = base.createOverlay({ id: "trend", source: "bars" });
  assert.throws(() => p.createOverlay({ source: "trend" }), /source|eligible|independent/i);
  assert.throws(() => p.editOverlay({ target: "trend", source: "trend" }), /itself/);
  assert.throws(() => p.encodeY({ target: "trend", field: "y" }), /source|detach/);
  assert.throws(() => p.removeMark({ target: "bars" }), /reference|depend|used/i);
  assert.equal(p.semanticSpec.layers.length, 2);
});

test("source color reassignment updates inherited grouping, but explicit overlay color stays independent", () => {
  const p = bars().createOverlay({ id: "trend", source: "bars" });
  const grouped = p.encodeColor({ target: "bars", field: "group", layout: "group" });
  assertEndpoints(grouped);
  assert.equal(grouped.graphicSpec.objects.trend.items.length, 2);
  const fixed = grouped.encodeColor({ target: "trend", value: "red" })
    .editColorScale({ target: "bars", palette: "set1" });
  assert.ok(fixed.graphicSpec.objects.trend.items.every(item => item.properties.stroke === "red"));
});
test("point appearance scales and selections use aggregate endpoint values", () => {
  const p = bars().createOverlay({ id: "points", source: "bars", type: "point" })
    .encodeSize({ target: "points", field: "y", scale: { domain: [0, 40], range: [0, 400] } });
  const items = resolveMarkItems(p, "points");
  assert.deepEqual(items.map(item => item.channels.y), [35, 40]);
  assert.deepEqual(items.map(item => item.members.length), [3, 2]);
  const areas = p.graphicSpec.objects.points.items.map(item => Math.PI * item.properties.radius ** 2);
  assert.ok(Math.abs(areas[0] - 350) < 1e-8);
  assert.ok(Math.abs(areas[1] - 400) < 1e-8);
});
test("negative stacked endpoints follow both sides of the zero baseline", () => {
  const p = bars({ values: [{ x: "A", y: -4, group: "one" }, { x: "A", y: -6, group: "two" },
    { x: "B", y: -3, group: "one" }, { x: "B", y: 9, group: "two" }], color: { field: "group", layout: "diverging" } })
    .createOverlay({ id: "trend", source: "bars" });
  const values = resolveMarkItems(p, "bars");
  const scale = p.resolvedScales[p.semanticSpec.layers.find(layer => layer.id === "bars").encoding.y.scale];
  const mapped = values.map(item => scale.range[0] + (item.channels.y2 - scale.domain[0]) /
    (scale.domain[1] - scale.domain[0]) * (scale.range[1] - scale.range[0]));
  assert.deepEqual(commands(p).map(point => point.y).sort((a, b) => a - b), mapped.sort((a, b) => a - b));
});
test("source scatter anchors stay centered for every glyph shape", () => {
  const base = chart().createCanvas({ plot: { width: 240, height: 180 }, margin: 50 })
    .createData({ values: [{ x: 1, y: 2 }, { x: 2, y: 5 }, { x: 3, y: 4 }] })
    .createScatterPlot({ id: "points", x: "x", y: "y", guides: false });
  const original = base.graphicSpec.objects.points.items.map(item => ({ x: item.properties.x, y: item.properties.y }));
  for (const shape of POINT_SHAPES) {
    const p = base.editPointMark({ target: "points", shape }).createOverlay({ id: "trend", source: "points", orderBy: "x" });
    commands(p).forEach((point, index) => {
      assert.ok(Math.abs(point.x - original[index].x) < 1e-8, shape);
      assert.ok(Math.abs(point.y - original[index].y) < 1e-8, shape);
    });
  }
  assert.throws(() => base.createOverlay({ source: "points" }), /orderBy/);
});
test("facets rebuild the overlay independently inside each cell", () => {
  const p = bars({ color: { field: "group", layout: "stack" } })
    .createOverlay({ id: "trend", source: "bars" })
    .facet({ field: "group", data: "data", columns: 2, gap: 12 });
  assert.equal(Object.keys(p.children).length, 2);
  for (const child of Object.values(p.children)) assertEndpoints(child);
  assert.deepEqual(deserializeProgram(serializeProgram(p)).graphicSpec, p.graphicSpec);
});
test("detach freezes final geometry and severs source dependencies", () => {
  const p = bars({ color: { field: "group", layout: "group" } })
    .createOverlay({ id: "trend", source: "bars" });
  const detached = p.editOverlay({ target: "trend", follow: false });
  assert.deepEqual(detached.graphicSpec.objects.trend, p.graphicSpec.objects.trend);
  const changed = detached.encodeY({ target: "bars", field: "y", aggregate: "mean" });
  assert.deepEqual(changed.graphicSpec.objects.trend, detached.graphicSpec.objects.trend);
  const removed = changed.removeMark({ target: "bars" });
  assert.equal(removed.semanticSpec.layers.length, 1);
  assert.deepEqual(deserializeProgram(serializeProgram(removed)).graphicSpec, removed.graphicSpec);
});

test("histogram results use bin centers, including rebinning", () => {
  let p = chart().createCanvas({ plot: { width: 240, height: 180 }, margin: 50 })
    .createData({ values: [{ x: 1, y: 2 }, { x: 2, y: 5 }, { x: 3, y: 4 }, { x: 8, y: 3 }] })
    .createBarPlot({ id: "bars", x: { field: "x", bin: { maxBins: 4 } }, y: { field: "y", aggregate: "sum" }, guides: false })
    .createOverlay({ id: "trend", source: "bars" });
  assertEndpoints(p);
  p = p.encodeX({ target: "bars", field: "x", bin: { maxBins: 2 } });
  assertEndpoints(p);
});
test("area overlays follow the field boundary rather than its constant baseline", () => {
  for (const horizontal of [false, true]) {
    const p = chart().createCanvas({ plot: { width: 240, height: 180 }, margin: 50 })
      .createData({ values: [{ x: 1, y: 2 }, { x: 2, y: 5 }, { x: 3, y: 4 }] })
      .createAreaPlot({ id: "area", x: horizontal ? "y" : "x", y: horizontal ? "x" : "y",
        valueChannel: horizontal ? "x" : "y", guides: false })
      .createOverlay({ id: "trend", source: "area" });
    const scale = p.resolvedScales[p.semanticSpec.layers.find(layer => layer.id === "area").encoding[horizontal ? "x" : "y"].scale];
    const expected = [2, 5, 4].map(value => scale.range[0] + (value - scale.domain[0]) /
      (scale.domain[1] - scale.domain[0]) * (scale.range[1] - scale.range[0]));
    assert.deepEqual(commands(p).map(point => point[horizontal ? "x" : "y"]), expected);
  }
});
test("line result points retain the aggregate grain", () => {
  const p = chart().createCanvas({ plot: { width: 240, height: 180 }, margin: 50 })
    .createData({ values: rows }).createLinePlot({ id: "line", x: { field: "x", fieldType: "nominal" },
      y: { field: "y", aggregate: "mean" }, guides: false })
    .createOverlay({ id: "points", source: "line", type: "point" });
  const points = p.graphicSpec.objects.points.items;
  assert.equal(points.length, 2);
  assert.deepEqual(points.map(item => ({ x: item.properties.x, y: item.properties.y })),
    p.graphicSpec.objects.line.items[0].properties.commands.map(({ x, y }) => ({ x, y })));
});

test("missing category gaps break or connect the same final bar endpoints", () => {
  const p = bars({ values: [{ x: "A", y: 4 }, { x: "C", y: 8 }] })
    .editXScale({ target: "bars", domain: ["A", "B", "C"] })
    .createOverlay({ id: "trend", source: "bars" });
  assert.equal(p.graphicSpec.objects.trend.items.length, 2);
  const connected = p.editOverlay({ target: "trend", missing: "connect" });
  assert.equal(connected.graphicSpec.objects.trend.items.length, 1);
  assertEndpoints(connected);
});
test("linked geometry edits reject instead of silently changing ignored settings", () => {
  const p = bars().createOverlay({ id: "trend", source: "bars" })
    .createOverlay({ id: "points", source: "bars", type: "point" });
  const before = serializeProgram(p);
  for (const invoke of [
    () => p.encodeGroup({ target: "trend", field: "group" }),
    () => p.encodeXOffset({ target: "points", field: "group" }),
    () => p.encodePathOrder({ target: "trend", field: "y" }),
    () => p.removeEncoding({ target: "trend", channel: "x" }),
    () => p.editLineMark({ target: "trend", missing: "skip" }),
    () => p.editPointMark({ target: "points", missing: "skip" }),
    () => p.jitterPoints({ target: "points", channel: "x", maxOffset: { pixels: 8 } })
  ]) assert.throws(invoke, /source|detach|unsupported|channel/i);
  assert.equal(serializeProgram(p), before);
});
test("removing inherited overlay color remains removed after source palette changes", () => {
  const p = bars({ color: { field: "group", layout: "stack" } })
    .createOverlay({ id: "trend", source: "bars" })
    .removeEncoding({ target: "trend", channel: "color" })
    .editColorScale({ target: "bars", palette: "set1" });
  assert.equal(p.semanticSpec.layers.find(layer => layer.id === "trend").encoding.color, undefined);
  assert.equal(new Set(p.graphicSpec.objects.trend.items.map(item => item.properties.stroke)).size, 1);
});
test("incomplete sources fail with an actionable position requirement", () => {
  const p = chart().createCanvas().createData({ values: rows }).createPointMark({ id: "points" }).encodeX({ target: "points", field: "x", fieldType: "nominal" });
  assert.throws(() => p.createOverlay({ source: "points", orderBy: "x" }), /complete x and y/);
});
