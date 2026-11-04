import assert from "node:assert/strict";
import test from "node:test";
import { execFileSync } from "node:child_process";
import { mkdtempSync, readdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { execFileWithInput } from "../../../scripts/consumers/input.js";

test("fresh consumers receive complete stdin bytes and EOF with their original process limits", () => {
  for (const input of [Buffer.alloc(0), Buffer.from("한글\u0000\n"), Buffer.alloc(42988, 65)]) {
    const output = execFileWithInput(process.execPath, ["--input-type=module", "-e",
      "import fs from 'node:fs';process.stdout.write(fs.readFileSync(0));"], { input, timeout: 30000 });
    assert.deepEqual(output, input);
  }
  const output = execFileWithInput(process.execPath, ["--input-type=module", "-e",
    "import fs from 'node:fs';process.stdout.write(fs.readFileSync(0,'utf8'));"], { input: "한글", encoding: "utf8", timeout: 30000 });
  assert.equal(output, "한글");
});

test("fresh consumer errors retain status and stderr", () => {
  assert.throws(() => execFileWithInput(process.execPath, ["--input-type=module", "-e",
    "process.stderr.write('negative control');process.exit(7);"],
  { input: "original", encoding: "utf8", timeout: 30000 }), error => {
    assert.equal(error.status, 7);
    assert.equal(error.stderr, "negative control");
    return true;
  });
});

test("fresh consumers preserve configured timeouts and remove private input files", () => {
  const directory = mkdtempSync(path.join(tmpdir(), "ggaction-input-test-"));
  try {
    const owner = new URL("../../../scripts/consumers/input.js", import.meta.url).href;
    const script = `import {execFileWithInput} from ${JSON.stringify(owner)};
      try { execFileWithInput(process.execPath, ['-e', 'setTimeout(()=>{},30000)'], {input:'original',timeout:50}); }
      catch (error) { process.stdout.write(error.code); }`;
    const output = execFileSync(process.execPath, ["--input-type=module", "-e", script], {
      env: { ...process.env, TMPDIR: directory, TMP: directory, TEMP: directory }, encoding: "utf8", timeout: 5000
    });
    assert.equal(output, "ETIMEDOUT");
    assert.deepEqual(readdirSync(directory), []);
  } finally { rmSync(directory, { recursive: true, force: true }); }
});
