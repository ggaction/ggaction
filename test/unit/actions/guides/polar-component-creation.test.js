import assert from "node:assert/strict";
import test from "node:test";
import { chart, render } from "../../../../src/index.js";
import { chart as basicChart } from "../../../../src/basic.js";
import { renderToSVG } from "../../../../src/renderers/svg.js";
import { createMockCanvasContext } from "../../../support/canvas.js";
import { assertAtomicFailures } from "../../../support/program-state.js";

function base(canvas = {}) {
  return chart().createCanvas({ width: 480, height: 480, margin: 80, ...canvas })
    .createData({ values: [{ direction: 0, value: 0 }, { direction: 120, value: 10 }, { direction: 240, value: 20 }] })
    .createPointMark()
    .encodeTheta({ field: "direction", scale: { domain: [0, 360] } })
    .encodeR({ field: "value", scale: { zero: true } });
}

function permutations(values) {
  return values.length === 0 ? [[]] : values.flatMap((value, index) =>
    permutations(values.filter((_, other) => other !== index)).map(rest => [value, ...rest]));
}
const parts = ["Line", "Ticks", "Labels", "Title"];

for (const [axis, channel, prefix] of [["Theta", "theta", "theta"], ["Radial", "radius", "radial"]]) {
  const options = { Line: { lineWidth: 2 }, Ticks: { values: [0, 10], length: 7 },
    Labels: { values: [0, 10], fontSize: 11 }, Title: { text: `${axis} measure`, fontWeight: 600 } };
  // Separate theta anchors avoid two labels competing for a small arc.
  if (axis === "Theta") for (const part of ["Ticks", "Labels"]) options[part].values = [0, 180];
  const resources = { scale: channel, coordinate: "polar", ...(axis === "Radial" ? { angle: 135 } : {}) };
  const create = (p, order = parts) => order.reduce((q, part) =>
    q[`create${axis}Axis${part}`]({ ...resources, ...options[part] }), p);

  test(`${axis} focused creation matches the complete axis through concrete renderers`, () => {
    const p = base();
    const complete = p[`create${axis}Axis`]({ ...resources, line: options.Line,
      ticksAndLabels: { values: options.Ticks.values, ticks: { length: 7 }, labels: { fontSize: 11 } }, title: options.Title });
    const focused = create(p);
    assert.deepEqual(focused.semanticSpec, complete.semanticSpec);
    assert.deepEqual(focused.guideConfigs, complete.guideConfigs);
    assert.deepEqual(focused.graphicSpec, complete.graphicSpec);
    assert.equal(renderToSVG(focused), renderToSVG(complete));
    const left = createMockCanvasContext();
    const right = createMockCanvasContext();
    render(focused, left); render(complete, right);
    assert.deepEqual(left.calls, right.calls);
    assert.deepEqual(focused.trace.children.slice(-4).map(node => node.op), parts.map(part => `create${axis}Axis${part}`));
  });

  test(`${axis} components preserve geometry through every creation order and replay`, () => {
    const p = base();
    const before = JSON.stringify(p);
    const expected = create(p);
    for (const order of permutations(parts)) {
      const q = create(p, order);
      assert.deepEqual(q.semanticSpec, expected.semanticSpec);
      assert.deepEqual(q.guideConfigs, expected.guideConfigs);
      for (const part of parts) assert.deepEqual(q.graphicSpec.objects[`${prefix}Axis${part}`], expected.graphicSpec.objects[`${prefix}Axis${part}`]);
      const edited = q.editCanvas({ width: 580 }).editScale({ id: channel, domain: [0, axis === "Theta" ? 720 : 40] });
      assert.equal(edited.graphicSpec.objects[`${prefix}AxisLabels`].items[0].properties.fontSize, 11);
      assert.equal(edited.graphicSpec.objects[`${prefix}AxisTitle`].properties.fontWeight, 600);
      assert.deepEqual(edited.guideConfigs.axis[channel].labels, q.guideConfigs.axis[channel].labels);
    }
    assert.equal(JSON.stringify(p), before);
  });

  test(`${axis} restores an omitted title and recreates a removed axis`, () => {
    const p = base()[`create${axis}Axis`]({ title: false });
    assert.equal(p.graphicSpec.objects[`${prefix}AxisTitle`], undefined);
    const q = p[`create${axis}AxisTitle`]({ text: "Restored" })[`edit${axis}AxisTitle`]({ fontWeight: 600 });
    assert.equal(q.graphicSpec.objects[`${prefix}AxisTitle`].properties.text, "Restored");
    assert.equal(p.graphicSpec.objects[`${prefix}AxisTitle`], undefined);
    const removed = q[`remove${axis}Axis`]();
    const recreated = create(removed);
    assert.deepEqual(recreated.graphicSpec, create(base()).graphicSpec);
    for (const part of parts) assert.equal(typeof basicChart()[`create${axis}Axis${part}`], "undefined");
  });

  test(`${axis} validates missing resources, bindings, modes and styles atomically`, () => {
    const p = base();
    const failures = [];
    for (const part of parts) {
      const op = `create${axis}Axis${part}`;
      for (const args of [{ unknown: true }, { coordinate: "missing" }, { scale: "missing" },
        ...(axis === "Theta" ? [{ angle: 45 }] : [{ angle: NaN }])]) {
        failures.push({ operation: () => p[op](args), inputs: [args] });
      }
      const made = p[op]();
      assertAtomicFailures(made, [{ operation: () => made[op]() }]);
    }
    for (const part of ["Ticks", "Labels"]) failures.push({ operation: () => p[`create${axis}Axis${part}`]({ count: 3, values: [0, 10] }) });
    if (axis === "Theta") failures.push({ operation: () => p.createThetaAxisTitle({ position: "outside" }) });
    assertAtomicFailures(p, failures);
  });
}

test("a radial title created first checks its requested angle rather than a default axis", () => {
  const p = base({ width: 300, height: 500, margin: 50 });
  const options = { angle: 180, position: "outside", text: "Long radial title" };
  const first = p.createRadialAxisTitle(options);
  const lineFirst = p.createRadialAxisLine({ angle: 180 }).createRadialAxisTitle(options);
  assert.deepEqual(first.graphicSpec.objects.radialAxisTitle, lineFirst.graphicSpec.objects.radialAxisTitle);
  assert.equal(first.graphicSpec.objects.radialAxisTitle.properties.y, 358);
  assert.equal(first.guideConfigs.axis.radius.layout.angle, 180);
  const changed = first.editRadialAxis({ angle: 0 });
  assert.equal(changed.guideConfigs.axis.radius.layout.angle, 0);
  assert.notDeepEqual(changed.graphicSpec.objects.radialAxisTitle, first.graphicSpec.objects.radialAxisTitle);
  assertAtomicFailures(first, [{ operation: () => first.createRadialAxisLine({ angle: 90 }) }]);
});
