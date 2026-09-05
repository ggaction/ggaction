# Roadmap 6 Phase 4 Gates — Baselines layouts and quantitative meaning

## 공통 상태

A는 approved다. V1은 approved이며 V/V2/V3/X는 planned다. 시각 목표와 결과 승인은 아직 없다.
허용 상태는 planned | ready-for-review | approved | changes-requested다.
현재 검토 대상은 [V1 검토 묶음](VISUAL_REVIEW_V1.md)의 11개 Area/layout primitive다. A 승인과 Phase 3 X 승인을 V1 승인으로 재사용하지 않는다.

## R6-P4-A — Contract and scope

- 상태: approved
- 검토 대상: K07–K08의 baseline/range API, stack transition, theta order, diverging midpoint와 migration.
- 필요 증거: exact baseline commit, 구현할 public signature 또는 before/after call, [GOAL.md](GOAL.md)의 작업별 의미·owner·지원/오류 matrix, [DESIGN_DECISIONS.md](../DESIGN_DECISIONS.md)의 해당 migration 결정.
- 추가 증거: [49건 baseline](baseline-results.json), [4개 후보](candidates.json), [20개 future public call 계획](visual-target-plan.json), [200/200 기존 tests와 acceptance](VALIDATION.md). Current 177 / Planned 0, production 변경 0.
- 준비 완료 조건: 전체 package를 검증하여 commit/push하고 그 ref를 이 문서에 기록한다.
- 승인 효과: 이 단계의 확정된 비시각 작업과 primitive target 작성을 열며, V 대상 public 구현은 V 승인 전까지 차단한다.
- 승인 전 차단: 이 단계의 production 의미·API 구현 및 해당 결과에 의존하는 후속 단계.

## R6-P4-V — Visual target

- 상태: planned
- 검토 대상: 이 단계에서 모양이 변하는 각 primitive variant. 서로 독립인 target은 V1/V2로 분리한다.
- 필요 증거: exact executable primitive source, target public call chain, semantic 결과, input/dimension/variant manifest, 실제 rendered image.
- 경로: .artifacts/test/png/review/<chart>/<variant>/ 및 git에 포함된 재현 source. 로컬 이미지 경로만으로 review package를 완료하지 않는다.
- 수치 증거: [VALIDATION.md](../VALIDATION.md)의 chart별 oracle와 plot-region ink. 아직 없는 public API를 실행했다고 기록하지 않는다.
- 승인 효과: 확인한 variant의 public action flow만 구현할 수 있다.
- 승인 전 차단: 해당 variant의 public flow 구현과 public-render 동등성 완료 선언.
- 예외 처리: 출력이 바뀌지 않는 교정은 영향 없음을 A에서 입증하고 V 범위를 명시적으로 N/A 처리한다. 자동 승인으로 표기하지 않는다.

### 독립 V 범위

- R6-P4-V1: approved. [Area/baseline/range/missing/layout 11 variants](VISUAL_REVIEW_V1.md).
- R6-P4-V2: planned. Rose/Radial mapping·theta/legend order 5 variants.
- R6-P4-V3: planned. Midpoint·scale/legend transition 4 variants.
- V1의 입력·미래 호출은 [실행 fixture](../../../../test/gates/area-layout/targets.json), source·표현은 [manifest](../../../../test/gates/area-layout/manifest.js)가 소유한다. [수치·렌더 결과](visual-v1-results.json)를 기록했다. V2/V3 9개는 [target plan](visual-target-plan.json)에 남아 있다.
- Parent V는 세 범위 모두 승인된 뒤에만 approved로 기록한다. 한 V 승인이 다른 V의 public 구현을 열지 않는다.

## R6-P4-X — Result and closeout

