import assert from "node:assert/strict";
import test from "node:test";
import { inflateSync } from "node:zlib";
import { createCanvas } from "@napi-rs/canvas";
import { chart, render } from "../../src/index.js";
import { renderToSVG } from "../../src/renderers/svg.js";
import { renderToPNGBuffer } from "../../src/renderers/png.js";
import { renderToPDFBuffer } from "../../src/renderers/pdf.js";
import { serializeProgram, deserializeProgram, serializeGraphic, deserializeGraphic } from "../../src/persistence.js";
import { createTransitionScene, renderTransitionScene } from "../../src/scene.js";
import { blendOver } from "../oracles/compositing.js";

const rows = [{ category: "a", group: "east", value: 1 }, { category: "b", group: "west", value: 2 }];
const items = program => program.graphicSpec.objects.bars.items;
const layer = program => program.semanticSpec.layers[0];
function example(blend) {
  return chart().createCanvas({ width: 300, height: 240, margin: 30, background: "#336699" })
    .createData({ id: "rows", values: rows }).createParameter({ id: "warm", value: true })
    .createBarPlot({ id: "bars", x: "category", y: { field: "value", aggregate: "sum" }, guides: false })
    .editBarMark({ blend, stroke: false })
    .encodeColor({ conditions: [{ when: { version: 2, registry: "standard@1", root: { type: "parameter", id: "warm" } },
      value: { value: "#ff0000" } }], otherwise: { value: "#0000ff" } })
    .selectMarks({ id: "chosen", target: "bars", grain: "item", field: "category", op: "eq", value: "a" })
    .encodeOpacity({ conditions: [{ when: { selection: "chosen" }, value: { value: 0.5 } }], otherwise: { value: 1 } });
}
function assertAppearance(program, mode, color, opacities) {
  assert.equal(layer(program).mark.blend, mode);
  assert.deepEqual(items(program).map(item => [item.properties.blend, item.properties.fill, item.properties.opacity]),
    opacities.map(opacity => [mode, color, opacity]));
  assert.equal(layer(program).encoding.color, undefined);
  assert.equal(layer(program).encoding.opacity, undefined);
  assert.equal(program.markConfigs.bars.barAppearance.fill, undefined);
  assert.equal(program.markConfigs.bars.barAppearance.opacity, undefined);
}
function paint(program) {
  const canvas = createCanvas(1, 1), context = canvas.getContext("2d");
  render(program, context);
  return { canvas, context, pixels: context.getImageData(0, 0, canvas.width, canvas.height).data };
}
function pdfStreams(buffer) {
  return [...buffer.toString("latin1").matchAll(/stream\r?\n([\s\S]*?)\r?\nendstream/g)].map(match => {
    const bytes = Buffer.from(match[1], "latin1");
    try { return inflateSync(bytes); } catch { return bytes; }
  });
}

