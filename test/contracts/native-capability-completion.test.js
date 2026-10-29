import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { assessNativeCompletion, validateNativeManifest } from "../../scripts/native-capability-completion.js";
import { evidenceHash } from "../../scripts/verification-evidence.js";
import { runCheck } from "../../scripts/run-check.js";

const root = fileURLToPath(new URL("../../", import.meta.url));
const manifest = JSON.parse(readFileSync(path.join(root, "test/native-capabilities.json"), "utf8"));
const groupIds = "01 02 04 06 07 08 09 10 11 12 13 14 15 16 17 18 19 20 21 22 23 24 25 26 27 28 29 30 31 32 33 34 35 36 37 38 39 40 41 42 43 44 45 53 54 55 56 57 58 59 60 61 62 63 64 65 70 71 72 73 74 75 76 77 78 79 80 81 82 83 84 85 86 87 88 89 90 91 92".split(" ").map(id => `AT-${id}`);
const rowIds = "compound-path pattern image partition-cartesian partition-polar tree treemap graph-nodes edges-hierarchical edges-force-directed edges-density edges-edge-path sankey-dag sankey-cyclic contour-line contour-filled calendar table pyramid ohlc waterfall trail geo-shape geo-point geo-line graticule rose-regression radar-regression streamgraph-regression violin-regression".split(" ");
const columns = "create edit source-revise encodings scales guides composition selection-highlight hit scene-animation svg canvas png pdf persistence types package docs accessibility".split(" ");
const clone = value => structuredClone(value);

test("native active requirements, acceptance groups and consumer obligations cannot silently shrink", () => {
  const scope = validateNativeManifest(manifest, { root });
  const requirementIds = [1, 2, ...Array.from({ length: 18 }, (_, i) => i + 5)].map(id => `USR-${String(id).padStart(2, "0")}`)
    .concat(Array.from({ length: 10 }, (_, i) => `GGA-${String(i + 1).padStart(2, "0")}`));
  assert.deepEqual([...scope.requirements.keys()].sort(), requirementIds.sort());
  assert.deepEqual([...scope.groups.keys()].sort(), groupIds);
  assert.deepEqual(manifest.consumers.map(row => row.id), rowIds);
  assert.deepEqual(manifest.consumerColumns, columns);
  for (const row of manifest.consumers) {
    assert.deepEqual(row.requiredConsumers, columns);
    assert.deepEqual(row.notApplicable, {});
  }
  assert.deepEqual(manifest.interactionColumns, ["pointer-keyboard-touch", "preview-commit-cancel", "undo-redo", "linked", "async-dispose", "restore", "current-frame"]);
  assert.deepEqual(manifest.interaction.requiredConsumers, manifest.interactionColumns);
  assert.deepEqual(manifest.interaction.notApplicable, {});
  assert.equal(scope.cells.size, 577);
  assert.deepEqual([...scope.checks.keys()], ["normal", "realistic", "coverage", "browser", "render", "package", "platform", "package-artifact", "documentation"]);
});

test("existing owners and unassigned work remain separate from actual candidate qualification", () => {
  const report = assessNativeCompletion(manifest, {}, { root });
  assert.equal(report.status, "pending");
  assert.equal(report.candidate, null);
  assert.deepEqual(report.groups, { total: 79, passed: 0, failed: 0, pending: 79, notApplicable: 0 });
  assert.deepEqual(report.consumers, { total: 577, passed: 0, failed: 0, pending: 577, notApplicable: 0 });
  assert.ok(report.pendingOwners.length > 0);
  assert.ok(report.requirements.every(requirement => requirement.status === "pending"));
  assert.throws(() => assessNativeCompletion(manifest, {}, { root, requireComplete: true }), /656 pending targets/);
});

test("native manifests have no executable dependency on implementation history or reference corpora", () => {
  for (const file of ["test/native-capabilities.json", "scripts/native-capability-completion.js"]) {
    assert.doesNotMatch(readFileSync(path.join(root, file), "utf8"), /(?:study\/|agent_docs\/impl\/|roadmap\d|STEP-\d|WP-\d)/u);
  }
  for (const requirement of manifest.requirements) assert.match(requirement.id, /^(?:USR|GGA)-\d{2}$/u);
});

