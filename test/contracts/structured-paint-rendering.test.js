import assert from "node:assert/strict";
import test from "node:test";
import { createCanvas } from "@napi-rs/canvas";
import { chart, render } from "../../src/index.js";
import { renderToSVG } from "../../src/renderers/svg.js";
import { renderToPDFBuffer } from "../../src/renderers/pdf.js";
import { renderToPNGBuffer } from "../../src/renderers/png.js";
import { serializeGraphic, deserializeGraphic } from "../../src/persistence.js";
import { renderTransitionScene } from "../../src/renderers/canvas/scene.js";
import { createTransitionScene } from "../../src/scene.js";

const pattern = { type: "pattern", style: "cross", pitch: 16, strokeWidth: 4, phase: [0, 0],
  foreground: "rgba(255,0,0,0.5)", background: "rgba(0,0,255,0.5)", origin: { x: 10, y: 10 } };
const radial = { type: "radial-gradient", center: { x: .5, y: .5 }, focal: { x: .5, y: .5 }, radius: .5,
  stops: [{ offset: 0, color: "rgba(255,0,0,.5)" }, { offset: 1, color: "rgba(0,0,255,.5)" }] };
const primitive = (fill, opacity = 1) => chart().createGraphics({ id: "canvas", type: "canvas" })
  .editGraphics({ target: "canvas", property: "width", value: 120 }).editGraphics({ target: "canvas", property: "height", value: 80 })
  .createGraphics({ id: "glyph", type: "rect", parent: "canvas" })
  .editGraphics({ target: "glyph", property: "x", value: 10 }).editGraphics({ target: "glyph", property: "y", value: 10 })
  .editGraphics({ target: "glyph", property: "width", value: 100 }).editGraphics({ target: "glyph", property: "height", value: 60 })
  .editGraphics({ target: "glyph", property: "fill", value: fill }).editGraphics({ target: "glyph", property: "stroke", value: "none" })
  .editGraphics({ target: "glyph", property: "strokeWidth", value: 0 }).editGraphics({ target: "glyph", property: "opacity", value: opacity });
const draw = p => { const canvas = createCanvas(1, 1); render(p, canvas.getContext("2d")); return canvas; };
const sample = (canvas, x, y) => [...canvas.getContext("2d").getImageData(x, y, 1, 1).data];
const near = (actual, expected, tolerance = 2) => assert.ok(actual.every((value, index) => Math.abs(value - expected[index]) <= tolerance), `${actual} != ${expected}`);

test("compound pattern ink and background receive opacity exactly once", () => {
  const p = primitive(pattern, .5), canvas = draw(p);
  // Source-over red(.5) over blue(.5) => [2/3,0,1/3,.75], then opacity .5.
  near(sample(canvas, 26, 26), [170, 0, 85, 96]);
  near(sample(canvas, 34, 34), [0, 0, 255, 64]);
  near(sample(canvas, 0, 0), [0, 0, 0, 0], 0);
  const svg = renderToSVG(p);
  assert.match(svg, /<pattern/); assert.match(svg, /fill-rule="nonzero"/);
  assert.equal((svg.match(/<path /g) ?? []).length, 1);
  assert.equal(renderToSVG(deserializeGraphic(serializeGraphic(p))), svg);
});

test("elliptical radial fill retains independent unit-square samples and native PDF shading", async () => {
  const p = primitive(radial, .5), canvas = draw(p);
  // Equal normalized radial distances along the 100x60 ellipse axes.
  near(sample(canvas, 80, 39), sample(canvas, 59, 52), 8);
  near(sample(canvas, 59, 39), [249, 0, 6, 64], 4);
  near(sample(canvas, 109, 39), [2, 0, 253, 64], 4);
  const result = await renderToPDFBuffer(p), pdf = result.buffer.toString("latin1");
  assert.match(pdf, /\/ShadingType 3\b/);
  assert.doesNotMatch(pdf, /\/Subtype\s*\/Image\b/);
  assert.match(renderToSVG(p), /<radialGradient/);
});

