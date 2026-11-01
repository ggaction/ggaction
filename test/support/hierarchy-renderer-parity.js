import assert from "node:assert/strict";
import { mkdtemp, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { createCanvas, loadImage } from "@napi-rs/canvas";
import { render } from "../../src/index.js";
import { renderToSVG } from "../../src/renderers/svg.js";
import { renderToPDFBuffer } from "../../src/renderers/pdf.js";
import { createMockCanvasContext } from "./canvas.js";
import { assertDisplayedProgram } from "./visual-variants.js";

export async function assertHierarchyRendererParity(variant) {
  const programs = [variant.primitive(), variant.userFacing()];
  assertDisplayedProgram(variant, programs[1]);
  const contexts = programs.map(() => createMockCanvasContext());
  programs.forEach((program, i) => render(program, contexts[i]));
  // The public hierarchy groups its bodies, links and labels in one collection.
  // Compare every drawing/state operation except the extra save/restore pair;
  // native pixels below independently check the resulting graphics state.
  const drawing = context => context.calls.filter(call => !["save", "restore"].includes(call.op));
  assert.deepEqual(drawing(contexts[1]), drawing(contexts[0]));
  const pixels = canvas => Buffer.from(canvas.getContext("2d").getImageData(0, 0, variant.width, variant.height).data);
  const assertPixels = pair => {
    assert.deepEqual(pair[1], pair[0]);
    let ink = 0;
    for (let i = 0; i < pair[0].length; i += 4) if (pair[0][i + 3] > 0 && pair[0][i] + pair[0][i + 1] + pair[0][i + 2] < 700) ink++;
    assert.ok(ink > 1000, `${variant.chart} must draw substantial content`);
  };
  const canvases = programs.map(program => {
    const canvas = createCanvas(variant.width, variant.height);
    render(program, canvas.getContext("2d"));
    return canvas;
  });
  assertPixels(canvases.map(pixels));
  const svgs = programs.map(program => renderToSVG(program));
  // Only attribute-free structural groups differ. Transforms, clips, opacity,
  // attributes, content and element order remain part of the exact comparison.
  for (const svg of svgs) assert.doesNotMatch(svg, /<g\s/);
  assert.equal(svgs[1].replaceAll(/<\/?g>/g, ""), svgs[0].replaceAll(/<\/?g>/g, ""));
  assert.ok(svgs.every(svg => !svg.includes("<image")));
  const svgPixels = [];
  for (const svg of svgs) {
    const canvas = createCanvas(variant.width, variant.height);
    canvas.getContext("2d").drawImage(await loadImage(Buffer.from(svg)), 0, 0);
    svgPixels.push(pixels(canvas));
  }
  assertPixels(svgPixels);
  const directory = await mkdtemp(path.join(tmpdir(), "hierarchy-renderers-"));
  try {
    const pdfPixels = [];
    for (const [i, program] of programs.entries()) {
      const pdf = await renderToPDFBuffer(program), stem = path.join(directory, `pair-${i}`);
      assert.deepEqual([pdf.width, pdf.height, pdf.pages], [variant.width, variant.height, 1]);
      assert.match(pdf.buffer.toString("latin1"), /^%PDF-/);
      await writeFile(`${stem}.pdf`, pdf.buffer);
      execFileSync("pdftoppm", ["-r", "72", "-singlefile", "-png", `${stem}.pdf`, stem], { stdio: "pipe" });
      const canvas = createCanvas(variant.width, variant.height);
      const image = await loadImage(`${stem}.png`);
      assert.deepEqual([image.width, image.height], [variant.width, variant.height]);
      canvas.getContext("2d").drawImage(image, 0, 0);
      pdfPixels.push(pixels(canvas));
    }
    assertPixels(pdfPixels);
  } finally { await rm(directory, { recursive: true, force: true }); }
}
