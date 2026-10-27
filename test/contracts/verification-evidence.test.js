import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync, symlinkSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { runCheck } from "../../scripts/run-check.js";
import { captureRevision, evidenceHash, validateExecutionPlan, validateCompletion, validateProgress } from "../../scripts/verification-evidence.js";

const silence = { write() {} };
const task = { id: "foundation", dependsOn: [], requiredChecks: ["sample-test"] };
const plan = { schemaVersion: 1, finalTask: "delivery", tasks: [task, { id: "delivery", dependsOn: [task.id] }] };

async function evidence(t) {
  const root = mkdtempSync(path.join(os.tmpdir(), "verification-evidence-"));
  t.after(() => rmSync(root, { force: true, recursive: true }));
  const git = args => execFileSync("git", args, { cwd: root, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();
  git(["init", "--quiet"]);
  writeFileSync(path.join(root, ".gitignore"), ".artifacts/\n");
  mkdirSync(path.join(root, "test"));
  const file = path.join(root, "test/sample.test.js");
  writeFileSync(file, 'const { test } = require("node:test"); const assert = require("node:assert/strict"); test("literal", () => assert.equal(2 + 2, 4));\n');
  git(["add", "."]);
  git(["-c", "user.name=Test", "-c", "user.email=test@example.invalid", "-c", "commit.gpgsign=false", "commit", "-qm", "fixture"]);
  const directory = path.join(root, ".artifacts/checks");
  const args = ["--test", file];
  assert.equal(await runCheck("sample-test", "node", args, { cwd: root, outputDirectory: directory, stdout: silence, stderr: silence,
    discovery: { suite: "unit", files: ["test/sample.test.js"] } }), 0);
  const receiptPath = ".artifacts/checks/sample-test.json", logPath = ".artifacts/checks/sample-test.log";
  const hash = file => evidenceHash(readFileSync(path.join(root, file)));
  const record = {
    schemaVersion: 1, taskId: task.id, status: "complete", implementationCommit: git(["rev-parse", "HEAD"]),
    commands: [{ command: ["node", ...args], exitCode: 0, receiptPath, receiptSha256: hash(receiptPath), logPath, logSha256: hash(logPath) }],
    artifacts: [{ path: "test/sample.test.js", sha256: hash("test/sample.test.js") }],
    openObligations: [], consumerCells: [{ id: "svg", status: "not-applicable", reason: "Test infrastructure only." }], gateEvidence: []
  };
  const rewriteReceipt = (copy, edit) => {
    const receipt = JSON.parse(readFileSync(path.join(root, receiptPath), "utf8"));
    edit(receipt);
    writeFileSync(path.join(root, receiptPath), JSON.stringify(receipt));
    copy.commands[0].receiptSha256 = hash(receiptPath);
  };
  return { root, record, rewriteReceipt, file, hash };
}

test("actual execution retains commit, discovered files and matching logs for completion", async t => {
  const { root, record } = await evidence(t);
  assert.deepEqual(validateCompletion(record, { root, task }), { taskId: task.id, status: "complete", checks: 1 });
  assert.deepEqual(validateProgress(plan, [record], { root }), { complete: [task.id], ready: ["delivery"] });
  assert.equal(captureRevision(root).clean, true);
});

test("completion rejects not-run, failed commands, missing checks, artifacts and unresolved obligations", async t => {
  const { root, record } = await evidence(t);
  const mutations = [
    value => { value.status = "not-run"; },
    value => { value.commands[0].exitCode = 1; },
    value => { value.commands = []; },
    value => { value.artifacts = []; },
    value => { value.artifacts[0].path = "missing.json"; },
    value => { value.artifacts[0].sha256 = "0".repeat(64); },
    value => { value.openObligations = ["pending consumer"]; },
    value => { value.consumerCells[0].status = "not-run"; },
    value => { delete value.consumerCells[0].reason; },
    value => { value.commands.push(value.commands[0]); },
    value => { value.implementationCommit = "f".repeat(40); },
    value => { value.commands[0].command = ["node", "wrong.js"]; }
  ];
  for (const mutate of mutations) {
    const copy = structuredClone(record); mutate(copy);
    assert.throws(() => validateCompletion(copy, { root, task }));
  }
  assert.throws(() => validateCompletion(record, { root, task: { ...task, requiredChecks: ["missing"] } }), /Missing required/);
  assert.throws(() => validateCompletion(record, { root, task: { ...task, requiredGates: ["public-contract"] } }), /Unapproved gate/);
});

test("receipt failures, stale revisions and zero discovered files cannot be relabelled passed", async t => {
  const { root, record, rewriteReceipt } = await evidence(t);
  const original = readFileSync(path.join(root, record.commands[0].receiptPath));
  for (const edit of [
    receipt => { receipt.code = 7; },
    receipt => { receipt.termination = "timeout"; },
    receipt => { receipt.source.clean = false; },
    receipt => { receipt.sourceAfter.commit = "0".repeat(40); },
    receipt => { receipt.sourceAfter.available = false; },
    receipt => { receipt.discovery.files = []; },
    receipt => { receipt.discovery.files = ["test/unexecuted.test.js"]; },
    receipt => { delete receipt.discovery; },
    receipt => { receipt.logSha256 = "0".repeat(64); },
    receipt => { delete receipt.startedAt; }
  ]) {
    writeFileSync(path.join(root, record.commands[0].receiptPath), original);
    const copy = structuredClone(record); rewriteReceipt(copy, edit);
    assert.throws(() => validateCompletion(copy, { root, task }));
  }
});

test("path escapes, modified logs and dirty checkouts remain visible", async t => {
  const { root, record, file } = await evidence(t);
  for (const unsafe of ["../secret", "/tmp/secret", "C:\\secret", "test/../secret"]) {
    const copy = structuredClone(record); copy.artifacts[0].path = unsafe;
    assert.throws(() => validateCompletion(copy, { root, task }), /relative/);
  }
  if (process.platform !== "win32") {
    symlinkSync(os.tmpdir(), path.join(root, ".artifacts/outside"));
    const copy = structuredClone(record); copy.artifacts[0].path = ".artifacts/outside";
    assert.throws(() => validateCompletion(copy, { root, task }), /inside/);
  }
  writeFileSync(path.join(root, record.commands[0].logPath), "different log");
  assert.throws(() => validateCompletion(record, { root, task }), /hash mismatch/);
  writeFileSync(file, "changed");
  assert.equal(captureRevision(root).clean, false);
});

test("execution graph rejects disconnected delivery paths, cycles and incomplete prerequisites", async t => {
  const { root, record } = await evidence(t);
  const disconnected = { ...plan, tasks: [...plan.tasks, { id: "native-charts", dependsOn: [task.id] }] };
  assert.throws(() => validateExecutionPlan(disconnected), /does not reach/);
  const connected = structuredClone(disconnected);
  connected.tasks.find(t => t.id === "delivery").dependsOn.push("native-charts");
  assert.equal(validateExecutionPlan(connected).size, 3);
  assert.throws(() => validateExecutionPlan({ ...plan, tasks: [...plan.tasks, task] }), /unique/);
  assert.throws(() => validateExecutionPlan({ ...plan, tasks: [{ ...task, dependsOn: ["delivery"] }, plan.tasks[1]] }), /cycle/);
  assert.throws(() => validateExecutionPlan({ ...plan, tasks: [{ ...task, dependsOn: ["unknown"] }, plan.tasks[1]] }), /Unknown/);
  assert.throws(() => validateProgress(plan, [record, record], { root }), /duplicate/);
  const dependent = { ...record, taskId: "delivery" };
  assert.throws(() => validateProgress({ ...plan, tasks: [task, { ...plan.tasks[1], requiredChecks: task.requiredChecks }] }, [dependent], { root }), /Incomplete prerequisite/);
});

test("canonical test runner exits unsuccessfully when a selector discovers no test files", () => {
  const root = fileURLToPath(new URL("../../", import.meta.url));
  const result = spawnSync(process.execPath, ["scripts/run-tests.js", "unit", "unit/absent-verification-capability.test.js"], { cwd: root, encoding: "utf8" });
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /No test files found/);
});
