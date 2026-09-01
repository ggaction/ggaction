import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const workflow = readFileSync(new URL("../../.github/workflows/release.yml", import.meta.url), "utf8");

test("keeps publishing manual, immutable-tag-bound, protected, and non-concurrent", () => {
  assert.match(workflow, /^\s{2}workflow_dispatch:/m);
  assert.doesNotMatch(workflow, /^\s{2}(push|release):/m);
  assert.match(workflow, /ref: \$\{\{ inputs\.tag \}\}/);
  assert.match(workflow, /test "\$GITHUB_REF" = "refs\/tags\/\$RELEASE_TAG"/);
  assert.match(workflow, /git cat-file -t "refs\/tags\/\$RELEASE_TAG"/);
  assert.match(workflow, /git rev-parse "refs\/tags\/\$RELEASE_TAG\^\{commit\}"/);
  assert.match(workflow, /environment:\s*\n\s+name: npm-release/);
  assert.match(workflow, /group: npm-release/);
  assert.match(workflow, /cancel-in-progress: false/);
});

test("uses current trusted-publishing requirements without an npm secret", () => {
  assert.match(workflow, /node-version: 20/);
  assert.match(workflow, /node-version: 22/);
  assert.match(workflow, /node-version: 24/);
  assert.match(workflow, /npm@\^11\.5\.1/);
  assert.match(workflow, /id-token: write/);
  assert.match(workflow, /package-manager-cache: false/);
  assert.doesNotMatch(workflow, /NPM_TOKEN|NODE_AUTH_TOKEN|secrets\.[A-Za-z_]*NPM/);
});

test("keeps generated release documentation strict across native PNG platforms", () => {
  assert.match(
    workflow,
    /npm run docs:generate[\s\S]*npm run test:docs[\s\S]*git diff --exit-code/
  );
  assert.match(workflow, /knowledge\/action-cards\.json/);
  assert.match(workflow, /:\(exclude\)docs\/assets\/images\/\*\.png/);
  assert.doesNotMatch(workflow, /:\(exclude\)[^\n]*(manifest|\.json|\.md|\.txt)/);
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
  assert.doesNotMatch(workflow, /EFFECTIVE_RELEASE_REF|GITHUB_REF="\$EFFECTIVE/);
  assert.match(workflow, /actions\/upload-artifact@v7/);
  assert.match(workflow, /actions\/download-artifact@v8/);
  assert.match(workflow, /release-candidate\.js --verify/);
  assert.match(workflow, /npm publish "\$TARBALL" --access public --tag latest/);
  assert.ok(
    workflow.indexOf("npx playwright install --with-deps chromium") <
      workflow.indexOf("npm run test:package")
  );
  assert.ok(workflow.indexOf("npm publish") < workflow.indexOf("gh release create"));
});

test("deploys Pages only after the protected release publish", () => {
  assert.match(workflow, /pages-build:\s*\n\s+needs: publish/);
  assert.match(workflow, /pages-deploy:\s*\n\s+needs: pages-build/);
  assert.match(workflow, /ref: \$\{\{ inputs\.tag \}\}/);
  assert.match(workflow, /refs\/tags\/\$RELEASE_TAG\^\{commit\}/);
  assert.match(workflow, /npm run docs:build/);
  assert.match(workflow, /npm run test:docs:built/);
  assert.match(workflow, /actions\/configure-pages@v6/);
  assert.match(workflow, /actions\/upload-pages-artifact@v5/);
  assert.match(workflow, /actions\/deploy-pages@v5/);
  assert.match(workflow, /environment:\s*\n\s+name: github-pages/);
  assert.match(workflow, /pages: write/);
  assert.ok(workflow.indexOf("gh release create") < workflow.indexOf("pages-build:"));
});
