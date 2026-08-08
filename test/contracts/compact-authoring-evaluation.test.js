import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

import {
  assertFrozenManifest,
  evaluationRoot,
  policyEvaluationRoot,
  repairEvaluationRoot,
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

test("freezes the repair evaluation before changing the candidate", async () => {
  assert.deepEqual(await validateCorpusSource("repair"), {
    tasks: 31,
    splits: {
      development: 1,
      "held-out": 15,
      validation: 15
    },
    strata: {
      complex: 17,
      simple: 14
    },
    datasets: 3,
    constraints: 79,
    phase2DesignQueryOverlap: 0,
    priorCorpusQueryOverlap: 0,
    querySha256: "70dd5e062cff6ccb0919b6d29e3aadd8e67296564338088f01a01383908d1b47"
  });

  const manifest = await assertFrozenManifest("repair");
  assert.equal(manifest.corpusId, "compact-authoring-repair-v1");
  assert.equal(
    manifest.productBaseCommit,
    "c1abbd6392603f05a0784ab045e76d2202ed2dd7"
  );
  assert.equal(manifest.summary.constraints, 79);
  assert.equal(manifest.summary.priorCorpusQueryOverlap, 0);
});

test("records the repair candidate without rewriting its held-out failure", async () => {
  const [candidateBytes, developmentBytes, validationBytes, heldOutBytes] = await Promise.all([
    readFile(path.join(repairEvaluationRoot, "CANDIDATE.json")),
    readFile(path.join(repairEvaluationRoot, "results", "development.json")),
    readFile(path.join(repairEvaluationRoot, "results", "validation.json")),
    readFile(path.join(repairEvaluationRoot, "results", "held-out.json"))
  ]);
  const candidate = JSON.parse(candidateBytes);
  const development = JSON.parse(developmentBytes);
  const validation = JSON.parse(validationBytes);
  const heldOut = JSON.parse(heldOutBytes);

  assert.equal(candidate.candidateCommit, "cf43c1f1b3c05bbdbc1711b880a0bd256af81358");
  assert.equal(candidate.frozenManifestSha256, development.frozenManifestSha256);
  assert.equal(candidate.developmentResultSha256, sha256(developmentBytes));
  assert.equal(development.passed, true);
  assert.equal(validation.passed, true);
  assert.equal(validation.exactPlanTasks, 15);
  assert.equal(heldOut.candidateCommit, candidate.candidateCommit);
  assert.equal(heldOut.passed, false);
  assert.equal(heldOut.exactConstraintTasks, 15);
  assert.equal(heldOut.exactPlanTasks, 15);
  assert.equal(heldOut.exactUnresolvedTasks, 14);
  assert.equal(heldOut.exactFallbackTasks, 14);
  assert.equal(heldOut.silentPartialCount, 0);
  assert.equal(heldOut.typescriptErrorCount, 0);
  assert.deepEqual(heldOut.failures, [
    "repair-hold-3d-jpeg: unresolved mismatch [\"unsupported.3d\",\"unsupported.jpg\",\"renderer.format\"]",
    "repair-hold-3d-jpeg: fallback mismatch [\"ggaction://docs/unsupported-capabilities\",\"ggaction://docs/choose-renderer\"]"
  ]);
});

test("freezes the approved unsupported-output policy corpus independently", async () => {
  assert.deepEqual(await validateCorpusSource("policy"), {
    tasks: 9,
    splits: {
      development: 1,
      "held-out": 4,
      validation: 4
    },
    strata: {
      complex: 4,
      simple: 5
    },
    datasets: 1,
    constraints: 10,
    requiredConstraints: 10,
    phase2DesignQueryOverlap: 0,
    priorCorpusQueryOverlap: 0,
    querySha256: "9fbd23a11c71a8dbb78333b828386b96622c24619c4a6c495e6966051094f2a0"
  });
  const manifest = await assertFrozenManifest("policy");
  assert.equal(manifest.corpusId, "compact-authoring-policy-v1");
  assert.equal(manifest.summary.requiredConstraints, 10);
  assert.equal(manifest.summary.priorCorpusQueryOverlap, 0);
});

test("records the approved unsupported-output policy candidate and one-pass results", async () => {
  const [candidateBytes, developmentBytes, validationBytes, heldOutBytes] = await Promise.all([
    readFile(path.join(policyEvaluationRoot, "CANDIDATE.json")),
    readFile(path.join(policyEvaluationRoot, "results", "development.json")),
    readFile(path.join(policyEvaluationRoot, "results", "validation.json")),
    readFile(path.join(policyEvaluationRoot, "results", "held-out.json"))
  ]);
  const candidate = JSON.parse(candidateBytes);
  const development = JSON.parse(developmentBytes);
  const validation = JSON.parse(validationBytes);
  const heldOut = JSON.parse(heldOutBytes);

  assert.equal(candidate.candidateCommit, "9206f0c3623c6f6676e70313811e7873ef97b405");
  assert.equal(candidate.frozenManifestSha256, development.frozenManifestSha256);
  assert.equal(candidate.developmentResultSha256, sha256(developmentBytes));
  assert.equal(development.passed, true);
  assert.equal(development.exactConstraintTasks, 1);
  assert.equal(development.exactPlanTasks, 1);
  assert.equal(validation.candidateCommit, candidate.candidateCommit);
  assert.equal(validation.passed, true);
  assert.equal(validation.exactConstraintTasks, 4);
  assert.equal(validation.exactPlanTasks, 4);
  assert.equal(validation.exactUnresolvedTasks, 4);
  assert.equal(validation.exactFallbackTasks, 4);
  assert.equal(heldOut.candidateCommit, candidate.candidateCommit);
  assert.equal(heldOut.passed, true);
  assert.equal(heldOut.exactConstraintTasks, 4);
  assert.equal(heldOut.exactPlanTasks, 4);
  assert.equal(heldOut.exactUnresolvedTasks, 4);
  assert.equal(heldOut.exactFallbackTasks, 4);
  assert.equal(Math.max(
    development.maximumPacketBytes,
    validation.maximumPacketBytes,
    heldOut.maximumPacketBytes
  ), 1009);
  assert.equal(development.silentPartialCount, 0);
  assert.equal(validation.silentPartialCount, 0);
  assert.equal(heldOut.silentPartialCount, 0);
  assert.equal(development.typescriptErrorCount, 0);
  assert.equal(validation.typescriptErrorCount, 0);
  assert.equal(heldOut.typescriptErrorCount, 0);
  assert.deepEqual(development.failures, []);
  assert.deepEqual(validation.failures, []);
  assert.deepEqual(heldOut.failures, []);
});
