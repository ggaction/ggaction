# STEP 4 — Polar and Program-Composition Stored-State Contract

## 진행 상태

- [x] Polar public position naming과 degree angle syntax 확정
- [x] Polar coordinate/scale/layer stored-state boundary 설계
- [x] `hconcat`/`vconcat` package-level signature와 defaults 설계
- [x] `children` lookup과 ordered `compositionSpec` 책임 분리
- [x] Parent `graphicSpec`의 namespaced concrete snapshot 구조 설계
- [x] Nested Canvas renderer boundary와 layout formulas 설계
- [x] Chainable `.facet({ field })` shortest contract 설계
- [x] Facet child/data/scale/guide/header/title ownership 설계
- [x] Unit/composition action applicability와 validation boundary 설계
- [x] Step 4 범위 밖의 source, test, current contract와 public docs를 변경하지 않음

## 목적

Roadmap 3의 세 구조적 확장인 Polar position, completed-program composition과 chainable facet이 어떤
public call과 canonical state를 가져야 하는지 Proposed contract로 고정한다.

이 STEP은 current runtime schema를 변경하지 않는다. `ChartProgram`에 `children`이나 `compositionSpec`을
추가하지 않고, `encodeTheta`, `encodeR`, `hconcat`, `vconcat`, `facet`도 구현하지 않는다. Gate A 승인 뒤
해당 implementation Phase가 runtime, type, contract, tests와 public docs를 함께 추가한다.

## 확정된 공통 경계

```text
unit chart meaning             semanticSpec
program composition intent    compositionSpec
retained immutable programs   children
final drawable result         graphicSpec
authoring hierarchy           trace
```

- Polar position은 unit program의 `semanticSpec`에 속한다.
- `hconcat`, `vconcat`, facet layout은 Grammar-of-Graphics layer가 아니므로 `semanticSpec`에 넣지 않는다.
- Composition parent는 child semantic state를 flatten하거나 merge하지 않는다.
- Renderer는 composition에서도 오직 fully materialized parent `graphicSpec`만 읽는다.
- 모든 state update는 structural copy이며 child programs도 immutable reference로 유지된다.

## Polar public contract

### Target call chain

```javascript
const polarScatterplot = chart()
  .createCanvas({ width: 520, height: 520, margin: 48 })
  .createData({ values: cars })
  .createPointMark()
  .encodeTheta({ field: "Acceleration" })
  .encodeR({ field: "Horsepower" })
  .encodeColor({ field: "Origin" })
  .encodePointRadius({ value: 3 });
```

`encodePointRadius`는 current `encodeRadius`의 additive public alias다. 둘은 point glyph의 graphical size를
바꾸고 semantic radial position을 만들지 않는다. Polar radial position은 오직 `encodeR`이 소유하고
stored channel name은 `radius`다.

### Position signatures

첫 Polar point slice의 Proposed shape는 다음과 같다.

```typescript
encodeTheta({
  target?: UserId;
  field: FieldName;
  fieldType?: "quantitative" | "temporal" | "ordinal" | "nominal";
  scale?: {
    id?: UserId;
    type?: "linear" | "time" | "point" | "band";
    domain?: "auto" | readonly unknown[];
    range?: "auto" | readonly [FiniteDegrees, FiniteDegrees];
    nice?: boolean;
    clamp?: boolean;
    reverse?: boolean;
  };
}): ChartProgram;

encodeR({
  target?: UserId;
  field: FieldName;
  fieldType?: "quantitative";
  scale?: {
    id?: UserId;
    type?: "linear" | "log" | "pow" | "sqrt" | "symlog";
    domain?: "auto" | readonly [Finite, Finite];
    range?: "auto" | readonly [NonNegativeFinite, NonNegativeFinite];
    nice?: boolean;
    zero?: boolean;
    clamp?: boolean;
    reverse?: boolean;
    base?: PositiveFiniteExceptOne;
    exponent?: PositiveFinite;
    constant?: PositiveFinite;
  };
}): ChartProgram;
```

