# Gate R52-P1-A — Protected Repository and Contributor Entry

## Gate state

`ready-for-review`

## Review target

1. `main` 변경은 PR과 six required checks를 거친다.
2. Force push와 deletion은 차단하고 admin emergency bypass를 보존한다.
3. Merge된 head branch는 자동 삭제한다.
4. Bug, feature와 PR entry가 exact contributor evidence를 요구한다.
5. AI-assisted contribution은 허용하되 contributor가 검토·검증·보안을 책임진다.
6. Vulnerability는 private advisory로 보고되고 supported security automation이 활성화된다.
7. Dependabot은 monthly patch/minor만 제안하고 major는 별도 compatibility review로 남긴다.

## Required evidence

- Community/security files and stable repository-governance contract test
- Active ruleset ID, target, enforcement, bypass and exact required checks
- Repository settings showing auto-delete and security feature states
- Community profile result and private vulnerability reporting state
- Focused contract tests and cumulative contract suite
- Verified remote checkpoint on `origin/codex/roadmap5-2-hardening`

## Evidence

### Repository rules

- Active ruleset: `20421930`, `Protect main via PR and CI`
- Target: default branch (`main`); enforcement: `active`
- Pull request required with zero mandatory approvals
- Strict required checks: `package (20)`, `package (22)`, `package (24)`, `test`, `coverage`, `documentation`
- Branch deletion and non-fast-forward updates blocked
- Emergency bypass: user `hj-n` only, `always`
- Evaluated `main` rules return all four expected rule types from ruleset `20421930`
- `delete_branch_on_merge`: `true`
- Existing `npm-release` and `github-pages` environment policies preserved

### Community and security

- Structured bug and feature forms, PR template, Contributor Covenant 2.1, Security Policy and AI-assisted contribution
  responsibility are present on the review branch.
- Dependabot version updates cover npm, GitHub Actions and Bundler monthly; semantic-version major updates are ignored.
- Dependabot vulnerability alerts, security updates and automated security fixes: enabled.
- Secret scanning and push protection: enabled.
- Private vulnerability reporting: enabled.
- Security automation surfaced one pre-existing medium alert for the development-only transitive `postcss` dependency:
  `GHSA-fxqj-rqcc-2cmp`, vulnerable through `8.5.22`, first patched in `8.5.23`. Dependency changes remain Phase 4 work.
- GitHub community profile reports 50% against current `main`; it cannot evaluate unmerged review-branch files. Local stable
  contracts verify the complete pending file set, and R52-Exit must recheck the profile after merge.

### Verification

- `node --test test/contracts/repository-governance.test.js` — 2/2 pass
- Ruby YAML parse for issue forms, issue config and Dependabot configuration — pass
- `npm run test:contracts` — 163/163 pass
- `git diff --check` — pass

## Approval effect

Approval freezes the Phase 1 governance/community/security baseline and opens Phase 2 truth alignment. It does not authorize
PR creation, merge, publish, deploy, release or later Phase results.

## Work blocked before approval

- Architecture, README and current contract truth correction
- Partial coverage status and action test changes
- CI action runtime, dependencies and bundle source changes
- Phase 2~5 implementation

## Remote checkpoint

- Verified implementation checkpoint: `550efb2abaffab0643afab8028d7e2a444b5c7c2`
- Remote branch: `origin/codex/roadmap5-2-hardening`
