# STEP 1 — Moving Mean and Sum in `createWindowData`

## 진행 상태

- [x] Existing window grammar/materialization/provenance boundary 확인
- [ ] Independent row-frame reference values와 literal fixtures 작성
- [ ] Moving operation normalization and derivation implementation
- [ ] Direct derived schema, replay and declarations promotion
- [ ] Current contract/catalog/docs/package synchronization
- [ ] Monthly moving-average chart and renderer evidence
- [ ] Focused and cumulative verification
- [ ] Remote Gate checkpoint 기록

## Approved contract

```javascript
const moving = program.createWindowData({
  id: "monthlyMoving",
  source: "monthlyEvents",
  sortBy: [{ field: "month" }],
  operations: [{
    op: "movingMean",
    field: "value",
    as: "movingMean",
    frame: { preceding: 2 }
  }]
});
```

- `movingMean | movingSum`은 existing `WindowOperation` union을 확장한다.
- `frame.preceding`은 required non-negative integer, `following`은 optional non-negative integer이며 기본 `0`이다.
- Frame은 partition을 `sortBy`로 정렬한 후의 row offset이고 current row를 포함한다.
- Partition edge에서 available rows로 truncate하며 empty output을 생성하지 않는다.
- Input field는 frame의 모든 row에서 finite number여야 하며 mean/sum output도 finite여야 한다.
- Earlier operation output을 later moving operation field로 사용할 수 있고, final rows는 source order를 보존한다.
- Normalized transform은 explicit `following: 0`을 포함하고 caller-owned options와 source program을 보유하지 않는다.

## Required evidence

- One-sided and two-sided frames, zero frame, partition edges and partitions smaller than the frame
- Ascending/descending multi-sort, stable ties and source-order output restoration
- Moving mean/sum, negative/zero/decimal values and sequential operation dependencies
- Missing/non-finite field, invalid frame, output collision and unknown option atomic errors
- Direct `createDerivedData`, trace hierarchy, transform registry and facet replay
- Strict runtime/declarations/current contract/generated docs/installed package parity
- UTC month-derived dataset의 raw monthly line과 three-row moving mean line 비교
