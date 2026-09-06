# Roadmap 6 Phase 7 — Polar and one dimensional charts

## 상태와 목표

상태: completed. [Phase 7 계약](CONTRACT.md), [X 결과](REVIEW.md)와 전체 실행 승인을 적용했다.

기존 Polar 조합과 1D mark를 완성 chart 의도로 연결한다. 단위·anchor·정규화를 사용자에게 설명할 수 있게 한다.

## 선행 조건

- [Phase 5](../phase5/GOAL.md)의 R6-P5-X 승인과 필요한 결과.
- [Phase 6](../phase6/GOAL.md)의 R6-P6-X 승인과 필요한 결과.

## 구체적인 작업 묶음

### R6-P7-W1 — Polar Scatter와 Line facade

- 상대 규모: S. 시간 약속이 아닌 변경 구조 비교다.
- 연결: F02.
- 작업: Point/line→theta/radius→group/color→Polar guides를 연결한다. Radial position과 glyph size, theta unit, seam/closure를 구분한다.
- 완료 조건: 기존 lower chain과 동일, theta/radius scale edit 후 수렴. Cartesian과 Polar consumer가 잘못 혼합되지 않음.

### R6-P7-W2 — Radar long-form과 explicit fold

- 상대 규모: M. 시간 약속이 아닌 변경 구조 비교다.
- 연결: F03.
- 작업: Closed line, categorical theta order, series와 radius contract를 연결한다. Wide data는 explicit Fold provenance를 통해 long-form으로 만든다.
- 완료 조건: 다른 단위 measure의 자동 정규화 없음. 명시적 per-dimension normalization 또는 same-unit 경로를 구분. Missing/tie/order/closed path 검증.

### R6-P7-W3 — Rug와 Strip placement

- 상대 규모: M. 시간 약속이 아닌 변경 구조 비교다.
- 연결: F08.
- 작업: Rug는 tick+plot edge, Strip은 point+constant/category slot으로 제공한다. Jitter를 explicit optional 배치로 재사용하고 placement 의미를 저장한다.
- 완료 조건: Dummy field 없이 drawable output. Tick/point 구별, x/y 방향, scale/Canvas edit·filter 후 anchor 유지. MCP complete-chart provider가 이 경로를 사용.

## 이 단계의 차트 계약

- [polar-point-line](../chart/polar-point-line.md) — 전체 API chain, hierarchy, 저장 결과와 variant.
- [radar](../chart/radar.md) — 전체 API chain, hierarchy, 저장 결과와 variant.
- [rug-strip](../chart/rug-strip.md) — 전체 API chain, hierarchy, 저장 결과와 variant.

## 검증과 종료

- [VALIDATION.md](../VALIDATION.md)의 공통 matrix와 각 작업의 acceptance를 적용한다.
- Runtime/type/contract/card/docs 변경은 각 conceptual change와 함께 완료한다.
- [STEP1.md](STEP1.md)의 실행 체크를 갱신하고 [GATES.md](GATES.md)에 실제 증거만 기록한다.
- R6-P7-X 승인 전 이 결과를 전제로 하는 다음 단계 구현을 시작하지 않는다.
- 구현하지 않은 후보는 완료로 표시하지 않고 [추적 원장](../TRACEABILITY.md)에 처분을 남긴다.
