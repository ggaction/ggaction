import assert from "node:assert/strict";
import test from "node:test";

import { runRuntimeClosureV2 } from
  "../../scripts/compact-runtime-closure-v2.js";

test("executes every resolved compact task through its concrete renderer", async () => {
  const { result } = await runRuntimeClosureV2();
  assert.equal(result.tasks, 38);
  assert.equal(result.routeChecks, 152);
  assert.equal(result.evaluatorChecks, 38);
  assert.deepEqual(result.roles, {
    supported: 21,
    unsupported: 12,
    "needs-input": 5
  });
  assert.equal(result.passed, true);
  assert.equal(result.externalCalls, 0);
  assert.equal(result.credentialReads, 0);
  assert.equal(result.spendUsd, 0);

  const supported = result.evaluations.filter(entry => entry.role === "supported");
  assert.equal(supported.length, 21);
  assert.equal(supported.every(entry => entry.passed), true);
  assert.equal(supported.every(entry => entry.outputBytes > 0), true);
  assert.equal(supported.every(entry => entry.sourceBytes > 0), true);
});
