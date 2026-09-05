# Roadmap 6 Phase 5 Gates — Guides labels and appearance

## 공통 상태

[전체 실행 승인](../APPROVAL.md)이 남은 A/V/X 범위를 포함한다. 아래 planned·별도 승인 대기 문구는 최초 계획 당시 경계다. 실제 계약·primitive·검증 package는 계속 작성하며 승인만으로 완료 처리하지 않는다.
허용 상태는 planned | ready-for-review | approved | changes-requested다.
이 문서는 지금 승인을 요청하는 문서가 아니라 실행 시점의 검토 범위와 경계를 미리 선언한다.

## R6-P5-A — Contract and scope

- 상태: approved — [전체 실행 승인](../APPROVAL.md); 세부 검토·검증 package는 미완료
- 검토 대상: K09–K11의 component lifecycle, legend recipe/edge, label source/content, format/unit, theme/fitting.
- 필요 증거: exact baseline commit, 구현할 public signature 또는 before/after call, [GOAL.md](GOAL.md)의 작업별 의미·owner·지원/오류 matrix, [DESIGN_DECISIONS.md](../DESIGN_DECISIONS.md)의 해당 migration 결정.
- 추가 증거: focused 재현 결과와 실행 가능한 public/primitive target 계획, Current/type/card/package 영향, 남은 불확실성.
- 준비 완료 조건: 전체 package를 검증하여 commit/push하고 그 ref를 이 문서에 기록한다.
- 승인 효과: 이 단계의 확정된 비시각 작업과 primitive target 작성을 열며, V 대상 public 구현은 V 승인 전까지 차단한다.
- 승인 전 차단: 이 단계의 production 의미·API 구현 및 해당 결과에 의존하는 후속 단계.

## R6-P5-V — Visual target

- 상태: approved — [전체 실행 승인](../APPROVAL.md); 세부 검토·검증 package는 미완료
- 검토 대상: 이 단계에서 모양이 변하는 각 primitive variant. 서로 독립인 target은 V1/V2로 분리한다.
- 필요 증거: exact executable primitive source, target public call chain, semantic 결과, input/dimension/variant manifest, 실제 rendered image.
- 경로: .artifacts/test/png/review/<chart>/<variant>/ 및 git에 포함된 재현 source. 로컬 이미지 경로만으로 review package를 완료하지 않는다.
- 수치 증거: [VALIDATION.md](../VALIDATION.md)의 chart별 oracle와 plot-region ink. 아직 없는 public API를 실행했다고 기록하지 않는다.
- 승인 효과: 확인한 variant의 public action flow만 구현할 수 있다.
- 승인 전 차단: 해당 variant의 public flow 구현과 public-render 동등성 완료 선언.
- 예외 처리: 출력이 바뀌지 않는 교정은 영향 없음을 A에서 입증하고 V 범위를 명시적으로 N/A 처리한다. 자동 승인으로 표기하지 않는다.

## R6-P5-X — Result and closeout

- 상태: approved — [전체 실행 승인](../APPROVAL.md); 세부 검토·검증 package는 미완료
- 검토 대상: [GOAL.md](GOAL.md)의 전체 승인 범위 결과와 [STEP1.md](STEP1.md)의 실제 완료 상태.
- 필요 증거: verified source commit/remote ref, focused·누적 tests, strict positive/negative declarations, actual trace, immutable failure, documentation/metadata/generated diff와 compatibility 예제.
- 시각 범위: 승인된 target별 same-run decoded primitive/public pixel equality, concrete graphic parity, renderer 소비 결과. 시각 범위가 없으면 이유를 기록한다.
- 추가 조건: 관련 finding의 다른 work package가 남아 있으면 항목 전체를 닫지 않는다. Unsupported·deferred 항목의 이유와 다음 owner를 명시한다.
- 승인 효과: 이 단계 결과에 의존하는 다음 Phase의 A package 준비·해당 Gate 절차로 이동한다. 후속 API를 자동 승인하지 않는다.
- 승인 전 차단: 이 단계 결과가 승인되었다고 가정하는 후속 구현 및 Phase completed 표시.

## 승인 기록

- W1 A1 부분 결과: [Polar focused 생성 8개](RESULTS_W1_CREATE.md). 해당 문서를 추가한 source commit이 review checkpoint이며, 전체 Phase A/V/X package는 여전히 미완료다.
- W1 A2 부분 결과: [Cartesian/Polar optional component 정렬](RESULTS_W1_OPTIONAL.md). A3와 W2–W5가 남아 있어 W1/Phase 완료로 처리하지 않는다.

- Review commit / remote ref: 미정
- 검증 명령과 실제 결과: 미실행
- 사용자 승인 근거: [APPROVAL.md](../APPROVAL.md)의 남은 로드맵 전체 실행·릴리즈 승인
- 남은 작업: 해당 GOAL/STEP 전 범위

실행 시 실제 증거를 채운다. 문서 작성 날짜나 이전 로드맵 승인을 이 Gate의 승인으로 재사용하지 않는다.
