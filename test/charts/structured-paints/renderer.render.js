import assert from "node:assert/strict";
import test from "node:test";
import { mkdtemp, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { createCanvas, loadImage } from "@napi-rs/canvas";
import { renderToSVG } from "../../../src/renderers/svg.js";
import { renderToPDFBuffer } from "../../../src/renderers/pdf.js";
import { renderWithNativeTrace } from "../../support/native-canvas-trace.js";
import { visualVariants } from "./manifest.js";

for (const variant of visualVariants.filter(value => !value.variant.startsWith("radial"))) {
  test(`${variant.variant} native Rect paint equals the independent primitive in Canvas, SVG and PDF`, async () => {
    const programs = [variant.primitive(), variant.userFacing()];
    const traced = programs.map(program => renderWithNativeTrace(program, variant));
    assert.deepEqual(traced[1].calls, traced[0].calls);
    assert.deepEqual(traced[1].rgba, traced[0].rgba);
    const svg = programs.map(program => renderToSVG(program));
    // Paint definition IDs incorporate independently allocated native identity.
    // Require one definition and its exact reference before normalizing only ID.
    const normalized = svg.map(value => {
      const ids = [...value.matchAll(/<pattern id="([^"]+)"/g)].map(match => match[1]);
      assert.equal(ids.length, 1);
      assert.equal(value.split(`url(#${ids[0]})`).length - 1, 1);
      return value.replaceAll(ids[0], "paint-definition");
    });
    assert.equal(normalized[1], normalized[0]);
    assert.match(svg[1], /<pattern\b/);
    const directory = await mkdtemp(path.join(tmpdir(), "pattern-public-renderers-"));
    try {
      const pixels = [];
      for (const [index, program] of programs.entries()) {
        const pdf = await renderToPDFBuffer(program), stem = path.join(directory, `pair-${index}`);
        assert.deepEqual([pdf.width, pdf.height, pdf.pages], [variant.width, variant.height, 1]);
        await writeFile(`${stem}.pdf`, pdf.buffer);
        execFileSync("pdftoppm", ["-r", "72", "-singlefile", "-png", `${stem}.pdf`, stem], { stdio: "pipe" });
        const canvas = createCanvas(variant.width, variant.height);
        canvas.getContext("2d").drawImage(await loadImage(`${stem}.png`), 0, 0);
        pixels.push(canvas.getContext("2d").getImageData(0, 0, variant.width, variant.height).data);
      }
      assert.deepEqual(pixels[1], pixels[0]);
      let ink = 0;
      for (let i = 0; i < pixels[0].length; i += 4) if (pixels[0][i] < 250 || pixels[0][i + 1] < 250 || pixels[0][i + 2] < 250) ink++;
      assert.ok(ink > 25000);
    } finally { await rm(directory, { recursive: true, force: true }); }
  });
}
