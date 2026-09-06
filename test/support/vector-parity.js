import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { inflateSync } from "node:zlib";
import { renderToPDF } from "../../src/renderers/pdf.js";
import { renderToSVG } from "../../src/renderers/svg.js";
import { assertDisplayedProgram } from "./visual-variants.js";

function decodedStreams(buffer) {
  return [...buffer.toString("latin1").matchAll(/stream\r?\n([\s\S]*?)\r?\nendstream/g)]
    .map(([, content]) => {
      const raw = Buffer.from(content, "latin1");
      try { return inflateSync(raw).toString("latin1"); }
      catch { return content; }
    });
}

export async function assertVectorParity(variant, { geometry = "path" } = {}) {
  const publicProgram = variant.userFacing();
  const primitive = variant.primitive();
  assertDisplayedProgram(variant, publicProgram);
  const svg = renderToSVG(publicProgram, { title: variant.title });
  assert.equal(svg, renderToSVG(primitive, { title: variant.title }));
  assert.match(svg, new RegExp(`<${geometry}\\b`));
  assert.doesNotMatch(svg, /<image\b/);
  const directory = await mkdtemp(join(tmpdir(), "ggaction-vector-parity-"));
  try {
    const buffers = [];
    for (const [index, program] of [primitive, publicProgram].entries()) {
      const output = join(directory, `${index}.pdf`);
      const result = await renderToPDF(program, { output, metadata: { title: variant.title } });
      assert.deepEqual([result.width, result.height, result.pages], [variant.width, variant.height, 1]);
      const buffer = await readFile(output);
      assert.match(buffer.toString("latin1"), /^%PDF-/);
      assert.doesNotMatch(buffer.toString("latin1"), /\/Subtype\s*\/Image/);
      buffers.push(buffer);
    }
    const streams = buffers.map(decodedStreams);
    assert.ok(streams[0].length > 0);
    assert.match(streams[0].join("\n"), /\bm\b/);
    assert.deepEqual(streams[1], streams[0]);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
}
