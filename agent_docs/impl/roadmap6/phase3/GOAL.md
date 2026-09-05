# Roadmap 6 Phase 3 — First complete chart facades

## 상태와 목표

상태: in-progress — A 계약 package는 ready-for-review다. Phase 3의 A/V/X는 아직 승인되지 않았으며 API 구현은 미착수다. [구체 계약](CONTRACT_REVIEW.md)의 P3-C01–C07과 [검증·consumer matrix](VALIDATION.md)를 검토한다.

가장 직접적인 상위 계층 공백을 기존 domain owner 위에서 메운다. Pie를 우선 납품하고 Density·Horizon도 같은 기준으로 완성한다.

## 선행 조건

- [Phase 2](../phase2/GOAL.md)의 R6-P2-X 승인과 필요한 결과.

## 구체적인 작업 묶음

### R6-P3-W1 — Pie와 Donut 표현

- 상대 규모: M. 시간 약속이 아닌 변경 구조 비교다.
- 연결: F01.
- 작업: Category count와 explicit weighted sum의 createPiePlot을 제안한다. Donut은 arc.innerRadius로 작성하고 별도 alias는 추가하지 않는 방향이다. Color는 category 기본, guide는 legend만이며 labels/theta order는 후속 단계다.
- 완료 조건: category count·중복 category sum·donut hole·no axes/grid·하위 edit chain이 chart 계약과 일치. Facade-child semantic/graphic 동등성.

### R6-P3-W2 — Density facade

- 상대 규모: S. 시간 약속이 아닌 변경 구조 비교다.
- 연결: F06.
- 작업: Baseline-only createDensityPlot을 제안한다. 기존 KDE와 densityChannel을 재사용하고 groupBy와 color는 별도 명시하며 color는 retained group field만 지원한다. Orientation edit와 raw metadata join은 추가하지 않는다.
- 완료 조건: 세로/가로·grouped density의 값과 영역이 기존 chain과 동일. editDensity/editAreaMark/editScale 후 owner 유지.

### R6-P3-W3 — Horizon facade

- 상대 규모: S. 시간 약속이 아닌 변경 구조 비교다.
- 연결: F07.
- 작업: 필수 x/y를 받는 createHorizonPlot을 제안한다. 기존 createCoordinate로 좌표를 연결하고 encodeHorizon 뒤 explicit opacity를 적용한다. H0는 x guide만 허용하며 기존 lower guide escape는 유지한다.
- 완료 조건: signed data와 editHorizon의 revision 검증. Folded y를 원래 양적 축처럼 표시하거나 internal band color legend를 자동 생성하지 않음.

## 이 단계의 차트 계약

- [pie-donut](../chart/pie-donut.md) — 전체 API chain, hierarchy, 저장 결과와 variant.
- [density](../chart/density.md) — 전체 API chain, hierarchy, 저장 결과와 variant.
- [horizon](../chart/horizon.md) — 전체 API chain, hierarchy, 저장 결과와 variant.

## 검증과 종료

- [VALIDATION.md](../VALIDATION.md)의 공통 matrix와 각 작업의 acceptance를 적용한다.
- Runtime/type/contract/card/docs 변경은 각 conceptual change와 함께 완료한다.
- [STEP1.md](STEP1.md)의 실행 체크를 갱신하고 [GATES.md](GATES.md)에 실제 증거만 기록한다.
- R6-P3-X 승인 전 이 결과를 전제로 하는 다음 단계 구현을 시작하지 않는다.
- 구현하지 않은 후보는 완료로 표시하지 않고 [추적 원장](../TRACEABILITY.md)에 처분을 남긴다.
