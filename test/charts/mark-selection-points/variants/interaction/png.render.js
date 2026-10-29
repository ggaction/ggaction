import test from "node:test";
import assert from "node:assert/strict";
import { mkdir, writeFile, readFile } from "node:fs/promises";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { createCanvas, loadImage } from "@napi-rs/canvas";
import { createInspectionChart } from "../../../../../examples/inspect-chart/program.js";
import { createInteractionSession } from "../../../../../src/interaction.js";
import { render } from "../../../../../src/index.js";
import { renderToSVG } from "../../../../../src/renderers/svg.js";
import { renderToPNGBuffer } from "../../../../../src/renderers/png.js";
import { renderToPDFBuffer } from "../../../../../src/renderers/pdf.js";
import { serializeGraphic, deserializeGraphic } from "../../../../../src/persistence.js";

import { createSelectionPreviewPrimitive } from "./primitive.program.js";
import { previewVariant } from "./manifest.js";
const output = new URL(`../../../../../.artifacts/test/png/charts/${previewVariant.capability}/${previewVariant.chart}/`, import.meta.url);
async function pixels(buffer) {
  const image = await loadImage(buffer), canvas = createCanvas(image.width, image.height);
  canvas.getContext("2d").drawImage(image, 0, 0); return canvas.getContext("2d").getImageData(0, 0, image.width, image.height).data;
}
test("selection preview and explicit primitive overlay retain exact Canvas, SVG, PNG and PDF output", async () => {
  const p = createInspectionChart().selectMarks({ id: "picked", target: "observations", items: [] })
    .highlightMarks({ selection: "picked", color: "red", bringToFront: false, dimOthers: false });
  const session = createInteractionSession({ program: p, bindings: [{ type: "brush", target: "observations", selection: "picked" }] });
  const listeners = new Map(), captures = new Set(); let pending;
  const host = { getBoundingClientRect: () => ({ left: 0, top: 0, width: 420, height: 300 }),
    addEventListener: (type, fn) => listeners.set(type, fn), removeEventListener: type => listeners.delete(type),
    setPointerCapture: id => captures.add(id), releasePointerCapture: id => captures.delete(id), hasPointerCapture: id => captures.has(id),
    requestAnimationFrame: fn => { pending = fn; return 1; }, cancelAnimationFrame: () => { pending = undefined; } };
  session.mount(host);
  listeners.get("pointerdown")({ pointerId: 1, pointerType: "mouse", clientX: 100, clientY: 120 });
  listeners.get("pointermove")({ pointerId: 1, pointerType: "mouse", clientX: 200, clientY: 230 }); pending();
  const actual = session.getState().previewProgram;
  const primitive = createSelectionPreviewPrimitive(p);
  assert.deepEqual(actual.graphicSpec, primitive.graphicSpec);
  const a = createCanvas(1, 1), b = createCanvas(1, 1); render(actual, a.getContext("2d")); render(primitive, b.getContext("2d"));
  assert.deepEqual(await a.encode("png"), await b.encode("png")); assert.equal(renderToSVG(actual), renderToSVG(primitive));
  await mkdir(output, { recursive: true });
  await writeFile(new URL("variant.json", output), JSON.stringify(previewVariant, null, 2) + "\n");
  const png = (await renderToPNGBuffer(actual)).buffer, reference = (await renderToPNGBuffer(primitive)).buffer;
  assert.deepEqual(await pixels(png), await pixels(reference));
  assert.deepEqual((await renderToPNGBuffer(deserializeGraphic(serializeGraphic(actual)))).buffer, png);
  const data = await pixels(png), i = (150 * 420 + 150) * 4;
  assert.ok(data[i + 2] > data[i] && data[i] < 255, "Literal interior overlay sample contains blue ink");
  for (const [name, value] of [["public", actual], ["primitive", primitive]]) {
    await writeFile(new URL(`${name}.png`, output), (await renderToPNGBuffer(value)).buffer);
    await writeFile(new URL(`${name}.pdf`, output), (await renderToPDFBuffer(value)).buffer);
    execFileSync("pdftoppm", ["-r", "72", "-singlefile", "-png", fileURLToPath(new URL(`${name}.pdf`, output)), fileURLToPath(new URL(`${name}-pdf`, output))], { stdio: "pipe" });
  }
  assert.deepEqual(await pixels(await readFile(new URL("public-pdf.png", output))), await pixels(await readFile(new URL("primitive-pdf.png", output))));
  session.destroy(); assert.equal(session.getState().program, p); assert.equal(session.getState().previewProgram, null);
});