Aggregate, normalized angular extent와 `theta2`/`r2`는 Arc/radial-bar Phase에서 별도 contract로 확장한다.
첫 point slice는 field position만 구현하고 unsupported aggregate/datum/endpoints를 추측하지 않는다.

### Degree angle rule

Public theta range의 고정 단위는 degree다. 별도 `unit` option은 없다.

```text
0°    12시
90°   3시
180°  6시
270°  9시
360°  12시
```

- Omitted/`"auto"` range는 `[0, 360]`으로 resolve한다.
- Positive direction은 Canvas 좌표에서 clockwise다.
- Explicit range는 서로 다른 finite degree pair이며 첫 contract는 absolute span `<= 360`을 요구한다.
- Descending/negative pair도 허용하므로 `[0, -180]`은 12시에서 반시계 방향 반원을 만든다.
- `reverse: true`는 existing scale contract처럼 final range direction을 뒤집는다.
- Internal geometry에서만 `(-90 + degree) × Math.PI / 180`으로 변환한다.

Degree는 user-facing range와 resolved scale에 그대로 남고 `graphicSpec`에는 angle이 아니라 최종 Cartesian
coordinates/path commands만 저장된다.

### Radial range rule

- Omitted/`"auto"` radius range는 `[0, availableRadius]`다.
- `availableRadius = min(plotWidth, plotHeight) / 2`이며 center는 plot bounds의 center다.
- Explicit radius range는 logical Canvas pixel의 non-negative finite pair다.
- Explicit range는 Canvas resize에도 그대로 유지하고 bounds 밖으로 나가면 preflight validation error다.
- Auto range는 Canvas resize 때 다시 resolve하고 every connected Polar consumer를 rematerialize한다.

### Inference and order independence

- Default coordinate ID는 `"polar"`, theta scale ID는 `"theta"`, radial scale ID는 `"radius"`다.
- Target에 coordinate가 없으면 첫 `encodeTheta` 또는 `encodeR`가 wrapped coordinate creation을 통해
  `"polar"` coordinate를 명시적으로 저장한다.
- Compatible unique Polar coordinate가 있으면 재사용한다. Multiple candidates는 explicit ID를 요구한다.
- Cartesian x/y가 이미 있는 layer에는 theta/radius를 섞지 않고 오류를 낸다. 반대 순서도 같다.
- `encodeTheta → encodeR`과 `encodeR → encodeTheta`는 같은 final semantic, scale, graphic state를 만든다.
- 하나의 Polar channel만 있는 incomplete mark는 semantic/config를 보존하되 visible point를 만들지 않는다.

### Stored result

```javascript
semanticSpec: {
  layers: [{
    id: "point",
    data: "data",
    coordinate: "polar",
    mark: { type: "point" },
    encoding: {
      theta: {
        field: "Acceleration",
        fieldType: "quantitative",
        scale: "theta"
      },
      radius: {
        field: "Horsepower",
        fieldType: "quantitative",
        scale: "radius"
      }
    }
  }],
  scales: [
    { id: "theta", type: "linear", domain: "auto", range: "auto" },
    { id: "radius", type: "linear", domain: "auto", range: "auto" }
  ],
  coordinates: [
    { id: "polar", type: "polar" }
  ]
},

resolvedScales: {
  theta: { domain: [8, 24], range: [0, 360], ... },
  radius: { domain: [68, 455], range: [0, 212], ... }
}
```

Polar point graphics remain ordinary concrete `circle | rect | path` items with final x/y. Renderer dispatch에는
Polar branch가 필요하지 않다. Polar axes/grid가 추가되기 전 `createGuides`는 unsupported Polar guide를
부분 생성하지 않고 명확한 validation error를 낸다.

## `ChartProgram` composition state

Composition implementation은 canonical program state에 다음 두 property를 추가한다.

```javascript
{
  children: {},
  compositionSpec: {}
}
```

Unit program은 empty values를 유지한다. Composition parent는 다음처럼 저장한다.

```javascript
children: {
  left: leftProgram,
  right: rightProgram
},

compositionSpec: {
  id: "dashboard",
  type: "hconcat",
  children: ["left", "right"],
  gap: 16,
  align: "center",
  padding: { top: 0, right: 0, bottom: 0, left: 0 }
}
```

