# Phase 4 Repair Attempt — Request-Order Tie Breaking

## 승인 기록

- 2026-08-08: 사용자가 failed validation 원인을 development evidence로 편입하고 새 validation/held-out으로 다시
  검증하는 시도를 승인했다.
- 이 승인은 unpaid repair evaluation만 연다. Credential read, external model call, spend,
  PR/merge/publish/deploy/release는 계속 차단한다.

## 목표

같은 lifecycle priority에 속한 독립 provider가 여러 개 요청되면 provider ID가 아니라 사용자가 요청에 적은 순서를
보존한다. 이미 본 failure 하나만 development에 두고, 새 validation 15개와 held-out 15개를 별도 corpus identity와
SHA-256으로 먼저 동결하여 correction 뒤의 일반화를 검증한다.

## 사전 동결 설계

- Corpus ID: `compact-authoring-repair-v1`
- Root: `evaluation/compact-authoring-repair/`
- Development: 1 complex task — 이미 공개된 `size → shape → opacity` order failure
- Validation: 15 fresh tasks — simple 7 / complex 8
- Held-out: 15 fresh tasks — simple 7 / complex 8
- 합계: simple 14 / complex 17
- Validation + held-out이 current 79 constraints를 모두 포함한다.
- 새 query는 Phase 2 design 30개와 original Phase 4 corpus 48개에 exact normalized overlap 0이어야 한다.
- Roadmap 5.3 frozen corpus는 계속 읽거나 재사용하지 않는다.
- Dataset catalog, task files, oracle policy와 schema를 correction 전에 SHA-256 manifest로 동결한다.

## 실행 순서

- [x] Generic multi-corpus freeze/evaluator support 구현
- [x] Repair dataset/task/oracle source 작성
- [x] Structural count, coverage와 overlap 검사 — 31 tasks / 79 constraints / overlap 0
- [x] Repair corpus SHA-256 freeze checkpoint commit/push — `c0effcbe`
- [x] Development-only request-order correction 구현
- [x] Known failure와 cumulative resolver contracts 통과
- [x] Development 1 / 1 strict pass 기록
- [x] Candidate 2 commit과 exact result hashes lock — `cf43c1f1b3c05bbdbc1711b880a0bd256af81358`
- [x] Fresh validation 15개 one-pass 실행 — 15 / 15 strict pass
- [x] Validation 통과 시 fresh held-out 15개 one-pass 실행 — 14 / 15 unresolved/fallback exact, strict failure
- [ ] Full tests, package, installed MCP와 browser budgets 실행 — 2,081 tests/package pass; failed Gate에서 installed/browser 승격 중단
- [ ] 모든 unpaid gate 통과 시에만 exact paid-smoke proposal 작성 — held-out failure로 제안하지 않음
- [x] R54-P4-B replacement Gate review checkpoint commit/push — `d215c2b63283a22bcb80a153a6b8c0f85b57ecd2`
- [ ] User approval

## Strict acceptance

- Exact expected constraints/action IDs/action order/required option keys: 100%
- Exact unresolved IDs와 docs fallback URI: 100%
- Recognized constraint silent partial: 0
- Resolved-task docs fallback: 0
- Generated call TypeScript errors: 0
- Task packet maximum ≤ 6,144 bytes; split median ≤ 4,096 bytes
- Candidate lock 뒤 validation과 held-out은 각각 one-pass이며 post-result tuning은 금지한다.
- Validation failure면 held-out을 열지 않고 replacement Gate를 failed로 기록한다.

## 구현 경계

- Query phrase의 earliest occurrence는 같은 lifecycle priority 안에서만 tie-breaker로 사용한다.
- Canvas/data/transform/scale/mark/position/appearance/statistics/guide/selection/layout/composition/renderer의 기존 lifecycle
  order는 바꾸지 않는다.
- Dependency-specific order와 provider coverage selection을 변경하지 않는다.
- Existing frozen corpus, oracle, result와 candidate artifact를 수정하지 않는다.
- Public chart API, renderer, persisted schema와 core architecture를 변경하지 않는다.
