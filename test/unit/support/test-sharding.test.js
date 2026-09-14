import assert from "node:assert/strict";
import test from "node:test";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { partitionTestFiles, assertSuccessfulJobs, REALISTIC_TIMINGS } from "../../../scripts/test-sharding.js";
import { collectTestFiles } from "../../../scripts/run-tests.js";
const root = fileURLToPath(new URL("../../", import.meta.url));

test("realistic shards are exhaustive, disjoint, deterministic, and weighted by measured durations", () => {
  const files = collectTestFiles("realistic");
  assert.deepEqual(Object.keys(REALISTIC_TIMINGS).sort(), files.map(file => path.relative(root, file)).sort());
  const shards = partitionTestFiles(files, 7);
  assert.deepEqual(shards.flatMap(shard => shard.files).sort(), files);
  assert.ok(shards.every(shard => shard.files.length > 0));
  assert.deepEqual(partitionTestFiles([...files].reverse(), 7), shards);
  const oldLoads = Array.from({ length: 7 }, () => 0);
  files.forEach((file, index) => { oldLoads[index % 7] += REALISTIC_TIMINGS[path.relative(root, file)]; });
  assert.ok(Math.max(...shards.map(shard => shard.estimatedMs)) < Math.max(...oldLoads));
  const added = path.join(root, "contracts/new-realistic-file.test.js");
  assert.equal(partitionTestFiles([...files, added], 7).flatMap(shard => shard.files).filter(file => file === added).length, 1);
});

test("weighted scheduling spreads long tests and rejects invalid input", () => {
  const files = ["a", "b", "c", "d"].map(file => path.join(root, file));
  const result = partitionTestFiles(files, 2, { a: 10, b: 9, c: 2, d: 1 });
  assert.deepEqual(result.map(shard => shard.estimatedMs), [11, 11]);
  assert.throws(() => partitionTestFiles(files, 0));
  assert.throws(() => partitionTestFiles([files[0], files[0]], 2));
  assert.throws(() => partitionTestFiles(files, 2, { a: -1 }));
});

test("the aggregate accepts only complete successful prerequisites", () => {
  const expected = ["data", "shards"];
  assert.doesNotThrow(() => assertSuccessfulJobs({ data: { result: "success" }, shards: { result: "success" } }, expected));
  for (const result of ["failure", "cancelled", "skipped", undefined]) {
    assert.throws(() => assertSuccessfulJobs({ data: { result: "success" }, shards: { result } }, expected));
  }
  for (const missing of [null, {}, [], { data: { result: "success" } },
    { data: { result: "success" }, shards: { result: "success" }, extra: { result: "success" } }]) {
    assert.throws(() => assertSuccessfulJobs(missing, expected));
  }
});
