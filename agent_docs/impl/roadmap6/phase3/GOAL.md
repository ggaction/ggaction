# Roadmap 6 Phase 3 — First complete chart facades

## 상태와 목표

상태: planned. 구현·사용자 승인 기록 없음.

가장 직접적인 상위 계층 공백을 기존 domain owner 위에서 메운다. Pie를 우선 납품하고 Density·Horizon도 같은 기준으로 완성한다.

## 선행 조건

- [Phase 2](../phase2/GOAL.md)의 R6-P2-X 승인과 필요한 결과.

## 구체적인 작업 묶음

### R6-P3-W1 — Pie와 선택적 Donut facade

- 상대 규모: M. 시간 약속이 아닌 변경 구조 비교다.
- 연결: F01.
- 작업: Category count, 명시적 weighted sum, arc options, Pie guide defaults를 연결한다. Donut은 동일 owner의 alias 여부만 결정한다. Labels는 Phase 5 후속 opt-in으로 분리한다.
- 완료 조건: category count·중복 category sum·donut hole·no axes/grid·하위 edit chain이 chart 계약과 일치. Facade-child semantic/graphic 동등성.

### R6-P3-W2 — Density facade

- 상대 규모: S. 시간 약속이 아닌 변경 구조 비교다.
- 연결: F06.
- 작업: createAreaMark→encodeDensity→compatible guides를 연결한다. KDE bandwidth, grouping, densityChannel과 orientation은 기존 owner가 소유한다.
- 완료 조건: 세로/가로·grouped density의 값과 영역이 기존 chain과 동일. editDensity/editAreaMark/editScale 후 owner 유지.

### R6-P3-W3 — Horizon facade

- 상대 규모: S. 시간 약속이 아닌 변경 구조 비교다.
- 연결: F07.
- 작업: Area→encodeHorizon→x guide를 연결한다. Baseline, bands, grouping, negative amplitude의 의미를 기존 folded owner에 위임한다.
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
