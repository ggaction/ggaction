import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, writeFile, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { compileTypeScript } from "../support/typescript.js";

const root = fileURLToPath(new URL("../../", import.meta.url));
test("graph inference declarations expose rule-specific options and preserve the Basic boundary", async () => {
  const directory = await mkdtemp(path.join(tmpdir(), "ggaction-inferred-graph-"));
  try {
    const file = path.join(directory, "consumer.mts");
    const source = await readFile(new URL("../../scripts/consumers/fixtures/graph-inference.ts", import.meta.url), "utf8");
    await writeFile(file, source.replaceAll('"ggaction"', JSON.stringify(path.join(root, "types/index.js")))
      .replaceAll('"ggaction/basic"', JSON.stringify(path.join(root, "types/basic.js"))));
    const result = compileTypeScript(["--noEmit", "--strict", "--exactOptionalPropertyTypes", "--target", "ES2022", "--module", "NodeNext", "--moduleResolution", "NodeNext", file]);
    assert.equal(result.status, 0, result.stdout + result.stderr);
  } finally { await rm(directory, { recursive: true, force: true }); }
});
