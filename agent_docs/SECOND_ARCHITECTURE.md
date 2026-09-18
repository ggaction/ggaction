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

Numeric-center Bar는 `mark.orientation`으로 raw 행의 center/measure 역할을 기록한다.
기존 histogram/aggregate/ranged와 별도 centered grain으로 소비하며, 공유 position scale,
선택 item, labels, facets는 같은 bar policy를 사용한다. Pixel width는 기존 mark config 소유다.

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

패키지는 export map에 선언된 명시적 module entry point와 하나의 Node executable을 가진다.

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

### `ggaction/persistence`

Browser-safe 저장·복원 entry다. Canonical constructor state를 versioned tagged JSON으로 보존하며, graphic-only payload는 renderer에만 전달한다. 복원은 action replay나 compiler 실행 없이 기존 순수 semantic/graphic validator와 resource reference collector를 사용하고, 검증한 상태를 constructor가 소유한다. Full/Basic 원본은 full ChartProgram으로 복원하며 등록되지 않은 subclass/trace op는 거부한다. 정확한 format과 사용 계약은 `docs/data-updates.md`의 저장·복원 절을 따른다.

### `ggaction/accessibility`

`src/accessibility.js`의 read-only `ggaction/accessibility` entry는 기존 final-item selection adapter 및 pure path series 계산을 사용하여 시각적 grain의 데이터를 반환한다. Renderer나 DOM을 실행하지 않고 원본 행을 최종 표로 대체하지 않는다. 안정적인 composite owner 관계는 `src/selectors/markOwners.js`를 mark removal과 공유한다. 결과의 정확한 schema와 제한은 [Rendering](../docs/api/rendering.md#accessible-data-alternatives)이 소유한다.

### `ggaction/inspection`

`src/inspection.js`의 browser-safe read-only entry는 저장된 dataset schema, action의 정적 적용 가능성, 두 프로그램의 resource 변화, materialized graphic의 구조와 가시 후보를 조회한다. 조회는 action을 실행하거나 program, trace, context를 바꾸지 않는다. 계산이나 pixel 확인을 수행하지 않은 검사는 `not_run`, 알 수 없는 extension 의미는 `unverified`, 지원하지 않는 concrete owner는 partial coverage로 반환한다.

### `ggaction/diagnostics`

`getErrorDetails(error)`로 stable code와 선택적인 operation/option/resource/budget metadata를 읽는 browser-safe entry다. Error identity/class를 보존하고 원본 data row를 저장하지 않는다. 상세 계약은 `docs/errors-and-recovery.md`가 소유한다.

### `ggaction-mcp`

설치된 package가 제공하는 Node-only local stdio executable이다. Model-visible tool은
`search_ggaction({ query })` 하나이며 direct adapter와 같은 serialized compact task packet을 반환한다. Overview,
exact action card, bounded task recipe와 unresolved-only documentation section은 read-only MCP resources로만 제공한다.

Knowledge generation은 Current action inventory, 선언과 실행 가능한 public trace에서 카드·관계·call pattern을 만든다. Runtime과 metadata가 공유해야 하는 조건부 필수값과 단위는 pure policy registry에 둔다. Adapter는 sample에 등장한 옵션을 필수 계약으로 승격하지 않는다.

Task resolver는 해석한 요구에서 실행 가능한 authoring 순서를 만들고, 해석되지 않은 유의미한 원문은 unresolved로 보존한다. 실행 성공과 요구 충족은 별도 평가다. Direct adapter와 MCP는 같은 serializer를 사용한다. Exact packet/card shape와 version은 `knowledge/task-packet.schema.json`, `knowledge/action-card.schema.json` 및 [MCP 문서](../docs/mcp.md)가 소유한다.

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
src/inspection.js        ↔ types/inspection.d.ts
ChartProgram contract    ↔ types/program.d.ts
src/mcp/cli.js           ↔ package `ggaction-mcp` executable
```

`package.json`의 export map, JavaScript export, declaration, package-boundary test는 하나의
public contract로 함께 관리한다. MCP executable은 module export map에 추가하지 않으며 Node-only dependency graph를
browser-safe entry에 연결하지 않는다.

Static built-in `action(...)` declaration에만 pure-call annotation을 둔다. Factory가 만드는 WeakMap key/value는 반환 wrapper를 사용하지 않으면 관찰 불가능하며, 해당 wrapper를 제거할 때만 함께 버릴 수 있다. Extension 사용자의 `action()` 호출과 등록 함수에는 annotation을 붙이지 않아 metadata validation과 prototype registration을 보존한다. Basic entry에서 등록하지 않은 sibling action의 dependency를 bundle에서 제거한다.

Package staging은 task resolver와 scale definition/color/quantitative transform, polar/arc geometry 및 Canvas/facet/guide layout 모듈을 기존 esbuild 정책으로 compact한다.
Repository 원본과 module 경로/export는 유지하고, packed math equivalence와 artifact size를 검사한다.

### Browser bundle regression ceilings

Production Vite consumer의 minimal build는 다음 gzip upper bound를 넘지 않아야 한다.

| Entry | Gzip ceiling |
| --- | ---: |
| `ggaction` | 375,000 bytes |
| `ggaction/basic` | 178,000 bytes |
| `ggaction/svg` | 25,000 bytes |

명시적 inner plot 크기의 자동 guide 여백과 plot 간격 배치 기능 추가에 따라 Full 예산을
370,000에서 375,000 bytes로 조정했다. 이전 기능 기준선은 369,996 bytes였으며,
새 기능의 installed consumer 측정은 약 372,700 bytes다. 이후 산점도 field stroke와
관련 범례를 Basic에도 지원하면서 Basic 실측은 174,557에서 176,590 bytes로 증가했고
Basic 예산을 175,000에서 178,000 bytes로 조정했다. SVG와 package artifact 예산은 유지한다. 이 변경은 기능 증가분을 허용하는 예산 변경이며 이전 한도 통과를 뜻하지 않는다.

이 값은 current executable regression ceiling이며 측정 결과 자체가 아니다. Canonical numeric owner는
`scripts/browser-bundle-size.js`이고 package consumer와 documentation contract가 같은 값을 검증한다.
Gzip 크기는 같은 minified bytes라도 Node가 포함한 zlib 버전에 따라 달라질 수 있으므로 지원하는
Node 20·22·24 matrix의 최댓값을 포함해야 한다.

## 실행 계약의 위치

이 문서는 상태 소유권, 계층 간 의존성과 실행 흐름을 설명한다. 메서드별 매개변수·기본값·추론·지원 조합·오류는 아래 Current 계약이 소유하며 이 문서에 복제하지 않는다. 구현 상태와 direct/internal 분류는 [ACTION_INDEX.json](contract/ACTION_INDEX.json), 선언은 `types/`, 자동화된 value vocabulary는 owning runtime registry를 사용한다.

| 결정 | 정확한 계약 |
| --- | --- |
| Canvas, source와 derived revision, scale, coordinate, theme | [CORE](contract/current/CORE.md) |
| Semantic/graphic primitive | [PRIMITIVES](contract/current/PRIMITIVES.md) |
| Mark와 completeness | [MARKS](contract/current/MARKS.md) |
| Encoding, grouping, ordering, series layout | [ENCODINGS](contract/current/ENCODINGS.md) |
| Selection, highlight, filter와 label layout | [MARK_SELECTION](contract/current/MARK_SELECTION.md) |
| Axis와 grid | [AXES](contract/current/AXES.md), [GRID](contract/current/GRID.md) |
| Legend와 title | [LEGEND_AND_TITLE](contract/current/LEGEND_AND_TITLE.md) |
| Composition, facet와 repeat | [COMPOSITION](contract/current/COMPOSITION.md) |
| Statistical layer와 composite | [STATISTICS](contract/current/STATISTICS.md), [COMPOSITE_MARKS](contract/current/COMPOSITE_MARKS.md) |
| Complete chart facade | [COMPLETE_CHARTS](contract/current/COMPLETE_CHARTS.md), [BASIC_CHARTS](contract/current/BASIC_CHARTS.md) |
| Distribution facade와 palette | [GRADIENT_PLOTS](contract/current/GRADIENT_PLOTS.md), [VIOLIN_PLOTS](contract/current/VIOLIN_PLOTS.md), [PALETTES](contract/current/PALETTES.md) |

지원 목록이나 default가 바뀌면 이 표의 owner와 생성 메타데이터를 갱신한다. 상태 경계나 실행 흐름도 바뀔 때만 이 문서의 해당 설명을 수정한다.

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

Unit은 child 없는 프로그램이고 composition parent는 named child snapshot을 보존한다. Child semantic state를 parent layer grammar로 합치지 않는다. Lookup만 structural copy하고 이미 소유한 immutable child reference를 공유한다.

Action scope는 unit/composition/any를 구분한다. Package composition은 complete child를 먼저 검증한 뒤 wrapped child adoption과 composition materialization을 실행한다. Parent renderer는 namespaced concrete snapshot만 읽는다. Layout은 explicit child 크기를 보존하고 automatic cross-axis slot을 정규화한다. Nested composition은 root Canvas만 늘리지 않고 전체 snapshot을 정렬한다.

Facet/repeat는 retained source에서 다음 transaction을 수행한다.

1. Dataset ancestry에서 partition anchor와 transform DAG를 pure planner로 결정한다.
2. Child별 partition과 canonical transform replay, layer 및 private owner reference rebind를 wrapped action으로 실행한다.
3. 모든 candidate의 semantic scale intent를 비교해 shared/independent domain을 확정한다.
4. Child-local coordinate range로 mark, guide, label, selection/highlight와 style을 materialize한다.
5. Parent가 child snapshot, edge guides/shared legends, headers와 title을 배치한다.

Domain을 공유해도 coordinate frame과 range를 parent 값으로 덮지 않는다. Empty child는 incomplete scale inference를 허용하는 핑계가 아니다. Guide promotion은 실제 recipe와 represented scales의 compatibility를 검증한다. Explicit child guide 승격과 legacy categorical fallback은 다른 경로다.

Retained source는 재생 가능한 원본이며 child의 final graphics를 원본으로 역추론하지 않는다. Source나 facet policy 편집은 전체 candidate와 ancestor layout을 검증한 뒤 원자적으로 교체한다. Exact topology와 source/field/guide 지원 범위는 [COMPOSITION](contract/current/COMPOSITION.md)이 소유한다.

Standalone derived-data lifecycle도 requested transform과 materialized revision을 분리한다. `materializationConfigs.data`가 logical owner를 current snapshot에 연결하고 dataset source/layer data는 실제 snapshot ID를 저장한다. Pure transform registry가 requested extractor, normalizer, materializer, output role과 replay policy를 제공한다. Revision planner는 deterministic DAG를 따라 새 snapshot과 reference transition을 계획하고 wrapped action이 실행한다. Chart 내부 transform은 standalone registry에 중복 등록하지 않고 해당 chart owner가 lifecycle을 소유한다.

원본 revision은 같은 DAG planner에 새 immutable source snapshot을 시작점으로 제공한다. Reference transition은 shared typed reference collector가 소유하므로 data ID와 mark ID가 같은 문자열이어도 namespace를 혼동하지 않는다. 모든 candidate의 rematerialization과 stored selection compatibility를 검증한 뒤 wrapped transaction을 반환한다. Retained facet/repeat는 갱신된 unit template에서 저장된 composition recipe를 다시 적용한다.

Automatic statistical parameter의 요청과 계산값은 서로 다른 provenance다. Replay는 이전 계산값을 자동 정책으로 오인하지 않고 새 rows에서 다시 계산한다. Field output 이름을 바꾸는 revision은 semantic role에 따라 encoding과 selection/jitter binding도 함께 옮긴다. 제거되는 output을 참조하는 consumer는 전환 전체를 거부한다. Exact lifecycle은 [CORE](contract/current/CORE.md), 통계별 provenance는 [STATISTICS](contract/current/STATISTICS.md)가 소유한다.

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
- 변경되지 않은 library-owned branch는 중첩 clone에서도 identity를 공유한다. 외부 `Object.freeze`는 재귀 불변성의 증거로 취급하지 않는다.
- 외부에서 받은 array와 plain object는 clone하고 freeze하여 library ownership으로
  전환한다.
- 함수와 class instance는 mutable 외부 참조이므로 state에 저장하지 않는다. 실행용 extension
  callback은 인자로 받을 수 있지만 trace는 함수 객체 대신 type summary만 저장한다.
- source dataset의 `values`가 한 번 저장되면 다시 수정할 수 없다.
- derived dataset도 concrete `values`가 materialize된 뒤에는 immutable하다.
- Derived transform parameter edit은 새 deterministic namespaced dataset revision을 만들고 consumer를
  explicit rebind한다. 새 program에서 참조되지 않는 이전 revision만 wrapped state-transition action으로
  제거할 수 있으며 earlier program은 기존 revision을 계속 보존한다.
- Independent mark의 public data 전환은 `bindMarkData`가 소유한다. Definition-only dataset을 거부하고
  immutable speculative branch에서 scale→mark→guide→layout→highlight dependency plan을 끝까지 검증한 뒤
  wrapped `rebindLayerData` transition을 반환한다. Composite와 owned transform은 해당 aggregate owner가
  전체 sibling과 role을 함께 수정한다.
- context, resolved scale, materialization config, trace도 같은 원칙을 따른다.

Closed built-in option vocabulary는 private `closedAction` factory를 통해 공통 wrapper의 object validation과 결합할 수 있다. 반환값은 동일한 `action()` wrapper이며 scope, trace, diagnostics와 extension API를 바꾸지 않는다. 검증된 built-in factory 호출에만 purity annotation을 적용하여 미사용 wrapper의 등록용 계산을 제거할 수 있게 한다. 외부 extension 호출의 metadata/option 검증은 생략하지 않는다.

Trace append는 private persistent child tail을 공유한다. 공개 `children`은 요청 시 한 번 materialize하는 stable frozen Array이며 순서·ID·직렬화 형태는 그대로다. 활성 마지막 branch append는 이전 sibling 수와 무관하다.

테마 completion hook은 graphic/config/children/composition 및 visual semantic branch가 모두 같은 data/context-only transition에서 바로 반환한다. Appearance를 바꾸는 transition에는 기존 명시적 reconciliation이 적용된다.

`_clone()`은 현재 runtime class의 constructor를 사용하므로 `ChartProgram` subclass에서도
action chain이 subclass type을 유지한다.

## 저작용 text metrics

Host 측정값은 `materializationConfigs.textMetrics`의 immutable profile이 소유한다. Pure layout과 concrete bounds 함수는 해당 profile을 명시적인 인자로 받아 exact match 또는 기존 estimate를 선택한다. 전역 mutable font provider와 backend 객체를 사용하지 않는다. Shared `core/font.js`가 기본 font family와 numeric weight 정규화를 소유하며 renderer와 authoring measurement가 이를 공유한다.

`materialization/typography.js`는 측정 profile 변경과 theme font 변경의 공통 text-owner rematerialization 경계다. 기존 text mark, guide, legend, title의 wrapped domain action을 순서대로 실행하고 final guide collision을 검증한다. Composition은 child snapshot을 먼저 갱신하고 parent header/shared guide/placement를 재계산한다. Exact 공개 계약은 [CORE](contract/current/CORE.md#applytextmetrics)가 소유한다. Renderer는 profile을 읽지 않고 이미 배치된 text graphics만 그린다.

## 구조화된 진단 경계

Browser-safe `ggaction/diagnostics`의 `getErrorDetails`는 Error identity에 연결된 frozen metadata를 읽는다. Pure `core/diagnostics.js`만 WeakMap을 소유하며 state나 원본 데이터를 보관하지 않는다. Shared validation/selectors는 의미를 아는 실패 지점에서 code와 resource/option/budget 정보를 부여하고 wrapped action은 미분류 오류에 action-failed 및 innermost operation을 추가한다. Error 종류/identity를 바꾸거나 메시지로 code를 추론하지 않는다. Renderer와 selector의 core 접근은 이 순수 진단 helper로 한정한다. Exact code/field 의미는 `docs/errors-and-recovery.md`와 `types/diagnostics.d.ts`가 소유한다.

## `semanticSpec`

Canonical semantic schema는 `core/specs.js`와 primitive validator가 소유한다. Named datasets/layers/scales/coordinates는 사용자 identity를 가진다. Guide와 title의 system slot은 별도 namespace다. User ID 검증과 closed vocabulary 검증을 혼합하지 않는다.

`actions/primitives/semanticValidation/`는 semantic kind별 validation을 분리한다. Shared primitive dispatcher는 path를 해석하고 해당 validator를 호출한다. Shape를 저장할 수 있다는 사실은 해당 domain action의 materialization 지원을 뜻하지 않는다.

### Dataset

Source는 소유한 immutable rows를 저장한다. Derived dataset은 source reference, requested transform provenance와 materialized values를 저장한다. Pure `grammar/transforms.js`가 각 transform의 schema, materializer operation, replay topology와 output-role policy를 연결한다. Domain action과 primitive validator가 이를 공유한다.

Mark filter는 final item grain에서 member rows를 선택하고 immutable derived view로 rebind한다. 원본 표의 filter와 mark item filter를 같은 계산으로 간주하지 않는다. Window처럼 인접 row에 의존하는 transform은 row 수가 같아도 partition 뒤 재계산해야 한다. Replay transparency와 partition eligibility는 transform policy로 결정한다. Exact filter/window/bin/statistical 옵션은 [CORE](contract/current/CORE.md)와 [STATISTICS](contract/current/STATISTICS.md)에 둔다.

### Layer와 mark

Layer가 data, optional source/coordinate, semantic mark와 encoding을 연결한다. Semantic mark와 concrete primitive는 일대일이 아니다. Point shape는 circle/rect/path, path mark는 command collection, interval composite는 ordinary mark sibling으로 표현된다. Renderer가 semantic mark 이름을 dispatch하지 않는다.

새 layer의 inheritance는 target capability와 final item grain을 검증한다. Source/target이 공유할 수 없는 topology-changing policy를 무조건 복사하지 않는다. 결정한 binding은 context가 아니라 semantic state에 저장한다. 지원 조합은 [MARKS](contract/current/MARKS.md)와 [ENCODINGS](contract/current/ENCODINGS.md)가 소유한다.

### Encoding

`core/vocabulary.js`의 positional descriptor가 coordinate family, role, shared-scale relation, guide/grid binding과 mark capability를 소유한다. Inference, consumer discovery, inheritance와 removal이 같은 descriptor를 사용한다.

Field mapping과 grouping/order/series layout은 semantic intent다. Constant appearance와 pixel/band placement intent는 materialization config다. `layoutSeries`는 semantic layout 변경 후 offset/endpoint/scale/mark/guide owner를 명시적으로 호출한다. Automatic scale의 private ownership만 config에 기록하고 semantic scale 정책을 이중 저장하지 않는다.

Series identity, appearance field 유일성, row eligibility와 order는 geometry 전에 확정한다. Aggregate/bin/stack, ordered vertices와 missing-data segmentation은 같은 final grain을 scale, mark와 selection에 제공해야 한다. `grammar/areaEndpoints.js`가 Area endpoint의 datum/field/missing 값을 공유하고 `actions/encodings/ranged.js`는 complete pair를 preview한 뒤 wrapped primary/secondary를 실행한다.

Categorical position order는 semantic encoding의 요청이며 automatic domain 계산 때 해석한다. Legend item order는 appearance mapping을 바꾸지 않는 별도의 guide 요청이다. Temporal input unit은 input descriptor가 소유하고 shared field parser가 timestamp로 정규화한다. Geometry나 renderer에 별도 temporal parser를 두지 않는다.

### Semantic scale

Semantic scale은 요청한 mapping policy, `resolvedScales`는 현재 모든 consumer와 bounds에서 계산한 결과다. Scale role registry와 definition normalizer가 type family/option compatibility를 공유하고 channel resolver는 concrete domain/range 계약을 제공한다.

Shared scale은 ID의 일치뿐 아니라 channel meaning, grain, bin, offset와 range compatibility도 요구한다. 같은 final consumer grain이 domain과 mark geometry를 결정한다. Unknown fallback은 domain member가 아니며 해당 mark-item policy가 지원하는 경우에만 mapping 단계에서 적용한다. Default/type transition/fallback의 정확한 지원 범위는 [CORE](contract/current/CORE.md)와 [ENCODINGS](contract/current/ENCODINGS.md)에 둔다.

### Coordinate

Coordinate는 layer가 참조하는 named semantic resource다. Requested aspect와 Polar frame은 semantic state이고, effective bounds/frame은 `layout/aspect.js` 및 `materialization/coordinateBounds.js`의 계산 결과다. 이미 계산한 effective bounds를 다음 layout의 allocated input으로 사용하지 않는다.

의존 순서는 domain → aspect → coordinate frame → range → marks → guides → layout → highlight다. Polar와 Parallel도 final Cartesian commands를 작성하므로 renderer에 coordinate branch가 없다. Parallel의 ordered dimension policy는 `actions/coordinates/parallel.js`, guide geometry는 `actions/guides/axes/parallel/resolve.js`가 소유한다. Polar sector/circle command는 `grammar/polarPaths.js`가 공유한다.
Polar frame의 overflow 요청은 semantic coordinate가 소유한다. Arc의 비율/픽셀 inner radius는 mark config가 소유하고, `grammar/arcs.js`의 공통 해석을 sector, radius scale, selection이 사용한다. Renderer에는 overflow나 radius 단위에 대한 새 분기를 만들지 않는다.

### Guide와 title

Semantic guide는 설명하는 scale/coordinate와 semantic text를 저장한다. Tick recipe, symbol geometry, typography와 placement는 config, final lines/text는 graphics다. Legend의 kind별 complete block이 lifecycle ownership 단위다. Removal/edit는 해당 block을 해제하고 남은 block의 occupied bounds를 재계산한다. 정확한 옵션·생성/편집/삭제 범위는 [AXES](contract/current/AXES.md), [GRID](contract/current/GRID.md), [LEGEND_AND_TITLE](contract/current/LEGEND_AND_TITLE.md)에 둔다.

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

세 primitive는 semantic transition, graphic identity/attachment, concrete property transition을 분담한다. Domain lifecycle은 이 primitive를 wrapped child로 조합한다. Primitive가 의미를 저장했다고 renderer output이 자동 갱신되지는 않는다.

Semantic removal은 dependency preflight를, graphic removal은 subtree detach를 소유한다. Named-resource removal, selection/config teardown과 dependent rematerialization은 owning domain action이 함께 실행한다. Exact path grammar, distribution/broadcast, idempotency, cardinality와 removal 계약은 [PRIMITIVES](contract/current/PRIMITIVES.md)가 유일한 원문이다.

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

Full-only `encodeChannels`는 한 mark의 여러 encoding을 final-state transaction으로 처리한다.
`normalizeEncodeChannelsArgs → planEncodingAssignments → applyEncodingAssignments` 경계를 가지며,
19개 channel request를 canonical 순서로 정규화한다. Plan은 caller program을 변경하지 않고 같은
focused action implementation body를 private immutable planning subclass에서 실행한다. 이 subclass는
scale preview/cache 갱신만 허용하고 mark·legend materializer를 지연한다. Core의 private
`invokeWrappedActionImplementation` 경계가 wrapper를 우회하므로 계획 trace에는 가짜 `encodeX` 같은
direct-action node가 생기지 않고, 실제 primitive semantic/scale child만 열린 `encodeChannels` 아래에 남는다.
이 internal invocation은 package extension surface로 export하지 않는다.

Planning 결과는 `ChartProgram` instance가 아니라 frozen state branch, original/final layer와 affected scale ID를
담은 deterministic plan으로 바꾼 뒤 원래 runtime class에 적용한다. Bar의 x/y category-measure orientation을
함께 바꾸는 경우 planning clone에서 두 이전 primary role만 먼저 분리하고, original layer는 guide rebind와
detached/shared-scale 계산을 위해 따로 보존한다. 성공 commit 뒤에는 affected scale을 모두 resolve하고
deduplicated mark/source-dependent mark/guide plan을 한 번 실행한다. 실패한 plan과 materialization은 immutable
caller에 trace, cache 또는 ID compensation write를 남기지 않는다. 정확한 payload와 지원 channel 계약은
[encoding action contract](contract/current/ENCODINGS.md#encodechannels)가 소유한다.
Cartesian axis가 rebind 중 scale family를 categorical과 continuous 사이에서 바꾸면 coupled default
tick/label recipe도 final scale에 맞춰 domain-values 또는 count mode로 바꾼다. Component style과 title은
보존한다. 새 family에서 유효하지 않은 explicit guide recipe나 continuous-only grid는 계획을 실패시키며,
batch가 임의로 guide를 삭제하지 않는다.

## Mark materialization policy

각 semantic mark type은 자신이 concrete output을 만들 준비가 되었는지를 mark
materialization policy에 정의한다.

### Mark별 책임

| Policy | 책임 | Exact contract |
| --- | --- | --- |
| Bar | Semantic grain 분류, bin/aggregate/stack/offset 결과와 rectangle completeness | [MARKS](contract/current/MARKS.md), [ENCODINGS](contract/current/ENCODINGS.md) |
| Point/Tick | Row eligibility, shape/angle/jitter geometry와 item attachment | [MARKS](contract/current/MARKS.md) |
| Line/Area | Series identity, missing/order/curve, endpoint와 closed command stream | [MARKS](contract/current/MARKS.md), [ENCODINGS](contract/current/ENCODINGS.md) |
| Arc | Partition/aggregate membership, radial mapping과 sector path | [MARKS](contract/current/MARKS.md), [ENCODINGS](contract/current/ENCODINGS.md) |
| Rule/Rect | Endpoint 또는 fixed-span/whole-plot intent를 final concrete bounds로 변환 | [MARKS](contract/current/MARKS.md) |
| Text | Final semantic content, anchor, deterministic text bounds와 attached label layout | [MARKS](contract/current/MARKS.md), [MARK_SELECTION](contract/current/MARK_SELECTION.md) |

Bar grain/default layout은 `grammar/bars/policy.js`, aggregate math는 `grammar/bars/`, concrete rectangles는 `materialization/bars/`가 소유한다. Bin option vocabulary를 아키텍처에 별도로 복제하지 않는다. Transform 등록은 `grammar/transforms.js` 한 곳에서 primitive schema와 domain replay를 연결한다.

Incomplete mark는 semantic intent와 필요 시 빈 collection만 보존한다. Geometry의 prerequisites가 완성되면 responsible encoding action이 owning materializer를 호출한다. 임시 좌표나 임의 row를 합성하지 않는다.

Highlight lifecycle은 base geometry를 만들기 전에 target의 기존 override를 잠시 분리하고, stale concrete items를 정리한 뒤 새 final item identity에서 selection을 다시 평가한다. 각 mark는 geometry/appearance policy만 제공하며 strip/replay transaction을 복제하지 않는다. Field/channel/property selector는 각각 source members, pre-scale semantic value, final concrete value를 읽는 별도 namespace다.

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

Position scale, mark, axis와 grid는 같은 coordinate effective plot bounds를 사용한다. Aspect가 없는 coordinate의
effective bounds는 allocated bounds와 같다. Title과 legend는 기존 occupied-layout allocation을 먼저 정하며,
그 결과에 aspect를 한 번 적용한다.
Width, height 또는 margin이 바뀌면 auto positional range와 그 consumer를 다시
materialize한다. Background-only 변경은 geometry rematerialization을 유발하지 않는다.

Layout block은 요청한 margin 안에서 실제 occupied bounds를 계산한다. Title이나 legend가
공간에 맞지 않으면 Canvas를 몰래 확장하거나 option을 바꾸지 않고 clear layout error를
낸다. Legend grid, title reading block/rotated bounds, grid line endpoint처럼 program state를
수정하지 않는 geometry는 `layout/`의 pure function이 소유한다. Action resolver는 resource
inference와 collision 검증만 담당하고 이 geometry 결과를 wrapped graphic action에 전달한다.

## Axis, grid, legend, title

### Axis

Aggregate는 persisted coordinate family와 encoding에서 applicability를 결정하고 해당 family의 wrapped line/tick/label/title owner를 호출한다. Component editor와 complete-axis editor는 같은 stored config와 leaf action을 공유한다. Axis가 missing encoding을 수리하거나 coordinate를 자동 compile하지 않는다.

Parallel의 field lifecycle은 `actions/guides/axes/parallel/lifecycle.js`, pure policy/geometry는 해당 family module, concrete reconciliation은 wrapped action이 소유한다. Domain이 바뀌면 inferred tick recipe만 다시 결정하고 caller recipe와 styles는 보존한다.

### Grid

`actions/guides/applicability.js`가 positional descriptor와 persisted scale을 읽어 applicable guide를 결정한다. Facade와 grid aggregate가 같은 결과를 사용한다. Grid geometry는 resolved axis ticks 또는 owning tick policy를 사용하고 explicit tree placement로 mark보다 먼저 그린다.

### Legend

Family action은 scale/content/appearance를 검증하고 intrinsic concrete recipe를 만든다. `layout/legendItems.js`는 실제 sample stroke/path bounds와 formatted text를 측정해 공통 occupied item slot을 계산한다. Size/interval/stroke-width는 categorical symbol implementation을 복제하지 않고 같은 layout owner에 자기 recipe를 제공한다.

`layout/legendLane.js`는 family-independent concrete block을 edge별로 배치한다. Wrapped side/horizontal lane owner만 그 계산 결과를 graphics에 적용한다. Border와 title을 포함한 occupied bounds로 최종 Canvas/guide collision을 검증한다. Multi-block packaging과 single-block alignment를 혼동하지 않는다. Legacy-bottom은 별도 명시된 placement 계약이며 option 존재 여부로 추측하지 않는다.

`actions/guides/legends/lifecycle.js`가 categorical creation/content replacement/removal의 공통 owner다. Automatic symbol recipe는 현재 companion에서 다시 결정하고 explicit recipe는 보존한다. Stable logical block override는 channel-set identity로 config에 저장하며 graphic ID/display index를 authoritative state로 쓰지 않는다. Family transition은 compatible override만 이동시키고 충돌을 원자적으로 거부한다.

`grammar/valueFormat.js`는 명시된 numeric/UTC token parsing과 formatting을 공유한다. Auto formatting은 각 surface의 기존 의미를 유지한다. Semantic label을 그리는 renderer가 format이나 sample을 다시 추론하지 않는다. Option, spacing, edge, block lifecycle의 상세는 [LEGEND_AND_TITLE](contract/current/LEGEND_AND_TITLE.md)가 소유한다.

### Title

Title/subtitle은 separate stable resource다. Typography, wrapping와 placement는 config, resolved lines/coordinates/rotation은 graphics다. `core/textMetrics.js`와 pure title layout이 계산을 공유하고 renderer는 wrap하지 않는다.

Alignment는 Canvas 전체가 아니라 actual plot bounds를 사용한다. Facet title은 translated child plot union, header는 각 child plot center를 사용한다. Guide 포함 bounds를 plot으로 오인하지 않는다. Equivalent title/Canvas/layout edits는 같은 final bounds와 symmetric collision 결과로 수렴한다.

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

Facade는 raw semantic 역할을 받아 기존 data/mark/encoding/guide action을 합성한다. H0가 새로운 compiler나 별도 chart state를 만들지 않는다. Facade의 편집은 stable lower owner가 담당하거나 sibling 전체의 원자적 수정이 필요한 composite editor가 담당한다.

예를 들어 statistical interval은 derived summary → ordinary range mark → optional boundary/cap 순서다. Regression band는 explicit interval owner를 재사용하며 density/Horizon은 ordinary Area에 derived provenance를 연결한다. Pie는 Arc partition owner, violin은 categorical density owner를 재사용한다. Shared data-source/channel/scale inference는 facade 사이에 복제하지 않는다.

Revision은 새 derived snapshot을 만든 뒤 stable mark/sibling을 rebind하고 shared-scale mark와 guides를 materialize한다. 이전 revision의 release는 live reference graph로 판단한다. Style와 semantic owner identity는 통계 결과와 분리해 보존한다.

정확한 child action 관계는 실행 corpus에서 생성한 [action-relationships.json](../knowledge/action-relationships.json), 공개 lifecycle은 [COMPLETE_CHARTS](contract/current/COMPLETE_CHARTS.md), [STATISTICS](contract/current/STATISTICS.md), [COMPOSITE_MARKS](contract/current/COMPOSITE_MARKS.md)가 소유한다.

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
- 기본 clip/gradient ID namespace는 `graphicSpec`의 deterministic hash다. Library-owned immutable spec만 WeakMap으로 hash를 재사용하며 외부 mutable concrete spec은 매번 계산한다. 동일 spec SVG를 같은
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

## 선택 의존성과 메모리 출력

`@napi-rs/canvas`와 `@modelcontextprotocol/sdk`는 optional peer dependency다. 개발 환경에만 devDependency로 설치한다. Browser entry는 둘을 가져오지 않는다. Node renderer entry의 import는 native package 없이 성공하고, 실제 출력 시 lazy load하며 누락 시 명시적인 설치 명령을 반환한다. MCP CLI도 SDK 누락을 stderr에 안내하고 exit 1로 종료한다.

`renderToPNGBuffer`/`renderToPDFBuffer`는 caller-owned Uint8Array와 dimension/byte metadata를 반환한다. 프로그램에 backend나 output buffer를 저장하지 않는다. File 함수는 같은 buffer 함수를 호출한 후 filesystem에 쓴다. PNG는 동기 Canvas drawing 후 native async encode를 사용하며 PDF construction/encoding은 동기다. Exact public contract는 `docs/api/rendering.md`와 해당 declaration이 소유한다.

## PNG adapter

SVG/PNG/PDF의 plain-object와 closed-option 검증은 `renderers/options.js`가 공유한다.
이 모듈은 순수 값 검증용 `core/immutable.js`를 사용할 수 있으며 renderer가 program/action을
import하거나 semanticSpec을 해석하는 의존성은 계속 금지한다. Null-prototype plain object도
동일하게 허용하고 unknown option은 output 전에 거부한다.

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
encodePointRadius → internal encodeRadius로 전달된다. Scatter field stroke는 공유 wrapped encodeStroke를
facade 내부에서 호출하고 Basic persistence의 built-in trace dependency로 등록한다.
Basic standalone encodeStroke는 노출하지 않으며 stroke 범례 materializer는 Basic에도 등록한다. Rule/general opacity/statistics는 추가하지 않는다.
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

Size와 stroke-width legend의 item graphic 생성·배치는 `actions/guides/legends/continuous/common.js`가
공유하고 각 family는 scale 추론·symbol recipe·layout·config를 소유한다. `actions/primitives/graphicProperties.js`는
여러 property를 지정된 순서로 기존 wrapped `editGraphics`에 전달하는 private helper다. 새 public primitive나
batch trace를 만들지 않는다. Error-bar와 error-band의 source/role 복원·scale 계획·statistics 검증은
`actions/intervals/revision.js`가 공유하며, family별 저장 형태와 scale default·offset·group 제약은 각 owner에 남긴다.
Statistics partial merge는 `actions/data/intervalEdit.js`가 단독 편집과 role 동시 편집에 공통 제공한다.

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

현재 차트와 예제 목록은 [examples index](../examples/README.md), 실행 evidence는 [ACTION_INDEX.json](contract/ACTION_INDEX.json)과 test capability registry가 소유한다. 이 문서는 별도 지원 현황 목록을 유지하지 않는다. Vertical slice는 shared lower layers의 재사용을 증명하며 chart별 compiler를 뜻하지 않는다.

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

Roadmap 3 이후에는 nested Cartesian/Polar composition, Cartesian facet foundation, broad guide editing hierarchy와 generic
`editScale`도 현재 구현 계약이다. 반대로 animation과 transition 등 구현되지 않은 초기 아이디어는
현재 API인 것처럼 public documentation이나 새 코드에서 가정하지 않는다.

Roadmap 7에서는 facet/repeat가 complete Polar와 Parallel source까지 확장됐다. Candidate derivation, 모든 child의
domain resolution, final materialization을 분리하며 theta/radius와 Parallel dimension domain, 빈 child semantics,
shared legend, label/selection/theme/style replay를 같은 immutable composition transaction에서 처리한다.

같은 로드맵에서 named data·scale·coordinate의 수명주기는 cross-domain reference registry로 통합됐다.
Registry는 semantic layer와 derived source, mark·guide·selection·data-owner config, facet provenance와 current
context를 typed edge로 읽고 historical trace나 우연히 같은 문자열인 field/style token은 제외한다. Public
resource removal은 이 read-only graph에서 live edge가 0인 경우에만 wrapped `editSemantic` 자식으로 semantic
entry와 해당 cache/current pointer를 정리한다. `actions/resources/remove.js`가 domain action과 Full primitive의
공유 named-resource preflight를 소유하며, Basic primitive에는 이 의존성을 넣지 않는다. Logical data-owner
configuration은 전체 dependency 검사 후 semantic 삭제 전에 domain action이 해제한다. 따라서 facet의
physical revision 삭제도 owner 자신의 registry entry를 외부 소유권으로 오인하지 않는다. 전체 결과는 하나의
immutable action으로 반환한다. Standalone derived owner는 current snapshot과 owner registry를 함께
해제하지만 chart-owned dataset은 기존 owner action을 거치게 한다. 기존 derived revision release,
mark/selection teardown도 같은 reference model을 소비하므로 새 replay config가 생기면 collector fixture를
추가하지 않은 채 삭제 정책만 별도로 확장할 수 없다.

Roadmap 4에서는 Parallel coordinate가 세 번째 current coordinate family가 되었다. Public
`createParallelCoordinates` facade는 coordinate, line mark, ordered dimension encoding, optional color와 applicable
guides를 wrapped child action으로 조립한다. Advanced `encodeParallelCoordinates`는 같은 stored schema와
materialization lifecycle을 직접 author하며 Canvas/scale/data/filter/selection 변경은 ordinary line path와
dimension guide를 deterministic plan으로 rematerialize한다.

### Area endpoint와 결측 domain의 단일 해석

`grammar/areaEndpoints.js`는 quantitative field/datum과 raw Area의 error/break 값을 해석한다.
Position assignment, scale 소비자, path grammar가 이 해석을 공유하며 source rows는 변경하지 않는다.
`actions/encodings/ranged.js`는 최종 pair와 scale을 순수 preview한 뒤 기존 wrapped primary/secondary를
실행한다. `actions/scales/preview.js`의 소비자·domain 계산은 실제 rematerializeScale과 이 preflight가 공유한다.
Break의 각 closed segment는 원본 row indices를 유지해 selection과 geometry의 grain이 같다.

### 여러 줄 concrete text

Text materialization은 줄바꿈을 상대 좌표 `lines`로 해결하며 하나의 source item과 전체 `text`를 보존한다. Canvas/SVG/PDF는 concrete 줄만 출력하고 공통 text bounds는 같은 줄들의 회전된 합집합을 측정한다. 줄 배치는 renderer가 추론하지 않는다.

### 명시적 내부 플롯 크기의 guide transaction

Canvas의 opt-in 내부 크기 intent는 기존 materializationConfigs.canvas가 소유한다.
Guide domain transaction이 실제 측정 overflow를 읽고 Canvas 및 margin을 함께 확장한 뒤
공통 Canvas rematerialization plan을 명시적으로 실행한다. 실패한 시도는 immutable branch로
폐기하며 generic action completion hook이나 renderer compiler를 추가하지 않는다.
세부 sizing/충돌 계약은 Current CORE와 AXES, LEGEND_AND_TITLE이 소유한다.
