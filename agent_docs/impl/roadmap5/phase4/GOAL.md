# Roadmap 5 Phase 4 — Tick Mark and Direction Encoding

## 목표

Complete Cartesian x/y anchor를 가진 centered fixed-length Tick mark와 point/Tick 공용 direct-degree
`encodeAngle`을 구현한다. 먼저 unrotated Tick, rotated Tick과 rotated triangle point를 동일한 8방향 배치로
비교하는 primitive visual target과 explicit fixed-y Tick rug distribution을 승인받는다.

## 진행 상태

- [x] R5-P3-A explicit approval — 2026-08-02
- [x] Approved Phase 4 contract와 R5-P4-V/R5-P4-A 범위 확인
- [x] Independent Tick/point rotation geometry와 literal direction fixtures
- [x] Three-panel comparison과 actual-data Tick rug visual target
- [x] 두 target의 Canvas/SVG/PNG/PDF review artifacts
- [ ] Revised R5-P4-V remote checkpoint
- [ ] R5-P4-V 사용자 visual approval
- [ ] Tick grammar, materialization과 create/edit/remove lifecycle 구현
- [ ] Point/Tick angle assignment, reassignment와 removal 구현
- [ ] Declarations, Current contracts, docs, package와 stable chart 동기화
- [ ] Focused/cumulative verification과 R5-P4-A remote checkpoint
- [ ] 사용자 explicit approval

## Gate R5-P4-V

### 승인 대상

- 8방향 나침반 위치에서 unrotated Tick, field-rotated Tick과 field-rotated triangle point의 시각 비교
- 0°는 위쪽이고 양수 degree는 시계 방향인 convention
- Tick length와 point area가 angle과 무관하게 유지되고 glyph center가 x/y anchor에 고정되는 형태
- Actual Cars horsepower를 explicit fixed-y anchor에 표시하는 one-dimensional Tick rug plot
- Minimal three-panel title/labels와 concrete Canvas/SVG/PNG/PDF alignment

### 승인 전 차단

`createTickMark`, `editTickMark`, Tick compatibility, `encodeAngle`과 angle removal runtime/type/docs 구현.

## Gate R5-P4-A

### 승인 대상

- Tick default/explicit identity와 appearance, complete x/y materialization과 generic `removeMark`
- Point/Tick constant/field angle assignment, direct degrees, reassignment와 `removeEncoding({ channel: "angle" })`
- Immutable semantic state, concrete endpoints/path commands, filter/facet/Canvas replay와 renderer parity
- Runtime/type/current contract/public docs/package와 directional chart parity

### 승인 전 차단

Phase 5 center-stack primitive visual Gate와 public center layout implementation.

## Non-goals

- x-only plot-edge rug placement 자동화 또는 one-axis Tick inference
- Angle scale/legend, radians, domain normalization 또는 arbitrary transform matrix
- Text/line/rule/bar/area/rect/arc rotation
