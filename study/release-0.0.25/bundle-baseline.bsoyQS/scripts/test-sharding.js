import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const testRoot = fileURLToPath(new URL("../test/", import.meta.url));
const timingFile = new URL("../test/realistic-timings.json", import.meta.url);
export const REALISTIC_TIMINGS = Object.freeze(JSON.parse(readFileSync(timingFile, "utf8")).durationMs);

export function partitionTestFiles(files, total, timings = REALISTIC_TIMINGS) {
  if (!Number.isSafeInteger(total) || total < 1) throw new Error("Shard total must be a positive safe integer.");
  if (new Set(files).size !== files.length) throw new Error("Test files must be unique before sharding.");
  const known = Object.values(timings).sort((a, b) => a - b);
  if (known.some(value => !Number.isFinite(value) || value <= 0)) throw new Error("Test timing weights must be positive finite numbers.");
  const fallback = known[Math.floor(known.length / 2)] ?? 1;
  const weight = file => timings[path.relative(testRoot, file).split(path.sep).join("/")] ?? fallback;
  const scheduled = [...files].sort((a, b) => weight(b) - weight(a) || (a < b ? -1 : a > b ? 1 : 0));
  const shards = Array.from({ length: total }, (_, index) => ({ index: index + 1, files: [], estimatedMs: 0 }));
  for (const file of scheduled) {
    const shard = shards.reduce((best, candidate) => candidate.estimatedMs < best.estimatedMs ? candidate : best);
    shard.files.push(file);
    shard.estimatedMs += weight(file);
  }
  return shards.map(shard => Object.freeze({ ...shard, files: Object.freeze(shard.files.sort()) }));
}

export function assertSuccessfulJobs(needs, expected) {
  if (needs === null || typeof needs !== "object" || Array.isArray(needs) ||
      Object.keys(needs).length !== expected.length ||
      expected.some(name => !Object.hasOwn(needs, name) || needs[name]?.result !== "success")) {
    throw new Error(`All required jobs must succeed: ${expected.join(", ")}.`);
  }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  if (process.argv[2] !== "--check-jobs") throw new Error("Expected --check-jobs followed by required job IDs.");
  assertSuccessfulJobs(JSON.parse(process.env.GGACTION_JOB_RESULTS ?? "null"), process.argv.slice(3));
  process.stdout.write("Every required verification job succeeded.\n");
}
