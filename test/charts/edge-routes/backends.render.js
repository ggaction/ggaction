import assert from "node:assert/strict";
import test from "node:test";
import { mkdtemp, writeFile, rm } from "node:fs/promises";
import { execFileSync } from "node:child_process";
import { tmpdir } from "node:os";
import path from "node:path";
import { createCanvas, loadImage } from "@napi-rs/canvas";
import { render } from "../../../src/index.js";
import { renderToSVG } from "../../../src/renderers/svg.js";
import { renderToPNGBuffer } from "../../../src/renderers/png.js";
import { renderToPDFBuffer } from "../../../src/renderers/pdf.js";
import { serializeProgram, deserializeProgram } from "../../../src/persistence.js";
import { createEdgeRouteRendererProgram } from "./renderer-program.js";
import { routeMethods } from "./reference-values.js";
import { createEdgeRoutePrimitive } from "./primitive.program.js";

const pixels = canvas => Buffer.from(canvas.getContext("2d").getImageData(0, 0, 320, 240).data);
async function decoded(image) {
  const canvas = createCanvas(320, 240); canvas.getContext("2d").drawImage(await loadImage(image), 0, 0); return pixels(canvas);
}
for (const method of routeMethods) test(`${method} complete and clipped paths match explicit primitives in Canvas, SVG, PNG and PDF`, async () => {
  const directory = await mkdtemp(path.join(tmpdir(), "route-renderers-"));
  try {
    for (const clipped of [false, true]) {
      const original = createEdgeRouteRendererProgram(method);
      const native = clipped ? original.editCanvas({ margin: { left: 80, right: 80, top: 70, bottom: 70 } }).editGraphPlot({ clip: true }) : original;
      const programs = [createEdgeRoutePrimitive(method, clipped), native, deserializeProgram(serializeProgram(native))];
      const results = [];
      for (const [index, program] of programs.entries()) {
        const canvas = createCanvas(320, 240); render(program, canvas.getContext("2d"));
        const svg = renderToSVG(program), png = await renderToPNGBuffer(program), pdf = await renderToPDFBuffer(program);
        const stem = path.join(directory, `${clipped}-${index}`);
        await writeFile(`${stem}.pdf`, pdf.buffer);
        execFileSync("pdftoppm", ["-r", "72", "-singlefile", "-png", `${stem}.pdf`, stem], { stdio: "pipe" });
        results.push({ canvas: pixels(canvas), svg: await decoded(Buffer.from(svg)), png: await decoded(png.buffer), pdf: await decoded(`${stem}.png`) });
      }
      for (const backend of ["canvas", "svg", "png", "pdf"]) {
        assert.deepEqual(results[1][backend], results[0][backend], `${method}/${clipped}/${backend} public versus primitive`);
        assert.deepEqual(results[2][backend], results[0][backend], `${method}/${clipped}/${backend} codec`);
        let ink = 0;
        for (let i = 0; i < results[0][backend].length; i += 4)
          if (results[0][backend][i + 3] && results[0][backend][i] + results[0][backend][i + 1] + results[0][backend][i + 2] < 700) ink++;
        assert.ok(ink > (clipped ? 100 : 500), `${method}/${backend} draws actual paths`);
      }
    }
  } finally { await rm(directory, { recursive: true, force: true }); }
});
