import assert from "node:assert/strict";
import test from "node:test";
import { chart, hconcat } from "../../../src/index.js";
import { serializeProgram, deserializeProgram } from "../../../src/persistence.js";

const base = () => chart().createCanvas({ width: 620, height: 460, margin: 110 })
  .createData({ values: [{ x: 1, y: 2, group: "a" }, { x: 2, y: 4, group: "b" }] });
const point = p => p.createPointMark().encodeX({ field: "x" }).encodeY({ field: "y" });
const theme = { base: "light", tokens: { axisLabelGap: 24, axisTitleGap: 70, legendItemGap: 35 } };
const variants = [
  ["Cartesian", p => point(p).createAxes(), "x"],
  ["named Cartesian", p => point(p).createYAxis({ id: "right", position: "right" }), "right"],
  ["Polar", p => p.createPointMark().encodeTheta({ field: "x" }).encodeR({ field: "y" })
    .createThetaAxis().createRadialAxis(), "theta"],
  ["Parallel", p => p.createParallelCoordinates({ dimensions: ["x", "y"], guides: { legend: false } }), "parallel"]
];
for (const [name, build, axis] of variants) test(`${name} spacing tokens use existing offsets and restore native inference`, () => {
  const seed = base(), p = build(seed), q = p.applyTheme({ theme });
  const config = axis === "parallel" ? q.guideConfigs.axis.parallel.axes.dimensions[0] : q.guideConfigs.axis[axis];
  assert.equal(config.labels.offset, 24);
  assert.equal(config.title.offset, 70);
  for (const result of [q, build(seed.applyTheme({ theme })), deserializeProgram(serializeProgram(q))]) {
    assert.deepEqual(result.removeTheme().guideConfigs, p.guideConfigs);
    assert.deepEqual(result.removeTheme().graphicSpec, p.graphicSpec);
  }
  assert.equal(q.resolvedScales, p.resolvedScales);
});

test("spacing keeps explicit equal defaults, zero, label-relative titles and nested snapshots", () => {
  const p = point(base()).createAxes({ x: { ticksAndLabels: { labels: { offset: 0 } },
    title: { offset: { from: "labels", gap: 4 } } }, y: { title: { offset: 52 } } });
  const q = p.applyTheme({ theme });
  assert.equal(q.guideConfigs.axis.x.labels.offset, 0);
  assert.deepEqual(q.guideConfigs.axis.x.title.offset, { from: "labels", gap: 4 });
  assert.equal(q.guideConfigs.axis.y.title.offset, 52);
  const composed = hconcat({ programs: [{ id: "a", program: p }, { id: "b", program: p }] });
  assert.deepEqual(composed.applyTheme({ theme }).removeTheme().graphicSpec, composed.graphicSpec);
});

test("categorical legend spacing follows the active token while explicit spacing stays authored", () => {
  const build = p => point(p).encodeColor({ field: "group" }).createLegend({ position: "bottom" });
  const p = build(base()), q = p.applyTheme({ theme });
  assert.equal(q.guideConfigs.legend.color.itemGap, 35);
  assert.equal(build(base().applyTheme({ theme })).guideConfigs.legend.color.itemGap, 35);
  assert.deepEqual(q.removeTheme().guideConfigs, p.guideConfigs);
  assert.deepEqual(q.removeTheme().graphicSpec, p.graphicSpec);
  const explicit = point(base()).encodeColor({ field: "group" }).createLegend({ position: "bottom", itemGap: 20 }).applyTheme({ theme });
  assert.equal(explicit.guideConfigs.legend.color.itemGap, 20);
});

test("spacing validation and failed guide placement preserve the old program and trace", () => {
  const p = point(base()).createAxes(), before = serializeProgram(p);
  for (const token of ["axisLabelGap", "axisTitleGap", "legendItemGap"]) for (const value of [-1, Infinity, NaN, null, "4"]) {
    assert.throws(() => p.applyTheme({ theme: { base: "light", tokens: { [token]: value } } }));
  }
  assert.throws(() => p.applyTheme({ theme: { base: "light", tokens: { legendItemGap: 0 } } }));
  assert.throws(() => p.applyTheme({ theme: { base: "light", tokens: { axisLabelGap: 1e4 } } }), /bounds|Canvas|overlap|space/i);
  assert.equal(serializeProgram(p), before);
});

for (const position of ["top", "right"]) test(`native item legend gaps apply before and after creation at ${position}`, () => {
  const seed = () => chart().createCanvas({ width: 900, height: 700, margin: 220 })
    .createData({ values: [{ x: 1, y: 2 }, { x: 2, y: 4 }] }).createPointMark().encodeX({ field: "x" }).encodeY({ field: "y" });
  const cases = [
    ["size", p => p.encodeSize({ field: "y" }), { channels: ["size"] }],
    ["opacity", p => p.encodeOpacity({ field: "y" }), { channels: ["opacity"] }],
    ["strokeWidth", p => p.createLineMark({ id: "line" }).encodeX({ target: "line", field: "x" }).encodeY({ target: "line", field: "y" }).encodeGroup({ target: "line", field: "x" }).encodeStrokeWidth({ target: "line", field: "y" }), { target: "line", channels: ["strokeWidth"] }],
    ["gradient", p => p.encodeColor({ field: "y", fieldType: "quantitative" }), { representation: "symbols" }],
    ["interval", p => p.encodeColor({ field: "y", fieldType: "quantitative", scale: { type: "quantize", range: ["red", "blue"] } }), {}]
  ];
  for (const [kind, encode, options] of cases) {
    const build = p => encode(p).createLegend({ ...options, position });
    const initial = seed(), p = build(initial), q = p.applyTheme({ theme });
    assert.equal(q.guideConfigs.legend[kind].itemGap, 35, kind);
    assert.deepEqual(build(initial.applyTheme({ theme })).graphicSpec, q.graphicSpec, kind);
    assert.deepEqual(q.removeTheme().graphicSpec, p.graphicSpec, kind);
  }
  const gradient = seed().encodeColor({ field: "y", fieldType: "quantitative" }).createLegend({ position });
  assert.equal(gradient.applyTheme({ theme }).guideConfigs.legend.gradient.itemGap, gradient.guideConfigs.legend.gradient.itemGap);
});
