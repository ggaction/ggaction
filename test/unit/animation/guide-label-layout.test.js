import test from "node:test";
import assert from "node:assert/strict";
import { chart } from "../../../src/index.js";
import { serializeProgram, deserializeProgram } from "../../../src/persistence.js";
import { prepareAxisLabelLines, prepareAxisLabelLayout, resolvePreparedAxisLabelLayout } from "../../../src/materialization/axisLabelLayout.js";
import { valuesFromTickConfig } from "../../../src/materialization/guides/tickValues.js";
import { resolveCartesianAxisFrameBounds } from "../../../src/materialization/coordinateBounds.js";

const style = { fontSize: 10, fontFamily: "Fixture", fontWeight: "normal", rotation: 0 };
const profile = measurements => ({ schemaVersion: 1, measurements: measurements.map(([text, width]) => ({ ...style, fontWeight: 400, text, width })) });
const source = (extra = {}) => ({ values: [0, 10], scale: { type: "linear", domain: [0, 10], range: [20, 120] },
  config: { ...style, position: "bottom", offset: 7, format: "auto" }, channel: "x",
  bounds: { x: 20, y: 30, width: 100, height: 80 }, profile: profile([["0", 20], ["10", 40]]), ...extra });
const close = (actual, expected) => assert.ok(Math.abs(actual - expected) < 1e-10, `${actual} != ${expected}`);

test("prepared flush layout keeps exact raw positions while moving measured text inside its scale span", () => {
  const args = source(), before = structuredClone(args);
  args.config = { ...args.config, alongOffset: 3, flush: true };
  const prepared = prepareAxisLabelLayout(args), result = resolvePreparedAxisLabelLayout(prepared);
  assert.deepEqual(prepared.positions, [20, 120]);
  assert.deepEqual(result.resolved.x, [33, 103]);
  assert.equal(result.resolved.y, 117);
  assert.deepEqual(result.labelBounds, [
    { left: 23, right: 43, top: 117, bottom: 127 },
    { left: 83, right: 123, top: 117, bottom: 127 }
  ]);
  assert.deepEqual(args.scale, before.scale);
  assert.ok(Object.isFrozen(prepared.prepared.text));
  assert.deepEqual(prepareAxisLabelLayout({ ...args, config: { ...args.config, flushThreshold: 0 } }).positions, [20, 120]);
  assert.deepEqual(resolvePreparedAxisLabelLayout({ ...prepared, config: { ...prepared.config, flushThreshold: 0 } }), result);
});

test("hard-break label groups retain line order and translate as one measured group on either Y side", () => {
  for (const position of ["left", "right"]) {
    const args = source({ channel: "y", scale: { type: "linear", domain: [0, 10], range: [30, 110] },
      profile: profile([["A", 20], ["B", 10], ["C", 8]]) });
    args.config = { ...args.config, position, flush: true, lineHeight: 12,
      labelMap: [{ value: 0, label: "A\nB" }, { value: 10, label: "C" }] };
    const prepared = prepareAxisLabelLayout(args), result = resolvePreparedAxisLabelLayout(prepared);
    assert.deepEqual(result.resolved.text, ["A", "B", "C"]);
    assert.deepEqual(result.resolved.groups, [0, 0, 1]);
    assert.deepEqual(result.resolved.y, [35, 47, 105]);
    assert.deepEqual(result.resolved.x, Array(3).fill(position === "left" ? 13 : 127));
    assert.deepEqual(result.requiredBounds, position === "left"
      ? { left: -7, right: 13, top: 30, bottom: 110 }
      : { left: 127, right: 147, top: 30, bottom: 110 });
  }
});

test("native rotation and edge clearance use measured bounds without changing raw anchors", () => {
  for (const position of ["top", "bottom"]) for (const rotation of [-Math.PI / 4, Math.PI / 4]) {
    const args = source(); args.config = { ...args.config, position, rotation };
    const prepared = prepareAxisLabelLayout(args), before = structuredClone(prepared);
    const result = resolvePreparedAxisLabelLayout(prepared);
    const near = position === "bottom", edge = near ? 117 : 23;
    for (const bound of result.labelBounds) close(bound[near ? "top" : "bottom"], edge);
    assert.deepEqual(result.resolved.x, [20, 120]);
    assert.equal(result.resolved.textBaseline, "middle");
    assert.equal(result.resolved.textAlign, Math.sin(rotation) * (near ? 1 : -1) < 0 ? "right" : "left");
    assert.equal(result.rotatedOverlap, true);
    assert.deepEqual(prepared, before);
  }
  for (const channel of ["x", "y"]) for (const position of channel === "x" ? ["top", "bottom"] : ["left", "right"]) {
    const args = source({ channel, edgeAligned: true }); args.config = { ...args.config, position };
    const result = resolvePreparedAxisLabelLayout(prepareAxisLabelLayout(args));
    assert.equal(result.labelBounds[0][channel === "x" ? position === "bottom" ? "top" : "bottom" : position === "right" ? "left" : "right"],
      channel === "x" ? position === "bottom" ? 117 : 23 : position === "right" ? 127 : 13);
  }
});

