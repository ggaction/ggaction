import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import {
  classifyTestFile,
  collectTestFiles,
  matchesCapabilityEntry,
  parseTestShard,
  TEST_CAPABILITIES,
  testRunnerArguments
} from "../../scripts/run-tests.js";
import { collectReachableModules } from "../support/module-imports.js";

const testRoot = fileURLToPath(new URL("../", import.meta.url));
const ciWorkflow = readFileSync(
  new URL("../../.github/workflows/ci.yml", import.meta.url),
  "utf8"
);

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
    ...collectTestFiles("realistic", testRoot),
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

test("separates network-backed corpus sweeps from source coverage", () => {
  const normal = collectTestFiles("all", testRoot);
  const realistic = collectTestFiles("realistic", testRoot);

  assert.equal(realistic.length, 22);
  assert.equal(realistic.every(file => file.endsWith(".test.js")), true);
  assert.equal(realistic.some(file => file.endsWith(
    `${path.sep}dataset-fixtures.test.js`
  )), true);
  assert.equal(normal.some(file => realistic.includes(file)), false);
  assert.deepEqual(
    new Set(collectTestFiles("coverage", testRoot)),
    new Set(normal)
  );
});

test("shards realistic CI after preparing its dataset cache once", () => {
  assert.match(ciWorkflow, /^\s{2}realistic-data:\s*$/m);
  assert.match(ciWorkflow, /^\s{4}needs: realistic-data\s*$/m);
  assert.match(ciWorkflow, /^\s{8}shard: \[1, 2, 3, 4, 5, 6, 7\]\s*$/m);
  assert.match(
    ciWorkflow,
    /npm run test:realistic -- --shard=\$\{\{ matrix\.shard \}\}\/7/
  );
  const coverageJob = ciWorkflow.slice(
    ciWorkflow.indexOf("\n  coverage:"),
    ciWorkflow.indexOf("\n  documentation:")
  );
  assert.doesNotMatch(coverageJob, /dataset|test:realistic/i);
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

test("keeps stable tests independent from implementation roadmap records", () => {
  const implementationRecordPath = ["agent_docs", "impl"].join("/");
  const stableModules = walk(testRoot).filter(file =>
    file.endsWith(".js") &&
    !file.startsWith(path.join(testRoot, "gates") + path.sep)
  );

  for (const file of stableModules) {
    const source = readFileSync(file, "utf8").replaceAll(
      `${implementationRecordPath}/AGENTS.md`,
      ""
    );
    assert.equal(
      source.includes(implementationRecordPath),
      false,
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

test("caps file concurrency without changing file order or coverage policy", () => {
  const files = Object.freeze([
    "/repository/test/unit/example.test.js",
    "/repository/test/contracts/example.test.js"
  ]);

  assert.deepEqual(testRunnerArguments("all", files), [
    "--test",
    "--test-concurrency=4",
    ...files
  ]);
  assert.deepEqual(testRunnerArguments("coverage", files), [
    "--test",
    "--test-concurrency=4",
    "--experimental-test-coverage",
    "--test-coverage-include=src/**/*.js",
    "--test-coverage-lines=94",
    "--test-coverage-branches=89",
    "--test-coverage-functions=98",
    ...files
  ]);
  assert.deepEqual(testRunnerArguments("realistic", files), [
    "--test",
    "--test-concurrency=2",
    ...files
  ]);
  assert.deepEqual(
    testRunnerArguments("realistic", files, { index: 2, total: 7 }),
    [
      "--test",
      "--test-concurrency=2",
      "--test-shard=2/7",
      ...files
    ]
  );
  assert.deepEqual(files, [
    "/repository/test/unit/example.test.js",
    "/repository/test/contracts/example.test.js"
  ]);
});

test("validates realistic shard coordinates before invoking Node", () => {
  assert.deepEqual(parseTestShard("--shard=1/7"), { index: 1, total: 7 });
  assert.deepEqual(parseTestShard("--shard=7/7"), { index: 7, total: 7 });
  for (const value of [
    "--shard",
    "--shard=0/7",
    "--shard=8/7",
    "--shard=1/0",
    "--shard=one/seven"
  ]) {
    assert.throws(() => parseTestShard(value), /Invalid test shard/);
  }
});

test("maps every named capability entry to an exact file or prefix", () => {
  const discovered = [
    ...collectTestFiles("all", testRoot),
    ...collectTestFiles("realistic", testRoot),
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
      ["all", "realistic", "render", "browser"].some(suite =>
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
