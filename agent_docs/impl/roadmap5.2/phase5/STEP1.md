# STEP 1 — Reconcile Repository Truth and GitHub State

## 진행 상태

- [ ] Roadmap scope/action/current-contract inventory audit
- [ ] Public declarations, package exports, docs와 architecture truth audit
- [ ] Generated catalogs/references/search/signatures drift checks
- [x] Ruleset, repository, environment와 community profile baseline
- [x] Default-branch Dependabot alert baseline
- [ ] Candidate/main reconciliation requirements 확정

## 검증 계약

- Current action inventory는 173개 action의 contract/effects/tests를 complete로 유지한다.
- Current contracts에는 `Partial`, `Missing` 또는 Roadmap 5.2 범위의 Planned 상태가 남지 않는다.
- Package export map, JavaScript exports와 declarations가 일치한다.
- Architecture, README, docs와 executable numeric owners가 같은 renderer/version/bundle 사실을 설명한다.
- Generated outputs는 canonical source로 재생성해도 diff가 없어야 한다.

## GitHub baseline — 2026-08-05

- Ruleset `20421930`은 active이며 pull request, strict six checks, deletion/non-fast-forward protection과 maintainer
  emergency bypass를 유지한다.
- `delete_branch_on_merge`는 enabled다.
- `npm-release`와 `github-pages` environment protection은 Phase 1 승인 상태를 유지한다.
- Secret scanning, push protection와 Dependabot security updates는 enabled다.
- Community profile은 current main 기준 50%다. Branch에만 있는 Code of Conduct, issue/PR templates와 security
  entry가 merge되기 전이므로 expected pre-merge state다.
- Default-branch Dependabot medium PostCSS alert 1건은 open이다. Phase 4 patched lockfile가 main에 merge되면 다시
  평가해야 한다.
