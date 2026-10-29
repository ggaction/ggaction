import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { readFileSync, realpathSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const evidenceHash = bytes => createHash("sha256").update(bytes).digest("hex");
const digest = value => typeof value === "string" && /^[a-f0-9]{64}$/.test(value);
const commitId = value => typeof value === "string" && /^[a-f0-9]{40}$/.test(value);
const requireValue = (condition, message) => { if (!condition) throw new Error(message); };

// Non-repository callers may still use run-check, but cannot claim a qualified commit.
export function captureRevision(root) {
  try {
    const git = args => execFileSync("git", args, { cwd: root, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();
    const status = git(["status", "--porcelain=v1", "--untracked-files=all"]);
    return { available: true, commit: git(["rev-parse", "HEAD"]), clean: status === "", statusSha256: evidenceHash(status) };
  } catch {
    return { available: false, clean: false };
  }
}

export function evidenceFile(root, reference, pathKey = "path", hashKey = "sha256") {
  const file = reference?.[pathKey], hash = reference?.[hashKey];
  requireValue(typeof file === "string" && file.length > 0 && !path.isAbsolute(file) &&
    !file.includes("\\") && !file.includes(":") && file.split("/").every(part => part && part !== ".." && part !== "."), "Evidence requires a repository-relative path.");
  requireValue(digest(hash), `Missing or invalid evidence hash: ${file}`);
  const resolved = realpathSync(path.join(root, file)), base = realpathSync(root);
  requireValue(resolved.startsWith(base + path.sep) && statSync(resolved).isFile(), `Evidence must be a file inside the repository: ${file}`);
  const bytes = readFileSync(resolved);
  requireValue(evidenceHash(bytes) === hash, `Evidence hash mismatch: ${file}`);
  return bytes;
}

// Unlike generated logs/artifacts, declared source inputs must also belong to the
// commit whose clean execution receipt is being qualified.
export function evidenceSourceFile(root, commit, reference) {
  const bytes = evidenceFile(root, reference);
  requireValue(commitId(commit), "Source evidence requires an exact commit.");
  const committed = execFileSync("git", ["show", `${commit}:${reference.path}`], {
    cwd: root, stdio: ["ignore", "pipe", "pipe"]
  });
  requireValue(evidenceHash(committed) === reference.sha256, `Source evidence differs from execution commit: ${reference.path}`);
  return bytes;
}

export function validateExecutionPlan(plan) {
  requireValue(plan?.schemaVersion === 1 && Array.isArray(plan.tasks) && plan.tasks.length > 0, "Execution plan requires tasks.");
  const tasks = new Map();
  for (const task of plan.tasks) {
    requireValue(typeof task.id === "string" && task.id && !tasks.has(task.id), "Task IDs must be unique.");
    requireValue(Array.isArray(task.dependsOn) && new Set(task.dependsOn).size === task.dependsOn.length, `Invalid dependencies: ${task.id}`);
    tasks.set(task.id, task);
  }
  const visiting = new Set(), ancestors = new Map();
  function visit(id) {
    requireValue(tasks.has(id), `Unknown prerequisite: ${id}`);
    requireValue(!visiting.has(id), `Dependency cycle: ${id}`);
    if (ancestors.has(id)) return ancestors.get(id);
    visiting.add(id);
    const result = new Set();
    for (const dependency of tasks.get(id).dependsOn) {
      result.add(dependency);
      for (const ancestor of visit(dependency)) result.add(ancestor);
    }
    visiting.delete(id);
    ancestors.set(id, result);
    return result;
  }
  for (const id of tasks.keys()) visit(id);
  const final = visit(plan.finalTask);
  for (const id of tasks.keys()) requireValue(id === plan.finalTask || final.has(id), `Task does not reach final qualification: ${id}`);
  return tasks;
}

export function validateCompletion(record, { root, task } = {}) {
  requireValue(record?.schemaVersion === 1 && record.status === "complete", "Completion requires explicit complete status; not-run is not passed.");
  requireValue(task && task.id === record.taskId, "Completion task must match the execution plan.");
  requireValue(commitId(record.implementationCommit), "Completion requires an exact implementation commit.");
  // Resolve the actual object too: a syntactically valid invented hash is insufficient.
  const resolved = execFileSync("git", ["rev-parse", "--verify", `${record.implementationCommit}^{commit}`], { cwd: root, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();
  requireValue(resolved === record.implementationCommit, "Implementation commit is not available.");
  requireValue(Array.isArray(record.openObligations) && record.openObligations.length === 0, "Open obligations block completion.");
  requireValue(Array.isArray(task.requiredChecks) && task.requiredChecks.length > 0 && new Set(task.requiredChecks).size === task.requiredChecks.length, "Task must declare unique required checks.");
  requireValue(Array.isArray(record.commands) && record.commands.length > 0, "Completion requires executed commands.");
  const labels = new Set();
  let discovered = false;
  for (const command of record.commands) {
    requireValue(Array.isArray(command.command) && command.command.length > 0 && command.command.every(value => typeof value === "string") && command.exitCode === 0, "Invalid or failed command.");
    const receipt = JSON.parse(evidenceFile(root, command, "receiptPath", "receiptSha256"));
    evidenceFile(root, command, "logPath", "logSha256");
    requireValue(typeof receipt.label === "string" && receipt.label && !labels.has(receipt.label), "Execution labels must be unique.");
    labels.add(receipt.label);
    requireValue(receipt.code === 0 && !receipt.termination && !receipt.startupError &&
      receipt.logSha256 === command.logSha256 && JSON.stringify([receipt.command, ...receipt.args]) === JSON.stringify(command.command), `Execution receipt disagrees with command: ${receipt.label}`);
    for (const source of [receipt.source, receipt.sourceAfter]) {
      requireValue(source?.available === true && source.clean === true && source.commit === record.implementationCommit, `Stale or dirty execution evidence: ${receipt.label}`);
    }
    requireValue(Number.isFinite(receipt.durationMs) && receipt.durationMs >= 0 &&
      Number.isFinite(Date.parse(receipt.startedAt)) && Number.isFinite(Date.parse(receipt.finishedAt)) &&
      Date.parse(receipt.finishedAt) >= Date.parse(receipt.startedAt), "Missing execution timestamps.");
    if (receipt.discovery !== undefined) {
      const files = receipt.discovery.files;
      requireValue(Array.isArray(files) && files.length > 0 && new Set(files).size === files.length &&
        files.every(file => typeof file === "string" && file.startsWith("test/") && /\.(?:test|browser|render)\.js$/.test(file)), "Zero or invalid discovered tests.");
      // The receipt was generated by the canonical runner before spawning Node.
      requireValue(receipt.args.some(arg => /(?:^|[\\/])run-tests\.js$/.test(arg)) === false &&
        receipt.args.includes("--test") && files.every(file => receipt.args.some(arg => arg.replaceAll("\\", "/").endsWith(`/${file}`) || arg === file)), "Discovered files must be actual Node test arguments.");
      discovered = true;
    }
  }
  requireValue(discovered, "Completion requires non-empty test discovery evidence.");
  for (const label of task.requiredChecks) requireValue(labels.has(label), `Missing required check: ${label}`);
  requireValue(Array.isArray(record.artifacts) && record.artifacts.length > 0, "Completion requires artifacts.");
  for (const artifact of record.artifacts) evidenceFile(root, artifact);
  requireValue(Array.isArray(record.consumerCells), "Consumer applicability must be explicit.");
  for (const cell of record.consumerCells) {
    requireValue(cell.status === "passed" || (cell.status === "not-applicable" && typeof cell.reason === "string" && cell.reason.trim()), "Unresolved consumer cell.");
    if (cell.status === "passed") evidenceFile(root, cell.evidence);
  }
  requireValue(Array.isArray(record.gateEvidence), "Gate applicability must be explicit.");
  for (const gate of task.requiredGates ?? []) {
    const approval = record.gateEvidence.find(entry => entry.id === gate);
    requireValue(approval?.status === "approved", `Unapproved gate: ${gate}`);
    evidenceFile(root, approval.evidence);
  }
  return { taskId: record.taskId, status: "complete", checks: labels.size };
}

export function validateProgress(plan, records, { root } = {}) {
  const tasks = validateExecutionPlan(plan), completed = new Set();
  for (const record of records) {
    requireValue(tasks.has(record.taskId) && !completed.has(record.taskId), "Unknown or duplicate completion task.");
    validateCompletion(record, { root, task: tasks.get(record.taskId) });
    completed.add(record.taskId);
  }
  for (const id of completed) for (const dependency of tasks.get(id).dependsOn) {
    requireValue(completed.has(dependency), `Incomplete prerequisite: ${id} requires ${dependency}`);
  }
  return { complete: [...completed], ready: [...tasks.values()].filter(task => !completed.has(task.id) && task.dependsOn.every(id => completed.has(id))).map(task => task.id) };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const [planPath, ...recordPaths] = process.argv.slice(2);
  if (!planPath) throw new Error("Usage: node scripts/verification-evidence.js <execution-plan.json> [completion.json ...]");
  const root = fileURLToPath(new URL("../", import.meta.url));
  const read = file => JSON.parse(readFileSync(file, "utf8"));
  process.stdout.write(JSON.stringify(validateProgress(read(planPath), recordPaths.map(read), { root }), null, 2) + "\n");
}
