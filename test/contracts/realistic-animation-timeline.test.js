import assert from "node:assert/strict";
import test from "node:test";
import { chart } from "../../src/index.js";
import { getMarkItems } from "../../src/inspection.js";
import { planTransition, sampleTransition, serializeAnimation, deserializeAnimation, exportAnimationFrames } from "../../src/animation.js";
import { renderToSVG } from "../../src/renderers/svg.js";
import { tidyTuesdaySourceRows, tidyTuesdayFixtureReport, releaseTidyTuesdaySourceCache } from "../support/datasets/tidytuesday.js";
import { assertSvgIntegrity } from "../oracles/svg-integrity.js";

const sources = [{ id: "tt-us-births", field: "births" }, { id: "tt-trash-wheel", field: "Weight" },
  { id: "tt-stock-prices", field: "volume", eligible: row => row.stock_symbol === "AAPL" },
  { id: "tt-animal-rescues", field: "incident_notional_cost" }, { id: "tt-movie-profit", field: "production_budget" }];
const close = (actual, expected) => assert.ok(Math.abs(actual - expected) < 1e-9, `${actual} differs from ${expected}`);
const geometry = (ownerKey, progress) => ({ target: { ownerKey },
  property: "geometry", kernel: "native-progress",
  keyframes: [{ timeMs: 0, value: 0 }, { timeMs: 50, value: progress }, { timeMs: 100, value: 1 }] });

for (const source of sources) test(`${source.id} independently retimes native points and axis with an exact item color keyframe`, () => {
  try {
    const original = tidyTuesdaySourceRows(source.id);
    assert.match(tidyTuesdayFixtureReport(source.id).sha256, /^[a-f0-9]{64}$/);
    // One declared cohort: the first twelve positive observations in original
    // source order and units. Only the original row index is added as identity.
    const rows = original.flatMap((row, index) => Number.isFinite(row[source.field]) && row[source.field] > 0 &&
      (!source.eligible || source.eligible(row)) ? [{ ...row, sourceRowIndex: index }] : []).slice(0, 12);
    assert.equal(rows.length, 12);
    const sourceSnapshot = rows.map(row => structuredClone(original[row.sourceRowIndex]));
    const inputSnapshot = structuredClone(rows), max = Math.max(...rows.map(row => row[source.field]));
    const tickValues = [max / 4, max / 2, 3 * max / 4], margin = 40;
    const from = chart().createCanvas({ width: 400, height: 300, margin })
      .createData({ id: "raw", values: rows, keyField: "sourceRowIndex" })
      .createPointMark({ id: "points", fill: "black" })
      .encodeX({ field: source.field, scale: { domain: [0, max], nice: false } })
      .encodeY({ field: "sourceRowIndex" })
      .createXAxis({ id: "measure-axis", title: false, ticksAndLabels: { values: tickValues } });
    const to = from.editCanvas({ width: 800, height: 500 });
    const snapshots = [from, to].map(program => structuredClone({ semantic: program.semanticSpec, graphic: program.graphicSpec }));
    const items = getMarkItems(from, { target: "points" }), firstKey = items[0].key;
    assert.equal(items.length, 12);
    const ordinary = planTransition({ from, to, options: { durationMs: 100, easing: "linear" } });
    const decisions = sampleTransition(ordinary, 50).decisions;
    const pointOwner = decisions.find(decision => decision.itemKey === firstKey).ownerKey;
    const guideOwners = [...new Set(decisions.filter(decision => decision.guideKey !== undefined).map(decision => decision.ownerKey))];
    assert.equal(guideOwners.length, 1);
    const plan = planTransition({ from, to, options: { durationMs: 100, easing: "linear", tracks: [
      geometry(pointOwner, .25), geometry(guideOwners[0], .75),
      { target: { itemKey: firstKey }, property: "fill", kernel: "color",
        keyframes: [{ timeMs: 0, value: "black" }, { timeMs: 50, value: "red" }, { timeMs: 100, value: "black" }] }
    ] } });
    const middle = sampleTransition(plan, 50);
    // Independent arithmetic from the authored viewport, raw measurements and
    // fixed domain. No ordinary animation sample supplies expected geometry.
    const pointWidth = (400 - 2 * margin) + .25 * (800 - 400);
    const axisWidth = (400 - 2 * margin) + .75 * (800 - 400);
    const axisBottom = margin + (300 - 2 * margin) + .75 * (500 - 300);
    assert.equal(pointWidth, 420); assert.equal(axisWidth, 620); assert.equal(axisBottom, 410);
    for (const item of items) {
      const index = middle.decisions.findIndex(decision => decision.itemKey === item.key && decision.role === "body");
      assert.ok(index >= 0);
      assert.equal(middle.decisions[index].kernel, "cartesian-point");
      const node = middle.scene.nodes[index], raw = original[item.fields.sourceRowIndex][source.field];
      assert.equal(node.type, "circle");
      close(node.properties.x, margin + pointWidth * raw / max);
      assert.equal(node.properties.fill, item.key === firstKey ? "rgba(255,0,0,1)" : "black");
    }
    const ticks = middle.decisions.flatMap((decision, index) => decision.guideKey !== undefined &&
      JSON.parse(decision.guideKey)[3] === "ticks" ? [{ decision, node: middle.scene.nodes[index] }] : []);
    assert.equal(ticks.length, tickValues.length);
    assert.deepEqual(ticks.map(({ decision }) => JSON.parse(decision.guideKey)[4]), tickValues);
    for (const { decision, node } of ticks) {
      assert.equal(decision.kernel, "guide-geometry"); assert.equal(node.type, "line");
      const value = JSON.parse(decision.guideKey)[4];
      close(node.properties.x1, margin + axisWidth * value / max);
      close(node.properties.x2, margin + axisWidth * value / max);
      close(node.properties.y1, axisBottom);
    }
    assert.equal(sampleTransition(plan, 0).graphicSpec, from.graphicSpec);
    assert.equal(sampleTransition(plan, 100).graphicSpec, to.graphicSpec);
    const restored = deserializeAnimation(serializeAnimation(plan)).plan;
    const schedule = { timesMs: [0, 25, 50, 75, 100] };
    const frames = exportAnimationFrames(plan, schedule);
    assert.deepEqual(exportAnimationFrames(restored, schedule), frames);
    for (const frame of frames) assertSvgIntegrity(renderToSVG(frame), `${source.id}/timeline/${frame.timeMs}`);
    assert.deepEqual(rows, inputSnapshot);
    for (const [index, row] of rows.entries()) assert.deepEqual(original[row.sourceRowIndex], sourceSnapshot[index]);
    for (const [index, program] of [from, to].entries()) {
      assert.deepEqual({ semantic: program.semanticSpec, graphic: program.graphicSpec }, snapshots[index]);
      assert.deepEqual(program.semanticSpec.datasets.find(data => data.id === "raw").values, rows);
    }
  } finally { releaseTidyTuesdaySourceCache(source.id); }
});
