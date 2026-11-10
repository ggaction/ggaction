import { mkdir, writeFile } from "node:fs/promises";
import { execFileSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { npmInvocation } from "../npm-command.js";

export const root = fileURLToPath(new URL("../../", import.meta.url));
export const npmCommand = "npm";
export const tscCommand = path.join(
  root,
  "node_modules",
  "typescript",
  "bin",
  "tsc"
);

// Consumers execute the installed copy outside the repository, so inherited V8
// coverage only records files the src/** report discards while doubling runtime.
// Node re-adds the parent's NODE_V8_COVERAGE unless env owns the key; empty disables it.
export function installedConsumerEnvironment(environment = process.env) {
  return { ...environment, NODE_V8_COVERAGE: "" };
}

export function run(command, args, cwd, options = {}) {
  const env = installedConsumerEnvironment(options.env);
  const invocation = command === npmCommand ? npmInvocation(args, { env }) : { command, args };
  execFileSync(invocation.command, invocation.args, {
    cwd,
    encoding: "utf8",
    stdio: "pipe",
    timeout: Number(process.env.GGACTION_CHECK_TIMEOUT_MS ?? 90 * 60 * 1000),
    ...options,
    env
  });
}


export async function runConsumerCases(cases, receipt) {
  const ids = cases.map(entry => entry.id);
  if (new Set(ids).size !== ids.length) throw new Error("Consumer case IDs must be unique.");
  const records = [];
  const results = {};
  for (const entry of cases) {
    const start = performance.now();
    try {
      results[entry.id] = await entry.run();
      records.push({ id: entry.id, status: "passed", durationMs: performance.now() - start });
    } catch (error) {
      records.push({ id: entry.id, status: "failed", durationMs: performance.now() - start, error: error.stack ?? String(error) });
    }
    await mkdir(path.dirname(receipt), { recursive: true });
    await writeFile(receipt, JSON.stringify({ node: process.version, platform: process.platform, records }, null, 2));
  }
  const failures = records.filter(record => record.status === "failed");
  if (failures.length) throw new AggregateError(failures.map(record => new Error(`${record.id}: ${record.error}`)), "Installed consumer cases failed");
  return results;
}
