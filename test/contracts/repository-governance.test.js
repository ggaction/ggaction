import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../../", import.meta.url));

function read(relativePath) {
  return readFileSync(path.join(root, relativePath), "utf8");
}

test("keeps contributor entry points complete and security reports private", () => {
  const contributing = read("CONTRIBUTING.md");
  const conduct = read("CODE_OF_CONDUCT.md");
  const security = read("SECURITY.md");
  const bug = read(".github/ISSUE_TEMPLATE/bug_report.yml");
  const feature = read(".github/ISSUE_TEMPLATE/feature_request.yml");
  const config = read(".github/ISSUE_TEMPLATE/config.yml");
  const pullRequest = read(".github/pull_request_template.md");

  assert.match(contributing, /AI-assisted development is welcome/);
  assert.match(contributing, /responsible for every submitted line and decision/);
  assert.match(conduct, /Contributor Covenant, version 2\.1/);
  assert.match(security, /security\/advisories\/new/);
  assert.match(security, /Do not open a public issue/);

  for (const field of ["version", "environment", "outputs", "reproduction", "expected", "actual"]) {
    assert.match(bug, new RegExp(`id: ${field}`));
  }
  assert.match(feature, /id: problem/);
  assert.match(feature, /id: workflow/);
  assert.match(feature, /implementation PR for a material contract change/);
  assert.match(config, /blank_issues_enabled: false/);
  assert.match(config, /security\/advisories\/new/);
  assert.match(pullRequest, /Canvas, SVG, PNG, and PDF remain aligned/);
  assert.match(pullRequest, /AI-assisted changes/);
});

test("keeps automated dependency updates bounded to reviewable non-major changes", () => {
  const dependabot = read(".github/dependabot.yml");

  for (const ecosystem of ["npm", "github-actions", "bundler"]) {
    assert.match(dependabot, new RegExp(`package-ecosystem: ${ecosystem}`));
  }
  assert.equal((dependabot.match(/interval: monthly/g) ?? []).length, 3);
  assert.equal((dependabot.match(/version-update:semver-major/g) ?? []).length, 3);
  assert.match(dependabot, /npm-minor-and-patch/);
  assert.match(dependabot, /- minor[\s\S]*- patch/);
});