- 상태: planned
- 검토 대상: [GOAL.md](GOAL.md)의 전체 승인 범위 결과와 [STEP1.md](STEP1.md)의 실제 완료 상태.
- 필요 증거: verified source commit/remote ref, focused·누적 tests, strict positive/negative declarations, actual trace, immutable failure, documentation/metadata/generated diff와 compatibility 예제.
- 시각 범위: 승인된 target별 same-run decoded primitive/public pixel equality, concrete graphic parity, renderer 소비 결과. 시각 범위가 없으면 이유를 기록한다.
- 추가 조건: 관련 finding의 다른 work package가 남아 있으면 항목 전체를 닫지 않는다. Unsupported·deferred 항목의 이유와 다음 owner를 명시한다.
- 승인 효과: 이 단계 결과에 의존하는 다음 Phase의 A package 준비·해당 Gate 절차로 이동한다. 후속 API를 자동 승인하지 않는다.
- 승인 전 차단: 이 단계 결과가 승인되었다고 가정하는 후속 구현 및 Phase completed 표시.

## 승인 기록

- Review commit: `f229fa003d5de81f7131d4c23811b834bd36d50e`.
- Remote ref: `origin/codex/roadmap6-hierarchical-actions`에 push 및 ls-remote 일치 확인.
- 검토 내용: 이 commit의 P4-C01–C09, 새 direct action 4개, 기존 action 변경, 20 V target 계획.
- 검토 고정일: 2026-09-05. A 승인: 사용자가 이름을 layoutSeries로 바꾸는 결정까지 포함해 승인했다.
- 검증 명령과 실제 결과: [VALIDATION.md](VALIDATION.md). 49건 replay, 199 immutable checks, 관련 기존 tests 200/200. 새 production/primitive 구현 없음.
- 사용자 승인 근거: “그렇게하자. 그것까지 포함해서 승인한다”.
- 승인 기준 HEAD: `b93acb55859dfd90028ffa91f1e6fc2ef4c356fc`.
- 승인 delta: `encodeLayout` → `layoutSeries`. Bar/Area의 series 배치만 담당하며 canvas/facet/composition layout은 포함하지 않는다. 이전 이름의 alias를 만들지 않는다.
- 승인 범위: P4-C01–C09의 위 이름 변경 포함, Planned 등록·비시각 준비·20개 primitive target 작성. 각 V 승인 전 public visual flow 구현 차단.
- 남은 작업: V1/V2/V3 primitive 작성·승인, W1–W5 구현과 누적 검증, X 승인.
- Baseline commit: `93dceb3761e170207058e6a7280060fedd471244`.
- Full/Basic/SVG 상한 237000/125000/25000 유지. 초과 시 별도 B가 필요하며 이번 A에는 상한 증가가 없다.

실행 시 실제 증거를 채운다. 문서 작성 날짜나 이전 로드맵 승인을 이 Gate의 승인으로 재사용하지 않는다.

## V1 검토 준비

- 검토 문서: [VISUAL_REVIEW_V1.md](VISUAL_REVIEW_V1.md).
- 범위: Area 9개, 색상 없는 Bar layout 2개. 원본 데이터 유지, endpoint datum, closed segment, layout.mode 저장과 실제 PNG.
- Focused 20/20, discovery 포함 33/33, 정상 누적 2608/2608, PNG 11/11. 실제 renderer는 graphicSpec만 소비한다. Public action flow와 roundtrip 실행은 아직 없다.
- V1 승인 효과: W1/W2의 해당 public flow 구현·전환/실패/소비자 검증을 연다. V2/V3와 X는 별도 미승인으로 유지한다.
- V1 review package commit: `ee9daf0c58eb682a09ab0dddc3af9ff241bb76a1`. 원격 origin/codex/roadmap6-hierarchical-actions에 push하고 ls-remote 일치를 확인했다.
- 이후 ref 고정 기록은 시각 승인이나 공개 구현을 포함하지 않는다.

## V1 승인 기록

- 사용자 답변: “승인한다”. 기준 HEAD: `102fbee9cc76dd6ec31fef9d39680d8501dba839`.
- 승인 대상: `ee9daf0c58eb682a09ab0dddc3af9ff241bb76a1`의 11개 Area/layout primitive 목표와 표시된 public calls.
- W1/W2 public 구현·전환·실패·소비자 검증을 시작한다. V2/V3/X는 미승인이다.
