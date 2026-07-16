import assert from "node:assert/strict";
import test from "node:test";

import { validateReleaseIdentity } from "../../scripts/release-candidate.js";

test("requires one exact package, lock, tag, and workflow-ref identity", () => {
  assert.deepEqual(validateReleaseIdentity({
    tag: "v0.0.1",
    ref: "refs/tags/v0.0.1",
    packageVersion: "0.0.1",
    lockVersion: "0.0.1"
  }), { tag: "v0.0.1", version: "0.0.1" });
});

test("rejects mismatched release versions and non-tag workflow refs", () => {
  assert.throws(() => validateReleaseIdentity({
    tag: "v0.0.2",
    ref: "refs/tags/v0.0.2",
    packageVersion: "0.0.1",
    lockVersion: "0.0.1"
  }), /must be "v0.0.1"/);
  assert.throws(() => validateReleaseIdentity({
    tag: "v0.0.1",
    ref: "refs/heads/main",
    packageVersion: "0.0.1",
    lockVersion: "0.0.1"
  }), /must run from tag ref/);
  assert.throws(() => validateReleaseIdentity({
    tag: "v0.0.1",
    ref: "refs/tags/v0.0.1",
    packageVersion: "0.0.1",
    lockVersion: "0.0.2"
  }), /package-lock version/);
});
