import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../../", import.meta.url));
const directory = path.join(root, "evaluation", "compact-authoring-final-v1");

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

test("preserves the first frozen final attempt and its two failures", async () => {
  const [corpusBytes, datasetsBytes, oracleBytes, resultBytes] = await Promise.all([
    readFile(path.join(directory, "corpus.json")),
    readFile(path.join(directory, "datasets.json")),
    readFile(path.join(directory, "ROUTE_ORACLE.json")),
    readFile(path.join(directory, "RESULT.json"))
  ]);
  const corpus = JSON.parse(corpusBytes);
  const oracle = JSON.parse(oracleBytes);
  const result = JSON.parse(resultBytes);

  assert.equal(sha256(corpusBytes), "b46af4a1b1d23b9e9271e9bfeca826d9e85da64c4da3b83d0d8565bf661e4070");
  assert.equal(sha256(datasetsBytes), "39cb4a40d84658139e9fc7465fea572b3cffa5358ed2f9b5ed91d03505836258");
  assert.equal(sha256(oracleBytes), "fcddf6ff7b0ac885f65cd68d62827695df27435b2a955b52781e138543671835");
  assert.equal(sha256(resultBytes), "0511dbf7f021d8adf9ae1b6ca2a0e92a83dbd85cc305b76b2497749e17459e24");
  assert.equal(corpus.productCandidateCommit, "ccc8997717a554ee49c45baf089211922609ef0b");
  assert.deepEqual(oracle.overlap, {
    normalizedQueries: 0,
    datasetContents: 0,
    previousProgramSources: 3
  });
  assert.deepEqual(result.roles, {
    supported: 26,
    unsupported: 6,
    "needs-input": 6
  });
  assert.equal(result.routeChecks, 152);
  assert.equal(result.passed, false);
  assert.deepEqual(
    result.evaluations.filter(entry => !entry.passed).map(entry => entry.task),
    ["final-22-composition-svg", "final-23-labels-png"]
  );
  assert.equal(result.externalCalls, 0);
  assert.equal(result.credentialReads, 0);
  assert.equal(result.spendUsd, 0);
});
