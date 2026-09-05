# Roadmap 6 Phase 4 — Baselines layouts and quantitative meaning

## 상태와 목표

상태: planned. 구현·사용자 승인 기록 없음.

차트 이름보다 먼저 baseline·layout·mapping의 의미를 완성한다. Area, Rose와 Radial bar를 정확한 측정 계약 위에 제공한다.

## 선행 조건

- [Phase 2](../phase2/GOAL.md)의 R6-P2-X 승인과 필요한 결과.

## 구체적인 작업 묶음

### R6-P4-W1 — Area baseline/range와 facade

- 상대 규모: L. 시간 약속이 아닌 변경 구조 비교다.
- 연결: F05.
- 작업: Constant data endpoint를 lower owner에 추가하고 simple area, ranged ribbon, stacked area를 구분한다. Nonlinear scale과 missing path break를 명시한다.
- 완료 조건: simple x/y 입력이 실제 area를 그림. Baseline/domain/zero/log·range edit 수렴. 가짜 source field와 renderer inference 없음.

### R6-P4-W2 — Color와 독립한 layout assignment

- 상대 규모: L. 시간 약속이 아닌 변경 구조 비교다.
- 연결: D03.
- 작업: Group/stack/fill/overlay/diverging을 atomic owner에 모은다. 기존 color.layout/measure.stack/offset 경로가 owner에 위임하도록 migration한다.
- 완료 조건: group→stack→group에서 scale, offset, normalization, guides, selections에 stale 상태 없음. Negative/missing/group conflict atomic.

### R6-P4-W3 — Rose와 Radial bar

- 상대 규모: M. 시간 약속이 아닌 변경 구조 비교다.
- 연결: D01, F04.
- 작업: Equal-angle area mode와 zero-baseline radius-length mode를 구분한다. Arc·theta/radius owner를 재사용하고 inner radius를 포함한 area mapping을 확정한다.
- 완료 조건: 값2·3·4가 모두 표현됨. Area 비율·radius-length 비율 각각 독립 수치 검증. Polar scatter 기본 encodeR는 바뀌지 않음.

### R6-P4-W4 — Theta와 legend domain order

- 상대 규모: M. 시간 약속이 아닌 변경 구조 비교다.
- 연결: D14.
- 작업: Category order를 theta에 확장한다. Vertex/stack/drawing order와 혼합하지 않고 stable tie-break, explicit order, legend-domain 연결을 정의한다.
- 완료 조건: Pie/Radar category identity가 값 수정만으로 바뀌지 않음. Omitted category/ties/unknown-order-entry policy와 edit/clear 수렴.

### R6-P4-W5 — Diverging midpoint와 scale/legend transition

- 상대 규모: M. 시간 약속이 아닌 변경 구조 비교다.
- 연결: D18.
- 작업: 명시적 semantic midpoint를 추가하고 sequential/discretized/diverging recipe transition을 shared consumers 전체와 함께 preflight한다.
- 완료 조건: 비대칭 domain에서 midpoint의 neutral color 검증. Legend 유무·복수 mark에서 전환 동일. Incompatible consumer 하나면 전부 rollback.

## 이 단계의 차트 계약

- [area](../chart/area.md) — 전체 API chain, hierarchy, 저장 결과와 variant.
- [rose-radial-bar](../chart/rose-radial-bar.md) — 전체 API chain, hierarchy, 저장 결과와 variant.

## 검증과 종료

- [VALIDATION.md](../VALIDATION.md)의 공통 matrix와 각 작업의 acceptance를 적용한다.
- Runtime/type/contract/card/docs 변경은 각 conceptual change와 함께 완료한다.
- [STEP1.md](STEP1.md)의 실행 체크를 갱신하고 [GATES.md](GATES.md)에 실제 증거만 기록한다.
- R6-P4-X 승인 전 이 결과를 전제로 하는 다음 단계 구현을 시작하지 않는다.
- 구현하지 않은 후보는 완료로 표시하지 않고 [추적 원장](../TRACEABILITY.md)에 처분을 남긴다.
