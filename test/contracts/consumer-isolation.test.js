import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdtemp, mkdir, readFile, readdir, rm, writeFile, copyFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";

async function fixture(t, entries) {
  const directory = await mkdtemp(path.join(tmpdir(), "ggaction-isolation-"));
  t.after(() => rm(directory, { recursive: true, force: true }));
  await copyFile(new URL("../../scripts/consumers/node-cases.mjs", import.meta.url), path.join(directory, "consumer.mjs"));
  await mkdir(path.join(directory, "node_modules", "consumer-canary"), { recursive: true });
  await writeFile(path.join(directory, "node_modules", "consumer-canary", "package.json"), JSON.stringify({ type: "module", exports: "./index.js" }));
  await writeFile(path.join(directory, "node_modules", "consumer-canary", "index.js"), "export const value = 'same-install';");
  const manifest = entries.map(({ file, isolation, cases }) => ({ file, ...(isolation ? { isolation } : {}), cases: cases.map(({ id }) => ({ id, statements: 1 })) }));
  await writeFile(path.join(directory, "node-manifest.json"), JSON.stringify(manifest));
  for (const entry of entries) await writeFile(path.join(directory, entry.file), entry.source ?? `
    import assert from "node:assert/strict";
    import { writeFile } from "node:fs/promises";
    import { spawn } from "node:child_process";
    import { value } from "consumer-canary";
    export const cases = [${entry.cases.map(({ id, body = "assert.equal(value, 'same-install');" }) => `{id:${JSON.stringify(id)},async run(){${body}}}`).join(",")}];
  `);
  return directory;
}

async function run(directory, { timeoutMs = 5000, cancel = false } = {}) {
  const child = spawn(process.execPath, ["--conditions=consumer-canary", "consumer.mjs"], { cwd: directory, env: { ...process.env, GGACTION_CHECK_TIMEOUT_MS: String(timeoutMs) }, stdio: ["ignore", "pipe", "pipe"] });
  let output = "";
  for (const stream of [child.stdout, child.stderr]) stream.on("data", chunk => { output += chunk; });
  const safety = setTimeout(() => child.kill("SIGKILL"), 15000);
  if (cancel) {
    for (let attempt = 0; attempt < 200; attempt += 1) {
      if (await readFile(path.join(directory, "started")).catch(() => null)) break;
      await new Promise(resolve => setTimeout(resolve, 10));
    }
    child.kill("SIGTERM");
  }
  const result = await new Promise((resolve, reject) => { child.on("error", reject); child.on("close", (code, signal) => resolve({ code, signal })); });
  clearTimeout(safety);
  const records = JSON.parse(await readFile(path.join(directory, "node-cases.json"), "utf8").catch(() => "[]"));
  return { ...result, pid: child.pid, output, records };
}

function checkOrder(result, ids) {
  assert.deepEqual(result.records.map(record => record.id), ids);
  assert.equal(new Set(result.records.map(record => record.id)).size, ids.length);
}

test("default cases share a process while explicit isolated cases retain Node arguments and installed imports", async t => {
  const directory = await fixture(t, [
    { file: "shared.mjs", cases: [{ id: "shared/a", body: "globalThis.sameProcess = process.pid;" }, { id: "shared/b", body: "assert.equal(globalThis.sameProcess, process.pid);" }] },
    { file: "isolated.mjs", isolation: "case", cases: [{ id: "child/a", body: "assert.equal(value, 'same-install'); assert.deepEqual(process.execArgv, ['--conditions=consumer-canary']); assert.equal(globalThis.sameProcess, undefined); globalThis.childOnly = true;" }, { id: "child/b", body: "assert.equal(globalThis.childOnly, undefined); assert.equal(value, 'same-install');" }] },
    { file: "last.mjs", cases: [{ id: "shared/c", body: "assert.equal(globalThis.sameProcess, process.pid);" }] }
  ]);
  const result = await run(directory);
  assert.equal(result.code, 0, result.output);
  checkOrder(result, ["shared/a", "shared/b", "child/a", "child/b", "shared/c"]);
  assert.deepEqual(result.records.filter(record => !record.isolation).map(record => record.pid), [result.pid, result.pid, result.pid]);
  const isolated = result.records.filter(record => record.isolation);
  assert.equal(new Set(isolated.map(record => record.pid)).size, 2);
  for (const record of isolated) { assert.notEqual(record.pid, result.pid); assert.equal(record.parentPid, result.pid); assert.equal(record.exitCode, 0); }
  assert.ok(!(await readdir(directory)).some(name => name.endsWith(".tmp")));
});

test("isolated throw, exit-zero without receipt, and nonzero exit all fail and do not omit later cases", async t => {
  const directory = await fixture(t, [{ file: "cases.mjs", isolation: "case", cases: [
    { id: "throw", body: "throw new Error('original canary failure');" },
    { id: "missing", body: "process.exit(0);" },
    { id: "exit", body: "process.exit(7);" },
    { id: "after" }
  ] }]);
  const result = await run(directory);
  assert.equal(result.code, 1);
  checkOrder(result, ["throw", "missing", "exit", "after"]);
  assert.deepEqual(result.records.map(record => record.status), ["failed", "failed", "failed", "passed"]);
  assert.match(result.records[0].error, /original canary failure/);
  assert.match(result.records[1].error, /exactly one case receipt/);
  assert.equal(result.records[1].exitCode, 0);
  assert.equal(result.records[2].exitCode, 7);
});

