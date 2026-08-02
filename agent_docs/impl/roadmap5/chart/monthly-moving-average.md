# Airline Passenger Moving Windows

## 차트 목적

U.S. Bureau of Transportation Statistics의 2024–2025 월별 미국 정기항공 domestic + international
passenger observations에 세 가지 row frame을 적용한다. Trailing mean, centered mean과 trailing sum을
한 이미지에서 비교해 `movingMean | movingSum`과 `preceding | following`의 의미를 바로 읽을 수 있게 한다.

- Source:
  `https://www.bts.gov/newsroom/monthly-passengers-us-scheduled-airlines-domestic-international-april-2023-april-2026`
- Selected range: January 2024–December 2025
- Unit: millions of passengers

## Proposed final user-facing API

```javascript
const monthly = chart()
  .createData({ id: "events", values })
  .createTimeUnitData({
    id: "monthlyPassengers",
    source: "events",
    field: "date",
    unit: "month",
    as: "month"
  });

const trailingMean = monthly.createWindowData({
  id: "trailingMean",
  source: "monthlyPassengers",
  sortBy: [{ field: "month" }],
  operations: [{
    op: "movingMean",
    field: "passengers",
    as: "movingMean",
    frame: { preceding: 2 }
  }]
});

const centeredMean = monthly.createWindowData({
  id: "centeredMean",
  source: "monthlyPassengers",
  sortBy: [{ field: "month" }],
  operations: [{
    op: "movingMean",
    field: "passengers",
    as: "movingMean",
    frame: { preceding: 2, following: 2 }
  }]
});

const trailingSum = monthly.createWindowData({
  id: "trailingSum",
  source: "monthlyPassengers",
  sortBy: [{ field: "month" }],
  operations: [{
    op: "movingSum",
    field: "passengers",
    as: "movingSum",
    frame: { preceding: 2 }
  }]
});
```

Final example은 세 program을 hconcat한다. Mean panels은 orange raw line과 blue/green moving line을 같은
`[60, 100]` domain에 겹치고, sum panel은 purple line을 `[0, 280]` domain에 그린다.

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

- BTS source values, source rows과 caller-owned options은 immutable이다.
- Time-unit transform은 source field, UTC month unit과 output field를 저장한다.
- Window transform은 normalized sort, operation과 explicit `{ preceding, following }` row frame을 저장한다.
- Moving output은 sorted partition에서 계산하지만 final dataset rows는 source order를 보존한다.
- Derived values는 ordinary temporal/quantitative line encodings에서 소비하며 renderer는 concrete path만 읽는다.

## Visual acceptance

- Trailing mean은 current + preceding 2 rows, centered mean은 preceding 2 + current + following 2 rows다.
- Trailing sum은 current + preceding 2 passenger values의 합이다.
- Partition 앞/뒤 edge에서 available rows로 truncate되는 것이 literal values와 line endpoints에서 일치한다.
- Orange raw, blue trailing mean, green centered mean과 purple trailing sum이 Canvas/SVG/PNG/PDF에서 구분된다.
- Panel title은 operation/window direction을, subtitle은 BTS source/range를 밝힌다.

## Non-goals

- Missing-month resampling, imputation 또는 generic monthly aggregation
- Duration/weighted windows, `minPeriods` 또는 smoothing interpolation
- Forecast, seasonal adjustment 또는 airline-domain analysis
