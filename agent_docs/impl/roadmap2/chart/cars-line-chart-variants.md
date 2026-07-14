# Cars Line Chart Variants

## 목적

Roadmap 1의 cars line chart를 canonical baseline으로 고정하고 Roadmap 2 Phase 2의 path command,
curve, line editing, series reassignment, stroke dash, aggregate와 composite legend를 독립적으로 검증한다.
실행 순서와 진행 상태는 [`../phase2/GOAL.md`](../phase2/GOAL.md)와 STEP 문서가 관리한다.

## Canonical baseline

```javascript
chart()
  .createCanvas({
    width: 720,
    height: 460,
    margin: { top: 80, right: 170, bottom: 60, left: 80 }
  })
  .createData({ id: "cars", values: rows })
  .createLineMark({ id: "trends" })
  .encodeX({ field: "Year", fieldType: "temporal", scale: { nice: true } })
  .encodeY({
    field: "Acceleration",
    aggregate: "mean",
    scale: { nice: true, zero: false }
  })
  .encodeColor({ field: "Origin", scale: { palette: "tableau10" } })
  .encodeStrokeDash({ field: "Origin" })
  .createGuides({ axes: { y: { ticksAndLabels: { count: 6 } } } })
  .createTitle({
    text: "The trend of acceleration by year",
    subtitle: "from 1970 to 1982"
  });
```

Baseline의 series grain은 `Year × Origin`, y summary는 mean이다. Phase 2의 path migration 뒤에도
semantic state, rendered pixels, drawing order와 Canvas calls는 기존 baseline과 같아야 한다.

Step 1 audit에서 older primitive가 current shared defaults보다 horizontal grid, automatic dash pattern,
guide order와 title theme에서 뒤처진 것을 확인했다. Canonical baseline은 horizontal grid와 current shared
theme을 사용하는 public result로 선택했다. Primitive는 406개 valid row, first-appearance
`USA → Europe → Japan` order와 36개 `Year × Origin` mean group을 독립적으로 계산해 같은 concrete state를
명시한다. 두 program의 complete `semanticSpec`, `graphicSpec`, order와 463개 Canvas calls는 정확히 같으며
Gate 0 visual confirmation을 통과했다.

## Variant 목록

| Variant | Distinctive public call | 핵심 의미 |
| --- | --- | --- |
| `baseline` | 없음 | canonical equivalence |
| `curve-step` | `createLineMark({ id: "trends", curve: "step" })` | step command geometry |
| `curve-monotone-edit` | `.editLineMark({ curve: "monotone", strokeWidth: 4 })` | existing line graphical edit |
| `named-dash-vocabulary` | `scale: { range: ["solid", "dashed", "dotted", "dashdot"] }` | named style resolution |
| `constant-dash` | `.encodeStrokeDash({ value: "dotted" })` | scale-free constant appearance |
| `group-reassignment` | `.encodeGroup({ field: "Cylinders" })` | scale-free series repartition |
| `dash-reassignment` | `.encodeStrokeDash({ field: "Cylinders" })` | dash field/scale replacement |
| `aggregate-median` | `aggregate: "median"` | order statistic summary |
| `aggregate-dispersion` | `aggregate: "stdev"` | sample dispersion summary |
| `aggregate-quantile` | `aggregate: { op: "quantile", probability: 0.75 }` | parameterized summary |
| `aggregate-ordered` | `aggregate: { op: "first", orderBy: "Horsepower" }` | stable ordered row selection |
| `composite-legend-top` | `createLegend({ position: "top", symbol: { layers: [...] } })` | top composite layout |
| `composite-legend-bottom` | `createLegend({ position: "bottom", symbol: { layers: [...] } })` | bottom composite layout |

각 metadata는 helper 이름이 아니라 실제 expanded target user-facing chain을 저장한다.

## Path command 계약

`path`의 canonical geometry는 `commands` 하나다.

```javascript
[
  { op: "M", x: 80, y: 320 },
  { op: "L", x: 130, y: 280 },
  { op: "C", x1: 150, y1: 260, x2: 170, y2: 240, x: 190, y: 230 }
]
```

- Line은 `M`으로 시작하고 `Z`를 사용하지 않는다.
- Area는 upper boundary, connector, reversed lower boundary, `Z` 순서다.
- Renderer는 curve token이나 original point array를 읽지 않는다.
- `graphicSpec`에 `points`와 `commands`를 canonical geometry로 동시에 보관하지 않는다.
- Closed point-shape path도 같은 concrete command schema로 이동하되 equal-area geometry를 유지한다.

## Curve 계약

