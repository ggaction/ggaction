# Roadmap 5 Phase 3 — Moving Window Operations

## 목표

Existing immutable `createWindowData` pipeline에 sorted partition row frame 기반 `movingMean`/
`movingSum`을 추가하고, Phase 1 UTC month output과 결합한 monthly raw/moving line chart vertical
slice를 구현한다.

## 진행 상태

- [x] R5-P2-A explicit approval
- [x] Approved Phase 3 contract와 R5-P3-A 범위 확인
- [ ] Moving operation grammar과 deterministic row-frame resolver 구현
- [ ] Derived-data provenance, replay와 strict declarations 동기화
- [ ] Truncated edges, partitions, stable ties, sequential operations tests
- [ ] UTC monthly raw/moving line executable visual evidence
- [ ] Current contracts, docs, package와 cumulative verification
- [ ] R5-P3-A remote checkpoint
- [ ] 사용자 explicit approval

## Gate R5-P3-A

### 승인 대상

- `movingMean | movingSum` operation shapes and finite-field policy
- Required non-negative `preceding`, default-zero `following`과 current-row inclusion
- Sorted partition row offsets, truncated partition edges와 stable ties
- Multiple sequential operations, immutable provenance와 facet replay
- Runtime/type/current contract/public docs/package parity
- Phase 1 UTC month output을 사용한 raw/moving line chart

### 승인 전 차단

Phase 4 Tick primitive visual Gate와 public Tick/Angle implementation.

## Non-goals

- Duration/time-interval windows, weighted windows, centered smoothing shortcut 또는 `minPeriods`
- Missing-month resampling/imputation, generic aggregate 또는 join aggregate
- Window edit/revision action, percent rank, ntile 또는 source-row reordering