`children` object key는 lookup identity이고 `compositionSpec.children`은 graphical/layout order다. Object
iteration order를 layout contract로 사용하지 않는다. Child의 local semantic/scales/coordinates/guides와
trace는 actual child program 안에 그대로 남는다.

## `hconcat` and `vconcat`

### Package-level signature

```typescript
type CompositionChild = ChartProgram | {
  id: UserId;
  program: ChartProgram;
};

type ConcatOptions = {
  id?: UserId;
  programs: readonly [CompositionChild, CompositionChild, ...CompositionChild[]];
  gap?: NonNegativeFinite;
  align?: "start" | "center" | "end";
  padding?: NonNegativeFinite | Margin;
};

hconcat(options: ConcatOptions): ChartProgram;
vconcat(options: ConcatOptions): ChartProgram;
```

Defaults:

```text
id       "composition"
gap      16
align    "center"
padding  0 on every side
```

- `hconcat`/`vconcat`은 `ChartProgram` method가 아니라 main package named export다.
- 최소 두 program이 필요하다.
- Child는 one complete Canvas root를 가진 immutable program이어야 한다. Nested composition parent도 허용한다.
- Explicit child IDs는 unique user IDs여야 한다.
- Bare program은 input order 기반 opaque deterministic internal ID를 받는다. 이 ID spelling은 public API가
  아니며 stable replacement/inspection이 필요하면 input에서 explicit ID를 사용한다.
- 같은 immutable program instance를 다른 child IDs로 반복 사용하는 것은 허용한다.

Alignment는 cross axis에서 동작한다.

```text
hconcat start/center/end  top/center/bottom
vconcat start/center/end  left/center/right
```

`padding` scalar input은 canonical four-side object로 normalize한다. Negative/non-finite layout values,
duplicate IDs, incomplete Canvas, non-program input과 empty/singleton program array는 parent state를 만들기 전에
실패한다.

### Layout formulas

For normalized padding `P` and `n` children:

```text
hconcat width  = P.left + sum(child.width) + gap × (n - 1) + P.right
hconcat height = P.top + max(child.height) + P.bottom

vconcat width  = P.left + max(child.width) + P.right
vconcat height = P.top + sum(child.height) + gap × (n - 1) + P.bottom
```

Unequal child size는 늘이거나 scale하지 않는다. Main-axis placement는 declared order, cross-axis placement는
align으로 resolve한다. 모든 x/y/width/height는 parent `graphicSpec`에 concrete number로 저장한다.

### Parent graphical snapshot

Conceptual stored result:

```javascript
graphicSpec: {
  order: ["canvas"],
  objects: {
    canvas: {
      type: "canvas",
      properties: { width: 1056, height: 416, background: "white" },
      children: ["dashboard"]
    },
    dashboard: {
      type: "collection",
      children: ["left::canvas", "right::canvas"]
    },
    "left::canvas": {
      type: "canvas",
      properties: { x: 0, y: 48, width: 520, height: 320, background: "white", clip: true },
      children: ["left::plot-main", "left::chartTitle"]
    },
    "right::canvas": {
      type: "canvas",
      properties: { x: 536, y: 0, width: 520, height: 416, background: "white", clip: true },
      children: ["right::plot-main", "right::seriesLegendSymbols", ...]
    },
    "left::plot-main": { ... },
    "right::plot-main": { ... }
  }
}
```

`left::` notation은 설명용 namespace다. Exact internal string grammar는 private canonical key factory가
소유한다. Child object IDs, attachments와 item IDs를 같은 child namespace에 복사하여 local `canvas`, `x`,
`point` 같은 ID가 서로 충돌하지 않게 한다.

Parent `graphicSpec`에는 `ChartProgram` reference, semantic field, scale ID lookup expression 또는 layout
callback이 없다. Concrete child snapshot만 있으므로 renderer는 `children`을 조회하지 않는다.

### Nested Canvas renderer boundary

