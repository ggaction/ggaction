import assert from "node:assert/strict";
import test from "node:test";

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
