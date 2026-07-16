# `ggaction` Second Architecture

## 문서의 위치

이 문서는 `ggaction`의 초기 차트 구현 단계가 끝난 뒤 실제 코드에서 확립된 현재
아키텍처를 기록한다. `INITIAL_ARCHITECTURE.md`는 최초 설계 의도와 논의의 출발점을
보존하는 역사적 문서다. 이 문서는 그 설계를 Phase 1–6의 구현, 테스트, 리팩토링을
거쳐 구체화한 두 번째 아키텍처 기준점이다.

두 문서가 다를 경우 현재 구현을 설명하는 기준은 이 문서다. 다만 이 문서도 영구히
고정된 명세는 아니다. public API, 저장 schema, action hierarchy, materialization
경계, renderer 경계 또는 package boundary가 의도적으로 바뀌면 코드와 같은
conceptual change에서 이 문서를 함께 갱신한다.

이 문서는 public user guide가 아니다. 라이브러리를 구현하거나 확장하는 사람과
agent가 다음을 빠르게 이해하기 위한 내부 아키텍처 문서다.

- 어떤 상태가 `ChartProgram`에 저장되는가
- 의미와 그래픽이 어디에서 분리되는가
- action이 어떻게 trace와 materialization을 만드는가
- scale, mark, guide, transform이 어떤 책임 경계를 가지는가
- Canvas와 PNG renderer가 무엇을 읽는가
- 새로운 기능을 어느 계층에 추가해야 하는가

## 핵심 결론

`ggaction`은 완성된 선언형 specification을 renderer가 자동으로 compile하는
라이브러리가 아니다. 사용자가 호출한 domain action이 의미 상태를 기록하고, 필요한
하위 action을 명시적으로 호출해 concrete graphic을 즉시 만든다.

```text
user-facing domain action
  → semantic decision과 provenance 저장
  → scale/data/layout 계산
  → 영향을 받는 consumer 결정
  → wrapped materialization action 호출
  → createGraphics/editGraphics로 concrete scene graph 갱신
  → action trace에 전체 hierarchy 기록
```

따라서 완료된 `ChartProgram`에는 서로 다른 목적의 두 결과가 동시에 존재한다.

```text
semanticSpec = 차트가 무엇을 의미하는가
graphicSpec  = renderer가 지금 무엇을 그려야 하는가
trace        = 사용자가 어떤 action hierarchy로 그 결과를 만들었는가
```

`semanticSpec`에서 `graphicSpec`으로 향하는 상시 compiler, observer 또는 implicit
reconciliation 단계는 없다. 의미 변경 뒤 concrete output을 다시 만드는 것은 그
변경을 소유한 action의 명시적 책임이다.

## 전체 계층

```text
Public package
├─ ggaction
│  ├─ chart()
│  └─ render()
├─ ggaction/extension
│  ├─ ChartProgram
│  └─ action()
└─ ggaction/png
   └─ renderToPNG()

Program execution
├─ ChartProgram assembly
│  └─ core program class에 built-in action registrar 적용
├─ core
│  ├─ immutable ChartProgram
│  ├─ action wrapper와 trace tree
│  └─ canonical empty specs
├─ actions
│  ├─ low-level primitives
│  ├─ reusable domain/component actions
│  └─ aggregate user-facing actions
├─ grammar
│  ├─ scale와 tick 계산
│  ├─ histogram, regression, density 계산
│  └─ pure semantic/graphic grammar validation
├─ selectors
│  └─ named semantic resource lookup
├─ layout
│  ├─ Canvas와 plot bounds
│  └─ deterministic text measurement와 wrapping
├─ materialization
│  ├─ mark completeness policy
│  └─ cross-cutting rematerialization plan
├─ theme
│  └─ shared built-in visual defaults
└─ renderers
   ├─ backend-neutral graphicSpec → Canvas 2D
   └─ Canvas 2D → Node PNG
```

## Public package boundary

패키지는 세 개의 명시적 entry point를 가진다.

### `ggaction`

기본 browser-safe entry point다.

```javascript
import { chart, render } from "ggaction";
```

- `chart()`는 모든 built-in action이 등록된 빈 immutable `ChartProgram`을 반환한다.
- `render()`는 완성된 `graphicSpec`을 Canvas 2D context에 그린다.
- Node 전용 filesystem 또는 native Canvas 의존성을 노출하지 않는다.

### `ggaction/extension`

action author를 위한 public extension boundary다.

```javascript
import { action, ChartProgram } from "ggaction/extension";
```

- `action()`으로 새로운 traceable action을 정의한다.
- `ChartProgram`을 subclass하여 extension action을 격리할 수 있다.
- `editSemantic`, `createGraphics`, `editGraphics`는 extension action 구현에서 사용할
  수 있는 low-level primitive다.
- path parser, structural-copy helper, renderer dispatch 같은 private helper는 export하지
  않는다.

### `ggaction/png`

Node 전용 adapter다.

```javascript
import { renderToPNG } from "ggaction/png";
```

`@napi-rs/canvas`, filesystem, path 처리는 이 entry point 아래에만 존재한다. Browser
entry point의 dependency graph에는 들어가지 않는다.

각 JavaScript entry point는 대응하는 TypeScript declaration을 가진다.

```text
src/index.js             ↔ types/index.d.ts
src/extension.js         ↔ types/extension.d.ts
src/renderers/png.js     ↔ types/png.d.ts
ChartProgram contract    ↔ types/program.d.ts
```

`package.json`의 export map, JavaScript export, declaration, package-boundary test는 하나의
public contract로 함께 관리한다.

## `ChartProgram`의 canonical state

현재 `ChartProgram`은 다음 상태를 소유한다.

```javascript
{
  semanticSpec,
  graphicSpec,
  resolvedScales,
  materializationConfigs,
  context,
  trace,
  actionStack
}
```

내부에는 다음 action ID를 만들기 위한 non-enumerable `_actionSequence`도 있다.

### 상태별 책임

| 상태 | 책임 |
| --- | --- |
| `semanticSpec` | dataset, transform, layer, mark, encoding, semantic scale, coordinate, guide, title 의미 |
| `graphicSpec` | renderer가 즉시 그릴 concrete backend-neutral scene graph |
| `resolvedScales` | semantic scale을 현재 data와 bounds에 적용한 concrete domain/range/bandwidth |
| `materializationConfigs` | semantic은 아니지만 재계산에 필요한 immutable graphical authoring 설정 |
| `context` | 다음 action에서 생략된 target이나 source를 해석하는 transient convenience |
| `trace` | virtual `program` root를 가진 authoring action tree |
| `actionStack` | nested wrapped action 실행 중 현재 부모 경로 |
| `_actionSequence` | deterministic action ID 생성을 위한 private counter |

### 하나의 canonical representation

같은 상태를 여러 property에 중복 저장하지 않는다. Mark, guide, Canvas, title의
materialization 설정은 모두 `materializationConfigs` 한 곳에 저장된다.

```javascript
materializationConfigs = {
  marks: { ... },
  guides: { ... },
  selections: { ... },
  highlights: { ... },
  canvas: { ... },
  title: { ... }
};
```

기존 호출부를 읽기 쉽게 하는 `markConfigs`, `guideConfigs`, `titleConfig`는 별도 상태가
아니라 이 canonical object에서 값을 읽는 getter다. `_actionSequence`처럼 serialization
대상이 아닌 bookkeeping은 enumerable state가 아니다.

`selections`는 target mark와 normalized mark-item selector intent를 저장하고 selected key 자체는 저장하지
않는다. Selector source는 서로 겹치지 않는 세 namespace다. `field`는 item member data의 unique 값,
`channel`은 scale 적용 전 resolved semantic encoding 값, `property`는 final `graphicSpec`의 concrete 값만 읽는다.
Item resolver가 현재 semantic/materialization 계산에서 point row, final bar segment/stack, line/area series 또는
rule row를 다시 만든 뒤 selection을 평가한다. Bar의 semantic position은 start `x`/`y`와 end `x2`/`y2`로
표현하고, concrete rect의 top-left `x`/`y`와 `width`/`height`는 property namespace에만 둔다. `grain: "stack"`은
stack/fill/diverging bar의 같은 category/bin rect들을 하나의 item으로 묶어 모든 attachment ID와 union concrete
bounds를 가진다. `highlights`는 그 selection에 적용할 graphical override intent의 owner다. 따라서 Canvas와
scale range 변경 뒤 stale concrete child ID를 authoritative state로 사용하지 않는다.

현재 program-level child composition state는 구현되어 있지 않다. 초기 설계에 있던
`children`, `hconcat`, `vconcat`, `facet`은 아직 현재 `ChartProgram` schema와 public
package에 포함되지 않는다.

## Immutability와 ownership

`ChartProgram`은 생성이 끝나면 freeze된다. 모든 public action과 internal wrapped
action은 기존 instance를 바꾸지 않고 새로운 instance를 반환한다.

```text
program0.createData(...) → program1
program0                  → 그대로 유지
caller-owned rows         → 이후 수정해도 program1에 영향 없음
```

불변성은 program shell만 clone하는 것으로 끝나지 않는다.

- 수정되는 object/array path는 structural copy한다.
- 변경되지 않은 frozen branch는 공유할 수 있다.
- 외부에서 받은 array와 plain object는 clone하고 freeze하여 library ownership으로
  전환한다.
