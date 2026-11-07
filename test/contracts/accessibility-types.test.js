import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { compileTypeScript } from "../support/typescript.js";
const root = fileURLToPath(new URL("../../", import.meta.url));
test("accessible item types distinguish immutable native snapshots from legacy tables", async () => {
  const directory = await mkdtemp(path.join(tmpdir(), "ggaction-accessible-items-"));
  try {
    const file = path.join(directory, "consumer.mts");
    const source = (await readFile(path.join(root, "scripts/consumers/fixtures/accessible-items.ts"), "utf8"))
      .replaceAll('"ggaction"', JSON.stringify(path.join(root, "types/index.js")))
      .replaceAll('"ggaction/basic"', JSON.stringify(path.join(root, "types/basic.js")))
      .replaceAll('"ggaction/accessibility"', JSON.stringify(path.join(root, "types/accessibility.js")));
    await writeFile(file, source);
    const result = compileTypeScript(["--noEmit", "--strict", "--exactOptionalPropertyTypes", "--target", "ES2022", "--module", "NodeNext", "--moduleResolution", "NodeNext", file], { cwd: root, encoding: "utf8" });
    assert.equal(result.status, 0, result.stdout + result.stderr);
  } finally { await rm(directory, { recursive: true, force: true }); }
});
