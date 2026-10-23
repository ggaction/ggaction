import { spawn } from "node:child_process";
import { once } from "node:events";
import assert from "node:assert/strict";
import test from "node:test";
import { mkdtemp, mkdir, readFile, readdir, rm, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createCanvas, loadImage } from "@napi-rs/canvas";
import { chromium } from "playwright";
import { runCheck } from "../../../scripts/run-check.js";
import { collectFailureArtifacts } from "../../../scripts/collect-failure-artifacts.js";
import { recordFailure } from "../../support/failure-artifacts.js";
import { assertSameRenderedPNG } from "../../support/png.js";
import { saveBrowserPageEvidence, saveBrowserContextEvidence } from "../../support/browser.js";

const artifacts = fileURLToPath(new URL("../../../.artifacts/", import.meta.url));
const silence = { write() {} };
async function fixture(t) {
  const root = await mkdtemp(path.join(artifacts, "failure-fixture-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  return root;
}
async function ownEvidence(t, label) {
  const root = path.join(artifacts, "failures");
  for (const name of await readdir(root)) {
    if (!name.startsWith(`${process.pid}-`)) continue;
    const directory = path.join(root, name);
    const record = JSON.parse(await readFile(path.join(directory, "failure.json"), "utf8"));
    if (record.label === label) {
      t.after(() => rm(directory, { recursive: true, force: true }));
      return { directory, record };
    }
  }
  assert.fail(`Missing evidence for ${label}`);
}

test("a failing check retains a bounded log and its exact exit status", async t => {
  const root = await fixture(t);
  const result = await runCheck("intentional-failure", "node", ["-e", 'process.stdout.write("x".repeat(3 * 1024 * 1024), () => process.exit(7))'],
    { outputDirectory: root, stdout: silence, stderr: silence });
  assert.equal(result, 7);
  const record = JSON.parse(await readFile(path.join(root, "intentional-failure.json"), "utf8"));
  assert.equal(record.code, 7);
  assert.equal(record.truncated, true);
  assert.equal(record.retainedBytes, 2 * 1024 * 1024);
  assert.equal((await stat(path.join(root, "intentional-failure.log"))).size, record.retainedBytes);
  await writeFile(path.join(root, "not-directory"), "fixture");
  assert.equal(await runCheck("unwritable", "node", ["-e", "process.exit(9)"], { outputDirectory: path.join(root, "not-directory"), stdout: silence, stderr: silence }), 9);
  assert.equal(await runCheck("missing-command", path.join(root, "missing"), [], { outputDirectory: root, stdout: silence, stderr: silence }), 1);
});

test("check wrappers execute the active npm CLI and retain startup diagnostics", async t => {
  const root = await fixture(t);
  assert.equal(await runCheck("npm-version", "npm", ["--version"], { outputDirectory: root, stdout: silence, stderr: silence }), 0);
  assert.match(await readFile(path.join(root,"npm-version.log"),"utf8"), /\d+\.\d+\.\d+/);
  assert.equal(await runCheck("startup",path.join(root,"missing"),[],{ outputDirectory: root, stdout:silence,stderr:silence }),1);
  assert.match(await readFile(path.join(root,"startup.log"),"utf8"),/Could not start check:.*ENOENT/);
});

test("failure collection excludes large files and old outputs while preserving identities", async t => {
  const root = await fixture(t);
  const failures = path.join(root, ".artifacts/failures");
  await mkdir(failures, { recursive: true });
  const actual = path.join(root, "actual.png");
  await writeFile(actual, "fixture-image");
  const directory = await recordFailure({ label: "case-id", error: new Error("expected red"), files: [actual, path.join(root, "missing")], details: { expected: "red" } }, failures);
  assert.equal(JSON.parse(await readFile(path.join(directory, "failure.json"), "utf8")).files.length, 1);
  await writeFile(path.join(failures, "oversized.png"), Buffer.alloc(11 * 1024 * 1024));
  let collected = await collectFailureArtifacts(root);
  assert.equal(collected.omitted, 1);
  assert.ok(collected.files.some(file => file.file.endsWith("failure.json")));
  assert.ok(collected.files.some(file => file.file.endsWith("actual.png")));
  assert.ok(collected.bytes <= collected.maxBytes);
  const stale = path.join(root, ".artifacts/ci-evidence/stale.txt");
  await writeFile(stale, "stale");
  collected = await collectFailureArtifacts(root);
  await assert.rejects(stat(stale), { code: "ENOENT" });
  assert.equal(collected.omitted, 1);
});

test("intentional pixel mismatch keeps actual, expected, diff, and the original failure", async t => {
  const root = await fixture(t);
  const results = [];
  for (const color of ["red", "blue"]) {
    const canvas = createCanvas(4, 4);
    const context = canvas.getContext("2d");
    context.fillStyle = color;
    context.fillRect(0, 0, 4, 4);
    const output = path.join(root, `${color}.png`);
    await writeFile(output, await canvas.encode("png"));
    results.push({ output, pixelHash: color });
  }
  const label = "intentional-pixel-mismatch";
  await assert.rejects(assertSameRenderedPNG(results[0], results[1], label), { code: "ERR_ASSERTION", message: `${label} pixels differ` });
  const { directory, record } = await ownEvidence(t, label);
  assert.equal(record.files.length, 2);
  assert.equal(record.details.actual, "red");
  assert.equal(record.details.expected, "blue");
  const image = await loadImage(path.join(directory, "diff.png"));
  const context = createCanvas(4, 4).getContext("2d");
  context.drawImage(image, 0, 0);
  assert.deepEqual([...context.getImageData(1, 1, 1, 1).data], [255, 0, 255, 255]);
  await assertSameRenderedPNG(results[0], results[0], "equal-pixels");
});

test("browser failure evidence contains the failed page screenshot and error", async t => {
  const browser = await chromium.launch({ headless: true });
  t.after(() => browser.close());
  const page = await browser.newPage({ viewport: { width: 200, height: 100 } });
  await page.setContent('<h1>Failure fixture</h1><p role="status">wrong result</p>');
  await saveBrowserPageEvidence(page, new Error("Expected complete status"), "intentional-browser-failure");
  const { directory, record } = await ownEvidence(t, "intentional-browser-failure: about:blank");
  assert.equal(record.message, "Expected complete status");
  const image = await loadImage(path.join(directory, "actual.png"));
  assert.equal(image.width, 200);
  assert.equal(image.height, 100);
});

test("the upload payload stays within its total byte budget", async t => {
  const root = await fixture(t);
  const docs = path.join(root, ".artifacts/docs");
  await mkdir(docs, { recursive: true });
  const bytes = Buffer.alloc(8 * 1024 * 1024);
  for (let index = 0; index < 7; index++) await writeFile(path.join(docs, `${index}.png`), bytes);
  const result = await collectFailureArtifacts(root);
  assert.equal(result.files.length, 6);
  assert.equal(result.omitted, 1);
  assert.equal(result.bytes, 48 * 1024 * 1024);
});

test("a hanging check is terminated with a timeout receipt", async t => {
 const directory=await fixture(t);
 const code=await runCheck("hang", "node", ["-e", 'process.on("SIGTERM",()=>{});setInterval(()=>{},1000)'], {
  outputDirectory: directory, stdout: silence, stderr: silence, timeoutMs: 500, killGraceMs: 100
 });
 assert.equal(code,124);
 const record=JSON.parse(await readFile(path.join(directory,"hang.json"),"utf8"));
 assert.equal(record.termination,"timeout");
 assert.ok(record.durationMs < 10000);
});


test("a timed-out check kills its descendant process group", async t => {
  if (process.platform === "win32") return t.skip("Unix process group assertion; Windows uses taskkill /t");
  const directory = await fixture(t);
  const source = `
    const { spawn } = require("node:child_process");
    const fs = require("node:fs");
    const child = spawn(process.execPath, ["-e", 'process.on("SIGTERM",()=>{});setInterval(()=>{},1000)'], {stdio:"inherit"});
    fs.writeFileSync(${JSON.stringify(path.join(directory, "child.pid"))}, String(child.pid));
    process.on("SIGTERM",()=>{});setInterval(()=>{},1000);
  `;
  assert.equal(await runCheck("tree", "node", ["-e", source], {
    outputDirectory: directory, stdout: silence, stderr: silence, timeoutMs: 1000, killGraceMs: 100
  }), 124);
  const pid = Number(await readFile(path.join(directory, "child.pid"), "utf8"));
  // Reaping may lag group termination briefly.
  for (let attempt = 0; attempt < 50; attempt++) {
    try { process.kill(pid, 0); } catch (error) { assert.equal(error.code, "ESRCH"); return; }
    await new Promise(resolve => setTimeout(resolve, 20));
  }
  assert.fail(`Descendant ${pid} survived its qualification deadline`);
});


test("context teardown retains the original assertion and screenshot before closing", async t => {
  const browser = await chromium.launch({ headless: true });
  t.after(() => browser.close());
  const context = await browser.newContext({ viewport: { width: 160, height: 90 } });
  const page = await context.newPage();
  await page.setContent("<h1>Wrong chart</h1>");
  const failure = new Error("Expected three visible data marks");
  await assert.rejects(async () => {
    try { throw failure; }
    catch (error) { await saveBrowserContextEvidence(context, error); throw error; }
    finally { await context.close(); }
  }, error => error === failure);
  assert.equal(page.isClosed(), true);
  const { directory, record } = await ownEvidence(t, "context-assertion: about:blank");
  assert.equal(record.message, failure.message);
  const image = await loadImage(path.join(directory, "actual.png"));
  assert.equal(image.width, 160);
});


for (const [signal, expected] of [["SIGINT", 130], ["SIGTERM", 143]]) {
  test(`check cancellation forwards ${signal} and preserves its receipt`, async t => {
    if (process.platform === "win32") return t.skip("Unix supervisor signals; Windows process trees use taskkill");
    const directory = await fixture(t);
    const pidFile = path.join(directory, "child.pid");
    const childCode = `require("node:fs").writeFileSync(${JSON.stringify(pidFile)}, String(process.pid));process.on("SIGTERM",()=>{});setInterval(()=>{},1000);`;
    const wrapper = spawn(process.execPath, ["--input-type=module", "-e", `
      import { runCheck } from ${JSON.stringify(new URL("../../../scripts/run-check.js", import.meta.url).href)};
      process.exitCode = await runCheck("cancel", "node", ["-e", ${JSON.stringify(childCode)}], {outputDirectory:${JSON.stringify(directory)},killGraceMs:50});
    `], { stdio: "ignore" });
    t.after(() => wrapper.kill("SIGKILL"));
    const closed = once(wrapper, "close");
    let pid;
    for (let attempt = 0; attempt < 100 && !pid; attempt++) {
      pid = Number(await readFile(pidFile, "utf8").catch(() => ""));
      if (!pid) await new Promise(resolve => setTimeout(resolve, 20));
    }
    assert.ok(pid, "The check child must start before cancellation");
    wrapper.kill(signal);
    const [code] = await closed;
    assert.equal(code, expected);
    const receipt = JSON.parse(await readFile(path.join(directory, "cancel.json"), "utf8"));
    assert.equal(receipt.termination, signal);
    assert.throws(() => process.kill(pid, 0), { code: "ESRCH" });
  });
}
