import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { captureBaseline, git, sha256 } from "../../scripts/verification-baseline.js";

function repository(t) {
  const root = mkdtempSync(path.join(os.tmpdir(), "verification-baseline-"));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const write = (file, value) => {
    mkdirSync(path.dirname(path.join(root, file)), { recursive: true });
    writeFileSync(path.join(root, file), typeof value === "string" ? value : JSON.stringify(value));
  };
  git(root, ["init", "--quiet"]);
  write("package.json", { name: "sample", version: "1.0.0", exports: { ".": "./src/index.js" }, scripts: { test: "node scripts/run-tests.js" } });
  write("package-lock.json", { version: "1.0.0", packages: { "": { version: "1.0.0" } } });
  write("agent_docs/contract/ACTION_INDEX.json", { actions: [{ name: "create", layer: "user-facing" }] });
  for (const file of ["scripts/run-tests.js", "scripts/coverage-policy.js", "test/capabilities.json", "src/persistence.js"]) write(file, "reference\n");
  write(".github/workflows/ci.yml", "jobs:\n  test:\n    runs-on: ubuntu-latest\n    steps:\n      - run: npm test\n");
  const commit = () => {
    git(root, ["add", "."]);
    git(root, ["-c", "user.name=Test", "-c", "user.email=test@example.invalid", "-c", "commit.gpgsign=false", "commit", "-qm", "fixture"]);
    return git(root, ["rev-parse", "HEAD"]).trim();
  };
  return { root, write, commit, first: commit() };
}

test("captures the exact committed inventory and workflow commands without executing them", t => {
  const { root, first } = repository(t);
  const result = captureBaseline(root);
  assert.equal(result.commit, first);
  assert.equal(result.workingTreeAtCapture, "");
  assert.equal(result.actions.count, 1);
  assert.equal(result.commands.workflows[0].jobs[0].commands[0].run, "npm test");
  assert.equal(result.files.find(f => f.path === "src/persistence.js").sha256, sha256("reference\n"));
  assert.deepEqual(captureBaseline(root), result);
});

test("separates historical snapshot bytes from dirty checkout and reports source drift", t => {
  const { root, write, commit, first } = repository(t);
  const sourceMap = { commit: first, files: [{ path: "src/persistence.js", sha256: sha256("reference\n"), symbols: [{ line: 1, declaration: "reference" }] }] };
  write("src/persistence.js", "\nreference\nchanged\n");
  const dirty = captureBaseline(root, { sourceMap });
  assert.match(dirty.workingTreeAtCapture, /src\/persistence.js/);
  assert.equal(dirty.sourceMap.files[0].status, "matched");
  commit();
  const current = captureBaseline(root, { sourceMap });
  assert.equal(current.sourceMap.files[0].status, "changed");
  assert.deepEqual(current.sourceMap.files[0].symbols[0].currentLines, [2]);
  assert.equal(captureBaseline(root, { ref: first, sourceMap }).sourceMap.files[0].status, "matched");
});

test("rejects ambiguous, invalid and inconsistent inventory inputs", t => {
  const { root, write, commit } = repository(t);
  assert.throws(() => captureBaseline(root, { sourceMap: { files: [{ path: "../secret", sha256: "a".repeat(64) }] } }), /relative/);
  const file = { path: "missing.js", sha256: "a".repeat(64) };
  assert.equal(captureBaseline(root, { sourceMap: { files: [file] } }).sourceMap.files[0].status, "missing");
  assert.throws(() => captureBaseline(root, { sourceMap: { files: [file, file] } }), /unique/);
  assert.throws(() => captureBaseline(root, { sourceMap: { files: [{ ...file, sha256: "wrong" }] } }), /hash/);
  write("package-lock.json", { version: "2", packages: { "": { version: "2" } } });
  commit();
  assert.throws(() => captureBaseline(root), /versions/);
});
