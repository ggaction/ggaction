import { assertEquivalentMeaning } from "../../../support/identity-equivalence.js";
import assert from "node:assert/strict";
import test from "node:test";
import { chart } from "../../../../src/index.js";
import { chart as basicChart } from "../../../../src/basic.js";
import { renderToSVG } from "../../../../src/renderers/svg.js";
import { serializeProgram, deserializeProgram } from "../../../../src/persistence.js";

const rows = [
  { level: 2, x: 0, y: 20 }, { level: 2, x: 1, y: 20 },
  { level: 1, x: 0, y: 10 }, { level: 1, x: 1, y: 10 }
];
const scale = { domain: [1, 2], range: [[1, 0], [4, 2]] };
const base = (values = rows) => chart()
  .createCanvas({ width: 420, height: 280, margin: { left: 40, right: 120, top: 40, bottom: 40 } })
  .createData({ values })
  .createLinePlot({ x: "x", y: "y", guides: false });
const encoding = program => program.semanticSpec.layers[0].encoding.strokeDash;
const patterns = program => program.graphicSpec.objects.linePlot.items.map(item => item.properties.strokeDash);
const state = program => JSON.stringify({ semantic: program.semanticSpec, graphic: program.graphicSpec, trace: program.trace });

test("ordinal dash preserves raw types, raw order, explicit domain and implicit path identity", () => {
  const before = base(), original = state(before);
  const program = before.encodeStrokeDash({ field: "level", fieldType: "ordinal", scale });
  assert.deepEqual(encoding(program), { field: "level", fieldType: "ordinal", scale: "strokeDash" });
  assert.deepEqual(program.semanticSpec.datasets[0].values, rows);
  assert.deepEqual(program.resolvedScales.strokeDash.domain, [1, 2]);
  assert.deepEqual(program.resolvedScales.strokeDash.range, [[1, 0], [4, 2]]);
  assert.deepEqual(patterns(program), [[4, 2], [1, 0]]);
  assert.equal(program.graphicSpec.objects.linePlot.items.length, 2);
  assert.equal(state(before), original);
});

test("ordinal automatic domains keep first appearance without sorting numeric categories", () => {
  const program = base().encodeStrokeDash({ field: "level", fieldType: "ordinal" });
  assert.deepEqual(program.resolvedScales.strokeDash.domain, [2, 1]);
  assert.deepEqual(program.semanticSpec.datasets[0].values, rows);
});

test("default and explicit nominal stay exact; ordinal changes meaning without changing an explicit design", () => {
  const omitted = base().encodeStrokeDash({ field: "level", scale }).createLegend();
  const nominal = base().encodeStrokeDash({ field: "level", fieldType: "nominal", scale }).createLegend();
  const ordinal = base().encodeStrokeDash({ field: "level", fieldType: "ordinal", scale }).createLegend();
  assertEquivalentMeaning(omitted.semanticSpec, nominal.semanticSpec);
  assertEquivalentMeaning(omitted.graphicSpec, nominal.graphicSpec);
  assertEquivalentMeaning(nominal.graphicSpec, ordinal.graphicSpec);
  assert.equal(renderToSVG(omitted), renderToSVG(nominal));
  assert.equal(renderToSVG(nominal), renderToSVG(ordinal));
  assert.deepEqual(ordinal.guideConfigs.legend.series.domain, [1, 2]);
});

test("ordinal field assignment converges before and after positions", () => {
  const start = chart().createCanvas({ width: 260, height: 180, margin: 24 })
    .createData({ values: rows }).createLineMark({ id: "paths" });
  const early = start.encodeStrokeDash({ field: "level", fieldType: "ordinal", scale })
    .encodeX({ field: "x" }).encodeY({ field: "y" });
  const late = start.encodeX({ field: "x" }).encodeY({ field: "y" })
    .encodeStrokeDash({ field: "level", fieldType: "ordinal", scale });
  assert.deepEqual(early.graphicSpec, late.graphicSpec);
  assert.deepEqual(early.resolvedScales, late.resolvedScales);
  assert.deepEqual(encoding(early), encoding(late));
});

test("line facade and bulk channel assignment retain ordinal field intent", () => {
  const facade = chart().createCanvas({ width: 420, height: 280, margin: 60 })
    .createData({ values: rows }).createLinePlot({
      x: "x", y: "y", strokeDash: { field: "level", fieldType: "ordinal", scale }
    });
  const bulk = base().encodeChannels({
    target: "linePlot", channels: { strokeDash: { field: "level", fieldType: "ordinal", scale } }
  });
  assert.equal(encoding(facade).fieldType, "ordinal");
  assert.deepEqual(encoding(bulk), encoding(base().encodeStrokeDash({ field: "level", fieldType: "ordinal", scale })));
  assert.deepEqual(patterns(bulk), [[4, 2], [1, 0]]);
});

test("ordinal rule dash maps each original typed category", () => {
  const program = chart().createCanvas({ width: 260, height: 180, margin: 24 })
    .createData({ values: [{ level: 2, lo: 0, hi: 1, y: 20 }, { level: 1, lo: 0, hi: 1, y: 10 }] })
    .createRuleMark({ id: "rules" }).encodeX({ field: "lo", fieldType: "quantitative" })
    .encodeX2({ field: "hi", fieldType: "quantitative" }).encodeY({ field: "y", fieldType: "quantitative" })
    .encodeStrokeDash({ field: "level", fieldType: "ordinal", scale });
  assert.equal(encoding(program).fieldType, "ordinal");
  assert.deepEqual(program.graphicSpec.objects.rules.items.map(item => item.properties.strokeDash), [[4, 2], [1, 0]]);
});

