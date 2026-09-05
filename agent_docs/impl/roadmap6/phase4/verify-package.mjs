// Record installed-consumer results without changing or bypassing the package guard.
import { writeFile } from "node:fs/promises";
import { createPackageArtifact } from "../../../../scripts/package-artifact.js";
import { preparePackageConsumer, testPackageConsumer } from "../../../../scripts/package-consumer.js";
import { BROWSER_BUNDLE_GZIP_LIMITS, measureMinimalBrowserBundle } from "../../../../scripts/browser-bundle-size.js";

const artifact = await createPackageArtifact({ outputDirectory: new URL("../../../../.artifacts/roadmap6-authoring/area-layout-package/", import.meta.url).pathname });
const record = { version: 1, scope: "area-and-series-layout", artifact: {
  filename: artifact.filename, sha256: artifact.sha256, packedBytes: artifact.size,
  unpackedBytes: artifact.unpackedSize, entries: artifact.entryCount
}, status: "passed", checks: [], browserBundles: {} };
try {
  await testPackageConsumer({ packageSpec: artifact.file });
} catch (error) {
  if (!/^ggaction(?:\/basic|\/svg)? gzip bundle \d+ exceeds \d+\.$/.test(error.message)) throw error;
  record.status = "failed";
  record.error = error.message;
}
// testPackageConsumer reaches its bundle guard only after all four consumer stages succeed.
record.checks = ["node-runtime-and-renderers", "mcp", "strict-typescript", "installed-tutorials"];
const consumer = await preparePackageConsumer({ packageSpec: artifact.file });
try {
  for (const specifier of ["ggaction", "ggaction/basic", "ggaction/svg"]) {
    const bundle = await measureMinimalBrowserBundle(consumer.directory, { specifier });
    const limit = BROWSER_BUNDLE_GZIP_LIMITS[specifier];
    record.browserBundles[specifier] = { ...bundle, limit, excessBytes: Math.max(0, bundle.gzipBytes - limit) };
  }
} finally { await consumer.cleanup(); }
await writeFile(new URL("./package-results.json", import.meta.url), JSON.stringify(record, null, 2) + "\n");
console.log(JSON.stringify(record, null, 2));
process.exitCode = record.status === "passed" ? 0 : 1;
