import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import test from "node:test";
import { fileURLToPath } from "node:url";

import {
  REALISTIC_GENERATION_ISOLATION_LIMITS,
  REALISTIC_GENERATION_ISOLATION_TIMEOUT_MS
} from
  "../support/scenarios/realistic-generation-isolation-worker.js";

const MAX_ISOLATED_CHILD_RSS = 440 * 1_024 * 1_024;
const MAX_ISOLATED_TOTAL_RSS = 512 * 1_024 * 1_024;
const WORKER_EXIT_GRACE_MS = 30_000;
const OUTER_WORKER_TIMEOUT_MS = REALISTIC_GENERATION_ISOLATION_TIMEOUT_MS +
  WORKER_EXIT_GRACE_MS;
const TEST_TIMEOUT_MS = OUTER_WORKER_TIMEOUT_MS + 20_000;
const ISOLATION_WORKER = fileURLToPath(new URL(
  "../support/scenarios/realistic-generation-isolation-worker.js",
  import.meta.url
));

test("leaves termination grace around the shared generation deadline", () => {
  assert.equal(
    OUTER_WORKER_TIMEOUT_MS - REALISTIC_GENERATION_ISOLATION_TIMEOUT_MS,
    WORKER_EXIT_GRACE_MS
  );
  assert.ok(TEST_TIMEOUT_MS > OUTER_WORKER_TIMEOUT_MS);
});

for (const limit of REALISTIC_GENERATION_ISOLATION_LIMITS) {
  test(`matches the isolated strict ${limit} descriptor and state boundary`, {
    timeout: TEST_TIMEOUT_MS
  }, () => {
    const result = spawnSync(process.execPath, [
      "--expose-gc",
      ISOLATION_WORKER,
      String(limit)
    ], {
      cwd: fileURLToPath(new URL("../../", import.meta.url)),
      encoding: "utf8",
      maxBuffer: 1024 * 1024,
      timeout: OUTER_WORKER_TIMEOUT_MS
    });
    assert.equal(result.error, undefined, result.error?.stack);
    assert.equal(result.signal, null, result.stderr);
    assert.equal(result.status, 0, result.stderr || result.stdout);
    const report = JSON.parse(result.stdout);
    assert.deepEqual(report.boundary, {
      limit,
      descriptors: limit,
      descriptorParity: true,
      generationParity: true,
      frozenResult: true,
      frozenDescriptors: true,
      frozenGeneration: true
    });
    assert.equal(
      report.isolatedResources.maximumChildRssBytes <= MAX_ISOLATED_CHILD_RSS,
      true,
      `${report.isolatedResources.maximumChildRssBytes} <= ` +
        `${MAX_ISOLATED_CHILD_RSS}`
    );
    assert.equal(
      report.isolatedResources.maximumCombinedRssBytes <= MAX_ISOLATED_TOTAL_RSS,
      true,
      `${report.isolatedResources.maximumCombinedRssBytes} <= ` +
        `${MAX_ISOLATED_TOTAL_RSS}`
    );
    assert.equal(
      report.referenceResources.maximumRssBytes <= MAX_ISOLATED_CHILD_RSS,
      true,
      `${report.referenceResources.maximumRssBytes} <= ${MAX_ISOLATED_CHILD_RSS}`
    );
  });
}
