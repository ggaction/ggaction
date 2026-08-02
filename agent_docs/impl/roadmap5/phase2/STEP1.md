# STEP 1 — Category Order Assignment and Reset

## 진행 상태

- [x] Existing categorical scale/mark/guide materialization boundary 확인 시작
- [x] Independent ordering reference values와 literal fixtures 작성
- [x] Semantic grammar and resolved-domain implementation
- [x] Public action registration and declarations
- [x] Current contract/catalog/docs promotion
- [x] Focused and cumulative verification
- [ ] Remote Gate checkpoint 기록

## Approved contract

```javascript
const ordered = program.orderCategories({
  target: "bars",
  channel: "x",
  by: { field: "value", aggregate: "sum" },
  direction: "descending"
});

const automatic = ordered.removeCategoryOrder({
  target: "bars",
  channel: "x"
});
```

- `target`은 생략 시 현재 state에서 정확히 하나의 compatible mark가 결정되어야 한다.
- `channel`은 nominal/ordinal Cartesian `x | y`만 받는다.
- Explicit list의 omitted observed values와 computed ties는 stable first appearance로 정한다.
- Computed order는 resolved array만이 아니라 category/count/summary intent를 semantic state에 저장한다.
- Reassignment은 같은 target/channel assignment를 교체하며 removal은 assignment를 삭제하고 automatic domain을 복원한다.
- Scale domain, mark geometry와 connected guide는 한 domain action에서 함께 rematerialize한다.

## Required evidence

- Explicit complete/partial list, unknown/duplicate category와 literal completion order
- Category ascending/descending, count와 sum/mean/min/max including stable ties
- x/y, bar and point consumers, reassignment/removal, immutability and caller ownership
- Missing/ambiguous target, incompatible field type/channel and missing assignment atomic errors
- Axis tick/label, selection item and mark geometry parity after order/reset
- Shared and independent facet replay policy
- Declarations, Current contract, generated catalog/docs and installed consumer
