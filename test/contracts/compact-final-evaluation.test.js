import assert from "node:assert/strict";
import test from "node:test";

import { checkCompactFinalEvaluationV1 } from
  "../../scripts/compact-final-evaluation-v1.js";

test("freezes a fresh final authoring corpus before executable evaluation", async () => {
  const state = await checkCompactFinalEvaluationV1();

  assert.equal(state.tasks.length, 38);
  assert.deepEqual(state.oracle.roleCounts, {
    supported: 26,
    unsupported: 6,
    "needs-input": 6
  });
  assert.deepEqual(state.oracle.overlap, {
    normalizedQueries: 0,
    datasetContents: 0,
    previousProgramSources: 3
  });
  assert.equal(state.oracle.productCandidateCommit, state.corpus.productCandidateCommit);
  assert.equal(
    new Set(state.oracle.tasks.map(task => task.querySha256)).size,
    state.tasks.length
  );
  assert.equal(
    new Set(state.oracle.tasks
      .filter(task => task.role === "supported")
      .map(task => task.sourceSha256)).size,
    26
  );
});
