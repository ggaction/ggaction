import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../../", import.meta.url));
const directory = path.join(root, "evaluation", "compact-authoring-final-v1");
const secondDirectory = path.join(root, "evaluation", "compact-authoring-final-v2");

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

test("preserves the frozen inputs and route oracle for the second final attempt", async () => {
  const [corpusBytes, datasetsBytes, oracleBytes] = await Promise.all([
    readFile(path.join(secondDirectory, "corpus.json")),
    readFile(path.join(secondDirectory, "datasets.json")),
    readFile(path.join(secondDirectory, "ROUTE_ORACLE.json"))
  ]);
  const corpus = JSON.parse(corpusBytes);
  const oracle = JSON.parse(oracleBytes);

  assert.equal(sha256(corpusBytes), "402a3e10586d112bf051c38a36d4aa71abc984098873d5508e58be4e29c6a739");
  assert.equal(sha256(datasetsBytes), "d4b439d7ce353372c55324fd021124ed685c124042516df1139b36b9d2955e37");
  assert.equal(sha256(oracleBytes), "12e570b3988815d03dac521f8be5572da34f66e8c5000132de268a119b63fc27");
  assert.equal(corpus.productCandidateCommit, "04d5c8efd6b350e3ff5ddb82ef1c5494568e4270");
  assert.deepEqual(oracle.roleCounts, {
    supported: 26,
    unsupported: 6,
    "needs-input": 6
  });
  assert.deepEqual(oracle.overlap, {
    normalizedQueries: 0,
    datasetContents: 0,
    previousProgramSources: 17
  });
  assert.equal(oracle.tasks.length, 38);
  assert.equal(oracle.tasks.length * oracle.conditions.length, 152);
});
