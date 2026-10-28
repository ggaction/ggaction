import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { normalizeHierarchyNodes } from "../src/grammar/hierarchy/normalize.js";
import { normalizeHierarchyInput } from "../src/grammar/hierarchy/input.js";
import { hierarchyRows, hierarchyExpected, hierarchyInputFixtures } from "../test/oracles/hierarchy.js";

const root = fileURLToPath(new URL("../", import.meta.url));
const directory = path.join(root, ".artifacts/validation/hierarchy-input");
const hash = value => createHash("sha256").update(typeof value === "string" ? value : JSON.stringify(value)).digest("hex");
const cases = ["leaf-sum", "inclusive", "own-plus-children"].map(valueMode => {
  const result = normalizeHierarchyNodes(hierarchyRows, { valueMode });
  const actual = { order: result.nodes.map(node => JSON.parse(node.key)[1][0][1]),
    depth: result.nodes.map(node => node.depth), sourceRows: result.nodes.map(node => node.sourceRows),
    total: result.nodes.map(node => node.totalValue), own: result.nodes.map(node => node.ownValue) };
  const expected = { order: hierarchyExpected.order, depth: hierarchyExpected.depth,
    sourceRows: hierarchyExpected.sourceRows, ...hierarchyExpected[valueMode] };
  assert.deepEqual(actual, expected, valueMode);
  const input = { nodes: hierarchyRows, options: { valueMode } }, differences = [];
  return { id: valueMode, call: `normalizeHierarchyNodes(${JSON.stringify(hierarchyRows)},${JSON.stringify({ valueMode })})`,
    input, expected, actual, differences,
    hashes: { input: hash(input), expected: hash(expected), actual: hash(actual), differences: hash(differences) } };
});
for (const fixture of hierarchyInputFixtures) {
  const result = normalizeHierarchyInput(fixture.input, fixture.options);
  const actual = { depth: result.nodes.map(node => node.depth), sourceRows: result.nodes.map(node => node.sourceRows),
    total: result.nodes.map(node => node.totalValue), own: result.nodes.map(node => node.ownValue) };
  const expected = fixture.expected, differences = [];
  assert.deepEqual(actual, expected, fixture.id);
  const input = { rows: fixture.input, options: fixture.options };
  cases.push({ id: fixture.id, call: `normalizeHierarchyInput(${JSON.stringify(fixture.input)},${JSON.stringify(fixture.options)})`,
    input, expected, actual, differences, hashes: { input: hash(input), expected: hash(expected), actual: hash(actual), differences: hash(differences) } });
}
const oracle = "test/oracles/hierarchy.js", sources = ["src/grammar/hierarchy/normalize.js", "src/grammar/hierarchy/input.js"];
const receipt = { schemaVersion: 1, command: "node scripts/check-hierarchy-fixtures.js", exitCode: 0,
  testedHead: execFileSync("git", ["rev-parse", "HEAD"], { cwd: root, encoding: "utf8" }).trim(), node: process.version,
  oracle, oracleSha256: hash(await readFile(path.join(root, oracle), "utf8")),
  sourceHashes: Object.fromEntries(await Promise.all(sources.map(async source => [source, hash(await readFile(path.join(root, source), "utf8"))]))), cases };
await mkdir(directory, { recursive: true });
await writeFile(path.join(directory, "numeric-evidence.json"), `${JSON.stringify(receipt, null, 2)}\n`);
console.log(`Verified ${cases.length} independent hierarchy aggregate and input fixtures.`);
