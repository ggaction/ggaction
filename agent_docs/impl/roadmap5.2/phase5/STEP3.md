# STEP 3 — Reconcile the Merged Default Branch

## 진행 상태

- [x] R52-P5-A explicit approval — 2026-08-05
- [x] Separate PR creation authorization — 2026-08-05
- [x] Draft PR [#23](https://github.com/ggaction/ggaction/pull/23) created from `codex/roadmap5-2-hardening`
- [x] Required six checks and exact candidate review — `0210348206fadae8fed6f7bcea0b767c0533fbc1`, [CI run 30980129347](https://github.com/ggaction/ggaction/actions/runs/30980129347)
- [x] Separate merge authorization and merge — PR #23, 2026-08-06
- [x] Main community profile 재확인
- [x] Main Dependabot alert와 security settings 재확인
- [x] Ruleset, environments, auto-delete와 merged commit identity 재확인
- [x] R52-Exit evidence package — `8f5c87457a179513dc50269c6d8c7176b61932ce`

## 실행 경계

이 STEP은 R52-P5-A 승인과 별도 PR/merge 권한 전에는 시작하지 않는다. Merge 후에는 GitHub가 default branch를
재평가할 시간을 허용하고 다음을 요구한다.

- Community profile이 Roadmap branch의 contributor/security entry를 인식한다.
- PostCSS alert가 patched main lockfile를 반영해 닫히거나, GitHub가 아직 재평가 중이면 exact 상태와 재검증
  조건을 기록한다.
- Ruleset과 protected environments가 merge 전 baseline과 동일하다.
- Merged main commit이 approved candidate를 포함하고 required checks가 모두 success다.

R52-Exit 승인 뒤에도 package publish, documentation deployment와 `0.0.9` release는 별도 권한이다.

## Pre-merge CI evidence

2026-08-05에 PR #23의 exact head `0210348206fadae8fed6f7bcea0b767c0533fbc1`에서 다음 required jobs가 모두
success였다: `package (20)`, `package (22)`, `package (24)`, `test`, `coverage`, `documentation`.

PR 기록과 CI 증거만 추가한 final head `ac1c55e3e163c75b857e47de50f3c0a4d01a779f`에서도 같은 여섯 jobs가
[CI run 30980501139](https://github.com/ggaction/ggaction/actions/runs/30980501139)에서 모두 success였다.

## Merged-main reconciliation — 2026-08-06

- PR #23은 사용자의 별도 merge 승인 뒤 Ready로 전환하고 merge commit
  `73e8aebae6ccf3d9a029366f3fe2c21107260051`로 병합했다. Merge commit의 second parent는 exact PR head
  `ac1c55e3e163c75b857e47de50f3c0a4d01a779f`이며 두 tree 사이 diff는 없다.
- Community Standards는 Description, README, Code of Conduct, Contributing, License, Security policy, issue templates와
  pull request template을 모두 `Added`로 인식한다. Repository content reports는 Roadmap 범위가 아니므로 제외한다.
- Dependabot PostCSS alert는 main의 `8.5.25` lockfile을 재평가해 open 0, closed 1이 됐다.
- Private vulnerability reporting, Dependabot alerts/security updates, secret scanning과 push protection은 enabled다.
- Ruleset `20421930`은 active이며 default branch에 PR, strict up-to-date, 여섯 required checks, deletion과
  force-push protection, `hj-n` emergency bypass를 유지한다.
- `npm-release`는 required reviewer `hj-n`, self-review 허용, `main`/`v*` deployment policy를 유지한다.
  `github-pages`도 기존 `main`/`v*` policy를 유지하며 두 environment의 protection count는 각각 2와 1이다.
- `delete_branch_on_merge`는 enabled다.
