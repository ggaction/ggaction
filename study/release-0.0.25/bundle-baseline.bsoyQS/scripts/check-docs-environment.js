import { existsSync, readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { chromium } from "playwright";

const root = fileURLToPath(new URL("../", import.meta.url));

function major(version) {
  return Number(version.match(/\d+/)?.[0]);
}

export function inspectDocsEnvironment({
  nodeVersion = process.versions.node,
  rubyVersion,
  bundleAvailable,
  chromiumAvailable
}) {
  const errors = [];
  if (major(nodeVersion) < 20) errors.push(`Node.js 20+ is required; found ${nodeVersion}.`);
  const rubyMajor = rubyVersion ? major(rubyVersion) : 0;
  const rubyMinor = Number(rubyVersion?.match(/\d+\.(\d+)/)?.[1] ?? 0);
  if (!rubyVersion || rubyMajor < 3) {
    errors.push(`Ruby 3.2+ is required by the locked GitHub Pages bundle; found ${rubyVersion ?? "none"}.`);
  } else if (rubyMajor === 3 && rubyMinor < 2) {
    errors.push(`Ruby 3.2+ is required by the locked GitHub Pages bundle; found ${rubyVersion}.`);
  }
  if (!bundleAvailable) errors.push("Bundler cannot resolve Gemfile.lock. Run bundle install with Ruby 3.2+.");
  if (!chromiumAvailable) errors.push("Playwright Chromium is missing. Run npx playwright install chromium.");
  return errors;
}

export function docsEnvironmentRecommendations(environment, recommendedRuby = readFileSync(path.join(root, ".ruby-version"), "utf8").trim()) {
  const compatible = inspectDocsEnvironment({ ...environment, bundleAvailable: true, chromiumAvailable: true }).length === 0;
  return compatible && environment.rubyVersion && environment.rubyVersion !== recommendedRuby
    ? [`Ruby ${environment.rubyVersion} meets preflight only if dependencies resolve; CI uses ${recommendedRuby}. Use the pinned version to reproduce CI exactly.`]
    : [];
}

function command(name, args) {
  return spawnSync(name, args, { cwd: root, encoding: "utf8" });
}

export function currentDocsEnvironment() {
  const ruby = command("ruby", ["--version"]);
  const bundle = command("bundle", ["check"]);
  return {
    nodeVersion: process.versions.node,
    rubyVersion: ruby.status === 0 ? ruby.stdout.match(/ruby\s+(\d+\.\d+\.\d+)/)?.[1] : undefined,
    bundleAvailable: bundle.status === 0,
    chromiumAvailable: existsSync(chromium.executablePath())
  };
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  const environment = currentDocsEnvironment();
  const errors = inspectDocsEnvironment(environment);
  const recommendations = docsEnvironmentRecommendations(environment);
  if (recommendations.length) process.stdout.write(`Recommended toolchain:\n- ${recommendations.join("\n- ")}\n`);
  if (errors.length > 0) {
    process.stderr.write(`Documentation environment is not ready:\n- ${errors.join("\n- ")}\n`);
    process.exitCode = 1;
  } else {
    process.stdout.write("documentation environment is ready\n");
  }
}
