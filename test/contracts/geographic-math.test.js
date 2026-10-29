import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync, readdirSync } from "node:fs";
import { createHash } from "node:crypto";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { PROJECTION_DESCRIPTORS } from "../../src/grammar/geo/projectionOptions.js";

const root = fileURLToPath(new URL("../../", import.meta.url));
const read = relative => readFileSync(path.join(root, relative), "utf8");
const hash = value => createHash("sha256").update(value).digest("hex");
const manifest = JSON.parse(read("licenses/geometry-math.json"));
const resolveDependency = createRequire(import.meta.resolve("geographic-math"));
function sourceFiles(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap(entry => entry.isDirectory() ? sourceFiles(path.join(directory, entry.name)) : [path.join(directory, entry.name)]);
}

test("geographic mathematics has an exact alias, verified source signatures and distributed license notices", () => {
  const pkg = JSON.parse(read("package.json")), lock = JSON.parse(read("package-lock.json"));
  assert.equal(pkg.dependencies[manifest.directDependency], manifest.directVersion);
  assert.equal(lock.packages[""].dependencies[manifest.directDependency], manifest.directVersion);
  assert.deepEqual(manifest.projectionSources.map(entry => entry.type), PROJECTION_DESCRIPTORS.map(entry => entry.type));
  for (const dependency of manifest.packages) {
    const stored = lock.packages[`node_modules/${dependency.installKey}`];
    assert.equal(stored.version, dependency.version);
    assert.equal(stored.integrity, dependency.integrity);
    assert.equal(stored.resolved, dependency.tarball);
    assert.equal(stored.license, dependency.license);
    const entry = dependency.installKey === manifest.directDependency ? fileURLToPath(import.meta.resolve("geographic-math")) : resolveDependency.resolve(dependency.installKey);
    const directory = path.dirname(path.dirname(entry));
    const installed = JSON.parse(readFileSync(path.join(directory, "package.json"), "utf8"));
    assert.equal(installed.name, dependency.name);
    assert.equal(installed.version, dependency.version);
    const license = readFileSync(path.join(directory, "LICENSE"), "utf8");
    assert.equal(hash(license), dependency.licenseSha256);
    assert.ok(read("THIRD_PARTY_NOTICES").includes(license));
    const sources = sourceFiles(path.join(directory, "src")).filter(file => file.endsWith(".js")).sort().map(file => ({ file: path.relative(directory, file), sha256: hash(readFileSync(file)) }));
    assert.deepEqual(sources, dependency.sources);
    assert.equal(hash(sources.map(entry => `${entry.file}:${entry.sha256}`).join("\n")), dependency.algorithmSignature);
  }
  assert.ok(pkg.files.includes("THIRD_PARTY_NOTICES"));
  assert.ok(pkg.files.includes("licenses/"));
});
