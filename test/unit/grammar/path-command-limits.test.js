import assert from "node:assert/strict";
import test from "node:test";
import { chart } from "../../../src/index.js";
import { chart as basicChart } from "../../../src/basic.js";
import { serializeProgram, deserializeProgram, serializeGraphic, deserializeGraphic } from "../../../src/persistence.js";
import { renderToSVG } from "../../../src/renderers/svg.js";
import { CURVE_INTERPOLATIONS, buildCurvePathCommands, buildAreaCurvePathCommands } from "../../../src/grammar/curveCommands.js";
import { buildLinearPathCommands, validatePathCommands } from "../../../src/grammar/pathCommands.js";
import { validateGeneratedItemLimit } from "../../../src/core/validation.js";

const points = n => Array.from({ length: n }, (_, i) => ({ x: i, y: i % 11 }));

test("path-specific inclusive 20000 bound preserves unrelated generated cardinality", () => {
  for (const n of [10000, 10001, 12070, 20000]) {
    const input = points(n);
    const commands = buildLinearPathCommands(input);
    assert.equal(commands.length, n);
    assert.equal(validatePathCommands(commands), commands);
    assert.equal(commands.at(-1).x, n - 1);
    assert.equal(input[0].op, undefined);
  }
  assert.throws(() => buildLinearPathCommands(points(20001)), /must not exceed 20000/);
  assert.equal(buildLinearPathCommands(points(19999), { close: true }).length, 20000);
  assert.throws(() => buildLinearPathCommands(points(20000), { close: true }), /must not exceed 20000/);
  assert.throws(() => validatePathCommands([{ op: "M", x: 0, y: 0 }, ...Array.from({ length: 20000 }, (_, x) => ({ op: "L", x, y: 0 }))]), /must not exceed 20000/);
  assert.throws(() => validateGeneratedItemLimit(10001, "symbols"), /must not exceed 10000/);
});

test("all interpolations count expanded commands and reject first overflowing observation", () => {
  for (const curve of CURVE_INTERPOLATIONS) {
    const n = curve === "step" ? 6667 : curve.startsWith("step-") ? 10000 : curve === "basis" ? 19998 : 20000;
    const expected = curve === "step" || curve.startsWith("step-") ? 19999 : 20000;
    assert.equal(buildCurvePathCommands(points(n), curve).length, expected, curve);
    assert.throws(() => buildCurvePathCommands(points(n + 1), curve), /must not exceed 20000/, curve);
  }
});

test("area limit combines both boundaries and closing command, including oriented smooth curves", () => {
  const exact = buildAreaCurvePathCommands(points(9999), points(10000));
  assert.equal(exact.length, 20000);
  assert.equal(exact.at(-1).op, "Z");
  assert.throws(() => buildAreaCurvePathCommands(points(10000), points(10000)), /must not exceed 20000/);
  for (const curve of CURVE_INTERPOLATIONS) {
    const n = curve === "step" ? 3333 : curve.startsWith("step-") ? 5000 : curve === "basis" ? 9997 : 9999;
    const commands = buildAreaCurvePathCommands(points(n).map(p => ({ x: p.y, y: p.x })), points(n).map(p => ({ x: p.y, y: p.x })), curve, { independentAxis: "y" });
    assert.ok(commands.length <= 20000, curve);
    assert.equal(commands.at(-1).op, "Z");
    assert.throws(() => buildAreaCurvePathCommands(points(n + 1), points(n + 1), curve), /must not exceed 20000/, curve);
  }
});

test("ordinary full and basic lines persist all 12070 connected vertices and replay scale/style edits", () => {
  for (const factory of [chart, basicChart]) {
    const rows = points(12070);
    const original = factory().createCanvas({ width: 440, height: 340, margin: 20 }).createData({ values: rows });
    const before = JSON.stringify(original);
    const program = original.createLinePlot({ x: "x", y: "y", guides: false });
    assert.equal(program.graphicSpec.objects.linePlot.items.length, 1);
    assert.equal(program.graphicSpec.objects.linePlot.items[0].properties.commands.length, 12070);
    assert.equal(JSON.stringify(original), before);
    assert.deepEqual(deserializeProgram(serializeProgram(program)).graphicSpec, program.graphicSpec);
    assert.deepEqual(deserializeGraphic(serializeGraphic(program)).graphicSpec, program.graphicSpec);
    assert.ok(renderToSVG(program).includes("<path"));
    if (factory === chart) {
      const edited = program.editYScale({ domain: [0, 20] }).editLineMark({ strokeWidth: 3 });
      assert.equal(edited.graphicSpec.objects.linePlot.items[0].properties.commands.length, 12070);
      assert.equal(edited.graphicSpec.objects.linePlot.items[0].properties.strokeWidth, 3);
      assert.equal(program.graphicSpec.objects.linePlot.items[0].properties.strokeWidth, 2);
    }
  }
});

test("ordinary line rejects 20001 atomically and 20000 survives concrete validation", () => {
  const base = chart().createCanvas().createData({ values: points(20001) });
  const before = JSON.stringify(base);
  assert.throws(() => base.createLinePlot({ x: "x", y: "y", guides: false }), /must not exceed 20000/);
  assert.equal(JSON.stringify(base), before);
  const valid = chart().createCanvas().createData({ values: points(20000) }).createLinePlot({ x: "x", y: "y", guides: false });
  assert.equal(deserializeProgram(serializeProgram(valid)).graphicSpec.objects.linePlot.items[0].properties.commands.length, 20000);
});