- source dataset의 `values`가 한 번 저장되면 다시 수정할 수 없다.
- derived dataset도 concrete `values`가 materialize된 뒤에는 immutable하다.
- Derived transform parameter edit은 새 deterministic namespaced dataset revision을 만들고 consumer를
  explicit rebind한다. 새 program에서 참조되지 않는 이전 revision만 wrapped state-transition action으로
  제거할 수 있으며 earlier program은 기존 revision을 계속 보존한다.
- context, resolved scale, materialization config, trace도 같은 원칙을 따른다.

`_clone()`은 현재 runtime class의 constructor를 사용하므로 `ChartProgram` subclass에서도
action chain이 subclass type을 유지한다.

## `semanticSpec`

Canonical empty semantic state는 다음과 같다.

```javascript
{
  datasets: [],
  layers: [],
  scales: [],
  coordinates: [],
  guides: {},
  title: {}
}
```

### Named resource와 system slot

다음 collection은 stable `id`를 가진 named resource다. ID는 사용자가 명시하거나 ordinary
chart-authoring action이 unambiguous deterministic role default로 결정할 수 있다.

```text
datasets[].id
layers[].id
scales[].id
coordinates[].id
```

Guide와 title은 library-defined system path를 사용한다.

```text
guides.axis.x
guides.axis.y
guides.grid.horizontal
guides.grid.vertical
guides.legend.series
guides.legend.color
guides.legend.size
title.text
title.subtitle
```

Named resource ID는 closed vocabulary가 아니다. 기본 형식, 생성 시 uniqueness, 참조 시
existence를 검증한다. Channel, mark type, scale type, coordinate type처럼 라이브러리가
정한 값은 closed vocabulary로 검증한다.

첫 source dataset의 omitted ID는 `"data"`, 첫 semantic mark type별 omitted ID는
`"point" | "line" | "bar" | "area" | "rule"`로 materialize한다. 이 결정은 context에만 두지 않고
각 resource의 canonical `id`로 저장한다. 같은 dataset slot 또는 같은 mark type을 다시 만들 때
counter suffix를 자동 생성하지 않으며 explicit user ID를 요구한다. Derived data, explicit scale,
regression component처럼 다른 resource가 직접 참조하는 advanced creation action은 자체 contract가
허용하지 않는 한 ID를 계속 요구한다.

### Dataset

Source dataset은 다음처럼 row object array를 저장한다.

```javascript
{
  id: "cars",
  values: [ ... ]
}
```

Derived dataset은 source와 transform provenance를 먼저 기록한 뒤 pure grammar 계산의
결과를 concrete `values`로 저장한다.

```javascript
{
  id: "pointsRegressionData",
  source: "filteredCars",
  transform: [
    {
      type: "regression",
      method: "linear",
      x: "Displacement",
      y: "Acceleration",
      groupBy: "Origin",
      confidence: 0.95,
      interval: "mean"
    }
  ],
  values: [ ...materialized rows ]
}
```

현재 built-in derived transform은 다음과 같다.

- scalar `oneOf` membership, strict comparison, or inclusive/exclusive range filter
- grouped or ungrouped linear or polynomial least-squares regression, with mean or prediction intervals
- grouped or ungrouped LOESS regression with deterministic local neighborhoods and line-only output
- grouped or ungrouped kernel density estimation with Gaussian, Epanechnikov, uniform, or triangular kernels

Transform은 source, input/output field, group, method 및 resolved parameter를 보존한다.
Regression의 degree/span/confidence/interval과 density의 automatic bandwidth, kernel/normalization처럼 계산
결과에 영향을 주는 resolved default도 provenance에 다시 저장한다.

Filter transform은 `oneOf | predicate | range` 중 정확히 하나를 소유한다. Equality는 strict하고
ordered comparison/range는 양쪽이 모두 finite number이거나 모두 string일 때만 적용한다. Range의
`inclusive` default도 provenance에 저장하며 materialization은 source row order를 보존한다.

`filterMarks`는 ordinary chart-authoring facade다. Shared mark selector로 final point/bar/path/rule item을
고른 뒤 그 item의 member rows를 source order로 보존하는 `${markId}FilteredData`를 만들고 mark data
reference를 explicit semantic action으로 rebind한다. `markFilter` provenance는 target과 normalized selector를
기록한다. Histogram은 resolved boundaries를 semantic fixed boundaries로 승격해 subset rematerialization이
선택 전 bin identity를 바꾸지 않게 한다. 원본과 다른 mark는 그대로 유지하며 scale, mark, guide를 ordered
plan으로 rematerialize한다. 이미 만들어진 독립 statistical layer를 암묵적으로 rebind하지 않으므로 filtered
statistic은 filter 이후에 생성한다.

Interval transform은 input field, ordered `groupBy`, `mean | median` center,
`stderr | stdev | ci | iqr` extent, CI level과 distinct center/lower/upper output fields를 기록한다.
Median은 IQR과만, CI level은 CI extent와만 호환된다. `createIntervalData`는 이 provenance와 immutable
summary rows를 함께 저장한다. `createErrorBar`의 statistical mode는 이 action을 호출하고 explicit mode는
이미 center/lower/upper field를 가진 source dataset을 직접 사용한다.

### Layer와 mark

Layer는 data reference, optional coordinate, semantic mark와 encoding을 묶는다.

```javascript
{
  id: "points",
  data: "cars",
  coordinate: "main",
  mark: { type: "point" },
  encoding: { ... }
}
```

현재 semantic mark type은 다음 다섯 가지다.

```text
point
line
bar
area
rule
```

Graphic primitive와 semantic mark는 일치할 필요가 없다.

```text
semantic point → circle, rect 또는 heterogeneous collection
semantic line  → path collection
semantic bar   → rect collection
semantic area  → closed path collection
semantic rule  → line collection
```

### Encoding

현재 schema가 다루는 주요 channel은 다음과 같다.

```text
position       x, y, x2, y2, xOffset
future polar   theta, radius
appearance     color, strokeDash, size, shape, opacity
grouping       group
```

Field-driven mapping은 semantic encoding이다. Fixed radius, opacity, stroke width, fill
같은 display constant는 graphical materialization config와 concrete graphic property다.

```javascript
// semantic
encoding.color = {
  field: "Origin",
  fieldType: "nominal",
  scale: "color"
};

// semantic title override for the channel's guide
encoding.y.title = "Mean acceleration";

// graphical
materializationConfigs.marks.points.opacity = 0.27;
graphicSpec.objects.points.children[0].properties.opacity = 0.27;
```

Grouped bar의 width mode와 xOffset padding도 semantic scale에 중복 저장하지 않는다.
`materializationConfigs.marks[target].barWidth`는 mutually exclusive band/pixel intent를,
`materializationConfigs.marks[target].xOffset`은 inner/outer padding intent를 소유한다. Scale
materializer는 shared xOffset consumer의 padding policy와 parent bandwidth가 일치하는지 검증한 뒤
signed step, start와 concrete bandwidth를 `resolvedScales`에 계산한다.

`group`은 path를 series로 나누는 semantic channel이지만 scale이나 guide를 만들지
않는다. `y2`는 area upper bound이며 기존 y scale을 정확히 공유한다. `xOffset`은 ordinal
x band 안의 grouped-bar sub-band를 표현한다. Primary positional encoding의 optional `title`은
field 또는 transform provenance에서 추론되는 guide title을 명시적으로 덮어쓰는 semantic text다.
Guide materializer는 이 값을 가장 먼저 읽으며 renderer가 title을 다시 추론하지 않는다.

### Semantic scale

Scale은 named semantic resource다.

```javascript
{
  id: "x",
  type: "linear",
  domain: "auto",
  range: "auto",
  nice: true,
  zero: false
}
```

현재 direct scale type은 `linear`, transformed quantitative types, `time`, `band`, `point`, `ordinal`이다.
Category position은 width가 필요한 bar에서 `band`, center만 필요한 point/rule에서 `point`를 사용하고
appearance/offset lookup은 `ordinal`이 소유한다. Band/point는 signed step, aligned start와 각각 positive/zero
bandwidth를 resolved state에 저장한다. Channel default ID는 일반적으로
`x`, `y`, `color`, `size`, `shape`, `strokeDash`, `xOffset`처럼 channel 이름을 쓴다.
독립 scale이 필요할 때 명시적 ID를 제공한다.

같은 scale ID를 참조하는 consumer는 domain과 range를 공유한다. 현재 하나의 scale은
하나의 channel 역할에서만 공유할 수 있으며 x와 y를 동시에 설명할 수 없다. 모든
consumer의 값이 combined domain 계산에 참여한다.
Encoding이나 interval action이 `{ id }`만 전달해 existing scale을 참조하면 stored definition을
그대로 재사용한다. Action-specific defaults는 새 scale을 생성할 때만 적용한다.

Automatic continuous domain에는 `zero`가 먼저 적용되고 그 뒤 `nice`가 적용된다.
사용자가 explicit domain 또는 range를 주면 automatic policy보다 우선한다. Ordinal
domain은 source의 deterministic first-appearance order를 기본으로 사용한다.
Band/point padding과 align edit는 같은 scale을 소비하는 marks와 guides를 모두 rematerialize하며,
bar consumer가 남아 있으면 bandwidth가 없는 point type으로의 전환을 거부한다.

### Coordinate

Coordinate는 named semantic resource이며 layer가 ID로 참조한다.

```javascript
{ id: "main", type: "cartesian" }
```

Vocabulary에는 `cartesian`과 미래 확장을 위한 `polar`가 있다. x/y positional encoding은
명시하지 않으면 `main` Cartesian coordinate를 생성하고 저장한다. `theta`/`radius`의
default coordinate vocabulary와 semantic path는 준비되어 있지만, 완전한 Polar
materialization과 guide API는 아직 구현 범위가 아니다.

