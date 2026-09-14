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
  assert.ok(
    workflow.indexOf("npx playwright install --with-deps chromium") <
      workflow.indexOf("npm run test:docs"),
    "documentation source tests execute browser consumers"
  );
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

function workflowJob(source, name) {
  const start = source.indexOf(`\n  ${name}:\n`);
  assert.notEqual(start, -1, `Missing job ${name}`);
  const body = source.slice(start + 1);
  const next = body.slice(1).search(/^  [\w-]+:\s*$/m);
  return next < 0 ? body : body.slice(0, next + 1);
}

test("parallel qualifications consume one canonical candidate and join before publishing", () => {
  assert.equal((workflow.match(/run: node scripts\/release-candidate\.js "\$RELEASE_TAG"/g) ?? []).length, 1);
  const names = ["verify-source", "verify-coverage", "verify-package", "verify-documentation", "verify-realistic", "verify-platform", "verify-browsers"];
  for (const name of names) {
    const job = workflowJob(workflow, name);
    assert.match(job, /needs: (?:candidate|\[candidate, realistic-data\])/);
    assert.match(job, /name: ggaction-\$\{\{ inputs.tag \}\}/);
    assert.match(job, /release-candidate.js --verify/);
    assert.match(job, /GGACTION_PACKAGE_SPEC=/);
    assert.ok(job.indexOf("release-candidate.js --verify") < job.indexOf("npm run test:") ||
      name === "verify-source" && job.indexOf("release-candidate.js --verify") < job.indexOf("run: npm test"));
  }
  const aggregate = workflowJob(workflow, "verify");
  assert.match(aggregate, /if: \$\{\{ always\(\) \}\}/);
  assert.match(aggregate, /GGACTION_JOB_RESULTS: \$\{\{ toJSON\(needs\) \}\}/);
  assert.match(aggregate, /--check-jobs candidate verify-source verify-coverage verify-package verify-documentation realistic-data verify-realistic/);
  assert.match(workflowJob(workflow, "publish"), /needs: verify/);
  const realistic = workflowJob(workflow, "verify-realistic");
  assert.match(realistic, /fail-fast: false/);
  assert.match(realistic, /shard: \[1, 2, 3, 4, 5, 6, 7\]/);
  assert.match(realistic, /npm run test:realistic -- --shard=\$\{\{ matrix.shard \}\}\/7/);
  for (const step of workflow.split(/(?=^      - name:)/m)) {
    if (step.includes("continue-on-error: true")) {
      assert.match(step, /^      - name: (Collect bounded failure evidence|Upload failure evidence)/);
      assert.match(step, /if: \$\{\{ failure\(\) \}\}/);
    }
  }
});

test("qualifies native platforms and three browser engines with strict release dependencies", () => {
  const ci = readFileSync(new URL("../../.github/workflows/ci.yml", import.meta.url), "utf8");
  for (const [source, prefix] of [[ci, ""], [workflow, "verify-"]]) {
    const platform = workflowJob(source, `${prefix}platform`);
    assert.match(platform, /os: \[macos-latest, windows-latest\]/);
    assert.match(platform, /node-version: 22/);
    assert.match(platform, /shell: bash/);
    assert.match(platform, /npm run test:platform/);
    const browsers = workflowJob(source, `${prefix}browsers`);
    assert.match(browsers, /browser: \[firefox, webkit\]/);
    assert.match(browsers, /playwright install --with-deps \$\{\{ matrix.browser \}\}/);
    assert.match(browsers, /GGACTION_BROWSER: \$\{\{ matrix.browser \}\}/);
    assert.match(browsers, /npm run test:browser:compat/);
  }
  const aggregate = workflowJob(workflow, "verify");
  assert.match(aggregate, /needs: \[[^\n]*verify-platform, verify-browsers\]/);
  assert.match(aggregate, /--check-jobs[^\n]*verify-platform verify-browsers/);
});

test("realistic CI has a stable aggregate that cannot accept skipped or failed dependencies", () => {
  const ci = readFileSync(new URL("../../.github/workflows/ci.yml", import.meta.url), "utf8");
  const aggregate = workflowJob(ci, "realistic-required");
  assert.match(aggregate, /if: \$\{\{ always\(\) \}\}/);
  assert.match(aggregate, /needs: \[realistic-data, realistic\]/);
  assert.match(aggregate, /--check-jobs realistic-data realistic/);
  assert.match(aggregate, /GGACTION_JOB_RESULTS: \$\{\{ toJSON\(needs\) \}\}/);
});

test("test and documentation failures retain bounded artifacts without forgiving required checks", () => {
  const ci = readFileSync(new URL("../../.github/workflows/ci.yml", import.meta.url), "utf8");
  for (const [source, jobs] of [[ci, ["package", "test", "realistic", "coverage", "documentation"]],
    [workflow, ["verify-source", "verify-coverage", "verify-package", "verify-documentation", "verify-realistic"]]]) {
    for (const name of jobs) {
      const job = workflowJob(source, name);
      assert.match(job, /node scripts\/run-check.js/);
      assert.match(job, /node scripts\/collect-failure-artifacts.js/);
      assert.match(job, /path: \.artifacts\/ci-evidence/);
      assert.match(job, /retention-days: 7/);
      for (const step of job.split(/(?=^      - name:)/m)) {
        if (step.includes("continue-on-error: true")) {
          assert.match(step, /^      - name: (Collect bounded failure evidence|Upload failure evidence)/);
          assert.match(step, /if: \$\{\{ failure\(\) \}\}/);
        }
      }
    }
  }
});
