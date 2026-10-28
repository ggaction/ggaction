import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { inferGraphGroups, inferGraphSequence } from "../src/grammar/graph/structural.js";
import { structuralKeys as keys, structuralGroups as groups, structuralFixtures } from "../test/oracles/graphStructural.js";
const hash = value => createHash("sha256").update(Buffer.isBuffer(value) ? value : JSON.stringify(value)).digest("hex");
const cases = structuralFixtures.map(fixture => {
  const result = fixture.method === "group" ? inferGraphGroups(keys, groups, fixture.options) : inferGraphSequence(keys, groups, fixture.order, fixture.options);
  const actual = result.edges.map(({ sourceIndex, targetIndex, weight }) => [keys[sourceIndex], keys[targetIndex], weight]);
  assert.deepEqual(actual, fixture.expected);
  return { id: fixture.id, call: { method: fixture.method, keys, groups, order: fixture.order, options: fixture.options },
    expected: fixture.expected, actual, diff: [], expectedSha256: hash(fixture.expected), actualSha256: hash(actual), inputSha256: hash({ keys, groups, fixture }) };
});
const sources = {};
for (const source of ["src/grammar/graph/structural.js", "src/grammar/graph/edgeIdentity.js", "src/grammar/rowLineage.js", "src/grammar/sort.js", "src/grammar/scales/fields.js", "test/oracles/graphStructural.js"]) sources[source] = hash(await readFile(new URL(`../${source}`, import.meta.url)));
const directory = new URL("../.artifacts/validation/graph-structural/", import.meta.url);
await mkdir(directory, { recursive: true });
await writeFile(new URL("numeric-evidence.json", directory), JSON.stringify({ schemaVersion: 1, command: "node scripts/check-graph-structural-fixtures.js", exitCode: 0, sources, cases }, null, 2) + "\n");
console.log(`Verified ${cases.length} structural graph fixtures.`);
