import { assertEquivalentMeaning } from "../../../support/identity-equivalence.js";
import assert from "node:assert/strict";
import test from "node:test";
import { chart } from "../../../../src/index.js";
import { chart as basicChart } from "../../../../src/basic.js";
import { serializeProgram, deserializeProgram } from "../../../../src/persistence.js";
import { renderToSVG } from "../../../../src/renderers/svg.js";
import { decodeValue, encodeSharedValue } from "../../../../src/persistence/codec.js";
import { getErrorDetails } from "../../../../src/core/diagnostics.js";

const triangle = { polygon: [{ x: -1.5, y: -1.5 }, { x: 1.5, y: -1.5 }, { x: 0, y: 1.5 }] };
const square = { polygon: [{ x: -1, y: -1 }, { x: 1, y: -1 }, { x: 1, y: 1 }, { x: -1, y: 1 }], normalization: "radius" };
const rows = [{ x: .25, y: .5, g: "A" }, { x: .5, y: .5, g: "B" }, { x: .75, y: .5, g: "C" }];
function base(factory = chart) {
  return factory().createCanvas({ width: 600, height: 300, margin: { left: 50, right: 200, top: 40, bottom: 40 } })
    .createData({ values: rows });
}
function point(factory = chart, shape = triangle) {
  return base(factory).createPointMark({ id: "points", shape, fill: "blue" })
    .encodeX({ field: "x", scale: { domain: [0, 1] } })
    .encodeY({ field: "y", scale: { domain: [0, 1] } })
    .encodePointRadius({ value: 2 });
}
const paths = p => p.graphicSpec.objects.points.items.map(i => i.properties.commands);

test("constant polygon create/edit agree in Full and Basic with stable input copies", () => {
  for (const factory of [chart, basicChart]) {
    const shape = structuredClone(triangle), created = point(factory, shape);
    const edited = point(factory, "circle").editPointMark({ shape });
    assertEquivalentMeaning(edited.graphicSpec, created.graphicSpec);
    assert(created.graphicSpec.objects.points.items.every(i => i.type === "path"));
    const before = structuredClone(created.graphicSpec);
    shape.polygon[0].x = -2;
    assert.deepEqual(created.graphicSpec, before);
    assert.equal(created.markConfigs.points.shape.polygon[0].x, -1.5);
    assert(renderToSVG(created).includes("<path"));
    assert.deepEqual(deserializeProgram(serializeProgram(created)).graphicSpec, created.graphicSpec);
  }
});

test("encoded polygons, unknown fallback and legend samples retain their own normalization", () => {
  const p = point().editPointMark({ shape: "circle" })
    .encodeShape({ field: "g", scale: { domain: ["A", "B"], range: [triangle, square], unknown: square } })
    .createLegend({ channels: ["shape"] });
  assert.equal(paths(p)[0].length, 4);
  assert.equal(paths(p)[1].length, 5);
  assert.equal(paths(p)[2].length, 5);
  assert.equal(p.graphicSpec.objects.seriesLegendSymbolPoints.items.length, 2);
  assert(p.graphicSpec.objects.seriesLegendSymbolPoints.items.every(i => i.type === "path"));
  const r = deserializeProgram(serializeProgram(p));
  assert.deepEqual(r.graphicSpec, p.graphicSpec);
  const next = r.editShapeScale({ range: [square, triangle] });
  assert.equal(paths(next)[0].length, 5);
  assert.equal(paths(next)[1].length, 4);
  assert.equal(paths(next)[2].length, 5);
  assert.equal(p.semanticSpec.scales.find(s => s.id === "shape").range[0].polygon.length, 3);
});

test("polygon geometry replays after Canvas, scale and source revisions", () => {
  const p = point(chart, square), before = serializeProgram(p);
  const resized = p.editCanvas({ width: 700 });
  assert.equal(paths(resized)[0][1].x - paths(resized)[0][0].x, 4);
  assert.equal(paths(resized)[0][1].y, paths(p)[0][1].y);
  const scaled = p.editXScale({ domain: [0, 2] });
  assert.equal(paths(scaled)[0][1].x - paths(scaled)[0][0].x, 4);
  const revised = p.reviseData({ source: "data", id: "revised", values: rows.map(r => ({ ...r, x: r.x / 2 })) });
  assert.deepEqual(paths(revised), paths(scaled));
  assert.equal(serializeProgram(p), before);
});

test("invalid polygon edits and encoded ranges reject atomically", () => {
  const p = point(), before = serializeProgram(p), bad = { polygon: [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 2, y: 0 }] };
  assert.throws(() => p.editPointMark({ shape: bad }), /polygon/);
  assert.throws(() => p.encodeShape({ field: "g", scale: { range: [triangle, bad] } }), /Shape range/);
  assert.throws(() => p.encodeShape({ field: "g", scale: { unknown: bad } }), /polygon/);
  assert.equal(serializeProgram(p), before);
  const envelope = JSON.parse(before), payload = decodeValue(envelope.payload);
  payload.materializationConfigs.marks.points.shape = bad;
  envelope.payload = encodeSharedValue(payload);
  assert.throws(() => deserializeProgram(JSON.stringify(envelope)), /polygon/);
});

