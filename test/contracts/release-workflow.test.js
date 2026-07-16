import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const workflow = readFileSync(new URL("../../.github/workflows/release.yml", import.meta.url), "utf8");

test("keeps publishing manual, tag-bound, protected, and non-concurrent", () => {
  assert.match(workflow, /^\s{2}workflow_dispatch:/m);
  assert.doesNotMatch(workflow, /^\s{2}(push|release):/m);
  assert.match(workflow, /test "\$GITHUB_REF" = "refs\/tags\/\$RELEASE_TAG"/);
  assert.match(workflow, /environment:\s*\n\s+name: npm-release/);
  assert.match(workflow, /group: npm-release/);
  assert.match(workflow, /cancel-in-progress: false/);
});

test("uses current trusted-publishing requirements without an npm secret", () => {
  assert.match(workflow, /node-version: 24/);
  assert.match(workflow, /npm@\^11\.5\.1/);
  assert.match(workflow, /id-token: write/);
  assert.match(workflow, /package-manager-cache: false/);
  assert.doesNotMatch(workflow, /NPM_TOKEN|NODE_AUTH_TOKEN|secrets\.[A-Za-z_]*NPM/);
});

test("qualifies, retains, verifies, and publishes one exact artifact", () => {
  for (const command of [
    "npm test",
    "npm run test:coverage",
    "npm run test:package",
    "npm run test:browser",
    "npm run test:render",
    "npm run test:docs:browser"
  ]) assert.match(workflow, new RegExp(command.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  assert.match(workflow, /node scripts\/release-candidate\.js "\$RELEASE_TAG"/);
  assert.match(workflow, /actions\/upload-artifact@v4/);
  assert.match(workflow, /release-candidate\.js --verify/);
  assert.match(workflow, /npm publish "\$TARBALL" --access public --tag latest/);
  assert.ok(workflow.indexOf("npm publish") < workflow.indexOf("gh release create"));
});
