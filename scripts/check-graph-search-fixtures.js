import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdirSync, writeFileSync } from "node:fs";
import { inferGraphNeighbors } from "../src/grammar/graph/neighbors.js";
import { numericNearestPairs, graphPairRecall } from "../test/oracles/graphSearch.js";
const keys = Array.from({ length: 128 }, (_, i) => i), values = keys.map(i => [i % 16, Math.floor(i / 16)]);
const options = { ruleId: "grid", rule: "knn", k: 2, metric: "euclidean" };
const expected = numericNearestPairs(keys, values, 2), pairs = result => result.edges.map(edge => [edge.sourceIndex, edge.targetIndex]);
const exact = inferGraphNeighbors(keys, values, { ...options, search: { mode: "exact", algorithm: "kd-tree" } });
assert.deepEqual(pairs(exact), expected);
const search = { mode: "approximate", seed: 42, trees: 8, leafSize: 8, searchLeaves: 1 };
const approximate = inferGraphNeighbors(keys, values, { ...options, search });
const measuredRecall = graphPairRecall(expected, pairs(approximate));
assert.equal(measuredRecall, .984375); assert.equal(approximate.search.measuredRecall, measuredRecall);
assert.equal(approximate.search.candidateCount, 5416);
let rejected;
try { inferGraphNeighbors(keys, values, { ...options, search: { ...search, minRecall: 1 } }); }
catch (error) { rejected = { code: error.code, ...error.details }; }
assert.equal(rejected?.code, "GGACTION_GRAPH_RECALL");
assert.equal(rejected.measuredRecall, measuredRecall);
const hash = value => createHash("sha256").update(JSON.stringify(value)).digest("hex");
const expectedFacts = { exact: expected, recall: .984375, candidateCount: 5416, strictRejection: "GGACTION_GRAPH_RECALL" };
const actualFacts = { exact: pairs(exact), recall: measuredRecall, candidateCount: approximate.search.candidateCount, strictRejection: rejected.code };
assert.deepEqual(actualFacts, expectedFacts);
const report = { schemaVersion: 1, node: process.version, inputs: { keys, values, options, search }, expected: expectedFacts,
  actual: actualFacts, expectedSha256: hash(expectedFacts), actualSha256: hash(actualFacts), diff: [], approximate: approximate.search, rejected };
mkdirSync(".artifacts/graph-search", { recursive: true });
writeFileSync(".artifacts/graph-search/qualification.json", `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify({ expectedSha256: report.expectedSha256, actualSha256: report.actualSha256, diff: [], recall: measuredRecall, candidateCount: approximate.search.candidateCount }));
