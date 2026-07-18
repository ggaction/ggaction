# Roadmap 3 — Polar Coordinates, Program Composition, and Action Ergonomics

## 목표

Roadmap 3는 ggaction을 하나의 Cartesian chart를 만드는 라이브러리에서 Polar 좌표계와 여러
완성 chart view를 다루는 라이브러리로 확장한다. 동시에 안정된 사용자-visible 구성요소를
generated graphic ID나 raw property path 없이 수정할 수 있도록 focused edit action을 보강한다.

핵심 범위는 다음 세 축이다.

1. Polar coordinate system과 Polar mark/guide vertical slices
2. `hconcat`, `vconcat`, chainable `.facet({ field })`를 통한 program-level composition
3. Legend, composite mark, scale, axis와 removal의 세부 action 보강

후반부에는 이 기반을 활용해 directional parity, text annotation과 rect heatmap을 추가한다.
Roadmap 3는 외부 chart specification을 입력받아 자동 compile하는 기능을 만들지 않는다. 모든
domain action은 semantic change와 필요한 graphical materialization을 명시적으로 호출해야 한다.

## 진행 상태

- [x] Phase 0 — Capability lab, 계약 정밀화와 Roadmap 3 scope audit
- [x] Phase 1 — Focused edit, create/edit symmetry와 domain-level removal
- [x] Phase 2 — Polar coordinate 기반과 point vertical slice
- [x] Phase 3 — Polar axes, grids와 focused guide edits
- [x] Phase 4 — Polar line과 radar chart
- [x] Phase 5 — Arc, pie, donut과 radial bar
- [x] Phase 6 — Child-program state와 `hconcat`/`vconcat`
- [x] Phase 7 — Chainable `.facet({ field })`와 direct-source facets
- [x] Phase 8 — Facet scale resolution, derived-data facets와 guide composition
- [x] Phase 9 — `encodeYOffset`, text annotation과 rect heatmap
- [ ] Phase 10 — Cross-feature integration, architecture closeout와 release readiness

## 확정된 설계 결정

### Polar naming과 defaults

- Radial position action 이름은 `encodeR`이다. Stored semantic channel 이름은 `radius`를 유지한다.
- 기존 `encodeRadius({ value })`는 point glyph의 graphical radius로 유지한다.
- Discoverability를 위해 `encodePointRadius({ value })`를 additive alias로 제공하고 새 문서에서는
  이 이름을 우선한다.
- Polar angle은 12시 방향에서 시작하고 clockwise로 증가하는 것을 기본으로 한다.
- Polar position action은 생략된 coordinate를 안전하게 추론하고 필요하면 기본 Polar coordinate를
  명시적으로 생성한다.
- 같은 layer에서 Cartesian `x`/`y`와 Polar `theta`/`radius`를 섞지 않는다.
- Arc는 기존 bar를 coordinate에 따라 구조 변경하지 않고 별도 semantic `arc` mark로 만든다.
- Public theta range의 고정 단위는 degree다. `scale.range`는 `[startDegree, endDegree]`이고 기본
  `[0, 360]`은 12시에서 시작해 clockwise로 한 바퀴 돈다. 별도 unit option은 두지 않는다.
- Internal geometry에서만 degree를 radians로 변환하며 `graphicSpec`은 final Cartesian geometry만 저장한다.

### Composition boundary

- `hconcat`과 `vconcat`은 여러 완성 program을 받는 package-level operation이다.
- `facet`은 현재 program 하나를 반복 child view로 바꾸는 chainable `ChartProgram` action이다.
- 가장 짧은 facet 호출은 `.facet({ field: "Origin" })`이다.
- `hconcat`, `vconcat`, `facet`은 `semanticSpec`의 layer grammar에 들어가지 않는다.
- Composition parent는 immutable named child programs와 별도 program-level `compositionSpec`을
  소유한다.
- Parent `graphicSpec`은 namespaced child-canvas snapshot과 concrete placement를 완전히 materialize한다.
  Renderer는 `children`, `semanticSpec`, trace를 읽지 않고 parent `graphicSpec`만 그린다.
- Child ID는 생략 가능하고 deterministic internal ID를 받는다. Stable replacement나 inspection이
  필요한 사용자는 명시적 ID를 전달할 수 있다.
