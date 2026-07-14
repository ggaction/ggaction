import assert from "node:assert/strict";
import { readdirSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import {
  classifyTestFile,
  collectTestFiles
} from "../../scripts/run-tests.js";

const testRoot = fileURLToPath(new URL("../", import.meta.url));

function walk(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    const target = path.join(directory, entry.name);
    return entry.isDirectory() ? walk(target) : [target];
  });
}

test("discovers every normal and render test recursively exactly once", () => {
  const candidates = walk(testRoot).filter(file =>
    file.endsWith(".test.js") || file.endsWith(".render.js")
  );
  const discovered = [
    ...collectTestFiles("all", testRoot),
    ...collectTestFiles("render", testRoot)
  ];

  assert.deepEqual(new Set(discovered), new Set(candidates));
  assert.equal(new Set(discovered).size, discovered.length);
  for (const file of candidates) {
    assert.notEqual(
      classifyTestFile(file, testRoot),
      undefined,
      path.relative(testRoot, file)
    );
  }
});

test("does not discover programs or support modules as tests", () => {
  for (const file of walk(testRoot)) {
    if (file.endsWith(".test.js") || file.endsWith(".render.js")) continue;
    assert.equal(classifyTestFile(file, testRoot), undefined);
  }
});
