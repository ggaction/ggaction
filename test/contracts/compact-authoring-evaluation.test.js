import assert from "node:assert/strict";
import test from "node:test";

import {
  assertFrozenManifest,
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