- Top-level Canvas만 physical backing store를 resize/clear한다.
- Nested Canvas는 `save → translate → clip → background → children → restore` 순서로 그린다.
- Nested Canvas width/height는 clipping과 background bounds이며 physical resize를 수행하지 않는다.
- Parent traversal은 current named-tree orphan/duplicate/cycle validation을 그대로 적용한다.
- PNG pixel ratio는 top-level transform 한 번으로 적용하고 nested logical coordinates를 바꾸지 않는다.

### Action hierarchy

```text
hconcat
├─ useProgram(left)
├─ useProgram(right)
├─ retainCompositionChildren
├─ createCanvas(parent)
└─ materializeComposition
   ├─ createGraphics(dashboard)
   ├─ snapshotProgram(left)
   ├─ snapshotProgram(right)
   └─ attach namespaced child canvases
```

`useProgram`은 child trace를 parent trace 아래 복제하지 않는다. Parent trace는 composition authoring intent를
기록하고 actual child trace는 `children[id].trace`에서 보존한다.

### Focused lifecycle

```text
editCompositionLayout({ gap?, align?, padding? })
replaceCompositionChild({ target, program })
```

- Empty edit, unknown option/child와 ambiguous target은 오류다.
- Layout edit은 child programs를 바꾸지 않고 `compositionSpec`, parent Canvas와 every placement를 다시 만든다.
- Direction은 edit하지 않는다. 다른 intent는 새 `hconcat`/`vconcat`을 호출한다.
- Replacement는 target position/ID를 유지하고 new child snapshot과 parent layout을 atomic하게 다시 만든다.
- Earlier parent와 every original child remains unchanged.

## Chainable `facet`

### Shortest call and first-slice signature

```javascript
const faceted = baseProgram.facet({ field: "Origin" });
```

```typescript
facet({
  id?: UserId;
  field: FieldName;
  data?: UserId;
  columns?: PositiveInteger;
  gap?: NonNegativeFinite;
  align?: "start" | "center" | "end";
  padding?: NonNegativeFinite | Margin;
}): ChartProgram;
```

Defaults:

```text
id       "facet"
data     unique direct source dependency
columns  number of resolved facet values (one row)
gap      16
align    "center"
padding  0 on every side
scales   shared
guides   each cell
```

`columns`가 value count보다 크면 resolved count를 저장한다. Wrapping row count는
`ceil(valueCount / columns)`다. Responsive width나 viewport를 보고 columns를 바꾸지 않는다.

### Source and value resolution

- Base program은 current `this`이고 첫 slice에서는 unit program이어야 한다.
- `data` 생략은 every affected visible layer가 하나의 direct source dataset으로 귀결될 때만 성공한다.
- Multiple independent sources, unknown field, empty values와 unsupported derived dependency는 child를 만들기
  전에 오류다.
- Facet value order는 source row의 deterministic first appearance다.
- Cell child ID는 raw value string을 ID로 사용하지 않고 input order 기반 opaque internal ID를 쓴다.
- Header text는 facet value의 deterministic display string이다.

First slice는 direct-source scatterplot, ordinary/aggregate bar와 histogram을 대상으로 한다. Regression,
density, interval/error band와 box summary dependency replay는 Phase 8 범위다.

### Child derivation

각 value마다 base program에서 immutable child를 만든다.

```text
deriveFacetCell(value)
├─ create filtered immutable dataset revision
├─ rebind affected layers
├─ preserve/recompute resolved shared scale domains from full source
├─ rematerialize marks
└─ rematerialize each-cell guides
```

Source dataset 자체는 모든 child에서 immutable하게 보존된다. Filtered dataset ID는 owner/cell namespace에서
결정하며 raw value를 ID에 삽입하지 않는다.

Shared scale은 child program object를 실제로 공유한다는 뜻이 아니다. 각 child가 독립 scale resource와
local coordinate range를 가지되 auto domain은 full facet source에서 동일하게 resolve한다. Explicit domain은
항상 그대로 유지한다. Phase 7의 only policy는 shared이며 channel별 shared/independent option은 Phase 8에서
추가한다.

### Facet stored result