test("manifest validation rejects missing, duplicate, orphan and reference-only scope", () => {
  const changes = [
    m => { m.requirements.push(clone(m.requirements[0])); },
    m => { m.requirements[0].id = "REFERENCE-01"; },
    m => { m.requirements[0].groups = []; },
    m => { m.requirements[0].groups.push("AT-99"); },
    m => { m.groups.push(clone(m.groups[0])); },
    m => { m.groups[0].id = "AT-99"; },
    m => { m.requirements.forEach(r => { r.groups = r.groups.filter(id => id !== "AT-01"); }); },
    m => { m.consumers[0].requiredConsumers.pop(); },
    m => { m.consumers[0].requiredConsumers.push("unknown"); },
    m => { m.consumers[0].groups = ["AT-99"]; },
    m => { m.interaction.id = m.consumers[0].id; },
    m => { m.requiredChecks[0].command = ["echo", "passed"]; },
    m => { m.requiredChecks[0].command = ["npm", "run", "missing-native-suite"]; }
  ];
  for (const change of changes) { const copy = clone(manifest); change(copy); assert.throws(() => validateNativeManifest(copy, { root })); }
});

test("assigned paths must exist and be discovered, while pending owners cannot invent current paths", () => {
  for (const owner of [
    { status: "pending" },
    { status: "pending", reason: "not integrated", tests: ["test/unit/not-created.test.js"] },
    { status: "assigned", tests: [], contracts: ["agent_docs/contract/current/CORE.md"] },
    { status: "assigned", tests: ["test/unit/not-created.test.js"], contracts: ["agent_docs/contract/current/CORE.md"] },
    { status: "assigned", tests: ["test/support/program-traces.js"], contracts: ["agent_docs/contract/current/CORE.md"] },
    { status: "assigned", tests: ["test/contracts/verification-evidence.test.js"], contracts: ["agent_docs/history.md"] }
  ]) {
    const copy = clone(manifest); copy.groups[0].owner = owner;
    assert.throws(() => validateNativeManifest(copy, { root }));
  }
});

