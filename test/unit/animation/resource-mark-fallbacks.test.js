import test from "node:test";
import assert from "node:assert/strict";
import { chart } from "../../../src/index.js";
import { planTransition, sampleTransition, serializeAnimation, deserializeAnimation } from "../../../src/animation.js";
import { serializeProgram } from "../../../src/persistence.js";

const grid = { origin: [0, 0], dx: 1, dy: 1, width: 3, height: 3, values: [2, 2, 2, 2, 0, 2, 2, 2, 2] };
const rows = [{ id: "a", day: "2024-02-28", value: 0 }, { id: 1, day: "2024-02-29", value: 7 }, { id: "1", day: "2024-02-29", value: -2 }];

for (const family of ["contour-line", "contour-filled", "calendar"]) {
  test(`${family} uses explicit concrete fallback and preserves current-frame rebase and offline samples`, () => {
    const from = family === "calendar" ? chart().createCanvas({ width: 600, height: 240, margin: 20 })
      .createData({ id: "days", keyField: "id", values: rows })
      .createCalendarLayout({ date: "day", value: "value", start: "2024-02-28", end: "2024-03-01", timeZone: "UTC", weekStartsOn: 1, aggregate: "sum", missing: "empty" })
      .createCalendarPlot({ color: false, labels: false, monthBoundary: false })
      : chart().createCanvas({ width: 240, height: 240, margin: 20 })
        .createContourData({ id: "surface", grid, thresholds: [1, 2] })
        .createContourMark({ mode: family === "contour-line" ? "line" : "filled", color: false });
    const saved = serializeProgram(from);
    const to = family === "calendar" ? from.reviseData({ source: "days", id: "revised", values: rows.map(row => ({ ...row, value: row.value + 1 })) }).editCanvas({ width: 700 })
      : from.editContourData({ grid: { ...grid, values: grid.values.map(value => value * 1.5) } });
    assert.notDeepEqual(to.graphicSpec, from.graphicSpec);
    const plan = planTransition({ from, to, options: { durationMs: 100, easing: "linear" } });
    assert.deepEqual(plan.tracks.map(track => [track.kind, track.reason]), family === "calendar"
      ? Array.from({ length: 3 }, () => ["crossfade", "unsupported-family"])
      : family === "contour-line" ? [["crossfade", "primitive-role"], ["crossfade", "topology"]] : [["crossfade", "topology"]]);
    const frame = sampleTransition(plan, 40), weighted = frame.scene.nodes.slice(1).filter(node => node.type === "weighted-blend");
    assert.equal(weighted.length, plan.tracks.length);
    assert.ok(frame.decisions.filter(decision => decision.itemKey !== undefined).every(decision => decision.kind === "crossfade"));
    for (const node of weighted) {
      assert.equal(node.type, "weighted-blend");
      assert.deepEqual(node.properties.sources.map(source => source.weight), [.6, .4]);
    }
    assert.deepEqual(plan.enters, []);
    assert.deepEqual(plan.exits, family === "contour-line" ? [3, 4, 5] : []);
    if (family === "contour-line") assert.deepEqual(frame.scene.nodes.slice(-3).map(node => [node.type, node.properties.opacity]), [["path", .6], ["path", .6], ["path", .6]]);
    const restored = deserializeAnimation(serializeAnimation(plan)).plan;
    for (const time of [0, 40, 100]) assert.deepEqual(sampleTransition(restored, time), sampleTransition(plan, time));
    const rebased = planTransition({ from: frame, to: from, options: { durationMs: 60, easing: "linear" } });
    assert.equal(sampleTransition(rebased, 0), frame);
    assert.ok(rebased.tracks.every(track => track.kind === "crossfade"));
    const restoredRebase = deserializeAnimation(serializeAnimation(rebased)).plan;
    for (const time of [0, 30, 60]) assert.deepEqual(sampleTransition(restoredRebase, time), sampleTransition(rebased, time));
    assert.equal(serializeProgram(from), saved);
  });
}
