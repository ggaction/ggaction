import assert from "node:assert/strict";
import { mkdtemp, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { compileTypeScript } from "../support/typescript.js";

test("the compiler harness accepts a used negative assertion and rejects a stale one", async t => {
  const directory = await mkdtemp(path.join(tmpdir(), "ggaction-compiler-control-"));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const file = path.join(directory, "negative.mts");
  const args = ["--noEmit", "--strict", "--skipLibCheck", "--target", "ES2022", file];
  await writeFile(file, '// @ts-expect-error numeric values cannot be strings\nconst value: number = "wrong";\n');
  assert.equal(compileTypeScript(args).status, 0);
  await writeFile(file, '// @ts-expect-error this must now be diagnosed as unused\nconst value: number = 1;\n');
  const result = compileTypeScript(args);
  assert.notEqual(result.status, 0);
  assert.match(result.stdout, /Unused '@ts-expect-error'/);
});
