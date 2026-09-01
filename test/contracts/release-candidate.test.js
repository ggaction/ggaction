import assert from "node:assert/strict";
import { copyFile, mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { pathToFileURL } from "node:url";

import { validateReleaseIdentity } from "../../scripts/release-candidate.js";

test("requires one exact package, lock, tag, and workflow-ref identity", () => {
  assert.deepEqual(validateReleaseIdentity({
    tag: "v0.0.2",
    ref: "refs/tags/v0.0.2",
    packageVersion: "0.0.2",
    lockVersion: "0.0.2"
  }), { tag: "v0.0.2", version: "0.0.2" });
});

test("rejects mismatched release versions and non-tag workflow refs", () => {
  assert.throws(() => validateReleaseIdentity({
    tag: "v0.0.1",
    ref: "refs/tags/v0.0.1",
    packageVersion: "0.0.2",
    lockVersion: "0.0.2"
  }), /must be "v0.0.2"/);
  assert.throws(() => validateReleaseIdentity({
    tag: "v0.0.2",
    ref: "refs/heads/main",
    packageVersion: "0.0.2",
    lockVersion: "0.0.2"
  }), /must run from tag ref/);
  assert.throws(() => validateReleaseIdentity({
    tag: "v0.0.2",
    ref: "refs/tags/v0.0.2",
    packageVersion: "0.0.2",
    lockVersion: "0.0.1"
  }), /package-lock version/);
});

test("loads release verification without package build dependencies", async t => {
  const directory = await mkdtemp(path.join(tmpdir(), "ggaction-release-verifier-"));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const scripts = path.join(directory, "scripts");
  await mkdir(scripts);
  await Promise.all([
    copyFile(
      new URL("../../scripts/release-candidate.js", import.meta.url),
      path.join(scripts, "release-candidate.js")
    ),
    copyFile(
      new URL("../../scripts/release-notes.js", import.meta.url),
      path.join(scripts, "release-notes.js")
    ),
    writeFile(path.join(directory, "package.json"), '{"type":"module"}\n')
  ]);

  const isolated = await import(pathToFileURL(
    path.join(scripts, "release-candidate.js")
  ));
  assert.equal(typeof isolated.verifyReleaseCandidate, "function");
  assert.deepEqual(isolated.validateReleaseIdentity({
    tag: "v0.0.11",
    ref: "refs/tags/v0.0.11",
    packageVersion: "0.0.11",
    lockVersion: "0.0.11"
  }), { tag: "v0.0.11", version: "0.0.11" });
});
