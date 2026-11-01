import test from "node:test";
import assert from "node:assert/strict";
import { chart } from "../../../src/index.js";
import { planTransition, sampleTransition, serializeAnimation, deserializeAnimation } from "../../../src/animation.js";
import { serializeProgram } from "../../../src/persistence.js";
import { getMarkItems } from "../../../src/inspection.js";
import { createFlowInspection } from "../../support/flow-inspection.js";

const rows = [{ id: "root", parent: null, value: 4 }, { id: 1, parent: "root", value: 3 }, { id: "1", parent: "root", value: 1 }];
function hierarchy(method) {
  const source = chart().createCanvas({ width: 320, height: 240, margin: 20 })
    .createData({ id: "data", keyField: "id", values: rows })
    .createHierarchyData({ id: "hierarchy", key: "id", parent: "parent", value: "value" })
    .layoutHierarchy({ id: "layout", method, options: method === "tree"
      ? { nodeSize: [10, 10], siblingGap: 30, depthGap: 40, orientation: "vertical" }
      : { size: [200, 150], padding: 5, method: "slice-dice" } });
  return method === "tree" ? source.createTreePlot({ id: "plot", labels: false })
    : source.createTreemapPlot({ id: "plot", labels: false });
}

for (const family of ["tree", "treemap", "dag", "cyclic"]) {
  test(`${family} layout edits use explicit fallback with authentic rebase and complete offline frames`, () => {
    const isHierarchy = family === "tree" || family === "treemap";
    const from = isHierarchy ? hierarchy(family) : createFlowInspection(family);
    const saved = serializeProgram(from), owners = isHierarchy ? ["plot"] : ["flowLinks", "flowNodes"];
    const to = from.editLayout({ options: family === "tree" ? { depthGap: 80, siblingGap: 70 }
      : family === "treemap" ? { size: [240, 180] } : { nodeWidth: 30, nodePadding: 20 } });
    assert.notDeepEqual(to.graphicSpec, from.graphicSpec);
    for (const owner of owners) {
      const before = getMarkItems(from, { target: owner }), after = getMarkItems(to, { target: owner });
      assert.deepEqual(after.map(item => item.key), before.map(item => item.key));
      assert.deepEqual(after.map(item => item.rows), before.map(item => item.rows));
    }
    const options = { durationMs: 100, easing: "linear" };
    const plan = planTransition({ from, to, options });
    assert.deepEqual(plan.enters, []); assert.deepEqual(plan.exits, []);
    assert.deepEqual(plan.tracks.map(track => [track.kind, track.reason]), family === "tree"
      ? [["crossfade", "primitive-role"], ["crossfade", "primitive-role"], ...Array.from({ length: 3 }, () => ["crossfade", "unsupported-family"])]
      : Array.from({ length: family === "treemap" ? 3 : family === "dag" ? 5 : 6 }, () => ["crossfade", "unsupported-family"]));
    assert.equal(sampleTransition(plan, 0).graphicSpec, from.graphicSpec);
    assert.equal(sampleTransition(plan, 100).graphicSpec, to.graphicSpec);
    const frame = sampleTransition(plan, 40), bodies = frame.scene.nodes.slice(1);
    assert.equal(bodies.length, plan.tracks.length);
    assert.ok(bodies.every(node => node.type === "weighted-blend"));
    for (const node of bodies) assert.deepEqual(node.properties.sources.map(source => source.weight), [.6, .4]);
    assert.ok(frame.decisions.filter(decision => decision.itemKey !== undefined).every(decision => decision.kind === "crossfade"));
    const restored = deserializeAnimation(serializeAnimation(plan)).plan;
    for (const time of [0, 20, 40, 100]) assert.deepEqual(sampleTransition(restored, time), sampleTransition(plan, time));
    const rebase = planTransition({ from: frame, to: from, options: { durationMs: 60, easing: "linear" } });
    assert.equal(sampleTransition(rebase, 0), frame);
    assert.ok(rebase.tracks.every(track => track.kind === "crossfade"));
    const reverse = planTransition({ from, to: frame, options: { durationMs: 60, easing: "linear" } });
    assert.equal(sampleTransition(reverse, 60), frame);
    for (const current of [rebase, reverse]) {
      const offline = deserializeAnimation(serializeAnimation(current)).plan;
      for (const time of [0, 30, 60]) assert.deepEqual(sampleTransition(offline, time), sampleTransition(current, time));
    }
    assert.equal(serializeProgram(from), saved);
  });
}
