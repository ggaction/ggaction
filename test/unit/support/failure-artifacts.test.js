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
import { saveBrowserPageEvidence } from "../../support/browser.js";

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
