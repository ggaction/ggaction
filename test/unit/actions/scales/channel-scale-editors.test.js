import assert from "node:assert/strict";
import test from "node:test";
import { chart } from "../../../../src/index.js";
import { chart as basicChart } from "../../../../src/basic.js";

const rows = [
  { x: 1, y: 2, group: "a", amount: 2 },
  { x: 2, y: 3, group: "a", amount: 2 },
  { x: 3, y: 4, group: "b", amount: 5 },
  { x: 4, y: 5, group: "b", amount: 5 }
];

function points(id = "points") {
  return chart()
    .createCanvas({
      width: 500,
      height: 320,
      margin: { top: 30, right: 140, bottom: 40, left: 40 }
    })
    .createData({ id: "rows", values: rows })
    .createPointMark({ id })
    .encodeX({ field: "x" })
    .encodeY({ field: "y" })
    .encodeColor({ field: "group" })
    .encodeSize({ field: "amount" })
    .encodeOpacity({ field: "amount" })
    .encodeShape({ field: "group" });
}

const scale = (program, id) =>
  program.semanticSpec.scales.find(candidate => candidate.id === id);

test("edits Cartesian and point appearance scales through focused wrapped actions", () => {
  const source = points();
  const x = source.editXScale({ domain: [0, 10] });
  const y = source.editYScale({ reverse: true });
  const color = source.editColorScale({ id: "color", range: ["#111111", "#eeeeee"] });
  const size = source.editSizeScale({ range: [20, 80] });
  const opacity = source.editOpacityScale({ range: [0.2, 0.9] });
  const shape = source.editShapeScale({ range: ["square", "diamond"] });

  assert.deepEqual(scale(x, "x").domain, [0, 10]);
  assert.equal(scale(y, "y").reverse, true);
  assert.deepEqual(scale(color, "color").range, ["#111111", "#eeeeee"]);
  assert.deepEqual(scale(size, "size").range, [20, 80]);
  assert.deepEqual(scale(opacity, "opacity").range, [0.2, 0.9]);
  assert.deepEqual(scale(shape, "shape").range, ["square", "diamond"]);
  assert.equal(source.trace.children.at(-1).op, "encodeShape");
  const node = color.trace.children.at(-1);
  assert.equal(node.op, "editColorScale");
  assert.equal(node.children.at(-1).op, "editScale");
});

test("edits Polar radius and theta scales without confusing point radius", () => {
  const source = chart()
    .createCanvas({ width: 320, height: 320, margin: 30 })
    .createData({ values: rows })
    .createPointMark({ id: "polarPoints" })
    .encodeTheta({ field: "x" })
    .encodeR({ field: "amount" })
    .encodePointRadius({ value: 6 });
  const theta = source.editThetaScale({ reverse: true });
  const radius = source.editRScale({ domain: [0, 10] });
  assert.equal(scale(theta, "theta").reverse, true);
  assert.deepEqual(scale(radius, "radius").domain, [0, 10]);
  assert.equal(radius.materializationConfigs.marks.polarPoints.radius, 6);
});

test("edits line stroke width and dash scales", () => {
  const source = chart()
    .createCanvas({ width: 320, height: 240, margin: 30 })
    .createData({ values: rows })
    .createLineMark({ id: "lines" })
    .encodeX({ field: "x" })
    .encodeY({ field: "y" })
    .encodeGroup({ field: "group" })
    .encodeStrokeWidth({ field: "amount" })
    .encodeStrokeDash({ field: "group" });
  const width = source.editStrokeWidthScale({ range: [1, 8] });
  const dash = source.editStrokeDashScale({ range: [[], [6, 2]] });
  assert.deepEqual(scale(width, "strokeWidth").range, [1, 8]);
  assert.deepEqual(scale(dash, "strokeDash").range, [[], [6, 2]]);
});

test("uses explicit targets, current marks, and one unique shared channel scale", () => {
  const shared = points("first")
    .createPointMark({ id: "second", data: "rows" })
    .encodeX({ target: "second", field: "x", scale: { id: "secondX" } })
    .encodeY({ target: "second", field: "y", scale: { id: "secondY" } })
    .encodeColor({ target: "second", field: "group", scale: { id: "color" } })
    .createLegend({ target: "first", channels: ["color"] });
  const viaTarget = shared.editXScale({ target: "first", domain: [0, 8] });
  assert.deepEqual(scale(viaTarget, "x").domain, [0, 8]);
  assert.equal(scale(viaTarget, "secondX").domain, "auto");

  const viaCurrent = shared.editXScale({ reverse: true });
  assert.equal(scale(viaCurrent, "secondX").reverse, true);
  const noCurrent = shared._clone({ context: {} });
  const sharedColor = noCurrent.editColorScale({ palette: "set2" });
  const agreeing = shared.editColorScale({
    id: "color",
    target: "first",
    reverse: true
  });
  assert.deepEqual(scale(sharedColor, "color").range, { palette: "set2" });
  assert.equal(sharedColor.graphicSpec.objects.first.items[0].properties.fill,
    sharedColor.graphicSpec.objects.second.items[0].properties.fill);
  assert.deepEqual(sharedColor.semanticSpec.guides, shared.semanticSpec.guides);
  assert.notDeepEqual(
    sharedColor.graphicSpec.objects.colorLegendSymbols,
    shared.graphicSpec.objects.colorLegendSymbols
  );
  assert.equal(scale(agreeing, "color").reverse, true);
});

test("rejects ambiguity, selector conflicts, wrong channels, orphan scales, and wrong options atomically", () => {
  const two = points("first")
    .createPointMark({ id: "second", data: "rows" })
    .encodeX({ target: "second", field: "x", scale: { id: "secondX" } })
    .encodeY({ target: "second", field: "y", scale: { id: "secondY" } })
    .encodeColor({ target: "second", field: "group", scale: { id: "secondColor" } });
  const ambiguous = two._clone({ context: {} });
  const wrongName = chart()
    .createCanvas()
    .createData({ values: rows })
    .createPointMark()
    .encodeX({ field: "x", scale: { id: "color" } });
  const orphan = chart().createScale({ id: "orphan", type: "ordinal" });
  for (const [program, call, pattern] of [
    [ambiguous, value => value.editColorScale({ reverse: true }), /ambiguous/],
    [two, value => value.editXScale({ id: "x", target: "second", reverse: true }), /does not match/],
    [wrongName, value => value.editColorScale({ id: "color", reverse: true }), /color channel/],
    [orphan, value => value.editColorScale({ id: "orphan", reverse: true }), /bound to the color/],
    [two, value => value.editColorScale({ target: "missing", reverse: true }), /Unknown mark/],
    [two, value => value.editColorScale({ target: "first" }), /at least one/],
    [two, value => value.editColorScale({ target: "first", nice: true }), /Unknown.*nice/]
  ]) {
    const before = JSON.stringify(program);
    assert.throws(() => call(program), pattern);
    assert.equal(JSON.stringify(program), before);
  }
  assert.equal(typeof basicChart().editColorScale, "undefined");
});