### Guide와 title

Guide semantic state는 어떤 scale과 coordinate를 설명하는지, 그리고 사용자에게
보이는 semantic title이 무엇인지 기록한다. Tick 길이, stroke, font, offset, legend
symbol geometry 같은 appearance는 semantic guide에 저장하지 않는다.

Chart title은 guide와 별개의 top-level semantic concept다. `title.text`와
`title.subtitle`만 의미 상태이며 실제 위치와 typography는 materialization config 및
`graphicSpec`에 저장한다.

## `graphicSpec`

Canonical empty graphic state는 다음과 같다.

```javascript
{
  objects: {},
  order: []
}
```

`objects`는 top-level graphic ID로 concrete node를 찾는 map이고, `order`는 drawing
order다. 렌더링 순서는 action 호출의 우연한 부산물이 아니라 명시적 graphical state다.

### Graphic type

현재 type은 다음과 같다.

```text
structural          canvas
homogeneous draw    circle, rect, line, text, path
heterogeneous draw  collection
```

Canvas는 logical width, height, background를 가진다. Margin은 renderer가 직접 그리는
property가 아니라 `materializationConfigs.canvas`에 저장되어 plot bounds 계산에 쓰인다.

Drawable은 단일 node 또는 concrete child collection이 될 수 있다.

```javascript
points: {
  type: "circle",
  children: [
    {
      id: "points:0",
      properties: {
        x: 31.2,
        y: 184.5,
        radius: 3,
        fill: "#4c78a8"
      }
    }
  ]
}
```

서로 다른 point shape를 한 collection에 저장해야 하면 각 child가 자신의 concrete type을 가진다.
Shared point-shape grammar가 12-value vocabulary, validation과 equal-area geometry를 한 번 소유한다.
Circle은 `circle`, square는 `rect`, 나머지 shape는 renderer-neutral closed `path`가 된다.

```javascript
points: {
  type: "collection",
  children: [
    { id: "points:0", type: "circle", properties: { ... } },
    { id: "points:1", type: "rect", properties: { ... } },
    { id: "points:2", type: "path", properties: { commands: [...], ... } }
  ]
}
```

`graphicSpec`에는 field reference, scale reference, `"auto"`, callback, backend tag 또는
renderer가 해석해야 할 declarative expression이 들어가지 않는다. Path는 최종
`M | L | C | Z` command array, text는 최종 문자열과 좌표, rect는 최종
x/y/width/height를 가진다. Path command는 하나의 `M`으로 시작하고 straight segment는
`L`, cubic segment는 `C`, closure는 마지막 `Z`로 명시한다. Line은 `Z`를 사용하지 않고
filled area와 polygon point shape는 마지막 `Z`를 저장한다. Original point array,
`closed` flag 또는 renderer-specific path string을 함께 저장하지 않는다.

### Shared concrete-graphic contract

Graphic type별 허용 property vocabulary는 하나의 schema가 소유한다. Concrete value
schema는 finite coordinate, non-negative size, opacity range, text alignment, dash array,
exact path command shape와 command ordering 등을 검증한다.

이 contract는 `editGraphics`와 Canvas renderer가 공유한다. Renderer는 실제 draw에
필요한 property가 빠졌는지 추가로 확인할 수 있지만, editor와 다른 value 규칙을
새로 정의할 수 없다.

## `resolvedScales`

`semanticSpec.scales`는 사용자가 결정하거나 action이 추론한 의미를 저장한다.
`resolvedScales`는 현재 dataset과 graphic bounds에 적용된 concrete 계산 결과다.

```javascript
resolvedScales.x = {
  type: "linear",
  domain: [40, 240],
  range: [70, 610]
};
```

Ordinal positional scale은 domain/range 외에 step과 bandwidth 같은 geometry를 가질 수
있다. `xOffset`은 parent x bandwidth를 읽어 sub-band를 만든다. Color, dash, shape,
size scale은 concrete palette 또는 range를 저장한다.

`resolvedScales`는 renderer input이 아니다. Action materializer가 concrete mark와 guide
값을 계산할 때 사용하는 immutable authoring state다. 최종 renderer는 여전히
`graphicSpec`만 읽는다.

## `materializationConfigs`

일부 graphical decision은 semantic은 아니지만 나중에 Canvas 크기나 scale이 바뀌었을
때 같은 의도로 다시 materialize하는 데 필요하다.

예:

- point의 constant radius와 opacity
- line의 stroke width
- area의 fixed fill과 opacity
- rule의 fixed stroke, width, dash와 opacity
- grouped bar의 band occupancy
- bar의 whole-mark fill, opacity와 outline appearance
- axis tick, label, title style과 requested values
- grid appearance
- legend layout, symbol recipe, border와 typography
- title/subtitle layout과 typography
- Canvas margin
- rule cap data-space anchor와 fixed logical-pixel span

이 값은 `semanticSpec`에 넣지 않고 `materializationConfigs`에 한 번만 저장한다. 실제
draw property는 다시 `graphicSpec`에 concrete하게 기록한다.

Bar의 stable whole-mark appearance는 composite bar의 geometry/statistical config와 충돌하지
않도록 `materializationConfigs.marks[target].barAppearance`가 소유한다. Materializer는
base bar recipe에 whole-mark appearance를 적용한 뒤, `highlights`의 selected-item override를
마지막에 다시 적용한다. 따라서 Canvas, scale, bin, grouping 또는 stack
rematerialization이 일어나도 whole-mark edit과 selected-item highlight가 각각의
canonical intent에서 결정적으로 복구된다.

Line/area path와 rule도 같은 stored selection/highlight protocol을 사용한다. Offset은 semantic encoding을
바꾸지 않고 final path command 또는 rule endpoint를 logical pixel 단위로 이동한다. Categorical selection이
legend field의 complete group과 정확히 일대일 대응할 때만 legend symbol에 highlight/dim appearance를
반영하며, legend label text와 item order는 유지한다. Partial group이나 unrelated selector는 legend를
바꾸지 않는다.

Owning mark가 rematerialize될 때는 해당 target의 highlight config를 잠시 분리하고 base children을 clean
baseline에서 완전히 다시 만든다. Point의 기본 fill처럼 renderer에 필요한 concrete default도 이 단계에서
복원한다. 그 다음 현재 item resolver로 selection key를 한 번 다시 계산하고 highlight, complement dimming,
selected-last order를 순서대로 적용한다. 여러 selection assignment는 각각 독립된 ID를 유지하며 같은
selection의 재호출만 그 assignment를 교체한다. 따라서 이전 highlight property나 child ID가 Canvas, scale,
encoding 또는 data-cardinality 변경 뒤 새 baseline으로 누출되지 않는다.

## Context

Context는 다음 action의 생략된 resource를 편리하게 해석한다.

```javascript
{
  currentData: "cars",
  currentMark: "points",
  currentScale: "x",
  currentCoordinate: "main",
  currentGuide: "axis.x"
}
```

`editSemantic`은 validated path에서 현재 resource를 알 수 있을 때 context도 같은
immutable transition에서 갱신한다. 별도의 public `setContext` action은 없다.

Context는 chart meaning이나 rendering의 source of truth가 아니다. Context를 제거해도
완성된 program의 semantic interpretation과 rendered output은 달라지면 안 된다.

Omitted option 해석 순서는 다음과 같다.

```text
explicit option
→ stored semantic state에서 unique inference
→ documented library default
→ 안전한 결정이 없으면 명확한 error
```

Current context가 eligible resource를 명시적으로 가리키면 그 최근 authoring state를 사용할
수 있다. Context가 없거나 eligible하지 않은데 candidate가 여러 개라면 배열의 첫 항목을
임의 선택하지 않고 explicit target/scale/coordinate를 요구한다.

Ordinary creation ID도 같은 원칙을 따른다. Stable role default가 하나뿐일 때만 omission을
허용하고 동일 역할이 이미 존재하면 explicit ID를 요구한다. Generated public-resource counter는
만들지 않는다.

Ordinary mark를 새 layer로 추가할 때 current compatible layer, otherwise one unique compatible layer에서
omitted data, coordinate와 x/y field/type/scale을 추론할 수 있다. 이 결정은 새 layer semantic state에
저장한다. Aggregate, bin, stack처럼 source mark recipe 전용인 정책은 다른 mark로 복사하지 않고,
multiple eligible sources는 explicit authoring을 요구한다.

## Action과 trace

모든 authoring action은 공용 `action({ op, description }, implementation)` wrapper로
정의한다.

```javascript
const createSomething = action(
  {
    op: "createSomething",
    description: "Create a semantic and graphical component."
  },
  function (args = {}) {
    return this
      .editSemantic(...)
      .createGraphics(...)
      .editGraphics(...);
  }
);
```

Wrapper는 다음 순서를 보장한다.

1. option object와 trace summary를 검증한다.
2. `_enterAction()`으로 새 action node를 현재 parent path 아래에 추가한다.
3. implementation을 entered immutable program에서 실행한다.
4. 내부에서 호출한 wrapped action을 현재 node의 child로 기록한다.
5. 반환값이 같은 `ChartProgram` runtime class의 instance인지 확인한다.
6. `_exitAction()`으로 stack을 pop한다.

Trace root는 항상 virtual `program` node다.

```text
program
└─ encodeHistogram
   ├─ encodeX
   │  ├─ editSemantic
   │  ├─ createScale
   │  └─ rematerializeScale
   └─ encodeY
      ├─ editSemantic
      ├─ createScale
      └─ rematerializeBarMark
```

