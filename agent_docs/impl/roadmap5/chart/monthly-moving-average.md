# Monthly Moving Average

## 차트 목적

월 안의 임의 날짜로 기록된 월별 관측값을 UTC month 시작으로 맞춘 뒤 raw value와 3-month moving mean을 함께
그린다. Time bucketing과 moving window가 독립적인 immutable dataset으로 남고, 원본 timestamp를 바꾸지 않는지
검증한다.

## Proposed final user-facing API

```javascript
chart()
  .createCanvas({ width: 760, height: 420 })
  .createData({ id: "events", values })
  .createTimeUnitData({
    id: "monthly-events",
    source: "events",
    field: "date",
    unit: "month",
    as: "month"
  })
  .createWindowData({
    id: "monthly-moving",
    source: "monthly-events",
    sortBy: [{ field: "month" }],
    operations: [{
      op: "movingMean",
      field: "value",
      as: "movingMean",
      frame: { preceding: 2 }
    }]
  })
  .createLineMark({ id: "monthly", data: "monthly-events" })
  .encodeX({ target: "monthly", field: "month", fieldType: "temporal" })
  .encodeY({ target: "monthly", field: "value", fieldType: "quantitative" })
  .createLineMark({ id: "moving", data: "monthly-moving", strokeWidth: 3 })
  .encodeX({ target: "moving", field: "month", fieldType: "temporal" })
  .encodeY({ target: "moving", field: "movingMean", fieldType: "quantitative" })
  .createGuides();
```

Input은 month별 한 row를 가지며 date는 그 month 안의 어느 valid timestamp여도 된다. Multiple events를 month별로
집계하는 generic aggregation이나 missing-month imputation은 이 chart와 Roadmap의 범위가 아니다.

## Action hierarchy

```text
createTimeUnitData
├─ createDerivedData
└─ materializeTimeUnitData

createWindowData
├─ createDerivedData
└─ materializeWindowData
```

## Stored-result contract

- Source datasets are immutable.
- Time-unit transform stores source field, unit, output field and UTC policy.
- Window transform stores partition, normalized sort, operations and normalized row frames.
- Derived values are concrete data values; line marks use ordinary temporal/quantitative encodings.
- Renderer sees only materialized line paths and guides.

## Visual acceptance

- Month positions and axis labels match UTC calendar starts.
- First two moving values use 1 and 2 available months; later values use current plus two preceding months.
- Raw monthly observation line and moving line remain distinguishable in all four renderers.

## Non-goals

- Resampling missing months, imputation or join aggregate
- Local timezone, DST, week start or business calendar
- Duration window or smoothing interpolation
