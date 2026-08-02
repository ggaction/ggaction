# STEP 1 — Current Evidence and Recommended Boundary

## 진행 상태

- [x] Roadmap 4.2 이후 clean `main` 기준 확인
- [x] Current temporal normalization과 axis policy 확인
- [x] Existing window transform/operation shape 확인
- [x] Categorical scale domain과 removal precedent 확인
- [x] Point-shape geometry와 public angle convention 확인
- [x] Area layout/stack vocabulary 확인
- [x] Proposed-only inventory와 Gate 질문 작성
- [x] Baseline test 결과 기록
- [x] Proposal package remote checkpoint `9c64e13c` 기록

## Baseline

시작 commit은 `4ea8a95c`이며 clean `main`에서
`codex/roadmap5-temporal-ordering-directional-marks` branch를 만들었다. Current package version은 `0.0.7`이다.

| 항목 | 결과 |
| --- | --- |
| `npm run test:contracts` | 160/160 pass |
| `npm run test:unit` | 1308/1308 pass |
| `npm run test:package` | pass, packed `ggaction@0.0.7` consumer verified |

## Current evidence

### Time

- Temporal strings, four-digit years와 finite timestamps는 내부에서 UTC timestamp로 normalize된다.
- Time scale의 nice domain과 axis formatting도 UTC getter를 사용한다.
- 따라서 new derived field가 UTC bucket-start timestamp를 반환하면 existing temporal encoding, scale와 guide를
  별도 adapter 없이 재사용할 수 있다.
- Local timezone을 받으면 DST, locale과 reproducibility 정책이 새로 필요하므로 initial scope에서 제외한다.

### Category order

- Nominal/ordinal scale은 observed first-appearance domain 또는 explicit domain을 사용할 수 있다.
- 하지만 scale domain을 직접 지정하는 것만으로는 “count가 큰 순서” 같은 semantic intent와 reset/replay를
  표현하기 어렵다.
- Existing `removePathOrder`와 `removeEncoding`은 persistent assignment에 explicit teardown이 필요하다는 precedent다.
- 추천은 target/channel에 order intent를 저장하고 resolved domain, mark geometry와 guide를 함께 다시 만드는 것이다.

### Window

- Current `createWindowData`는 immutable source, partition, stable sort와 operation list를 이미 소유한다.
- `rowNumber`, rank family, cumulative sum, lag/lead가 구현되어 있다.
- Moving mean/sum은 이 transform owner를 확장하는 것이며 별도 generic rolling engine이나 action이 필요하지 않다.
- Row frame을 explicit하게 받으면 irregular timestamp에서도 “3일”로 오해하지 않는다.

### Tick and Angle

- Current mark families에는 point와 rule이 있지만 Tick은 없다. Rule은 plot span 또는 endpoint interval을
  표현하므로 centered fixed-length item glyph와 ownership이 다르다.
- Point polygon helper는 rotation을 내부 계산에 이미 사용하지만 public per-item rotation encoding은 없다.
- Public polar convention은 degree, 0° at 12 o'clock, positive clockwise이며 Cartesian concrete vector는
  `x = sin(angle)`, `y = -cos(angle)`로 계산한다.
- 추천 Tick은 x/y center, logical-pixel length와 angle로 endpoint를 완전히 materialize한다. One-dimensional rug는
  어느 plot edge에 둘지 별도 semantics가 필요하므로 연기한다.

### Center stack

- `encodeY`는 `zero | normalize | null`, categorical area color는 `stack | fill | overlay | diverging`을 지원한다.
- Current contract가 이미 `stack: "center"`와 area `layout: "center"`를 Proposed로 기록했다.
- Existing series layout은 non-negative validation과 aligned area bounds를 소유하므로 center baseline을 추가할
  책임 위치가 명확하다.
- 첫 scope는 각 partition total의 절반을 음의 시작점으로 쓰는 symmetric baseline이다. Wiggle과 signed stacking은
  다른 알고리즘이므로 포함하지 않는다.

