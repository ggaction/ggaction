import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

import {
  assertFrozenManifest,
  evaluationRoot,
  sha256,
  validateCorpusSource
} from "../../scripts/compact-evaluation.js";

test("freezes a fresh stratified compact-authoring evaluation corpus", async () => {
  assert.deepEqual(await validateCorpusSource(), {
    tasks: 48,
    splits: {
      development: 18,
      "held-out": 15,
      validation: 15
    },
    strata: {
      complex: 25,
      simple: 23
    },
    datasets: 3,
    constraints: 79,
    phase2DesignQueryOverlap: 0,
    querySha256: "b15af4ed4772dd5b359530be83045dbe9e9ccd3264124d60616d373f586ac4c4"
  });

  const manifest = await assertFrozenManifest();
  assert.equal(manifest.corpusId, "compact-authoring-fresh-v1");
  assert.equal(manifest.exclusions.roadmap53FrozenCorpus, "not-read-not-reused");
  assert.equal(manifest.exclusions.phase2DesignFixtures, "overlap-check-only-not-evaluation");
  assert.deepEqual(Object.keys(manifest.files).sort(), [
    "datasets.json",
    "development.json",
    "held-out.json",
    "oracle-policy.json",
    "task.schema.json",
    "validation.json"
  ]);
  for (const artifact of Object.values(manifest.files)) {
    assert.match(artifact.sha256, /^[a-f0-9]{64}$/);
    assert.ok(artifact.bytes > 0);
  }
});

test("records the locked candidate and its one-pass validation result", async () => {
  const [candidateBytes, developmentBytes, validationBytes] = await Promise.all([
    readFile(path.join(evaluationRoot, "CANDIDATE.json")),
    readFile(path.join(evaluationRoot, "results", "development.json")),
    readFile(path.join(evaluationRoot, "results", "validation.json"))
  ]);
  const candidate = JSON.parse(candidateBytes);
  const development = JSON.parse(developmentBytes);
  const validation = JSON.parse(validationBytes);

  assert.equal(candidate.candidateCommit, "33be9c37f84884243568061a42aaf334aca18d4d");
  assert.equal(candidate.frozenManifestSha256, development.frozenManifestSha256);
  assert.equal(candidate.developmentResultSha256, sha256(developmentBytes));
  assert.equal(development.passed, true);
  assert.equal(development.exactPlanTasks, 18);
  assert.equal(validation.candidateCommit, candidate.candidateCommit);
  assert.equal(validation.passed, false);
  assert.equal(validation.exactConstraintTasks, 15);
  assert.equal(validation.exactPlanTasks, 14);
  assert.equal(validation.silentPartialCount, 0);
  assert.equal(validation.typescriptErrorCount, 0);
  assert.deepEqual(validation.failures, [
    "val-point-appearance-encodings: plan mismatch [{\"id\":\"action.createPointMark\",\"options\":[]},{\"id\":\"action.encodeX\",\"options\":[\"field\"]},{\"id\":\"action.encodeY\",\"options\":[\"field\"]},{\"id\":\"action.encodeOpacity\",\"options\":[\"field\"]},{\"id\":\"action.encodeShape\",\"options\":[\"field\"]},{\"id\":\"action.encodeSize\",\"options\":[\"field\"]},{\"id\":\"action.createAxes\",\"options\":[]}]"
  ]);
});