test("polygon highlights replay without accumulating geometry and restore the original glyphs", () => {
  const base = point(chart, square);
  const highlighted = base.highlightMarks({ select: { field: "g", op: "eq", value: "A" },
    size: 2, offset: { x: 3, y: -2 }, dimOthers: false, bringToFront: false });
  const first = paths(highlighted)[0], original = paths(base)[0];
  // Subtracting translated coordinates incurs ordinary double rounding.
  assert(Math.abs((first[1].x - first[0].x) - 4 * Math.sqrt(2)) < 1e-12);
  assert.deepEqual(paths(highlighted).slice(1), paths(base).slice(1));
  assert.deepEqual(deserializeProgram(serializeProgram(highlighted)).graphicSpec, highlighted.graphicSpec);
  const resized = highlighted.editCanvas({ width: 700 });
  assert.equal(paths(resized)[0][1].x - paths(resized)[0][0].x, first[1].x - first[0].x);
  assert.deepEqual(highlighted.removeMarkHighlight({}).graphicSpec, base.graphicSpec);
  assert.deepEqual(paths(base)[0], original);
  const replaced = base.highlightMarks({ select: { field: "g", op: "eq", value: "A" },
    shape: { ...triangle, normalization: "radius" }, size: 1, dimOthers: false, bringToFront: false });
  const replacement = paths(replaced)[0], radius = Math.sqrt(16 / Math.PI);
  assert.equal(replacement.length, 4);
  assert(Math.abs(replacement[0].x - (original[0].x + 2 - 1.5 * radius)) < 1e-12);
  assert(Math.abs(replacement[0].y - (original[0].y + 2 - 1.5 * radius)) < 1e-12);
  assert.deepEqual(paths(replaced).slice(1), paths(base).slice(1));
  assert.deepEqual(deserializeProgram(serializeProgram(replaced)).graphicSpec, replaced.graphicSpec);
});

test("polygon scatter facades, facets and Polar positions preserve the shared shape recipe", () => {
  for (const factory of [chart, basicChart]) {
    const scatter = base(factory).createScatterPlot({ x: "x", y: "y", point: { shape: square }, guides: false });
    assert(scatter.graphicSpec.objects.scatterPlot.items.every(item => item.type === "path"));
  }
  const faceted = point(chart, square).facet({ field: "g", guides: { legend: false } });
  assert.equal(faceted.compositionSpec.children.length, 3);
  for (const child of Object.values(faceted.children)) {
    const [commands] = paths(child);
    assert.equal(commands.length, 5);
    assert.equal(commands[1].x - commands[0].x, 4);
  }
  assert.deepEqual(deserializeProgram(serializeProgram(faceted)).graphicSpec, faceted.graphicSpec);
  const polar = chart().createCanvas({ width: 200, height: 200, margin: 20 })
    .createData({ values: [{ angle: 0, distance: 1 }] }).createPointMark({ shape: square })
    .encodeTheta({ field: "angle" }).encodeR({ field: "distance" }).encodePointRadius({ value: 2 });
  const [p] = polar.graphicSpec.objects.point.items;
  assert.equal(p.type, "path");
  assert.equal(p.properties.commands[1].x - p.properties.commands[0].x, 4);
  assert.deepEqual(deserializeProgram(serializeProgram(polar)).graphicSpec, polar.graphicSpec);
});

test("polygon command work rejects a layer before allocating oversized concrete paths", () => {
  const polygon = { polygon: Array.from({ length: 1024 }, (_, i) => ({
    x: Math.cos(i * Math.PI / 512), y: Math.sin(i * Math.PI / 512)
  })) };
  const p = chart().createCanvas({ width: 400, height: 300, margin: 50 })
    .createData({ values: Array.from({ length: 9757 }, (_, x) => ({ x })) })
    .createPointMark().encodeX({ field: "x" }).encodeY({ field: "x" });
  const before = serializeProgram(p);
  assert.throws(() => p.editPointMark({ shape: polygon }), error => {
    assert.match(error.message, /Point polygon materialization/);
    assert.equal(getErrorDetails(error).code, "resource-limit");
    assert.equal(getErrorDetails(error).limit, 10_000_000);
    assert.equal(getErrorDetails(error).actual, 10_000_925);
    return true;
  });
  assert.throws(() => p.highlightMarks({ select: { field: "x", op: "gte", value: 0 },
    shape: polygon, dimOthers: false }), error => {
    assert.match(error.message, /Point polygon highlight/);
    assert.equal(getErrorDetails(error).code, "resource-limit");
    assert.equal(getErrorDetails(error).actual, 10_000_925);
    return true;
  });
  assert.equal(serializeProgram(p), before);
});
