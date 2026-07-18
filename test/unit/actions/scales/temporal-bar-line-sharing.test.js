import assert from "node:assert/strict";
import test from "node:test";

import { chart } from "../../../../src/index.js";

const rows = Object.freeze([
  Object.freeze({ year: "2000-01-01", otherYear: "2005-01-01", value: 10 }),
  Object.freeze({ year: "2000-01-01", otherYear: "2005-01-01", value: 14 }),
  Object.freeze({ year: "2001-01-01", otherYear: "2006-01-01", value: 20 }),
  Object.freeze({ year: "2002-01-01", otherYear: "2007-01-01", value: 16 })
]);

function sharedProgram() {
  return chart()
    .createCanvas({ width: 360, height: 260, margin: 40 })
    .createData({ values: rows })
    .createBarMark({ id: "bars" })
    .encodeX({ field: "year", fieldType: "temporal" })
    .encodeY({ field: "value", aggregate: "mean" })
    .createLineMark({ id: "trend" });
}

function assertAligned(program) {
  const bars = program.graphicSpec.objects.bars.items;
  const commands = program.graphicSpec.objects.trend.items[0].properties.commands;
  assert.equal(commands.length, bars.length);
  bars.forEach((bar, index) => {
    assert.ok(Math.abs(
      bar.properties.x + bar.properties.width / 2 - commands[index].x
    ) < 1e-9);
    assert.equal(bar.properties.y, commands[index].y);
  });
}

test("keeps shared temporal centers aligned through Canvas and scale edits", () => {
  const original = sharedProgram();
  const resized = original.editCanvas({ width: 500 });
  const reversed = original.editScale({ id: "x", reverse: true });

  assertAligned(original);
  assertAligned(resized);
  assertAligned(reversed);
  assert.notEqual(
    resized.graphicSpec.objects.bars.items[0].properties.x,
    original.graphicSpec.objects.bars.items[0].properties.x
  );
  assert.ok(
    reversed.graphicSpec.objects.bars.items[0].properties.x >
    reversed.graphicSpec.objects.bars.items.at(-1).properties.x
  );
  assertAligned(original);
});

test("preserves explicitly independent temporal and quantitative scales", () => {
  const independent = chart()
    .createCanvas({ width: 360, height: 260, margin: 40 })
    .createData({ values: rows })
    .createBarMark({ id: "bars" })
    .encodeX({ field: "year", fieldType: "temporal", scale: { id: "barX" } })
    .encodeY({ field: "value", aggregate: "mean", scale: { id: "barY" } })
    .createLineMark({ id: "trend", data: "data" })
    .encodeX({
      target: "trend",
      field: "year",
      fieldType: "temporal",
      scale: { id: "lineX" }
    })
    .encodeY({
      target: "trend",
      field: "value",
      aggregate: "mean",
      scale: { id: "lineY" }
    });

  assert.deepEqual(
    independent.semanticSpec.scales.map(scale => scale.id),
    ["barX", "barY", "lineX", "lineY"]
  );
  assert.equal(independent.graphicSpec.objects.trend.items.length, 1);
});

test("rejects a shared temporal scale with different field meaning", () => {
  const independentLine = chart()
    .createCanvas({ width: 360, height: 260, margin: 40 })
    .createData({ values: rows })
    .createBarMark({ id: "bars" })
    .encodeX({ field: "year", fieldType: "temporal" })
    .encodeY({ field: "value", aggregate: "mean" })
    .createLineMark({ id: "trend", data: "data" });

  assert.throws(
    () => independentLine.encodeX({
      target: "trend",
      field: "otherYear",
      fieldType: "temporal",
      scale: { id: "x" }
    }),
    /requires compatible bar or line consumers of one field/
  );
  assert.equal(
    independentLine.semanticSpec.layers.find(layer => layer.id === "trend").encoding,
    undefined
  );
});

test("owns source rows instead of exposing a mutable data refresh path", () => {
  const mutableRows = rows.map(row => ({ ...row }));
  const program = chart()
    .createCanvas({ width: 360, height: 260, margin: 40 })
    .createData({ values: mutableRows })
    .createBarMark({ id: "bars" })
    .encodeX({ field: "year", fieldType: "temporal" })
    .encodeY({ field: "value", aggregate: "mean" })
    .createLineMark({ id: "trend" });
  const before = program.graphicSpec;

  mutableRows[0].value = 999;
  mutableRows.push({ year: "2003-01-01", otherYear: "2008-01-01", value: 30 });

  assert.equal(program.semanticSpec.datasets[0].values[0].value, 10);
  assert.equal(program.semanticSpec.datasets[0].values.length, rows.length);
  assert.equal(program.graphicSpec, before);
  assertAligned(program);
});
