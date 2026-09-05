import assert from "node:assert/strict";
import test from "node:test";
import { chart, ChartProgram } from "../../../../src/ChartProgram.js";
import { assertChartProgramsEquivalent } from "../../../support/chart-equivalence.js";

const rows = [{ x: 1, weight: 1, group: "A" }, { x: 2, weight: 3, group: "B" }];
const style = Object.freeze({ stroke: "navy", strokeWidth: 4, strokeDash: [6, 2], opacity: .4 });
const children = ["encodeStroke", "encodeStrokeWidth", "encodeStrokeDash", "encodeOpacity"];
function source(program = chart()) {
  return program.createCanvas({ width: 480, height: 320, margin: 50 }).createData({ values: rows });
}
function position(program) { return program.encodeX({ field: "x", fieldType: "quantitative" }); }
function lower(program) {
  return program.encodeStroke({ value: "navy" }).encodeStrokeWidth({ value: 4 })
    .encodeStrokeDash({ value: [6, 2] }).encodeOpacity({ value: .4 });
}

test("Rule creation and editing converge with the existing appearance action chain", () => {
  const primitive = lower(position(source().createRuleMark()));
  const created = position(source().createRuleMark(style));
  const edited = position(source().createRuleMark()).editRuleMark(style);
  for (const program of [created, edited]) {
    assertChartProgramsEquivalent({ publicProgram: program, primitiveProgram: primitive });
    assert.deepEqual(program.editCanvas({ width: 540 }).graphicSpec,
      primitive.editCanvas({ width: 540 }).graphicSpec);
  }
  assert.deepEqual(created.trace.children[2].children.slice(-4).map(node => node.op), children);
  assert.deepEqual(edited.trace.children.at(-1).children.map(node => node.op), children);
  const pending = source().createRuleMark({ strokeWidth: 0, opacity: 0 }).editRuleMark({ strokeDash: "dotted" });
  assert.equal(pending.graphicSpec.objects.rule.items.length, 0);
  assert.equal(position(pending).graphicSpec.objects.rule.items[0].properties.opacity, 0);
});

test("Rule style preflights every field and value before any encoding child", () => {
  const calls = [];
  class Probe extends ChartProgram {
    encodeStroke(args) { calls.push(args); return super.encodeStroke(args); }
  }
  const program = position(source(new Probe()).createRuleMark());
  const before = JSON.stringify(program);
  for (const args of [{}, { stroke: false }, { stroke: "" }, { strokeWidth: -1 },
    { strokeDash: [0, 0] }, { opacity: 2 }, { opacity: NaN }, { fill: "red" },
    { stroke: "red", strokeWidth: -1 }, { target: "missing", stroke: "red" }]) {
    assert.throws(() => program.editRuleMark(args));
    assert.equal(JSON.stringify(program), before);
  }
  assert.deepEqual(calls, []);
  assert.throws(() => source(new Probe()).createRuleMark({ stroke: "red", opacity: 2 }));
  assert.deepEqual(calls, []);
  for (const [channel, method, field, value] of [
    ["strokeWidth", "encodeStrokeWidth", "weight", 3],
    ["strokeDash", "encodeStrokeDash", "group", "dashed"],
    ["opacity", "encodeOpacity", "weight", .5]
  ]) {
    const encoded = program[method]({ field });
    assert.throws(() => encoded.editRuleMark({ stroke: "red", [channel]: value }), /conflicts with a field/);
    assert.deepEqual(calls, []);
    const constant = encoded[method]({ value });
    assert.doesNotThrow(() => constant.editRuleMark({ [channel]: value }));
  }
});

test("Rule editing resolves only a current or unique eligible Rule", () => {
  const first = source().createRuleMark({ id: "first" });
  const second = first.createRuleMark({ id: "second" });
  assert.equal(second.editRuleMark({ opacity: .6 }).markConfigs.second.opacity, .6);
  assert.equal(second.editRuleMark({ target: "first", opacity: .3 }).markConfigs.first.opacity, .3);
  const unique = first.createPointMark();
  assert.equal(unique.editRuleMark({ opacity: .3 }).markConfigs.first.opacity, .3);
  assert.throws(() => second.createPointMark().editRuleMark({ opacity: .3 }), /ambiguous/);
  assert.throws(() => unique.editRuleMark({ target: "point", opacity: .3 }), /Unknown rule/);
});
