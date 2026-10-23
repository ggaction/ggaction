import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
const root = fileURLToPath(new URL("../", import.meta.url));
const started = performance.now();
// Loaded in each isolated test process; never measure the scheduling parent as a file.
if (process.env.NODE_TEST_CONTEXT && process.argv[1]?.endsWith(".test.js")) {
  const file = path.relative(path.join(root, "test"), process.argv[1]).split(path.sep).join("/");
  process.once("exit", code => {
    const directory = path.join(root, ".artifacts/timings");
    mkdirSync(directory, { recursive: true });
    writeFileSync(path.join(directory, `${Date.now()}-${process.pid}.json`), JSON.stringify({
      schemaVersion: 1, file, durationMs: performance.now() - started,
      maxRssKiB: process.resourceUsage().maxRSS, status: code === 0 ? "passed" : "failed",
      environment: { node: process.version, platform: process.platform, arch: process.arch, runner: process.env.RUNNER_OS ?? "local" },
      run: process.env.GITHUB_RUN_ID ?? null, attempt: process.env.GITHUB_RUN_ATTEMPT ?? null
    }, null, 2));
  });
}
