# Roadmap 6 Phase 9 — Deterministic packing and raincloud

## 상태와 목표

상태: in-progress. [전체 실행·A/V/X 승인](../APPROVAL.md)과 [A 계약](CONTRACT.md)을 적용했다.

새 배치가 필요한 분포 차트는 명시적 owner로 추가한다. 복합 chart의 source와 slot 정렬을 단순한 mark 나열에 맡기지 않는다.

## 선행 조건

- [Phase 8](../phase8/GOAL.md)의 R6-P8-X 승인과 필요한 결과.

## 구체적인 작업 묶음

### R6-P9-W1 — Point packing과 Beeswarm

- 상대 규모: L. 시간 약속이 아닌 변경 구조 비교다.
- 연결: F09.
- 작업: Glyph bounds, fixed quantitative coordinate, category slot과 stable order를 사용하는 packPoints 후보를 설계한다. 해제·replay·overflow 정책을 함께 제공한다.
- 완료 조건: Feasible fixture에서 actual glyph collision 0, quantitative value 불변, deterministic output. Resize/radius change 때 재배치, remove 뒤 base position 복구.

### R6-P9-W2 — Raincloud composite

- 상대 규모: L. 시간 약속이 아닌 변경 구조 비교다.
- 연결: F12.
- 작업: Half violin+box/interval+raw point child를 같은 source와 category slot recipe에서 만든다. Points mode strip/beeswarm을 명시하고 child IDs와 owner relation을 안정화한다.
- 완료 조건: Summary/KDE/raw sample source 일치, slot overlap policy 검증. Source/filter/orientation edit는 정의된 child 범위만 원자적으로 갱신.

## 이 단계의 차트 계약

- [beeswarm](../chart/beeswarm.md) — 전체 API chain, hierarchy, 저장 결과와 variant.
- [raincloud](../chart/raincloud.md) — 전체 API chain, hierarchy, 저장 결과와 variant.

## 검증과 종료

- [VALIDATION.md](../VALIDATION.md)의 공통 matrix와 각 작업의 acceptance를 적용한다.
- Runtime/type/contract/card/docs 변경은 각 conceptual change와 함께 완료한다.
- [STEP1.md](STEP1.md)의 실행 체크를 갱신하고 [GATES.md](GATES.md)에 실제 증거만 기록한다.
- R6-P9-X 승인 전 이 결과를 전제로 하는 다음 단계 구현을 시작하지 않는다.
- 구현하지 않은 후보는 완료로 표시하지 않고 [추적 원장](../TRACEABILITY.md)에 처분을 남긴다.
