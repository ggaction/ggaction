import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { statisticalFixtures, statisticalRevisions, statisticalTolerance } from "../test/oracles/statistical-fixtures.js";
import { runStatisticalFixture, reviseStatisticalFixture } from "../test/support/statistical-fixtures.js";

const root = fileURLToPath(new URL("../", import.meta.url));
const directory = path.join(root, ".artifacts/validation/statistical-fixtures");
const hash = value => createHash("sha256").update(typeof value === "string" ? value : JSON.stringify(value)).digest("hex");
const git = args => execFileSync("git", args, { cwd: root, encoding: "utf8" }).trim();
const cases = statisticalFixtures.map(fixture => {
  const result = runStatisticalFixture(fixture), revised = reviseStatisticalFixture(fixture, result);
  assert.ok(result.differences.every(diff => diff.pass), fixture.id);
  assert.ok(revised.differences.every(diff => diff.pass), `${fixture.id}: revision`);
  assert.deepEqual(result.contributors, fixture.contributors, fixture.id);
  assert.deepEqual(revised.contributors, statisticalRevisions[fixture.id].contributors ?? fixture.contributors, `${fixture.id}: revision`);
  if (fixture.secondary) assert.deepEqual(result.secondaryContributors, fixture.secondaryContributors, fixture.id);
  if (fixture.secondary) assert.deepEqual(revised.secondaryContributors,
    statisticalRevisions[fixture.id].secondaryContributors ?? fixture.secondaryContributors, `${fixture.id}: revision`);
  const calls = [["createData", { id: "raw", values: fixture.values }],
    ...(fixture.secondary ? [["createData", fixture.secondary]] : []), ...fixture.calls];
  const input = { values: fixture.values, secondary: fixture.secondary, calls: fixture.calls };
  return { id: fixture.id, status: "passed", input, publicCall: `chart()${calls.map(([method, options]) => `.${method}(${JSON.stringify(options)})`).join("")}`,
    expected: fixture.expected, actual: result.actual, differences: result.differences,
    hashes: { input: hash(input), expected: hash(fixture.expected), actual: hash(result.actual), differences: hash(result.differences) },
    contributors: result.contributors, secondaryContributors: result.secondaryContributors,
    storedTransform: result.dataset.transform, schema: result.dataset.schema,
    revision: { input: statisticalRevisions[fixture.id].values, expected: revised.expected, actual: revised.actual,
      contributors: revised.contributors, secondaryContributors: revised.secondaryContributors,
      differences: revised.differences, hashes: { input: hash(statisticalRevisions[fixture.id].values), expected: hash(revised.expected), actual: hash(revised.actual), differences: hash(revised.differences) } }
  };
});
const oracle = "test/oracles/statistical-fixtures.js";
const receipt = { schemaVersion: 1, command: "node scripts/check-statistical-fixtures.js", exitCode: 0,
  runtimeCommit: git(["log", "-1", "--format=%H", "--", "src", "types"]), testedHead: git(["rev-parse", "HEAD"]),
  node: process.version, tolerance: statisticalTolerance, oracle, oracleSha256: hash(await readFile(path.join(root, oracle), "utf8")), cases };
await mkdir(directory, { recursive: true });
await writeFile(path.join(directory, "numeric-evidence.json"), `${JSON.stringify(receipt, null, 2)}\n`);
console.log(`Verified ${cases.length} independent statistical fixtures and changed-source revisions.`);