```javascript
children: {
  "<cell-0>": usaProgram,
  "<cell-1>": europeProgram,
  "<cell-2>": japanProgram
},

compositionSpec: {
  id: "facet",
  type: "facet",
  children: ["<cell-0>", "<cell-1>", "<cell-2>"],
  gap: 16,
  align: "center",
  padding: { top: 0, right: 0, bottom: 0, left: 0 },
  columns: 3,
  facet: {
    data: "data",
    field: "Origin",
    values: ["USA", "Europe", "Japan"],
    cells: [
      { child: "<cell-0>", value: "USA", header: "USA" },
      { child: "<cell-1>", value: "Europe", header: "Europe" },
      { child: "<cell-2>", value: "Japan", header: "Japan" }
    ],
    scales: "shared",
    guides: "each"
  }
}
```

Angle-bracket cell IDs는 opaque internal IDs를 나타내는 문서 표기이며 literal public ID가 아니다.

### Header and title ownership

- Facet headers는 child chart title이 아니라 parent composition이 소유하는 repeated graphical component다.
- Parent `graphicSpec`에 concrete header text를 cell placement와 함께 materialize한다.
- `editFacetHeaders`는 parent header config/graphics만 바꾸고 child semantic programs를 수정하지 않는다.
- Base program에 chart title이 이미 있으면 facet action이 title semantic/config를 parent로 승격하고 derived
  child programs와 snapshots에서는 함께 제거한다. Cell마다 title을 복제하지 않는다.
- Facet 뒤 `createTitle`/`editTitle`도 parent title을 대상으로 한다.
- Existing title의 parent 승격은 Phase 1의 domain title lifecycle을 재사용하고 partial raw deletion을 하지 않는다.

### Action hierarchy

```text
facet
├─ resolveFacetSource
├─ resolveFacetValues
├─ deriveFacetCell(value) × N
│  ├─ filterData revision
│  ├─ rebindFacetLayers
│  └─ rematerialize cell consumers
├─ promoteChartTitle (when present)
├─ createFacetHeaders
└─ materializeFacetComposition
```

Facet 결과는 composition parent다. Parent에서 `editCompositionLayout`, `editFacetHeaders`, title actions은
허용한다. `encodeX`, `encodeColor`, `createPointMark`처럼 one unit/current layer를 전제로 하는 action은
explicit child-target API가 생기기 전 명확히 거부한다. `hconcat`/`vconcat`은 faceted parent를 child로 받아
nested composition을 만들 수 있다.

## Validation and immutability matrix

| Boundary | Required validation |
| --- | --- |
| Polar target | current/unique/explicit, incompatible Cartesian mix, partial completeness |
| Polar scale | field/type compatibility, degree/radius range, shared consumer compatibility |
| Concat children | at least two, complete Canvas, unique explicit IDs, nested program validity |
| Concat layout | non-negative gap/padding, align vocabulary, finite resolved bounds |
| Facet source | unit program, unique direct source, existing field, supported dependency |
| Facet values | non-empty, first-appearance order, owned scalar values and safe internal IDs |
| Parent snapshot | namespaced object/item IDs, valid attachments, no orphan/duplicate/cycle |
| Immutability | caller options, child programs, earlier parent and source rows unchanged |

Validation은 parent/child state를 만들기 전에 preflight한다. Partial children이나 half-attached snapshots을
성공 결과로 반환하지 않는다.

## Step 4 결론

- Polar angle은 fixed degree contract이며 0°=12시, positive=clockwise, auto=`[0, 360]`이다.
- `encodeR`은 glyph radius와 분리된 semantic `radius` channel이다.
- Composition parent는 ordered child IDs와 actual child lookup을 분리한다.
- Parent `graphicSpec`은 namespaced complete snapshot이며 renderer는 child programs를 읽지 않는다.
- `hconcat`/`vconcat` defaults는 gap 16, center alignment, zero padding이다.
- Facet은 chainable action이고 omitted columns는 one-row layout이다.
- Facet scales는 첫 slice에서 shared, guides는 each cell이며 existing chart title은 parent로 승격한다.
- 이 계약은 Proposed 상태이며 Gate A 승인 전 runtime/type/current contract에 추가하지 않는다.
