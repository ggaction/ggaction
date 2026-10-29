import assert from "node:assert/strict";
import test from "node:test";
import { chart } from "../../../src/index.js";
import { legendTargets, resolveLegendTarget, legendBlockDescriptors, resolveLegendBlock } from "../../../src/materialization/legendTargets.js";
const base = () => chart().createCanvas({ width: 500, height: 350, margin: 100 }).createData({ values: [{ x: 1, y: 2, group: "A" }, { x: 2, y: 3, group: "B" }] })
  .createScatterPlot({ id: "points", x: "x", y: "y", color: "group", guides: false }).createLegend({ channels: ["color"] });

test("legend block lookup shares explicit and unique owner resolution without mutating state", () => {
  const p = base(), before = JSON.stringify(p), empty = p.removeLegend();
  assert.deepEqual(legendTargets(p), ["points"]); assert.equal(resolveLegendTarget(p, undefined, "editLegend"), "points");
  assert.equal(resolveLegendBlock(p, { target: "points", channel: "color" }).kind, "color");
  assert.throws(() => resolveLegendTarget(empty, undefined, "removeLegend"), /existing legend/);
  assert.throws(() => resolveLegendTarget(empty, undefined, "editLegend"), /ambiguous/);
  assert.throws(() => resolveLegendTarget(p, "absent", "editLegend"), /Unknown legend target/);
  assert.throws(() => resolveLegendBlock(p, { target: "points", channel: "x" }), /unsupported legend channel/);
  assert.throws(() => resolveLegendBlock(p, { target: "points", channel: "shape" }), /no legend block/);
  assert.equal(JSON.stringify(p), before);
});

test("duplicate block identity and overlapping public channel ownership reject rather than choose first", () => {
  const p = base(), config = p.guideConfigs.legend.color;
  const input = channels => ({ resolvedScales: p.resolvedScales, guideConfigs: { legend: { color: config, series: { ...config, kind: "series", channels } } } });
  assert.throws(() => legendBlockDescriptors(input(["color"]), "points"), /ambiguous block key/);
  assert.throws(() => resolveLegendBlock(input(["color", "shape"]), { target: "points", channel: "color" }), /ambiguous channel/);
  const multiple = { resolvedScales: p.resolvedScales, guideConfigs: { legend: { color: config, stroke: { ...config, kind: "stroke", target: "other", channels: ["stroke"] } } } };
  assert.throws(() => resolveLegendTarget(multiple, undefined, "editLegend"), /ambiguous/);
  assert.equal(resolveLegendTarget(multiple, "other", "editLegend"), "other");
});
