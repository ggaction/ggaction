import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { compileTypeScript } from "../support/typescript.js";

const root = fileURLToPath(new URL("../../", import.meta.url));
test("flow declarations preserve typed keys, method boundaries and immutable results", async () => {
  const directory = await mkdtemp(path.join(tmpdir(), "ggaction-flow-"));
  try {
    const file = path.join(directory, "consumer.mts");
    const source = await readFile(path.join(root, "scripts/consumers/fixtures/flow-types.ts"), "utf8");
    await writeFile(file, source.replaceAll('from "ggaction"', `from ${JSON.stringify(path.join(root, "types/index.js"))}`)
      .replaceAll('from "ggaction/basic"', `from ${JSON.stringify(path.join(root, "types/basic.js"))}`));
    const result = compileTypeScript(["--noEmit", "--strict", "--exactOptionalPropertyTypes", "--target", "ES2022", "--module", "NodeNext", "--moduleResolution", "NodeNext", file]);
    assert.equal(result.status, 0, result.stdout + result.stderr);
  } finally { await rm(directory, { recursive: true, force: true }); }
});
