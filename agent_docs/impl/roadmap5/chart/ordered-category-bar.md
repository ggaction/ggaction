# Ordered Category Bar

## 차트 목적

Category별 total bar를 큰 값부터 배치하고, semantic order를 제거하면 observed first-appearance 순서로 되돌아가는
것을 검증한다.

## Proposed final user-facing API

```javascript
const ordered = chart()
  .createCanvas({ width: 720, height: 420 })
  .createData({ id: "sales", values })
  .createBarMark({ id: "bars" })
  .encodeX({ target: "bars", field: "category", fieldType: "nominal" })
  .encodeY({
    target: "bars",
    field: "value",
    fieldType: "quantitative",
    aggregate: "sum"
  })
  .orderCategories({
    target: "bars",
    channel: "x",
    by: { field: "value", aggregate: "sum" },
    direction: "descending"
  })
  .createGuides();

const automatic = ordered.removeCategoryOrder({
  target: "bars",
  channel: "x"
});
```

## Action hierarchy

```text
orderCategories
├─ editSemantic(category order assignment)
├─ rematerialize affected scale and mark
└─ rematerialize connected guide

removeCategoryOrder
├─ editSemantic(remove category order assignment)
├─ restore automatic observed domain
├─ rematerialize affected mark
└─ rematerialize connected guide
```

## Stored-result contract

- Target/channel owns one normalized order assignment.
- Explicit order preserves provided values and appends omitted observed values in stable first appearance.
- Computed order stores intent, not only the resolved array; resolved scale domain stores the current concrete order.
- Bar rect positions, axis ticks/labels and selections use the same resolved order.
- Earlier programs and source row order remain unchanged.

## Visual acceptance

- Descending bar order, x-axis labels and hit/selection item order agree.
- Tied totals keep source first appearance.
- Removal restores automatic order without recreating the mark or guide.
- Facet replay resolves the same shared/independent order policy explicitly rather than by child traversal accident.

## Non-goals

- Locale collation, comparator callbacks or natural-language ordering
- Reordering source rows
- Temporal axis sorting or path topology order
