import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../../../../../", import.meta.url));
const qualification = JSON.parse(await readFile(new URL("qualification.json", import.meta.url), "utf8"));
const digest = bytes => createHash("sha256").update(bytes).digest("hex");
for (const entry of qualification.sources) assert.equal(digest(await readFile(resolve(root, entry.path))), entry.sha256, entry.path);
assert.equal(digest(await readFile(new URL(qualification.docs.receipt, import.meta.url))), qualification.docs.sha256);
assert.deepEqual(qualification.runs.map(run => Number(run.prototype.node.slice(1).split(".")[0])), [20, 22, 24]);
for (const run of qualification.runs) {
  assert.equal(run.prototype.passed, 12);
  assert.equal(run.prototype.publicBImplemented, false);
  assert.equal(run.prototype.routeAuthorityTested, false);
  assert.equal(run.theme.expectedFailureReproduced, true);
  assert.equal(run.theme.directThemeStateRemoved, true);
  assert.equal(run.theme.nestedThemeStateRemoved, false);
}
console.log(JSON.stringify({ sources: qualification.sources.length, nodes: 3, casesPerNode: 12, docs: 4, publicBImplemented: false }));
