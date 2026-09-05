// Active review runner: the fixture owner lives in test/gates until graduation.
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import { execFileSync } from "node:child_process";
import { createCanvas, loadImage } from "@napi-rs/canvas";
import { visualVariants } from "../../../../test/gates/area-layout/manifest.js";
import { assertRenderedPNG } from "../../../../test/support/png.js";

const hash = value => createHash("sha256").update(typeof value === "string" || Buffer.isBuffer(value) ? value : JSON.stringify(value)).digest("hex");
const sources = ["test/oracles/series-area.js", ...["targets.json", "reference-values.js", "primitive.program.js", "manifest.js", "reference-values.test.js", "primitive.test.js", "png.render.js"].map(file => `test/gates/area-layout/${file}`)];
const record = { version: 1, gate: "R6-P4-V1", publicExecuted: false,
  sourceTree: execFileSync("git", ["rev-parse", "HEAD:src"], { encoding: "utf8" }).trim(),
  sourceHashes: Object.fromEntries(await Promise.all(sources.map(async file => [file, hash(await readFile(file))]))),
  variants: [] };
for (const variant of visualVariants) {
  const program = variant.primitive();
  const rendered = await assertRenderedPNG(program, {
    width: variant.width, height: variant.height, colors: variant.colors, regions: variant.regions,
    artifact: { ...variant.artifact, chart: variant.chart, variant: variant.variant, kind: "primitive",
      title: variant.title, userFacingCallChain: variant.callChain }
  });
  record.variants.push({ id: variant.variant, targetPublicCallChain: variant.callChain,
    executedPrimitiveTopLevelOperations: program.trace.children.map(call => call.op),
    layer: program.semanticSpec.layers[0], resolvedScales: program.resolvedScales,
    graphicItems: program.graphicSpec.objects.m.items, graphicHash: hash(program.graphicSpec),
    inputHash: hash(program.semanticSpec.datasets), pixelHash: rendered.pixelHash,
    regions: rendered.regionResults.map(region => ({ ...region, colorCounts: Object.fromEntries(region.colorCounts) })),
    image: `.artifacts/test/png/review/area-layout/${variant.variant}/primitive.png` });
}
for (let sheet = 0; sheet < 3; sheet++) {
  const variants = record.variants.slice(sheet * 4, sheet * 4 + 4);
  const canvas = createCanvas(1200, variants.length > 2 ? 920 : 460), context = canvas.getContext("2d");
  context.fillStyle = "white"; context.fillRect(0, 0, canvas.width, canvas.height);
  for (const [i, variant] of variants.entries()) {
    const x = i % 2 * 600, y = Math.floor(i / 2) * 460;
    context.drawImage(await loadImage(variant.image), x, y + 35, 600, 420);
    context.fillStyle = "#111"; context.font = "16px sans-serif"; context.fillText(variant.id, x + 20, y + 25);
  }
  await writeFile(`.artifacts/test/png/review/area-layout/contact-${sheet + 1}.png`, canvas.toBuffer("image/png"));
}
const file = new URL("./visual-v1-results.json", import.meta.url);
if (process.argv.includes("--record")) await writeFile(file, JSON.stringify(record, null, 2) + "\n");
else assert.deepEqual(record, JSON.parse(await readFile(file, "utf8")));
console.log(`${record.variants.length} primitive targets rendered; ${process.argv.includes("--record") ? "recorded" : "verified"}. Public flows not executed.`);
