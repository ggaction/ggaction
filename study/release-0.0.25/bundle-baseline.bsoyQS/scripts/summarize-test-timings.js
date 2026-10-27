import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
export function summarizeTimings(records) {
  const groups = new Map();
  for (const record of records) {
    if (!record.file || !record.environment || !Number.isFinite(record.durationMs) || record.durationMs <= 0 || !Number.isFinite(record.maxRssKiB) || record.maxRssKiB <= 0 || !["passed", "failed"].includes(record.status)) throw new Error("Invalid test timing record.");
    const key = JSON.stringify([record.environment.node, record.environment.platform, record.environment.arch, record.environment.runner, record.file]);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(record);
  }
  return [...groups].sort(([a], [b]) => a.localeCompare(b)).map(([, samples]) => {
    const successful = samples.filter(record => record.status === "passed").map(record => record.durationMs).sort((a, b) => a - b);
    const middle = Math.floor(successful.length / 2);
    return { file: samples[0].file, environment: samples[0].environment,
      samples: samples.length, successfulSamples: successful.length,
      failureRate: samples.filter(record => record.status === "failed").length / samples.length,
      medianMs: !successful.length ? null : successful.length % 2 ? successful[middle] : (successful[middle - 1] + successful[middle]) / 2,
      p95Ms: successful.length ? successful[Math.ceil(successful.length * .95) - 1] : null,
      peakRssKiB: Math.max(...samples.map(record => record.maxRssKiB)) };
  });
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const paths = process.argv.slice(2);
  const records = paths.flatMap(directory => readdirSync(directory).filter(file => file.endsWith(".json")).map(file => JSON.parse(readFileSync(path.join(directory, file), "utf8"))));
  process.stdout.write(JSON.stringify(summarizeTimings(records), null, 2) + "\n");
}
