import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import {
  classifyTestFile,
  collectTestFiles,
  matchesCapabilityEntry,
  TEST_CAPABILITIES
} from "../../scripts/run-tests.js";
import { collectReachableModules } from "../support/module-imports.js";

const testRoot = fileURLToPath(new URL("../", import.meta.url));

function walk(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    const target = path.join(directory, entry.name);
    return entry.isDirectory() ? walk(target) : [target];
  });
}

test("discovers every normal, render, and browser test recursively exactly once", () => {
  const candidates = walk(testRoot).filter(file =>
    file.endsWith(".test.js") ||
    file.endsWith(".render.js") ||
    file.endsWith(".browser.js")
  );
  const discovered = [
    ...collectTestFiles("all", testRoot),
    ...collectTestFiles("render", testRoot),
    ...collectTestFiles("browser", testRoot)
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
    if (
      file.endsWith(".test.js") ||
      file.endsWith(".render.js") ||
      file.endsWith(".browser.js")
    ) continue;
    assert.equal(classifyTestFile(file, testRoot), undefined);
  }
});

test("keeps every test module reachable from a suite or module-script entry", () => {
  const moduleEntries = walk(testRoot).filter(file =>
    file.endsWith(".html") || classifyTestFile(file, testRoot) !== undefined
  );
  const reachable = collectReachableModules(moduleEntries, { boundary: testRoot });
  const modules = walk(testRoot).filter(file => file.endsWith(".js"));

  assert.deepEqual(
    modules.filter(file => !reachable.has(file)).map(file => path.relative(testRoot, file)),
    []
  );
});

test("requires every active gate to expose a complete reviewable slice", () => {
  const gateRoot = path.join(testRoot, "gates");
  const gates = (existsSync(gateRoot)
    ? readdirSync(gateRoot, { withFileTypes: true })
    : [])
    .filter(entry => entry.isDirectory())
    .map(entry => ({ entry, files: walk(path.join(gateRoot, entry.name)) }))
    .filter(gate => gate.files.length > 0);

  for (const { entry: gate, files } of gates) {
    assert.equal(
      files.some(file => file.endsWith(".test.js")),
      true,
      `${gate.name} must contain an executable contract test`
    );
    assert.equal(
      files.some(file => file.endsWith(".render.js")),
      true,
      `${gate.name} must contain an executable visual render entry`
    );
    assert.equal(
      files.some(file => /(?:manifest|primitive\.program)\.js$/.test(file)),
      true,
      `${gate.name} must contain a manifest or primitive program`
    );
  }
});

test("keeps stable tests independent from active gate implementations", () => {
  const stableModules = walk(testRoot).filter(file =>
    file.endsWith(".js") &&
    !file.startsWith(path.join(testRoot, "gates") + path.sep)
  );

  for (const file of stableModules) {
    assert.doesNotMatch(
      readFileSync(file, "utf8"),
      /(?:^|["'])[^"'\n]*\bgates\//m,
      path.relative(testRoot, file)
    );
  }
});

test("selects tests by chart, capability, or relative path", () => {
  const histogram = collectTestFiles("all", testRoot, [
    "chart:cars-histogram"
  ]);
  assert.equal(histogram.length > 0, true);
  assert.equal(histogram.every(file => file.includes(
    `${path.sep}charts${path.sep}cars-histogram${path.sep}`
  )), true);

  const selection = collectTestFiles("all", testRoot, [
    "capability:selection"
  ]);
  assert.equal(selection.length > 0, true);
  assert.equal(selection.every(file =>
    TEST_CAPABILITIES.selection.some(entry =>
      matchesCapabilityEntry(
        path.relative(testRoot, file).split(path.sep).join("/"),
        entry
      )
    )
  ), true);

  const scales = collectTestFiles("all", testRoot, ["unit/actions/scales"]);
  assert.equal(scales.length > 0, true);
  assert.equal(scales.every(file => file.includes(
    `${path.sep}unit${path.sep}actions${path.sep}scales${path.sep}`
  )), true);

  assert.deepEqual(collectTestFiles("all", testRoot, ["scales"]), []);
  assert.deepEqual(
    collectTestFiles("all", testRoot, ["contracts/test-discovery.test.js"]),
    [path.join(testRoot, "contracts", "test-discovery.test.js")]
  );
});

test("maps every named capability entry to an exact file or prefix", () => {
  const discovered = [
    ...collectTestFiles("all", testRoot),
    ...collectTestFiles("render", testRoot),
    ...collectTestFiles("browser", testRoot)
  ];
  assert.deepEqual(Object.keys(TEST_CAPABILITIES), [...Object.keys(TEST_CAPABILITIES)].sort());
  for (const [name, entries] of Object.entries(TEST_CAPABILITIES)) {
    assert.equal(entries.length > 0, true, name);
    for (const entry of entries) {
      assert.equal(["file", "prefix"].includes(entry.type), true, name);
      assert.equal(typeof entry.path, "string", name);
      assert.equal(entry.path.length > 0, true, name);
      assert.equal(
        discovered.some(file => matchesCapabilityEntry(
          path.relative(testRoot, file).split(path.sep).join("/"),
          entry
        )),
        true,
        `${name}: ${entry.type} ${entry.path}`
      );
    }
    assert.equal(
      ["all", "render", "browser"].some(suite =>
        collectTestFiles(suite, testRoot, [`capability:${name}`]).length > 0
      ),
      true,
      name
    );
  }
  assert.throws(
    () => collectTestFiles("all", testRoot, ["capability:unknown"]),
    /Unknown test capability/
  );
});

test("assigns every normal test file to at least one named capability", () => {
  const unowned = collectTestFiles("all", testRoot).filter(file => {
    const relative = path.relative(testRoot, file).split(path.sep).join("/");
    return !Object.values(TEST_CAPABILITIES).some(entries =>
      entries.some(entry => matchesCapabilityEntry(relative, entry))
    );
  });

  assert.deepEqual(unowned.map(file => path.relative(testRoot, file)), []);
});
