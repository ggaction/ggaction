// Reproduce graduated implementation pairs against the immutable approved V1 pixels.
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import { execFileSync } from "node:child_process";
import { visualVariants } from "../../../../test/charts/area-layout/manifest.js";
import { assertRenderedPNG } from "../../../../test/support/png.js";
import { assertChartProgramsEquivalent } from "../../../../test/support/chart-equivalence.js";
import { assertDisplayedProgram } from "../../../../test/support/visual-variants.js";

const hash = value => createHash("sha256").update(typeof value === "string" || Buffer.isBuffer(value) ? value : JSON.stringify(value)).digest("hex");
const paths = execFileSync("git", ["ls-files", "--cached", "--others", "--exclude-standard", "src", "types", "test/charts/area-layout", "test/oracles/series-area.js", "examples/area-layout"], { encoding: "utf8" }).trim().split("\n");
const sourceHashes = {};
for (const path of [...new Set(paths)].sort()) {
  try { sourceHashes[path] = hash(await readFile(path)); }
  catch (error) { if (error.code !== "ENOENT") throw error; }
}
const approved = JSON.parse(await readFile(new URL("./visual-v1-results.json", import.meta.url), "utf8"));
const record = { version: 1, capability: "series-layout", publicExecuted: true, approvedSourceCommit: "ee9daf0c58eb682a09ab0dddc3af9ff241bb76a1", sourceHashes, variants: [] };
for (const variant of visualVariants) {
  const primitive = variant.primitive(), publicProgram = variant.userFacing();
  assertDisplayedProgram(variant, publicProgram);
  assertChartProgramsEquivalent({ publicProgram, primitiveProgram: primitive });
  const rendered = [];
  for (const [kind, program] of [["primitive", primitive], ["user-facing", publicProgram]]) {
    rendered.push(await assertRenderedPNG(program, {
      width: variant.width, height: variant.height, colors: variant.colors, regions: variant.regions,
      artifact: { ...variant.artifact, chart: variant.chart, variant: variant.variant, kind,
        title: variant.title, userFacingCallChain: variant.callChain }
    }));
  }
  assert.equal(rendered[0].pixelHash, rendered[1].pixelHash, variant.variant);
  const original = approved.variants.find(entry => entry.id === variant.variant);
  assert.equal(rendered[0].pixelHash, original.pixelHash, `${variant.variant}: approved target`);
  assert.equal(hash(publicProgram.graphicSpec), original.graphicHash, `${variant.variant}: approved geometry`);
  record.variants.push({ id: variant.variant, publicCallChain: variant.callChain,
    executedPublicTopLevelOperations: publicProgram.trace.children.map(call => call.op),
    semanticHash: hash(publicProgram.semanticSpec), graphicHash: hash(publicProgram.graphicSpec),
    inputHash: hash(publicProgram.semanticSpec.datasets), pixelHash: rendered[1].pixelHash,
    approvedPixelEquality: true, primitivePublicEquality: true,
    image: `.artifacts/test/png/charts/series-layout/area-layout/${variant.variant}/user-facing.png` });
}
const file = new URL("./implementation-v1-results.json", import.meta.url);
if (process.argv.includes("--record")) await writeFile(file, JSON.stringify(record, null, 2) + "\n");
else assert.deepEqual(record, JSON.parse(await readFile(file, "utf8")));
console.log(`${record.variants.length} public/primitive pairs match approved V1 pixels and geometry.`);
