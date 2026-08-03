# Roadmap 5 Phase 5 — Center-stacked Area Layout

## 목표

Aligned non-negative area series를 각 x position에서 `-total / 2`부터 쌓는 center layout을 구현한다.
먼저 같은 actual Jobs series를 zero stack과 center stack으로 나란히 그려 series order와 두께는 보존되고
baseline만 대칭으로 이동하는 primitive visual target을 승인받는다.

## 진행 상태

- [x] R5-P4-A explicit approval — 2026-08-03
- [x] Approved Phase 5 contract와 R5-P5-V/R5-Exit 경계 확인
- [x] Actual Jobs data의 zero/center independent reference values
- [x] Two-panel primitive visual target과 Canvas/SVG/PNG/PDF review artifacts
- [ ] R5-P5-V remote checkpoint와 사용자 visual approval
- [ ] Center layout grammar, scale-domain policy와 area materialization 구현
- [ ] `encodeY({ stack: "center" })`와 `encodeColor({ layout: "center" })` public flow
- [ ] Selection, filter/facet/Canvas replay와 renderer parity
- [ ] Declarations, Current contracts, docs, package와 stable chart 동기화
- [ ] Focused/cumulative verification과 Phase 5 remote checkpoint

## Gate R5-P5-V

### 승인 대상

- Repo의 actual Jobs data에서 선택한 5개 직군의 1850–2000 count series
- 동일한 category order, fill과 series thickness를 유지하는 zero-stack/center-stack 비교
- 각 year의 center extent가 `[-total / 2, total / 2]`이고 zero guide가 중앙을 통과하는 형태
- Minimal two-panel title, shared category key, year/value guides와 Canvas/SVG/PNG/PDF alignment
- 승인 뒤 구현할 exact target public action chain

### 승인 전 차단

`stack: "center"`, `layout: "center"`, center scale-domain policy, public declarations/current contracts/docs와
stable example 구현.

## Gate R5-Exit

### 승인 대상

- Center layout의 semantic assignment, validation, immutability와 concrete path materialization
- Area selection/highlight, filter/facet/Canvas/scale/guide replay와 four-renderer equivalence
- Roadmap 5 전체 capability의 contracts, types, docs, package와 cross-capability evidence
- 모든 Roadmap 5 Planned 항목의 Current 승격 또는 explicit resolution

### 승인 전 차단

Roadmap 5 완료 선언. PR creation, merge, release, package publish와 documentation deployment는 별도 승인 대상이다.

## Non-goals

- Wiggle baseline 또는 slope-minimizing streamgraph layout
- Negative/diverging center stack, centered bars 또는 signed-value partition
- Missing-position imputation/interpolation과 synthetic zero row
- Series-order optimizer 또는 generic stack offset callback
