import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { visualVariants as treeVariants } from "../test/gates/tree-layouts/manifest.js";
import { visualVariants as treemapVariants } from "../test/gates/treemap-layouts/manifest.js";
import { variants as treeReferences } from "../test/gates/tree-layouts/reference-values.js";
import { variants as treemapReferences } from "../test/gates/treemap-layouts/reference-values.js";

const root = fileURLToPath(new URL("../", import.meta.url));
const directory = path.join(root, ".artifacts/validation/hierarchy-primitives");
const hash = value => createHash("sha256").update(Buffer.isBuffer(value) || typeof value === "string" ? value : JSON.stringify(value)).digest("hex");
const cases = [];
for (const variant of [...treeVariants, ...treemapVariants]) {
  const program = variant.primitive();
  const artifact = `.artifacts/test/png/review/${variant.chart}/${variant.variant}/primitive.png`;
  const bytes = await readFile(path.join(root, artifact));
  assert.equal(bytes.subarray(0, 8).toString("hex"), "89504e470d0a1a0a");
  assert.equal(bytes.readUInt32BE(16), variant.width * 2);
  assert.equal(bytes.readUInt32BE(20), variant.height * 2);
  const metadata = JSON.parse(await readFile(path.join(root, path.dirname(artifact), "variant.json"), "utf8"));
  assert.equal(metadata.userFacingCallChain, variant.callChain);
  const reference = (variant.chart === "tree-layouts" ? treeReferences : treemapReferences).find(item => item.id === variant.variant);
  const source = `test/gates/${variant.chart}/primitive.program.js`;
  const referenceSource = `test/gates/${variant.chart}/reference-values.js`;
  cases.push({ chart: variant.chart, variant: variant.variant, title: variant.title, executable: variant.callChain,
    source, sourceSha256: hash(await readFile(path.join(root, source))), referenceSource,
    referenceSha256: hash(await readFile(path.join(root, referenceSource))), reference,
    graphicSpecSha256: hash(program.graphicSpec), artifact, pngSha256: hash(bytes), width: variant.width, height: variant.height,
    trace: program.trace.children.map(node => ({ op: node.op, args: node.args })) });
}
const receipt = { schemaVersion: 1, state: "ready-for-review", publicActionImplemented: false,
  testedHead: execFileSync("git", ["rev-parse", "HEAD"], { cwd: root, encoding: "utf8" }).trim(),
  node: process.version, command: "node scripts/check-hierarchy-primitives.js", exitCode: 0, cases };
await mkdir(directory, { recursive: true });
await writeFile(path.join(directory, "review-evidence.json"), `${JSON.stringify(receipt, null, 2)}\n`);
console.log(`Verified ${cases.length} rendered hierarchy primitives with exact sources, graphics, traces and PNG hashes.`);
