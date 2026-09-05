# Roadmap 6 Phase 8 — Statistical and endpoint charts

## 상태와 목표

상태: planned. 구현·사용자 승인 기록 없음.

개별 통계 layer와 endpoint mark를 재사용해 완성 chart facade를 만든다. 파생값·label·center가 같은 grain을 공유하게 한다.

## 선행 조건

- [Phase 7](../phase7/GOAL.md)의 R6-P7-X 승인과 필요한 결과.

## 구체적인 작업 묶음

### R6-P8-W1 — Interval과 Regression complete facade

- 상대 규모: M. 시간 약속이 아닌 변경 구조 비교다.
- 연결: F10.
- 작업: Interval center point와 error bar, scatter와 regression line/band를 조합한다. Source와 group, method/level을 기존 statistical owner에 위임한다.
- 완료 조건: Center/interval 같은 grain·scale, explicit group:false serialization, confidence method provenance. Child style와 role editor로 수정 가능.

### R6-P8-W2 — Dot·Lollipop·Dumbbell

- 상대 규모: M. 시간 약속이 아닌 변경 구조 비교다.
- 연결: F11.
- 작업: Summary/raw mode를 구분한 point, baseline stem rule, two endpoints connector를 ordinary child로 만든다. Atomic role edit와 final-item label anchor를 정의한다.
- 완료 조건: Horizontal/vertical, zero/nonzero baseline, endpoint swap, negative/equal values, source edit 후 geometry·guide 수렴.

### R6-P8-W3 — ECDF data와 complete plot

- 상대 규모: L. 시간 약속이 아닌 변경 구조 비교다.
- 연결: F13.
- 작업: Sorted values와 tie grouping, denominator, missing/weight policy를 materialized derived data로 정의한다. Step line은 기존 path owner로 표현하고 generic cumsum은 Window에 남긴다.
- 완료 조건: 관측점 우연속 cumulative probability, ties/count/weights와 0..1 bounds 독립 oracle. Group와 filter/source edit 후 분모·steps·labels 일치.

## 이 단계의 차트 계약

- [interval-regression](../chart/interval-regression.md) — 전체 API chain, hierarchy, 저장 결과와 variant.
- [dot-lollipop-dumbbell](../chart/dot-lollipop-dumbbell.md) — 전체 API chain, hierarchy, 저장 결과와 variant.
- [ecdf](../chart/ecdf.md) — 전체 API chain, hierarchy, 저장 결과와 variant.

## 검증과 종료

- [VALIDATION.md](../VALIDATION.md)의 공통 matrix와 각 작업의 acceptance를 적용한다.
- Runtime/type/contract/card/docs 변경은 각 conceptual change와 함께 완료한다.
- [STEP1.md](STEP1.md)의 실행 체크를 갱신하고 [GATES.md](GATES.md)에 실제 증거만 기록한다.
- R6-P8-X 승인 전 이 결과를 전제로 하는 다음 단계 구현을 시작하지 않는다.
- 구현하지 않은 후보는 완료로 표시하지 않고 [추적 원장](../TRACEABILITY.md)에 처분을 남긴다.
