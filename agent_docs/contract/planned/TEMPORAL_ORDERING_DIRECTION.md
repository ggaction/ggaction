# Planned Temporal, Ordering, and Direction contracts

Roadmap 5 Gate R5-P0-A에서 승인된 additive contract다. 각 항목은 owning Phase가 구현되기 전까지 public
runtime/type의 Current behavior가 아니다.

## `createTimeUnitData`

```typescript
type TimeUnit =
  | "year" | "quarter" | "month" | "day"
  | "hour" | "minute" | "second";

createTimeUnitData({
  id: UserId;
  source?: UserId;
  field: FieldName;
  unit: TimeUnit;
  as: FieldName;
}): ChartProgram;
```

- 모든 source row를 보존하고 `as` field에 UTC bucket-start finite timestamp를 쓴다.
- Source field와 output field conflict, invalid temporal value와 duplicate dataset ID는 atomic error다.
- Week, local timezone, DST와 calendar aggregation은 범위 밖이다.
- Status: Implemented in Roadmap 5 Phase 1. Canonical behavior moved to
  [`../current/CORE.md`](../current/CORE.md#createtimeunitdata).

## `orderCategories`

```typescript
type CategoryOrder =
  | { values: readonly CategoryValue[] }
  | {
      by: "category" | "count" | {
        field: FieldName;
        aggregate: "sum" | "mean" | "min" | "max";
      };
      direction?: "ascending" | "descending";
    };

orderCategories({ target?, channel: "x" | "y", ...order }): ChartProgram;
```

- Nominal/ordinal Cartesian x/y category order를 semantic assignment로 저장한다.
- Explicit list에서 빠진 observed values와 computed ties는 stable first appearance를 사용한다.
- Resolved scale, marks와 connected guides를 함께 rematerialize한다.
- Status: Implemented in Roadmap 5 Phase 2. Canonical behavior moved to
  [`../current/ENCODINGS.md`](../current/ENCODINGS.md#ordercategories).

## `removeCategoryOrder`

```typescript
removeCategoryOrder({ target?: UserId; channel: "x" | "y" }): ChartProgram;
```

- Stored order intent를 제거하고 automatic first-appearance order를 복원한다.
- Missing/ambiguous assignment는 atomic error다.
- Status: Implemented in Roadmap 5 Phase 2. Canonical behavior moved to
  [`../current/ENCODINGS.md`](../current/ENCODINGS.md#removecategoryorder).

## Capability — moving window operations

```typescript
type MovingWindowOperation = {
  op: "movingMean" | "movingSum";
  field: FieldName;
  as: FieldName;
  frame: {
    preceding: NonNegativeInteger;
    following?: NonNegativeInteger;
  };
};
```

- Existing `createWindowData.operations`에 추가한다.
- Frame은 sorted partition의 row offsets이고 current row를 포함하며 partition edge에서 truncate된다.
- `following` default는 `0`이다. Duration/weighted window와 `minPeriods`는 범위 밖이다.
- Status: Implemented in Roadmap 5 Phase 3. Canonical behavior moved to
  [`../current/CORE.md`](../current/CORE.md#createwindowdata).

## `createTickMark`

- Status: Implemented in Roadmap 5 Phase 4. Canonical behavior moved to
  [`../current/MARKS.md`](../current/MARKS.md#createtickmark).

## `editTickMark`

- Status: Implemented in Roadmap 5 Phase 4. Canonical behavior moved to
  [`../current/MARKS.md`](../current/MARKS.md#edittickmark).

## `encodeAngle`

```typescript
encodeAngle(
  | { target?: UserId; value: Finite; field?: never }
  | {
      target?: UserId;
      field: FieldName;
      fieldType?: "quantitative";
      value?: never;
    }
): ChartProgram;
```

- Point와 Tick만 지원하고 value/field degree를 scale 없이 직접 사용한다.
- 0°는 위쪽이고 양수는 시계 방향이다. `removeEncoding({ channel: "angle" })`가 reset을 소유한다.
- Angle scale/legend, radians와 다른 mark family rotation은 범위 밖이다.
- Status: Planned, accepted for Roadmap 5 Phase 4 after visual primitive approval.

## Capability — center-stacked area

```typescript
encodeY({ ..., stack: "center" }): ChartProgram;
encodeColor({ ..., layout: "center" }): ChartProgram;
```

- Non-negative aligned area series에서 각 partition을 `-total / 2`부터 deterministic series order로 쌓는다.
- `encodeColor`의 center layout은 wrapped `encodeY({ stack: "center" })`를 사용한다.
- Negative/diverging values, wiggle baseline와 centered bar는 범위 밖이다.
- Status: Planned, accepted for Roadmap 5 Phase 5 after visual primitive approval.
