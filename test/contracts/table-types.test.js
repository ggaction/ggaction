import assert from "node:assert/strict";
import { mkdtemp, writeFile, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { compileTypeScript } from "../support/typescript.js";
const root = fileURLToPath(new URL("../../", import.meta.url));
test("Table types preserve typed columns, shared or independent sparkline domains and Full-only editing", async () => {
  const directory = await mkdtemp(path.join(tmpdir(), "ggaction-table-types-"));
  try {
    const file = path.join(directory, "table.mts");
    const source = (await readFile(path.join(root, "scripts/consumers/fixtures/table.ts"), "utf8"))
      .replaceAll('"ggaction"', JSON.stringify(path.join(root, "types/index.js")))
      .replaceAll('"ggaction/basic"', JSON.stringify(path.join(root, "types/basic.js")));
    await writeFile(file, source);
    const result = compileTypeScript(["--noEmit", "--strict", "--exactOptionalPropertyTypes", "--target", "ES2022", "--module", "NodeNext", "--moduleResolution", "NodeNext", file], { cwd: root, encoding: "utf8" });
    assert.equal(result.status, 0, result.stdout + result.stderr);
  } finally { await rm(directory, { recursive: true, force: true }); }
});