- `children`은 child ID → immutable program lookup이고 `compositionSpec.children`은 ordered ID array다.
- Concat layout 기본값은 `gap: 16`, `align: "center"`, four-side zero padding이다.
- 일반 concat의 scale/coordinate/guide scope는 child별 independent다.
- Facet scale 기본은 shared다. Facet guide는 첫 범위에서 각 cell에 유지한다.
- Facet `columns` 생략은 resolved value 수를 사용해 한 행을 만들고 explicit positive integer가 wrapping한다.
- Existing chart title은 facet cell마다 반복하지 않고 composition parent로 승격한다.
- 첫 facet slice는 direct-source program만 지원한다. Derived dataset DAG는 별도 Phase에서 재생한다.

### Focused action policy

- Nested create options는 빠른 authoring을 위해 유지한다.
- Nested object가 하나의 atomic definition이면 별도 leaf action을 기계적으로 만들지 않는다.
- 독립적으로 보이고 stable identity를 가진 사용자-visible component는 focused edit action을 가진다.
- Generated child ID를 ordinary user가 알아야만 수정할 수 있다면 owning aggregate facade가 부족한
  것으로 간주한다.
- Aggregate action은 실제 wrapped child actions를 호출해 trace hierarchy를 보존한다.
- 모든 property마다 action을 만드는 대신 stable component boundary에만 action을 추가한다.

## 실행 원칙

각 visual capability는 다음 순서를 따른다.

```text
Proposed contract와 target call chain
→ pure grammar/reference values
→ graphical primitive program
→ browser + primitive.png
→ 사용자 visual Gate
→ user-facing action hierarchy
→ user-facing.png
→ semantic/graphic/trace equivalence
→ parameter/error/rematerialization coverage
→ docs와 contract lifecycle closeout
```

- 모든 visual Gate는 hard pause다. Exact target call chain과 이미지를 함께 보여주고 승인 전에는
  post-Gate public flow로 진행하지 않는다.
- Primitive와 user-facing program은 독립된 executable artifact로 유지한다.
- 새 mark와 coordinate는 encoding 호출 순서와 무관하게 같은 final state를 만들어야 한다.
- Canvas, scale, data revision, selection/highlight와 composition layout 변경 뒤 stale graphics가 남지
  않아야 한다.
- Public API가 생긴 Phase는 runtime, exact TypeScript, package export, current contract, public docs와
  executable evidence를 함께 갱신한다.
- 각 Phase closeout은 배정된 Planned inventory가 Current, Maybe Future 또는 removed 중 하나로 모두
  해소됐는지 contract test로 증명한다.

## Roadmap 3 데이터셋 운용

Roadmap 3의 chart와 parameter variant는 관성적으로 한 데이터셋만 반복하지 않는다. 각 capability의
semantic grain, field type과 edge case에 맞춰 아래 reference dataset을 다양하게 사용한다.

| 데이터셋 | 우선 활용 범위 |
| --- | --- |
| `data/cars.json` | quantitative/nominal encoding, regression, density와 기존 회귀 호환성 |
| `data/jobs.json` | ordinal category, grouped/stacked layout와 directional bar |
| `data/gapminder.json` | temporal trend, country/region grouping, facet과 composition |
| `data/fashion_mnist_tsne.csv` | dense 2D points, class clusters, labels, Polar point와 facet |
| `data/imdb_top_1000.csv` | mixed categorical/quantitative fields, missing or malformed values, long text, annotation과 heatmap |

- Phase plan과 chart contract는 선택한 데이터셋과 그 선택이 검증하는 capability를 명시한다.
- 여러 chart나 variant를 포함하는 Phase는 의미 있는 경우 서로 다른 데이터셋을 사용해 데이터 형태와
  parameter coverage를 넓힌다. 모든 Phase에서 모든 데이터셋을 억지로 사용할 필요는 없다.
- 같은 visual Gate의 primitive와 user-facing pair는 동일한 source rows와 transform을 사용한다.
- CSV fixture는 test/example program에서 row object array로 읽어 `createData({ values })`에 전달한다.
- 새 데이터셋을 추가하기 전에 현재 reference dataset으로 필요한 grain과 edge case를 표현할 수 있는지
  먼저 확인한다.

## Artifact 구조

```text
.artifacts/test/png/roadmap3/
├─ <capability>/
│  ├─ <chart>/
│  │  ├─ <variant>/
│  │  │  ├─ variant.json
│  │  │  ├─ primitive.png
│  │  │  └─ user-facing.png
│  │  └─ ...
│  └─ ...
└─ index.html
```