test("duplicate and forged child receipts cannot replace the expected ordered case", async t => {
  const directory = await fixture(t, [{ file: "cases.mjs", isolation: "case", cases: [
    { id: "duplicate", body: "process.send({id:'duplicate',status:'passed',durationMs:0,pid:process.pid});" },
    { id: "forged", body: "await new Promise(r => process.send({id:'wrong',status:'passed',durationMs:0,pid:process.pid},r)); process.exit(0);" },
    { id: "after" }
  ] }]);
  const result = await run(directory);
  checkOrder(result, ["duplicate", "forged", "after"]);
  assert.equal(result.code, 1);
  assert.match(result.records[0].error, /duplicate case receipts/);
  assert.match(result.records[1].error, /ID mismatch/);
  assert.equal(result.records[2].status, "passed");
});

test("module case omissions or duplicates fail every declared case in both execution modes", async t => {
  for (const isolation of [undefined, "case"]) {
    const directory = await fixture(t, [
      { file: "missing.mjs", isolation, cases: [{ id: "a" }, { id: "b" }], source: "export const cases=[{id:'a',run(){}}];" },
      { file: "duplicate.mjs", isolation, cases: [{ id: "c" }, { id: "d" }], source: "export const cases=[{id:'c',run(){}},{id:'c',run(){}}];" },
      { file: "last.mjs", cases: [{ id: "after" }] }
    ]);
    const result = await run(directory);
    checkOrder(result, ["a", "b", "c", "d", "after"]);
    assert.equal(result.code, 1);
    assert.deepEqual(result.records.map(record => record.status), ["failed", "failed", "failed", "failed", "passed"]);
  }
});

test("timeouts clean isolated descendants and then run the next case", async t => {
  const directory = await fixture(t, [{ file: "cases.mjs", isolation: "case", cases: [
    { id: "hang", body: "const c=spawn(process.execPath,['-e','setInterval(()=>{},1000)'],{stdio:'ignore'}); await writeFile('descendant',String(c.pid)); setInterval(()=>{},1000); await new Promise(()=>{});" }, { id: "after" }
  ] }]);
  const result = await run(directory, { timeoutMs: 250 });
  assert.equal(result.code, 1);
  checkOrder(result, ["hang", "after"]);
  assert.equal(result.records[0].termination, "timeout");
  assert.equal(result.records[1].status, "passed");
  const pid = Number(await readFile(path.join(directory, "descendant"), "utf8"));
  for (let attempt = 0; attempt < 100; attempt += 1) {
    try { process.kill(pid, 0); } catch (error) { assert.equal(error.code, "ESRCH"); return; }
    await new Promise(resolve => setTimeout(resolve, 10));
  }
  assert.fail("Isolated descendant survived timeout cleanup.");
});

test("parent cancellation cleans the active child and marks remaining cases without running them", async t => {
  const directory = await fixture(t, [{ file: "cases.mjs", isolation: "case", cases: [
    { id: "active", body: "await writeFile('started',String(process.pid)); setInterval(()=>{},1000); await new Promise(()=>{});" },
    { id: "after", body: "throw new Error('must not execute');" }
  ] }]);
  const result = await run(directory, { cancel: true });
  assert.equal(result.code, 143, result.output);
  checkOrder(result, ["active", "after"]);
  assert.equal(result.records[0].termination, "SIGTERM");
  assert.match(result.records[1].error, /cancelled by SIGTERM/);
  const pid = Number(await readFile(path.join(directory, "started"), "utf8"));
  assert.throws(() => process.kill(pid, 0), { code: "ESRCH" });
});

test("manifest isolation metadata and global identities are closed before imports", async t => {
  for (const mutate of [manifest => { manifest[0].isolation = "module"; }, manifest => { manifest[0].extra = true; }, manifest => { manifest[0].cases.push(manifest[0].cases[0]); }]) {
    const directory = await fixture(t, [{ file: "case.mjs", cases: [{ id: "a", body: "await writeFile('unexpected','imported');" }] }]);
    const file = path.join(directory, "node-manifest.json");
    const manifest = JSON.parse(await readFile(file, "utf8"));
    mutate(manifest);
    await writeFile(file, JSON.stringify(manifest));
    const result = await run(directory);
    assert.equal(result.code, 1);
    assert.deepEqual(result.records, []);
    assert.ok(!(await readdir(directory)).includes("unexpected"));
  }
});

test("a successful receipt cannot conceal a nonzero child exit", async t => {
  const directory = await fixture(t, [{ file: "cases.mjs", isolation: "case", cases: [
    { id: "mismatch", body: "process.on('exit',()=>{process.exitCode=9;});" }, { id: "after" }
  ] }]);
  const result = await run(directory);
  checkOrder(result, ["mismatch", "after"]);
  assert.equal(result.code, 1);
  assert.equal(result.records[0].exitCode, 9);
  assert.match(result.records[0].error, /exit and receipt disagree/);
  assert.equal(result.records[1].status, "passed");
});

test("successful cases leave no unreferenced descendants in their process group", async t => {
  const directory = await fixture(t, [{ file: "cases.mjs", isolation: "case", cases: [
    { id: "success", body: "const c=spawn(process.execPath,['-e','setInterval(()=>{},1000)'],{stdio:'ignore'}); c.unref(); await writeFile('descendant',String(c.pid));" }, { id: "after" }
  ] }]);
  const result = await run(directory);
  assert.equal(result.code, 0, result.output);
  const pid = Number(await readFile(path.join(directory, "descendant"), "utf8"));
  for (let attempt = 0; attempt < 100; attempt += 1) {
    try { process.kill(pid, 0); } catch (error) { assert.equal(error.code, "ESRCH"); return; }
    await new Promise(resolve => setTimeout(resolve, 10));
  }
  assert.fail("Isolated descendant survived successful case cleanup.");
});