각 node는 최소한 `id`, `op`, `description`, lightweight `args`, `children`을 가진다.
Large dataset과 materialized value array는 argument summary에서 count로 축약한다.
Circular action argument는 trace에 안전하게 저장할 수 없으므로 거부한다.

Action stack은 index path를 저장한다. 매번 tree 전체를 검색하지 않고 정확한 parent에
structural copy로 child를 추가한다. 완료된 public action chain의 stack은 비어 있다.

## API의 세 층

### Chart Authoring API

일반 사용자가 호출하는 concise domain action이다.

```text
createCanvas
createData
createPointMark / createLineMark / createBarMark / createAreaMark / createRuleMark
encodeX / encodeY / encodeX2 / encodeY2 / encodeStroke / encodeStrokeWidth
encodeColor / encodeSize / encodeShape / encodeStrokeDash / encodeOpacity
encodeHistogram / encodeDensity
createRegression / createErrorBar / createErrorBand
createGuides
createTitle / editTitle
```

필수로 결정해야 하는 값만 요구하고 나머지는 저장 state에서 infer하거나 documented
default를 사용한다.

### Advanced Domain API

명시적 resource나 guide component를 다루는 reusable action이다.

```text
createCoordinate
createScale
createDerivedData / createIntervalData
encodeXRange / encodeYRange / encodeXOffset / encodeGroup
createXAxis / createYAxis
axis line, tick, label, title component actions
directional grid actions
```

Aggregate action은 이 action을 실제 wrapped child로 호출하며 validation, inference,
materialization을 복제하지 않는다.

### Internal wrapped actions

`materialize*`와 `rematerialize*` action은 public direct-call API나 primitive가 아니다.
이들은 data, scale, mark, guide 같은 의미 있는 상위 action이 호출하는 내부 wrapped
action이며, explicit materialization 순서와 계층을 `trace`에 남긴다. 구현과 단위 테스트는
이 메서드를 직접 다룰 수 있지만 chart author와 extension author는 이를 소유한 public
domain action을 호출한다.

동일한 public facade 아래에서 같은 역할을 분담하는 component는 공개 경계를 대칭적으로
유지한다. Legend에서는 `createLegend`와 stable-resource `editLegend`가 public이고
`createCategoricalLegend`, `createSizeLegend`, `rematerialize*Legend`는 trace에 보이는 internal
wrapped component다.

### Action Authoring Primitives

모든 domain action의 가장 낮은 authoring 연산은 세 개다.

```text
editSemantic
createGraphics
editGraphics
```

이들은 extension author에게는 public이지만 일반 chart author를 위한 기본 interface는
아니다.

## Primitive action

### `editSemantic({ property, value | remove })`

Validated semantic path 하나를 upsert한다.

```text
dataset[cars].values
layer[points].encoding.x.field
scale[x].domain
coordinate[main].type
guide.axis.x.title
title.text
```

Path parser는 user-defined bracket ID와 system-supported property vocabulary를 구분한다.
Unknown path를 임의로 만들어 저장하지 않는다. Value validator는 field type, scale type,
transform schema, stack/bin policy, coordinate type 등을 검증한다.

`remove: true`는 `value`와 함께 쓸 수 없으며 supported semantic branch를 structural copy로
삭제한다. Encoding channel과 legend branch를 제거할 수 있고 빈 parent object도 함께
정리한다. Dataset state는 생성 이후 삭제하거나 교체할 수 없다. 삭제도 동일한
`editSemantic` trace node로 기록된다.

### `createGraphics({ id, type, length?, before?, after? })`

Graphic identity, type, optional homogeneous cardinality와 top-level placement를 만든다.

- Equivalent definition은 idempotent할 수 있다.
- 같은 ID의 conflicting type, length, placement는 error다.
- `before`/`after`는 explicit `graphicSpec.order`를 만든다.
- `length`는 drawable child cardinality만 만든다.
- Heterogeneous `collection`은 `editGraphics(children)`로 child를 제공한다.

### `editGraphics({ target, property, value | remove })`

기존 graphic 또는 concrete child의 property 하나를 upsert한다.

- Scalar는 homogeneous children 전체에 broadcast한다.
- Outer array는 child index별 값으로 distribute한다.
- Nested array/object item은 한 child의 값으로 그대로 저장할 수 있다.
- `length`는 collection cardinality를 immutable하게 바꾼다.
- `children` replacement는 모든 child가 기존 drawable type과 같으면 parent의
  homogeneous type을 보존한다. Child type이 섞일 때만 parent를 heterogeneous
  `collection`으로 전환한다.
- Target, property, concrete value는 shared graphic schema로 검증한다.
- `remove: true`는 property/value 없이 top-level graphic 전체와 order entry를 삭제한다.
- Generated child는 독립 삭제하지 않고 owning collection의 `length` 또는 `children`을 편집한다.

## Selector와 resource identity

Dataset, layer, scale, coordinate를 ID로 찾는 규칙은 `src/selectors/`가 소유한다.

```text
findResource    → 없으면 undefined
hasResource     → boolean
requireResource → 없으면 canonical error
resolveEligibleLayer → explicit target, current eligible target, unique candidate, error
```

Action과 schema validator는 named resource 조회를 직접 `.find()`/`.some()`으로 다시
구현하지 않는다. 반면 “이 scale을 소비하는 layer가 있는가”, “legend가 가능한 encoding이
있는가”처럼 semantic capability를 묻는 predicate query는 해당 기능 모듈이 소유한다.

## Generated internal identity

반복 가능한 aggregate action이 만드는 internal resource는 owning user resource ID를
namespace로 사용한다.

```text
points
├─ pointsRegressionData
├─ pointsRegressionBands
├─ pointsRegressionLines
└─ pointsRegressionColor
```

Density도 target area ID에서 derived data ID를 만든다. 이렇게 해야 하나의 program에서
여러 point 또는 area에 같은 aggregate action을 적용해도 충돌하지 않는다.
Density edit revision은 `${target}DensityDataRevision${n}`을 사용한다. Rebind 뒤 이전 revision이 다른
layer나 derived dataset에서 참조되지 않을 때만 `releaseDerivedData`가 semantic resource 전체를 제거한다.

Canvas처럼 program당 하나뿐인 structural slot, 현재 범위의 channel별 단일 axis처럼
library가 singularity를 보장하는 system slot은 stable system ID를 사용할 수 있다.

Ordinary chart-authoring action의 omitted dataset/mark ID는 여기서 말하는 aggregate internal
identity와 다르다. 그것은 persisted semantic resource identity이며 documented role default를
사용한다. Aggregate-derived IDs만 owning user resource ID namespace를 사용한다.

## Pure grammar와 action의 분리

Pure grammar module은 program을 수정하거나 trace node를 만들지 않는다. Input value와
semantic definition을 받아 deterministic result를 반환한다.

현재 pure calculation에는 다음이 포함된다.

- quantitative/temporal/nominal field reading
- continuous, time, ordinal domain과 range resolution
- linear mapping과 ordinal mapping
- nice numeric ticks와 calendar-aligned time ticks
- histogram bin boundary와 count
- bar grain 분류와 color layout 추론
- ranged-bar grain, shared primary/secondary scale와 band/pixel rect geometry
- grouped scalar and parameterized line/bar aggregation
- line/area series grouping과 stable ordering
- OLS coefficient와 Student-t mean-response confidence interval
- KDE bandwidth, four kernel formulas, unit/count normalization과 shared sample grid
- grouped mean/median interval과 Student-t confidence interval
- Canvas margin normalization과 plot bounds

Action은 이 계산을 호출하고 semantic provenance와 concrete output을 저장한다. 계산을
traceable action인 것처럼 가장하지 않으며, 반대로 사용자에게 의미 있는 authoring
단계를 pure helper 안에 숨기지 않는다.

## Scale resolution과 materialization

Scale action은 semantic definition과 concrete resolution을 분리한다.

```text
createScale
  → type/domain/range/nice/zero를 semanticSpec에 저장

rematerializeScale
  → 모든 semantic consumer 검색
  → combined values와 scale policy 검증
  → domain/range/bandwidth 계산
  → resolvedScales 저장
  → 직접 매핑 가능한 concrete property edit
  → 필요한 mark/guide rematerialization action 실행
```

Consumer resolution은 mark policy를 고려한다.

- ordinary point position은 row field 값을 직접 mapping한다.
- line scalar aggregation은 final temporal x/series grain에서 domain을 계산한다.
- grouped bar scalar aggregation은 final x/category cell grain에서 domain을 계산한다.
- histogram x는 shared bin policy를, y는 final stacked count를 사용한다.
- appearance scale은 deterministic ordinal domain과 palette/range를 사용한다.
- palette registry는 accepted name, family, sampling을 소유하고 concrete CSS color array만
  materialization 경계 밖으로 전달한다. renderer와 mark/legend consumer는 palette name을 해석하지 않는다.

Binned consumer와 unbinned consumer, histogram count consumer와 다른 y policy처럼 한
scale에서 의미가 충돌하는 조합은 공유하지 못한다.

## Mark materialization policy

각 semantic mark type은 자신이 concrete output을 만들 준비가 되었는지를 mark
materialization policy에 정의한다.

### Bar

Bar는 mark type만으로 geometry를 결정하지 않는다. `grammar/bars/policy.js`가 현재
semantic encoding을 하나의 canonical grain으로 분류한다.

- `histogram`: binned quantitative x + count y + zero stack
- `aggregate`: ordinal x + scalar aggregate y + non-stack

