# Roadmap 6 Phase 1 Gates — Reproduced correctness and contract repairs

## 공통 상태

R6-P1-A는 approved다. R6-P1-X는 ready-for-review이며 [구체적인 결과 package](REVIEW.md)를 검토한다. R6-P1-V 적용 여부는 아래에 명시한다.
허용 상태는 planned | ready-for-review | approved | changes-requested다.
이 문서는 지금 승인을 요청하는 문서가 아니라 실행 시점의 검토 범위와 경계를 미리 선언한다.

## R6-P1-A — Contract and scope

- 상태: approved
- 검토 대상: B01–B08의 기존 동작, 기대 동작, 최소 교정 범위와 분석 default 보존.
- 필요 증거: exact baseline commit, 구현할 public signature 또는 before/after call, [GOAL.md](GOAL.md)의 작업별 의미·owner·지원/오류 matrix, [DESIGN_DECISIONS.md](../DESIGN_DECISIONS.md)의 해당 migration 결정.
- 추가 증거: focused 재현 결과와 실행 가능한 public/primitive target 계획, Current/type/card/package 영향, 남은 불확실성.
- 준비 완료 조건: 전체 package를 검증하여 commit/push하고 그 ref를 이 문서에 기록한다.
- 승인 효과: 이 단계의 확정된 비시각 작업과 primitive target 작성을 열며, V 대상 public 구현은 V 승인 전까지 차단한다.
- 승인 전 차단: 이 단계의 production 의미·API 구현 및 해당 결과에 의존하는 후속 단계.

## R6-P1-V — Visual target

현재 승인 범위는 기존 명시적 public call로 표현 가능한 결과와의 정합성 교정이다. 새로운 geometry·style target을 설계하지 않는다. B01은 기존 explicit-aggregate Bar와 동일 출력, B06/B07은 runtime을 유지하는 type 교정, B05/B08은 validation/inventory, B02–B04는 잘못된 completion을 unresolved로 표시하거나 기존 지원 chain만 선택하는 변경이다. 따라서 현재 범위의 V는 적용 대상 없음으로 기록한다. 새로운 appearance 목표가 발견되면 planned V를 구체화하고 public 구현 전에 검토한다.

- 상태: planned
- 검토 대상: 이 단계에서 모양이 변하는 각 primitive variant. 서로 독립인 target은 V1/V2로 분리한다.
- 필요 증거: exact executable primitive source, target public call chain, semantic 결과, input/dimension/variant manifest, 실제 rendered image.
- 경로: .artifacts/test/png/review/<chart>/<variant>/ 및 git에 포함된 재현 source. 로컬 이미지 경로만으로 review package를 완료하지 않는다.
- 수치 증거: [VALIDATION.md](../VALIDATION.md)의 chart별 oracle와 plot-region ink. 아직 없는 public API를 실행했다고 기록하지 않는다.
- 승인 효과: 확인한 variant의 public action flow만 구현할 수 있다.
- 승인 전 차단: 해당 variant의 public flow 구현과 public-render 동등성 완료 선언.
- 예외 처리: 출력이 바뀌지 않는 교정은 영향 없음을 A에서 입증하고 V 범위를 명시적으로 N/A 처리한다. 자동 승인으로 표기하지 않는다.

## R6-P1-X — Result and closeout

- 상태: ready-for-review
- Review package commit: [`a7d2ec5afc450b46d7b9a4caf96c6f42e54d5641`](https://github.com/ggaction/ggaction/commit/a7d2ec5afc450b46d7b9a4caf96c6f42e54d5641), 위 remote branch에 push 확인.
- 검증한 source commit / remote ref: `d72e7062fd2e0fb378b2b93843eeeb84baa2e28e` / `origin/codex/roadmap6-hierarchical-actions`.
- 결과 package: [REVIEW.md](REVIEW.md), 작업별 [RESULTS.md](RESULTS.md). 전체 기본 테스트 2,329/2,329,
  contracts 259/259, focused render 2/2, installed package consumer exit 0.
- 명시적 후속 범위: B01 lower measure-first는 D14 / R6-P2-W5에 남는다. B02/B03의 완성 chart와 D01의
  Polar radius 의미는 각각 F05/F08/Phase 4의 별도 owner가 처리한다.
- 검토 대상: [GOAL.md](GOAL.md)의 전체 승인 범위 결과와 [STEP1.md](STEP1.md)의 실제 완료 상태.
- 필요 증거: verified source commit/remote ref, focused·누적 tests, strict positive/negative declarations, actual trace, immutable failure, documentation/metadata/generated diff와 compatibility 예제.
- 시각 범위: 승인된 target별 same-run decoded primitive/public pixel equality, concrete graphic parity, renderer 소비 결과. 시각 범위가 없으면 이유를 기록한다.
- 추가 조건: 관련 finding의 다른 work package가 남아 있으면 항목 전체를 닫지 않는다. Unsupported·deferred 항목의 이유와 다음 owner를 명시한다.
- 승인 효과: 이 단계 결과에 의존하는 다음 Phase의 A package 준비·해당 Gate 절차로 이동한다. 후속 API를 자동 승인하지 않는다.
- 승인 전 차단: 이 단계 결과가 승인되었다고 가정하는 후속 구현 및 Phase completed 표시.

## 승인 기록

- Review commit / remote ref: cf13920ed517cfc6c333b04ec55a724826960228 / codex/roadmap6-hierarchical-actions
- 검증 명령과 실제 결과: 기준 감사의 43개 API·7개 MCP 관측·4개 type 호출과 255개 contract tests. 새 구현 결과는 작업별로 추가한다.
- 사용자 승인 근거: 2026-09-05 사용자가 F01–F19 범위를 선택한 뒤 “밀자”라고 지시했다. 이미 commit/push된 계획을 실행하라는 승인으로 기록하며, 아직 검토하지 않은 새 API·시각 target의 승인을 대신하지 않는다.
- 남은 작업: R6-P1-X 결과 승인. W1–W5 교정은 구현·검증했으며 B01 전체와 신규 액션군을 완료로 표시하지 않는다.

실행 시 실제 증거를 채운다. 문서 작성 날짜나 이전 로드맵 승인을 이 Gate의 승인으로 재사용하지 않는다.