Shared vocabulary는 `linear`, `step`, `step-before`, `step-after`, `basis`, `cardinal`, `monotone`,
`natural`이다. `linear`가 default다. Step과 monotone을 gallery representative로 사용하고 나머지는 exact
command fixture로 검증한다. Point 수가 부족한 smooth curve는 linear로 fallback한다. Monotone은 materialized
x가 strictly increasing하지 않으면 기존 program을 바꾸지 않고 오류다.

## Dash와 reassignment 계약

Named style은 다음 concrete pattern으로 materialize한다.

```text
solid   → []
dashed  → [6, 4]
dotted  → [1, 3]
dashdot → [6, 3, 1, 3]
```

Field와 constant value는 mutually exclusive다. Constant mode는 scale/legend를 만들지 않는다. Field mode는
ordinal scale과 eligible legend를 사용한다. Field↔constant 전환 시 unused named scale은 보존하되 obsolete
legend component는 제거한다.

`encodeGroup`과 `encodeStrokeDash` reassignment는 별도 variant로 검증한다. Group/color/dash가 동시에
series partition에 참여하면 같은 field여야 한다. 두 coupled fields를 서로 다른 값으로 만드는 중간 상태를
허용하지 않으며 library가 unrelated companion을 임의로 고치지 않는다.

`named-dash-vocabulary`는 first-appearance Cylinder order의 첫 네 값 `[8, 4, 6, 3]`을 사용하고 5-cylinder
row를 제외해 네 style을 한 번씩 보여준다. `group-reassignment`는 group-only line,
`dash-reassignment`는 dash-owned line에서 실행해 다른
companion channel과의 의도적 conflict를 우회하지 않는다. Companion conflict 자체는 failure test로 남긴다.

## Aggregate 계약

모든 aggregate는 final `Year × series` grain에서 계산한다. Gallery는 median, stdev, quantile과 ordered
first를 대표로 사용한다. 다음 vocabulary 전체는 independent numeric fixture를 가진다.

```text
count, sum, mean, median, min, max,
distinct, valid, missing,
variance, varianceP, stdev, stdevP, stderr,
q1, q3, ciLower, ciUpper,
quantile(probability), first/last(orderBy, order)
```

No-valid-sample group은 graphic을 만들지 않는다. Sample dispersion/CI는 `n < 2`일 때 값을 만들지 않는다.
Explicit axis title은 보존하고 inferred title은 aggregate 표현으로 갱신한다. Full-row min/max selection은 이
scalar aggregate가 아니라 Roadmap 2 Phase 9의 `selectRows`가 소유한다.

Gate C primitive의 inferred title target은 scalar operation에 `${op}(Acceleration)`, quantile에
`quantile(Acceleration, 0.75)`, ordered selection에
`first(Acceleration, Horsepower ascending)`을 사용한다. Parameter를 title에 남겨 같은 field의 서로 다른
aggregate semantics를 구분한다.

## Composite legend 계약

Line과 point layer는 item-local origin을 공유하고 declared layer order로 겹친다. Item bounds는 모든 layer의
union이며 label은 그 뒤에 배치된다. Top/bottom은 `direction`, `columns`, `align`, `titlePosition`, border와
style을 current categorical layout과 공유한다. Margin이 부족하면 Canvas를 확장하거나 symbol을 줄이지 않고
명확한 layout error를 낸다.

## Action hierarchy

```text
editLineMark
├─ update mark materialization config
├─ rematerializeLineMark
└─ rematerializeLegend?

encodeStrokeDash(reassignment)
├─ edit/create scale?
├─ replace or remove semantic dash binding
├─ rematerializeLineMark
└─ rematerializeLegend?

encodeY(aggregate replacement)
├─ replace aggregate semantic
├─ rematerializeScale
├─ rematerializeLineMark
└─ rematerialize axes/grid
```

## 완료 조건

- 13개 gallery variant가 승인된 primitive/public pair를 가진다.
- 전체 curve/dash/aggregate vocabulary가 executable coverage를 가진다.
- Path command migration이 기존 path chart의 semantic과 rendering을 바꾸지 않는다.
- Reassignment와 edit는 target inference, ambiguity, conflict, immutability와 atomic failure를 검증한다.
- Aggregate numeric reference는 production materializer와 독립적이다.
- Public declarations, examples, tutorials, API reference와 contract catalog가 일치한다.

## Phase 2 closeout

2026-07-15에 13개 variant의 primitive/public pair, exact Canvas-call equivalence, numeric aggregate fixtures,
action-order convergence, rematerialization, inference, immutability, catalog와 public documentation 검증을
완료했다. Roadmap 2 gallery에서 모든 line-chart variant는 pair-complete 상태다.
