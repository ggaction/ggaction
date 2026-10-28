import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { normalizeObservedGraph } from "../src/grammar/graph/normalize.js";
import { graphNodes, graphEdges, nodeTokens, edgeTokens, directedAdjacency, undirectedAdjacency } from "../test/oracles/graph.js";

const root = fileURLToPath(new URL("../", import.meta.url));
const hash = value => createHash("sha256").update(Buffer.isBuffer(value) ? value : JSON.stringify(value)).digest("hex");
const cases = [];
for (const directed of [true, false]) {
  const options = { directed }, result = normalizeObservedGraph(graphNodes, graphEdges, options);
  const expected = { nodeKeys: nodeTokens, edgeKeys: edgeTokens, weights: [0, 2, -1],
    nodeRows: [[7], [1, 4], [2], [3]], edgeRows: [[8], [1], [2]],
    origin: ["observed", "observed", "observed"], adjacency: directed ? directedAdjacency : undirectedAdjacency };
  const actual = { nodeKeys: result.nodes.map(node => node.key), edgeKeys: result.edges.map(edge => edge.key),
    weights: result.edges.map(edge => edge.weight), nodeRows: result.nodes.map(node => node.sourceRows),
    edgeRows: result.edges.map(edge => edge.sourceRows), origin: result.edges.map(edge => edge.origin),
    adjacency: result.adjacency.map(entry => ({ incoming: entry.incoming.map(key => edgeTokens.indexOf(key)),
      outgoing: entry.outgoing.map(key => edgeTokens.indexOf(key)), neighbors: entry.neighbors.map(key => nodeTokens.indexOf(key)) })) };
  assert.deepEqual(actual, expected);
  cases.push({ id: directed ? "directed" : "undirected", call: { method: "normalizeObservedGraph", options },
    inputSha256: hash({ nodes: graphNodes, edges: graphEdges, options }), expected, actual, diff: [],
    expectedSha256: hash(expected), actualSha256: hash(actual), diffSha256: hash([]) });
}
const sources = {};
for (const file of ["src/grammar/graph/normalize.js", "src/grammar/graph/model.js", "test/oracles/graph.js"]) {
  sources[file] = hash(await readFile(path.join(root, file)));
}
const directory = path.join(root, ".artifacts/validation/graph-normalize");
await mkdir(directory, { recursive: true });
await writeFile(path.join(directory, "numeric-evidence.json"), `${JSON.stringify({ schemaVersion: 1,
  command: "node scripts/check-graph-fixtures.js", exitCode: 0, sources, cases }, null, 2)}\n`);
console.log(`Verified ${cases.length} graph fixtures with independent identities, weights, lineage and adjacency.`);
