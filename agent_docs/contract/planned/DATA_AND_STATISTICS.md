# Planned Data And Statistics contracts

These contracts are accepted or pending future API work; they are not current public behavior.

## box summary and outlier data

```typescript
type BoxWhisker =
  | { type?: "tukey"; factor?: PositiveFinite }
  | { type: "minmax"; factor?: never };
```

- `createBoxPlot` owns two internal wrapped derived-data operations: a box summary and optional outlier
  selection. They remain trace-visible but are not separate direct public actions in the first contract.
- The summary stores q1, median, q3, lower whisker and upper whisker for each observed category. Tukey is the
  default with `factor: 1.5`; whiskers are the most extreme observed finite values within
  `[q1 - factor × IQR, q3 + factor × IQR]`. `minmax` uses observed finite minimum and maximum.
- Outliers are original owned row copies strictly outside Tukey whiskers. `minmax` produces no outliers.
  Category order follows first appearance and rows inside each outlier category retain source order.
- Provenance records source, category and measure fields, quantile convention, resolved
  whisker policy, generated fields and the owning box ID. Source data and old derived revisions are immutable.
- Status: Partially Current. Linear quartiles, default Tukey factor, observed whiskers, missing values,
  category order, singleton categories, outlier ownership and deterministic IDs are implemented through
  `createBoxPlot`; minmax and configurable factor coverage remain Planned.

## selectRows

```typescript
type RowSelectionMode = "min" | "max";

selectRows({
  id: UserId;
  source?: UserId;
  groupBy?: FieldName;
  orderBy: FieldName;
  select: RowSelectionMode;
}): ChartProgram;
```

- `id`는 새 derived dataset ID다. `source`를 생략하면 current dataset을 사용하며 안전하게 하나를
  추론할 수 없으면 오류다. `orderBy`와 optional `groupBy`는 source에 존재하는 non-empty field다.
- `select: "min" | "max"`는 필수이며 scalar extreme value가 아니라 선택된 source row 전체를
  deep-clone한다. `groupBy`를 생략하면 dataset 전체에서 최대 한 row, 지정하면 observed group마다
  최대 한 row를 만든다.
- Order value는 finite number 또는 string이어야 한다. 각 group에서 처음 등장한 comparable value가
  number/string type을 정하고 missing, non-finite 또는 다른 type의 row는 선택 후보에서 제외한다.
- Extreme value tie는 source order에서 먼저 등장한 row가 이긴다. Grouped output은 group의 source
  first-appearance order를 유지한다. Valid candidate가 없는 전체 dataset/group은 output row를 만들지
  않으며 empty derived dataset도 허용한다.
- Semantic provenance는 `{ type: "selectRows", source, groupBy?, orderBy, select, tie: "first" }`를
  resolved 값으로 저장한다. Wrapped `createDerivedData`가 provenance를 만들고 internal wrapped
  `materializeSelectedRows`가 immutable values를 만든다; source와 caller-owned rows는 변경하지 않는다.
- `selectRows`는 create-only action이다. Selection을 바꾸려면 새 ID로 새 derived dataset을 만들고
  mark consumer를 explicit wrapped semantic action으로 rebind한다. 자체 graphical output이나 automatic
  mark rematerialization은 수행하지 않는다.
- Status: Planned, NOT IMPLEMENTED. grouped/ungrouped min/max, numeric/string values, tie/missing/mixed
  types, empty output, provenance, ownership, trace hierarchy와 explicit consumer rebinding coverage가 필요하다.
