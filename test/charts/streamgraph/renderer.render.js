import assert from "node:assert/strict";
import test from "node:test";
import { mkdtemp, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { createCanvas, loadImage } from "@napi-rs/canvas";
import { render } from "../../../src/index.js";
import { renderToSVG } from "../../../src/renderers/svg.js";
import { renderToPDFBuffer } from "../../../src/renderers/pdf.js";
import { createMockCanvasContext } from "../../support/canvas.js";
import { visualVariants } from "./manifest.js";
for (const variant of visualVariants) test(`streamgraph ${variant.variant} preserves primitive Canvas calls, SVG and exact PDF pixels`, async () => {
  const programs = [variant.primitive(), variant.userFacing()], contexts = programs.map(() => createMockCanvasContext());
  programs.forEach((p, i) => render(p, contexts[i]));
  assert.deepEqual(contexts[1].calls, contexts[0].calls);
  assert.equal(renderToSVG(programs[1], { resourceNamespace: "same" }), renderToSVG(programs[0], { resourceNamespace: "same" }));
  const directory = await mkdtemp(path.join(tmpdir(), "streamgraph-pdf-"));
  try {
    const pixels = [];
    for (const [i, program] of programs.entries()) {
      const pdf = await renderToPDFBuffer(program), stem = path.join(directory, `streamgraph-${i}`);
      await writeFile(`${stem}.pdf`, pdf.buffer);
      execFileSync("pdftoppm", ["-r", "72", "-singlefile", "-png", `${stem}.pdf`, stem], { stdio: "pipe" });
      const canvas = createCanvas(variant.width, variant.height), ctx = canvas.getContext("2d");
      ctx.drawImage(await loadImage(`${stem}.png`), 0, 0);
      pixels.push(Buffer.from(ctx.getImageData(0, 0, variant.width, variant.height).data));
    }
    assert.equal(Buffer.compare(pixels[0], pixels[1]), 0);
  } finally { await rm(directory, { recursive: true, force: true }); }
});