Color의 기본 layout도 같은 grain에서 추론한다. Histogram은 `stack`, aggregate bar는
`group`이며 action, scale consumer, mark materializer가 각자 이 조건을 다시 작성하지 않는다.
Pure aggregate 계산은 `grammar/bars/`, concrete rectangle 계산과 completeness 검증은
`materialization/bars/`가 소유한다.

Histogram bin authoring의 canonical shape은 `{ maxBins }`다. 기본값과 validation은
`normalizeHistogramBin` 한 곳이 소유하며 semantic encoding, scale consumer, tick과 bar
materializer는 그 normalized bin object를 전달한다. 현재 `step`과 explicit boundaries는
planned contract이므로 시각 구현 승인을 받기 전에는 지원하지 않는다.

### Point

- x/y resolved scale이 있으면 geometry를 materialize할 수 있다.
- color, size, shape field encoding을 함께 적용한다.
- size는 equal-area 값이며 모든 12개 shape recipe가 같은 target area로 정규화된다.
- field-driven mixed shape는 heterogeneous circle/rect/path collection을 만든다.
- constant radius와 opacity는 mark materialization config에서 다시 적용한다.

### Line

- x/y와 supported raw quantitative 또는 scalar/parameterized aggregate semantics가 필요하다.
- group/color/strokeDash에 따라 series를 나눈다.
- group, color, field-driven strokeDash가 함께 series identity에 참여하면 같은 field여야 한다.
- `encodeGroup`과 `encodeStrokeDash` 재호출은 기존 assignment를 원자적으로 교체한다.
  StrokeDash의 field/constant mode도 같은 action이 소유하며, 더 이상 참조하지 않는 named scale은
  resource identity를 보존하기 위해 자동 삭제하지 않는다.
- series 하나당 backend-neutral path 하나를 만든다.
- source first-appearance group order와 명시적 x sort를 사용한다.
- curve는 mark materialization config이며 `linear`, step family와 네 cubic family를 final `M/L/C`
  commands로 변환한다. `editLineMark`는 field/scale/group을 유지한 채 curve와 stroke width를 갱신한다.

### Area

- ranged area는 exactly one shared x/x2 또는 y/y2 scale pair가 필요하다.
- vertical area는 x independent position 순서로 y/y2를 닫고, horizontal area는 y independent position
  순서로 x/x2를 닫는다. 두 orientation 모두 별도 mark type 없이 ordinary area path로 저장된다.
- area curve는 line과 같은 8-value grammar를 사용한다. Lower/upper edge를 independent-axis 방향으로
  각각 interpolate하고 upper command stream을 control-point-safe하게 뒤집어 connector와 `Z`로 닫는다.
  따라서 monotone을 포함한 모든 curve가 horizontal/vertical area에서 같은 grammar를 재사용한다.
- density area는 derived density provenance와 value/density scale이 필요하다.
- group 하나당 closed path 하나를 만든다.
- density는 scale로 변환된 zero baseline에서 닫는다.
- color encoding이 있으면 group domain 순서로 fill을 적용한다.

### Rule

- Rule은 semantic `rule` layer 하나와 backend-neutral `line` collection 하나를 가진다.
- `createRuleMark`는 identity, data binding과 empty collection만 만들고 position/style을 받지 않는다.
- `encodeX`, `encodeY`, `encodeX2`, `encodeY2`가 field 또는 datum endpoint를 독립적으로 저장하며,
  secondary endpoint는 corresponding primary와 scale, coordinate, field type을 공유한다.
- x-only/y-only는 current plot bounds 전체를 지나는 vertical/horizontal line이 된다.
  `x+y+y2`와 `y+x+x2`는 bounded interval, four-endpoint assignment는 diagonal line이 된다.
- Fluent chain의 transient incomplete endpoint state는 fabricated geometry 대신 empty collection을 유지한다.
  Endpoint 조합이 완성되면 responsible encoding action이 `rematerializeRuleMark`를 호출한다.
- Constant stroke/width와 existing dash/opacity assignments는 materialization config에 저장되고 모든
  concrete line child에 적용된다. Renderer는 semantic endpoint나 full-span intent를 추론하지 않는다.
- Composite cap은 ordinary x/y anchor encoding과 graphical `fixedSpan` config를 결합한다. Canvas 또는
  scale 변경 시 span을 다시 concrete endpoint로 계산하며 renderer는 cap role이나 pixel span을 모른다.

### Bar

- Histogram은 binned x, count y, zero stack이 함께 있어야 한다.
- Grouped bar는 ordinal x, supported aggregate y, null stack, xOffset group과 bar width가 필요하다.
- final grouping grain에서 aggregate하고 observed cell만 rect로 만든다.
- Missing categorical combination을 자동으로 zero rect로 합성하지 않는다.

Aggregate grammar는 scalar operation과 parameter object를 한 canonical owner에서 검증한다.
Parameterized quantile은 finite output sample에 linear interpolation을 적용하고, ordered
`first | last`는 valid comparable `orderBy` key와 stable source-order fallback으로 row value를
선택한다. Public encoding action은 omitted ordered direction을 `"ascending"`으로 normalize해
semantic state에 저장한다. 계산 가능한 candidate가 없는 final group은 zero나 임의 row로
대체하지 않고 생략한다.

Mark가 incomplete한 중간 상태일 때 empty graphic collection은 존재할 수 있지만 잘못된
임시 geometry를 만들지 않는다. 이후 responsible encoding action이 completeness를
확보하면 mark rematerialization을 호출한다.

## Cross-cutting rematerialization plan

Canvas 또는 shared scale 변경은 여러 mark와 guide에 동시에 영향을 줄 수 있다. 이
의존성을 action마다 ad hoc method chain으로 복제하지 않고 plan으로 표현한다.

```javascript
[
  { op: "rematerializeScale", args: { id: "x" } },
  { op: "rematerializePointMark", args: { id: "points" } },
  { op: "rematerializeLegend" },
  { op: "rematerializeTitle" }
]
```

Planner는 현재 semantic state, resolved scale, materialization config, concrete graphic
presence를 읽어 applicable step만 만든다. Executor는 순서를 유지하고 같은 `op + args`
step을 deduplicate한 뒤 실제 wrapped action을 호출한다.

주요 plan은 다음과 같다.

- Canvas width/height/margin 변경 후 positional scale, complete mark, legend, title 갱신
- Scale 변경 후 해당 axis component, grid, legend consumer 갱신
- Mark type별 completeness policy에 따른 mark rematerialization
- Field-driven color/size/shape/opacity/stroke-dash 변경 후 scale, affected mark, legend 갱신

Encoding planner에서 point는 scale → mark, line/bar/rule은 mark, shared-color area는 같은 scale의
모든 area mark를 declaration order로 계획하고, 존재하는 legend를 마지막에 계획한다.

이 plan은 자동 compiler가 아니다. `editCanvas`, `rematerializeScale` 같은 명시적 action
또는 responsible encoding action implementation이 planner와 executor를 호출할 때만 실행된다.

## Canvas와 layout

`createCanvas()`는 `createGraphics(canvas)` 뒤 `editCanvas()`를 wrapped child로 호출한다.
Canvas default와 margin normalization은 layout module이 소유한다.

```text
logical Canvas bounds
  └─ normalized margin
      └─ plot bounds { left, right, top, bottom, width, height }
```

Position scale, axis, grid, title, legend는 같은 resolved Canvas/plot bounds를 사용한다.
Width, height 또는 margin이 바뀌면 auto positional range와 그 consumer를 다시
materialize한다. Background-only 변경은 geometry rematerialization을 유발하지 않는다.

Layout block은 요청한 margin 안에서 실제 occupied bounds를 계산한다. Title이나 legend가
공간에 맞지 않으면 Canvas를 몰래 확장하거나 option을 바꾸지 않고 clear layout error를
낸다.

## Axis, grid, legend, title

### Axis

`createAxes`는 persisted Cartesian encoding과 coordinate를 읽어 x/y axis applicability를
결정한다.

```text
createXAxis
├─ createXAxisLine
├─ createXAxisTicksAndLabels
│  ├─ createXAxisTicks
│  └─ createXAxisLabels
└─ createXAxisTitle
```

Y도 같은 구조를 가진다. Tick value, label text, title text는 scale과 semantic provenance에서
infer하고 concrete line/text collection을 만든다. Axis는 missing coordinate를 생성하거나
encoding을 수리하지 않는다.

### Grid

Grid는 horizontal과 vertical을 독립적으로 켜고 끌 수 있다. `createGuides`의 applicable
기본은 horizontal grid다. Grid line은 concrete `line` collection이며 mark보다 뒤에
그려지도록 explicit placement를 사용한다. Axis tick value가 있으면 같은 값을 재사용할
수 있다. `editHorizontalGrid`와 `editVerticalGrid`는 existing semantic scale/coordinate
binding을 유지하면서 direction별 tick policy와 appearance config를 바꾸고, 대응하는
wrapped `rematerialize*Grid` action으로 concrete collection 전체를 다시 만든다.

### Legend

Categorical legend는 color, strokeDash, shape와 mark recipe를 하나의 generic legend
layout/materialization pipeline으로 조립한다.

```text
semantic role      categorical legend
mark-specific view symbol recipe
layout             position/direction/columns/title/border
graphics           background + layered symbols + labels + title
```

Line, point, rect/area symbol 차이는 complete legend implementation fork가 아니라 symbol
recipe로 표현한다. Point quantitative size legend는 별도 quantitative recipe를 사용하지만
`createLegend`와 `createGuides`의 public flow 안에서 함께 조정된다.

