import test from "node:test";
import assert from "node:assert/strict";
import { createCanvas, loadImage } from "@napi-rs/canvas";
import { renderCanvasProgram } from "../../../src/renderers/canvas/index.js";
import { renderToPNGBuffer } from "../../../src/renderers/png.js";
import { renderToPDFBuffer } from "../../../src/renderers/pdf.js";
import { renderToSVG } from "../../../src/renderers/svgSerialization.js";
import { collectTransitionGraphics } from "../../../src/renderers/transitionScene.js";
import { canvasSceneProgram } from "../../../src/renderers/canvasScene.js";
import { prepareConcreteHitShape } from "../../../src/interaction/hitConcrete.js";
import { hitShape } from "../../../src/grammar/hitShapes.js";

function source(weight, fill, overrides = {}) {
  return { weight, type: "rect", properties: { x: 2, y: 2, width: 4, height: 4, fill, stroke: "none", strokeWidth: 0 },
    offset: [0, 0], clip: { x: 0, y: 0, width: 12, height: 12 }, clips: [], ...overrides };
}
function program(sources, properties = {}) {
  return { graphicSpec: { objects: { canvas: { type: "canvas", properties: { width: 12, height: 12 } },
    item: { type: "weighted-blend", properties: { sources, ...properties } } }, order: ["canvas", "item"] } };
}
function canvasOf(program, pixelRatio = 1) {
  const canvas = createCanvas(12, 12);
  renderCanvasProgram(program, canvas.getContext("2d"), { pixelRatio }, createCanvas);
  return canvas;
}
const pixel = (canvas, x, y) => [...canvas.getContext("2d").getImageData(x, y, 1, 1).data];

test("Canvas and PNG mix opaque and translucent sources in linear light", async () => {
  const p = program([source(.5, "red"), source(.5, "blue")]);
  for (const ratio of [1, 2]) assert.deepEqual(pixel(canvasOf(p, ratio), 3 * ratio, 3 * ratio), [188, 0, 188, 255]);
  const png = await renderToPNGBuffer(p), decoded = await loadImage(png.buffer), canvas = createCanvas(12, 12);
  canvas.getContext("2d").drawImage(decoded, 0, 0);
  assert.deepEqual(pixel(canvas, 3, 3), [188, 0, 188, 255]);
  const translucent = program([source(.5, "rgba(255,0,0,0.25)"), source(.5, "rgba(0,0,255,0.75)")]);
  const rgba = pixel(canvasOf(translucent), 3, 3);
  assert.ok(Math.abs(rgba[3] - 128) <= 1); assert.ok(Math.abs(rgba[0] - 137) <= 1); assert.ok(Math.abs(rgba[2] - 225) <= 1);
});
test("exact endpoint, offset and source path clips survive scene reconstruction", () => {
  const a = source(1, "red", { offset: [2, 1], clips: [{ type: "path", commands: [{ op: "M", x: 4, y: 3 }, { op: "L", x: 6, y: 3 }, { op: "L", x: 4, y: 5 }, { op: "Z" }] }] });
  const p = program([a, source(0, "blue")]), original = JSON.stringify(p);
  const expected = canvasOf(p), scene = collectTransitionGraphics(p.graphicSpec, new Map());
  assert.deepEqual(pixel(expected, 4, 3), [255, 0, 0, 255]); assert.deepEqual(pixel(expected, 7, 4), [0, 0, 0, 0]);
  assert.deepEqual(canvasOf(canvasSceneProgram(scene)).getContext("2d").getImageData(0, 0, 12, 12).data,
    expected.getContext("2d").getImageData(0, 0, 12, 12).data);
  assert.equal(JSON.stringify(p), original);
  const shape = prepareConcreteHitShape(scene.nodes[0]);
  assert.equal(hitShape(shape, { x: 4.25, y: 3.25 }, { slop: 0 }).hit, true);
  assert.equal(hitShape(shape, { x: 7, y: 4 }, { slop: 0 }).hit, false);
});
test("invalid inactive source, nested source and allocation failure preserve destination pixels", () => {
  const canvas = createCanvas(12, 12), ctx = canvas.getContext("2d");ctx.fillStyle = "green";ctx.fillRect(0, 0, 12, 12);
  const old = ctx.getImageData(0, 0, 12, 12).data;
  for (const p of [program([source(1, "red"), source(0, "blue", { properties: { opacity: -1 } })]),
    program([source(.5, "red"), source(.5, "blue", { type: "weighted-blend" })])]) {
    assert.throws(() => renderCanvasProgram(p, ctx, {}, createCanvas));
    assert.deepEqual(ctx.getImageData(0, 0, 12, 12).data, old);
  }
  const p = program([source(.5, "red"), source(.5, "blue")]);
  assert.throws(() => renderCanvasProgram(p, ctx, {}, () => ({ width: 1, height: 1, getContext() { return {}; } })), /surface/);
  assert.deepEqual(ctx.getImageData(0, 0, 12, 12).data, old);
});
test("SVG uses bounded native arithmetic and PDF lowers only the weighted item", async () => {
  const p = program([source(.5, "red"), source(.5, "blue")]);
  const svg = renderToSVG(p);
  assert.match(svg, /color-interpolation-filters="linearRGB"/);assert.match(svg, /operator="arithmetic"/);
  assert.doesNotMatch(renderToSVG(program([source(1, "red"), source(0, "blue")])), /feComposite/);
  const pdf = await renderToPDFBuffer(p);
  assert.equal(pdf.pages, 1); assert.ok(pdf.bytes > 100);
});

