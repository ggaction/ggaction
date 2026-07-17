import { readdirSync } from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

import {
  assertCriticalCoverage,
  CRITICAL_COVERAGE_FLOORS,
  parseCoverageTable
} from "./coverage-policy.js";

const repositoryRoot = fileURLToPath(new URL("../", import.meta.url));
const testRoot = path.join(repositoryRoot, "test");

const NORMAL_SUITES = Object.freeze([
  "unit",
  "contracts",
  "charts",
  "gates",
  "docs"
]);
const SPECIAL_SUITES = Object.freeze(["browser", "render"]);

function walk(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    const target = path.join(directory, entry.name);
    return entry.isDirectory() ? walk(target) : [target];
  });
}

export function classifyTestFile(file, root = testRoot) {
  const relative = path.relative(root, file);
  const [owner] = relative.split(path.sep);
  if (
    file.endsWith(".render.js") &&
    (owner === "charts" || owner === "gates")
  ) {
    return "render";
  }
  if (file.endsWith(".browser.js") && owner === "browser") return "browser";
  if (file.endsWith(".test.js") && NORMAL_SUITES.includes(owner)) return owner;
  return undefined;
}

function matchesSelector(file, root, selector) {
  const relative = path.relative(root, file).split(path.sep).join("/");
  if (selector.startsWith("chart:")) {
    return relative.startsWith(`charts/${selector.slice("chart:".length)}/`);
  }
  const value = selector.startsWith("capability:")
    ? selector.slice("capability:".length)
    : selector.replace(/^test\//, "");
  return relative.toLowerCase().includes(value.toLowerCase());
}

export function collectTestFiles(suite = "all", root = testRoot, selectors = []) {
  const requested = suite === "all" || suite === "coverage"
    ? new Set(NORMAL_SUITES)
    : new Set([suite]);
  return walk(root)
    .filter(file => requested.has(classifyTestFile(file, root)))
    .filter(file => selectors.length === 0 || selectors.some(
      selector => matchesSelector(file, root, selector)
    ))
    .sort();
}

function coverageSummary(output) {
  const coverage = parseCoverageTable(output).get("all files");
  if (coverage === undefined) return "Coverage thresholds passed.\n";
  return `Coverage: ${coverage.lines}% lines, ${coverage.branches}% branches, ` +
    `${coverage.functions}% functions; ` +
    `${Object.keys(CRITICAL_COVERAGE_FLOORS).length} critical floors passed.\n`;
}

function run(suite, selectors) {
  const files = collectTestFiles(suite, testRoot, selectors);
  if (files.length === 0) {
    if (suite === "gates" && selectors.length === 0) {
      process.stdout.write("No active gate tests.\n");
      return;
    }
    const suffix = selectors.length === 0 ? "" : ` matching ${selectors.join(", ")}`;
    throw new Error(`No test files found for suite "${suite}"${suffix}.`);
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
    ...(coverage
      ? { encoding: "utf8", maxBuffer: 10 * 1024 * 1024 }
      : { stdio: "inherit" })
  });
  if (result.error) throw result.error;
  if (coverage) {
    if (result.status === 0) {
      assertCriticalCoverage(result.stdout);
      process.stdout.write(coverageSummary(result.stdout));
      process.stderr.write(result.stderr);
    } else {
      process.stdout.write(result.stdout);
      process.stderr.write(result.stderr);
    }
  }
  process.exitCode = result.status ?? 1;
}

if (
  process.argv[1] &&
  fileURLToPath(import.meta.url) === path.resolve(process.argv[1])
) {
  const requested = process.argv[2] ?? "all";
  const accepted = new Set([
    ...NORMAL_SUITES,
    ...SPECIAL_SUITES,
    "all",
    "coverage"
  ]);
  const suite = accepted.has(requested) ? requested : "all";
  const selectors = accepted.has(requested)
    ? process.argv.slice(3)
    : process.argv.slice(2);
  if (suite === "coverage" && selectors.length > 0) {
    throw new Error("Coverage requires the complete normal test suite.");
  }
  run(suite, selectors);
}
