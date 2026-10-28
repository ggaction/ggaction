import assert from "node:assert/strict";
import test from "node:test";
import { createCanvas } from "@napi-rs/canvas";
import { chart, render } from "../../src/index.js";
import { renderToSVG } from "../../src/renderers/svg.js";
import { renderToPNGBuffer } from "../../src/renderers/png.js";
import { renderToPDFBuffer } from "../../src/renderers/pdf.js";
import { serializeGraphic, deserializeGraphic } from "../../src/persistence.js";
import { resolvePrimitiveGraphicBounds } from "../../src/grammar/schemas/graphicBounds.js";

function primitive(type, properties) {
  let p = chart().createGraphics({ id: "canvas", type: "canvas" })
    .editGraphics({ target: "canvas", property: "width", value: 240 })
    .editGraphics({ target: "canvas", property: "height", value: 160 })
    .createGraphics({ id: "glyph", type, parent: "canvas" });
  for (const [property, value] of Object.entries(properties)) p = p.editGraphics({ target: "glyph", property, value });
  return p;
}
const rect = opacity => primitive("rect", { x: 20, y: 20, width: 40, height: 40,
  fill: "rgba(0,0,255,.5)", stroke: "green", strokeWidth: 2,
  outline: { color: "rgba(255,0,0,.5)", width: 8 }, opacity });
const textGlyph = opacity => primitive("text", { x: 20, y: 90, text: "WW", fill: "blue",
  fontSize: 60, fontFamily: "Arial", fontWeight: "normal", textAlign: "left", textBaseline: "alphabetic",
  outline: { color: "red", width: 8 }, opacity });
function draw(p) { const c = createCanvas(1, 1); render(p, c.getContext("2d")); return c; }
function sample(c, x, y) { return [...c.getContext("2d").getImageData(x, y, 1, 1).data]; }
function near(actual, expected, tolerance = 1) {
  assert.ok(actual.every((value, i) => Math.abs(value - expected[i]) <= tolerance), `${actual} != ${expected}`);
}

test("outline draws behind fill and whole-glyph opacity attenuates intrinsic alpha once", () => {
  const p = rect(.5), c = draw(p);
  near(sample(c, 18, 30), [255, 0, 0, 64]);
  near(sample(c, 21, 30), [85, 0, 170, 96], 2);
  near(sample(c, 40, 40), [0, 0, 255, 64]);
  near(sample(c, 15, 30), [0, 0, 0, 0]);
  assert.deepEqual(resolvePrimitiveGraphicBounds("rect", p.graphicSpec.objects.glyph.properties),
    { left: 16, right: 64, top: 16, bottom: 64 });
  const svg = renderToSVG(p);
  assert.match(svg, /paint-order="stroke fill"/);
  assert.doesNotMatch(svg, /stroke="green"/);
  assert.equal(renderToSVG(deserializeGraphic(serializeGraphic(p))), svg);
});

test("Text outline preserves actual native glyph overhang, holes and single opacity", async () => {
  const full = draw(textGlyph(1)), half = draw(textGlyph(.5));
  const a = full.getContext("2d").getImageData(0, 0, 240, 160).data;
  const b = half.getContext("2d").getImageData(0, 0, 240, 160).data;
  let outsideEstimated = 0, ink = 0;
  for (let y = 0; y < 160; y++) for (let x = 0; x < 240; x++) {
    const i = (y * 240 + x) * 4;
    assert.ok(Math.abs(b[i + 3] - Math.round(a[i + 3] * .5)) <= 1, `alpha at ${x},${y}`);
    if (a[i + 3] > 0) { ink++; if (x > 100) outsideEstimated++; }
  }
  assert.ok(ink > 1000 && outsideEstimated > 100);
  assert.deepEqual(sample(half, 30, 30), [0, 0, 0, 0]);
  const graphic = deserializeGraphic(serializeGraphic(textGlyph(.5)));
  assert.deepEqual((await renderToPNGBuffer(graphic)).buffer, (await renderToPNGBuffer(textGlyph(.5))).buffer);
  assert.ok((await renderToPDFBuffer(graphic)).buffer.length > 100);
  assert.match(renderToSVG(graphic), /<text[^>]*paint-order="stroke fill"/);
});

test("zero outline width draws no stroke and missing glyph capability fails before target mutation", () => {
  const zero = rect(1).editGraphics({ target: "glyph", property: "outline", value: { color: "red", width: 0 } });
  assert.deepEqual(sample(draw(zero), 18, 30), [0, 0, 0, 0]);
  const canvas = createCanvas(7, 9), context = canvas.getContext("2d");
  const unsupported = new Proxy(context, { get(target, key) {
    if (key === "strokeText") return undefined;
    const value = Reflect.get(target, key, target); return typeof value === "function" ? value.bind(target) : value;
  }, set(target, key, value) { return Reflect.set(target, key, value, target); } });
  assert.throws(() => render(textGlyph(1), unsupported), /strokeText/);
  assert.equal(canvas.width, 7); assert.equal(canvas.height, 9);
  assert.throws(() => rect(1).editGraphics({ target: "glyph", property: "outline", value: false }), /object/);
  const huge = rect(1).editGraphics({ target: "glyph", property: "outline", value: { color: "red", width: 1e20 } });
  assert.throws(() => render(huge, context), /outline width/);
  assert.equal(canvas.width, 7); assert.equal(canvas.height, 9);
});

test("pattern-filled circle and path outlines compose their contour and fill once", () => {
  const fill = { type: "pattern", style: "cross", pitch: 8, strokeWidth: 2, phase: [0, 0],
    foreground: "red", background: "blue", origin: { x: 0, y: 0 } };
  for (const [type, geometry] of [["circle", { x: 40, y: 40, radius: 20 }],
    ["path", { commands: [{ op: "M", x: 20, y: 20 }, { op: "L", x: 60, y: 20 },
      { op: "L", x: 60, y: 60 }, { op: "L", x: 20, y: 60 }, { op: "Z" }] }]]) {
    const p = chart().createGraphics({ id: "canvas", type: "canvas" })
      .editGraphics({ target: "canvas", property: "width", value: 80 })
      .editGraphics({ target: "canvas", property: "height", value: 80 })
      .createGraphics({ id: "shape", type, parent: "canvas", length: 1 })
      .editGraphics({ target: "shape", property: "items", value: [{ type, properties: {
        ...geometry, fill, outline: { color: "white", width: 8 }, opacity: .5 } }] });
    const canvas = createCanvas(1, 1), context = canvas.getContext("2d");
    render(p, context);
    const edge = [...context.getImageData(62, 40, 1, 1).data];
    assert.deepEqual(edge.slice(0, 3), [255, 255, 255]);
    assert.ok(Math.abs(edge[3] - 127.5) <= .5);
    assert.ok(Math.abs(context.getImageData(40, 40, 1, 1).data[3] - 127.5) <= .5);
    assert.equal(context.getImageData(65, 40, 1, 1).data[3], 0);
  }
});