- Capability는 artifact path의 첫 grouping segment이고 Phase는 `variant.json` metadata로 기록한다. 따라서
  Phase가 바뀌어도 stable capability artifact identity와 gallery grouping은 유지된다.
- `variant.json`은 display title, exact target call chain, Phase와 capability를 기록한다.
- Gallery는 capability → chart → variant 순서로 primitive/public pair와 call chain을 보여준다.
- Artifact tree는 gitignore하며 executable manifests로 다시 생성할 수 있어야 한다.
- Primitive/public pair는 같은 run에서 생성하고 decoded pixel result를 비교한다.
- Polar와 composition chart도 browser Canvas와 high-DPI PNG가 같은 concrete `graphicSpec`을 사용한다.

## 공통 coverage matrix

각 Proposed capability는 적용 가능한 다음 축을 명시적으로 검증한다.

| 축 | 필수 사례 |
| --- | --- |
| Resolution | explicit, current, unique, ambiguous |
| Lifecycle | create, repeated call, conflict, edit, empty edit, remove |
| Authoring order | mark 전후 encoding, equivalent final state, incomplete → complete |
| Coordinate/orientation | Cartesian, horizontal/vertical, Polar 해당 시 |
| Scale | auto, explicit, transformed/discrete, reverse, shared/independent |
| Data | empty, missing, invalid, filtered revision, derived dependency |
| Rematerialization | Canvas, scale, data, guide, selection/highlight, composition layout |
| State | semanticSpec, compositionSpec, children, configs, graphicSpec, trace |
| Output | Canvas calls, PNG, primitive/public equality, nested composition |
| Package | JS export, exact TypeScript, docs, installed-consumer example |

현재 direct action 중 partial test coverage가 남은 항목을 전부 선행 완료할 필요는 없다. 다만 새
Phase가 건드리는 Canvas, position encoding, axes/grid, legend와 primitive edit의 partial coverage는
그 Phase 안에서 함께 닫는다.

## Phase 0 — Capability lab and contract baseline

현재 API만으로 다음 representative chart를 작성해 capability gap을 executable하게 확인한다.

- lollipop과 layered bar + line
- annotated scatterplot과 heatmap
- horizontal grouped bar
- Polar scatterplot, radar와 donut
- two-chart dashboard와 nested dashboard
- faceted scatterplot, histogram과 derived regression facet

각 시도는 가능 여부, primitive leakage, generated ID exposure, nested edit depth, inference,
rematerialization과 missing public type을 기록한다. 이 결과로 Proposed inventory를 만든 뒤 사용자와
batch 단위로 검토해 Planned로 승격한다.

동시에 다음 기반을 정리한다.

- `createGuides`, `createCoordinate`, `createScale`, regression component의 exact public option type
- Public option type exports와 package-boundary contract
- Ordinary, advanced domain, extension primitive API 분류 정렬
- 현재 문서의 stale limitation과 support statement 교정
- Roadmap 3 capability-to-Phase assignment audit

Gate A에서는 Roadmap 범위, exact action names, angle option syntax와 첫 visual targets를 승인한다.

## Phase 1 — Focused editing ergonomics

### Legend components

Proposed direct actions:

```text
editLegendLayout
editLegendLabels
editLegendTitle
editLegendSymbols
editLegendBorder
```

기존 `editLegend`는 aggregate convenience action으로 유지한다. Existing internal materialization action과
public edit facade의 이름이 충돌하면 internal action을 `rematerialize*` vocabulary로 정리한다.

### Axis, grid and removal

- Whole-axis position처럼 여러 stable children을 함께 바꿔야 하는 `editXAxis`/`editYAxis` facade를
  검토하고 실제 child edits를 호출한다.
- `editGrid`는 horizontal/vertical child edits를 aggregate한다.
- Domain-level `removeXAxis`, `removeYAxis`, `removeGrid`, `removeLegend`, `removeTitle`, `removeMark`를
  representative use case별로 검토한다.
- Removal은 public primitive path를 노출하지 않고 semantic branch, config, graphic subtree와 connected
  guide/dependency cleanup을 atomic하게 수행한다.

### Composite mark facades

Proposed direct actions:

```text
editErrorBar
editErrorBand
editErrorBandBoundary
editBoxPlot
editRegression
```

Appearance edit는 current derived data를 유지한다. Statistical parameter edit는 새 immutable derived
revision을 생성하고 owning layers를 rebind한 뒤 connected scales, marks와 guides를 rematerialize한다.