Encoding reassignment는 existing categorical legend의 inferred field/title/domain/symbol을
갱신하되 explicit title과 appearance config를 보존한다. Field-driven strokeDash를 constant로
바꾸면 strokeDash component만 제거하고, 남는 channel이 없을 때만 legend resource와 graphics를
제거한다.

Chart-independent legend default는 right다. Top/bottom, horizontal/vertical direction,
columns, alignment, title position, border 등은 explicit option이다.
Categorical/composite/size의 left side layout은 item 내부 symbol→label 순서와 resolved domain
순서를 보존하고 multiple blocks를 top-to-bottom으로 쌓는다. Categorical과 size가 같은 target이면
하나의 occupied bounds와 border를 공유하며 y-axis guide와 left margin 충돌을 함께 검증한다.
`editLegend`는 channel/scale binding을 바꾸지 않고 nested appearance/layout config만 부분 merge한 뒤
kind별 wrapped rematerialization을 호출한다.

### Title

Title은 guide와 별도 stable resource다. `createTitle`과 `editTitle`이 main title과 optional
subtitle을 concrete text node로 만들며 alignment, position, offset, gap, wrapping과 font는
materialization config가 소유한다.

Top/bottom title은 horizontal block이고 left/right title은 complete reading block을 각각
`-Math.PI / 2`, `Math.PI / 2`로 회전한다. `maxWidth`가 있으면 shared deterministic text
metric이 word 또는 Unicode code-point character wrapping을 계산한다. Oversized word는
character fallback을 사용한다. Resolved line break, line coordinate와 rotation은
`graphicSpec`의 single text 또는 text collection에 저장되고 renderer는 다시 측정하거나 wrap하지 않는다.

Edit은 omitted property를 유지하고 supplied style leaf만 merge한다. Subtitle removal/restoration과
single/collection 전환은 stable graphic ID 아래에서 stale child 없이 reconcile한다. Title block은
actual occupied bounds로 requested margin과 same-edge guide collision을 검증하며 Canvas를 자동 확장하지 않는다.

### Drawing order

Grid, mark, axis, legend, title의 order는 `createGraphics({ before, after })`로 명시한다.
예를 들어 grid는 mark 뒤가 아니라 mark 아래에 있어야 한다. Rematerialization은 기존
node의 값만 갱신하며 의도한 top-level order를 보존한다.

## Aggregate action hierarchy

Aggregate action은 user-facing intent를 concise하게 표현하되 기존 wrapped child를 실제로
호출한다.

### Histogram

```text
encodeHistogram
├─ encodeX(bin)
└─ encodeY(count, stack)
```

x와 y를 따로 authoring하면 incomplete histogram 의미가 되기 때문에 하나의 atomic
domain action을 제공한다.

### Density

```text
encodeDensity
├─ createDensityData
│  ├─ createDerivedData
│  └─ materializeDensityData
├─ editSemantic(layer.data = derived dataset)
├─ encodeX
├─ encodeY
├─ encodeGroup? 
└─ rematerializeAreaMark
```

`densityChannel`에 따라 value와 density field가 x/y 중 어느 쪽에 놓이는지 결정한다.

```text
editDensity
├─ createDensityData(new revision)
├─ editSemantic(layer.data = new revision)
├─ releaseDerivedData(old revision, only when orphaned)
└─ rematerialize affected shared-scale marks and guides
```

Density edit은 source, output field, orientation과 scale binding을 유지한다. 전달된 statistical parameter만
새 revision provenance에 적용하며 이전 derived values를 덮어쓰지 않는다.

### Regression

```text
createRegression
├─ createRegressionData
├─ createRegressionBand
│  ├─ createErrorBand (explicit interval mode)
│  │  ├─ createAreaMark
│  │  ├─ encodeX
│  │  ├─ encodeYRange
│  │  └─ encodeGroup?
│  ├─ editSemantic (remove generic interval title)
│  └─ editAreaMark? (outline)
└─ createRegressionLine
   ├─ createLineMark
   ├─ encodeX
   ├─ encodeY
   ├─ encodeColor?
   └─ encodeGroup?
```

Target point mark의 x/y, coordinate, scale, color/shape grouping을 unique하게 infer할 수
있다. Multiple group candidates가 있으면 `groupBy`를 요구한다. Regression band wrapper는 derived
regression provenance를 검증하고 generic error band의 explicit interval composition을 재사용한다.
Regression-specific IDs/default appearance와 기존 semantic output은 wrapper가 보존한다.

### Error bar

```text
createErrorBar
├─ createIntervalData? (statistical mode only)
│  ├─ createDerivedData
│  └─ materializeIntervalData
├─ createRuleMark + encodeX/encodeY + encodeX2/encodeY2
├─ appearance encoding actions
├─ createErrorBarCap? (caps enabled)
│  └─ materializeRuleSpan
└─ createErrorBarCap? (caps enabled)
   └─ materializeRuleSpan
```

Exactly one of x/y is categorical/ordinal/temporal position이고 다른 하나는 quantitative interval이므로
vertical과 horizontal orientation을 같은 action이 infer한다. Statistical mode는 source row에서
mean/median interval을 만들고 explicit mode는 existing center/lower/upper field를 사용한다. Existing encoded
layer에서 data, coordinate, x/y field와 scale을 추론할 때 mark type이 아니라 persisted encoding capability를
selector predicate로 검사한다. Color는 appearance이고 `encoding.group`만 추가 statistical grouping으로
해석한다. Main rule과 optional fixed-pixel caps는 shared stroke/width/dash/opacity assignment를 사용하며
ordinary resource로 저장된다. 별도 composite registry는 만들지 않는다.

### Error band

```text
createErrorBand
├─ createIntervalData? (statistical mode only)
├─ createAreaMark
├─ encodeX + encodeYRange (vertical)
│  └─ encodeY + encodeY2
├─ encodeY + encodeXRange (horizontal)
│  └─ encodeX + encodeX2
├─ encodeGroup?
├─ createErrorBandBoundary? (lower)
└─ createErrorBandBoundary? (upper)
```

Vertical contract에서 x는 quantitative 또는 temporal independent position이고 y/y2는 quantitative
lower/upper interval이다. Horizontal contract는 이를 y independent position과 x/x2 interval로 바꾼다.
Statistical mode는 independent position과 optional group field로 immutable interval
rows를 만들며 explicit mode는 existing center/lower/upper fields를 사용한다. Existing encoded source가
있으면 persisted data, coordinate, compatible scales와 explicit group을 재사용하고, 두 quantitative axes처럼
interval role이 유일하지 않으면 추측하지 않는다. `createErrorBand`는 ordinary area와 derived dataset을
조합하며 별도 composite registry를 만들지 않는다. Field-driven fill은 aggregate option이 아니라 existing
`encodeColor`가 소유한다. Optional lower/upper boundaries는 deterministic ordinary line layers이며 band
뒤에 그린다. Band curve는 area mark config로 concrete commands를 만들고 boundary curve는 기본적으로
이를 상속하되 명시적으로 override할 수 있다. Shared stroke, width, dash, opacity는 boundary children의
concrete appearance로 저장된다. Aggregate는 independent lower/upper appearance object를 받지 않으며,
서로 다른 style이 필요하면 deterministic ordinary boundary line child를 각자 편집한다.

### Guides

```text
createGuides
├─ createAxes?   
├─ createGrid?
└─ createLegend?
```

Omission은 persisted semantic state를 기준으로 applicability를 infer하고, `{}`는 해당
component를 inferred detail로 명시 선택하며, `false`는 명시적으로 끈다.

## Built-in visual default

Library-wide visual token은 theme module이 한 번 정의한다.

```text
default mark color
normal/strong/muted text color
grid color
border color
size symbol color
regression band color
default font family
```

Action이나 guide recipe가 같은 hex/font literal을 독립적으로 복제하지 않는다. 특정
action의 semantic하지 않은 operation default는 그 action 또는 관련 layout/recipe가
소유하되, 여러 feature가 공유하는 token은 theme owner로 올린다.

## Canvas renderer

`render(program, context, { pixelRatio })`는 `program.graphicSpec`만 읽는다.

1. Canvas 2D context capability를 검증한다.
2. `graphicSpec.order`에서 정확히 하나의 ordered Canvas를 찾는다.
3. Logical width/height와 background를 읽는다.
4. Physical Canvas 크기를 `logical × pixelRatio`로 설정한다.
5. Context를 logical coordinate system으로 scale한다.
6. Top-level order를 순서대로 순회한다.
7. Graphic type dispatch table로 primitive drawer를 호출한다.
8. Heterogeneous collection은 child type별로 재귀 dispatch한다.

Primitive drawer는 `circle`, `rect`, `line`, `text`, `path`별 파일에 분리되어 있다.
Drawer는 shared concrete schema와 draw completeness를 확인한 뒤 Canvas command를
실행한다. 각 graphic 사이에서 alpha, dash, transform state가 누출되지 않도록 Canvas
state를 관리한다.

Renderer는 다음을 절대 하지 않는다.

- dataset field 읽기
- scale domain/range 추론
- mark grouping 또는 aggregation
- semantic guide 해석
- context나 trace 읽기
- missing graphic 자동 생성

## PNG adapter

`renderToPNG`는 Node에서 1×1 native Canvas를 만든 뒤 같은 Canvas renderer를 호출한다.
Renderer가 logical size와 `pixelRatio`를 적용하고, adapter는 PNG buffer를 만들어 지정
경로에 쓴다.

```javascript
const result = await renderToPNG(program, {
  output: "chart.png",
  pixelRatio: 2
});
```

