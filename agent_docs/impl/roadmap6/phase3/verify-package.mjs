import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { createPackageArtifact } from "../../../../scripts/package-artifact.js";
import { preparePackageConsumer, testPackageConsumer } from "../../../../scripts/package-consumer.js";
import { BROWSER_BUNDLE_GZIP_LIMITS, measureMinimalBrowserBundle } from "../../../../scripts/browser-bundle-size.js";

const root = fileURLToPath(new URL("../../../../", import.meta.url));
process.chdir(root);
const git = (...args) => execFileSync("git", args, { encoding: "utf8" }).trim();
assert.equal(git("status", "--porcelain", "--", "src", "types", "knowledge", "scripts", "package.json", "package-lock.json",
  "agent_docs/impl/roadmap6/phase3/verify-package.mjs"), "", "Commit package sources before recording evidence.");
const artifact = await createPackageArtifact();
let packageError;
try {
  await testPackageConsumer({ packageSpec: artifact.file });
} catch (error) {
  // Only an explicit bundle-budget failure is a reportable partial result.
  // Node, MCP, strict types and tutorial failures still abort this evidence run.
  if (!/^ggaction(?:\/(?:basic|svg))? gzip bundle \d+ exceeds \d+\.$/.test(error.message)) throw error;
  packageError = error.message;
}
const consumer = await preparePackageConsumer({ packageSpec: artifact.file });
let bundles;
try {
  bundles = [];
  for (const specifier of ["ggaction", "ggaction/basic", "ggaction/svg"]) {
    const measured = await measureMinimalBrowserBundle(consumer.directory, { specifier });
    const limit = BROWSER_BUNDLE_GZIP_LIMITS[specifier];
    bundles.push({ ...measured, limit, delta: measured.gzipBytes - limit, passed: measured.gzipBytes <= limit });
  }
} finally {
  await consumer.cleanup();
}
const evidence = {
  version: 1, sourceCommit: git("rev-parse", "HEAD"), runtimeSourceTree: git("rev-parse", "HEAD:src"),
  typesTree: git("rev-parse", "HEAD:types"), knowledgeTree: git("rev-parse", "HEAD:knowledge"),
  environment: { node: process.version, platform: process.platform, arch: process.arch },
  package: { name: artifact.name, version: artifact.version, filename: artifact.filename,
    sha256: artifact.sha256, packedBytes: artifact.size, unpackedBytes: artifact.unpackedSize, entries: artifact.entryCount },
  installedNodeMCPTypesAndTutorials: "passed", packagePassed: packageError === undefined,
  packageError: packageError ?? null, bundles
};
await writeFile(new URL("package-results.json", import.meta.url), `${JSON.stringify(evidence, null, 2)}\n`);
console.log(JSON.stringify(evidence, null, 2));
if (packageError) process.exitCode = 1;
