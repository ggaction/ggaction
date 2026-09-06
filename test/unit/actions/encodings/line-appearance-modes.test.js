import assert from "node:assert/strict";
import test from "node:test";
import { chart } from "../../../../src/ChartProgram.js";

const rows = [
  { x: 1, y: 2, series: "A", weight: 1 },
  { x: 2, y: 4, series: "A", weight: 1 },
  { x: 1, y: 5, series: "B", weight: 3 },
  { x: 2, y: 7, series: "B", weight: 3 }
];
function base(values = rows) {
  return chart().createCanvas({ width: 760, height: 500,
    margin: { left: 60, right: 270, top: 60, bottom: 60 } })
    .createData({ id: "data", values }).createLineMark({ id: "paths" })
    .encodeGroup({ field: "series" });
}
function position(program) {
  return program.encodeX({ field: "x" }).encodeY({ field: "y" });
}
function values(program, channel) {
  return program.graphicSpec.objects.paths.items.map(item => item.properties[channel]);
}
const modes = [
  { channel: "strokeWidth", method: "encodeStrokeWidth", range: [2, 8], constant: 5 },
  { channel: "opacity", method: "encodeOpacity", range: [.25, 1], constant: .5 }
];
for (const { channel, method, range, constant } of modes) {
  test(`${channel} supports pending constants and fields with order-independent completion`, () => {
    const empty = base();
    const early = empty[method]({ value: constant });
    assert.equal(early.graphicSpec.objects.paths.items.length, 0);
    assert.equal(early.markConfigs.paths[channel], constant);
    assert.deepEqual(values(position(early), channel), [constant, constant]);
    const fieldArgs = { field: "weight", scale: { domain: [1, 3], range } };
    const beforePosition = position(empty[method](fieldArgs));
    const afterPosition = position(empty)[method](fieldArgs);
    assert.deepEqual(beforePosition.graphicSpec, afterPosition.graphicSpec);
    assert.deepEqual(values(afterPosition, channel), range);
    assert.deepEqual(beforePosition.semanticSpec.layers, afterPosition.semanticSpec.layers);
  });

  test(`${channel} round-trips field, value, field and rejects ineffective scalar edits`, () => {
    const args = { field: "weight", scale: { domain: [1, 3], range } };
    const field = position(base())[method](args);
    const snapshot = JSON.stringify(field);
    assert.throws(() => field.editLineMark({ [channel]: constant }), /conflicts with a field encoding/);
    assert.equal(JSON.stringify(field), snapshot);
    const scalar = field[method]({ value: constant });
    assert.equal(scalar.semanticSpec.layers[0].encoding[channel], undefined);
    assert.equal(scalar.markConfigs.paths[channel], constant);
    assert.deepEqual(values(scalar, channel), [constant, constant]);
    const restored = scalar[method](args);
    assert.equal(restored.markConfigs.paths?.[channel], undefined);
    assert.deepEqual(values(restored, channel), range);
    assert.deepEqual(restored.graphicSpec, field.graphicSpec);
    assert.deepEqual(values(restored.editCanvas({ width: 800 }), channel), range);
    assert.deepEqual(values(field, channel), range);
  });

  test(`${channel} validates mode shape, values, series grain, and selection removal`, () => {
    const program = position(base());
    for (const args of [
      { value: constant, field: "weight" }, { value: constant, scale: {} },
      { value: constant, fieldType: "quantitative" }, { value: NaN }, { value: Infinity },
      { value: -1 }, { field: "missing" }, { field: "weight", fieldType: "nominal" },
      { field: "weight", scale: { range: [2, 1] } }
    ]) assert.throws(() => program[method](args));
    const mixed = rows.map((row, i) => ({ ...row, weight: i === 1 ? 2 : row.weight }));
    assert.throws(() => position(base(mixed))[method]({ field: "weight" }), /one value within each series/);
    const selected = program[method]({ field: "weight", scale: { domain: [1, 3], range } })
      .selectMarks({ id: "chosen", channel, op: "eq", value: 1 });
    const before = JSON.stringify(selected);
    assert.throws(() => selected[method]({ value: constant }), /selection "chosen" references that channel/);
    assert.equal(JSON.stringify(selected), before);
  });

  test(`${channel} replaces only its legend and preserves another scale consumer`, () => {
    const field = position(base()).encodeColor({ field: "series" })
      [method]({ field: "weight", scale: { domain: [1, 3], range } })
      .createLegend({ channels: ["color"] })
      .createLegend({ channels: [channel], count: 3 });
    assert.equal(field.guideConfigs.legend[channel].target, "paths");
    const replaced = field[method]({ value: constant });
    assert.equal(replaced.guideConfigs.legend[channel], undefined);
    assert.deepEqual(replaced.guideConfigs.legend.series.domain, ["A", "B"]);
    assert.ok(replaced.graphicSpec.objects.seriesLegendLabels);
    const shared = field.createLineMark({ id: "other", data: "data" })
      .encodeGroup({ target: "other", field: "series" })
      .encodeX({ target: "other", field: "x" }).encodeY({ target: "other", field: "y" })
      [method]({ target: "other", field: "weight", scale: { id: channel, domain: [1, 3], range } });
    const constantFirst = shared[method]({ target: "paths", value: constant });
    assert.deepEqual(constantFirst.resolvedScales[channel], shared.resolvedScales[channel]);
    assert.deepEqual(constantFirst.graphicSpec.objects.other, shared.graphicSpec.objects.other);
  });
}

test("field opacity survives scale changes and highlight replay without changing series identity", () => {
  const encoded = position(base()).encodeOpacity({ field: "weight", scale: { domain: [1, 3], range: [.25, 1] } });
  const edited = encoded.editScale({ id: "opacity", range: [.1, .6] });
  assert.deepEqual(values(edited, "opacity"), [.1, .6]);
  const highlighted = encoded.highlightMarks({
    select: { field: "series", op: "eq", value: "B" }, opacity: .8
  });
  assert.deepEqual(values(highlighted, "opacity"), [.25, .8]);
  assert.deepEqual(values(highlighted.editCanvas({ width: 900 }), "opacity"), [.25, .8]);
  assert.throws(() => encoded.encodeOpacity({ value: 1.1 }), /opacity/i);
  assert.throws(() => encoded.encodeOpacity({ field: "weight", scale: { unknown: .5 } }), /unknown/);
  assert.throws(() => encoded.editScale({ id: "opacity", unknown: .5 }), /unknown/);
});
