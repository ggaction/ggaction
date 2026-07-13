import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { chart, render } from "../../src/index.js";

test("exports the public module boundaries", () => {
  assert.equal(typeof chart, "function");
  assert.equal(typeof render, "function");
});

test("maps every public entry point to a declaration file", () => {
  const packageJson = JSON.parse(readFileSync(
    new URL("../../package.json", import.meta.url),
    "utf8"
  ));
  assert.equal(packageJson.types, "./types/index.d.ts");
  assert.deepEqual(
    Object.values(packageJson.exports).map(entry => entry.types),
    [
      "./types/index.d.ts",
      "./types/extension.d.ts",
      "./types/png.d.ts"
    ]
  );
});
