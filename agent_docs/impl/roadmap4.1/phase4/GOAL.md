# Roadmap 4.1 Phase 4 — Cartesian Axis Component Lifecycle

## 목표

Existing `editXAxis`와 `editYAxis` aggregate에서 nested component option의 `false`가 axis line, ticks, labels,
tick-label group과 title을 domain-aware하게 제거하도록 한다. Selected edit/removal 전체는 첫 state change 전에
검증하고 retained component, scale, coordinate, mark encoding과 data를 보존한다.

## 진행 상태

- [x] R41-P3-A explicit approval과 active Phase 전환
- [x] R41-P4-A Gate 선언
- [x] Cartesian axis component ownership, inference와 materialization flow 전수 mapping
- [x] Nested component removal preflight와 implementation
- [x] Last-component cleanup, retained component rematerialization과 recreate behavior
- [x] Types/current contracts/ACTION_INDEX/public docs 동기화
- [x] Focused/cumulative/Browser/PNG/package verification
- [x] R41-P4-A remote checkpoint
- [ ] 사용자 explicit approval

## Gate R41-P4-A

### 승인 대상

- `line`, `ticks`, `labels`, `ticksAndLabels`, `title`의 nested `false` removal
- Group/leaf mutual exclusion과 aggregate all-selected preflight
- Retained component preservation, last-component cleanup과 ordinary recreate
- Canvas/scale edit 뒤 removed component가 되살아나지 않는 rematerialization 결과

### Required evidence

- Shortest valid x/y removal과 explicit/current/unique/ambiguous axis resolution
- Every component leaf와 tick-label group removal/recreate
- Mixed edit/removal aggregate의 all-or-nothing state와 trace
- Direct missing component removal, duplicate group/leaf와 unsupported option failure
- Semantic/config/graphic cleanup, retained component geometry와 last-component axis cleanup
- Scale/coordinate/mark encoding/data preservation and later Canvas/scale rematerialization
- Previous program과 caller-owned option immutability
- Focused/cumulative/Browser/PNG/package results and remote checkpoint

### 승인 전 차단

Phase 5 `editBin2DData` partial revision facade implementation.

## Non-goals

- Scale, coordinate, mark encoding 또는 source data removal
- Polar axis/grid lifecycle changes
- New axis component, renderer behavior or appearance vocabulary
- Standalone `removeXAxis*`/`removeYAxis*` public actions
- Generic semantic/config/graphic mutation API