for (const mode of ["multiply", "screen"]) {
  test(`conditional appearance preserves ${mode} through parameter, selection, data and geometry replay`, () => {
    const original = example(mode), before = serializeProgram(original);
    assertAppearance(original, mode, "#ff0000", [0.5, 1]);
    const parameter = original.editParameter({ target: "warm", value: false });
    assertAppearance(parameter, mode, "#0000ff", [0.5, 1]);
    assert.deepEqual(items(parameter).map(item => item.identity), items(original).map(item => item.identity));
    assert.equal(layer(parameter).conditionals.color.parameterInputs[0].revision, 1);
    const selected = parameter.editMarkSelection({ selection: "chosen", field: "category", op: "eq", value: "b" });
    assertAppearance(selected, mode, "#0000ff", [1, 0.5]);
    assert.equal(layer(selected).conditionals.opacity.selectionInputs[0].revision, 1);
    const revised = selected.reviseData({ source: "rows", id: "next", values: [{ ...rows[1], value: 4 }, { ...rows[0], value: 3 }], rowMap: [1, 0] });
    assertAppearance(revised, mode, "#0000ff", [0.5, 1]);
    assert.deepEqual(items(revised).map(item => item.identity.key), [...items(original)].reverse().map(item => item.identity.key));
    assert.deepEqual(items(revised).map(item => item.identity.lineage.revision), [1, 1]);
    const geometry = revised.editYScale({ domain: [0, 8], nice: false }).editCanvas({ width: 360 });
    assertAppearance(geometry, mode, "#0000ff", [0.5, 1]);
    assert.notDeepEqual(items(geometry).map(item => item.properties.width), items(revised).map(item => item.properties.width));
    assert.deepEqual(deserializeProgram(serializeProgram(geometry)).graphicSpec, geometry.graphicSpec);
    assert.equal(serializeProgram(original), before);
  });

  test(`conditional appearance and ${mode} have independent reset and removal owners`, () => {
    const original = example(mode), conditions = layer(original).conditionals;
    const normal = original.editBarMark({ blend: "normal" });
    assert.equal(layer(normal).mark.blend, undefined);
    assert.deepEqual(layer(normal).conditionals, conditions);
    assert.deepEqual(items(normal).map(item => [item.properties.fill, item.properties.opacity]), [["#ff0000", 0.5], ["#ff0000", 1]]);
    assert.ok(items(normal).every(item => item.properties.blend === undefined));
    assert.doesNotMatch(renderToSVG(normal), /mix-blend-mode|isolation:isolate/);
    const removed = original.removeEncoding({ target: "bars", channel: "color" });
    assert.equal(layer(removed).conditionals.color, undefined);
    assert.deepEqual(layer(removed).conditionals.opacity, conditions.opacity);
    assert.equal(layer(removed).mark.blend, mode);
    assert.ok(items(removed).every(item => item.properties.blend === mode));
    const replaced = original.encodeColor({ target: "bars", value: "#00ff00" });
    assert.equal(layer(replaced).conditionals.color, undefined);
    assert.equal(layer(replaced).mark.blend, mode);
    assert.deepEqual(items(replaced).map(item => item.properties.fill), ["#00ff00", "#00ff00"]);
  });

  test(`conditional facet replay preserves ${mode}, source selectors and exact parameter revisions`, () => {
    const original = example(mode).facet({ id: "panels", field: "group" });
    const before = serializeProgram(original);
    const revised = deserializeProgram(before).editParameter({ target: "warm", value: false });
    const children = Object.values(revised.children);
    assert.equal(children.length, 2);
    for (const child of children) {
      assert.equal(layer(child).mark.blend, mode);
      assert.equal(layer(child).conditionals.color.parameterInputs[0].revision, 1);
      assert.ok(items(child).every(item => item.properties.blend === mode && item.properties.fill === "#0000ff"));
    }
    assert.deepEqual(children.map(child => items(child)[0].properties.opacity), [0.5, 1]);
    assert.deepEqual(deserializeProgram(serializeProgram(revised)).graphicSpec, revised.graphicSpec);
    assert.equal(serializeProgram(original), before);
  });

  test(`conditional ${mode} output is concrete across codec, Canvas, SVG, PNG, PDF and scene endpoints`, async () => {
    const program = example(mode).editParameter({ target: "warm", value: false })
      .editMarkSelection({ selection: "chosen", field: "category", op: "eq", value: "b" });
    const graphic = deserializeGraphic(serializeGraphic(program)), concrete = paint(graphic);
    assert.equal(graphic.semanticSpec, undefined);
    assert.deepEqual(concrete.pixels, paint(program).pixels);
    for (const item of items(program)) {
      const { x, y, width, height, opacity } = item.properties;
      const actual = [...concrete.context.getImageData(Math.floor(x + width / 2), Math.floor(y + height / 2), 1, 1).data];
      const expected = blendOver([0, 0, 1, opacity], [0.2, 0.4, 0.6, 1], mode).map(value => Math.round(value * 255));
      actual.forEach((value, i) => assert.ok(Math.abs(value - expected[i]) <= (i === 3 ? 0 : 1), JSON.stringify({ actual, expected })));
    }
    assert.equal(renderToSVG(graphic), renderToSVG(program));
    assert.match(renderToSVG(graphic), new RegExp(`mix-blend-mode:${mode}`));
    assert.deepEqual((await renderToPNGBuffer(graphic)).buffer, (await renderToPNGBuffer(program)).buffer);
    assert.deepEqual(pdfStreams((await renderToPDFBuffer(graphic)).buffer), pdfStreams((await renderToPDFBuffer(program)).buffer));
    const scene = createTransitionScene(graphic, { format: "canvas" });
    assert.deepEqual(scene, createTransitionScene(program, { format: "canvas" }));
    assert.deepEqual(scene.nodes.filter(node => node.properties.blend === mode).map(node => [node.properties.fill, node.properties.opacity]), [["#0000ff", 1], ["#0000ff", 0.5]]);
    const surface = createCanvas(1, 1), context = surface.getContext("2d"); renderTransitionScene(scene, context);
    assert.deepEqual(context.getImageData(0, 0, surface.width, surface.height).data, concrete.pixels);
  });
}