test("transparent, clipped and zero-size sources stay empty while 64-way reduction stays opaque", () => {
  const empty = source(.5, "red", { clip: { x: 0, y: 0, width: 0, height: 0 } });
  assert.deepEqual(pixel(canvasOf(program([empty, { ...empty }])), 3, 3), [0, 0, 0, 0]);
  assert.deepEqual(pixel(canvasOf(program([source(.5, "none"), source(.5, "none")])), 3, 3), [0, 0, 0, 0]);
  assert.deepEqual(pixel(canvasOf(program(Array.from({ length: 64 }, () => source(1 / 64, "red")))), 3, 3), [255, 0, 0, 255]);
  const x = source(.5, "red"); x.properties.width = 0;
  assert.deepEqual(pixel(canvasOf(program([x, { ...x }])), 3, 3), [0, 0, 0, 0]);
});

test("group opacity and backdrop mode apply once after source reduction, including endpoints", () => {
  for (const weights of [[.5, .5], [1, 0]]) {
    const p = program([source(weights[0], "red"), source(weights[1], "blue")], { opacity: .5 });
    assert.equal(pixel(canvasOf(p), 3, 3)[3], 128);
    p.graphicSpec.objects.item.properties.opacity = 0;
    assert.deepEqual(pixel(canvasOf(p), 3, 3), [0, 0, 0, 0]);
    p.graphicSpec.objects.item.properties.opacity = 1;p.graphicSpec.objects.item.properties.blend = "multiply";
    p.graphicSpec.objects.background = { type: "rect", properties: { x: 0, y: 0, width: 12, height: 12, fill: "#00ff00", stroke: "none", strokeWidth: 0 } };
    p.graphicSpec.order.splice(1, 0, "background");
    assert.deepEqual(pixel(canvasOf(p), 3, 3), [0, 0, 0, 255]);
  }
});

test("item, scene and source-pixel budgets reject before full allocations or destination changes", () => {
  const c = createCanvas(12, 12), ctx = c.getContext("2d");ctx.fillStyle = "green";ctx.fillRect(0, 0, 12, 12);
  const old = ctx.getImageData(0, 0, 12, 12).data;
  for (const [side, groups, count] of [[1024, 1, 2], [1022, 17, 2], [800, 2, 64]]) {
    const p = program([source(.5, "red"), source(.5, "blue")]);p.graphicSpec.objects.canvas.properties = { width: 2048, height: 2048 };
    p.graphicSpec.order = ["canvas"];
    for (let i = 0; i < groups; i++) {
      const sources = Array.from({ length: count }, () => source(1 / count, "red", {
        properties: { x: 0, y: 0, width: side, height: side, fill: "red", stroke: "none", strokeWidth: 0 }, clip: { x: 0, y: 0, width: 2048, height: 2048 } }));
      p.graphicSpec.objects[`item${i}`] = { type: "weighted-blend", properties: { sources } };p.graphicSpec.order.push(`item${i}`);
    }
    delete p.graphicSpec.objects.item;
    let large = 0;
    assert.throws(() => renderCanvasProgram(p, ctx, {}, (w, h) => { if (w * h > 1) large++;return createCanvas(w, h); }), /Weighted blend.*limit|Weighted blend.*budget/);
    assert.equal(large, 0);assert.equal(c.width, 12);assert.deepEqual(ctx.getImageData(0, 0, 12, 12).data, old);
  }
  assert.throws(() => renderCanvasProgram(program([source(1, "red"), source(0, "blue")]), ctx, {}, (w, h) => {
    const offscreen = createCanvas(w, h);offscreen.getContext("2d").getImageData = () => { throw new Error("Unreadable source"); };return offscreen;
  }), /Unreadable source/);
  assert.deepEqual(ctx.getImageData(0, 0, 12, 12).data, old);
});
