# STEP 3 — Reconcile the Merged Default Branch

## 진행 상태

- [x] R52-P5-A explicit approval — 2026-08-05
- [x] Separate PR creation authorization — 2026-08-05
- [x] Draft PR [#23](https://github.com/ggaction/ggaction/pull/23) created from `codex/roadmap5-2-hardening`
- [x] Required six checks and exact candidate review — `0210348206fadae8fed6f7bcea0b767c0533fbc1`, [CI run 30980129347](https://github.com/ggaction/ggaction/actions/runs/30980129347)
- [ ] Separate merge authorization and merge
- [ ] Main community profile 재확인
- [ ] Main Dependabot alert와 security settings 재확인
- [ ] Ruleset, environments, auto-delete와 merged commit identity 재확인
- [ ] R52-Exit evidence package

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
