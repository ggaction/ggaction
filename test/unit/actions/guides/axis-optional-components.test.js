import assert from "node:assert/strict";
import test from "node:test";
import { chart } from "../../../../src/index.js";
import { chart as basicChart } from "../../../../src/basic.js";
import { assertAtomicFailures } from "../../../support/program-state.js";

const parts = ["Line", "Ticks", "Labels", "Title"];
function childOperations(node) {
  return node.children.flatMap(child => [child.op, ...childOperations(child)]);
}
function base(polar, factory = chart) {
  let p = factory().createCanvas({ width: 520, height: 520, margin: 90 })
    .createData({ values: [{ x: 0, y: 0 }, { x: 120, y: 10 }, { x: 240, y: 20 }] })
    .createPointMark();
  return polar ? p.encodeTheta({ field: "x", scale: { domain: [0, 360] } })
    .encodeR({ field: "y", scale: { zero: true } })
    : p.encodeX({ field: "x" }).encodeY({ field: "y" });
}

for (const [axis, channel, graphic, polar] of [
  ["X", "x", "x", false], ["Y", "y", "y", false],
  ["Theta", "theta", "theta", true], ["Radial", "radius", "radial", true]
]) {
  const id = part => `${graphic}Axis${part}`;
  test(`${axis} creates every nonempty optional component combination`, () => {
    const p = base(polar);
    const snapshot = JSON.stringify(p);
    for (let mask = 0; mask < 7; mask += 1) {
      const options = Object.fromEntries(["line", "ticksAndLabels", "title"]
        .map((key, index) => [key, mask & 1 << index ? false : {}]));
      const q = p[`create${axis}Axis`](options);
      const retained = parts.filter(part => options[
        part === "Ticks" || part === "Labels" ? "ticksAndLabels" : part.toLowerCase()
      ] !== false);
      const operations = childOperations(q.trace.children.at(-1));
      for (const part of parts) {
        assert.equal(q.graphicSpec.objects[id(part)] !== undefined, retained.includes(part));
        assert.equal(q.guideConfigs.axis[channel]?.[part.toLowerCase()] !== undefined, retained.includes(part));
        assert.equal(operations.includes(`create${axis}Axis${part}`), retained.includes(part));
      }
      const removed = q[`remove${axis}Axis`]();
      assert.equal(removed.semanticSpec.guides.axis?.[channel], undefined);
      assert.equal(removed.guideConfigs.axis?.[channel], undefined);
      assert.deepEqual(q.semanticSpec.layers, p.semanticSpec.layers);
      assert.deepEqual(q.resolvedScales, p.resolvedScales);
    }
    assert.equal(JSON.stringify(p), snapshot);
    assertAtomicFailures(p, [{ operation: () => p[`create${axis}Axis`]({
      line: false, ticksAndLabels: false, title: false
    }), error: /at least one enabled/ }]);
  });

  test(`${axis} removes and restores each component without reviving omitted state`, () => {
    const p = base(polar)[`create${axis}Axis`]();
    const before = JSON.stringify(p);
    for (const part of parts) {
      const key = part.toLowerCase();
      const q = p[`edit${axis}Axis`]({ [key]: false });
      assert.equal(q.graphicSpec.objects[id(part)], undefined);
      assert.equal(q.guideConfigs.axis[channel]?.[key], undefined);
      for (const other of parts.filter(value => value !== part)) {
        assert.deepEqual(q.graphicSpec.objects[id(other)], p.graphicSpec.objects[id(other)]);
      }
      const replayed = q.editCanvas({ width: 620 }).editScale({
        id: channel, domain: [0, channel === "theta" ? 720 : 480]
      });
      assert.equal(replayed.graphicSpec.objects[id(part)], undefined);
      const restored = replayed[`create${axis}Axis${part}`]()
        [`edit${axis}Axis${part}`]({ color: "#b91c1c" });
      assert.ok(restored.graphicSpec.objects[id(part)]);
      assertAtomicFailures(q, [
        { operation: () => q[`edit${axis}Axis`]({ [key]: false }) },
        { operation: () => q[`edit${axis}Axis`]({ [key]: { color: "red" } }) }
      ]);
    }
    assert.equal(JSON.stringify(p), before);
    const removed = p[`edit${axis}Axis`]({ line: false, ticksAndLabels: false, title: false });
    assert.equal(removed.semanticSpec.guides.axis?.[channel], undefined);
    assert.equal(removed.guideConfigs.axis?.[channel], undefined);
    assert.deepEqual(removed.semanticSpec.layers, p.semanticSpec.layers);
    assert.deepEqual(removed.resolvedScales, p.resolvedScales);
    const recreated = removed[`create${axis}Axis`]();
    for (const part of parts) assert.deepEqual(recreated.graphicSpec.objects[id(part)], p.graphicSpec.objects[id(part)]);
  });

  test(`${axis} rejects conflicting groups and late invalid edits atomically`, () => {
    const p = base(polar)[`create${axis}Axis`]();
    const args = { line: false, title: { fontSize: -1 } };
    assertAtomicFailures(p, [
      { operation: () => p[`edit${axis}Axis`](args), inputs: [args] },
      { operation: () => p[`edit${axis}Axis`]({ ticksAndLabels: false, labels: false }) },
      { operation: () => p[`edit${axis}Axis`]({ ticksAndLabels: { labels: false } }) }
    ]);
    const q = p[`edit${axis}Axis`]({ ticks: false });
    assertAtomicFailures(q, [{ operation: () => q[`edit${axis}Axis`]({ ticksAndLabels: false }) }]);
  });
}

test("radial angle edits require an axis and rematerialize only retained components", () => {
  const p = base(true);
  assertAtomicFailures(p, [{ operation: () => p.editRadialAxis({ angle: 45 }), error: /existing/ }]);
  assertAtomicFailures(chart(), [{ operation: () => chart().editRadialAxis({ angle: 45 }), error: /existing/ }]);
  const full = p.createRadialAxis({ angle: 90 }).createRadialGrid();
  assert.ok(full.graphicSpec.objects.radialGridCircles.items.length > 0);
  const q = full.editRadialAxis({ angle: 180, title: false, ticks: false });
  assert.equal(q.guideConfigs.axis.radius.layout.angle, 180);
  assert.equal(q.graphicSpec.objects.radialAxisTitle, undefined);
  assert.equal(q.graphicSpec.objects.radialAxisTicks, undefined);
  assert.notDeepEqual(q.graphicSpec.objects.radialAxisLine, full.graphicSpec.objects.radialAxisLine);
  assert.notDeepEqual(q.graphicSpec.objects.radialAxisLabels, full.graphicSpec.objects.radialAxisLabels);
  const removed = q.editRadialAxis({ angle: 45, line: false, labels: false });
  assert.equal(removed.guideConfigs.axis?.radius, undefined);
  assert.deepEqual(removed.guideConfigs.grid, full.guideConfigs.grid);
  assert.deepEqual(removed.graphicSpec.objects.radialGridCircles, full.graphicSpec.objects.radialGridCircles);
});

test("Theta rejects radial-only complete options and Basic keeps Cartesian opt-outs", () => {
  const p = base(true);
  assertAtomicFailures(p, [
    { operation: () => p.createThetaAxis({ angle: 45 }), error: /Unknown/ },
    { operation: () => p.createAxes({ theta: { angle: 45 } }), error: /Unknown/ }
  ]);
  const basic = base(false, basicChart).createAxes({ x: { title: false }, y: { line: false } });
  assert.equal(basic.graphicSpec.objects.xAxisTitle, undefined);
  assert.equal(basic.graphicSpec.objects.yAxisLine, undefined);
});
