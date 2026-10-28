import assert from "node:assert/strict";
import test from "node:test";
import { createCanvas, loadImage } from "@napi-rs/canvas";
import { render } from "../../src/index.js";
import { renderToSVG } from "../../src/renderers/svg.js";
import { renderToPNGBuffer } from "../../src/renderers/png.js";
import { renderToPDFBuffer } from "../../src/renderers/pdf.js";
import { createBlendGlyphProgram } from "../../examples/bar-compositing/program.js";
import { serializeProgram, deserializeProgram } from "../../src/persistence.js";
import { createTransitionScene, renderTransitionScene } from "../../src/scene.js";
import { blendOver } from "../oracles/compositing.js";

function expected(type, blend, opacity) {
  const canvas = createCanvas(200, 160), context = canvas.getContext("2d");
  context.fillStyle = "#336699"; context.fillRect(0, 0, 200, 160);
  const source = createCanvas(200, 160), c = source.getContext("2d");
  c.fillStyle = "red"; c.strokeStyle = "white"; c.lineWidth = 8;
  if (type === "text") {
    c.font = "36px Arial"; c.textAlign = "center"; c.textBaseline = "middle";
    c.strokeText("AB", 100, 80); c.fillText("AB", 100, 80);
  } else if (type === "line") {
    c.strokeStyle = "red"; c.beginPath(); c.moveTo(50, 80); c.lineTo(150, 80); c.stroke();
  } else {
    c.beginPath(); if (type === "point") c.arc(100, 80, 35, 0, 2 * Math.PI); else c.rect(60, 40, 80, 80);
    c.stroke(); c.fill();
  }
  context.globalCompositeOperation = blend; context.globalAlpha = opacity; context.drawImage(source, 0, 0);
  return context.getImageData(0, 0, 200, 160).data;
}
for (const type of ["point", "rect", "line", "text"]) for (const blend of ["multiply", "screen", "difference"]) {
  test(`${type} ${blend} uses one native glyph across Canvas, scene and PNG`, async () => {
    const p = createBlendGlyphProgram({ type, blend }), canvas = createCanvas(1, 1), c = canvas.getContext("2d");
    render(p, c);
    const actual = c.getImageData(0, 0, 200, 160).data, independent = expected(type, blend, .5);
    assert.deepEqual(actual, independent);
    if (type !== "text") {
      const wanted = blendOver([1, 0, 0, .5], [.2, .4, .6, 1], blend).map(v => Math.round(v * 255));
      const pixel = [...c.getImageData(100, 80, 1, 1).data];
      assert.ok(pixel.every((v, i) => Math.abs(v - wanted[i]) <= 1), `${pixel} versus ${wanted}`);
    }
    assert.match(renderToSVG(p), new RegExp(`mix-blend-mode:${blend}`));
    const restored = deserializeProgram(serializeProgram(p));
    const png = await renderToPNGBuffer(restored), image = await loadImage(png.buffer);
    const native = createCanvas(200, 160), nc = native.getContext("2d"); nc.drawImage(image, 0, 0);
    assert.deepEqual(nc.getImageData(0, 0, 200, 160).data, actual);
    assert.equal((await renderToPDFBuffer(restored)).buffer.subarray(0, 4).toString(), "%PDF");
    const scene = createTransitionScene(p, { format: "canvas" });
    const target = createCanvas(1, 1); renderTransitionScene(scene, target.getContext("2d"));
    assert.deepEqual(target.getContext("2d").getImageData(0, 0, 200, 160).data, actual);
    assert.equal(c.globalCompositeOperation, "source-over");
  });
}

test("new isolated circle and Text capability failures happen before destination resize or clear", () => {
  for (const [type, missing] of [["point", "arc"], ["text", "fillText"], ["text", "rotate"]]) {
    const canvas = createCanvas(7, 9), c = canvas.getContext("2d"); c.fillStyle = "lime"; c.fillRect(0, 0, 7, 9);
    const before = c.getImageData(0, 0, 7, 9).data;
    const source = createCanvas(1, 1), sourceContext = source.getContext("2d");
    Object.defineProperty(sourceContext, missing, { value: undefined });
    canvas.ownerDocument = { createElement: () => source };
    assert.throws(() => render(createBlendGlyphProgram({ type }), c), /compatible Canvas surface/);
    assert.equal(canvas.width, 7); assert.equal(canvas.height, 9); assert.deepEqual(c.getImageData(0, 0, 7, 9).data, before);
  }
});


test("omitted glyph blend never reads an inherited property during Canvas or SVG rendering", () => {
  const p = createBlendGlyphProgram({ type: "text", blend: "normal" });
  let reads = 0;
  Object.defineProperty(Object.prototype, "blend", { configurable: true, get() { reads++; return undefined; } });
  try { renderToSVG(p); render(p, createCanvas(1, 1).getContext("2d")); }
  finally { delete Object.prototype.blend; }
  assert.equal(reads, 0);
});