test("settled wrapping is reused without a fresh width choice and missing exact metrics remain errors", () => {
  const args = source(); args.config = { ...args.config, labelMap: [{ value: 0, label: "A B" }, { value: 10, label: "C" }], maxWidth: 10, wrap: "word" };
  args.profile = profile([["A", 8], ["B", 8], ["C", 8], ["A B", 20]]);
  const prepared = prepareAxisLabelLayout(args);
  assert.deepEqual(prepared.prepared.lines, [["A", "B"], ["C"]]);
  const result = resolvePreparedAxisLabelLayout(prepared);
  // The sampling seam consumes already prepared lines: a narrower maxWidth
  // cannot trigger a second wrap or truncate the original words.
  assert.deepEqual(resolvePreparedAxisLabelLayout({ ...prepared, config: { ...prepared.config, maxWidth: .1 } }), result);
  const exact = { schemaVersion: 2, fonts: [{ identity: { family: "Fixture", style: "normal", weight: 400 }, resource: { kind: "font", id: "face", revision: 0 } }], measurements: [] };
  assert.throws(() => resolvePreparedAxisLabelLayout({ ...prepared, profile: exact }), /exact prepared measurement/);
  assert.throws(() => prepareAxisLabelLines(["A ".repeat(10001)], { ...style, maxWidth: 10, wrap: "word" }, args.profile), /must not exceed/);
});

function checkNative(program, axisId = "x", channel = "x") {
  const before = serializeProgram(program), stored = program.guideConfigs.axis[axisId].labels;
  const config = { ...stored, ...stored.responsiveResult };
  const input = prepareAxisLabelLayout({ values: valuesFromTickConfig(program, stored), scale: program.resolvedScales[stored.scale],
    channel, config, bounds: resolveCartesianAxisFrameBounds(program, channel, stored.position, stored.scale, axisId),
    indices: stored.responsiveResult?.indices, profile: program.materializationConfigs.textMetrics,
    edgeAligned: program.materializationConfigs.canvas?.plot !== undefined || program.materializationConfigs.canvas?.responsive !== undefined });
  const result = resolvePreparedAxisLabelLayout(input), items = program.graphicSpec.objects[`${axisId}AxisLabels`].items;
  assert.equal(items.length, result.resolved.text.length);
  for (let i = 0; i < items.length; i++) for (const key of ["x", "y", "text", "textAlign", "textBaseline"]) {
    const value = result.resolved[key];
    assert.deepEqual(items[i].properties[key], Array.isArray(value) ? value[i] : value, `${axisId}/${i}/${key}`);
  }
  assert.equal(serializeProgram(program), before);
  return { input, result };
}

test("read-only native preparation exactly follows responsive wrap skip rotation and hidden raw values", () => {
  const rows = Array.from({ length: 8 }, (_, index) => ({ x: `Long category ${index}`, y: index + 1 }));
  const build = width => chart().createCanvas({ width, height: 600, margin: 10, responsive: { minPlotSize: { width: 40, height: 40 } } })
    .createData({ values: rows }).createBarPlot({ x: "x", y: "y", guides: { axes: {
      x: { title: false, ticksAndLabels: { labels: { responsive: { maxLines: 1 }, maxWidth: 300 } } }, y: { title: false }
    }, legend: false } });
  for (const width of [400, 220]) {
    const p = build(width), result = checkNative(p);
    assert.deepEqual(result.input.geometry.indices, [0, 2, 4, 6]);
    assert.deepEqual(checkNative(deserializeProgram(serializeProgram(p))), result);
  }
  const p = chart().createCanvas({ width: 500, height: 400, margin: 90 }).createData({ values: [{ x: 1, y: 0 }, { x: 2, y: 10 }, { x: 3, y: 20 }] })
    .createPointMark().encodeX({ field: "x" }).encodeY({ field: "y" })
    .createXAxisLabels({ values: [1, 2, 3], labelMap: [{ value: 2, label: "" }], flush: true })
    .createYAxisLabels({ values: [0, 10, 20], align: "center", overlap: "allow" });
  assert.deepEqual(checkNative(p).input.geometry.indices, [0, 2]);
  checkNative(p, "y", "y"); checkNative(p.editCanvas({ width: 600 }));
});