반환값은 absolute output path, physical width/height, pixel ratio, byte length를 가진다.
Pixel ratio는 renderer option일 뿐 `graphicSpec`의 logical coordinate를 바꾸지 않는다.

## Source ownership

```text
src/
├─ ChartProgram.js      core class와 built-in action의 assembly boundary
├─ actions/
│  ├─ canvas/          Canvas domain actions
│  ├─ boxPlots/        vertical/horizontal Tukey/minmax box aggregate and wrapped components
│  ├─ coordinates/     coordinate authoring
│  ├─ data/            source/derived data actions
│  ├─ encodings/       position, color, stroke-dash, ranged, atomic encoding actions
│  ├─ errorBars/       rule-based interval aggregate와 cap components
│  ├─ errorBands/      ranged-area interval aggregate orchestration
│  ├─ intervals/       interval composite source/channel/scale inference
│  ├─ guides/          axes, grids, categorical/continuous/size legends와 aggregate guides
│  ├─ marks/           point, line, bar, area create/rematerialize
│  ├─ primitives/      editSemantic/createGraphics/editGraphics와 stateful semantic validation
│  ├─ regression/      regression aggregate, component actions와 inference policy
│  ├─ scales/          semantic scale create/resolve/materialize
│  └─ titles/          chart title actions
├─ core/               action-free ChartProgram, action wrapper, immutable ownership, empty specs
│  └─ vocabulary.js    implemented mark/channel/legend closed vocabulary
├─ grammar/            pure Grammar-of-Graphics/statistical/schema calculations
│  └─ bars/            bar grain policy와 aggregate 계산
├─ layout/             Canvas/plot bounds와 deterministic text layout
├─ materialization/    mark completeness policy와 cross-cutting dependency plan
│  └─ bars/            bar completeness와 concrete rectangle 계산
├─ renderers/          Canvas primitive renderer와 PNG adapter
├─ selectors/          named semantic resource lookup
└─ theme/              shared built-in visual token
```

Chart example 이름에 따라 source implementation을 나누지 않는다. Histogram, grouped
bar, regression 같은 chart-level capability가 필요하더라도 reusable mark, encoding,
transform, guide 책임으로 분해한다. Chart-specific 완성 flow는 example, test program,
tutorial과 `agent_docs/impl/roadmapN/chart/` 계약에 둔다.

각 action category의 `index.js`는 registrar boundary다. `actions/index.js`가 모든 built-in
registrar를 한 번 조립하고 top-level `ChartProgram.js`가 이를 core program subclass에 등록한다.
따라서 `core/`는 `actions/`를 import하지 않는다. `grammar/`는 core utility와 다른 pure grammar만,
`materialization/`은 core/grammar/layout/selectors/theme만 의존한다. 이 방향과 local import cycle
부재는 source-boundary contract test가 검증한다.

서로 다른 closed vocabulary와 reassignment lifecycle을 가진 encoding은 한 파일에 묶지 않는다.
예를 들어 color와 stroke-dash는 같은 categorical scale 계열을 일부 공유하더라도 각각 독립된
action module과 registrar를 가진다.

Composite domain action도 registrar에 구현을 두지 않는다. Regression은 target/group inference,
band·line component action, top-level orchestration을 별도 module로 유지하고 `index.js`는 등록과
re-export만 담당한다.

Guide module은 concrete recipe 기준으로 나눈다. Continuous legend의 공통 validation/layout
utility, gradient strip recipe, opacity symbol recipe를 분리하며, quantitative size legend는 generic
`point`가 아니라 `size`라는 실제 책임 이름을 사용한다.

구현된 mark type, encoding channel, categorical legend channel, legend config kind는
`core/vocabulary.js`가 canonical owner다. Schema parser, action validation, private config와
materialization discovery는 이 목록을 import하며 별도의 문자열 목록을 만들지 않는다. 현재 legend
kind는 `series`, `color`, `size`, `gradient`, `opacity`이고 사용되지 않는 `point` kind는 없다.

Palette 이름과 concrete color table은 `grammar/palettes.js`가 한 번만 소유한다. 기본 categorical
range인 `TABLEAU10`도 별도 literal이 아니라 palette registry에서 resolve한 immutable result다.
Legend 존재와 scale dependency 검색은 `materialization/legends.js`가 같은 canonical kind 목록으로
수행한다.

## Test architecture

현재 test tree는 source filename이나 구현 Phase를 그대로 복제하지 않고 검증 책임을
기준으로 나눈다.

```text
test/
├─ unit/
│  ├─ core/
│  ├─ grammar/{layout,scales,schemas,transforms}/
│  ├─ actions/{canvas,coordinates,data,encodings,guides,marks,primitives,regression,scales}/
│  ├─ materialization/
│  └─ renderers/
├─ contracts/                  cross-cutting architecture invariants
├─ gates/<chart>/              visual approval 전 primitive-only new-chart staging
├─ charts/<chart>/             chart별 vertical slice
│  ├─ primitive.program.js
│  ├─ primitive.test.js
│  ├─ public.test.js
│  ├─ reference-values.js      필요할 때만 존재
│  ├─ png.render.js
│  └─ variants/                capability별 approved visual/API variants
├─ docs/                       public documentation contracts
└─ support/                    여러 suite가 공유하는 test infrastructure
```

Public user program의 canonical owner는 `examples/<chart>/program.js`다. `public.test.js`와
`png.render.js`는 이를 import하여 실제 example flow를 검증한다. 반대로
`primitive.program.js`는 extension-level executable oracle이므로 해당 chart test와 함께
둔다. 통계 reference 계산은 production materializer와 독립적으로 유지하며, 의미가
불분명한 범용 fixture가 아니라 `reference-values.js`로 이름을 드러낸다.

아직 visual approval을 받지 않아 public program이 없는 새 chart primitive는
`test/gates/<chart>/`에 같은 구조로 staging한다. Gate suite는 normal test와 render discovery에
모두 포함되며 Roadmap 2 primitive-only artifact를 생성할 수 있다. 승인과 user-facing 구현 뒤에는
complete primitive/public/reference/render slice 전체를 `test/charts/<chart>/`로 옮기고 gate directory를
제거한다. `test/charts/`의 structural-completeness contract를 통과시키기 위해 skipped 또는 placeholder
public test를 만들지 않는다.

### Unit test

Pure grammar, validation, selector, immutable state transition, action hierarchy,
materialization policy, renderer primitive를 각각 검증한다.

특히 다음 contract는 독립 test를 유지한다.

- caller-owned input과 earlier program immutability
- explicit/inferred/default precedence와 ambiguity error
- action trace parent-child hierarchy
- semantic path와 concrete graphic schema
- graphical editor와 renderer가 공유하는 concrete value validation
- shared scale consumer와 rematerialization
- materialization plan의 deterministic order와 equivalent-step deduplication
- generated resource namespace
- selector find/has/require/eligible behavior
- package export와 declaration boundary
- deterministic statistical numeric fixture

Selector, package boundary, shared validation, materialization plan처럼 기계적으로 검증할
수 있는 아키텍처 규칙은 prose 문서만으로 유지하지 않는다. 각각 focused contract test로
고정하고 구조 리팩토링에서도 계속 실행한다.

Source dependency contract는 regular expression으로 import 문장을 추측하지 않고 module
lexer로 static import, re-export, literal dynamic import를 읽는다. Extensionless file과
directory `index.js`도 실제 target으로 resolve한 뒤 layer boundary와 cycle을 검사한다.
Action inventory의 lifecycle, layer, status, readiness, planned kind, coverage vocabulary는
`ACTION_INDEX.json.contractSchema`가 소유하며 test가 같은 closed list를 재선언하지 않는다.

### Chart vertical slice

지원 차트마다 low-level primitive baseline과 high-level public action program을 비교한다.
같은 차트라면 다음이 일치해야 한다.

- 핵심 `semanticSpec` contract
- 완성된 concrete `graphicSpec`
- explicit drawing order
- Canvas renderer call sequence

단순히 눈으로 비슷한 PNG가 나오는 것만으로 동등성을 판단하지 않는다.
모든 `public.test.js`는 공통 `assertChartProgramsEquivalent` assertion을 사용해 위 네
계약과 양쪽 program의 완료된 action stack 및 immutable result를 같은 방식으로 검증한다.
`test/contracts/chart-vertical-slices.test.js`는 새 chart가 이 검증을 생략하지 못하게 한다.

### Documentation test

Markdown link, anchor, navigation order, tutorial action flow, public example index를
검증한다. Public API가 바뀌면 action reference, 관련 API page, tutorial,
`docs/llms.txt`가 함께 바뀌어야 한다.

Public chart image는 `examples/<chart>/program.js`에서 `npm run docs:images`로 2× PNG를
생성한다. Font rasterization과 antialiasing은 OS에 따라 달라지므로 CI는 PNG byte
equality를 요구하지 않는다. 대신 public program, data, 전체 source/renderer와 lockfile을
hash한 `docs/assets/images/manifest.json`의 freshness, PNG signature, dimensions와 chart
catalog 연결을 검증한다.

`docs/llms.txt`는 짧은 routing index다. `docs/llms-full.txt`는
`docs/_data/page_order.yml`에 있는 canonical Markdown을 `npm run docs:llms`로 결합한
generated artifact이며 직접 수정하지 않는다.