async function fixture(t, amendScope = () => {}) {
  const directory = mkdtempSync(path.join(os.tmpdir(), "native-completion-"));
  t.after(() => rmSync(directory, { force: true, recursive: true }));
  const write = (file, value) => { mkdirSync(path.dirname(path.join(directory, file)), { recursive: true }); writeFileSync(path.join(directory, file), typeof value === "string" ? value : JSON.stringify(value)); };
  const git = args => execFileSync("git", args, { cwd: directory, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();
  git(["init", "--quiet"]);
  write(".gitignore", ".artifacts/\n");
  write("package.json", { scripts: { test: "node --test test/unit/sample.test.js" } });
  write("test/unit/sample.test.js", 'const { test } = require("node:test"); const assert = require("node:assert/strict"); test("literal independent sum", () => assert.equal(2 + 2, 4));\n');
  write("agent_docs/contract/current/SAMPLE.md", "# Native sample\nThe sample is numeric and has no visual output.\n");
  const scope = { schemaVersion: 1, scope: "native", requirements: [{ id: "GGA-01", description: "Literal sum", groups: ["AT-01"] }],
    groups: [{ id: "AT-01", input: "Two plus two", expectation: "Sum equals four", owner: { status: "assigned", contracts: ["agent_docs/contract/current/SAMPLE.md"], tests: ["test/unit/sample.test.js"] } }],
    consumerColumns: ["create", "svg"], consumers: [{ id: "sample", groups: ["AT-01"], owner: { status: "assigned", contracts: ["agent_docs/contract/current/SAMPLE.md"], tests: ["test/unit/sample.test.js"] }, assignedOwners: {}, requiredConsumers: ["create"], notApplicable: { svg: { reason: "Numeric fixture only", contract: "agent_docs/contract/current/SAMPLE.md", excerpt: "has no visual output" } } }],
    interactionColumns: ["restore"], interaction: { id: "interaction", groups: ["AT-01"], owner: { status: "assigned", contracts: ["agent_docs/contract/current/SAMPLE.md"], tests: ["test/unit/sample.test.js"] }, assignedOwners: {}, requiredConsumers: ["restore"], notApplicable: {} },
    requiredChecks: [{ id: "normal", command: ["npm", "test"] }] };
  amendScope(scope);
  write("test/native-capabilities.json", scope);
  git(["add", "."]); git(["-c", "user.name=Test", "-c", "user.email=test@example.invalid", "-c", "commit.gpgsign=false", "commit", "-qm", "native fixture"]);
  const commit = git(["rev-parse", "HEAD"]);
  const hash = file => evidenceHash(readFileSync(path.join(directory, file)));
  const ref = file => ({ path: file, sha256: hash(file) });
  write(".artifacts/candidate.tgz", "fixture candidate bytes");
  write(".artifacts/input.json", [2, 2]); write(".artifacts/call.json", { operation: "sum", input: ".artifacts/input.json" });
  write(".artifacts/expected.json", 4); write(".artifacts/actual.json", 4);
  write(".artifacts/diff.json", { status: "passed", comparison: "literal equality", expectedSha256: hash(".artifacts/expected.json"), actualSha256: hash(".artifacts/actual.json") });
  const commands = [];
  for (const [label, command, args, discovery] of [
    ["owner", "node", ["--test", path.join(directory, "test/unit/sample.test.js")], { suite: "unit", files: ["test/unit/sample.test.js"] }],
    ["normal", "npm", ["test"], undefined]
  ]) {
    const outputDirectory = path.join(directory, ".artifacts/checks"), silence = { write() {} };
    assert.equal(await runCheck(label, command, args, { cwd: directory, outputDirectory, stdout: silence, stderr: silence, discovery }), 0);
    commands.push({ command: [command, ...args], exitCode: 0, receiptPath: `.artifacts/checks/${label}.json`, receiptSha256: hash(`.artifacts/checks/${label}.json`), logPath: `.artifacts/checks/${label}.log`, logSha256: hash(`.artifacts/checks/${label}.log`) });
  }
  const artifacts = [".artifacts/candidate.tgz", "test/native-capabilities.json", "test/unit/sample.test.js", "agent_docs/contract/current/SAMPLE.md", ...["input", "call", "expected", "actual", "diff"].map(name => `.artifacts/${name}.json`)].map(ref);
  const completion = { schemaVersion: 1, taskId: "literal", status: "complete", implementationCommit: commit, commands,
    artifacts, openObligations: [], consumerCells: [], gateEvidence: [] };
  const proof = { id: "literal", completion, ...Object.fromEntries(["input", "call", "expected", "actual", "diff"].map(name => [name, ref(`.artifacts/${name}.json`)])) };
  const record = { candidate: { commit, artifact: ref(".artifacts/candidate.tgz"), manifest: ref("test/native-capabilities.json") }, evidence: [proof], results: [
    ...["AT-01", "consumer:sample/create", "consumer:interaction/restore"].map(target => ({ target, status: "passed", evidence: ["literal"] })),
    { target: "consumer:sample/svg", status: "not-applicable", reason: "Numeric fixture only" }
  ], qualification: { ...clone(completion), taskId: "native-qualification" } };
  return { root: directory, scope, record, ref, write };
}

test("real executed owners and one candidate archive can close a literal native scope", async t => {
  const f = await fixture(t);
  const summary = assessNativeCompletion(f.scope, f.record, { root: f.root, requireComplete: true });
  assert.equal(summary.status, "complete");
  assert.equal(summary.requirements[0].status, "passed");
  assert.deepEqual(summary.consumers, { total: 3, passed: 2, failed: 0, pending: 0, notApplicable: 1 });
});

test("missing consumer execution keeps its requirement pending even after group tests pass", async t => {
  const f = await fixture(t), record = clone(f.record);
  record.results = record.results.filter(result => result.target !== "consumer:sample/create");
  const summary = assessNativeCompletion(f.scope, record, { root: f.root });
  assert.equal(summary.requirements[0].status, "pending");
  assert.deepEqual(summary.pending, ["consumer:sample/create"]);
  assert.throws(() => assessNativeCompletion(f.scope, record, { root: f.root, requireComplete: true }), /incomplete/);
  delete record.qualification;
  assert.equal(assessNativeCompletion(f.scope, record, { root: f.root }).qualification, "pending");
});

test("fabricated pass, empty proof, duplicate target and ad hoc exemption fail closed", async t => {
  const f = await fixture(t);
  const changes = [
    r => { r.results[0].evidence = []; },
    r => { r.results[0].evidence = ["missing"]; },
    r => { r.results[0].status = "complete"; },
    r => { r.results[0].target = "REFERENCE-01"; },
    r => { r.results.push(clone(r.results[0])); },
    r => { r.results[0] = { target: "AT-01", status: "not-applicable", reason: "not needed" }; },
    r => { r.results[1] = { target: "consumer:sample/create", status: "not-applicable", reason: "not needed" }; },
    r => { r.results[3].reason = ""; },
    r => { r.results[3] = { target: "consumer:sample/svg", status: "passed", evidence: ["literal"] }; },
    r => { r.evidence[0].expected = r.evidence[0].actual; },
    r => { r.evidence[0].completion.openObligations = ["missing native behavior"]; },
    r => { delete r.candidate; },
    r => { r.evidence.push({ ...clone(r.evidence[0]), id: "unused", completion: { ...clone(r.evidence[0].completion), taskId: "unused" } }); }
  ];
  for (const change of changes) { const record = clone(f.record); change(record); assert.throws(() => assessNativeCompletion(f.scope, record, { root: f.root })); }
});

test("pending owners, missing executed owners and missing contract hashes cannot become passed", async t => {
  const f = await fixture(t);
  const scope = clone(f.scope); scope.groups[0].owner = { status: "pending", reason: "implementation unavailable" };
  assert.throws(() => assessNativeCompletion(scope, f.record, { root: f.root }), /Candidate manifest differs/);
  for (const missing of ["test/unit/sample.test.js", "agent_docs/contract/current/SAMPLE.md"]) {
    const record = clone(f.record); record.evidence[0].completion.artifacts = record.evidence[0].completion.artifacts.filter(a => a.path !== missing);
    assert.throws(() => assessNativeCompletion(f.scope, record, { root: f.root }), /not executed and hashed|not hashed/);
  }
});

test("failed, stale, dirty, filtered and empty-discovery receipts are not completion evidence", async t => {
  const f = await fixture(t), command = f.record.evidence[0].completion.commands[0];
  const original = JSON.parse(readFileSync(path.join(f.root, command.receiptPath), "utf8"));
  for (const change of [
    r => { r.code = 1; }, r => { r.termination = "timeout"; },
    r => { r.source.clean = false; }, r => { r.sourceAfter.commit = "0".repeat(40); },
    r => { r.discovery.files = []; }, r => { r.args.push("--test-only"); },
    r => { r.discovery.files = ["test/unit/not-run.test.js"]; }
  ]) {
    const record = clone(f.record), receipt = clone(original); change(receipt); f.write(command.receiptPath, receipt);
    record.evidence[0].completion.commands[0].receiptSha256 = f.ref(command.receiptPath).sha256;
    assert.throws(() => assessNativeCompletion(f.scope, record, { root: f.root }));
  }
});

test("different archives, changed expected results and failing comparisons reject qualification", async t => {
  const f = await fixture(t);
  f.write(".artifacts/other.tgz", "different package");
  const record = clone(f.record); record.candidate.artifact = f.ref(".artifacts/other.tgz");
  assert.throws(() => assessNativeCompletion(f.scope, record, { root: f.root }), /archive mismatch/);
  const mismatch = clone(f.record); mismatch.candidate.commit = "0".repeat(40);
  assert.throws(() => assessNativeCompletion(f.scope, mismatch, { root: f.root }), /candidate mismatch|Command failed/);
  const failedDiff = clone(f.record);
  f.write(".artifacts/diff.json", { status: "failed", comparison: "wrong result", expectedSha256: failedDiff.evidence[0].expected.sha256, actualSha256: failedDiff.evidence[0].actual.sha256 });
  failedDiff.evidence[0].diff = f.ref(".artifacts/diff.json");
  failedDiff.evidence[0].completion.artifacts = failedDiff.evidence[0].completion.artifacts.map(a => a.path === ".artifacts/diff.json" ? failedDiff.evidence[0].diff : a);
  assert.throws(() => assessNativeCompletion(f.scope, failedDiff, { root: f.root }), /Comparison must pass/);
  f.write(".artifacts/expected.json", 5);
  assert.throws(() => assessNativeCompletion(f.scope, f.record, { root: f.root }), /hash mismatch/);
});

test("N/A applicability needs a real current contract and cannot hide a required cell", () => {
  for (const note of [{}, { reason: "not applicable" }, { reason: "numeric", contract: "agent_docs/contract/current/CORE.md", excerpt: "imaginary contract sentence" }]) {
    const copy = clone(manifest); copy.consumers[0].requiredConsumers = columns.filter(c => c !== "svg"); copy.consumers[0].notApplicable.svg = note;
    assert.throws(() => validateNativeManifest(copy, { root }));
  }
});

test("the explicit completion command fails while the checked-in native scope is pending", () => {
  const run = spawnSync(process.execPath, ["scripts/native-capability-completion.js", "--require-complete"], { cwd: root, encoding: "utf8" });
  assert.notEqual(run.status, 0);
  assert.match(run.stderr, /Native qualification incomplete/);
});


test("pending acceptance and consumer owners reject actual receipts until their contracts are assigned", async t => {
  for (const change of [
    scope => { scope.groups[0].owner = { status: "pending", reason: "not integrated" }; },
    scope => { scope.consumers[0].owner = { status: "pending", reason: "renderer not assigned" }; }
  ]) {
    const f = await fixture(t, change);
    assert.throws(() => assessNativeCompletion(f.scope, f.record, { root: f.root }), /Pending owner/);
  }
});

test("new hashes cannot attach changed source inputs to an older clean execution", async t => {
  const f = await fixture(t);
  for (const file of ["test/unit/sample.test.js", "agent_docs/contract/current/SAMPLE.md"]) {
    const original = readFileSync(path.join(f.root, file), "utf8");
    f.write(file, original + "\nchanged after receipt\n");
    const record = clone(f.record);
    record.evidence[0].completion.artifacts = record.evidence[0].completion.artifacts.map(a => a.path === file ? f.ref(file) : a);
    assert.throws(() => assessNativeCompletion(f.scope, record, { root: f.root }), /differs from execution commit/);
    f.write(file, original);
  }
  const changed = clone(f.scope); changed.groups[0].expectation = "a later contract";
  f.write("test/native-capabilities.json", changed);
  const record = clone(f.record); record.candidate.manifest = f.ref("test/native-capabilities.json");
  assert.throws(() => assessNativeCompletion(changed, record, { root: f.root }), /differs from execution commit/);
});

test("failed targets remain failed and missing full-suite receipts cannot be inferred from owner tests", async t => {
  const f = await fixture(t), record = clone(f.record);
  record.results[1] = { target: "consumer:sample/create", status: "failed", reason: "observed output differs" };
  const summary = assessNativeCompletion(f.scope, record, { root: f.root });
  assert.equal(summary.status, "failed");
  assert.equal(summary.requirements[0].status, "failed");
  const missing = clone(f.record); missing.qualification.commands = missing.qualification.commands.slice(0, 1);
  assert.throws(() => assessNativeCompletion(f.scope, missing, { root: f.root }), /Missing required check/);
});
