import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { gunzipSync } from "node:zlib";
import { assertCriticalCoverage, CRITICAL_COVERAGE_FLOORS } from "../../../../../scripts/coverage-policy.js";
import { BROWSER_BUNDLE_GZIP_LIMITS } from "../../../../../scripts/browser-bundle-size.js";
const q = JSON.parse(await readFile(new URL("qualification.json", import.meta.url)));
for (const [file, sha] of Object.entries(q.sourceSHA256)) {
  assert.equal(createHash("sha256").update(await readFile(file)).digest("hex"), sha, file);
}
const log = async name => gunzipSync(await readFile(new URL(name + ".log.gz", import.meta.url))).toString();
assertCriticalCoverage(await log("coverage"), Object.fromEntries(
  ["core/jsonText.js", "grammar/graph/inferenceBudget.js"].map(file => [file, CRITICAL_COVERAGE_FLOORS[file]])
));
for (const [name, count] of [["coverage", 36], ["boundaries", 38], ["lifecycle", 10], ["package-contracts", 7], ["docs", 18]]) {
  assert.match(await log(name), new RegExp("# pass " + count + "\\b")); assert.match(await log(name), /# fail 0\b/);
}
const differential = JSON.parse(await readFile(new URL("differential.json", import.meta.url)));
assert.equal(differential.comparisons, 868); assert.equal(differential.getterCalls, 0);
for (const version of [20, 22, 24]) {
  const result = JSON.parse(await readFile(new URL(`installed-${version}.json`, import.meta.url)));
  assert.equal(result.sha256, q.archive.sha256); assert.equal(result.status, "passed");
  assert.equal(result.checks.length, 12); assert.ok(result.checks.every(item => item.status === "passed"));
  assert.equal(result.types, "passed"); assert.equal(result.snippet.status, "passed");
  assert.equal(result.bundles.length, 6);
  for (const bundle of result.bundles) assert.ok(bundle.gzipBytes <= BROWSER_BUNDLE_GZIP_LIMITS[bundle.specifier]);
}
console.log("Source pin, two critical owners, exact differential, same archive 3Node and docs verified.");
