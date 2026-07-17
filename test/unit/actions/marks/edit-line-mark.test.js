import assert from "node:assert/strict";
import test from "node:test";

import { chart } from "../../../../src/index.js";

function completeLineProgram(mark = { id: "trends" }) {
  return chart()
    .createCanvas({ width: 240, height: 160, margin: 20 })
    .createData({
      id: "rows",
      values: [
        { Year: "2000-01-01", y: 0, group: "a" },
        { Year: "2001-01-01", y: 8, group: "a" },
        { Year: "2002-01-01", y: 4, group: "a" }
      ]
    })
    .createLineMark(mark)
    .encodeX({ field: "Year", fieldType: "temporal" })
    .encodeY({ field: "y", aggregate: "mean" });
}

test("materializes every accepted create-time curve vocabulary", () => {
  for (const curve of [
    "linear", "step", "step-before", "step-after",
    "basis", "cardinal", "monotone", "natural"
  ]) {
    const program = completeLineProgram({ id: "trends", curve });
    const commands = program.graphicSpec.objects.trends.items[0]
      .properties.commands;
    assert.equal(program.markConfigs.trends.curve, curve);
    assert.equal(commands[0].op, "M");
    assert.equal(
      curve === "linear" || curve.startsWith("step")
        ? commands.slice(1).every(command => command.op === "L")
        : commands.slice(1).every(command => command.op === "C"),
      true,
      curve
    );
  }
});

test("edits line curve and width through one nested rematerialization", () => {
  const before = completeLineProgram();
  const after = before.editLineMark({ curve: "monotone", strokeWidth: 4 });
  const commands = after.graphicSpec.objects.trends.items[0].properties.commands;

  assert.deepEqual(after.semanticSpec, before.semanticSpec);
  assert.deepEqual(after.markConfigs.trends, {
    curve: "monotone",
    strokeWidth: 4
  });
  assert.equal(commands[0].op, "M");
  assert.equal(commands.slice(1).every(command => command.op === "C"), true);
  assert.equal(after.graphicSpec.objects.trends.items[0].properties.strokeWidth, 4);
  assert.deepEqual(
    after.trace.children.at(-1).children.map(child => child.op),
    ["rematerializeLineMark"]
  );
  assert.equal(
    before.graphicSpec.objects.trends.items[0].properties.commands[1].op,
    "L"
  );
  assert.deepEqual(before.markConfigs.trends, {});
});

test("edits constant line stroke and opacity and retains them after resize", () => {
  const before = completeLineProgram();
  const edited = before.editLineMark({ stroke: "#7c3aed", opacity: 0.55 });
  const resized = edited.editCanvas({ width: 300 });

  for (const program of [edited, resized]) {
    const properties = program.graphicSpec.objects.trends.items[0].properties;
    assert.equal(properties.stroke, "#7c3aed");
    assert.equal(properties.opacity, 0.55);
  }
  assert.deepEqual(edited.markConfigs.trends, {
    stroke: "#7c3aed",
    opacity: 0.55
  });
});

test("supports explicit, current, and unique line target resolution", () => {
  const base = completeLineProgram();
  assert.equal(base.editLineMark({ strokeWidth: 3 }).markConfigs.trends.strokeWidth, 3);
  assert.equal(
    base._clone({ context: {} })
      .editLineMark({ curve: "step" })
      .markConfigs.trends.curve,
    "step"
  );
  assert.equal(
    base.editLineMark({ target: "trends", curve: "natural" })
      .markConfigs.trends.curve,
    "natural"
  );

  const incomplete = chart()
    .createData({ id: "rows", values: [] })
    .createLineMark({ id: "empty" })
    .editLineMark({ curve: "cardinal", strokeWidth: 1 });
  assert.deepEqual(incomplete.markConfigs.empty, {
    curve: "cardinal",
    strokeWidth: 1
  });
  assert.deepEqual(incomplete.graphicSpec.objects.empty.items, []);
  assert.deepEqual(incomplete.trace.children.at(-1).children, []);
});

test("retains curve appearance across Canvas and grouping rematerialization", () => {
  const curved = completeLineProgram()
    .editLineMark({ curve: "monotone", strokeWidth: 4 });
  const beforeCommands = curved.graphicSpec.objects.trends.items[0]
    .properties.commands;
  const resized = curved.editCanvas({ width: 300 });
  const rescaled = resized.editScale({ id: "y", domain: [0, 10] });
  const grouped = rescaled.encodeGroup({ field: "group" });
  const commands = grouped.graphicSpec.objects.trends.items[0]
    .properties.commands;

  assert.notDeepEqual(commands, beforeCommands);
  assert.equal(commands.slice(1).every(command => command.op === "C"), true);
  assert.equal(
    grouped.graphicSpec.objects.trends.items[0].properties.strokeWidth,
    4
  );
  assert.deepEqual(grouped.markConfigs.trends, curved.markConfigs.trends);
});

test("rejects invalid and ambiguous edits without changing prior programs", () => {
  const base = completeLineProgram();
  assert.throws(() => base.editLineMark({}), /requires stroke, strokeWidth, opacity, or curve/);
  assert.throws(
    () => base.editLineMark({ curve: "smooth" }),
    /Unsupported curve interpolation/
  );
  assert.throws(
    () => base.editLineMark({ strokeWidth: -1 }),
    /non-negative finite/
  );
  assert.throws(
    () => base.editLineMark({ opacity: 2 }),
    /from 0 to 1/
  );
  assert.throws(
    () => base.encodeColor({ field: "group" }).editLineMark({ stroke: "red" }),
    /cannot be combined with a color encoding/
  );
  assert.throws(
    () => base.editLineMark({ target: "missing", curve: "linear" }),
    /Unknown line mark target/
  );
  assert.throws(
    () => base.editLineMark({ curve: "linear", fill: "red" }),
    /Unknown editLineMark option/
  );

  const ambiguous = base
    .createLineMark({ id: "other", data: "rows" })
    ._clone({ context: {} });
  assert.throws(
    () => ambiguous.editLineMark({ curve: "linear" }),
    /target is ambiguous/
  );
  assert.deepEqual(base.markConfigs.trends, {});
  assert.equal(
    base.graphicSpec.objects.trends.items[0].properties.commands[1].op,
    "L"
  );
});
