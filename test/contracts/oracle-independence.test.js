import assert from "node:assert/strict";
import { readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { collectReachableModules } from "../support/module-imports.js";

test("independent expected-value modules have no transitive production imports", () => {
  const root = fileURLToPath(new URL("../../", import.meta.url));
  const directory = path.join(root, "test/oracles");
  const entries = readdirSync(directory).filter(file => file.endsWith(".js")).map(file => path.join(directory, file));
  const imports = collectReachableModules(entries);
  assert.ok(entries.length > 0);
  assert.deepEqual([...imports].filter(file => file.startsWith(path.join(root, "src") + path.sep)), []);
});
