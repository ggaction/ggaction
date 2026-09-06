# `ggaction` Second Architecture

> 작업에 필요한 section만 빠르게 찾으려면
> [`architecture/README.md`](architecture/README.md)의 작업별 경로에서 시작한다. 이 파일은 현재
> macro-architecture의 canonical 원문으로 유지한다.

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
- Canvas, SVG, PNG와 PDF renderer가 무엇을 읽는가
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
│  ├─ hconcat()
│  ├─ vconcat()
│  └─ render()
├─ ggaction/basic
│  ├─ chart()
│  └─ render()
├─ ggaction/extension
│  ├─ ChartProgram
│  ├─ action()
│  └─ registerExtension()
├─ ggaction/svg
│  └─ renderToSVG()
├─ ggaction/png
│  └─ renderToPNG()
├─ ggaction/pdf
│  └─ renderToPDF()
└─ ggaction-mcp
   └─ search_ggaction({ query }) over local stdio

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
│  ├─ histogram, regression, density, Horizon band 계산
│  └─ pure semantic/graphic grammar validation
├─ selectors
│  └─ named semantic resource lookup
├─ layout
│  ├─ Canvas와 plot bounds
│  └─ deterministic text measurement, rotated bounds와 wrapping
├─ materialization
│  ├─ mark completeness policy
│  └─ cross-cutting rematerialization 및 layout-consumer plan
├─ theme
│  └─ shared built-in visual defaults
└─ renderers
   ├─ backend-neutral graphicSpec → Canvas 2D-compatible drawing target
   ├─ backend-neutral graphicSpec → browser-safe SVG string
   ├─ Canvas 2D → Node PNG
   └─ Canvas-compatible vector context → Node PDF