### Create/edit symmetry

- Point와 bar create action이 corresponding edit appearance option을 선택적으로 받는다.
- Line create/edit에 constant stroke와 opacity를 추가한다.
- `editScale({ palette })`를 `range`와 mutually exclusive한 first-class option으로 추가한다.
- `editRuleMark`는 만들지 않는다. Rule endpoint와 appearance는 existing encoding reassignment가 소유한다.

Gate B는 existing scatterplot, histogram, error band, regression과 box plot의 focused-edit primitive/public
pairs를 승인한다.

## Phase 2 — Polar foundation and point chart

첫 Polar vertical slice는 point mark다.

Target call chain:

```javascript
chart()
  .createCanvas({ width: 520, height: 520 })
  .createData({ values: rows })
  .createPointMark()
  .encodeTheta({ field: "Acceleration" })
  .encodeR({ field: "Horsepower" })
  .encodeColor({ field: "Origin" })
  .encodePointRadius({ value: 3 });
```

구현 범위:

- Cartesian/Polar position vocabulary와 policy 분리
- `theta`/`radius` scale consumer, role compatibility와 channel defaults
- Pure `resolvePolarFrame`과 `polarToCartesian` grammar
- Rectangular plot bounds의 center와 available outer radius 계산
- Theta/radius completeness와 mixed-coordinate validation
- `encodeTheta`/`encodeR` order independence와 safe target/coordinate/scale inference
- Point shape, color, size, opacity와 selection/highlight 재사용
- Canvas, scale, filter와 explicit range/reverse rematerialization

Gate C는 Cars Polar scatterplot primitive의 geometry와 visual defaults를 승인한다.

## Phase 3 — Polar axes and grids

Proposed component actions:

```text
createThetaAxis         createRadialAxis
createThetaGrid         createRadialGrid
editThetaAxisLine       editRadialAxisLine
editThetaAxisTicks      editRadialAxisTicks
editThetaAxisLabels     editRadialAxisLabels
editThetaAxisTitle      editRadialAxisTitle
editThetaGrid           editRadialGrid
```

- Theta axis는 outer circular baseline과 angular ticks/labels를 소유한다.
- Radial axis는 center-to-edge baseline과 radial ticks/labels를 소유한다.
- Theta grid는 spokes, radial grid는 concentric circles를 materialize한다.
- `createAxes`와 `createGuides`는 stored coordinate type에 따라 Cartesian 또는 Polar aggregate children을
  dispatch한다.
- Guide semantic slots은 `axis.theta`, `axis.radius`, `grid.theta`, `grid.radius`를 사용한다.
- Concrete result는 existing `path`, `line`, `text`만 사용하며 renderer는 Polar 의미를 알지 않는다.

Gate D는 axes와 both grid families가 포함된 Polar scatterplot을 승인한다.

## Phase 4 — Polar line and radar chart

- Line series는 theta domain order로 deterministic하게 정렬한다.
- 각 semantic theta/radius pair를 Cartesian point로 변환한 뒤 concrete path commands를 만든다.
- Group, color, strokeDash, opacity와 legend machinery를 재사용한다.
- Radar를 위해 line `closed` option과 corresponding edit를 추가한다.
- 첫 Polar line contract는 `linear` curve만 지원한다. Cartesian monotone/natural 등은 별도 Polar
  geometry contract 없이 암묵적으로 재사용하지 않는다.
- Full-circle seam, duplicate angle, empty/short series와 reverse를 exact fixture로 검증한다.

대표 chart는 Jobs 또는 Gapminder의 grouped radial trend와 closed radar variant다. Gate E에서 open/closed
primitive를 각각 승인한다.

## Phase 5 — Arc, donut, rose and radial bar

Arc는 별도 semantic mark다.

```javascript
chart()
  .createCanvas(...)
  .createData({ values: rows })
  .createArcMark({ innerRadius: 0, padAngle: 0 })
  .encodeTheta(...)
  .encodeColor(...)
  .createGuides();
```

- `createArcMark`/`editArcMark`가 stable arc appearance resource를 소유한다.
- Pie/donut은 aggregate/normalized theta와 inner radius로 표현한다.
- Rose chart는 ordinal theta band 안에서 color series별 radial sector를 center baseline부터
  overlay한다. 큰 sector를 먼저 그리고 작은 sector를 나중에 그려 모두 보이게 한다.
