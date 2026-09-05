# Roadmap 6 Phase 2 Gates — Shared authoring semantics

## 공통 상태

R6-P2-A는 approved다. 2026-09-05 사용자가 “ㄱㄱ”로 아래 계약의 구현을 승인했다.
V/X는 planned이며 새 시각 target의 검토는 해당 Gate에서 진행한다.
허용 상태는 planned | ready-for-review | approved | changes-requested다.
현재 검토 대상은 [CONTRACT_REVIEW.md](CONTRACT_REVIEW.md)의 API·의미·migration·범위다.

## R6-P2-A — Contract and scope

- 상태: approved
- 구체 package: [CONTRACT_REVIEW.md](CONTRACT_REVIEW.md), [검증과 acceptance](VALIDATION.md),
  [실행 source](baseline.probes.mjs), [43건 결과](baseline-results.json).
- Baseline: `bbc8a3fc256c9afa877f696ed6ade1f51ffb7522`; source tree `bd17aeb7d38e1d184bc714a182e13feea5923279`.
- 실제 검증: baseline 43/43, 관련 기존 tests 100/100. Source/API 구현·새 visual target은 아직 없다.
- Review package commit: [`e06b57db5624a5b0d66cea425cff4aa5f5f4caad`](https://github.com/ggaction/ggaction/commit/e06b57db5624a5b0d66cea425cff4aa5f5f4caad),
  `origin/codex/roadmap6-hierarchical-actions`에 push 확인.
- 검토 대상: K01–K06 및 K08의 common API, 기존 defaults/alias 유지 범위, ErrorBand style migration.
- 필요 증거: exact baseline commit, 구현할 public signature 또는 before/after call, [GOAL.md](GOAL.md)의 작업별 의미·owner·지원/오류 matrix, [DESIGN_DECISIONS.md](../DESIGN_DECISIONS.md)의 해당 migration 결정.
- 추가 증거: focused 재현 결과와 실행 가능한 public/primitive target 계획, Current/type/card/package 영향, 남은 불확실성.
- 준비 완료 조건: 전체 package를 검증하여 commit/push하고 그 ref를 이 문서에 기록한다.
- 승인 효과: 이 단계의 확정된 비시각 작업과 primitive target 작성을 열며, V 대상 public 구현은 V 승인 전까지 차단한다.
- 승인 전 차단: 이 단계의 production 의미·API 구현 및 해당 결과에 의존하는 후속 단계.

## R6-P2-V — Visual target

- 상태: planned
- 검토 대상: V1 series identity·tuple·color/dash/width/opacity, V2 explicit temporal input 의미.
  정확한 primitive/public call 계획은 [계약 검토](CONTRACT_REVIEW.md)의 visual 표를 따른다.
  기존 lower chain 출력 동등성 교정은 증명 후에만 N/A로 확정한다.
- 필요 증거: exact executable primitive source, target public call chain, semantic 결과, input/dimension/variant manifest, 실제 rendered image.
- 경로: .artifacts/test/png/review/<chart>/<variant>/ 및 git에 포함된 재현 source. 로컬 이미지 경로만으로 review package를 완료하지 않는다.
- 수치 증거: [VALIDATION.md](../VALIDATION.md)의 chart별 oracle와 plot-region ink. 아직 없는 public API를 실행했다고 기록하지 않는다.
- 승인 효과: 확인한 variant의 public action flow만 구현할 수 있다.
- 승인 전 차단: 해당 variant의 public flow 구현과 public-render 동등성 완료 선언.
- 예외 처리: 출력이 바뀌지 않는 교정은 영향 없음을 A에서 입증하고 V 범위를 명시적으로 N/A 처리한다. 자동 승인으로 표기하지 않는다.

## R6-P2-X — Result and closeout

- 상태: planned
- 검토 대상: [GOAL.md](GOAL.md)의 전체 승인 범위 결과와 [STEP1.md](STEP1.md)의 실제 완료 상태.
- 필요 증거: verified source commit/remote ref, focused·누적 tests, strict positive/negative declarations, actual trace, immutable failure, documentation/metadata/generated diff와 compatibility 예제.
- 시각 범위: 승인된 target별 same-run decoded primitive/public pixel equality, concrete graphic parity, renderer 소비 결과. 시각 범위가 없으면 이유를 기록한다.
- 추가 조건: 관련 finding의 다른 work package가 남아 있으면 항목 전체를 닫지 않는다. Unsupported·deferred 항목의 이유와 다음 owner를 명시한다.
- 승인 효과: 이 단계 결과에 의존하는 다음 Phase의 A package 준비·해당 Gate 절차로 이동한다. 후속 API를 자동 승인하지 않는다.
- 승인 전 차단: 이 단계 결과가 승인되었다고 가정하는 후속 구현 및 Phase completed 표시.

## 승인 기록

- Review commit / remote ref: `e06b57db5624a5b0d66cea425cff4aa5f5f4caad` / `origin/codex/roadmap6-hierarchical-actions`
- 검증 명령과 실제 결과: [VALIDATION.md](VALIDATION.md)의 baseline 43/43와 관련 기존 테스트 100/100. 새 API 구현 검증은 미실행.
- 사용자 승인 근거: 2026-09-05 사용자가 Phase 2 계약 구현 질문에 “ㄱㄱ”라고 답했다. 위 remote package의 계약을 승인한 것으로 기록한다. Phase 1 X는 이전 “승인한다”로 이미 승인되었다.
- 남은 작업: 비시각 교정/primitive target → V 승인 뒤 해당 public flow → 전체 consumer 검증과 X.

실행 시 실제 증거를 채운다. 문서 작성 날짜나 이전 로드맵 승인을 이 Gate의 승인으로 재사용하지 않는다.