## Recommended exact boundary

### `createTimeUnitData`

```javascript
program.createTimeUnitData({
  id: "monthly",
  source: "events",
  field: "timestamp",
  unit: "month",
  as: "month"
});
```

- Units: year, quarter, month, day, hour, minute, second
- 모든 source row를 보존하고 `as` field만 구조적으로 추가한다.
- Invalid temporal value 또는 input/output field conflict는 전체 action을 atomic error로 만든다.
- Derived value는 finite UTC bucket-start timestamp다.

### Category order

```javascript
program.orderCategories({
  target: "bars",
  channel: "x",
  by: { field: "value", aggregate: "sum" },
  direction: "descending"
});
```

- `values`, `by: "category"`, `by: "count"`, quantitative summary 세 mode를 지원한다.
- Explicit list에 없는 observed category는 first-appearance 순으로 뒤에 붙는다.
- Computed tie는 first appearance가 deterministic fallback이다.
- `removeCategoryOrder`는 automatic first-appearance order를 복원한다.

### Moving window

```javascript
program.createWindowData({
  id: "moving",
  source: "monthly",
  sortBy: [{ field: "month" }],
  operations: [{
    op: "movingMean",
    field: "value",
    as: "movingMean",
    frame: { preceding: 2, following: 0 }
  }]
});
```

- Frame은 current row를 포함하고 sorted partition edge에서 가능한 rows만 사용한다.
- `following` 기본값은 0이다. `preceding`은 required non-negative integer다.
- Missing/non-finite measure는 current quantitative window policy처럼 error다.

### Tick and Angle

```javascript
program
  .createTickMark({ id: "directions", length: 12 })
  .encodeX({ target: "directions", field: "x", fieldType: "quantitative" })
  .encodeY({ target: "directions", field: "y", fieldType: "quantitative" })
  .encodeAngle({ target: "directions", field: "direction" });
```

- Tick은 x와 y가 모두 완성되어야 concrete line item을 만든다.
- Angle field/value는 degree 그대로 읽으며 scale이나 legend를 만들지 않는다.
- 0°는 vertical, 양수는 clockwise다. Negative와 360° 초과 finite 값은 동치 rotation으로 materialize한다.
- Point는 center와 area를 보존한 채 shape를 회전한다. Circle은 semantic angle을 허용하지만 appearance는 같다.
- `removeEncoding({ channel: "angle" })`는 0° baseline으로 복원한다.

### Center stack

```javascript
program.encodeColor({
  target: "series",
  field: "category",
  layout: "center"
});
```

- Area only, categorical series, aligned independent positions와 non-negative finite values를 요구한다.
- 각 partition은 `-total / 2`에서 시작해 기존 deterministic series order로 누적한다.
- Wrapped y assignment는 `stack: "center"`를 저장한다.
- Explicit y domain은 complete centered bounds를 포함해야 한다.

## Compatibility and architecture impact

- 모두 additive action 또는 previously rejected option value다. Existing valid calls는 그대로 유지한다.
- Time unit과 moving window는 immutable derived dataset flow를 재사용한다.
- Category order와 angle은 semantic assignment이며 domain action이 affected marks/guides를 rematerialize한다.
- Tick은 새 mark family지만 concrete output은 existing line/path-compatible primitive로 끝난다.
- Center stack은 existing area materialization과 series layout owner를 확장한다.
- Renderer, package entry와 persisted top-level program boundary는 바뀌지 않는다.
- Exact implementation으로 ownership/materialization 설명이 달라지면 Phase별로
  `SECOND_ARCHITECTURE.md`를 함께 갱신한다.

## Proposal isolation

`PROPOSALS.json`의 proposed action과 extension은 Gate 승인 전까지 runtime, declarations,
`ACTION_INDEX.json.actions`, `plannedActions` 또는 `plannedCapabilities`에 들어가지 않는다. Phase 0은 계획과
현재 API를 분리한 상태로 끝난다.
