# Roadmap 4.1 Phase 7 — Distribution Owner Role Revisions

## 목표

Existing `editBoxPlot`과 `editGradientPlot`이 create-time `data`, `x`, `y`를 partial edit하도록 확장한다.
Complete categorical/quantitative role candidate와 source fields, derived consumers, scales, guides 및
selection/highlight replay를 첫 state change 전에 검증한다. Stable owner/component IDs를 유지하며 box
summary/outlier 또는 gradient profile을 immutable revision으로 교체하고 orientation change를 한 atomic transition으로
materialize한다.

## 진행 상태

- [x] R41-P6-A explicit approval과 active Phase 전환
- [x] R41-P7-A Gate 선언
- [x] Shared distribution position-role vocabulary와 ownership mapping
- [x] Box data/x/y revision과 orientation handoff
- [x] Gradient data/x/y revision과 orientation handoff
- [x] Scale/axis/grid/legend 및 selection/highlight replay 검증
- [x] Types/current contracts/ACTION_INDEX/public docs 동기화
- [x] Focused/cumulative/Browser/PNG/package verification
- [x] R41-P7-A remote checkpoint
- [x] 사용자 explicit approval

## Gate R41-P7-A

### 승인 대상

- `editBoxPlot({ data?, x?, y? })` partial owner revision
- `editGradientPlot({ data?, x?, y? })` partial owner revision
- Exactly one categorical plus one quantitative complete candidate와 orientation handoff
- Immutable sibling revisions, stable components, guide/selection replay와 orphan release

### Required evidence

- Explicit/current/unique owner와 source resolution 및 ambiguity rejection
- Omitted data/x/y provenance preservation와 complete replacement channel vocabulary
- Complete source-field/role/scale/component/guide preflight와 rejected-call atomicity
- Deterministic revision IDs, exact rebind/release trace와 stable owner/component identities
- Vertical↔horizontal orientation, retained coordinate/appearance/statistics와 axis/grid/legend handoff
- Selection/highlight final-item replay와 previous program/source/caller input immutability
- Existing appearance/statistical edit compatibility
- Focused/cumulative/Browser/PNG/package 결과와 remote checkpoint

### 승인 전 차단

Phase 8 facet columns, scale policy and guide policy editing.

## Non-goals

- Mutable source/derived dataset update or generic public data rebind/removal
- New box statistic, gradient density kernel, subgroup, notch or profile overlay
- Coordinate replacement or arbitrary position channel family expansion
- New chart, renderer, persisted schema or package entry point