```

## Public package boundary

패키지는 여섯 개의 명시적 module entry point와 하나의 Node executable을 가진다.

### `ggaction`

기본 browser-safe entry point다.

```javascript
import { chart, hconcat, render, vconcat } from "ggaction";
```

- `chart()`는 모든 built-in action이 등록된 빈 immutable `ChartProgram`을 반환한다.
- `hconcat()`과 `vconcat()`은 이미 작성된 program을 named child로 보존하고 하나의
  concrete composition `graphicSpec`으로 materialize한다.
- `render()`는 완성된 `graphicSpec`을 Canvas 2D context에 그린다.
- Node 전용 filesystem 또는 native Canvas 의존성을 노출하지 않는다.

### `ggaction/basic`

다섯 common Cartesian facade의 생성 경로만 제공하는 browser-safe entry point다.

```javascript
import { chart, render } from "ggaction/basic";
```

- `chart()`는 Canvas, source/2D-bin data, point/line/bar/rect mark, 필요한 Cartesian
  encoding·scale·guide와 scatter/line/bar/histogram/heatmap facade만 등록한 immutable
  program을 반환한다.
- public declaration은 편집 lifecycle, selection, composition, Polar/Parallel coordinate,
  statistical layer를 노출하지 않는다. 이 기능이 필요하면 `ggaction`을 사용한다.
- production Vite consumer의 minimal scatter build는 아래 browser bundle regression ceiling으로 검증한다.
- `render()`는 default entry와 동일한 `graphicSpec`-only Canvas renderer다.

### `ggaction/extension`

action author를 위한 public extension boundary다.

```javascript
import { action, ChartProgram, registerExtension } from "ggaction/extension";
```

- `action()`으로 새로운 traceable action을 정의한다.
- installable package는 import 시 `registerExtension({ name, actions })`을 한 번 호출해
  full `ChartProgram`에 wrapped action batch를 등록한다.
- 등록 전 전체 batch의 extension/action 이름, wrapped metadata, built-in·internal·state·기등록
  collision을 검사하므로 실패 시 일부 method만 남지 않는다. 비충돌 package의 import 순서는
  결과에 영향을 주지 않는다.
- 이 등록은 default `chart()`에만 적용되고 `ggaction/basic`에는 적용되지 않는다.
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

### `ggaction/svg`

Browser-safe vector serializer entry다.

```javascript
import { renderToSVG } from "ggaction/svg";
```

DOM, filesystem, Node builtin과 native Canvas 없이 fully materialized `graphicSpec`을
complete SVG document string으로 변환한다. Optional title/description은 escaped
`<title>`/`<desc>`를 생성하고 logical Canvas dimension을 root width/height/viewBox에
그대로 사용한다.

### `ggaction/pdf`

Node 전용 single-page vector adapter다.

```javascript
import { renderToPDF } from "ggaction/pdf";
```

`@napi-rs/canvas`의 PDF document/page/context, filesystem과 path 처리는 이 entry
point 아래에만 존재한다. Fully materialized `graphicSpec`을 logical Canvas
width/height와 숫자상 같은 point 크기의 한 page에 그리고 optional
title/author/subject/keywords metadata를 기록한다.

### `ggaction-mcp`

설치된 package가 제공하는 Node-only local stdio executable이다. Model-visible tool은
`search_ggaction({ query })` 하나이며 direct adapter와 같은 serialized compact task packet을 반환한다. Overview,
exact action card, bounded task recipe와 unresolved-only documentation section은 read-only MCP resources로만 제공한다.

Task packet schema v4는 action identity를 위한 `actionPlan`/`exactCalls`와 별도로 executable-module closure를 위한
`authoring`을 소유한다. `authoring.imports`는 task가 고른 public package entry, `initialize`는 `let program = chart()`,
`steps`는 immutable `program = ...` action/composition과 renderer call을 순서대로 제공한다. Query에는 exact user task만
전달하며 dataset, code scaffold와 evaluator instruction은 넣지 않는다. Direct adapter와 MCP는 이 전체 packet을 byte-equal하게
직렬화한다.

Complete-chart intent와 raw-mark intent를 구분한다. 선택된 mark/template가 있다는 사실은 drawable chart의
완료 증거가 아니며, 필요한 baseline·placement 결정을 `unresolved`에 남긴다. 더 구체적인 chart phrase는
겹친 일반 phrase만 shadow하고 별도 요청한 chart를 제거하지 않는다. Runtime dependency는 chart intent alias가
아닌 canonical lower action identity로 주입한다.

MCP boundary는 chart program이나 renderer를 import하거나 실행하지 않는다. Request-selected filesystem path, network,
shell/code execution과 telemetry surface를 노출하지 않는다. 자체 package에 포함된 bounded knowledge artifact만 읽으며,
documentation section은 직전 search packet의 `unresolved` constraint가 추천한 URI에 한해 읽을 수 있다.

각 JavaScript entry point는 대응하는 TypeScript declaration을 가진다.

```text
src/index.js             ↔ types/index.d.ts
src/basic.js             ↔ types/basic.d.ts
src/extension.js         ↔ types/extension.d.ts
src/renderers/pdf.js     ↔ types/pdf.d.ts
src/renderers/png.js     ↔ types/png.d.ts
src/renderers/svg.js     ↔ types/svg.d.ts
ChartProgram contract    ↔ types/program.d.ts
src/mcp/cli.js           ↔ package `ggaction-mcp` executable
```

`package.json`의 export map, JavaScript export, declaration, package-boundary test는 하나의
public contract로 함께 관리한다. MCP executable은 module export map에 추가하지 않으며 Node-only dependency graph를
browser-safe entry에 연결하지 않는다.

### Browser bundle regression ceilings

Production Vite consumer의 minimal build는 다음 gzip upper bound를 넘지 않아야 한다.

| Entry | Gzip ceiling |
| --- | ---: |
| `ggaction` | 267,000 bytes |
| `ggaction/basic` | 148,000 bytes |
| `ggaction/svg` | 25,000 bytes |

이 값은 current executable regression ceiling이며 측정 결과 자체가 아니다. Canonical numeric owner는
`scripts/browser-bundle-size.js`이고 package consumer와 documentation contract가 같은 값을 검증한다.

## Series policy primitive state

Semantic primitive는 layer.layout.mode, layer.mark.missing, encoding.group.inferredFrom을
각각 배치 결정·결측 정책·legacy 추론 origin의 단일 위치로 저장하고 vocabulary를 검사한다.
Primitive 저장과 제거는 immutable하며 graphics를 바꾸지 않는다. 공개 layoutSeries는 최종 의미를 preflight한 뒤
wrapped offset/endpoint/scale/mark/guide owner를 명시적으로 호출한다. createAreaPlot은 이 하위 owner들의 합성이다.
Raw Area 경계·공동 결측 분할은 areaSeries, Bar aggregate cells는 bars/aggregate가 소유한다. 두 materializer와
selection은 같은 series identity와 bounds를 사용하며 별도 renderer 추론이나 H0 recipe를 저장하지 않는다.
자동 offset scale의 소유권만 mark config에 기록한다. Group에서 떠나면 encoding/config를 정리하고 실제
layer/guide 참조가 없는 owned scale을 semantic primitive로 제거한다. 이 removal은 resolved cache와 currentScale도 정리한다.
Primitive target은 별도 수치 oracle와 explicit graphic edits를 사용하고 public 결과와 exact parity로 비교한다.

## `ChartProgram`의 canonical state

현재 `ChartProgram`은 다음 상태를 소유한다.

```javascript
{
  semanticSpec,
  graphicSpec,
  resolvedScales,
  materializationConfigs,
  children,
  compositionSpec,
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
| `children` | Composition parent가 child ID별로 보존하는 immutable `ChartProgram` lookup |
| `compositionSpec` | Concat direction 또는 facet source/value/grid intent, ordered child IDs, gap, alignment와 padding |
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
  facets: { ... },
  selections: { ... },
  highlights: { ... },
  jitters: { ... },
  labelLayouts: { ... },
  canvas: { ... },
  title: { ... },
  theme: { name, overrides }
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
bounds를 가진다. 각 mark의 `selectionPolicy`가 supported grain, item resolver, highlight style normalizer,
highlight action과 owning rematerializer를 함께 소유한다. Selection orchestration은 mark type 조건문을
복제하지 않고 이 policy를 조회한다. `highlights`는 그 selection에 적용할 graphical override intent의 owner다. 따라서 Canvas와
scale range 변경 뒤 stale concrete child ID를 authoritative state로 사용하지 않는다.

Item resolution은 `materialization/selection/items/` 아래에서 common finalization,
point row, bar cell/stack, line-area path series와 rule row로 분리된다. 각 selection policy는
자신의 resolver를 직접 소유한다. Path highlight action 역시 특정 mark 이름을 열거하지 않고
policy가 `applyPathHighlight` operation을 선택했는지 확인하므로 이후 path 기반 mark가 같은
selection grain과 style 계약을 재사용할 수 있다.

Ordinary unit program은 frozen empty `children`과 absent `compositionSpec`을 가진다. Concat parent는 최소 두
child를, facet parent는 최소 한 derived child를 저장한다. 두 경우 모두 child key에 정확히 대응하는 ordered
child ID를 가지며 child semantic state를 parent layer grammar로 병합하지 않는다. Child program은 이미
immutable하므로 lookup만 structural copy하고 각 program reference는 그대로 보존한다.

Action wrapper는 기본적으로 unit scope를 적용한다. Composition-only action은 별도 scope를 선언하고,
`createGraphics`와 `editGraphics`처럼 두 program kind의 concrete materialization에 필요한 primitive만 `any`
scope를 가진다. 따라서 composition parent에 ordinary mark, encoding, data 또는 guide action을 호출하면 trace나
state를 만들기 전에 실패한다.

Package-level `hconcat()`과 `vconcat()`은 최소 두 complete child를 먼저 검증한 뒤 blank parent에서
composition state를 만든다. 각 child는 wrapped `useProgram` node로 trace에 기록되고,
`materializeComposition`이 layout을 해석해 parent canvas와 namespaced child snapshot을 concrete graphics로
작성한다. Horizontal composition은 automatic child height를, vertical composition은 automatic child width를
가장 큰 cross-axis slot 크기로 맞춘다. Unit child는 그 크기로 rematerialize한다. Nested composition child는
root Canvas만 늘려 내부를 왼쪽/위쪽에 남기지 않고 intrinsic layout 전체를 outer `align`에 따라 slot 안에
배치한다. 명시적 child dimension은 보존한다.
Parent canvas 크기는 normalized child 크기, gap과 padding으로 결정되며 renderer는 이 완성된 parent
`graphicSpec`만 읽는다. Nested composition도 동일한 snapshot protocol을 재귀적으로 사용한다.
따라서 nested Cartesian and Polar compositions는 같은 retained-child와 concrete-snapshot 계약을 따른다.

Chainable `facet({ field })`은 complete unit program을 composition parent로 전환한다. 모든 visible layer의
dataset ancestry에서 하나의 latest common row-preserving partition anchor를 먼저 확정하고, field value를 해당
materialized ancestor의 first-appearance order로 해석한다. 각 cell은 anchor를 보존한 채 namespaced filtered
dataset을 만들고, supported descendant transform을 topological order로 replay한 뒤 repeated layer를 wrapped
`rebindLayerData`로 명시적으로 연결한 immutable child program이다. Raw facet value는 header text에만 사용하고
generated dataset, child, graphic ID에는 포함하지 않는다.

Facet은 channel별 `shared | independent` scale policy를 저장한다. Shared automatic domain은 full-source order와
cell 결과의 deterministic union을 사용하고, independent automatic domain은 child별 결과를 보존하며 explicit
semantic domain은 항상 우선한다. Shared histogram x는 template bin boundary를 공유하고 independent x는 cell별
boundary를 다시 계산한다. Child scale을 먼저 해결한 다음 mark와 guide는 scale을 재추론하지 않는 하나의
deduplicated plan으로 rematerialize하고, parent가 namespaced child Canvas snapshot을
attach한다. Axes는 기본적으로 cell-owned이고 `guides.axes: "outer"`이면 column별 bottommost occupied cell과
row별 leftmost occupied cell만 유지한다. Explicit `guides.legend: "shared"`는 compatible categorical, gradient,
discretized-color, size 또는 opacity recipe를 parent-owned concrete graphic으로 승격한다. Guide preparation은
source legend의 concrete bounds와 `left | right | top | bottom` edge, horizontal alignment를 함께 보존한다. Facet
layout은 side edge면 width lane, top/bottom edge면 height lane을 child grid 전에 확정하고, placement는 그 lane과
translated child-plot union을 기준으로 guide snapshot을 이동한다. Explicit guide가 없어서 legacy categorical
legend를 합성하는 경우에만 right edge가 기본값이다. Repeated header와 chart title도 parent-owned concrete
graphics다. Canonical title order는 `facet(...).createTitle(...)`이며 이미 valid한 unit title은 cell에서 제거하고
parent에 한 번 promote한다. `editFacetHeaders`와 facet-compatible
`editCompositionLayout({ columns?, gap?, align?, padding? })`은 child identity를 보존한 채 parent snapshot만 다시
materialize한다. `editFacetScales`와 `editFacetGuides`는 parent에 retained된 pre-facet semantic/materialization
state와 current field/data/value definition에서 stable child IDs를 다시 derive/replay한 뒤 complete children과 parent
snapshot을 atomically 교체한다. Renderer는 concat과 마찬가지로 완성된 parent `graphicSpec`만 읽는다.
각 repeated header의 horizontal anchor는 child Canvas center가 아니라 translated child plot center다.

Facet replay의 pure dataset dependency planner는 visible layer에서 source 방향으로 ancestry를
검증하고, 모든 branch가 공유하는 latest row-preserving partition anchor와 deterministic topological replay order를
반환한다. 이 planner는 semantic state를 수정하거나 trace를 만들지 않는다. Public facet action은 filter,
time-unit, regression, density, Horizon, interval, box-summary와 box-outlier descendant를
`replayDerivedData → createDerivedData → canonical materialize*Data` hierarchy로 실행한다. Transform별 통계 계산은
facet에 복제하지 않고 각 기존 data materializer가 계속 소유한다.

Density provenance는 requested policy와 materialized revision 결과를 분리한다. `bandwidth`와 `extent`의
`"auto"` intent는 transform에 그대로 남고, 해당 revision에서 계산한 concrete 값은
`resolved: { bandwidth, extent }`에 저장된다. 따라서 derived replay와 `editDensity`는 새 source rows마다
자동 policy를 다시 계산하면서도 각 immutable revision의 실제 계산값을 해석할 수 있다.
Density encoding의 field/channel 추론, positional definition과 scale transition은
`actions/encodings/density/resolve.js`가 pure result로 계산한다. Wrapped action은 이 결과를 사용해 semantic
edit, derived-data revision과 graphic materialization을 명시적으로 호출한다.
Category placement는 같은 transform에 normalized category field, position channel, side, band-relative width,
shared/independent resolution과 optional two-value split intent를 저장한다. Split domain을 추론한 revision은
concrete first-appearance pair를 `resolved.splitDomain`에 저장한다. Category band center, resolved half-width와
closed path commands는 `graphicSpec`에만 존재한다.

Horizon provenance도 requested policy와 materialized result를 분리한다. Transform은 source x/y field와 type,
optional group, band count, baseline, automatic/explicit extent, shared/independent resolution, missing/overflow policy,
positive/negative palette와 namespaced output fields를 저장한다. 각 immutable revision에서 실제 사용한 group별
`extent`와 `bandHeight`는 `resolved.extents`에 기록된다. Folded lower/upper values와 sign/band/segment identity는
derived dataset에, concrete closed path commands는 `graphicSpec`에만 존재한다. `editHorizon`은 새 revision을
만들어 existing area layer를 명시적으로 rebind하고 orphaned prior revision만 제거한다. Scale ID와 target layer
identity를 유지하므로 selection/highlight가 새 geometry에 다시 적용된다.
Horizon source/field/group 추론과 folded scale/palette definition은
`actions/encodings/horizon/resolve.js`가 소유하고, wrapped action은 revision authoring과 materialization 순서만
조정한다. 두 encoding family가 만드는 canonical scale edit subset과 equality 판정은
`actions/scales/patch.js`를 공유한다.

Facet replay는 Horizon resolved provenance를 그대로 복사하지 않는다. Shared y policy는 parent automatic extent를
모든 cell의 explicit replay extent로 고정하고, independent y policy는 각 partition에서 automatic extent를 다시
계산한다. 이 차이는 semantic scale resolution에 의해 결정되며 renderer나 facet layout이 band 계산을 복제하지
않는다.

Rectangular 2D-bin provenance도 requested grid policy와 materialized revision 결과를 분리한다. Transform은
requested `bins`, per-axis automatic/explicit `extent`, output fields와 empty/member policy를 저장하고,
`resolved`는 해당 revision의 concrete extent, edges, eligible count와 occupied count를 저장한다. 동일 logical
owner를 다시 author하거나 `editBin2DData`로 partial edit하면
`materializationConfigs.data.bin2d[owner].current`가 current immutable revision ID를 가리키고 direct layer consumer는
wrapped rebind와 materialization plan으로 갱신된다. Output 이름을 바꾸는 revision은 transform role을 기준으로 direct
consumer의 semantic encoding과 stored selection/jitter field binding을 함께 옮긴 뒤 scale, mark와 guide를 다시
materialize하되 stored display title은 보존한다. 제거되는 optional output을 참조하는 binding은 transition 전에 거부한다. Edit facade는 omitted
requested provenance를 보존하고 complete consumer transition을 speculative immutable branch에서 검증한다. Earlier program은 기존 revision을 유지한다. Facet
replay에서는 `resolved`를 제거하고 child partition에서 다시 계산한다. Exact option과 owner inference는
[`CORE.md`](contract/current/CORE.md#editbin2ddata)가 소유한다.

Facet scale grammar는 channel별 shared/independent intent를 pure normalized plan으로 소유한다. Omitted
channel은 shared이며, 같은 scale ID에 연결된 channel들이 서로 다른 policy를 요청하면 state 변경 전에 거부한다.
Shared automatic continuous domain은 child domain의 min/max union, discrete domain은 child order의 stable union,
quantile domain은 duplicate를 보존한 sample merge다. Independent automatic domain은 child별 결과를 보존하고,
어느 policy에서도 explicit semantic domain이 우선한다. Public facet runtime은 이 결과를 각 child의 concrete
resolved scale에 적용한 뒤 dependent mark와 guide를 다시 materialize한다.

Advanced facet guide grammar도 pure ownership plan으로 분리된다. Outer axes는 각 column의 bottommost occupied
cell과 각 row의 leftmost occupied cell을 선택하고, retained child guide bounds를 parent 좌표로 번역한다. Shared
legend는 child-specific target을 제외한 canonical config와 represented resolved scales가 concretely compatible할
때만 categorical, gradient, discretized, size 또는 opacity recipe를 한 parent source에서 promote한다. 이 plan은
child guide removal과 parent promotion의 입력이며 `composeFacetGuides` wrapped action이 parent snapshot에 적용한다.

## Immutability와 ownership

`ChartProgram`은 생성이 끝나면 freeze된다. 모든 public action과 internal wrapped
action은 기존 instance를 바꾸지 않고 새로운 instance를 반환한다.

Named dataset, layer, scale, coordinate의 exact ID lookup은 `selectors/`만 소유한다.
Action과 materializer는 semantic resource array에 직접 `.find(id)` 또는 identity `.some()`을
작성하지 않는다. 이 경계는 source contract test가 기계적으로 검사한다. Eligibility filter와
relationship scan은 exact resource lookup이 아니므로 해당 domain module에 남을 수 있다.

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

`editSemantic`의 string property path는 계속 public primitive contract다. 내부 value validation은
`actions/primitives/semanticValidation/`의 dataset, layer, scale, guide dispatcher로 나뉘며, 각 module은 자기
semantic kind의 closed vocabulary와 value shape만 소유한다. Dispatcher 분리는 저장 schema나 public path를
변경하지 않는다.

첫 source dataset의 omitted ID는 `"data"`, 첫 semantic mark type별 omitted ID는
`"point" | "line" | "bar" | "rect" | "area" | "rule" | "arc" | "tick" | "text"`로 materialize한다. 이 결정은 context에만 두지 않고
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

Derived dataset은 source와 정확히 하나의 transform provenance를 먼저 기록한 뒤 pure grammar 계산의
결과를 concrete `values`로 저장한다. Multiple-transform pipeline은 현재 contract가 아니며
`createDerivedData`와 primitive semantic validation이 한 원소 tuple만 허용한다.

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
- UTC year, quarter, month, day, hour, minute, or second bucket-start field derivation
- partitioned ordered window calculation with row number, rank, dense rank, cumulative sum, lag, and lead

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

Window transform은 ordered `partitionBy`, `sortBy`, `operations` provenance를 저장한다. Partition 내부
계산 순서는 stable multi-field sort를 따르지만 materialized output row order는 source order를 보존한다.
Operation은 선언 순서대로 실행되어 앞 output을 뒤 input으로 사용할 수 있다. Public lifecycle은 immutable
create-only이다. Window는 row 수를 보존해도 주변 row에 의존하므로 facet은 먼저 source를 partition한 뒤
registry의 canonical materializer를 cell마다 다시 호출한다.

Time-unit transform은 input temporal field, closed UTC unit과 distinct output field를 저장한다. Materialization은
source row order와 existing cells를 보존하고 output에 bucket-start timestamp를 추가한다. Transform은
row-preserving이므로 facet의 latest common partition anchor가 될 수 있고, earlier explicit anchor 뒤에서는 canonical
time-unit materializer를 child별로 replay한다.

Interval transform은 input field, ordered `groupBy`, `mean | median` center,
`stderr | stdev | ci | iqr` extent, CI level과 distinct center/lower/upper output fields를 기록한다.
Median은 IQR과만, CI level은 CI extent와만 호환된다. `createIntervalData`는 이 provenance와 immutable
summary rows를 함께 저장한다. `createErrorBar`의 statistical mode는 이 action을 호출하고 explicit mode는
이미 center/lower/upper field를 가진 source dataset을 직접 사용한다.

### Layer와 mark

Layer는 data reference, optional source/coordinate, semantic mark와 encoding을 묶는다.

```javascript
{
  id: "points",
  data: "cars",
  coordinate: "main",
  mark: { type: "point" },
  encoding: { ... }
}
```

Ordinary layered mark creation은 explicit data가 없을 때 current eligible layer, 그 다음 unique eligible
layer에서 compatible position을 추론한다. Candidate는 target mark의 position policy로 다시 검증한다.
Source와 target이 동일한 final item grain을 지원하면 aggregate 같은 grain-preserving policy도 함께 저장한다.
예를 들어 temporal aggregate bar 위 line은 같은 `mean`과 x/y scale을 상속한다. Bin, stack, offset처럼
topology를 바꾸거나 target recipe가 같은 grain으로 지원하지 않는 policy는 제거한 candidate만 시도하며,
ambiguity는 explicit authoring을 요구한다.

현재 semantic mark type은 다음과 같다.

```text
point
line
bar
rect
area
rule
arc
text
```

Graphic primitive와 semantic mark는 일치할 필요가 없다.

```text
semantic point → circle, rect 또는 heterogeneous collection
semantic line  → path collection
semantic bar   → rect collection
semantic rect  → rect collection
semantic area  → closed path collection
semantic rule  → line collection
semantic arc   → closed sector path collection
semantic text  → text collection
```

### Encoding

현재 schema가 다루는 주요 channel은 다음과 같다.

```text
position       x, y, x2, y2, xOffset, yOffset
polar position theta, radius
appearance     color, strokeDash, size, shape, opacity
grouping       group
topology       pathOrder
content        text
```

`src/core/vocabulary.js`의 positional-channel descriptor가 각 channel의 coordinate
family, primary/secondary/offset role, shared scale channel, 기본 coordinate,
guide/grid binding과 현재 허용 mark type을 한 번 소유한다. Coordinate inference,
scale-consumer discovery, guide rebinding, layered inheritance와 removal cleanup은 이
descriptor를 읽는다. 따라서 새 positional channel을 추가할 때 서로 다른 dispatch
목록을 독립적으로 늘리지 않는다. Semantic mark type과 허용 concrete graphic type의
대응도 같은 vocabulary boundary가 소유하며 target resolution은 그 계약을 사용한다.

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
graphicSpec.objects.points.items[0].properties.opacity = 0.27;
```

Grouped mark의 directional offset padding과 grouped bar의 width mode도 semantic scale에 중복 저장하지 않는다.
`materializationConfigs.marks[target].barWidth`는 mutually exclusive band/pixel intent를,
`materializationConfigs.marks[target].xOffset | yOffset`은 inner/outer padding intent를 소유한다. Scale
materializer는 shared offset consumer의 padding policy와 parent categorical slot 크기가 일치하는지 검증한 뒤
signed step, start와 concrete bandwidth를 `resolvedScales`에 계산한다.

`group`은 path를 series로 나누는 semantic channel이지만 scale이나 guide를 만들지
않는다. `pathOrder`는 compatible path의 각 series 안에서 vertex topology를 결정하는 semantic encoding이며
`{ field, fieldType: "quantitative", order: "ascending" | "descending" }`를 저장한다. Scale이나 guide는
만들지 않고, 같은 order 값은 source row order로 안정화하며 repeated position도 별도 vertex로 보존한다.
생략하면 기존 independent-position automatic sort가 그대로 동작하고 `removePathOrder`는 explicit branch를
제거해 그 동작으로 복귀한다. `y2`는 area upper bound이며 기존 y scale을 정확히 공유한다. `xOffset`과 `yOffset`은 ordinal
category slot 안의 grouped sub-slot을 표현한다. Bar는 resolved bandwidth를 rectangle에 적용하고 point/rule은
sub-slot center를 parent position에 더한다. Primary positional encoding의 optional `title`은
field 또는 transform provenance에서 추론되는 guide title을 명시적으로 덮어쓰는 semantic text다.
Guide materializer는 이 값을 가장 먼저 읽으며 renderer가 title을 다시 추론하지 않는다.

Quantitative-x aggregate line은 `encoding.x.bin`이 final row grain을 소유한다. Scale materialization이
semantic x scale policy로 하나의 resolved boundary set을 만들고, line grammar는 bin midpoint와 series key로
rows를 partition한 뒤 y aggregate를 계산한다. Automatic x domain, aggregate y domain, concrete path와
selection series는 이 동일한 boundary set을 소비한다. Bin 없는 direct quantitative line은 row grain을
보존하며 repeated x를 암묵적으로 합치지 않는다.

첫 path-order 범위는 raw 또는 row-preserving data를 소비하는 ordinary Cartesian line과 ranged area다. Aggregate
line, Polar line, density/error/regression 같은 generated path와 non-row-preserving transform은 topology owner가
다르므로 assignment 전에 거부한다. Action은 x/y가 아직 incomplete일 때 semantic intent만 저장할 수 있으며,
position이 완성되면 owning line/area materializer가 같은 branch를 적용한다. Canvas, scale, data/filter,
selection/highlight와 facet replay도 이 canonical materializer를 호출해 explicit order를 다시 적용한다.

Categorical Cartesian `x | y`와 Polar `theta` order도 scale definition mutation이 아니라 position encoding이 소유하는 semantic
assignment다. `encoding[channel].categoryOrder`에는 explicit category list 또는 category/count/summary 계산
intent를 저장하고 semantic scale의 `domain: "auto"`는 유지한다. Scale materializer가 current dataset에서
deterministic domain을 풀고, owning action이 scale → connected marks → guides 순서로 explicit materialization
plan을 실행한다. 그래서 data/facet replay는 stored intent를 다시 계산할 수 있고 source row 순서는 바뀌지
않는다. Shared facet scale은 base resolved order를 사용하며 independent scale은 각 cell dataset에서 intent를
다시 푼다. `removeCategoryOrder`는 assignment만 제거해 automatic first-appearance domain으로 복귀한다.

Categorical legend의 선택적 `guide.legend.color/series.order`는 위치 order와 별개다. Explicit values 또는
같은 target의 categorical channel link를 저장하고, legend resolver가 appearance scale의 value→symbol 배정을
보존한 item permutation을 계산한다. Linked positional scale은 guide dependency planner의 legend dependency에
포함하며 reset은 order leaf를 제거한다. Invalid link나 연결 encoding 제거는 public action을 거부한다.

Measured radius의 lower semantic state는 scale.radialMapping과 radius encoding.aggregate가 각각 mapping과
category grain을 소유한다. Arc grammar는 합산값과 원본 sourceIndices를 함께 계산하고, scale consumer는 같은
aggregate에서 [0,max] domain을 결정한다. 공통 continuous mapper가 area/length 의미를 적용하므로 Arc와 Polar
axis/grid는 별도의 보정식을 갖지 않는다. Math는 outer radius로 정규화한 뒤 제곱하여 overflow를 피한다.
명시적 Arc innerRadius provenance는 private mark config에서만 추적하여 explicit range와의 충돌을 검사하며,
기본 innerRadius 0을 사용자가 선택한 ratio라고 추측하지 않는다. Public measured encoder와 Rose/Radial facade는 Current다. Facade는 이 lower chain을 합성하며 Polar guide fulfillment도 공통 guide owner가 scope·reuse·conflict를 검증한다.

Measured radius의 public 진입은 encodeR(mapping, aggregate), scale의 하위 소유자는 createScale/editScale(radialMapping)이다. 같은 scale에 정책을 중복 저장하지 않는다. Shared normalization이 radialMapping을 보존·검증하며, measured Arc가 theta를 기다릴 때 domain이나 placeholder mark를 만들지 않는다. Layered Arc inheritance는 category aggregate를 함께 보존하며 Point에는 이 radius를 전파하지 않는다.

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

현재 direct scale type은 `linear`, `log`, `pow`, `sqrt`, `symlog`, `time`, `band`, `point`, `ordinal`,
`sequential`, `quantize`, `quantile`, `threshold`이다. Role registry가 quantitative position, temporal
position, discrete position, ordinal appearance, continuous color, discretized color의 compatible subset을
한 번만 소유한다. Scale 종류 판별은 이 registry에서 파생한 predicate를 사용하며 action마다 문자열
목록을 복제하지 않는다. `createScale`, `editScale`, position encoding은 같은 definition normalizer로
boolean policy, transformed parameter, interpolation, padding과 align을 검증한다. 각 channel resolver는
domain/range의 concrete value contract만 제공한다.
Category position은 width가 필요한 bar에서 `band`, center만 필요한 point/rule에서 `point`를 사용하고
appearance/offset lookup은 `ordinal`이 소유한다. Band/point는 signed step, aligned start와 각각 positive/zero
bandwidth를 resolved state에 저장한다. Offset auto range는 positive band bandwidth를 우선하고 point position에서는
absolute step을 하나의 categorical slot 크기로 사용한다. Channel default ID는 일반적으로
`x`, `y`, `color`, `size`, `shape`, `strokeDash`, `xOffset`, `yOffset`처럼 channel 이름을 쓴다.
독립 scale이 필요할 때 명시적 ID를 제공한다.

같은 scale ID를 참조하는 consumer는 domain과 range를 공유한다. 현재 하나의 scale은
하나의 channel 역할에서만 공유할 수 있으며 x와 y를 동시에 설명할 수 없다. 모든
consumer의 값이 combined domain 계산에 참여한다.
Binned x scale은 연결된 bar/line consumer가 모두 binned이고 동일한 bin definition을 가질 때만 공유한다.
Resolved boundary endpoint가 x domain을, 동일 boundary의 midpoint aggregate가 line geometry와 y domain을
결정하므로 scale과 mark가 서로 다른 grain을 계산하지 않는다.
Temporal aggregate bar가 소유하는 bandwidth는 scale identity가 아니라 bar layout policy다. 같은 temporal
field를 소비하는 compatible line은 bar center range를 공유해 vertex를 정확히 center에 놓되 bandwidth를
소유하지 않는다. 다른 field meaning이나 incompatible consumer가 같은 scale에 연결되면 materialization
전에 거부한다.
Encoding이나 interval action이 `{ id }`만 전달해 existing scale을 참조하면 stored definition을
그대로 재사용한다. Action-specific defaults는 새 scale을 생성할 때만 적용한다.

Automatic continuous domain에는 `zero`가 먼저 적용되고 그 뒤 `nice`가 적용된다.
사용자가 explicit domain 또는 range를 주면 automatic policy보다 우선한다. Ordinal
domain은 source의 deterministic first-appearance order를 기본으로 사용하며 compatible position encoding의
`categoryOrder` assignment가 있으면 그 resolved order가 current concrete domain을 덮어쓴다.
Band/point padding과 align edit는 같은 scale을 소비하는 marks와 guides를 모두 rematerialize하며,
bar consumer가 남아 있으면 bandwidth가 없는 point type으로의 전환을 거부한다.

`editScale`은 structural resource mutation의 명시적 예외다. Unattached scale 또는 모든 connected
consumer가 compatible한 scale에 한해 complete resulting definition을 preflight하고 type을 atomic하게
바꾼다. Old type 전용 parameter와 interpolation은 structural removal하고, scale, mark, axis, grid, legend를
deterministic plan으로 rematerialize한다. Position transform mapping은 point, line, area, bar, rule이 shared
grammar를 사용한다.

Scale `unknown`은 domain member가 아니라 mapping fallback이다. 현재 row-owned point item의 x/y/color/size/
shape/opacity만 지원하며 concrete channel value를 먼저 검증한다. Missing/invalid input과 explicit ordinal
domain 밖의 input이 fallback으로 간다. Compound path, aggregate bar, rule, offset과 strokeDash처럼 한 input이
final item topology와 일대일 대응하지 않는 grain은 fallback을 적용하지 않고 명시적으로 거부한다. Direct
unattached scale은 channel을 모르므로 fallback validation을 consumer attachment까지 지연한다.

### Coordinate

Coordinate는 named semantic resource이며 layer가 ID로 참조한다.

```javascript
{ id: "main", type: "cartesian" }
```

Vocabulary에는 `cartesian`, `polar`, `parallel`이 있다. x/y positional encoding은 명시하지 않으면
`main` Cartesian coordinate를 생성하고 저장한다. theta/radius positional encoding은 compatible한
유일한 기존 Polar coordinate를 재사용하거나 `polar` coordinate를 생성하고 저장한다. 여러 compatible
coordinate가 있으면 임의로 선택하지 않고 explicit ID를 요구한다. 한 layer에서 Cartesian x/y와 Polar
theta/radius를 함께 저장하지 않는다.

Parallel coordinate는 ordered `encoding.parallel.dimensions`와 optional `key`, `missing` policy를
semantic state로 저장한다. 각 dimension은 독립적인 namespaced scale을 참조하고, target/dimension identity가
그 generated scale ID를 소유한다. `encodeParallelCoordinates`는 최소 두 dimension, unique field, compatible
field type과 scale option을 preflight한 뒤 coordinate, encoding, scales를 atomic하게 author한다. Renderer는
Parallel 의미를 해석하지 않고 materializer가 만든 ordinary path 및 line/text guide collection만 읽는다.
Chart facade와 encoding action이 공유하는 coordinate/dimension/scale policy는
`actions/coordinates/parallel.js`가 소유한다. Parallel axis의 guide geometry resolution은
`actions/guides/axes/parallel/resolve.js`가 pure result로 계산하며 wrapped guide action은 concrete graphic
authoring과 trace hierarchy만 소유한다.

현재 Polar vertical slice는 point, line과 arc mark를 지원한다. Theta의 public 단위는 degree이며 12시 방향의 0에서
clockwise로 증가한다. 기본 theta range는 `[0, 360]`, 기본 radius range는 현재 plot bounds의 짧은 변
절반이다. Semantic encoding과 resolved scale은 theta/radius를 유지하지만 mark materializer는 Polar frame과
mapping을 적용한 final Cartesian x/y 또는 path commands만 `graphicSpec`에 쓴다. 따라서 renderer는 coordinate
type이나 angle을 해석하지 않는다. 한 Polar channel만 있는 incomplete state는 semantic으로 보존하되 해당
mark의 visible geometry를 만들지 않는다.

Polar guide는 theta/radius encoding과 동일한 resolved scale 및 Polar frame을 사용한다. Theta axis는 outer
circle, radial axis는 resolved radius range의 minimum에서 endpoint까지 이어지는 line을 소유하며 theta grid는
spokes, radial grid는 concentric paths를
소유한다. Semantic guide에는 scale/coordinate binding과 title만 저장하고 tick selection, radial-axis angle,
style은 materialization config가 소유한다. `graphicSpec`에는 최종 path/line/text만 기록하므로 renderer는 여전히
Polar scale, tick, coordinate를 추론하지 않는다. Grid는 관련 mark보다 먼저, axis는 mark보다 나중에 그려지며
action call order가 drawing order를 결정하지 않는다.
Complete Polar axis와 공개 focused component 생성은 같은 wrapped guide owner를 호출한다.
Cartesian/Polar optional component 삭제는 axes/components의 공통 primitive cleanup을 사용하고 마지막 component는 기존 전체 remove owner로 정리한다.
독립적인 component 작성에서도 binding·angle·style의 기존 저장 위치를 공유하며, 별도의 facade cache나 renderer 추론을 만들지 않는다. 세부 lifecycle은 [Current axes 계약](contract/current/AXES.md)이 소유한다.

Radial-axis title의 default `position: "inside"`는 resolved radial baseline midpoint 아래에 놓인다. Explicit
`position: "outside"`는 endpoint 바깥 방향에 배치하고 `offset`을 endpoint와 title 사이 간격으로 해석한다.
`title: false`는 optional semantic/config/graphic branch를 모두 만들지 않는다.

`grammar/polarPaths.js`는 Polar frame 안의 circle, pie sector와 annular sector를
backend-neutral `M/L/C/Z` command로 만든다. Sweep은 최대 90도인 cubic segment로
분할하고 reverse sweep, full circle과 angular padding을 pure geometry로 처리한다.
Canvas renderer는 angle, radius, sector 또는 arc primitive를 해석하지 않는다. Polar guide
circle도 이 grammar를 재사용하며 기존 four-cubic circle command 계약을 유지한다.

Polar axis action은 `actions/guides/polar/axes/`에서 `shared`, `lines`, `ticks`,
`labels`, `titles`, aggregate `facade`로 분리된다. Leaf module은 해당 concrete component와
materialization config만 소유하고 facade는 validation과 nested action orchestration만
소유한다. 상위 `polar/axes.js`는 action registration boundary다.

### Guide와 title

Guide semantic state는 어떤 scale과 coordinate를 설명하는지, 그리고 사용자에게
보이는 semantic title이 무엇인지 기록한다. Tick 길이, stroke, font, offset, legend
symbol geometry 같은 appearance는 semantic guide에 저장하지 않는다.

Legend lifecycle은 `materializationConfigs.guides.legend`의 kind별 complete block을 ownership unit으로 사용한다.
Categorical block은 여러 represented channel을 하나의 resource로 소유하므로 partial channel removal로 분해하지
않는다. Selective removal은 requested complete block만 semantic/config/graphics에서 해제하고 retained block의
layout dependency를 existing legend rematerializer로 다시 계산한다. Side lane은 retained family graphics를 모두
intrinsic 상태로 materialize한 뒤 한 번 배치하므로 create/edit/remove, scale과 Canvas replay가 같은 concrete
결과로 수렴한다. Stroke-width title/count/typography edit도 같은 config→explicit rematerialization 경계를 사용한다.

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

`objects`는 tree depth와 무관하게 모든 named graphic ID로 concrete node를 찾는 flat registry이고,
`order`는 top-level root order다. Container의 `children`은 named child ID만 저장하고 drawable의
`items`는 반복 concrete item만 저장한다. 렌더러는 `order`에서 시작해 named tree를 depth-first로
방문한다. 렌더링 순서는 action 호출의 우연한 부산물이 아니라 명시적 graphical state다.

Ordinary Canvas-first chart의 canonical ownership은 다음과 같다.

```text
graphicSpec.order
└─ canvas
   ├─ plot-main
   │  ├─ grid
   │  ├─ statistical band
   │  ├─ ordinary marks
   │  ├─ selected/highlighted items inside each owning mark
   │  └─ axes
   ├─ legends
   └─ title and subtitle
```

`canvas`가 유일한 root이고 `plot-main`은 layout/transform 기능이 없는 named collection이다. Ordinary
domain action은 이 owner와 sibling placement를 infer하지만, extension primitive는 `parent`, `before`,
`after`를 명시하며 parent를 생략한 explicit top-level graphic도 계속 지원한다.

### Graphic type

현재 type은 다음과 같다.

```text
root/container      canvas
named container     collection
homogeneous draw    circle, rect, line, text, path
heterogeneous items collection
```

Canvas는 logical width, height, background를 가진다. Margin은 renderer가 직접 그리는
property가 아니라 `materializationConfigs.canvas`에 저장되어 plot bounds 계산에 쓰인다.
Canvas와 collection은 ordered named `children`을 소유할 수 있다. Collection은 ownership-only
container로 비어 있을 수도 있고, `items`에 서로 다른 drawable type을 가진 concrete 반복 item을
저장할 수도 있다. `children`과 `items`는 서로 다른 cardinality/identity namespace다.

Drawable은 단일 node 또는 concrete item collection이 될 수 있다.

```javascript
points: {
  type: "circle",
  items: [
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

서로 다른 point shape를 한 collection에 저장해야 하면 각 item이 자신의 concrete type을 가진다.
Shared point-shape grammar가 12-value vocabulary, validation과 equal-area geometry를 한 번 소유한다.
Circle은 `circle`, square는 `rect`, 나머지 shape는 renderer-neutral closed `path`가 된다.

```javascript
points: {
  type: "collection",
  items: [
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
`L`, cubic segment는 `C`, closure는 마지막 `Z`로 명시한다. Open line은 `Z`를 사용하지 않고,
closed Polar line, filled area와 polygon point shape는 마지막 `Z`를 저장한다. Original point array,
`closed` flag 또는 renderer-specific path string을 함께 저장하지 않는다.

Line/area materializer는 semantic series grain을 먼저 확정하고 explicit `pathOrder`가 있으면 각 series의 eligible
row를 stable sort한 뒤 curve command builder에 전달한다. 따라서 curve builder와 renderer는 order field를 읽지
않으며 이미 순서가 확정된 vertices 또는 concrete commands만 소비한다. Explicit order 재할당과 removal은 같은
owning mark를 wrapped action으로 rematerialize하고 earlier program의 commands를 변경하지 않는다.
Line과 area의 pure geometry/appearance 계산은 각각 `actions/marks/line/materialize.js`와
`actions/marks/area/materialize.js`가 소유한다. Wrapped mark action은 scale resolution과 `editGraphics` 호출을
명시적으로 조정하므로 계산 helper를 분리해도 action trace hierarchy는 유지된다.

Concrete path bounds는 cubic control-point hull을 그대로 쓰지 않는다. 각 `C` segment의
x/y 도함수 근을 구해 `[0, 1]` 안의 실제 Bézier extrema와 endpoint만 union한다. Selection
item bounds, guide collision과 layout occupancy는 이 동일한 exact path-bounds policy를
사용한다. Full finite numeric range에서 raw derivative coefficient가 overflow하면 좌표와
coefficient를 정규화하고 de Casteljau interpolation으로 finite extrema를 보존한다.

Text bounds는 `core/textMetrics.js`의 deterministic code-point width policy를 사용한다. 이 module이 alignment,
baseline과 rotation까지 적용한 concrete bounds를 반환하며 axis label/title, chart title과 `graphicBounds`가 같은
계산을 공유한다. Renderer의 platform text measurement는 drawing 품질에만 사용되고 layout topology를 결정하지
않는다.

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
있다. `xOffset`과 `yOffset`은 각각 parent x/y band 또는 point-step slot을 읽어 sub-slot을 만든다. Color, dash, shape,
size scale은 concrete palette 또는 range를 저장한다.

`resolvedScales`는 renderer input이 아니다. Action materializer가 concrete mark와 guide
값을 계산할 때 사용하는 immutable authoring state다. 최종 renderer는 여전히
`graphicSpec`만 읽는다.

Scale materialization은 계산과 적용을 분리한다. `materialization/scales/resolve.js`는
semantic scale, consumer values, plot bounds와 기존 resolved state를 입력받아 새 concrete
scale만 계산한다. Bar bin·offset·temporal band, series layout, Polar arc auto range처럼
mark family에 종속된 계산은 `materialization/scales/policies/`가 소유한다. Wrapped
`rematerializeScale` action은 consumer 조회, immutable state 반영, mark와 guide의 ordered
rematerialization만 담당한다. 따라서 순수 scale 계산은 trace를 만들거나 Program을
변경하지 않고, renderer도 scale 의미를 다시 추론하지 않는다.

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
- text label의 bounded displacement, collision padding, bounds와 optional leader policy

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

Owning mark가 rematerialize될 때는 해당 target의 highlight config를 잠시 분리하고 base items를 clean
baseline에서 완전히 다시 만든다. Point의 기본 fill처럼 renderer에 필요한 concrete default도 이 단계에서
복원한다. 그 다음 현재 item resolver로 selection key를 한 번 다시 계산하고 highlight, complement dimming,
selected-last order를 순서대로 적용한다. 여러 selection assignment는 각각 독립된 ID를 유지하며 같은
selection의 재호출만 그 assignment를 교체한다. 따라서 이전 highlight property나 item ID가 Canvas, scale,
encoding 또는 data-cardinality 변경 뒤 새 baseline으로 누출되지 않는다.

Selection revision과 removal도 같은 owner를 사용한다. Selector edit는 stored ID와 target을 유지한 complete
replacement이며 dependent highlight가 있을 때만 target baseline과 categorical legend symbols를 비운 뒤 모든
remaining assignment를 다시 replay한다. Highlight-only removal은 selection을 보존하고, selection removal은
dependent highlight removal을 wrapped child로 먼저 호출한다. Exact parameters와 error contract는 current mark
selection contract가 소유한다.

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
6. 가장 바깥 action이면 등록된 completion reconciliation을 실행한다. 이 과정에서 호출한
   wrapped graphic/materialization action은 아직 열린 사용자 action의 child로 기록된다.
7. `_exitAction()`으로 stack을 pop한다.

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
Completion reconciliation은 program-wide theme처럼 이후의 모든 authoring action 결과를
수렴시켜야 하는 cross-cutting graphical policy에 한정한다. Nested action마다 재진입하지 않고
top-level action이 완성된 뒤 한 번만 실행하며, semantic state를 수정하지 않는다.

## API의 세 층

### Chart Authoring API

일반 사용자가 호출하는 concise domain action이다.

```text
createCanvas
createData
createPointMark / createLineMark / createBarMark / createAreaMark / createRuleMark
encodeX / encodeY / encodeX2 / encodeY2 / encodeStroke / encodeStrokeWidth
encodeColor / encodeSize / encodeShape / encodeStrokeDash / encodeOpacity
encodeHistogram / encodeDensity / encodeHorizon
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
encodeXRange / encodeYRange / encodeXOffset / encodeYOffset / encodeGroup
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
삭제한다. Encoding channel, legend branch와 complete layer resource를 제거할 수 있고 빈 parent
object도 함께 정리한다. Source dataset state는 생성 이후 삭제하거나 교체할 수 없고 unreferenced
derived dataset만 complete resource removal을 허용한다. 삭제도 동일한 `editSemantic` trace node로
기록된다. Layer removal은 semantic resource만 소유하므로 domain removal action이 related graphic,
config, selection/highlight와 orphaned derived data cleanup을 명시적으로 조합한다.

Encoding removal도 같은 경계를 따른다. Public `removeEncoding`은 closed channel vocabulary를 해석하고
same-mark companion와 guide ownership을 preflight한 뒤 `editSemantic({ remove: true })`를 조합한다. 그 다음
domain mark materializer가 empty concrete baseline에서 complete mark만 다시 만들고 source-dependent overlay를
replay한다. Named source dataset, scale와 coordinate는 이 transition의 소유물이 아니므로 보존한다. Exact
channel cascade와 error behavior는 current encoding contract가 소유한다.

### `createGraphics({ id, type, length?, parent?, before?, after? })`

Graphic identity, type, optional homogeneous cardinality와 tree attachment를 만든다.

- Equivalent definition은 idempotent할 수 있다.
- 같은 ID의 conflicting type, length, parent, placement는 error다.
- `parent`를 생략하면 `graphicSpec.order`, 지정하면 Canvas/collection의 named `children`에 붙인다.
- `before`/`after`는 같은 parent의 direct sibling order를 만든다.
- `length`는 drawable item cardinality만 만든다.
- Heterogeneous `collection`은 `editGraphics(items)`로 concrete item을 제공한다.

### `editGraphics({ target, property, value | remove })`

기존 graphic 또는 concrete item의 property 하나를 upsert한다.

- Scalar는 homogeneous items 전체에 broadcast한다.
- Outer array는 item index별 값으로 distribute한다.
- Nested array/object item은 한 concrete item의 값으로 그대로 저장할 수 있다.
- `length`는 collection cardinality를 immutable하게 바꾼다.
- `items` replacement는 모든 item이 기존 drawable type과 같으면 parent의
  homogeneous type을 보존한다. Item type이 섞일 때만 parent를 heterogeneous
  `collection`으로 전환한다.
- Target, property, concrete value는 shared graphic schema로 검증한다.
- `remove: true`는 property/value 없이 named graphic subtree를 삭제하고 parent children 또는
  top-level order에서 detach한다. Canvas root는 삭제할 수 없다.
- Generated item은 독립 삭제하지 않고 owning collection의 `length` 또는 `items`를 편집한다.

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

Density도 target area ID에서 derived data ID를 만든다. Baseline과 category placement는 같은 namespace와
revision lifecycle을 공유하며 category/split provenance만 transform branch로 구분한다. 이렇게 해야 하나의 program에서
여러 point 또는 area에 같은 aggregate action을 적용해도 충돌하지 않는다.
Density edit revision은 `${target}DensityDataRevision${n}`을 사용한다. Rebind 뒤 이전 revision이 다른
layer나 derived dataset에서 참조되지 않을 때만 `releaseDerivedData`가 semantic resource 전체를 제거한다.
Regression, density와 box edit은 같은 pure derived-revision planner에서 deterministic ID, explicit
consumer rebind 목록과 optional release intent를 얻는다. 실제 전환은 wrapped `create*Data →
rebindLayerData → releaseDerivedData` hierarchy를 유지한다.

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
  → type/domain/range와 type-valid policies를 semanticSpec에 저장

rematerializeScale
  → 모든 semantic consumer 검색
  → combined values와 scale policy 검증
  → domain/range/bandwidth 계산
  → resolvedScales 저장
  → 직접 매핑 가능한 concrete property edit
  → 필요한 mark/guide rematerialization action 실행
```

하나의 mark가 여러 positional scale을 함께 소비하면 plan은 관련 scale을 먼저 모두 resolve한 뒤 mark를 한 번
materialize한다. 내부 scale rematerialization step은 이 경우 direct mark edit을 억제하고, 뒤따르는 explicit
mark step이 완성된 scale 집합을 읽는다. 이는 Canvas edit, data revision과 encoding reassignment 도중 새 theta와
이전 radius처럼 부분적으로 stale한 scale 조합을 concrete geometry에 적용하는 것을 막는다. 한 scale만으로도
완성 가능한 기존 consumer는 direct scale rematerialization 경로를 유지한다.

Consumer resolution은 mark policy를 고려한다.

- ordinary point position은 row field 값을 직접 mapping한다.
- compatible line, area, bar와 rule position은 point와 같은 continuous/transformed mapping grammar를 사용한다.
- line scalar aggregation은 final temporal x/series grain에서 domain을 계산한다.
- grouped bar scalar aggregation은 final x/category cell grain에서 domain을 계산한다.
- histogram x는 shared bin policy를, y는 final stacked count를 사용한다.
- appearance scale은 deterministic ordinal domain과 palette/range를 사용한다.
- Continuous color의 Point/aggregate Bar/Rect consumer validation은 grammar/scales/colorConsumers.js가 생성·scale 편집·materialization에 공통 제공한다. Full의 scale type 편집은 연결된 mark와 guide를 포함한 immutable candidate를 검증한 뒤 같은 child plan을 적용한다. Gradient/interval의 교체는 legend transition owner가 네 edge의 common layout/style 보존과 family-only 설정 충돌을 검사하며 removeLegend/createLegend/editLegend를 조합한다. Basic은 typed interval legend 생성을 완성하지만 editScale과 구조적 type 전환은 Full 경계에 남긴다.
- quantitative sequential midpoint는 semantic scale 한 곳에 저장한다. Color grammar가 두 구간 mapping과 범위 검증을 소유하며 mark와 gradient strip은 같은 mapper를 사용한다. Legend의 값 위치와 midpoint tick은 value-linear다. Exact policy는 Current CORE/ENCODINGS/LEGEND_AND_TITLE을 따른다.
- point-item `unknown`이 있으면 invalid inputs를 domain inference에서 제외하고 final mapping에서 channel-valid
  fallback을 적용한다.
- palette registry는 accepted name, family, sampling을 소유하고 concrete CSS color array만
  materialization 경계 밖으로 전달한다. renderer와 mark/legend consumer는 palette name을 해석하지 않는다.

Binned consumer와 unbinned consumer, histogram count consumer와 다른 y policy처럼 한
scale에서 의미가 충돌하는 조합은 공유하지 못한다.

Position encoding resolution은 공통 orchestration과 mark-specific policy를 분리한다. 공통
resolver는 target/data/field/coordinate/scale과 field values를 검증한다. `point`, `line`,
`bar`, `area`, `rule`, `arc`, `text` policy는 각각 허용하는 aggregate/bin/stack 조합과 mark 고유의
completeness 제약만 소유한다. 새 mark를 지원할 때 공통 resolver에 조건문을 추가하지 않고
해당 policy를 등록하며, policy는 semantic 결정을 반환하고 graphic state를 직접 수정하지 않는다.

공통 semantic applicator는 field/datum 교체, field type, normalized bin mode,
aggregate와 stack을 동일한 순서로 기록한다. 이후 mark materialization policy가 incomplete
상태에서 scale만 resolve할지, 빈 mark를 다시 만들지, complete mark보다 현재 scale을 먼저
resolve할지를 결정한다. Scale materializer도 같은 policy registry에서 consumer가 direct
property edit, full mark rematerialization 또는 상위 plan으로 defer되어야 하는지를 읽는다.
Encoding planner의 shared-consumer 범위와 incomplete-mark 처리, Canvas/data planner의
deferred scale application과 existing incomplete mark 복구도 같은 registry가 소유한다.
따라서 position action, scale action과 cross-cutting planner에 mark type 목록을 따로
복제하지 않는다.

## Mark materialization policy

각 semantic mark type은 자신이 concrete output을 만들 준비가 되었는지를 mark
materialization policy에 정의한다.

### Bar geometry와 layout policy

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
- Cartesian point jitter는 `materializationConfigs.jitters[target]`이 requested policy와 resolved metadata를
  소유한다. Semantic x/y mapping 후, shape/radius/stroke extent를 포함해 plot과 categorical slot bounds 안에서
  deterministic final center를 계산한다. 같은 action 재호출은 semantic base에서 교체하고 `removeJitter`는
  assignment를 제거한다. Highlight의 concrete offset은 jitter 이후에 적용된다.

### Line

- Cartesian line은 x/y, Polar line은 theta/radius와 supported raw quantitative 또는
  scalar/parameterized aggregate semantics가 필요하다.
- Parallel line은 ordered Parallel dimensions를 하나의 source row당 하나의 path로 투영한다. Dimension별
  scale mapping, missing-value policy, row key와 series appearance는 materializer가 final command/item identity로
  확정하며 renderer에는 Parallel-specific branch가 없다.
- 명시적 group의 field 또는 fields tuple만 series identity를 결정한다. 색·점선·두께·opacity는 series 안에서
  raw 값이 하나인 appearance field를 사용한다. Shared path-series grammar가 identity와 유일성 검증을 소유한다.
- 명시적 group이 없으면 color 또는 strokeDash로 나누며 둘 다 있으면 같은 field여야 한다.
  Width/opacity는 implicit identity에 참여하지 않는다. Ordinary ranged Area도 explicit tuple을 지원한다.
  통계·layout owner의 group과 Parallel row identity는 별도 계약을 유지한다.
- `encodeGroup`과 `encodeStrokeDash` 재호출은 기존 assignment를 원자적으로 교체한다.
  StrokeDash의 field/constant mode도 같은 action이 소유하며, 더 이상 참조하지 않는 named scale은
  resource identity를 보존하기 위해 자동 삭제하지 않는다.
- series 하나당 backend-neutral path 하나를 만든다.
- source first-appearance group order와 명시적 x sort를 사용한다.
- curve는 mark materialization config이며 `linear`, step family와 네 cubic family를 final `M/L/C`
  commands로 변환한다. `editLineMark`는 curve를 갱신하며 scalar width/opacity는 같은 channel의 field encoding과 충돌한다.
  encodeStrokeWidth/encodeOpacity가 field↔constant 교체와 scale/legend/highlight 재계산을 소유한다.
- Polar series는 theta domain order로 stable sort한 뒤 shared Polar projection으로 final points를 만든다.
  현재 Polar curve는 `linear`만 지원한다. `closed`도 materialization config이며 true이면 첫 point를
  복제하지 않고 series마다 final `Z` 하나를 추가한다. `editLineMark`의 closed 변경과 scale/Canvas/data/
  selection 변경은 동일한 line rematerializer를 호출한다.

### Arc

- Arc는 bar의 coordinate-dependent 변형이 아니라 별도 semantic `arc` mark다.
- Aggregate 없는 quantitative theta는 positive source row마다 하나의 final sector를 만들고 row value의
  합에 대한 비율로 full theta range를 나눈다. Source order와 row grain을 보존하며 zero row는 생략한다.
  Negative/non-finite value와 all-zero total은 semantic state 변경 전에 거부하고 radius encoding과 함께
  사용할 수 없다.
- Count theta는 category별 final aggregate grain을 한 바퀴의 비율로 나누며 radius encoding 없이도 pie/donut
  sector를 materialize한다.
- Ordinal/nominal theta와 quantitative radius는 equal-angle band 안의 radial sector를 만든다. Color
  `layout: "overlay"`가 있으면 같은 theta band의 outer radius descending 순서로 그려 작은 sector도 보존한다.
- `innerRadius`는 available Polar radius의 `[0, 1)` 비율이고 auto radius range의 minimum이 된다. `padAngle`은
  public theta와 같은 degree 단위다. 둘 다 mark materialization config가 소유한다.
- Zero-area sector는 placeholder path를 만들지 않는다. 모든 visible sector는 backend-neutral final `M/L/C/Z`
  command path 하나이며 renderer는 arc, angle, aggregate 또는 overlay를 해석하지 않는다.
- Arc selection policy는 final `sector` grain, source members, theta/radius/color semantic channel과 concrete path
  bounds/attachment를 소유한다. Highlight는 unhighlighted baseline에서 fill/outline/opacity/offset을 다시 적용하고
  categorical legend symbol만 동기화한다.
- `editArcMark`, scale/Canvas edit, filtering과 highlight replay는 같은 arc rematerializer를 사용한다.

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

### Temporal input normalization

TemporalInputUnit belongs to the encoding or transform input descriptor. The shared fields parser implements
explicit auto/year/timestamp; positions, color, scale consumers, geometry and channel selections consume it.
Raw rows are immutable. Same-binding reassignment preserves a unit; new bindings clear stale units. Time scales
and ticks consume normalized timestamps. Horizon-generated timestamps carry an explicit timestamp binding.
Regression/Density/Horizon normalize JSON groupBy:false before creating their existing transforms; no schema
or false field sentinel is added. Mean Bar and nominal numeric color defaults remain unchanged.

### Rule

- Rule은 semantic `rule` layer 하나와 backend-neutral `line` collection 하나를 가진다.
- `createRuleMark`는 identity, data binding과 empty collection을 만들고 요청된 scalar style을 기존
  encodeStroke/encodeStrokeWidth/encodeStrokeDash/encodeOpacity에 위임한다. editRuleMark도 같은 owner를
  사용하며 모든 입력을 먼저 검증한다. Active field assignment와 scalar edit는 충돌한다.
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

### Tick

- Tick은 complete Cartesian x/y anchor를 요구하는 centered fixed-length line glyph다.
- `length`, `stroke`, `strokeWidth`, `opacity`는 mark materialization config가 소유한다. Default length는 `14`,
  stroke width는 `2`, opacity는 `1`이며 stroke는 shared theme mark color를 사용한다.
- x 또는 y 하나만 있는 중간 상태는 semantic assignment와 scale을 보존하지만 line item을 만들지 않는다.
  두 position이 완성되면 source row마다 concrete `x1/y1/x2/y2`를 materialize한다.
- Fixed-y rug distribution은 ordinary y field를 명시해 작성하며 x-only plot-edge placement를 추론하지 않는다.
- `encodeAngle`은 point/Tick에 finite constant 또는 quantitative field degree를 scale 없이 직접 저장한다.
  0°는 위쪽이고 양수는 clockwise이며 reassignment는 datum/field branch 전체를 교체한다.
- Tick은 angle마다 centered endpoint를 다시 계산한다. Point는 circle을 시각적으로 그대로 두고 square를
  포함한 polygon glyph를 center 주위의 concrete path command로 회전한다. Jitter extent도 같은 회전된
  geometry를 사용한다.
- `removeEncoding({ channel: "angle" })`는 assignment를 제거하고 unrotated baseline을 재물질화한다.
  Filter, facet, Canvas/scale 변경과 stored highlight replay도 mark policy를 통해 같은 concrete geometry를 만든다.
- Renderer는 Tick identity, center 또는 length를 해석하지 않고 ordinary concrete line collection만 읽는다.

### Aggregate bar provenance와 completeness

- Histogram은 binned x, count y, zero stack이 함께 있어야 한다.
- Grouped bar는 한 discrete category axis, perpendicular aggregate measure axis, null stack,
  orientation에 맞는 xOffset/yOffset group과 bar width가 필요하다.
- final grouping grain에서 aggregate하고 observed cell만 rect로 만든다.
- Missing categorical combination을 자동으로 zero rect로 합성하지 않는다.

Aggregate grammar는 scalar operation과 parameter object를 한 canonical owner에서 검증한다.
Parameterized quantile은 finite output sample에 linear interpolation을 적용하고, ordered
`first | last`는 valid comparable `orderBy` key와 stable source-order fallback으로 row value를
선택한다. Public encoding action은 omitted ordered direction을 `"ascending"`으로 normalize해
semantic state에 저장한다. 계산 가능한 candidate가 없는 final group은 zero나 임의 row로
대체하지 않고 생략한다.

Dataset transform vocabulary와 capability registry는 `grammar/transforms.js`가 소유한다.
Filter, mark filter, regression, density, interval, window, box summary/outlier의 상세 schema는 각
grammar 모듈이 검증한다. `editSemantic` primitive는 transform별 property를 다시 구현하지
않고 registry에 위임하므로 domain action과 primitive authoring이 같은 transform contract를
사용한다. 같은 descriptor가 materializer operation, facet replay topology와 requested-transform
normalization, provenance transparency를 함께 소유해 새 transform을 여러 dispatch table에 중복
등록하지 않는다.

Mark가 incomplete한 중간 상태일 때 empty graphic collection은 존재할 수 있지만 잘못된
임시 geometry를 만들지 않는다. 이후 responsible encoding action이 completeness를
확보하면 mark rematerialization을 호출한다.

Highlighted mark의 rematerialization은 하나의 shared lifecycle을 사용한다. Lifecycle은
target에 적용된 highlight config를 immutable baseline에서 잠시 분리하고, stale concrete
items를 비운 뒤 해당 mark의 wrapped rematerialization action을 호출하며, 마지막으로 저장된
selection을 현재 item identity에 다시 적용한다. Mark별 materializer는 baseline geometry와
appearance만 소유하고 highlight strip/replay 절차를 복제하지 않는다.

## Cross-cutting rematerialization plan

Canvas 또는 shared scale 변경은 여러 mark와 guide에 동시에 영향을 줄 수 있다. 이
의존성을 action마다 ad hoc method chain으로 복제하지 않고 plan으로 표현한다.

```javascript
[
  { op: "rematerializeScale", args: { id: "x", guides: false } },
  { op: "rematerializePointMark", args: { id: "points" } },
  { op: "rematerializeLegend" },
  { op: "rematerializeTitle" }
]
```

Planner는 현재 semantic state, resolved scale, materialization config, concrete graphic
presence를 읽어 applicable step만 만든다. 모든 plan은 `scale → mark → guide → layout →
highlight` phase 순서를 사용하고 같은 `op + args` step을 deduplicate한다. Executor는 그
순서대로 실제 wrapped action을 호출한다. 여러 scale이 함께 바뀌는 plan은 각
`rematerializeScale`에서 guide 갱신을 유예하고 mark가 모두 수렴한 뒤 guide를 한 번
갱신한다. 따라서 중간 상태를 피하려고 legend config를 임시 제거하거나 복원하지 않는다.

Layout phase consumer는 `materialization/layout.js`의 explicit registry/policy가 계획한다. 현재 chart title이
등록되어 있으며, 새로운 layout consumer는 dependency planner에 조건문을 흩뿌리지 않고 이 registry에
등록한다. Planner가 만든 step도 반드시 기존 wrapped action을 호출한다.

Plan step은 생성 시 plain-object schema와 finite JSON-compatible argument를 검증하고
immutable snapshot으로 고정한다. Equivalent-step 판정은 object key 작성 순서에 의존하지
않는 canonical argument representation을 사용한다. Executor는 이미 정렬된 flat plan을
그대로 한 번 deduplicate한 뒤 실행하며, 존재하지 않는 operation은 action 호출 전에
명확한 materialization error로 거부한다.

주요 plan은 다음과 같다.

- Canvas width/height/margin 변경 후 positional scale, complete mark, legend, title 갱신
- Scale 변경 후 해당 axis component, grid, legend consumer 갱신
- Mark type별 completeness policy에 따른 mark rematerialization
- Field-driven color/size/shape/opacity/stroke-dash 변경 후 scale, affected mark, legend 갱신

Encoding planner에서 point는 scale → mark, line/bar/rect/rule은 mark, shared-color area는 같은 scale의
모든 area mark를 declaration order로 계획하고, 존재하는 legend를 마지막에 계획한다.
새 position encoding이 기존 automatic scale을 공유하면 새 consumer가 scale domain을 확장할 수 있으므로,
target mark의 기본 materialization step 뒤에 같은 position scale을 사용하는 모든 기존 complete sibling mark를
declaration order로 rematerialize한다. 따라서 error band, interval boundary 또는 다른 overlay가 추가되어도 먼저
그려진 source mark가 이전 scale domain의 concrete 좌표를 유지하지 않는다.

Rect는 bar와 별도 semantic owner다. 두 categorical band position은 observed row마다 full-band cell을 만들고,
continuous/temporal x/x2 및 y/y2 pair는 두 endpoint를 normalized concrete bounds로 만든다.
한 pair만 있고 반대 축이 없으면 그 방향은 현재 plot bounds를 채운다. Datum은 shared positionDatum grammar로
정규화하며 field/color 없이 상수만 있으면 dataset 길이와 무관한 한 항목이다. Mixed binding은 row grain과
유효 행 검사를 유지한다. Constant-only selection membership은 원래 dataset 전체이고 common field만 노출한다. Aggregate, baseline,
stack과 bar width는 적용하지 않는다. Missing field는 placeholder 없이 그 row만 생략하고 automatic domain에서도
제외한다. Rect의 materialization/selection owner는 같은 resolved row grain을 공유하므로 cell identity와 graphic
index가 rematerialization 뒤에도 source-index 기준으로 안정적이다.

Text annotation은 explicit source 또는 current/unique compatible point/bar/rect/rule/arc layer를 semantic `source`로 저장한다.
Explicit source는 미완성이어도 관계를 저장하며 capability owner가 source readiness를 검사한다. Position encoding plan과
scale edit은 직접 scale consumer 뒤에 source-dependent label을 재계산한다. 미완성으로 돌아가면 기존 label을 지우고
완성 시 복구한다. 새 scale binding도 inherited text scale ID가 아닌 source relation을 통해 추적한다.
Source-owned text는 독립 scale consumer가 아니다. `grammar/text.js`의 ownership 판별을 scale/domain,
Canvas/detach plan, guide inference/rebinding과 orphan cleanup이 공유한다. Inherited position aliases는
provenance로 보존하지만 실제 source만 domain 값을 제공한다. 직접 attached Text position encoding은 사전 거부하고
source 편집 또는 dx/dy를 사용한다. Position scale refresh는 attached text를 유예하며 source geometry 완료 뒤
source-dependent plan이 실행한다. Explicit-data independent Text는 기존 scale consumer다.
Independent Text의 x/y는 field와 shared position datum을 모두 받는다. x/y/text 중 field가 하나라도 있으면
dataset row grain이며 상수 위치를 broadcast하고, 모두 상수면 빈 데이터에서도 한 항목이다. 이 규칙은
임시 singleton dataset이나 annotation 전용 semantic schema 없이 일반 Text materializer가 소유한다.
Position encoding과 coordinate도 새 text layer에 명시적으로 복사하지만 concrete anchor는 source의 final
visual item grain에서 결정한다. 따라서 aggregate bar는 source row가 아니라 final bar마다 하나의 label을
만들고 rect는 cell center, rule은 final endpoint에 붙는다. Rect source에서 text fill을 생략하면 realized cell
six-digit hex fill의 relative luminance로 theme light/dark text를 결정한다. 다른 fill syntax는 normal text
default를 유지하고 explicit text fill은 항상 우선한다. Text 내용은
scale 없는 `encoding.text` field/datum 또는 content assignment다. Semantic content는 final-item membership과
source encoding을 받아 `grammar/markLabels.js`에서 category/value/share를 계산한다. Canonical aggregate를
재사용하고 source/category normalization scope를 encoding.text.normalizeBy에 저장한다. 원본 행 전체나
누적 끝점을 분모·구간 값으로 잘못 사용하지 않는다. Empty final set은 empty text이며 renderer는 share 의미를 모른다.
Text encoding action과 source dependency plan이 내용과 anchor의 재계산을 명시적으로 실행한다.
Typography, alignment, rotation과 `dx`/`dy`는 materialization config가 소유한다. Canvas 또는 scale edit은
registered text policy를 통해 concrete label을 다시 만든다. Public Text/Mark Labels/Annotation의 legacy
numeric rotation은 radians 의미를 유지하고 `{ value, unit: "degrees" | "radians" }` 입력은 action 경계에서
radians로 정규화한다. Cartesian axis title도 같은 경계를 공유한다. Polar placement angle과 encodeAngle의
기존 degree 의미는 별도 grammar로 유지한다.

`createMarkLabels`는 source-owned text 생성·content encoding·optional collision layout을
기존 wrapped child action으로 조합하는 create-only facade다. 독립 facade registry 없이
text/source relation과 하위 config가 결과와 후속 편집을 소유한다.

`createAnnotation`도 별도 registry를 만들지 않는 create-only facade다. Mark anchor는 `createMarkLabels`로
final-item source lifecycle을 유지한다. Data anchor는 complete Cartesian source가 가진 data, coordinate,
x/y scale/type/unit을 독립 Text datum encoding에 복사하므로 datum이 automatic domain에 참여하고 이후 하위
encoding/scale 편집을 따른다. Plot anchor는 x/y [0,1] fraction과 `<id>-x`/`<id>-y` ordinary linear scale을
만든다. 세 branch의 전체 wrapped child chain은 discarded immutable program에서 먼저 검증하며, 후속 편집·layout·제거는
기존 Text, position, scale, label-layout, mark owner가 수행한다.

참조선·참조 구간 facade는 `actions/marks/references.js`에서 source binding을 선택한 뒤
기존 Rule/Rect 생성과 position encoding을 조합한다. Data 좌표는 선택한 named scale을 공유하며,
plot 비율은 명시적 [0,1] domain과 automatic range를 갖는 일반 named scale을 사용한다.
별도 reference registry나 source-owned child 관계를 만들지 않고 기존 scale·mark lifecycle을 따른다.

Collision-aware label layout은 semantic text position을 다시 author하지 않는다.
`materializationConfigs.labelLayouts[target]`이 requested axis/padding/distance/bounds/leader policy와 latest
resolution summary를 소유하고, `layout/labels.js`의 pure deterministic grammar가 shared text metrics로 base label
bounds와 candidate 순서를 계산한다. Final displacement는 concrete text `x`/`y`에만 적용되고 optional leader는
ordinary target-owned line collection이다. Source anchor는 persisted text `source` relation에서만 읽으며 arbitrary
nearby mark를 탐색하지 않는다.

Text rematerializer는 항상 semantic base text를 먼저 완전히 복구한 뒤 stored label policy를 정확히 한 번 replay한다.
`layoutLabels`의 직접 호출은 같은 base를 다시 만든 뒤 complete policy를 교체하고, `removeLabelLayout`은 policy와
leader를 structural remove한 뒤 base text를 복구한다. Canvas/data/scale/source-mark/text edit와 owning mark removal도
같은 owner를 통해 replay 또는 cleanup하므로 이전 displacement가 누적되거나 stale leader가 남지 않는다. Feasible
zero-overlap candidate가 없으면 deterministic best effort와 structured warning을 저장하며 silent success로 처리하지
않는다. Renderer는 이 lifecycle이나 collision 의미를 모르고 final text와 line만 그린다.

이 plan은 자동 compiler가 아니다. `editCanvas`, `rematerializeScale` 같은 명시적 action
또는 responsible encoding action implementation이 planner와 executor를 호출할 때만 실행된다.

## Canvas와 layout

`createCanvas()`는 `createGraphics(canvas)`, `createGraphics(plot-main, parent = canvas)` 뒤
`editCanvas()`를 wrapped child로 호출한다.
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
낸다. Legend grid, title reading block/rotated bounds, grid line endpoint처럼 program state를
수정하지 않는 geometry는 `layout/`의 pure function이 소유한다. Action resolver는 resource
inference와 collision 검증만 담당하고 이 geometry 결과를 wrapped graphic action에 전달한다.

## Axis, grid, legend, title

### Axis

`createAxes`는 persisted coordinate family와 encoding을 읽어 axis applicability를 결정한다. Cartesian은
x/y, Polar는 theta/radius, Parallel은 ordered dimension axis를 사용한다.

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

Cartesian/Polar complete-axis edit는 component object와 `false`를 구분한다. Object는 existing wrapped leaf edit를,
`false`는 matching materialization config와 concrete graphic removal을 조합하고 title이면 semantic title leaf도
제거한다. Aggregate는 selected edit/removal 전체를 immutable speculative branch에서 preflight하고 retained component만
current Canvas/scale dependency plan에 남긴다. 마지막 component가 사라지면 existing complete-axis removal이 empty
semantic/config branch까지 정리한다. Scale, coordinate, mark encoding과 source data는 component lifecycle의 소유물이
아니므로 보존한다.

Standalone size/stroke-width의 sampled content editor는 count·title mode·partial typography를 공통 검증하고 각 family의 immutable guide config에 저장한다. Size materializer는 같은 target의 categorical block만 상속하며 다른 target에서 style/geometry를 읽지 않는다. Family별 size-area/line-width geometry와 scale mapping은 각 materializer에 유지한다. 정확한 범위는 `contract/current/LEGEND_AND_TITLE.md`를 따른다.

Parallel axis의 semantic owner는 target/coordinate/scales와 explicit field/title 배열을 저장한다. Field별 component style/tick/visibility recipe와 all/selected 생성 범위는 private guide config가 소유한다. Field 이름은 object key로 쓰지 않는다. Public field lifecycle은 `actions/guides/axes/parallel/lifecycle.js`, 순수 옵션 정책은 `policy.js`, geometry는 `resolve.js`, wrapped concrete reconciliation은 `parallel.js`가 소유한다. 정확한 옵션과 lifecycle은 `contract/current/AXES.md`를 따른다. Layer-data plan은 모든 소비 scale을 먼저 해결한 line에 `scales:false`를 전달하여 guide 재계산이 mark 내부와 guide stage에서 중복되지 않도록 한다.

Parallel axis는 dimension마다 axis line, ticks, labels와 title을 만들고 dimension scale을 독립적으로
설명한다. 현재 aggregate `createAxes`가 이 family를 dispatch하며 Cartesian channel별 axis option을 Parallel에
재해석하지 않는다. Parallel grid는 현재 지원하지 않으므로 `createGuides`는 applicable axis와 categorical
line legend만 조립한다.

### Grid

Grid는 horizontal과 vertical을 독립적으로 켜고 끌 수 있다. `createGuides`의 applicable
기본은 horizontal grid다. Grid line은 concrete `line` collection이며 mark보다 뒤에
그려지도록 explicit placement를 사용한다. Axis tick value가 있으면 같은 값을 재사용할
수 있다. `editHorizontalGrid`와 `editVerticalGrid`는 existing semantic scale/coordinate
binding을 유지하면서 direction별 tick policy와 appearance config를 바꾸고, 대응하는
wrapped `rematerialize*Grid` action으로 concrete collection 전체를 다시 만든다.

Guide aggregate의 적용 가능성은 `actions/guides/applicability.js`가 positional-channel
descriptor와 persisted encoding/scale을 읽어 한 번 결정한다. `createGuides`와
`createGrid`는 이 결과를 공유한다. Polar omission은 실제 존재하는 theta/radius channel의
axis와 grid만 선택하므로 theta-only count arc가 radial guide를 합성하지 않는다.

### Legend

항목형 범례의 pure content→edge owner `layout/legendItems.js`는 formatted labels와 sample dimensions를 받아
sample별 actual stroke bounds와 minimum slot의 union을 배치 전에 측정하고 single-edge 좌표를 반환한다.
Label column, row/pitch/title spacing과 border가 같은 occupied slot을 사용한다. 공통 grid 측정을 사용하며 categorical, interval, size와 stroke-width가 소비한다. Categorical owner는 실제 recipe와 canonical point-shape graphics를 local collection으로 구성하고 canonical concrete bounds로 path miter까지 측정하여 item owner에 전달한다. Explicit legacy-bottom도 같은 occupied slot을 사용하되 고정 text anchors와 title/item/plot 간격 검증을 유지한다.
Explicit value-format token의 공통 owner는 `grammar/valueFormat.js`다. Numeric `.0`–`.12` `f/%/e`, UTC
`%Y/%m/%d/%b/%%` 검증과 실제 변환을 Axis, Text, continuous legend가 공유한다. 각 surface의 `auto`는 기존
tick-aware, exact-string, distinct-sample owner에 남는다. Axis만 legacy `{ decimals }`를 허용하고 continuous
legend는 nested `labels.format`으로 token을 저장한다. Family compatibility와 categorical identity 보호는 호출
surface가 결정한다.
Scale/format/appearance 검증은 family action에 남고 horizontal single/multi-block placement는 lane owner가 final
concrete bounds를 소비한다. Hidden title은 실제 occupied bounds에 포함하지 않는다. Categorical grid도 hidden title의 높이와 inline gap을 제외하고 legacy-bottom border는 visible item bounds를 사용한다.
Size는 categorical 내부 좌표 계산에 의존하지 않고 실제 circle bounds와 sample slot을 제공한다. Side lane은 각 block의 요구 간격을 포함한 공통 label column과 nested border bounds를 소유한다. Horizontal 결합은 pure group layout이 independent block을 먼저 pack하고 outer lane이 그 결과를 atomic block으로 배치한다. Nested border와 두 title을 함께 이동하며 size 자체 layout config는 보존한다. Same-edge collision은 공통 최종 상태 검증으로 수렴한다. Single horizontal legend도 wrapped rematerializeHorizontalLegendLane으로 수렴한다. Pure layout/legendLane.js가 foreground와 background union을 align/offset에 맞춰 translation하고 최종 Canvas fit을 검사한다. Family의 intrinsic horizontal 좌표 fit은 이 단계까지 유예하며 side/legacy fit은 기존 owner에 남는다. Same-target size는 categorical의 effective edge를 사용하고 explicit legacy-bottom은 horizontal lane에서 제외한다. Continuous common normalizer가 side alignment를 검증하고 gradient/opacity/interval/size/width의 title-style normalizer를 공유한다. TitleStyle에는 label offset을 허용하지 않으며 gradient의 create/edit는 동일한 top title-position 계약을 사용한다. Opacity owner는 실제 circle stroke extent와 text 치수로 sample spacing을 계산하고 공통 final layout이 그 결과를 소비한다. Side lane은 mirrored label anchor의 절대 center 거리를 유지한다. Categorical, interval과 width도 실제 sample/font 간격을 사용한다. 각 family의 네 edge와 생성·편집·제거·scale/encoding/Canvas replay는 공통 통합 matrix로 검증한다. 신규 categorical+size는 edge와 무관하게 typography를 공유하며 retained standalone size의 자체 style은 보존한다.

Categorical creation와 content revision의 공통 owner는 `actions/guides/legends/lifecycle.js`다.
선택된 channels의 definition/automatic recipe를 재검증하고 기존 title visibility, styles, order와 caller recipe를
보존한다. createLegend, editLegend content replacement, partial removeLegend, removeEncoding이 이 owner를 공유하며 semantic/graphic 변경은
기존 wrapped primitives와 component materializers로 명시적으로 수행한다. Resource-kind cleanup도 같은 owner가
관리한다. Symbol component type/order reconciliation도 같은 lifecycle owner에서 editor와 rematerializeLegend가 공유한다.
Dependency replay는 inferredSymbol인 recipe만 현재 companion context로 다시 resolve하며 explicit recipe는 보존한다.
Renderer에는 content 추론·복원 로직을 추가하지 않는다.

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
Explicit channel selection은 정확한 content 경계이며 categorical+size의 요청을 두 기존 owner에 분리한다.
Recipe inference와 정규화는 categorical recipe owner가 공통 처리하며 config.inferredSymbol이 automatic/caller
provenance를 저장한다. Content 재생성은 automatic recipe를 다시 추론하고 explicit recipe를 유지한다.
Editor는 recipe layer 집합이나 순서가 바뀌면 symbol components를 선언 순서로 재생성하여 drawing order를 보존한다.

Encoding reassignment는 existing categorical legend의 inferred field/title/domain/symbol을
갱신하되 explicit title과 appearance config를 보존한다. Field-driven strokeDash를 constant로
바꾸면 strokeDash component만 제거하고, 남는 channel이 없을 때만 legend resource와 graphics를
제거한다.

Chart-independent legend default는 right다. Top/bottom, horizontal/vertical direction,
columns, alignment, title position, border 등은 explicit option이다.
Categorical placement mode는 config.layout 한 곳에 edge 또는 legacy-bottom으로 저장한다. Option 존재 여부로
mode를 추론하지 않는다. 생성 default는 edge이며 편집 omission과 encoding/Canvas/scale replay는 저장한 mode를
보존한다. Legacy-bottom은 Canvas 하단 고정 single-row를 명시하는 compatibility mode다.
Right/left에 둘 이상의 legend block이 있으면 각 family materializer가 intrinsic concrete graphics를 먼저
만들고 `layout/legendLane.js`의 pure lane grammar가 공통 title-start, symbol-center, label-start 열과
top-to-bottom block placement를 계산한다. `rematerializeSideLegendLane`은 이 결과를 concrete graphics에
적용하는 유일한 wrapped owner다. Ordering은 owning layer declaration 뒤 family order이며 block 사이에는
최소 24 logical pixels를 둔다. Categorical과 size가 같은 target이면 하나의 occupied bounds와 border를
공유하고, independent gradient/interval/opacity/stroke-width block은 각 group bounds를 유지한 채 같은 lane에
참여한다. Left lane도 item 내부 symbol→label 순서와 resolved domain 순서를 보존하며 y-axis guide와 margin
충돌을 함께 검증한다. 공간이 부족하면 Canvas를 확장하거나 block을 옮기지 않고 전체 action이 실패한다.
Top/bottom에 둘 이상의 compatible block이 있으면 `resolveHorizontalLegendLane`이 concrete occupied width를
stable order로 측정하고 plot left부터 40 logical pixels 간격으로 배치한다. 남은 plot width에 맞지 않는 block만
바깥의 다음 row로 넘어가며 각 새 row도 plot left에서 시작한다. 이때 multi-legend의 absolute `align`은 placement에
쓰지 않고 single legend에서만 기존 의미를 유지한다. 각 row는 concrete title baseline과 graphical-element start를
공유하며 둘 사이를 12 logical pixels로 고정한다. `rematerializeHorizontalLegendLane`은 title과 나머지 content를
x/y로 별도 translation한 뒤 optional background를 final foreground bounds에서 다시 계산하고 chart title 또는
x-axis guide collision과 final Canvas bounds를 검증한다. Gradient와 opacity의 top/bottom label은 모두 graphical
element 뒤에 놓인다. Horizontal categorical과 sampled opacity의 `titlePosition: "left"`는 이 stacked-title
grammar 대신 하나의 graphical center line을 공유한다. Opacity sample은 symbol 뒤 8 pixels에 label을 두고 다음
sample 전 20 pixels를 유지한다.
`editLegend`는 mark channel/scale binding을 유지한다. Optional channels는 target 전체의 최종 content이며
creation.js의 공통 step descriptor와 기존 creation planner로 kind를 정하고 editor의 pure normalizer로
보존 config와 요청 style을 병합한다. Kind별 config factory가 wrapped primitives/materializers를 명시적으로
호출한다. 동일 normalizer를 일반 편집과 content 교체가 공유한다. Companion size의 유효 text style에는
요청한 leaf만 병합하며 title/count edit가 자체 스타일을 덮어쓰지 않는다.

### Title

Title은 guide와 별도 stable resource다. `createTitle`과 `editTitle`이 main title과 optional
subtitle을 concrete text node로 만들며 alignment, position, offset, gap, wrapping과 font는
materialization config가 소유한다.

Title alignment span은 Canvas나 guide-inclusive container가 아니라 실제 plot bounds다. Unit chart는 Canvas
margin으로 정해진 plot bounds를 사용하고 facet parent는 translated child plot bounds의 union을 사용한다.
따라서 child margin, axis label/title, facet padding과 shared legend는 left/center/right anchor를 이동시키지
않는다. Facet header도 같은 원칙으로 각 child plot center를 사용한다. Layout이나 Canvas 변경은 parent title
span과 모든 header anchor를 다시 계산해 rematerialize한다.

Top/bottom title은 horizontal block이고 left/right title은 complete reading block을 각각
`-Math.PI / 2`, `Math.PI / 2`로 회전한다. `maxWidth`가 있으면 shared deterministic text
metric이 word 또는 Unicode code-point character wrapping을 계산한다. Oversized word는
character fallback을 사용한다. Resolved line break, line coordinate와 rotation은
`graphicSpec`의 single text 또는 text collection에 저장되고 renderer는 다시 측정하거나 wrap하지 않는다.

Edit은 omitted property를 유지하고 supplied style leaf만 merge한다. Subtitle removal/restoration과
single/collection 전환은 stable graphic ID 아래에서 stale child 없이 reconcile한다. Title block은
actual occupied bounds로 requested margin과 same-edge guide collision을 검증하며 Canvas를 자동 확장하지 않는다.

### Drawing order

Grid, mark, axis, legend, title의 order는 `parent`와 sibling `before/after`로 명시한다. Plot children은
`grid → statistical band → ordinary mark → axis`, Canvas children은 `plot-main → legend → title` 순서를
사용한다. 예를 들어 grid는 mark 뒤가 아니라 같은 plot owner 안에서 mark 앞에 있어야 한다.
Rematerialization은 기존 node의 attachment와 sibling position을 보존하면서 concrete properties/items만
reconcile한다. Concrete type이나 cardinality가 바뀌어 stable node를 교체할 때도 기존 placement를 다시
적용한다.

## Aggregate action hierarchy

Aggregate action은 user-facing intent를 concise하게 표현하되 기존 wrapped child를 실제로
호출한다.

### Complete Pie

```text
createPiePlot
├─ createArcMark
├─ encodeTheta(category count | explicit weighted sum)
├─ encodeColor?
└─ compatible categorical guide fulfillment
```

Full-only H0가 source와 역할을 명시해 기존 owner를 조합한다. Partition 계산·sector membership·geometry는
기존 Arc/theta owner에 남고 별도 chart state나 compiler가 없다. Donut은 같은 Arc의 inner radius이며,
편집은 lower mark·encoding·scale·guide action이 맡는다. 정확한 계약은
[Complete chart facades](contract/current/COMPLETE_CHARTS.md#createpieplot)를 따른다.

### Histogram

```text
encodeHistogram
├─ encodeX(bin)
└─ encodeY(count, stack)
```

x와 y를 따로 authoring하면 incomplete histogram 의미가 되기 때문에 하나의 atomic
domain action을 제공한다.

### Density

Full-only `createDensityPlot`은 `createAreaMark → encodeDensity → encodeColor? → guide fulfillment`를
조합한다. GroupBy와 color를 독립적으로 작성하며 color는 derived profile이 보존하는 group field만
소비한다. Facade가 KDE 계산·source metadata join·orientation state를 추가하지 않는다.
정확한 계약은 [Complete chart facades](contract/current/COMPLETE_CHARTS.md#createdensityplot)를 따른다.

```text
encodeDensity
├─ createDensityData | createCategoricalDensityData
│  ├─ createDerivedData
│  └─ materializeDensityData
├─ editSemantic(layer.data = derived dataset)
├─ encodeX
├─ encodeY
├─ encodeGroup? 
└─ rematerializeAreaMark
```

Baseline placement에서는 `densityChannel`에 따라 value와 density field가 x/y 중 어느 쪽에 놓이는지 결정하고
scale zero baseline에서 area를 닫는다. Category placement에서는 categorical band center와 quantitative value axis를
같은 Cartesian coordinate에 연결하고 density magnitude를 band-relative full/half width로 바꾼다. Shared width는
전체 profile maximum, independent width는 category-local maximum을 사용하며 split halves는 같은 category maximum을
공유한다.

```text
editDensity
├─ createDensityData(new revision)
├─ editSemantic(layer.data = new revision)
├─ releaseDerivedData(old revision, only when orphaned)
└─ rematerialize affected shared-scale marks and guides
```

Density edit은 source, output field, orientation과 scale binding을 유지한다. 전달된 statistical parameter만
새 revision provenance에 적용하며 이전 derived values를 덮어쓰지 않는다. Baseline과 category mode를 전환할 때는
새 position definition을 검증한 뒤 stale encoding과 scale을 제거하고 모든 연결 consumer를 deterministic plan으로
다시 materialize한다.

### Horizon

Full-only `createHorizonPlot`은 `createAreaMark → createCoordinate? → encodeHorizon → editAreaMark? → x guide fulfillment`를
조합한다. Explicit opacity는 lower encoding의 opaque default 뒤에 적용한다. Palette가 band color를 소유하며
automatic guide는 original x만 보여준다. 별도 amplitude guide나 chart state는 추가하지 않는다.
정확한 계약은 [Complete chart facades](contract/current/COMPLETE_CHARTS.md#createhorizonplot)를 따른다.

```text
encodeHorizon
├─ createHorizonData
│  ├─ createDerivedData
│  └─ materializeHorizonData
├─ rebindLayerData
├─ encodeX
├─ encodeY
├─ encodeGroup
├─ encodeY2
├─ encodeColor
└─ materialize affected area and guide consumers
```

Horizon은 area target의 source x/y를 baseline 기준 signed amplitude로 바꾼 뒤 sign별 repeated band로 fold한다.
Semantic layer에는 ordinary x/y/y2/group/color encoding을 저장하고 folded y scale을 `[0, 1]`로 고정한다.
Automatic guide policy는 original x axis/grid만 허용하고 folded y axis와 internal sign/band color legend는 만들지
않는다. Area materializer와 Canvas/PNG/SVG/PDF renderer는 Horizon-specific branch 없이 ordinary closed path
collection을 처리한다.

```text
editHorizon
├─ createHorizonData(new revision)
├─ rebindLayerData
├─ releaseDerivedData(old revision, only when orphaned)
├─ retain compatible scale IDs and target identity
└─ rematerialize shared-scale marks and guides
```

```text
createViolinPlot
├─ createAreaMark
├─ configureAreaStrokeFromFill?
├─ encodeDensity(category placement)
├─ encodeColor?
└─ createGuides?
```

`createViolinPlot({ x, y })`은 Box/Gradient plot과 같은 categorical/quantitative positional family facade다.
Exactly one categorical role이 placement와 grouping을, one quantitative role이 density value axis를 소유한다.
Facade는 child chart를 category마다 만들지 않고 ordinary area, density encoding, color와 guide action을 그대로
호출한다. Facade 자체는 aggregate create-only이며 density revision은 `editDensity`, path appearance는
`editAreaMark`, scale/guide revision은 각 owning resource action이 담당한다.

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
├─ createRuleMark + encodeX/encodeY + encodeX2/encodeY2 + encodeXOffset/encodeYOffset?
├─ appearance encoding actions
├─ createErrorBarCap? (caps enabled)
│  └─ materializeRuleSpan
└─ createErrorBarCap? (caps enabled)
   └─ materializeRuleSpan
```

Exactly one of x/y is identifiable quantitative interval이고 다른 하나는
quantitative/categorical/ordinal/temporal position이므로 vertical과 horizontal orientation을 같은 action이
infer한다. 두 channel이 모두 quantitative이면 explicit interval fields나 statistical interval option이 interval
axis를 명확히 결정해야 한다. Statistical mode는 source row에서
mean/median interval을 만들고 explicit mode는 existing center/lower/upper field를 사용한다. Existing encoded
layer에서 data, coordinate, x/y field와 scale을 추론할 때 mark type이 아니라 persisted encoding capability를
selector predicate로 검사한다. Color는 appearance이고 `encoding.group`만 일반 series grouping으로 해석한다.
Matching categorical xOffset/yOffset이 있으면 offset field도 statistical grouping에 포함하고 source point, main rule,
fixed-pixel caps가 동일한 ordinal offset scale과 padding을 공유한다. Main rule과 optional fixed-pixel caps는 shared
stroke/width/dash/opacity assignment를 사용하며
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
`createGuides`와 `createGrid` aggregate는 같은 guide applicability owner를 소비한다. Arc
color는 categorical legend candidate이며 Polar grid direction은 stored theta/radius
scale별로 선택된다.

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

Unit program의 persistent theme은 `materializationConfigs.theme`이 소유한다. `applyTheme`은
선택한 preset과 action trace에서 판정한 explicit local override key를 저장하고 기존 concrete
graphics를 즉시 수렴시킨다. 이후 top-level action completion reconciliation은 새로 만들어지거나
rematerialize된 mark·guide·title·Canvas의 inherited color를 같은 preset으로 다시 투영한다.
`removeTheme`은 inherited 값을 light library default로 되돌린 뒤 theme config를 제거한다.

Theme reconciliation은 concrete appearance와 해당 materialization config만 바꾼다. Field-driven
palette output, semantic spec, resolved scale, 통계 row, grouping, domain, item/draw order는 입력과
동일하게 유지한다. Explicit local style은 값이 preset 또는 library default와 같더라도 action
trace의 top-level authoring argument로 식별하므로 theme 교체와 제거 뒤에도 보존된다. 정확한
public signature와 지원 preset은 [CORE current contract](contract/current/CORE.md)가 소유한다.

## Canvas renderer

`render(program, context, { pixelRatio })`는 `program.graphicSpec`만 읽는다.

1. Canvas 2D context capability를 검증한다.
2. `graphicSpec.order`에서 정확히 하나의 ordered Canvas를 찾는다.
3. Logical width/height와 background를 읽는다.
4. `pixelRatio`는 `<= 16777216` 상한과 float32 positive representability를 검증한다.
5. `logical × pixelRatio`를 rounded physical size로 preflight한다. 각 side는 `32767`,
   전체 backing store는 `16777216` pixels 이하이며 두 검증이 모두 끝난 뒤에만 Canvas를 resize한다.
6. 모든 native geometry/style scalar, derived rect/circle/nested-clip extent,
   nested translation, gradient direction magnitude 및 pixel-ratio-scaled 결과를
   `abs(value) <= 16777216`으로 전체 tree preflight한다.
7. Context를 logical coordinate system으로 scale한다.
8. Top-level order부터 named `children`을 balanced enter/exit event가 있는 재귀
   depth-first sibling order로 순회한다.
9. Orphan, unknown child, duplicate attachment와 cycle이 있으면 draw를 건너뛰지 않고 거부한다.
10. Graphic type dispatch table로 primitive drawer를 호출한다.
11. Collection enter/exit마다 Canvas state scope를 열고 닫으며, heterogeneous item은
   item type별로 dispatch한다.

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

Canvas backing-store resize, CSS logical size, density scale와 clear는 public Canvas
adapter가 소유한다. Root target resolution과 concrete draw traversal은 Canvas 2D-compatible
vector context가 재사용할 수 있는 internal seam으로 분리되어 있지만 public export는 아니다.

## SVG renderer

`renderToSVG(program, { title, description, resourceNamespace })`은 `program.graphicSpec`만 읽고
complete SVG document string을 반환한다.

- Root canvas logical width/height를 SVG width/height/viewBox에 동일하게 사용한다.
- Graphic tree, collection item과 attached child의 authored order를 유지한다.
- Nested canvas는 translated clipped group과 optional local background가 된다.
- Linear-gradient backend definitions는 normalized concrete coordinates에서 ephemeral하게
  생성되며 `graphicSpec`에 저장하지 않는다.
- Text는 authored content, position, alignment, baseline, rotation과 font style을 사용하고
  wrapping이나 layout을 다시 계산하지 않는다.
- Central serializer는 text, attribute, title과 description의 XML 1.0 scalar validity를 먼저
  검증하므로 invalid control, lone surrogate와 forbidden noncharacter를 partial string 없이 거부한다.
- 기본 clip/gradient ID namespace는 `graphicSpec`의 deterministic hash다. 동일 spec SVG를 같은
  DOM에 함께 둘 때는 ASCII letter로 시작하고 letter/digit/`_`/`-`만 쓰는 explicit
  `resourceNamespace`로 충돌을 피한다. Raw graphic ID는 document identifier로 노출하지 않는다.
- SVG numeric geometry는 finite JavaScript number 전체를 보존하며 Canvas-backed native cap을
  적용하지 않는다.

`ggaction/svg` dependency graph에는 DOM, filesystem, Node builtin과 native Canvas가 없다.

## PDF adapter

`renderToPDF(program, { output, metadata })`는 Node에서 native PDF document와 logical-size
page를 만들고 Phase 1의 Canvas-compatible concrete drawing target으로 같은
`graphicSpec`을 그린다.

- One chart는 exact logical width/height point의 one page다. Native page box가 조용히
  반올림하거나 clamp하지 않도록 positive integer `<= 16777216`만 backend 진입 전에 허용한다.
- Canvas와 공유하는 complete native geometry preflight가 PDF document/page 생성보다 먼저 실행된다.
- Text는 native PDF text operator로 남고 renderer가 glyph outline이나 raster image로
  바꾸지 않는다.
- Optional metadata는 title, author, subject와 keyword list만 받는다.
- PDF document, page, context, gradient와 buffer는 adapter-local ephemeral state다.
- Complete validation/drawing과 document close 뒤에만 directory/file을 기록한다.
- 반환값은 absolute output path, logical width/height, `pages: 1`과 byte length다.

PDF는 vector output이므로 `pixelRatio`를 받지 않는다. `ggaction/pdf`와
`ggaction/png`의 native/filesystem dependency는 browser-safe entry graph에 들어가지
않는다.

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
Physical side와 total pixel budget은 Canvas renderer와 동일하므로 oversized PNG는
directory/file write 전에 거부된다. Complete native geometry preflight도 Canvas resize와
output file 교체 전에 실행된다.

## Source ownership

```text
src/
├─ ChartProgram.js      core class와 built-in action의 assembly boundary
├─ BasicChartProgram.js core class와 creation-focused action subset의 assembly boundary
├─ actions/
│  ├─ canvas/          Canvas domain actions
│  ├─ boxPlots/        box option/target resolution, wrapped components와 materialization orchestration
│  ├─ coordinates/     coordinate authoring
│  ├─ data/            source/derived data actions
│  ├─ encodings/       channel registrar와 encoding orchestration
│  │  ├─ color/    categorical/continuous color policy, layout과 action assembly
│  │  └─ position/ channel resolution, mark policy dispatch와 semantic application
│  ├─ errorBars/       rule-based interval aggregate와 cap components
│  ├─ errorBands/      ranged-area interval aggregate orchestration
│  ├─ intervals/       interval composite source/channel/scale inference
│  ├─ guides/          axes, grids, categorical/continuous/size legends와 aggregate guides
│  │  └─ polar/axes/ Polar axis registrar boundary
│  ├─ marks/           mark별 directory entry, action ownership과 shared lifecycle
│  ├─ primitives/      editSemantic/createGraphics/editGraphics와 stateful semantic validation
│  ├─ regression/      regression aggregate, component actions와 inference policy
│  ├─ scales/          semantic scale create/resolve/materialize
│  │  └─ consumers/ common consumer discovery, mark family과 series layout policy
│  ├─ theme/           persistent preset lifecycle, local-override 판정과 graphical reconciliation
│  └─ titles/          chart title actions
├─ core/               action-free ChartProgram, action wrapper, immutable ownership, empty specs
│  ├─ programState.js immutable spec/context/trace transition
│  ├─ compositionState.js child program과 composition transition
│  ├─ materializationState.js resolved scale/config transition
│  └─ vocabulary.js    implemented mark/channel/legend closed vocabulary
├─ grammar/            pure Grammar-of-Graphics/statistical/schema calculations
│  ├─ bars/            bar grain policy와 aggregate 계산
│  ├─ facets/          facet dependency, scale resolution과 guide plan
│  ├─ regression/      parameter validation, model fitting과 derived rows
│  ├─ scales/          scale definition, validation, resolution과 mapping
│  └─ statistics/      shared statistical kernels
├─ layout/             Canvas/plot bounds, deterministic text metrics와 collision-aware label grammar
├─ materialization/    mark completeness policy와 cross-cutting dependency plan
│  ├─ bars/            bar completeness와 concrete rectangle 계산
│  ├─ facetGuides/     legacy categorical, preparation과 placement stages
│  ├─ marks/           capability registry와 rematerialization policies
│  └─ scaleGuideDependencies.js scale-to-guide dependency descriptors
├─ renderers/          Canvas, SVG, PNG와 PDF renderer/adapter
├─ selectors/          named semantic resource lookup
└─ theme/              shared built-in visual token
```

Chart example 이름에 따라 source implementation을 나누지 않는다. Histogram, grouped
bar, regression 같은 chart-level capability가 필요하더라도 reusable mark, encoding,
transform, guide 책임으로 분해한다. Chart-specific 완성 flow는 example, test program,
tutorial과 `agent_docs/impl/roadmapN/chart/` 계약에 둔다.

Ordinary mark family는 `actions/marks/<mark>/index.js`를 stable internal entry로 사용한다.
Registrar consumer는 이 entry만 import하고, mark-owned action implementation은 같은
directory 안에 둔다. Mark 사이에서 재사용되는 inheritance, placement와 highlight
lifecycle만 `actions/marks/` shared owner로 올린다.
Point mark는 create, edit와 materialize orchestration을 각각 `create.js`, `edit.js`,
`materialize.js`로 분리하고 deterministic jitter assignment는 `jitter.js`가 소유한다.
이 분리는 wrapped action identity나 trace hierarchy를 바꾸지 않고 한 mark family 안의
authoring lifecycle 책임만 분명하게 한다.

Scale edit의 완성된 후보 definition 계산과 모든 consumer/guide 호환성 preflight는
`actions/scales/editPolicy.js`가 소유한다. `editScale` action은 resource resolution,
primitive semantic edits와 materialization orchestration만 담당하며, 검증이 끝나기 전에
부분 semantic update를 만들지 않는다.

Legend kind별 semantic guide ownership, family, rematerialization action과 concrete graphic
resource ids는 `materialization/guides/resources.js`의 resource policy registry가 소유한다.
Legend removal, whole-legend rematerialization과 composition cleanup은 자체 kind switch를
복제하지 않고 이 registry를 조회한다.

`materialization/guides/layout.js`는 같은 registry와 canonical Cartesian axis IDs로 domain-owned
guide의 concrete occupied bounds를 투영한다. Pure `layout/guideCollisions.js`는 같은 edge의
독립 block intersection만 계산한다. Categorical+size는 하나의 block이다. Domain action wrapper와
dependent materialization-plan boundary는 transient nested transaction으로 sibling guide가 모두
갱신된 최종 상태에서 검증하며 반환 program에서 private scope를 제거한다. Core `action()`과
renderer는 이 policy를 모르고 extension primitive의 의도된 overlay에도 적용하지 않는다.
기존 family별 부분 cross-guide check는 이 공통 owner로 대체하고 family 내부 배치와 Canvas
bounds는 기존 owner가 계속 담당한다.

Facet의 `legacyCategorical` path는 이미 materialized된 child legend를 승격하는 일반 경로와
동일하지 않다. Legend 없이 작성된 direct-source unit chart의 compact point/rect recipe와
기존 concrete rendering 계약을 보존하는 제한된 fallback이다. 일반 path로 대체하려면
resource topology, symbol recipe, layout와 rendering equivalence를 먼저 증명해야 한다.

각 action category의 `index.js`는 registrar boundary다. `actions/index.js`가 모든 built-in
registrar를 한 번 조립하고 top-level `ChartProgram.js`가 이를 core program subclass에 등록한다.
`actions/basic.js`는 같은 domain action 중 다섯 common Cartesian facade의 생성에 필요한
subset만 조립하고 `BasicChartProgram.js`가 별도 core subclass에 등록한다. 두 assembly는
같은 core state와 ordinary facade/materializer를 공유한다. Scatter point.radius는 Basic에서도
encodePointRadius → internal encodeRadius로 전달된다. Rule/general opacity/statistics는 추가하지 않는다.
Canvas와 2D-bin은 Basic graph가
편집·revision planner를 끌어오지 않도록 동일 validation과 primitive를 사용하는 one-shot
creation action을 등록하며, full entry의 lifecycle action과 op identity는 유지한다.
따라서 `core/`는 `actions/`를 import하지 않는다. `grammar/`는 core utility와 다른 pure grammar만,
`materialization/`은 core/grammar/layout/selectors/theme만 의존한다. 이 방향과 local import cycle
부재는 source-boundary contract test가 검증한다.

External extension registry는 이 built-in registrar assembly와 분리된다. Public
`registerExtension()`은 완성된 full `ChartProgram` class만 전달받아 검증된 wrapped action을
prototype에 원자적으로 추가하며 Basic assembly나 `core/`에서 `actions/`로 향하는 dependency를
만들지 않는다.

서로 다른 closed vocabulary와 reassignment lifecycle을 가진 encoding은 한 파일에 묶지 않는다.
예를 들어 color와 stroke-dash는 같은 categorical scale 계열을 일부 공유하더라도 각각 독립된
action module과 registrar를 가진다.

Composite domain action도 registrar에 구현을 두지 않는다. Regression은 target/group inference,
band·line component action, top-level orchestration을 별도 module로 유지하고 `index.js`는 등록과
re-export만 담당한다.

Core state transition은 상태 소유권을 기준으로 나눈다. `programState.js`는 spec,
context와 trace, `compositionState.js`는 child/composition, `materializationState.js`는
resolved scale과 graphical authoring config를 소유한다. `core/ChartProgram.js`는 이 transition을
조립하는 runtime class boundary이며 각 상태 규칙을 다시 구현하지 않는다.

File/directory가 같은 module name을 동시에 소유하지 않는다. Scale, facet, regression,
position, color와 Polar axis처럼 하위 module을 가진 family는 directory `index.js`를 canonical
internal entry로 사용한다. Consumer는 family 내부 file이 아니라 이 entry를 import한다.

Shared statistical formula는 domain-specific module에 복제하지 않는다. Confidence interval과
regression이 공유하는 Student t kernel은 `grammar/statistics/studentT.js`가 소유하고,
각 domain wrapper는 input contract과 결과 interpretation만 소유한다. Regression family의
parameter validation, model fitting, derived-row assembly도 각각 분리되어 pure dependency direction을 유지한다.

Materialization의 cross-cutting policy도 descriptor owner와 consumer executor를 나눈다.
`materialization/marks/` 는 mark capability와 rematerialization policy,
`scaleGuideDependencies.js`는 scale이 어떤 guide에 영향을 주는지,
`actions/scales/consumers/`는 실제 consumer discovery와 family dispatch를 소유한다. Facet guide는
legacy categorical compatibility, child preparation, final placement의 세 stage로 분리하되 한
public composition flow에서 순서대로 실행된다.

Renderer boundary는 이 Phase에서 추가 abstraction을 생성하지 않았다. Canvas primitive
dispatch와 PNG adapter가 이미 `graphicSpec`-only contract과 package export boundary를 명확히
유지했기 때문이다. 책임이 충분히 단일하면 no-op review를 허용하고, 단지 대칭적인
directory 구조를 만들기 위한 분할은 하지 않는다.

Guide module은 concrete recipe 기준으로 나눈다. Continuous legend의 공통 validation/layout
utility, gradient strip recipe, opacity symbol recipe를 분리하며, quantitative size legend는 generic
`point`가 아니라 `size`라는 실제 책임 이름을 사용한다. Right/left multi-block placement만 family recipe에서
분리해 shared lane owner가 맡는다. Top/bottom multi-block placement도 같은 `layout/legendLane.js`의 pure
geometry와 별도 wrapped horizontal owner를 사용하며 renderer는 그 최종 좌표만 읽는다.

구현된 mark type, encoding channel, categorical legend channel, legend config kind는
`core/vocabulary.js`가 canonical owner다. Schema parser, action validation, private config와
materialization discovery는 이 목록을 import하며 별도의 문자열 목록을 만들지 않는다. 현재 legend
kind는 `series`, `color`, `size`, `gradient`, `interval`, `opacity`, `strokeWidth`이고 사용되지 않는
`point` kind는 없다.

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

### Realistic scenario generation boundary

3,600개 realistic descriptor 생성은 dataset source와 파생 view의 native/heap high-water를
전체 corpus 동안 누적하지 않도록 dataset 단위의 일회성 child process를 사용한다. 동기
`generateScenarioDescriptors` 경로는 결과 의미를 비교하는 monolithic reference로 남고,
realistic runner만 다음 두 단계를 직렬 실행한다.

1. Phase A는 active dataset마다 독립 child에서 factor requirement, recipe eligibility와
   coverage-schedule eligibility fragment를 계산한다. Coordinator는 canonical dataset/recipe
   순서로 fragment를 하나의 serializable manifest로 병합한 뒤 fragment를 버린다.
2. Phase B는 dataset마다 새 child가 canonical global scheduler state를 받아
   `simple → intermediate → advanced → composite` 순서로 정확히 72개를 생성한다. Tier 결과는
   상태 갱신이 끝난 뒤에만 interleave한다. 성공 응답 전체를 검증한 뒤에만 coordinator가
   다음 state를 commit하므로 crash와 timeout은 이전 dataset checkpoint를 변경하지 않는다.

Dataset 사이에 전달하는 state는 candidate ordinal, semantic fingerprint, recipe count와
dataset diversity, baseline/factor case, factor value count와 dataset diversity, factor pair,
coverage-schedule fulfillment, rejection/duplicate/skip diagnostics다. `factorPools`,
`attemptedFactorCases`, source/fixture/view module cache는 dataset-local이며 child 종료와 함께
폐기한다. Map과 Set은 insertion order를 보존하는 entry array로 encode하고 schema version을
검증한 뒤 hydrate한다. 최종 child만 전체 descriptor와 누적 state를 받아 minimum selection,
3-dataset diversity, schedule, factor-value gate와 generation diagnostics를 계산한다.

Generation child는 288MiB V8 old-space guardrail과 explicit GC/cache release를 사용한다.
Coordinator는 자신과 child의 관측 RSS 상한을 함께 보고한다. `maximumCombinedRssBytes`는
서로 다른 시점일 수 있는 coordinator high-water와 child high-water를 더한 보수적 상계이며,
동시에 표본화한 process-tree peak를 뜻하지 않는다.
Generation 실패도 완료된 child의 operation/dataset/RSS/wall-time만 담은 동결된 partial
resource report를 보존하며 descriptor, scheduler state, factor payload는 포함하지 않는다.
Runner의 전체 generation timeout 기본값은 30분이고 최대 override는 60분이다. Contract test는
strict 216/360 monolith-shard deep equality, state checkpoint 원자성, child crash/timeout,
Node 20/22 memory bound와 typed CSV streaming oracle을 고정한다.

### Realistic scenario execution boundary

Descriptor 생성 뒤의 chart build, deterministic replay와 renderer 검증도 corpus 전체의
V8/native high-water를 한 process에 누적하지 않는다. Runner는 descriptor를 dataset별로 묶고
정상 경로에서 각 dataset의 72개 scenario를 최대 24개씩 bounded child 세 개에 나눠 순서대로
실행한다. 한 child가 종료된 뒤에만 같은 dataset의 다음 child나 다음 dataset child를 시작한다.
Crash, timeout 또는
protocol 위반이 있으면 이미 직렬화와 descriptor identity 검증이 끝난 결과만 commit하고 실패한
scenario를 기록한 다음, 남은 scenario는 새 child에서 계속한다. 이전 child의 exit/close가 확인된
경우에만 새 child를 시작한다. SIGTERM 뒤 SIGKILL까지 bounded escalation했는데도 종료를 확인하지
못하면 replacement를 만들지 않고 전체 실행을 실패로 닫는다.

Execution child는 224MiB V8 old-space guardrail을 사용한다. 192MiB 이하는 최신 peak dataset의
maximal workload를 완료하지 못하므로 사용하지 않는다. Coordinator는 완료된 dataset outcome을
세 batch가 모두 끝난 뒤 checksum과 descriptor index를 가진 dataset별 run-local V8
structured-clone binary chunk 하나로 직렬화하고, 해당
object graph를 해제한 뒤 다음 child를 시작한다. Binary payload는 `undefined` own property를 포함한
IPC structured-clone 의미를 보존한다. 모든 child가 종료된 뒤에만 canonical order로 chunk를 다시
읽고 검증하여 coverage와 manifest 입력을 복원한다. 따라서 이전 dataset outcome retention은 child
process-tree peak와 겹치지 않는다. 각 compact outcome의 IPC
serialization이 끝난 뒤 program, replay와 SVG temporary가 더 이상 reachable하지 않은 시점에
explicit GC를 실행한다. 각 batch child가 종료될 때 source cache를 release하고 마지막 GC 뒤 resource
snapshot을 보낸 다음 process가 종료된다. `--no-artifacts` 경로는 native Canvas, PNG와 PDF
adapter를 import하지 않는다. Artifact run만 이 dependency를 lazy import한다.

Artifact 경로는 deterministic replay 뒤 native Canvas·PNG·PDF 렌더 직전에도 GC하여 replay
temporary와 native renderer allocation이 겹치지 않게 한다. 정상 strict artifact run은 execution
child의 process-wide RSS high-water가 512MiB 이하일 것을 성공 조건으로 요구한다. 초과 또는 final
high-water 누락은 resource gate 실패로 기록하고 immutable run은 보존하되 `latest` promotion을
금지한다.

Runner는 child별 complete/partial RSS, child/coordinator monotonic wall time, coordinator lifetime
high-water와 execution-phase sampled RSS를 별도로 보존한다. Snapshot 전에 실패한 child에는 RSS를
0으로 합성하지 않는다. `maximumConservativeCombinedRssBytes`는 독립적으로 관측한 child maximum과
coordinator lifetime maximum의 합이고, `maximumExecutionPhaseConservativeCombinedRssBytes`는 child
maximum과 execution-phase coordinator sample maximum의 합이다. 둘 다 실제 동시 peak가 아니다.
`maximumIpcSampledCombinedRssBytes`만 outcome/resource IPC 경계에서 가까운 시점의 child current RSS와
coordinator current RSS를 더한 표본임을 이름으로 드러낸다. Scenario timeout은 outcome마다 다시
시작되고 child termination을 확인한 뒤에만 다음 process를 만든다. Execution concurrency는 memory
bound를 위해 1로 고정한다.

Resource의 같은 dataset record가 여러 개인 것은 의도된 batch 경계다. 정상 strict 전수 실행은
50 datasets × 3 batches = 150개의 complete child record를 가지며 `firstScenarioIndex`와
`requestedScenarios`로 canonical partition을 검증한다.

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
10. Theta count partition, equal-angle rose overlay와 quantitative radial extent를 각각 검증하는 Cars donut,
    Nightingale rose와 Gapminder radial-bar chart
11. Partition-local window rank를 source order로 저장한 뒤 filtered point consumer에 연결하는 Cars
    window-rank scatterplot
12. Raw quantitative x/y rows를 immutable 2D-bin revision으로 만들고 ranged rect와 count color에 연결하는
    Cars binned heatmap
13. Category별 immutable density profile, backend-neutral linear-gradient `FillPaint`, optional center rule,
    source filtering, category-strip highlighting과 Cartesian facet replay를 가진 Cars gradient plot
14. Category band 안에서 shared-width full density와 two-value split half density를 materialize하고
    positional-family `createViolinPlot({ x, y })` facade와 exact parity를 갖는 Cars acceleration violin plot
15. Ordered quantitative/ordinal dimension별 local scale/axis와 source-row open path를 가진 Cars Parallel Coordinates
16. Gapminder point source에 attached text를 bounded collision layout과 optional leader로 배치하고
    public/primitive exact parity를 갖는 Country Labels chart

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
- Polar source의 theta/radius scale과 guide를 반복하는 facet
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
- Full Browser, Basic Browser, extension, browser-safe SVG, Node PNG, Node PDF entry point와 TypeScript
  declaration이 분리된다.
- 현재 source는 chart example이 아니라 reusable capability 기준으로 조직된다.
- 색상·opacity·크기·선 두께 같은 반복 appearance scalar validation은
  `core/validation.js`가 소유하고, chart-independent appearance default는
  `theme/defaults.js`가 소유한다. Mark, guide, layout, selection policy는 이 공통 계약을
  소비하며 같은 값 규칙을 다시 선언하지 않는다.
- Action option object의 plain-object shape, closed key vocabulary와 empty-option policy도
  `core/validation.js`의 한 helper가 소유한다. Domain validator는 이 공통 구조 검증 뒤
  서로 연관된 option과 값 의미만 추가로 검증한다.
- Concrete `fill`은 solid string 또는 immutable backend-neutral `LinearGradientPaint`를 받는 하나의
  `FillPaint` 계약이다. Gradient profile은 semantic derived data, palette/opacity intent는 owner config,
  normalized endpoints와 stops는 `graphicSpec`, backend gradient object는 renderer-local ephemeral state가 소유한다.
- Categorical distribution/uncertainty facade는 `x`와 `y`의 semantic roles로 orientation을 추론한다. Box,
  gradient-distribution과 violin은 exactly one categorical + one quantitative role, target/data/coordinate inference와
  deferred position completion 규칙을 공유하고 family-specific statistics/appearance만 named nested option으로 둔다.
- Box/gradient stable owner edit은 같은 distribution-role revision policy를 사용한다. Omitted raw source와 x/y role을
  current provenance에서 보존하고 complete candidate를 speculative branch에서 검증한 뒤 category/measure scale identity를
  새 channel로 handoff한다. Box summary/outlier 또는 gradient profile은 immutable sibling revision으로 교체하며 stable
  body/whisker/cap/median/outlier/center identity, axis tick mode, continuous grid direction과 stored selection/highlight를
  explicit wrapped materialization으로 갱신한다. Shared-scale 또는 stale-selector incompatibility는 partial state 없이 거부한다.
- Statistical composite를 facet할 때 raw partition 뒤 registered transform을 cell-local ID로 replay하고,
  body/sibling layer뿐 아니라 owner의 private source/profile identity도 explicit wrapped transition으로 함께 rebind한다.

Roadmap 3 이후에는 nested Cartesian/Polar composition, Cartesian facet, broad guide editing hierarchy와 generic
`editScale`도 현재 구현 계약이다. 반대로 animation과 transition 등 구현되지 않은 초기 아이디어는
현재 API인 것처럼 public documentation이나 새 코드에서 가정하지 않는다.

Roadmap 4에서는 Parallel coordinate가 세 번째 current coordinate family가 되었다. Public
`createParallelCoordinates` facade는 coordinate, line mark, ordered dimension encoding, optional color와 applicable
guides를 wrapped child action으로 조립한다. Advanced `encodeParallelCoordinates`는 같은 stored schema와
materialization lifecycle을 직접 author하며 Canvas/scale/data/filter/selection 변경은 ordinary line path와
dimension guide를 deterministic plan으로 rematerialize한다.

### Area endpoint와 결측 domain의 단일 해석

`grammar/areaEndpoints.js`는 quantitative field/datum과 raw Area의 error/break 값을 해석한다.
Position assignment, scale 소비자, path grammar가 이 해석을 공유하며 source rows는 변경하지 않는다.
`actions/encodings/areaRange.js`는 최종 pair와 scale을 순수 preview한 뒤 기존 wrapped primary/secondary를
실행한다. `actions/scales/preview.js`의 소비자·domain 계산은 실제 rematerializeScale과 이 preflight가 공유한다.
Break의 각 closed segment는 원본 row indices를 유지해 selection과 geometry의 grain이 같다.
