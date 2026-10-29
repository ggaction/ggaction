import assert from "node:assert/strict";
import test from "node:test";
import { mkdir, writeFile, readFile } from "node:fs/promises";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { createCanvas, loadImage } from "@napi-rs/canvas";
import { renderToPNGBuffer } from "../../../src/renderers/png.js";
import { renderToPDFBuffer } from "../../../src/renderers/pdf.js";
import { createBlendGlyphProgram } from "../../../examples/bar-compositing/program.js";
import { createPrimitiveGlyphProgram } from "./primitive.program.js";
import { assertEquivalentMeaning } from "../../support/identity-equivalence.js";
import { renderWithNativeTrace } from "../../support/native-canvas-trace.js";
async function pixels(buffer) { const image = await loadImage(buffer), c = createCanvas(200, 160); c.getContext("2d").drawImage(image, 0, 0); return c.getContext("2d").getImageData(0, 0, 200, 160).data; }
test("public blended glyphs match independent primitive geometry, drawing and PNG/PDF pixels", async () => {
  for (const type of ["point", "rect", "line", "text"]) for (const blend of ["multiply", "screen", "difference"]) {
    const options = { type, blend }, p = createBlendGlyphProgram(options), primitive = createPrimitiveGlyphProgram(options);
    assertEquivalentMeaning(p.graphicSpec, primitive.graphicSpec);
    assert.deepEqual(renderWithNativeTrace(p, { width: 200, height: 160 }), renderWithNativeTrace(primitive, { width: 200, height: 160 }));
    const directory = fileURLToPath(new URL(`../../../.artifacts/test/png/charts/bar-compositing/glyph-${type}-${blend}/`, import.meta.url));
    await mkdir(directory, { recursive: true });
    const results = [];
    for (const [kind, program] of [["public", p], ["primitive", primitive]]) {
      const png = (await renderToPNGBuffer(program)).buffer, pdf = (await renderToPDFBuffer(program)).buffer;
      await writeFile(directory + kind + ".png", png); await writeFile(directory + kind + ".pdf", pdf);
      execFileSync("pdftoppm", ["-r", "72", "-singlefile", "-png", directory + kind + ".pdf", directory + kind + "-pdf"], { stdio: "pipe" });
      results.push({ png: await pixels(png), pdf: await pixels(await readFile(directory + kind + "-pdf.png")) });
    }
    assert.deepEqual(results[0].png, results[1].png); assert.deepEqual(results[0].pdf, results[1].pdf);
    await writeFile(directory + "variant.json", JSON.stringify({ capability: "bar-compositing", chart: "bar-compositing", variant: `glyph-${type}-${blend}`, title: `${type} ${blend}`, userFacingCallChain: `createBlendGlyphProgram(${JSON.stringify(options)})` }, null, 2) + "\n");
  }
});