test("text patterns and radial gradients fill the actual multiline rotated glyph and round trip", async () => {
  for (const fill of [{ ...pattern, origin: undefined }, radial]) {
    const authored = { ...fill }; delete authored.origin;
    const p = chart().createCanvas({ width: 240, height: 180, margin: 30 }).createData({ values: [{ x: 1, y: 1 }] })
      .createTextMark({ fill: authored, fontSize: 24, align: "center", rotation: { value: 15, unit: "degrees" } })
      .encodeX({ field: "x" }).encodeY({ field: "y" }).encodeText({ value: "AB\nCD" });
    const canvas = draw(p), plain = draw(p.editTextMark({ fill: "black" }));
    const actual = canvas.getContext("2d").getImageData(0, 0, 240, 180).data;
    const reference = plain.getContext("2d").getImageData(0, 0, 240, 180).data;
    let colored = 0;
    for (let index = 0; index < actual.length; index += 4) {
      if (reference[index] === 255 && reference[index + 1] === 255 && reference[index + 2] === 255) {
        assert.deepEqual([...actual.slice(index, index + 4)], [255, 255, 255, 255], "paint does not replace whitespace with a bounds rectangle");
      } else if (actual[index] !== actual[index + 2]) colored++;
    }
    assert.ok(colored > 100);
    const graphic = deserializeGraphic(serializeGraphic(p));
    const [a, b] = await Promise.all([renderToPNGBuffer(p), renderToPNGBuffer(graphic)]);
    assert.deepEqual(a.buffer, b.buffer);
    assert.match(renderToSVG(p), /<tspan/);
    const scene = createTransitionScene(p, { format: "canvas" }), surface = createCanvas(1, 1);
    renderTransitionScene(scene, surface.getContext("2d"));
    assert.deepEqual(surface.getContext("2d").getImageData(0, 0, 240, 180).data, actual);
  }
});

test("unsupported structured paint contexts reject before canvas resizing or drawing", () => {
  const canvas = createCanvas(7, 9), context = canvas.getContext("2d");
  const unsupported = new Proxy(context, { get(target, key) {
    if (key === "createRadialGradient") return undefined;
    const value = Reflect.get(target, key, target); return typeof value === "function" ? value.bind(target) : value;
  }, set(target, key, value) { return Reflect.set(target, key, value, target); } });
  assert.throws(() => render(primitive(radial), unsupported), /createRadialGradient/);
  assert.equal(canvas.width, 7); assert.equal(canvas.height, 9);
});

test("Text paint preparation rejects missing capabilities and unsafe allocation before output mutation", async () => {
  const { prepareTextPaints } = await import("../../src/renderers/canvas/textPaint.js");
  const { resolveGraphicRenderTarget } = await import("../../src/renderers/canvas/index.js");
  const p = chart().createCanvas({ width: 240, height: 180, margin: 30 }).createData({ values: [{ x: 1, y: 1 }] })
    .createTextMark({ fill: radial, fontSize: 24 }).encodeX({ field: "x" }).encodeY({ field: "y" }).encodeText({ value: "Text" });
  const target = resolveGraphicRenderTarget(p.graphicSpec), canvas = createCanvas(7, 9), context = canvas.getContext("2d");
  assert.throws(() => prepareTextPaints(target, context, { createCanvas: () => ({ getContext: () => ({}) }) }), /compatible surface/);
  assert.throws(() => prepareTextPaints({ ...target, width: 100000 }, context), /raster allocation/);
  assert.throws(() => prepareTextPaints({ ...target, width: 4000, height: 4000 }, context), /work/);
  assert.equal(canvas.width, 7); assert.equal(canvas.height, 9);
  const items = p.graphicSpec.objects.text.items;
  for (const fillBounds of [{ left: 0, top: 1, right: -1, bottom: 2 }, { left: 0, right: 1, top: 0, bottom: Infinity }]) {
    assert.throws(() => p.editGraphics({ target: "text", property: "fillBounds", value: items.map(() => fillBounds) }), /fillBounds/);
  }
  const missing = structuredClone(p.graphicSpec);
  delete missing.objects.text.items[0].properties.fillBounds;
  assert.throws(() => render({ graphicSpec: missing }, context), /fillBounds/);
  assert.equal(canvas.width, 7); assert.equal(canvas.height, 9);
});
