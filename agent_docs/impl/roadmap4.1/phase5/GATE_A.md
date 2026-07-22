# Gate R41-P5-A — Logical Bin2D Partial Revision

## Gate state

`planned`

## Review target

Phase 5의 `editBin2DData` owner resolution, immutable revision/rebind/rematerialization/release와 repeated-create
compatibility vertical slice 전체다.

## Exact public call

```javascript
program.editBin2DData({
  target: "cells",
  source: "observations",
  x: "longitude",
  y: "latitude",
  bins: { x: 20, y: 10 },
  extent: { y: [0, 100] },
  includeEmpty: true,
  members: false,
  as: {
    x0: "x0",
    x1: "x1",
    y0: "y0",
    y1: "y1",
    count: "count"
  }
});
```

`target`은 optional logical owner selector이고 나머지 option 중 최소 하나가 필요하다. Omitted option은 current
transform provenance에서 보존한다. Exact accepted nested vocabulary와 resulting trace/state는 implementation mapping과
executable evidence로 이 Gate를 `ready-for-review`로 전환할 때 고정한다.

## Required evidence

- Explicit/current/unique owner selection and missing/ambiguous rejection
- Every source/field/transform/output edit and omitted provenance preservation
- Complete-candidate validation before first state/trace change
- Immutable revision ID, logical owner continuity, direct layer rebind and dependent rematerialization
- Safe prior revision release only when no remaining consumer references it
- Previous program, caller options, source rows, sibling datasets and unrelated consumers preserved
- Repeated-create compatibility, focused/cumulative/Browser/PNG/package evidence and remote checkpoint

## Approval effect

Approval은 Phase 5 owner/provenance/revision/rebind/rematerialization/release와 compatibility 결과를 고정하고 Phase 6
statistical owner revision and error-band boundary implementation을 허용한다. PR creation, npm publishing과 docs
deployment 권한은 포함하지 않는다.

## Work blocked before approval

Phase 6 statistical owner revision and error-band boundary implementation.
