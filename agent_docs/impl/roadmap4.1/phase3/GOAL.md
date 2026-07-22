# Roadmap 4.1 Phase 3 — Legend Lifecycle Completion

## 목표

Existing `editLegend` kind dispatcher가 stroke-width legend의 bounded edit vocabulary를 지원하게 하고,
`removeLegend`가 whole-target compatibility를 유지하면서 requested complete legend block만 선택적으로 제거하게 한다.

## 진행 상태

- [x] R41-P2-A explicit approval과 active Phase 전환
- [x] R41-P3-A Gate 선언
- [x] Legend block ownership, target/channel inference와 materialization flow 전수 mapping
- [x] Stroke-width `editLegend` dispatch implementation and focused tests
- [x] Selective `removeLegend({ channels })` implementation and focused tests
- [x] Types/current contracts/ACTION_INDEX/public docs 동기화
- [x] Focused/cumulative/Browser/PNG/package verification
- [x] R41-P3-A remote checkpoint
- [ ] 사용자 explicit approval

## Gate R41-P3-A

### 승인 대상

- Stroke-width legend의 title/count/labels/titleStyle bounded edit와 right-side placement 유지
- Omitted `channels` whole-target removal compatibility
- Explicit `channels`의 complete-block selection과 unrelated block preservation
- Combined categorical block partial-selection rejection과 atomic cleanup

### Required evidence

- Shortest valid edit/removal과 explicit/current/unique/ambiguous target resolution
- Stroke-width title custom/auto/false, count, partial label/title style, Canvas rematerialization
- Every legend block family의 exact channel ownership과 selective removal
- Combined block complete/partial/duplicate/incompatible channel behavior
- Mark encoding/scale preservation, semantic/config/graphic cleanup과 recreate behavior
- Previous program과 caller-owned option immutability
- Focused/cumulative/Browser/PNG/package results and remote checkpoint

### 승인 전 차단

Phase 4 Cartesian axis component lifecycle implementation.

## Non-goals

- Stroke-width legend의 position/layout/symbol/border editing
- Semantic legend channel rebinding이나 combined block splitting
- Scale, mark encoding 또는 source data removal
- New legend kind, renderer behavior or placement
