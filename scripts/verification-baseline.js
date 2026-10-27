import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parse } from "yaml";
import { chromium } from "playwright";
import { npmInvocation } from "./npm-command.js";

export const sha256 = value => createHash("sha256").update(value).digest("hex");

export function git(root, args) {
  return execFileSync("git", args, { cwd: root, encoding: "utf8", maxBuffer: 32 * 1024 * 1024 });
}

function relativeFile(value) {
  if (typeof value !== "string" || !value || path.posix.isAbsolute(value) ||
      value.includes("\\") || value.includes(":") || value.split("/").some(x => x === ".." || x === "." || !x)) {
    throw new Error(`Expected a repository-relative file: ${value}`);
  }
  return value;
}

// Read the selected commit, never mix a historical identity with working-tree bytes.
export function captureBaseline(root, { ref = "HEAD", sourceMap } = {}) {
  const commit = git(root, ["rev-parse", "--verify", `${ref}^{commit}`]).trim();
  const files = git(root, ["ls-tree", "-r", "--name-only", "-z", commit]).split("\0").filter(Boolean);
  const available = new Set(files);
  const read = file => git(root, ["show", `${commit}:${relativeFile(file)}`]);
  const pkg = JSON.parse(read("package.json"));
  const lock = JSON.parse(read("package-lock.json"));
  if (pkg.version !== lock.version || pkg.version !== lock.packages?.[""]?.version) {
    throw new Error("Package and lock versions must agree.");
  }
  const actions = JSON.parse(read("agent_docs/contract/ACTION_INDEX.json")).actions;
  if (!Array.isArray(actions) || new Set(actions.map(action => action.name)).size !== actions.length) {
    throw new Error("Action inventory must contain unique names.");
  }
  const workflowFiles = files.filter(file => /^\.github\/workflows\/.*\.ya?ml$/.test(file));
  const workflows = workflowFiles.map(file => {
    const source = read(file);
    const workflow = parse(source);
    return { path: file, sha256: sha256(source), jobs: Object.entries(workflow.jobs ?? {}).map(([id, job]) => ({
      id, runsOn: job["runs-on"], strategy: job.strategy ?? null,
      commands: (job.steps ?? []).filter(step => step.run).map(step => ({
        name: step.name ?? null, run: step.run, shell: step.shell ?? null,
        workingDirectory: step["working-directory"] ?? job.defaults?.run?.["working-directory"] ?? workflow.defaults?.run?.["working-directory"] ?? null,
        condition: step.if ?? null
      }))
    })) };
  });
  const mapped = sourceMap?.files ?? [];
  if (!Array.isArray(mapped) || new Set(mapped.map(file => file.path)).size !== mapped.length) {
    throw new Error("Source map must contain unique file paths.");
  }
  const sourceFiles = mapped.map(entry => {
    const file = relativeFile(entry.path);
    if (!/^[a-f0-9]{64}$/.test(entry.sha256)) throw new Error(`Invalid source hash: ${file}`);
    if (!available.has(file)) return { path: file, expectedSha256: entry.sha256, status: "missing" };
    const source = read(file), lines = source.split("\n"), actualSha256 = sha256(source);
    return {
      path: file, expectedSha256: entry.sha256, actualSha256,
      status: actualSha256 === entry.sha256 ? "matched" : "changed",
      symbols: (entry.symbols ?? []).map(symbol => ({
        declaration: symbol.declaration, previousLine: symbol.line,
        currentLines: lines.flatMap((line, index) => line.trim() === symbol.declaration.trim() ? [index + 1] : [])
      }))
    };
  });
  const important = ["package.json", "package-lock.json", "agent_docs/contract/ACTION_INDEX.json",
    "src/persistence.js", "scripts/run-tests.js", "scripts/coverage-policy.js", "test/capabilities.json"];
  return {
    schemaVersion: 1, kind: "committed-repository-baseline", commit,
    tree: git(root, ["rev-parse", `${commit}^{tree}`]).trim(),
    workingTreeAtCapture: git(root, ["status", "--porcelain=v1", "--untracked-files=all"]).trim(),
    package: { name: pkg.name, version: pkg.version, engines: pkg.engines, exports: pkg.exports },
    actions: { count: actions.length, byLayer: Object.fromEntries([...new Set(actions.map(a => a.layer))].sort().map(layer => [layer, actions.filter(a => a.layer === layer).length])) },
    files: important.map(file => ({ path: file, sha256: sha256(read(file)) })),
    commands: { npmScripts: pkg.scripts, workflows },
    sourceMap: { commit: sourceMap?.commit ?? null, files: sourceFiles },
    notice: "Committed snapshot inventory, not an executed verification result. Working-tree state and environment are recorded separately."
  };
}

export function captureEnvironment() {
  const npm = npmInvocation(["--version"]);
  let browser;
  try {
    browser = { status: "available", engine: "chromium", version: execFileSync(chromium.executablePath(), ["--version"], { encoding: "utf8", timeout: 5000 }).trim() };
  } catch {
    browser = { status: "unavailable", engine: "chromium" };
  }
  return {
    node: process.version, nodeExecutableSha256: sha256(readFileSync(process.execPath)),
    npm: execFileSync(npm.command, npm.args, { encoding: "utf8" }).trim(),
    platform: process.platform, arch: process.arch, osRelease: os.release(),
    cpus: os.cpus().length, memoryBytes: os.totalmem(), browser
  };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const [output, ref = "HEAD", sourceMapPath, ...extra] = process.argv.slice(2);
  if (!output || extra.length) throw new Error("Usage: node scripts/verification-baseline.js <output.json> [ref] [source-map.json]");
  const root = fileURLToPath(new URL("../", import.meta.url));
  const baseline = captureBaseline(root, { ref, sourceMap: sourceMapPath ? JSON.parse(readFileSync(sourceMapPath, "utf8")) : undefined });
  baseline.environment = captureEnvironment();
  mkdirSync(path.dirname(path.resolve(output)), { recursive: true });
  writeFileSync(output, JSON.stringify(baseline, null, 2) + "\n");
  process.stdout.write(`Recorded ${baseline.commit}: ${baseline.actions.count} actions, ${baseline.sourceMap.files.length} mapped files.\n`);
}
