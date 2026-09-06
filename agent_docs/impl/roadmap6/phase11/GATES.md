# Roadmap 6 Phase 11 Gates — Integration discovery and closeout

## 공통 상태

R6-P11-A와 R6-P11-X는 전체 실행 승인과 실제 구현·검증 결과에 따라 approved다.
허용 상태는 planned | ready-for-review | approved | changes-requested다.
이 문서는 지금 승인을 요청하는 문서가 아니라 실행 시점의 검토 범위와 경계를 미리 선언한다.

## R6-P11-A — Contract and scope

- 상태: approved
- 검토 대상: 선택한 19개 액션군과 기존 오류·설계 문제의 최종 inventory, 검증 corpus, package와 discovery budgets 및 closeout evidence.
- 필요 증거: exact baseline commit, 구현할 public signature 또는 before/after call, [GOAL.md](GOAL.md)의 작업별 의미·owner·지원/오류 matrix, [DESIGN_DECISIONS.md](../DESIGN_DECISIONS.md)의 해당 migration 결정.
- 추가 증거: focused 재현 결과와 실행 가능한 public/primitive target 계획, Current/type/card/package 영향, 남은 불확실성.
- 준비 완료 조건: 전체 package를 검증하여 commit/push하고 그 ref를 이 문서에 기록한다.
- 승인 효과: 이 단계의 확정된 비시각 작업과 primitive target 작성을 열며, V 대상 public 구현은 V 승인 전까지 차단한다.
- 승인 전 차단: 이 단계의 production 의미·API 구현 및 해당 결과에 의존하는 후속 단계.

## R6-P11-X — Result and closeout

- 상태: approved
- 검토 대상: [GOAL.md](GOAL.md)의 전체 승인 범위 결과와 [STEP1.md](STEP1.md)의 실제 완료 상태.
- 필요 증거: verified source commit/remote ref, focused·누적 tests, strict positive/negative declarations, actual trace, immutable failure, documentation/metadata/generated diff와 compatibility 예제.
- 시각 범위: 승인된 target별 same-run decoded primitive/public pixel equality, concrete graphic parity, renderer 소비 결과. 시각 범위가 없으면 이유를 기록한다.
- 추가 조건: 관련 finding의 다른 work package가 남아 있으면 항목 전체를 닫지 않는다. Unsupported·deferred 항목의 이유와 다음 owner를 명시한다.
- 승인 효과: 이 로드맵의 승인 범위 완료 선언과 index/history closeout을 허용한다. Publish/deploy/PR/merge는 포함하지 않는다.
- 승인 전 차단: 로드맵 completed 표시와 릴리스 준비 완료 주장.

## 승인 기록

- Baseline ref: `d012d6a1f6714254aaa9f96761d4e2f0654026e6`
- W1 source ref: `4df800e29395e0979bc2ef52a58ebdad0733db73`
- W2 source ref: `4068121a73a6d34cfd5c8edece13ea3301d5346e`
- 계약: [CONTRACT.md](CONTRACT.md)
- 사용자 승인 근거: [APPROVAL.md](../APPROVAL.md)의 전체 A/X와 release 승인.
- 결과: [W1](RESULTS_W1.md), [W2](RESULTS_W2.md), [X closeout](REVIEW.md).

Source ref와 결과 문서의 실제 검증이 X 승인 적용 조건을 충족한다.
