import assert from "node:assert/strict";
import test from "node:test";
import { createTable } from "../../../examples/table/program.js";
import { createPyramid } from "../../../examples/pyramid/program.js";
import { createOHLC } from "../../../examples/ohlc/program.js";
import { createWaterfall } from "../../../examples/waterfall/program.js";
import { createTrail } from "../../../examples/trail/program.js";
import { getMarkItems } from "../../../src/inspection.js";
import { serializeProgram } from "../../../src/persistence.js";
import { createTransitionScene } from "../../../src/scene.js";
import { planTransition, sampleTransition, serializeAnimation, deserializeAnimation } from "../../../src/animation.js";

const families = [
  { id: "table", create: createTable, edit: p => p.editTablePlot({ sortBy: [{ field: "amount", order: "descending" }] }),
    counts: { "unsupported-family": 12, "primitive-role": 12 }, sourceRows: [[], [], [], [0], [0], [0], [1], [1], [1], [], [0, 1], []] },
  { id: "pyramid", create: createPyramid, edit: p => p.editPyramidPlot({ orientation: "right" }),
    counts: { "unsupported-family": 3, "primitive-role": 3 }, sourceRows: [[0], [1], [2]] },
  { id: "ohlc", create: createOHLC, edit: p => p.editOHLCPlot({ width: { pixels: 48 } }),
    counts: { "primitive-role": 3, "unsupported-family": 3 }, sourceRows: [[0], [1], [2]] },
  { id: "waterfall", create: createWaterfall, edit: p => p.editWaterfallPlot({ width: { pixels: 64 } }),
    counts: { "primitive-role": 9 }, sourceRows: [[0], [1], [0, 1, 2], [3], [0, 1, 3, 4]] },
  { id: "trail", create: createTrail, edit: p => p.editTrailPlot({ width: 18 }),
    counts: { "unsupported-family": 2 }, sourceRows: [[0, 1], [2, 3]] }
];
const byKey = items => new Map(items.map(item => [item.key, item.rows]));
// Reprojecting concrete graphics allocates scene snapshot keys; animation retains
// endpoint matching keys and topology. Compare rendering content here, and whole frames below.
function assertConcreteScene(frame) {
  const projected = createTransitionScene(frame, { format: "canvas" });
  assert.equal(projected.width, frame.scene.width);
  assert.equal(projected.height, frame.scene.height);
  assert.equal(projected.nodes.length, frame.scene.nodes.length);
  for (const [index, node] of projected.nodes.entries()) {
    const expected = frame.scene.nodes[index];
    for (const property of ["type", "properties", "offset", "clip", "clips"])
      assert.deepEqual(node[property], expected[property]);
  }
  assert.equal(new Set(frame.scene.nodes.map(node => node.key)).size, frame.scene.nodes.length);
}
const options = { durationMs: 100, easing: "linear" };
for (const family of families) {
  test(`${family.id} native edit preserves logical rows through explicit fallback, both rebase directions and offline frames`, () => {
    const from = family.create(), before = serializeProgram(from), to = family.edit(from);
    const original = getMarkItems(from, { target: family.id }), updated = getMarkItems(to, { target: family.id });
    assert.deepEqual(original.map(item => item.rows.map(row => row.index)), family.sourceRows);
    assert.deepEqual(byKey(updated), byKey(original));
    assert.notDeepEqual(to.graphicSpec, from.graphicSpec);
    if (family.id === "table") assert.deepEqual(updated.filter(item => item.channels.role === "body").map(item => item.fields.id), ["b", "b", "b", "a", "a", "a"]);
    const plan = planTransition({ from, to, options }), frame = sampleTransition(plan, 40);
    assert.deepEqual(plan.enters, []); assert.deepEqual(plan.exits, []);
    assert.ok(plan.tracks.every(track => track.kind === "crossfade"));
    assert.deepEqual(Object.fromEntries([...new Set(plan.tracks.map(track => track.reason))].map(reason =>
      [reason, plan.tracks.filter(track => track.reason === reason).length])), family.counts);
    assert.equal(sampleTransition(plan, 0).graphicSpec, from.graphicSpec);
    assert.equal(sampleTransition(plan, 100).graphicSpec, to.graphicSpec);
    const bodies = frame.scene.nodes.slice(1);
    assert.equal(bodies.length, plan.tracks.length);
    for (const node of bodies) {
      assert.equal(node.type, "weighted-blend");
      assert.deepEqual(node.properties.sources.map(source => source.weight), [.6, .4]);
    }
    assert.ok(frame.decisions.filter(decision => decision.itemKey !== undefined).every(decision => original.some(item => item.key === decision.itemKey)));
    assertConcreteScene(frame);
    const reverse = planTransition({ from: frame, to: from, options: { durationMs: 60, easing: "linear" } });
    const forward = planTransition({ from: to, to: frame, options: { durationMs: 60, easing: "linear" } });
    assert.equal(sampleTransition(reverse, 0), frame);
    assert.equal(sampleTransition(forward, 60), frame);
    for (const [candidate, times] of [[plan, [0, 20, 40, 100]], [reverse, [0, 30, 60]], [forward, [0, 30, 60]]]) {
      const offline = deserializeAnimation(serializeAnimation(candidate)).plan;
      for (const time of times) {
        const native = sampleTransition(candidate, time), restored = sampleTransition(offline, time);
        assert.deepEqual(restored, native);
        assertConcreteScene(restored);
      }
    }
    assert.equal(serializeProgram(from), before);
  });
}
