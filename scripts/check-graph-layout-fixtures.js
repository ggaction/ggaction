import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { normalizeObservedGraph } from "../src/grammar/graph/normalize.js";
import { layoutGraphFixed, layoutGraphCircular } from "../src/grammar/graph/layout.js";
import { graphNodes, graphEdges, nodeTokens } from "../test/oracles/graph.js";
import { fixedPoints, cardinalCircle, triangleCircle } from "../test/oracles/graph-layout.js";

const root = fileURLToPath(new URL("../", import.meta.url));
const hash = value => createHash("sha256").update(Buffer.isBuffer(value) ? value : JSON.stringify(value)).digest("hex");
const cases = [];
const graph = normalizeObservedGraph(graphNodes, graphEdges, { directed: true });
const positions = nodeTokens.map((key, index) => ({ key, x: fixedPoints[index][0], y: fixedPoints[index][1] })).reverse();
const triangle = normalizeObservedGraph(graphNodes.slice(0, 3), [], { directed: false });
for (const fixture of [
  { id: "fixed-keyed", graph, method: "layoutGraphFixed", args: positions, keys: nodeTokens, points: fixedPoints },
  { id: "circular-cardinal", graph, method: "layoutGraphCircular", args: { center: [10, 20], radius: 5, startAngle: 0 }, keys: nodeTokens, points: cardinalCircle },
  { id: "circular-triangle", graph: triangle, method: "layoutGraphCircular", args: { center: [0, 0], radius: 2, startAngle: 0 }, keys: nodeTokens.slice(0, 3), points: triangleCircle }
]) {
  const result = fixture.method === "layoutGraphFixed" ? layoutGraphFixed(fixture.graph, fixture.args) : layoutGraphCircular(fixture.graph, fixture.args);
  const expected = { keys: fixture.keys, coordinates: fixture.points };
  const actual = { keys: result.nodes.map(node => node.key), coordinates: result.nodes.map(({ x, y }) => [x, y]) };
  assert.deepEqual(actual.keys, expected.keys);
  const diff = actual.coordinates.map((point, index) => point.map((value, axis) => value - expected.coordinates[index][axis]));
  assert.ok(diff.every(point => point.every(value => Math.abs(value) <= 1e-12)));
  cases.push({ id: fixture.id, call: { method: fixture.method, args: fixture.args }, inputSha256: hash(fixture.graph),
    expected, actual, diff, absoluteTolerance: 1e-12, expectedSha256: hash(expected), actualSha256: hash(actual), diffSha256: hash(diff) });
}
const sources = {};
for (const file of ["src/grammar/graph/layout.js", "src/grammar/graph/model.js", "src/grammar/polar.js", "src/core/immutable.js",
  "test/oracles/graph.js", "test/oracles/graph-layout.js"]) sources[file] = hash(await readFile(path.join(root, file)));
const directory = path.join(root, ".artifacts/validation/graph-layout");
await mkdir(directory, { recursive: true });
await writeFile(path.join(directory, "numeric-evidence.json"), `${JSON.stringify({ schemaVersion: 1,
  command: "node scripts/check-graph-layout-fixtures.js", exitCode: 0, sources, cases }, null, 2)}\n`);
console.log(`Verified ${cases.length} graph layout fixtures with independent keyed coordinates.`);
