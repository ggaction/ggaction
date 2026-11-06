// Build STEP-076 native evidence from the clean candidate's check receipts.
// Usage: node build-native-evidence.mjs <repoRoot> <candidateRoot> <candidateCommit> <tgz> <outDirRelative>
// Every proof states only what the receipts show: each declared owner test was
// discovered by a canonical suite run that exited 0 at the candidate commit, and
// each declared contract is hashed at that commit.
import { createHash } from "node:crypto";
import { copyFileSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import path from "node:path";

const [root, candidateRoot, commit, tgz, outRel] = process.argv.slice(2);
const sha = bytes => createHash("sha256").update(bytes).digest("hex");
const out = path.join(root, outRel);
mkdirSync(path.join(out, "checks"), { recursive: true }); mkdirSync(path.join(out, "proofs"), { recursive: true });
const ref = file => ({ path: path.relative(root, file).split(path.sep).join("/"), sha256: sha(readFileSync(file)) });
const write = (rel, value) => { const file = path.join(out, rel); writeFileSync(file, typeof value === "string" ? value : JSON.stringify(value, null, 2) + "\n"); return ref(file); };
const source = rel => ({ path: rel, sha256: sha(readFileSync(path.join(root, rel))) });

// Receipts and logs from the candidate run.
const checks = path.join(candidateRoot, ".artifacts/checks"), receipts = [];
for (const name of readdirSync(checks).filter(name => name.endsWith(".json")).sort()) {
  const label = name.slice(0, -5), receipt = JSON.parse(readFileSync(path.join(checks, name), "utf8"));
  copyFileSync(path.join(checks, name), path.join(out, "checks", name));
  copyFileSync(path.join(checks, `${label}.log`), path.join(out, "checks", `${label}.log`));
  const receiptRef = ref(path.join(out, "checks", name)), logRef = ref(path.join(out, "checks", `${label}.log`));
  receipts.push({ label, receipt, command: { command: [receipt.command, ...receipt.args], exitCode: receipt.code,
    receiptPath: receiptRef.path, receiptSha256: receiptRef.sha256, logPath: logRef.path, logSha256: logRef.sha256 } });
}
copyFileSync(tgz, path.join(out, path.basename(tgz)));
const artifact = ref(path.join(out, path.basename(tgz))), manifestRef = source("test/native-capabilities.json");
const manifest = JSON.parse(readFileSync(path.join(root, "test/native-capabilities.json"), "utf8"));
const discovering = receipts.filter(entry => entry.receipt.discovery !== undefined && entry.receipt.code === 0);
const discoveredBy = new Map();
for (const entry of discovering) for (const file of entry.receipt.discovery.files) {
  if (!discoveredBy.has(file)) discoveredBy.set(file, []);
  discoveredBy.get(file).push(entry.label);
}
const checkIds = manifest.requiredChecks.map(check => check.id);
const qualificationCommands = receipts.filter(entry => checkIds.includes(entry.label) || entry.receipt.discovery !== undefined).map(entry => entry.command);
const completion = (taskId, commands, artifacts) => ({ schemaVersion: 1, status: "complete", taskId, implementationCommit: commit,
  openObligations: [], commands, artifacts, consumerCells: [], gateEvidence: [] });

// One proof per target with an assigned owner.
const evidence = [], results = [], failedGroups = {
  "AT-56": "Performance thresholds are not met: data 100k blocking slice (55.2/58.1 ms load, 112.3/77.6 ms revise against 50 ms) and Geo 100k camera preview (145/148 ms against 50 ms). See DATA_SLICED_PROPOSAL.md and GEO_100K_PROPOSAL.md.",
  "AT-82": "Bundling thresholds are not met: density at every size and force-directed 10k exceed their time limits, and abort acknowledgement exceeds 100 ms for density 100, force-directed 1k DPR2 and 10k. See ROUTE_PREPARE_BLOCKING.md."
}, notRunGroups = {
  "AT-60": "The independent review is recorded in INDEPENDENT_REVIEW_075.md, but the group has no assigned durable owner test or contract.",
  "AT-61": "Same-candidate publication comparison requires the separately approved release (STEP-077)."
};
// Targets whose owner tests are discovered by the same passing receipts share
// one proof; the proof lists every such target with its owners and contracts.
const plans = new Map();
function planFor(target, owner) {
  const missing = owner.tests.filter(file => !discoveredBy.has(file));
  if (missing.length) return { passed: false, missing };
  const labels = [...new Set(owner.tests.flatMap(file => discoveredBy.get(file)))].sort();
  const key = labels.join("+");
  if (!plans.has(key)) plans.set(key, { id: `suites-${labels.map(label => label.replace(/^suite-/, "")).join("-")}`, labels, targets: [] });
  plans.get(key).targets.push({ target, owner });
  return { passed: true, id: plans.get(key).id };
}
function buildProofs() {
  for (const plan of plans.values()) {
    const { id, labels, targets } = plan;
    const tests = [...new Set(targets.flatMap(entry => entry.owner.tests))].sort().map(source);
    const contracts = [...new Set(targets.flatMap(entry => entry.owner.contracts))].sort().map(source);
    const commands = receipts.filter(entry => labels.includes(entry.label)).map(entry => entry.command);
    const input = write(`proofs/${id}.input.json`, { candidate: commit, targets: targets.map(({ target, owner }) => ({ target, tests: owner.tests, contracts: owner.contracts })), tests, contracts });
    const call = write(`proofs/${id}.call.json`, { receipts: commands.map(command => ({ label: path.basename(command.receiptPath, ".json"), exitCode: command.exitCode, receiptPath: command.receiptPath, receiptSha256: command.receiptSha256 })) });
    const expected = write(`proofs/${id}.expected.json`, { targets: targets.map(({ target, owner }) => ({ target, owners: owner.tests.map(file => ({ test: file, discovered: true, suiteExit: 0 })), contracts: owner.contracts })) });
    const actual = write(`proofs/${id}.actual.json`, { targets: targets.map(({ target, owner }) => ({ target, owners: owner.tests.map(file => ({ test: file, discovered: discoveredBy.has(file), suiteExit: discoveredBy.has(file) ? 0 : null })), contracts: owner.contracts.filter(file => contracts.some(entry => entry.path === file)) })) });
    const passed = expected.sha256 === actual.sha256 && commands.length > 0;
    const diff = write(`proofs/${id}.diff.json`, { status: passed ? "passed" : "failed", comparison: "Each declared owner test of each listed target is discovered by a canonical suite receipt that exited 0 at the candidate commit; each declared contract is hashed.", expectedSha256: expected.sha256, actualSha256: actual.sha256 });
    if (!passed) throw new Error(`Proof comparison failed: ${id}`);
    evidence.push({ id, completion: completion(id, commands, [artifact, manifestRef, ...tests, ...contracts, input, call, expected, actual, diff]), input, call, expected, actual, diff });
  }
}
const unresolved = [];
for (const group of manifest.groups) {
  if (failedGroups[group.id]) { results.push({ target: group.id, status: "failed", reason: failedGroups[group.id] }); continue; }
  if (notRunGroups[group.id]) { results.push({ target: group.id, status: "not-run", reason: notRunGroups[group.id] }); continue; }
  const proof = planFor(group.id, group.owner);
  if (proof.passed) results.push({ target: group.id, status: "passed", evidence: [proof.id] });
  else { results.push({ target: group.id, status: "failed", reason: `Owner tests were not discovered by a passing suite: ${proof.missing.join(", ")}` }); unresolved.push(group.id); }
}
for (const row of [...manifest.consumers, manifest.interaction]) {
  const columns = row.id === "interaction" ? manifest.interactionColumns : manifest.consumerColumns;
  for (const column of columns) {
    const target = `consumer:${row.id}/${column}`, note = row.notApplicable[column];
    if (note !== undefined) { results.push({ target, status: "not-applicable", reason: note.reason }); continue; }
    const owner = row.assignedOwners[column] ?? row.owner;
    if (owner.status !== "assigned") { results.push({ target, status: "not-run", reason: owner.reason }); continue; }
    const proof = planFor(target, owner);
    if (proof.passed) results.push({ target, status: "passed", evidence: [proof.id] });
    else { results.push({ target, status: "failed", reason: `Owner tests were not discovered by a passing suite: ${proof.missing.join(", ")}` }); unresolved.push(target); }
  }
}
buildProofs();
const qualification = completion("native-qualification", qualificationCommands, [artifact, manifestRef]);
writeFileSync(path.join(out, "candidate-results.json"), JSON.stringify({ candidate: { commit, artifact, manifest: manifestRef }, results, evidence, qualification }, null, 2) + "\n");
console.log(JSON.stringify({ receipts: receipts.map(entry => `${entry.label}:${entry.receipt.code}`), proofs: evidence.length, unresolved: unresolved.slice(0, 20), counts: results.reduce((acc, r) => (acc[r.status] = (acc[r.status] ?? 0) + 1, acc), {}) }));
