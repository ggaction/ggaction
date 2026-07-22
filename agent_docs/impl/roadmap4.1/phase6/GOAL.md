# Roadmap 4.1 Phase 6 — Statistical Owner Revisions

## 목표

Existing `editErrorBar`, `editErrorBand`, `editDensity`와 `editRegression`이 create-time statistical/data decisions를
partial edit하도록 확장한다. Complete candidate와 affected components/consumers를 먼저 검증하고 immutable derived
revision, explicit rebind, deterministic rematerialization과 safe orphan release를 수행한다. Error-band boundary는
statistical body와 독립적으로 disable/recreate할 수 있게 한다.

## 진행 상태

- [x] R41-P5-A explicit approval과 active Phase 전환
- [x] R41-P6-A Gate 선언
- [x] Interval/error-bar/error-band owner와 boundary ownership 전수 mapping
- [x] Error bar/band statistical revision과 boundary disable/recreate
- [x] Density source/field/group partial revision
- [x] Regression data/x/y/group partial revision
- [x] Selection/highlight, scale/guide와 component rematerialization 검증
- [x] Types/current contracts/ACTION_INDEX/public docs 동기화
- [x] Focused/cumulative/Browser/PNG/package verification
- [x] R41-P6-A remote checkpoint
- [ ] 사용자 explicit approval

## Gate R41-P6-A

### 승인 대상

- Statistical interval owner에서 `statistics.center/extent/level` partial revision
- `editErrorBand({ boundaries: false | object })` disable/recreate lifecycle
- Density `source/field/groupBy`와 regression `data/x/y/groupBy` partial revision
- Immutable revisions, component rebind, scale/guide/selection replay와 orphan release

### Required evidence

- Explicit/current/unique owner resolution and statistical-owner-only dispatch
- Every new option, omission preservation, false removal and ordinary recreation
- Complete candidate/component/consumer preflight and rejected-call atomicity
- Deterministic revision IDs, exact rebind/release trace and stable component identities
- Retained scale/coordinate/guide/appearance plus selection/highlight final-item replay
- Previous program, source rows, sibling resources and caller option immutability
- Existing valid appearance/statistical edit compatibility
- Focused/cumulative/Browser/PNG/package results and remote checkpoint

### 승인 전 차단

Phase 7 box/gradient data and positional-role revisions.

## Non-goals

- Mutable source/derived dataset update or generic public data rebind/removal
- Explicit-interval error bar/band conversion into statistical owners
- New interval center/extent method, density kernel or regression method
- Owner/component/scale/coordinate identity replacement beyond required derived revision
- Renderer, persisted schema or package-boundary changes
