import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const repositoryRoot = fileURLToPath(new URL("../../", import.meta.url));
const configPath = path.join(repositoryRoot, "context7.json");
const workflowPath = path.join(
  repositoryRoot,
  ".github",
  "workflows",
  "context7-refresh.yml"
);
const packageMetadata = JSON.parse(readFileSync(
  path.join(repositoryRoot, "package.json"),
  "utf8"
));

const allowedKeys = new Set([
  "$schema",
  "projectTitle",
  "description",
  "branch",
  "folders",
  "excludeFolders",
  "excludeFiles",
  "rules",
  "disallow",
  "redirect",
  "previousVersions",
  "url",
  "public_key"
]);

function assertBoundedString(value, name, minimum, maximum) {
  assert.equal(typeof value, "string", `${name} must be a string`);
  assert.ok(value.length >= minimum, `${name} must have at least ${minimum} characters`);
  assert.ok(value.length <= maximum, `${name} must have at most ${maximum} characters`);
}

function assertUniqueStringArray(value, name, maximumItems, maximumLength = 255) {
  assert.ok(Array.isArray(value), `${name} must be an array`);
  assert.ok(value.length <= maximumItems, `${name} must have at most ${maximumItems} entries`);
  assert.equal(new Set(value).size, value.length, `${name} entries must be unique`);
  for (const [index, entry] of value.entries()) {
    assertBoundedString(entry, `${name}[${index}]`, 1, maximumLength);
  }
}

function assertVersionEntry(entry, index) {
  if (typeof entry === "string") {
    assertBoundedString(entry, `previousVersions[${index}]`, 1, 50);
    return;
  }
  assert.ok(entry && typeof entry === "object" && !Array.isArray(entry));
  assert.deepEqual(
    Object.keys(entry).sort(),
    entry.tag === undefined ? ["branch"] : ["tag"],
    `previousVersions[${index}] must contain exactly one tag or branch`
  );
  const [key] = Object.keys(entry);
  assertBoundedString(entry[key], `previousVersions[${index}].${key}`, 1, 50);
}

test("Context7 configuration matches the supported repository schema", () => {
  const config = JSON.parse(readFileSync(configPath, "utf8"));

  assert.deepEqual(
    Object.keys(config).filter(key => !allowedKeys.has(key)),
    [],
    "context7.json contains unsupported fields"
  );
  assert.equal(config.$schema, "https://context7.com/schema/context7.json");
  assertBoundedString(config.projectTitle, "projectTitle", 1, 100);
  assertBoundedString(config.description, "description", 10, 200);
  assertBoundedString(config.branch, "branch", 1, 100);
  assertUniqueStringArray(config.folders, "folders", 50);
  assertUniqueStringArray(config.excludeFolders, "excludeFolders", 50);
  assertUniqueStringArray(config.excludeFiles, "excludeFiles", 100);
  assertUniqueStringArray(config.rules, "rules", 50);
  for (const [index, filename] of config.excludeFiles.entries()) {
    assert.doesNotMatch(filename, /[/\\]/, `excludeFiles[${index}] must be a filename`);
  }
  assert.ok(Array.isArray(config.previousVersions));
  assert.ok(config.previousVersions.length <= 20);
  config.previousVersions.forEach(assertVersionEntry);

  if (config.disallow !== undefined) assert.equal(typeof config.disallow, "boolean");
  if (config.redirect !== undefined) {
    assertBoundedString(config.redirect, "redirect", 1, 500);
  }
  assert.equal(
    config.url === undefined,
    config.public_key === undefined,
    "ownership url and public_key must be added together"
  );
  if (config.url !== undefined) {
    assert.doesNotThrow(() => new URL(config.url));
    assertBoundedString(config.public_key, "public_key", 1, 100);
  }
});

test("Context7 indexes canonical public documentation without duplicate bundles", () => {
  const config = JSON.parse(readFileSync(configPath, "utf8"));

  assert.deepEqual(config.folders, ["docs"]);
  for (const folder of config.folders) {
    assert.ok(existsSync(path.join(repositoryRoot, folder)), `${folder} must exist`);
  }
  assert.ok(config.excludeFolders.includes("docs/_sources"));
  assert.ok(config.excludeFolders.includes("docs/assets"));
  assert.ok(config.excludeFolders.includes("docs/README.md"));
  for (const filename of [
    "AGENTS.md",
    "CHANGELOG.md",
    "CODE_OF_CONDUCT.md",
    "CONTRIBUTING.md",
    "llms-full.txt",
    "llms.txt"
  ]) {
    assert.ok(config.excludeFiles.includes(filename), `${filename} must be excluded`);
  }
  assert.ok(!config.excludeFiles.includes("README.md"), "the public root README must remain indexed");
  assert.ok(config.rules.length >= 5, "coding agents need the core authoring rules");

  const releaseTag = `v${packageMetadata.version}`;
  assert.ok(
    config.previousVersions.some(entry => entry === releaseTag || entry.tag === releaseTag),
    `${releaseTag} must be available as version-pinned documentation`
  );
});

test("Context7 refreshes only on releases or an explicit manual dispatch", () => {
  const workflow = readFileSync(workflowPath, "utf8");

  assert.match(workflow, /^\s{2}workflow_dispatch:\s*$/m);
  assert.match(workflow, /^\s{2}release:\s*$/m);
  assert.match(workflow, /^\s{4}types: \[published\]\s*$/m);
  assert.doesNotMatch(workflow, /^\s{2}push:\s*$/m);
  assert.match(workflow, /secrets\.CONTEXT7_API_KEY/);
  assert.match(workflow, /https:\/\/context7\.com\/api\/v1\/refresh/);
  assert.match(workflow, /--fail-with-body --silent --show-error/);
  assert.match(workflow, /"libraryName":"\/\$\{\{ github\.repository \}\}"/);
});