CI documentation job은 generated artifact drift를 검사한 뒤 GitHub Pages와 같은 공식
Jekyll action으로 site를 build한다. Built HTML의 local link/asset과 미처리 Liquid를
검사하고, headless Chromium에서 desktop search와 mobile navigation, focus recovery,
horizontal overflow, console/page error를 검증한다. 모든 built page는 320px, 390px,
768px viewport에서 document-level overflow 없이 code/table 내부 scroll만 허용해야 한다.
검색용 rendered HTML은 각 page에 반복 삽입하지 않고 하나의 `search-index.json`으로
build하며, browser는 search focus 시점에 index를 lazy-load하고 section entry를 만든다.
긴 page는 mobile에서 접힌 `details` TOC를 사용하고 scroll 위치에 따라 current section을
표시한다. Heading permalink, code copy, code/table local-overflow affordance와 명시적 image
dimensions/lazy loading은 공통 content script와 style이 소유하며 개별 Markdown page가
동작을 복제하지 않는다.
Documentation contract는 모든 Markdown의 front matter, 단일 H1과 heading hierarchy,
repository source link의 local target, raw image dimensions/alt/loading을 검사한다. Built
HTML은 추가로 단일 main/H1, unique IDs, image alt와 unique search URLs를 검증한다.
Canonical action reference의 chart/advanced/extension section은 각 declared direct method의
call signature를 정확히 한 section에서만 소유해야 한다.

### Render regression

각 대표 public/primitive program을 2× PNG로 렌더링한다. Physical dimensions, ink,
대표 색과 output 존재를 확인하며 generated PNG는 git에 commit하지 않는다. Render test는
chart directory의 `png.render.js`에 두고 생성물은 source tree 밖의
`.artifacts/test/png/`에 쓴다.

Roadmap 2 variant는 `variants/manifest.js`가 primitive/public program, 표시 call chain,
Canvas 크기와 visual region 기대값을 한 번만 소유한다. `png.render.js`는 공통 runner에 이
manifest를 등록한다. Runner는 variant별 subtest로 양쪽 PNG를 독립 생성하고, plot region의
최소 ink를 검사하며, 같은 backend 실행에서 decode한 RGBA hash가 정확히 같은지 비교한다.
또한 표시 call chain의 action 순서가 public program의 top-level trace와 일치해야 한다.
이는 OS 간 PNG byte snapshot을 요구하지 않으면서도 legend 한 조각만 남은 잘못된 chart가
전체-image 색상 검사만으로 통과하는 것을 막는다.

일반 test는 `.test.js`, 고비용 renderer regression은 `.render.js` suffix를 사용한다.
Package script는 Node 기반 collector로 suite directory를 재귀 탐색하여 깊어진 capability
directory도 누락하지 않고, support module이나 executable program은 test로 선택하지 않는다.
Discovery contract는 모든 `.test.js`와 `.render.js`가 정확히 한 suite에 속하는지 검증한다.
`test:unit`, `test:contracts`, `test:charts`, `test:gates`, `test:docs`, `test:render`를 독립적으로
실행할 수 있고 `test`와
`test:coverage`는 모든 일반 suite를 함께 검증한다.

### Coverage gate

현재 package script는 전체 `src/**/*.js`에 대해 최소 line 94%, branch 89%, function
98%를 요구한다. Refactor 때문에 새 module이 생기면 threshold를 낮추거나 exclude하지
않고 focused unit test로 contract를 고정한다.

Global 평균과 별개로 `scripts/coverage-policy.js`는 immutable update, area/regression
grammar, concrete graphic schema, Canvas dispatch와 PNG adapter에 critical-file floor를
적용한다. Native Node coverage table은 Node 22의 TAP `#` prefix와 Node 23의 `ℹ` prefix를
모두 받아 source-relative path로 parse하며 parser와 failure policy 자체도 unit test한다.
Pure numeric grammar는 고정 fixture 외에도 monotonic mapping,
histogram count conservation, non-negative unit-area density, stable group order와 regression
interval containment을 deterministic invariant로 검증한다.

## 현재 완성된 vertical slice

현재 architecture는 다음 차트 flow로 검증되어 있다.

1. Quantitative x/y와 nominal color를 가진 cars scatterplot
2. Temporal x, aggregate mean y, color와 strokeDash series를 가진 cars line chart
3. Binned x, count y, zero stack과 color를 가진 cars histogram
4. Ordinal x, aggregate y, grouped color/xOffset을 가진 jobs bar chart
5. Filtered point, size/shape/opacity, grouped OLS line과 confidence band를 가진 regression
   scatterplot
6. Grouped Gaussian KDE와 baseline-closed area를 가진 density area chart
7. Grouped mean Student-t interval과 fixed-pixel caps를 가진 cars error-bar chart
8. Temporal x와 cluster-grouped mean Student-t y/y2 paths를 가진 Gapminder error-band chart
9. Nominal category/quantitative measure를 양방향으로 배치하고 configurable Tukey factor 또는 minmax,
   band width, box/median/outlier appearance와 optional outlier removal을 지원하는 Cars box plot

이 목록은 chart type별 별도 compiler가 있다는 뜻이 아니다. 같은 data, scale, mark,
encoding, guide, layout, materialization primitive가 여러 vertical slice에서 재사용된다는
검증 목록이다.

## 새 기능을 추가하는 기준

### 새로운 domain action

1. User가 결정해야 하는 최소 option과 infer/default를 정한다.
2. Action이 처음 도입하는 semantic concept와 저장 path를 정한다.
3. Reusable child action hierarchy를 정한다.
4. Named resource lookup은 selector를 사용한다.
5. Pure 계산은 grammar/layout module에 둔다.
6. Graphical 재계산에 필요한 appearance intent는 materialization config에 저장한다.
7. Affected scale, mark, guide consumer를 dependency plan에 연결한다.
8. 모든 graphical change는 wrapped primitive action으로 materialize한다.
9. Trace hierarchy, immutability, shortest valid call, ambiguity를 test한다.
10. Public declaration과 documentation을 같은 conceptual commit에서 갱신한다.

### 새로운 graphic primitive

1. Graphic type과 허용 property를 shared graphic schema에 추가한다.
2. Concrete value validation을 shared concrete schema에 추가한다.
3. `createGraphics`/`editGraphics` contract test를 추가한다.
4. Canvas drawer를 별도 module로 구현한다.
5. Renderer dispatch table에 한 번 등록한다.
6. Missing/invalid draw completeness와 state reset을 test한다.
7. TypeScript `GraphicType`과 관련 declaration을 갱신한다.
8. Primitive와 public vertical slice PNG를 검증한다.

### 새로운 transform

1. Pure deterministic grammar function을 먼저 만든다.
2. Numeric fixture와 invalid input을 독립적으로 test한다.
3. Derived dataset transform provenance schema를 정의한다.
4. Create action과 materialize action을 wrapped hierarchy로 나눈다.
5. Output ordering과 generated field/resource naming을 deterministic하게 정한다.
6. Owning mark를 explicit semantic edit로 derived dataset에 rebind한다.
7. 관련 mark/scale/guide를 명시적으로 rematerialize한다.

## 현재 범위 밖 또는 제한된 부분

다음은 초기 설계에 등장했거나 vocabulary 일부가 준비되어 있어도 현재 구현 architecture가
완성된 기능으로 보장하지 않는다.

- semanticSpec 전체를 입력받아 자동으로 graphicSpec을 compile하는 기능
- animation과 transition
- SVG renderer
- `hconcat`, `vconcat`, `facet`과 child program composition
- 완전한 Polar mark, scale, axis, grid materialization
- 한 channel의 여러 독립 guide 자동 배치
- 임의의 외부 chart specification ingestion
- source dataset values의 in-place update
- 사용자에게 raw graphic target/path를 요구하는 ordinary chart API

이 항목을 구현할 때는 초기 문서의 아이디어를 그대로 복사하지 않는다. 현재 canonical
state, explicit materialization, action trace, package boundary와 충돌하지 않는지 먼저
설계하고, public API 또는 schema를 바꾸는 중요한 결정은 사용자와 합의한다.

## 초기 아키텍처에서 확립되거나 달라진 점

초기 설계의 다음 원칙은 그대로 유지되었다.

- Immutable `ChartProgram`
- Semantic meaning과 concrete graphics의 분리
- `editSemantic`, `createGraphics`, `editGraphics` 세 primitive
- Wrapped nested action trace
- Renderer의 `graphicSpec`-only 원칙
- User-facing domain action 중심 API
- Named scale/coordinate와 explicit resource reference

구현을 거치며 다음 구조가 새로 명확해졌다.

- `resolvedScales`가 semantic scale과 concrete scale 계산을 분리한다.
- `materializationConfigs`가 semantic이 아닌 재계산 intent의 canonical owner다.
- Context alias와 action sequence는 duplicate serialized state가 아니다.
- Selector가 named resource identity lookup을 중앙화한다.
- Concrete graphic schema를 editor와 renderer가 공유한다.
- Mark completeness policy가 incomplete intermediate state와 materializable state를
  구분한다.
- Canvas/scale dependency를 deterministic materialization plan으로 실행한다.
- Generic categorical legend와 graphical symbol recipe가 mark별 fork를 대체한다.
- Generated aggregate resource는 owning mark ID로 namespace된다.
- Browser, extension, Node PNG entry point와 TypeScript declaration이 분리된다.
- 현재 source는 chart example이 아니라 reusable capability 기준으로 조직된다.

반대로 초기 문서의 program composition, broad guide editing hierarchy, generic
`editScale`, SVG mapping 등은 아직 구현 계약이 아니다. 구현되지 않은 초기 아이디어는
현재 API인 것처럼 public documentation이나 새 코드에서 가정하지 않는다.
