# Roadmap 3 Phase 11 — 0.0.3 External Evaluation Stabilization

## 진행 상태

- [x] STEP 1 — 평가 기준선, finding 우선순위와 재현 절차 확정
- [x] STEP 2 — F-012 Node PNG numeric `fontWeight`
- [x] STEP 3 — F-013 right categorical legend `offset`
- [x] STEP 4 — F-015 sequential `palette.count`와 F-014 strict TypeScript extension
- [ ] STEP 5 — F-008 LLM route와 fragment integrity
- [ ] STEP 6 — F-009 tutorial portability와 F-010 capability drift
- [ ] STEP 7 — F-011 composition asset, 전체 회귀와 closeout

## 목표

공개 `ggaction@0.0.3` 외부 평가의 고신호 finding 8건을 실제 배포물에서 먼저 재현하고, 개발 저장소에서
공유 원인을 수정한다. Runtime, TypeScript declaration, 일반 문서와 LLM 문서가 하나의 public contract를
표현하게 하며, 각 finding의 최소 재현을 package-level 회귀 테스트로 옮긴다.

평가 작업공간 `/Users/hj/Desktop/ggaction_test/0.0.3`은 증거와 회귀 corpus로만 읽는다. Finding 상태나
평가 산출물을 개발 과정에서 수정하지 않는다.

## 우선순위

1. F-012 — Node PNG numeric `fontWeight` silent corruption
2. F-013 — right categorical legend `offset`
3. F-015 — sequential `palette.count` contract
4. F-014 — strict TypeScript extension authoring
5. F-008 — LLM route와 fragment integrity
6. F-009 — complete tutorial portability
7. F-010 — central capability drift
8. F-011 — composition representative asset

## Finding별 작업 순서

각 finding은 다음 순서를 독립적으로 반복한다.

1. Exact `ggaction@0.0.3` 최소 재현과 control을 실행한다.
2. 평가 증거와 현재 source를 대조해 원인과 공유 수정 경계를 확정한다.
3. 기존 API를 보존하는 가장 작은 공통 수정을 구현한다.
4. 평가 재현에서 파생한 focused 회귀 테스트를 추가한다.
5. 관련 runtime, package, type, docs, browser 또는 render suite를 실행한다.
6. 변경 이유와 남은 위험을 이 Phase 문서에 기록한다.
7. 하나의 coherent finding 수정으로 commit하고 `main`에 push한다.

## 계약 결정

- Silent visual failure는 정상 동작으로 고치고, 지원할 수 없는 입력만 materialization 전에 명확히 거부한다.
- 문서에 공개된 동작을 기준으로 하되 finding의 제안은 source와 기존 테스트로 검증한 뒤 채택한다.
- F-015처럼 public 범위를 바꿀 수 있는 선택은 기존 runtime intent가 명확하지 않으면 해당 항목만 멈추고
  사용자 결정을 요청한다.
- Runtime 수정은 declaration과 일반/LLM 문서를 함께 갱신한다.
- 평가 전용 특수 처리를 만들지 않고 renderer, layout, scale 또는 docs pipeline의 canonical owner를 수정한다.
- Caller-owned input, 이전 `ChartProgram`, 실패한 action의 prior state는 변하지 않아야 한다.

## 완료 조건

- 8개 finding 각각에 재현 결과, 원인, 구현, 전용 회귀 테스트와 남은 위험이 기록되어 있다.
- 기존 0.0.2 F001–F007 회귀와 `0.0.3`의 113개 회귀 시나리오가 유지된다.
- Normal, coverage, package, TypeScript, browser, render와 built documentation 검증이 통과한다.
- Node 20+, Browser Canvas, Node PNG와 extension entrypoint가 유지된다.
- Public API 또는 semver 영향과 다음 배포 재평가 우선순위를 closeout 보고에 남긴다.
