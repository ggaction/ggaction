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

test("path-specific inclusive 30000 bound preserves unrelated generated cardinality", () => {
  for (const n of [10000, 10001, 12070, 19999, 20000, 20001, 25909, 29999, 30000]) {
    const input = points(n);
    const commands = buildLinearPathCommands(input);
    assert.equal(commands.length, n);
    assert.equal(validatePathCommands(commands), commands);
    assert.equal(commands.at(-1).x, n - 1);
    assert.equal(input[0].op, undefined);
  }
  assert.throws(() => buildLinearPathCommands(points(30001)), /must not exceed 30000/);
  assert.equal(buildLinearPathCommands(points(29999), { close: true }).length, 30000);
  assert.throws(() => buildLinearPathCommands(points(30000), { close: true }), /must not exceed 30000/);
  assert.throws(() => validatePathCommands([{ op: "M", x: 0, y: 0 }, ...Array.from({ length: 30000 }, (_, x) => ({ op: "L", x, y: 0 }))]), /must not exceed 30000/);
  assert.throws(() => validateGeneratedItemLimit(10001, "symbols"), /must not exceed 10000/);
});

test("all interpolations count expanded commands and reject first overflowing observation", () => {
  for (const curve of CURVE_INTERPOLATIONS) {
    const n = curve === "step" ? 10000 : curve.startsWith("step-") ? 15000 : curve === "basis" ? 29998 : 30000;
    const expected = curve === "step" ? 29998 : curve.startsWith("step-") ? 29999 : 30000;
    assert.equal(buildCurvePathCommands(points(n), curve).length, expected, curve);
    assert.throws(() => buildCurvePathCommands(points(n + 1), curve), /must not exceed 30000/, curve);
  }
});

test("area limit combines both boundaries and closing command, including oriented smooth curves", () => {
  const exact = buildAreaCurvePathCommands(points(14999), points(15000));
  assert.equal(exact.length, 30000);
  assert.equal(exact.at(-1).op, "Z");
  assert.throws(() => buildAreaCurvePathCommands(points(15000), points(15000)), /must not exceed 30000/);
  for (const curve of CURVE_INTERPOLATIONS) {
    const n = curve === "step" ? 5000 : curve.startsWith("step-") ? 7500 : curve === "basis" ? 14997 : 14999;
    const commands = buildAreaCurvePathCommands(points(n).map(p => ({ x: p.y, y: p.x })), points(n).map(p => ({ x: p.y, y: p.x })), curve, { independentAxis: "y" });
    assert.ok(commands.length <= 30000, curve);
    assert.equal(commands.at(-1).op, "Z");
    assert.throws(() => buildAreaCurvePathCommands(points(n + 1), points(n + 1), curve), /must not exceed 30000/, curve);
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

test("ordinary line rejects 30001 atomically and 30000 survives concrete validation", () => {
  const base = chart().createCanvas().createData({ values: points(30001) });
  const before = JSON.stringify(base);
  assert.throws(() => base.createLinePlot({ x: "x", y: "y", guides: false }), /must not exceed 30000/);
  assert.equal(JSON.stringify(base), before);
  const valid = chart().createCanvas().createData({ values: points(30000) }).createLinePlot({ x: "x", y: "y", guides: false });
  assert.equal(deserializeProgram(serializeProgram(valid)).graphicSpec.objects.linePlot.items[0].properties.commands.length, 30000);
});

test("a 25909-vertex line retains every coordinate through native editing and data revision", () => {
  for (const factory of [chart, basicChart]) {
    const values = points(25909);
    const parent = factory().createCanvas({ plot: { width: 800, height: 200 }, margin: 20 })
      .createData({ id: "raw", values });
    const before = serializeProgram(parent);
    const program = parent.createLinePlot({
      x: { field: "x", scale: { domain: [0, 25908] } },
      y: { field: "y", scale: { domain: [0, 10] } }, guides: false
    });
    const commands = program.graphicSpec.objects.linePlot.items[0].properties.commands;
    assert.equal(commands.length, values.length);
    for (const [index, command] of commands.entries()) {
      assert.equal(command.op, index ? "L" : "M");
      assert.ok(Math.abs(command.x - (20 + index / 25908 * 800)) < 1e-9);
      assert.equal(command.y, 220 - index % 11 * 20);
    }
    assert.deepEqual(program.semanticSpec.datasets[0].values, values);
    assert.equal(serializeProgram(parent), before);
    assert.deepEqual(deserializeProgram(serializeProgram(program)).graphicSpec, program.graphicSpec);
    assert.deepEqual(deserializeGraphic(serializeGraphic(program)).graphicSpec, program.graphicSpec);
    if (factory === chart) {
      const snapshot = serializeProgram(program);
      const edited = program.editLineMark({ strokeWidth: 0.2 })
        .editXScale({ domain: [0, 30000] }).editCanvas({ plot: { width: 820, height: 200 } });
      assert.equal(edited.graphicSpec.objects.linePlot.items[0].properties.commands.length, 25909);
      assert.equal(edited.graphicSpec.objects.linePlot.items[0].properties.strokeWidth, 0.2);
      const revised = edited.reviseData({ source: "raw", id: "next", values: points(25910) });
      assert.equal(revised.graphicSpec.objects.linePlot.items[0].properties.commands.length, 25910);
      assert.equal(serializeProgram(program), snapshot);
    }
  }
});

test("30001-vertex creation and revision reject atomically with the shared diagnostic", () => {
  const valid = chart().createCanvas().createData({ id: "raw", values: points(30000) })
    .createLinePlot({ x: "x", y: "y", guides: false });
  const before = serializeProgram(valid);
  assert.throws(() => valid.reviseData({ source: "raw", id: "tooMany", values: points(30001) }), /must not exceed 30000/);
  assert.equal(serializeProgram(valid), before);
  assert.equal(valid.graphicSpec.objects.linePlot.items[0].properties.commands.length, 30000);
});

test("a large concrete line renders without reduction in SVG, Canvas and PDF", async () => {
  const { createCanvas } = await import("@napi-rs/canvas");
  const { render } = await import("../../../src/index.js");
  const { renderToPDFBuffer } = await import("../../../src/renderers/pdf.js");
  const program = chart().createCanvas({ plot: { width: 800, height: 200 }, margin: 20 })
    .createData({ values: points(25909) }).createLinePlot({ x: "x", y: "y", guides: false });
  const stored = serializeProgram(program);
  const svg = renderToSVG(program), path = /<path\b[^>]*\bd="([^"]+)"/.exec(svg);
  assert.ok(path);
  assert.equal((path[1].match(/[MLCZ]/g) ?? []).length, 25909);
  const context = createCanvas(840, 240).getContext("2d");
  render(program, context);
  assert.ok(context.getImageData(0, 0, 840, 240).data.some((value, index) => index % 4 !== 3 && value < 200));
  const pdf = await renderToPDFBuffer(program);
  assert.equal(pdf.buffer.subarray(0, 5).toString(), "%PDF-");
  assert.equal(pdf.pages, 1);
  assert.ok(pdf.bytes > 1000);
  assert.equal(serializeProgram(program), stored);
});
