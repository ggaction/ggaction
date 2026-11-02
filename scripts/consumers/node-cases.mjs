import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { readFile, rename, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

const manifest = JSON.parse(await readFile(new URL("./node-manifest.json", import.meta.url), "utf8"));
const ids = new Set();
assert.ok(Array.isArray(manifest), "Consumer manifest must be an array.");
const files = new Set();
for (const entry of manifest) {
  assert.ok(entry && Object.keys(entry).every(key => ["file", "cases", "isolation"].includes(key)), "Unknown consumer manifest field.");
  assert.match(entry.file, /^[a-z0-9-]+\.mjs$/);
  assert.ok(!files.has(entry.file), "Consumer fixture files must be unique.");
  files.add(entry.file);
  assert.ok(!Object.hasOwn(entry, "isolation") || entry.isolation === "case", "Unknown consumer isolation mode.");
  assert.ok(Array.isArray(entry.cases) && entry.cases.length > 0, "Consumer cases must be nonempty.");
  for (const item of entry.cases) {
    assert.ok(item && Object.keys(item).length === 2 && typeof item.id === "string" && item.id.length > 0 && Number.isSafeInteger(item.statements) && item.statements > 0, "Invalid consumer case manifest.");
    assert.ok(!ids.has(item.id), "Consumer case IDs must be unique.");
    ids.add(item.id);
  }
}

async function loadCases(entry) {
  const { cases } = await import(new URL(entry.file, import.meta.url));
  assert.ok(Array.isArray(cases), "Fixture must export cases.");
  assert.deepEqual(cases.map(item => item.id), entry.cases.map(item => item.id), "Fixture case IDs must exactly match the manifest order.");
  assert.ok(cases.every(item => typeof item.run === "function"), "Fixture cases require a run function.");
  return cases;
}

function failure(id, start, error) {
  return { id, status: "failed", durationMs: performance.now() - start, error: error.stack ?? String(error), pid: process.pid };
}

async function execute(id, run) {
  const start = performance.now();
  try {
    await run();
    return { id, status: "passed", durationMs: performance.now() - start, pid: process.pid };
  } catch (error) { return failure(id, start, error); }
}

async function isolatedCase(moduleIndex, caseIndex, timeoutMs) {
  const id = manifest[moduleIndex].cases[caseIndex].id;
  const start = performance.now();
  const child = spawn(process.execPath, [...process.execArgv, fileURLToPath(import.meta.url), "--case", String(moduleIndex), String(caseIndex)], {
    cwd: process.cwd(), env: process.env, detached: process.platform !== "win32", stdio: ["ignore", "pipe", "pipe", "ipc"]
  });
  let tail = "";
  let record;
  let messages = 0;
  let protocolError;
  let startupError;
  let termination;
  let killTimer;
  function signalTree(signal) {
    if (!child.pid) return;
    try {
      if (process.platform === "win32") {
        const killer = spawn("taskkill", ["/pid", String(child.pid), "/t", "/f"], { stdio: "ignore" });
        killer.on("error", () => child.kill(signal));
      } else process.kill(-child.pid, signal);
    } catch (error) { if (error.code !== "ESRCH") protocolError = error.message; }
  }
  function terminate(reason) {
    if (termination) return;
    termination = reason;
    signalTree("SIGTERM");
    killTimer = setTimeout(() => signalTree("SIGKILL"), 1000);
  }
  const deadline = setTimeout(() => terminate("timeout"), timeoutMs);
  const interrupted = () => terminate("SIGINT");
  const cancelled = () => terminate("SIGTERM");
  process.once("SIGINT", interrupted);
  process.once("SIGTERM", cancelled);
  child.on("message", message => {
    messages += 1;
    if (messages > 1) { protocolError = "Child sent duplicate case receipts."; return; }
    record = message;
  });
  for (const stream of [child.stdout, child.stderr]) stream.on("data", chunk => { tail = (tail + chunk.toString()).slice(-64 * 1024); });
  child.on("error", error => { startupError = error.stack ?? String(error); });
  const result = await new Promise(resolve => child.once("close", (code, signal) => resolve({ code, signal })));
  clearTimeout(deadline);
  clearTimeout(killTimer);
  process.removeListener("SIGINT", interrupted);
  process.removeListener("SIGTERM", cancelled);
  // Reap descendants even if a fixture exits while a detached timer remains alive.
  signalTree("SIGKILL");
  try {
    assert.ok(!startupError && !termination && !protocolError, startupError ?? termination ?? protocolError);
    assert.equal(messages, 1, "Child must send exactly one case receipt, including on exit 0.");
    assert.ok(record && Object.keys(record).every(key => ["id", "status", "durationMs", "error", "pid"].includes(key)), "Invalid child receipt fields.");
    assert.equal(record.id, id, "Child receipt ID mismatch.");
    assert.equal(record.pid, child.pid, "Child receipt PID mismatch.");
    assert.ok(Number.isFinite(record.durationMs) && record.durationMs >= 0, "Invalid child duration.");
    assert.ok(record.status === "passed" || record.status === "failed", "Invalid child status.");
    assert.equal(result.signal, null, "Child terminated by signal.");
    assert.equal(result.code, record.status === "passed" ? 0 : 1, "Child exit and receipt disagree.");
    assert.ok(record.status === "passed" ? !Object.hasOwn(record, "error") : typeof record.error === "string", "Invalid child error.");
  } catch (error) { record = { ...failure(id, start, error), pid: child.pid ?? null }; }
  return { ...record, isolation: "case", parentPid: process.pid, exitCode: result.code, signal: result.signal, ...(termination ? { termination } : {}), ...(tail ? { output: tail } : {}) };
}

if (process.argv[2] === "--case") {
  assert.equal(process.argv.length, 5, "Invalid child arguments.");
  const moduleIndex = Number(process.argv[3]);
  const caseIndex = Number(process.argv[4]);
  assert.ok(Number.isInteger(moduleIndex) && Number.isInteger(caseIndex) && moduleIndex >= 0 && caseIndex >= 0);
  const entry = manifest[moduleIndex];
  assert.equal(entry?.isolation, "case", "Child requires explicit case isolation.");
  const id = entry.cases[caseIndex]?.id;
  assert.ok(id && process.send, "Child requires an exact case and IPC channel.");
  const record = await execute(id, async () => (await loadCases(entry))[caseIndex].run());
  await new Promise((resolve, reject) => process.send(record, error => error ? reject(error) : resolve()));
  process.disconnect();
  process.exitCode = record.status === "passed" ? 0 : 1;
} else {
  assert.equal(process.argv.length, 2, "Unknown consumer runner arguments.");
  const timeoutMs = Number(process.env.GGACTION_CHECK_TIMEOUT_MS ?? 90 * 60 * 1000);
  assert.ok(Number.isFinite(timeoutMs) && timeoutMs > 0, "Consumer deadline must be finite and positive.");
  const records = [];
  let cancelled;
  for (const [moduleIndex, entry] of manifest.entries()) {
    let cases;
    let importError;
    if (!cancelled && entry.isolation !== "case") {
      try { cases = await loadCases(entry); } catch (error) { importError = error; }
    }
    for (const [caseIndex, item] of entry.cases.entries()) {
      let record;
      if (cancelled) record = failure(item.id, performance.now(), new Error(`Consumer cancelled by ${cancelled}.`));
      else if (entry.isolation === "case") record = await isolatedCase(moduleIndex, caseIndex, timeoutMs);
      else record = await execute(item.id, () => { if (importError) throw importError; return cases[caseIndex].run(); });
      if (record.termination === "SIGINT" || record.termination === "SIGTERM") cancelled = record.termination;
      records.push(record);
      await writeFile("node-cases.json.tmp", JSON.stringify(records, null, 2));
      await rename("node-cases.json.tmp", "node-cases.json");
    }
  }
  assert.deepEqual(records.map(record => record.id), manifest.flatMap(entry => entry.cases.map(item => item.id)));
  const failures = records.filter(record => record.status === "failed");
  if (failures.length) {
    console.error(JSON.stringify(failures, null, 2));
    process.exitCode = cancelled === "SIGINT" ? 130 : cancelled === "SIGTERM" ? 143 : 1;
  }
}
