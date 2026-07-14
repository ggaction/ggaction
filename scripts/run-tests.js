import { readdirSync } from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const repositoryRoot = fileURLToPath(new URL("../", import.meta.url));
const testRoot = path.join(repositoryRoot, "test");

const NORMAL_SUITES = Object.freeze(["unit", "contracts", "charts", "docs"]);

function walk(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    const target = path.join(directory, entry.name);
    return entry.isDirectory() ? walk(target) : [target];
  });
}

export function classifyTestFile(file, root = testRoot) {
  const relative = path.relative(root, file);
  const [owner] = relative.split(path.sep);
  if (file.endsWith(".render.js") && owner === "charts") return "render";
  if (file.endsWith(".test.js") && NORMAL_SUITES.includes(owner)) return owner;
  return undefined;
}

export function collectTestFiles(suite = "all", root = testRoot) {
  const requested = suite === "all" || suite === "coverage"
    ? new Set(NORMAL_SUITES)
    : new Set([suite]);
  return walk(root)
    .filter(file => requested.has(classifyTestFile(file, root)))
    .sort();
}

function run(suite) {
  const files = collectTestFiles(suite);
  if (files.length === 0) {
    throw new Error(`No test files found for suite "${suite}".`);
  }
  const coverage = suite === "coverage";
  const args = ["--test"];
  if (coverage) {
    args.push(
      "--experimental-test-coverage",
      "--test-coverage-include=src/**/*.js",
      "--test-coverage-lines=94",
      "--test-coverage-branches=89",
      "--test-coverage-functions=98"
    );
  }
  args.push(...files);
  const result = spawnSync(process.execPath, args, {
    cwd: repositoryRoot,
    stdio: "inherit"
  });
  if (result.error) throw result.error;
  process.exitCode = result.status ?? 1;
}

if (
  process.argv[1] &&
  fileURLToPath(import.meta.url) === path.resolve(process.argv[1])
) {
  const suite = process.argv[2] ?? "all";
  const accepted = new Set([...NORMAL_SUITES, "all", "coverage", "render"]);
  if (!accepted.has(suite)) {
    throw new Error(`Unknown test suite "${suite}".`);
  }
  run(suite);
}
