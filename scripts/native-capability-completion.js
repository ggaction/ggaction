import { readFileSync, realpathSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { classifyTestFile } from "./run-tests.js";
import { evidenceFile, evidenceHash, evidenceSourceFile, validateCompletion } from "./verification-evidence.js";

const requireValue = (condition, message) => { if (!condition) throw new Error(message); };
const nonempty = value => typeof value === "string" && value.trim().length > 0;
const exactKeys = (value, keys, name) => requireValue(value !== null && typeof value === "object" &&
  !Array.isArray(value) && Object.keys(value).every(key => keys.includes(key)), `Invalid ${name} shape.`);
function unique(values, name, pattern = /\S/u) {
  requireValue(Array.isArray(values) && values.length > 0 &&
    values.every(value => typeof value === "string" && pattern.test(value)) &&
    new Set(values).size === values.length, `${name} must be nonempty and unique.`);
  return new Set(values);
}
function index(values, name, pattern) {
  requireValue(Array.isArray(values), `${name} requires an array.`);
  unique(values.map(value => value?.id), name, pattern);
  return new Map(values.map(value => [value.id, value]));
}
function assignedFile(root, value, kind) {
  const prefix = kind === "contract" ? "agent_docs/contract/current/" : "test/";
  requireValue(typeof value === "string" && value.startsWith(prefix) &&
    !value.includes("\\") && value.split("/").every(part => part && part !== "." && part !== ".."),
  `Assigned ${kind} owner must use a current capability path: ${value}`);
  const base = realpathSync(root), file = realpathSync(path.join(base, value));
  requireValue(file.startsWith(base + path.sep) && statSync(file).isFile(), `Missing assigned ${kind} owner: ${value}`);
  if (kind === "test") requireValue(classifyTestFile(file, path.join(base, "test")) !== undefined,
    `Assigned test owner is not discovered: ${value}`);
  else requireValue(value.endsWith(".md"), `Contract owner must be Markdown: ${value}`);
}
function references(values, available, label) {
  unique(values, label);
  for (const id of values) requireValue(available.has(id), `${label} refers to unknown group: ${id}`);
}
function validateOwner(owner, root, id) {
  exactKeys(owner, ["status", "reason", "contracts", "tests"], `owner ${id}`);
  if (owner.status === "pending") {
    requireValue(nonempty(owner.reason) && owner.contracts === undefined && owner.tests === undefined,
      `Pending owner ${id} requires a reason, without invented current paths.`);
  } else {
    requireValue(owner.status === "assigned" && owner.reason === undefined, `Invalid owner status: ${id}`);
    unique(owner.contracts, `${id} contracts`);
    unique(owner.tests, `${id} tests`);
    for (const file of owner.contracts) assignedFile(root, file, "contract");
    for (const file of owner.tests) assignedFile(root, file, "test");
  }
}

// This validates declared obligations and existing owners, never implementation completion.
export function validateNativeManifest(manifest, { root } = {}) {
  exactKeys(manifest, ["schemaVersion", "scope", "requirements", "groups", "consumerColumns", "consumers",
    "interactionColumns", "interaction", "requiredChecks"], "native manifest");
  requireValue(manifest.schemaVersion === 1 && manifest.scope === "native", "A native manifest is required.");
  const requirements = index(manifest.requirements, "Native requirements", /^(?:GGA|USR)-\d{2}$/u);
  const groups = index(manifest.groups, "Acceptance groups", /^AT-\d{2}$/u);
  const referenced = new Set();
  for (const requirement of requirements.values()) {
    exactKeys(requirement, ["id", "description", "groups"], `requirement ${requirement.id}`);
    requireValue(nonempty(requirement.description), `Missing requirement description: ${requirement.id}`);
    references(requirement.groups, groups, requirement.id);
    requirement.groups.forEach(id => referenced.add(id));
  }
  for (const group of groups.values()) {
    exactKeys(group, ["id", "input", "expectation", "owner"], `group ${group.id}`);
    requireValue(nonempty(group.input) && nonempty(group.expectation) && referenced.has(group.id), `Orphan or empty acceptance group: ${group.id}`);
    validateOwner(group.owner, root, group.id);
  }
  const columns = unique(manifest.consumerColumns, "Consumer columns", /^[a-z][a-z-]*$/u);
  const interactionColumns = unique(manifest.interactionColumns, "Interaction columns", /^[a-z][a-z-]*$/u);
  const rows = index(manifest.consumers, "Consumer rows", /^[a-z][a-z-]*$/u);
  requireValue(!rows.has(manifest.interaction?.id) && manifest.interaction?.id === "interaction", "Interaction requires its own row.");
  const cells = new Map();
  for (const [row, available] of [...rows.values()].map(row => [row, columns]).concat([[manifest.interaction, interactionColumns]])) {
    exactKeys(row, ["id", "groups", "requiredConsumers", "notApplicable", "owner", "assignedOwners"], `consumer ${row.id}`);
    references(row.groups, groups, row.id);
    validateOwner(row.owner, root, row.id);
    exactKeys(row.assignedOwners, [...available], `${row.id} assigned consumer owners`);
    for (const [column, owner] of Object.entries(row.assignedOwners)) {
      requireValue(owner.status === "assigned", "Consumer overrides must identify assigned owners.");
      validateOwner(owner, root, `${row.id}/${column}`);
    }
    const required = unique(row.requiredConsumers, `${row.id} required consumers`);
    exactKeys(row.notApplicable, [...available], `${row.id} applicability`);
    for (const column of required) requireValue(available.has(column), `Unknown consumer: ${row.id}/${column}`);
    for (const column of available) {
      const note = row.notApplicable[column];
      requireValue(required.has(column) !== (note !== undefined), `Missing or duplicate applicability: ${row.id}/${column}`);
      if (note !== undefined) {
        exactKeys(note, ["reason", "contract", "excerpt"], `applicability ${row.id}/${column}`);
        requireValue(nonempty(note.reason) && nonempty(note.excerpt), "N/A requires a concrete reason and current contract excerpt.");
        assignedFile(root, note.contract, "contract");
        requireValue(readFileSync(path.join(root, note.contract), "utf8").includes(note.excerpt), "N/A contract excerpt is absent.");
      }
      cells.set(`${row.id}/${column}`, { row, required: required.has(column), note, owner: row.assignedOwners[column] ?? row.owner });
    }
  }
  const checks = index(manifest.requiredChecks, "Qualification checks", /^[a-z][a-z-]*$/u);
  const packageManifest = JSON.parse(readFileSync(path.join(root, "package.json"), "utf8"));
  for (const check of checks.values()) {
    exactKeys(check, ["id", "command"], `check ${check.id}`);
    const args = check.command;
    requireValue(Array.isArray(args) && (JSON.stringify(args) === '["npm","test"]' ||
      (args.length === 3 && args[0] === "npm" && args[1] === "run" && nonempty(packageManifest.scripts?.[args[2]]))),
    `Qualification check must name an existing canonical npm command: ${check.id}`);
  }
  return { requirements, groups, cells, checks };
}

function sameReference(a, b) { return a?.path === b?.path && a?.sha256 === b?.sha256; }
function hasArtifact(completion, reference) { return completion.artifacts.some(artifact => sameReference(artifact, reference)); }
function validateProof(proof, candidate, root) {
  exactKeys(proof, ["id", "completion", "input", "call", "expected", "actual", "diff"], "native evidence");
  const completion = proof.completion;
  requireValue(completion?.implementationCommit === candidate.commit, `Evidence candidate mismatch: ${proof.id}`);
  requireValue(Array.isArray(completion.commands) && completion.commands.length > 0, "Evidence requires executed commands.");
  const labels = completion.commands.map(command => {
    const receipt = JSON.parse(evidenceFile(root, command, "receiptPath", "receiptSha256"));
    requireValue(!receipt.args.some(arg => /^(?:--test-name-pattern|--test-skip-pattern|--test-only)(?:=|$)/u.test(arg)),
      "Filtered test execution cannot qualify a complete owner.");
    return receipt.label;
  });
  validateCompletion(completion, { root, task: { id: proof.id, requiredChecks: labels } });
  requireValue(hasArtifact(completion, candidate.artifact), `Evidence archive mismatch: ${proof.id}`);
  requireValue(hasArtifact(completion, candidate.manifest), `Evidence manifest mismatch: ${proof.id}`);
  for (const name of ["input", "call", "expected", "actual", "diff"]) {
    requireValue(evidenceFile(root, proof[name]).length > 0, `Empty ${name} proof artifact: ${proof.id}`);
    requireValue(hasArtifact(completion, proof[name]), `Missing ${name} proof artifact: ${proof.id}`);
  }
  requireValue(new Set([proof.input.path, proof.call.path, proof.expected.path, proof.actual.path, proof.diff.path]).size === 5,
    "Input, call, independent expected, actual and diff must be distinct artifacts.");
  const diff = JSON.parse(evidenceFile(root, proof.diff));
  requireValue(diff.status === "passed" && nonempty(diff.comparison) &&
    diff.expectedSha256 === proof.expected.sha256 && diff.actualSha256 === proof.actual.sha256,
  "Comparison must pass and bind the exact expected and actual artifacts.");
  const discovered = new Set();
  for (const command of completion.commands) {
    const receipt = JSON.parse(evidenceFile(root, command, "receiptPath", "receiptSha256"));
    for (const file of receipt.discovery?.files ?? []) discovered.add(file);
  }
  return { completion, discovered };
}
function assertOwnerEvidence(group, proofs, verifySource) {
  requireValue(group.owner.status === "assigned", `Pending owner cannot pass: ${group.id}`);
  for (const file of group.owner.tests) {
    requireValue(proofs.some(proof => proof.discovered.has(file) && proof.completion.artifacts.some(artifact => artifact.path === file)),
      `Required owner was not executed and hashed: ${group.id} ${file}`);
  }
  // Contracts and discovered tests must be the inputs of the receipt's commit.
  for (const file of [...group.owner.tests, ...group.owner.contracts]) {
    const proof = proofs.find(proof => proof.completion.artifacts.some(artifact => artifact.path === file));
    requireValue(proof !== undefined, `Current contract was not hashed: ${file}`);
    verifySource(proof.completion.implementationCommit, proof.completion.artifacts.find(artifact => artifact.path === file));
  }
}

export function assessNativeCompletion(manifest, record = {}, { root, requireComplete = false } = {}) {
  const scope = validateNativeManifest(manifest, { root });
  exactKeys(record, ["candidate", "results", "evidence", "qualification"], "native result");
  const sourceInputs = new Map();
  const verifySource = (commit, reference) => {
    const key = `${commit}:${reference?.path}:${reference?.sha256}`;
    if (!sourceInputs.has(key)) sourceInputs.set(key, evidenceSourceFile(root, commit, reference));
    return sourceInputs.get(key);
  };
  const candidate = record.candidate;
  if (candidate !== undefined) {
    exactKeys(candidate, ["commit", "artifact", "manifest"], "candidate");
    requireValue(typeof candidate.commit === "string" && /^[a-f0-9]{40}$/u.test(candidate.commit), "Candidate requires an exact commit.");
    evidenceFile(root, candidate.artifact);
    requireValue(candidate.manifest?.path === "test/native-capabilities.json", "Candidate requires the canonical native manifest.");
    const pinned = JSON.parse(verifySource(candidate.commit, candidate.manifest));
    requireValue(JSON.stringify(pinned) === JSON.stringify(manifest), "Candidate manifest differs from the assessed scope.");
  }
  const targets = new Map([...scope.groups.keys()].map(id => [id, { kind: "group", id }]));
  for (const [id, cell] of scope.cells) targets.set(`consumer:${id}`, { kind: "consumer", id, cell });
  const evidence = record.evidence ?? [];
  requireValue(Array.isArray(evidence), "Evidence requires an array.");
  const proofs = evidence.length ? index(evidence, "Evidence IDs", /^[a-z][a-z0-9-]*$/u) : new Map();
  requireValue(proofs.size === 0 || candidate !== undefined, "Executed evidence requires a candidate.");
  const verified = new Map([...proofs].map(([id, proof]) => [id, validateProof(proof, candidate, root)]));
  const supplied = record.results ?? [];
  requireValue(Array.isArray(supplied), "Results require an array.");
  const results = new Map(), used = new Set();
  for (const result of supplied) {
    exactKeys(result, ["target", "status", "reason", "evidence"], "target result");
    requireValue(targets.has(result.target) && !results.has(result.target), `Unknown or duplicate native target: ${result.target}`);
    requireValue(["passed", "failed", "not-run", "not-applicable"].includes(result.status), "Invalid result status.");
    const target = targets.get(result.target);
    if (result.status === "passed") {
      requireValue(target.kind !== "consumer" || target.cell.required, "A declared N/A cell cannot count as passed.");
      unique(result.evidence, `${result.target} evidence`);
      const selected = result.evidence.map(id => {
        requireValue(verified.has(id), `Unknown evidence: ${id}`); used.add(id); return verified.get(id);
      });
      const owner = target.kind === "group" ? scope.groups.get(target.id) : { id: target.id, owner: target.cell.owner };
      assertOwnerEvidence(owner, selected, verifySource);
    } else {
      requireValue(nonempty(result.reason) && result.evidence === undefined, "Unresolved or N/A results require a reason and cannot claim passing evidence.");
      if (result.status === "not-applicable") {
        requireValue(target.kind === "consumer" && !target.cell.required && result.reason === target.cell.note.reason,
          "Required native target cannot be exempted by a result.");
        requireValue(candidate !== undefined, "A closed N/A result requires a candidate contract.");
        const file = target.cell.note.contract;
        verifySource(candidate.commit, { path: file, sha256: evidenceHash(readFileSync(path.join(root, file))) });
      }
    }
    results.set(result.target, result);
  }
  requireValue([...proofs.keys()].every(id => used.has(id)), "Unused evidence cannot imply native completion.");
  const status = id => results.get(id)?.status ?? "not-run";
  const count = ids => ({ total: ids.length, passed: ids.filter(id => status(id) === "passed").length,
    failed: ids.filter(id => status(id) === "failed").length, pending: ids.filter(id => status(id) === "not-run").length,
    notApplicable: ids.filter(id => status(id) === "not-applicable").length });
  const requirements = [...scope.requirements.values()].map(requirement => {
    const cells = [...scope.cells].filter(([, cell]) => cell.row.groups.some(id => requirement.groups.includes(id)))
      .map(([id]) => `consumer:${id}`);
    const relevant = [...requirement.groups, ...cells];
    return { id: requirement.id, status: relevant.every(id => ["passed", "not-applicable"].includes(status(id))) ? "passed" :
      relevant.some(id => status(id) === "failed") ? "failed" : "pending" };
  });
  let qualification = "pending";
  if (record.qualification !== undefined) {
    requireValue(candidate !== undefined && record.qualification.implementationCommit === candidate.commit, "Qualification candidate mismatch.");
    validateCompletion(record.qualification, { root, task: { id: "native-qualification", requiredChecks: [...scope.checks.keys()] } });
    requireValue(hasArtifact(record.qualification, candidate.artifact), "Qualification archive mismatch.");
    requireValue(hasArtifact(record.qualification, candidate.manifest), "Qualification manifest mismatch.");
    for (const command of record.qualification.commands) {
      const receipt = JSON.parse(evidenceFile(root, command, "receiptPath", "receiptSha256"));
      if (scope.checks.has(receipt.label)) requireValue(JSON.stringify(command.command) === JSON.stringify(scope.checks.get(receipt.label).command),
        `Qualification command mismatch: ${receipt.label}`);
    }
    qualification = "passed";
  }
  const pending = [...targets.keys()].filter(id => status(id) === "not-run");
  const failed = [...targets.keys()].filter(id => status(id) === "failed");
  const complete = pending.length === 0 && failed.length === 0 && qualification === "passed";
  const summary = { status: complete ? "complete" : failed.length > 0 ? "failed" : "pending", candidate: candidate ?? null, requirements,
    groups: count([...scope.groups.keys()]), consumers: count([...scope.cells.keys()].map(id => `consumer:${id}`)),
    pendingOwners: [...[...scope.groups.values()].filter(group => group.owner.status === "pending").map(group => group.id),
      ...[...scope.cells].filter(([, cell]) => cell.required && cell.owner.status === "pending").map(([id]) => `consumer:${id}`)],
    qualification, pending, failed };
  requireValue(!requireComplete || complete, `Native qualification incomplete: ${pending.length} pending targets, ${failed.length} failed targets; full qualification ${qualification}.`);
  return summary;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2), requireComplete = args.includes("--require-complete");
  const files = args.filter(arg => arg !== "--require-complete");
  requireValue(files.length <= 2 && !files.some(arg => arg.startsWith("--")),
    "Usage: node scripts/native-capability-completion.js [manifest.json] [results.json] [--require-complete]");
  const root = fileURLToPath(new URL("../", import.meta.url));
  const manifest = JSON.parse(readFileSync(files[0] ?? path.join(root, "test/native-capabilities.json"), "utf8"));
  const record = files[1] === undefined ? {} : JSON.parse(readFileSync(files[1], "utf8"));
  process.stdout.write(JSON.stringify(assessNativeCompletion(manifest, record, { root, requireComplete }), null, 2) + "\n");
}
