// Replay the approved budget against the original reviewed bytes; never repack.
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { testPackageConsumer } from "../../../../scripts/package-consumer.js";
import { BROWSER_BUNDLE_GZIP_LIMITS } from "../../../../scripts/browser-bundle-size.js";

const previous = JSON.parse(await readFile(new URL("./package-results.json", import.meta.url), "utf8"));
const packageSpec = fileURLToPath(new URL("../../../../.artifacts/roadmap6-authoring/area-layout-package/ggaction-0.0.12.tgz", import.meta.url));
const bytes = await readFile(packageSpec);
assert.equal(createHash("sha256").update(bytes).digest("hex"), previous.artifact.sha256);
assert.equal(bytes.length, previous.artifact.packedBytes);
const result = await testPackageConsumer({ packageSpec });
const record = {
  version: 1,
  scope: "area-and-series-layout-approved-budget",
  reviewCommit: "97e7a60617eeb7d7a1a37ee4f0eecb413792feaf",
  approvalBaselineCommit: "6cac5928bc62924d3b5c962cc7bee8c9b2596428",
  artifact: previous.artifact,
  status: "passed",
  checks: [...previous.checks, "minimal-browser-bundles-and-approved-gzip-guards"],
  browserBundles: Object.fromEntries(Object.values(result.browserBundles).map(bundle => {
    const limit = BROWSER_BUNDLE_GZIP_LIMITS[bundle.specifier];
    return [bundle.specifier, { ...bundle, limit, headroomBytes: limit - bundle.gzipBytes }];
  })),
  mcp: { coldStartMilliseconds: Math.round(result.mcp.coldStartMilliseconds) }
};
await writeFile(new URL("./package-approved-results.json", import.meta.url), JSON.stringify(record, null, 2) + "\n");
console.log(JSON.stringify(record, null, 2));
