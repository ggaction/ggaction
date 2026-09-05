# Roadmap 6 Phase 0 Gates — Baseline and decisions

## 공통 상태

R6-P0-A는 approved다.
허용 상태는 planned | ready-for-review | approved | changes-requested다.
이 문서는 지금 승인을 요청하는 문서가 아니라 실행 시점의 검토 범위와 경계를 미리 선언한다.

## R6-P0-A — Contract and scope

- 상태: approved
- 검토 대상: 감사 범위, 계층 원칙, 우선순위, compatibility 분류, Phase 1 교정 범위와 검증 기준.
- 필요 증거: exact baseline commit, 구현할 public signature 또는 before/after call, [GOAL.md](GOAL.md)의 작업별 의미·owner·지원/오류 matrix, [DESIGN_DECISIONS.md](../DESIGN_DECISIONS.md)의 해당 migration 결정.
- 추가 증거: focused 재현 결과와 실행 가능한 public/primitive target 계획, Current/type/card/package 영향, 남은 불확실성.
- 준비 완료 조건: 전체 package를 검증하여 commit/push하고 그 ref를 이 문서에 기록한다.
- 승인 효과: Phase 1의 확정된 오류 교정 계획을 시작할 수 있다. 이후 단계의 새 API는 별도 A 결정 대상이다.
- 승인 전 차단: Phase 1 제품 source/type/knowledge 교정. 현재 로드맵 문서 작성은 이 경계에 포함되지 않는다.

## 승인 기록

- Review commit / remote ref: cf13920ed517cfc6c333b04ec55a724826960228 / codex/roadmap6-hierarchical-actions
- 검증 명령과 실제 결과: npm run test:contracts — 255/255, 47개 finding/46개 work package 연결과 432개 local link 통과. [기록](../PLAN_VALIDATION.md)
- 사용자 승인 근거: 2026-09-05 사용자가 F01–F19 범위를 선택한 뒤 “밀자”라고 지시했다. 이미 commit/push된 계획을 실행하라는 승인으로 기록하며, 아직 검토하지 않은 새 API·시각 target의 승인을 대신하지 않는다.
- 남은 작업: Phase 0 없음. Phase 1 오류 교정을 시작한다.

실행 시 실제 증거를 채운다. 문서 작성 날짜나 이전 로드맵 승인을 이 Gate의 승인으로 재사용하지 않는다.