- Radial bar는 ordinal theta band와 quantitative radial extent를 사용한다.
- 현재 세 chart에는 secondary endpoint가 필요하지 않다. `encodeTheta2`/`encodeR2`는 concrete ranged-sector
  요구와 별도 승인이 생길 때 다시 검토하는 Maybe Future다.
- Arc, annular sector와 circle은 backend-neutral `M/L/C/Z` path commands로 materialize한다.
- Selection/highlight는 final arc item grain과 concrete bounds/attachment를 소유하는 policy를 추가한다.
- Polar radial-axis title은 기존 inside midpoint 배치를 default로 유지하고 explicit `position: "outside"`가
  axis endpoint 바깥 배치를 선택한다.

Gate F는 Cars Origin donut, Nightingale rose chart와 Gapminder radial bar의 graphical primitive를
한 번에 승인한다. 세 chart는 각각 aggregate angular partition, overlaid radial sector, ordinary radial
bar grain을 검증한다.

## Phase 6 — Child programs, `hconcat`, and `vconcat`

Package-level API:

```javascript
const dashboard = hconcat({
  programs: [
    leftProgram,
    { id: "right", program: rightProgram }
  ],
  gap: 16,
  align: "center",
  padding: 8
});
```

Core state와 materialization:

- `ChartProgram`에 immutable `children`과 program-level `compositionSpec`을 추가한다.
- Parent semantic layer grammar는 child layers를 flatten하지 않는다.
- Pure layout grammar가 horizontal/vertical placement, unequal size alignment, gap, padding과 parent Canvas
  size를 계산한다.
- Child graphic snapshots은 parent `graphicSpec` 안에 namespace하고 nested child Canvas에 concrete
  x/y/width/height를 기록한다.
- Nested Canvas traversal은 save/translate/clip/background/restore를 사용하며 physical Canvas resize와
  clear는 top-level에서 한 번만 한다.
- Nested concat도 같은 parent `graphicSpec` 한 개에 concrete structural tree로 materialize한다.
  Renderer는 child `ChartProgram`을 재귀적으로 읽지 않는다.
- Same child-local IDs는 namespace 때문에 충돌하지 않는다.

Focused operations:

```text
editCompositionLayout
replaceCompositionChild
```

Direction 변경은 edit하지 않는다. 새 `hconcat` 또는 `vconcat` 호출이 authoring intent를 명확히 유지한다.
Gate G는 unequal-size dashboard, nested concat, child replacement와 browser/PNG parity를 승인한다.

## Phase 7 — Chainable `.facet({ field })`

Facet은 current unit program을 composition program으로 바꾸는 aggregate action이다.

```javascript
const faceted = chart()
  .createCanvas(...)
  .createData({ values: rows })
  .createPointMark()
  .encodeX({ field: "Horsepower" })
  .encodeY({ field: "Miles_per_Gallon" })
  .encodeColor({ field: "Cylinders", fieldType: "ordinal", scale: { palette: "reds" } })
  .createGuides({ legend: false })
  .facet({ field: "Origin", guides: { legend: "shared" } })
  .editFacetHeaders({ fontSize: 12 })
  .editCompositionLayout({ gap: 16 });
```

Shortest-call inference:

- Base program은 current `this`다.
- Dataset은 all affected visible layers가 하나의 source dependency로 귀결될 때만 추론한다.
- Facet values는 source의 deterministic first-appearance order다.
- Child IDs는 deterministic하게 자동 생성한다.
- Facet scale default는 shared, axes default는 each cell이다. Shared categorical legend는 explicit
  `guides.legend: "shared"`로 parent에 만든다.
- Column count와 wrapping default는 Phase contract의 visual Gate에서 확정한다.

Action hierarchy:

```text
facet
├─ resolveFacetSource
├─ resolveFacetValues
├─ deriveFacetCell(value) × N
│  ├─ create filtered immutable dataset
│  ├─ rebind affected layers
│  ├─ rematerialize scales
│  ├─ rematerialize marks
│  └─ rematerialize guides
├─ createFacetHeaders
└─ composeFacetViews
```

Facet 결과는 composition parent다. Parent-level title, header와 layout edits는 허용하지만 direct
`encodeX`처럼 하나의 unit layer를 전제로 하는 action은 명확한 child target 없이 거부한다.

첫 slice는 direct-source scatterplot, bar와 histogram만 지원한다. Unsupported derived dependency는
partial chart를 만들지 않고 preflight validation에서 오류를 낸다. Gate H는 Cars Origin scatterplot과
histogram facets를 승인한다.

