import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../..", import.meta.url));

function read(relativePath) {
  return readFileSync(path.join(root, relativePath), "utf8");
}

test("keeps the Parallel public actions in their canonical Current contracts", () => {
  const index = JSON.parse(read("agent_docs/contract/ACTION_INDEX.json"));
  const expected = new Map([
    ["encodeParallelCoordinates", "agent_docs/contract/current/ENCODINGS.md"],
    ["createParallelCoordinates", "agent_docs/contract/current/BASIC_CHARTS.md"]
  ]);

  for (const [name, contract] of expected) {
    const entries = index.actions.filter(action => action.name === name);
    assert.equal(entries.length, 1, name);
    assert.equal(entries[0].status, "implemented", name);
    assert.equal(entries[0].contract.file, contract, name);
    assert.equal(index.plannedActions.some(action => action.name === name), false, name);
  }
});

test("keeps Parallel declarations and root type exports synchronized", () => {
  const programTypes = read("types/program.d.ts");
  const rootTypes = read("types/index.d.ts");

  assert.match(programTypes,
    /^export type ParallelMissingPolicy = "break" \| "drop-row" \| "error";$/m);
  assert.match(programTypes, /^export type ParallelDimension = string \| \{$/m);
  assert.match(programTypes, /^export interface ParallelCoordinatesEncodingOptions/m);
  assert.match(programTypes, /^export interface CreateParallelCoordinatesOptions/m);
  assert.match(programTypes,
    /^  encodeParallelCoordinates\(options: ParallelCoordinatesEncodingOptions\): ChartProgram;$/m);
  assert.match(programTypes,
    /^  createParallelCoordinates\(options: CreateParallelCoordinatesOptions\): ChartProgram;$/m);

  for (const name of [
    "ParallelMissingPolicy",
    "ParallelDimension",
    "ParallelCoordinatesEncodingOptions",
    "CreateParallelCoordinatesOptions"
  ]) {
    assert.match(rootTypes, new RegExp(`^  ${name},?$`, "m"));
  }
});