test("scale edits, highlight replay and editable persistence preserve ordinal dash", () => {
  const program = base().encodeGroup({ field: "level" })
    .encodeStrokeDash({ field: "level", fieldType: "ordinal", scale }).createLegend();
  const edited = program.editStrokeDashScale({ domain: [2, 1], range: [[2, 2], [8, 2]] });
  assert.deepEqual(patterns(edited), [[2, 2], [8, 2]]);
  assert.deepEqual(edited.guideConfigs.legend.series.domain, [2, 1]);
  const highlighted = edited.highlightMarks({ select: { field: "level", op: "eq", value: 2 }, opacity: .7 })
    .editCanvas({ width: 500 });
  assert.equal(encoding(highlighted).fieldType, "ordinal");
  assert.deepEqual(patterns(highlighted), [[8, 2], [2, 2]]);
  assert.equal(highlighted.graphicSpec.objects.linePlot.items.at(-1).properties.opacity, .7);
  const restored = deserializeProgram(serializeProgram(highlighted));
  assert.equal(encoding(restored).fieldType, "ordinal");
  assert.deepEqual(restored.graphicSpec, highlighted.graphicSpec);
  assert.equal(renderToSVG(restored), renderToSVG(highlighted));
});

test("field type reassignment and constant replacement retain existing scale and guide lifecycle", () => {
  const named = base().encodeGroup({ field: "level" })
    .encodeStrokeDash({ field: "level", scale: { ...scale, id: "orderedDash" } }).createLegend();
  const ordinal = named.encodeStrokeDash({ field: "level", fieldType: "ordinal" });
  assert.equal(encoding(ordinal).scale, "orderedDash");
  assert.equal(encoding(ordinal).fieldType, "ordinal");
  const constant = ordinal.encodeStrokeDash({ value: "dotted" });
  assert.deepEqual(encoding(constant), { datum: "dotted" });
  assert.equal(constant.guideConfigs.legend, undefined);
  assert.deepEqual(patterns(constant), [[1, 3], [1, 3]]);
  assert.equal(encoding(constant.encodeStrokeDash({ field: "level", fieldType: "ordinal", scale })).fieldType, "ordinal");
});

for (const fieldType of ["quantitative", "temporal", "ordered"]) {
  test(`unsupported dash field type ${fieldType} rejects without changing state`, () => {
    const before = base(), original = state(before);
    assert.throws(() => before.encodeStrokeDash({ field: "level", fieldType }), /categorical field type/);
    assert.equal(state(before), original);
  });
}

test("ordinal intent does not loosen constant-mode or within-series validation", () => {
  const before = base().encodeGroup({ field: "level" }), original = state(before);
  assert.throws(() => before.encodeStrokeDash({ value: [1, 0], fieldType: "ordinal" }), /does not accept fieldType/);
  const mixed = base(rows.map((r, i) => ({ ...r, appearance: i % 2 }))).encodeGroup({ field: "level" });
  const mixedBefore = state(mixed);
  assert.throws(() => mixed.encodeStrokeDash({ field: "appearance", fieldType: "ordinal" }), /one value within each series/);
  assert.equal(state(mixed), mixedBefore);
  assert.equal(state(before), original);
});

// Existing nullish fallback is compatibility behavior, not a new ordinal type.
test("nullish field type keeps the existing nominal fallback", () => {
  const omitted = base().encodeStrokeDash({ field: "level", scale });
  const nullable = base().encodeStrokeDash({ field: "level", fieldType: null, scale });
  assertEquivalentMeaning(nullable.semanticSpec, omitted.semanticSpec);
  assertEquivalentMeaning(nullable.graphicSpec, omitted.graphicSpec);
});

test("ordinal categories preserve distinct numeric, string and boolean raw keys", () => {
  const values = [0, "0", false].flatMap((level, index) => [
    { level, x: 0, y: index + 1 }, { level, x: 1, y: index + 1 }
  ]);
  const program = base(values).encodeStrokeDash({
    field: "level", fieldType: "ordinal",
    scale: { domain: [false, "0", 0], range: [[1, 0], [4, 2], [8, 2]] }
  });
  assert.deepEqual(program.semanticSpec.datasets[0].values, values);
  assert.deepEqual(program.resolvedScales.strokeDash.domain, [false, "0", 0]);
  assert.deepEqual(patterns(program), [[8, 2], [4, 2], [1, 0]]);
});

test("existing Basic stroke-dash entry shares the ordered categorical contract", () => {
  const basic = basicChart()
    .createCanvas({ width: 420, height: 280, margin: { left: 40, right: 120, top: 40, bottom: 40 } })
    .createData({ values: rows }).createLinePlot({ x: "x", y: "y", guides: false })
    .encodeStrokeDash({ field: "level", fieldType: "ordinal", scale });
  const full = base().encodeStrokeDash({ field: "level", fieldType: "ordinal", scale });
  assert.equal(encoding(basic).fieldType, "ordinal");
  assertEquivalentMeaning(basic.graphicSpec, full.graphicSpec);
});