## Phase 8 — Facet resolution and derived dependency DAG

Scale resolution:

```javascript
.facet({
  field: "Origin",
  scales: {
    x: "shared",
    y: "independent",
    color: "shared"
  }
})
```

- Shared는 full facet source domain을 child scale에 적용한다.
- Independent는 cell-filtered data에서 auto domain을 다시 계산한다.
- Explicit domain은 shared/independent policy보다 우선한다.
- Coordinate range는 child Canvas마다 local이므로 resource instance는 독립이다.
- Scale sharing과 guide deduplication을 하나의 flag로 묶지 않는다.

Derived facet은 transform dependency registry를 통해 각 cell의 source DAG를 다시 실행한다.

- Regression
- Density
- Interval/error band
- Box plot

Guide composition은 repeated guide baseline을 먼저 보존한 뒤 별도 visual Gate에서 outer-only axes와
remaining non-categorical legend families를 검토한다. Shared guide를 지원할 때는 child semantic state를
merge하지 않고 parent composition action이 representative concrete guide를 명시적으로 materialize한다.

Gate I-A는 filtered child data에서 regression statistic이 독립적으로 다시 계산되는지와 shared/independent
visual difference를 승인한다. Gate I-B는 incomplete final row의 outer-only axes와 parent-owned shared
continuous legend를 별도로 승인한다.

## Phase 9 — Directional parity, text, and rect

### `encodeYOffset`

- `encodeXOffset`과 같은 ordinal offset grammar를 y direction에 적용한다.
- Horizontal grouped bar, temporal/discrete category, padding, explicit/reversed range와 layout modes를
  검증한다.
- Existing vertical/horizontal bar policies가 orientation-specific 분기로 복제되지 않게 공통 offset
  owner를 둔다.

### Text mark and annotation

Implemented surface:

```text
createTextMark
encodeText
editTextMark
```

Field/constant text, inherited or explicit position, offset, rotation, alignment, typography와 opacity를
지원한다. Scatterplot labels, bar value labels와 rule + text annotation을 representative charts로 사용한다.
Tooltip과 interaction은 이 contract에 포함하지 않는다.

### Rect mark and heatmap

- `createRectMark`는 x/y cell을 의미하는 semantic mark다.
- Two discrete positions 또는 x/x2, y/y2 range를 지원한다.
- Quantitative/nominal color, selection/highlight와 optional text overlay를 검증한다.
- Existing bar rect materializer를 semantic rect mark로 가장하지 않는다.

Gate J는 horizontal grouped bar, annotated scatterplot과 Gapminder heatmap을 각각 primitive/public pair로
승인한다.

## Phase 10 — Integration and closeout

- Polar marks와 Polar guides의 layered inference
- Polar chart를 child로 가진 nested concat
- Faceted Polar chart의 지원 범위 또는 explicit validation
- Child replacement와 parent layout rematerialization
- Shared/independent facet scale와 guide layout
- Canvas resize, scale edit, filter, selection/highlight matrix
- Empty/invalid/missing data와 ambiguous resource inference
- Browser Canvas, PNG와 high-DPI nested output parity
- Public JS exports, exact TypeScript와 fresh installed-consumer tests
- Action catalog lifecycle와 coverage audit
- `SECOND_ARCHITECTURE.md`의 state, composition, coordinate와 renderer boundary 갱신
- Public API/reference/tutorial/gallery/mobile/LLM documentation 점검
- Roadmap 3 gallery final pair audit

Roadmap 3는 substantial new public capability를 제공하므로 closeout release candidate는 `0.1.0`을
기본으로 검토한다. 실제 version과 publish는 별도 release Gate에서 승인한다.

## 현재 명시적으로 제외하는 범위

- Animation과 transition
- Tooltip, pointer interaction과 interactive legend
- SVG renderer
- Arbitrary external chart specification ingestion
- Automatic semanticSpec-to-graphicSpec compiler
- Streaming/async/columnar data ingestion
- Responsive `auto` Canvas와 automatic margin expansion
- Multiple axes per channel
- Identity/bin-ordinal scale
- Arbitrary callback 기반 calculated field

구체적인 Roadmap 3 chart에서 현재 제외 항목이 필수로 드러나면 Proposed로 다시 올려 별도 Gate에서
검토한다. 구현 편의를 위해 암묵적으로 범위를 넓히지 않는다.
