# Roadmap 4 Phase 2 — Basic Chart facade 기반

## 목표

현재 구현된 mark, encoding, scale와 guide action만 조합해 다섯 개의 짧은 chart-authoring facade를
제공한다. Facade는 semantic specification compiler나 별도 chart state가 아니다. 실제 wrapped child
action을 호출하며, 완성된 `semanticSpec`, `graphicSpec`과 trace는 대응하는 explicit action chain과 같다.

## 진행 상태

- [x] Phase 1 exit 승인과 진입 조건 확인
- [x] 기존 action/type/visual baseline 조사
- [x] 다섯 facade 후보 계약과 action hierarchy 작성
- [x] 단계·Gate·회귀 matrix 설계
- [x] P2-A 계약 승인
- [x] facade 구현과 visual parity Gate
- [x] package·inventory·public docs·Phase closeout evidence

## 범위

- `createScatterPlot`
- `createLinePlot`
- `createBarPlot`
- `createHistogram`
- `createHeatmap`의 pre-gridded cell mode

각 차트의 전체 후보 계약은 다음 문서가 소유한다.

- [Scatter plot](../chart/scatter-plot.md)
- [Line plot](../chart/line-plot.md)
- [Bar plot](../chart/bar-plot.md)
- [Histogram](../chart/histogram.md)
- [Heatmap](../chart/heatmap.md)

## 공유 facade 계약

### 입력과 추론

- `x`, `y`, `field` 같은 최소 의미만 required다.
- Position과 field encoding은 `"fieldName"` shorthand 또는 기존 encoding option object를 받는다.
- String color shorthand는 current `encodeColor`와 같은 nominal default다. Quantitative/temporal color는
  `{ field, fieldType, scale }`를 사용해 의도를 명시한다.
- `data`는 explicit existing ID, valid current dataset, 하나뿐인 dataset 순으로 해석한다. 두 후보 이상이면
  첫 dataset을 고르지 않고 explicit `data`를 요구한다.
- `coordinate`는 common option으로 encodings에 전달한다. 생략하면 `encodeX`/`encodeY`가 canonical
  Cartesian `main` coordinate를 생성·저장한다. Facade가 `createCoordinate`를 중복 호출하지 않는다.
- Omitted `id`는 facade별 stable role ID를 사용한다: `scatterPlot`, `linePlot`, `barPlot`, `histogram`,
  `heatmap`. 이미 충돌하면 numbered ID를 만들지 않고 explicit ID를 요구한다.
- `guides` omission과 `{}`는 applicable axes/grid/legend를 `createGuides`로 만든다. `false`는 guide child와
  관련 semantic/graphic branch를 만들지 않는다.

### 구현 경계

- `src/actions/charts/`가 facade action과 shared preflight/normalization을 소유한다.
- 각 facade는 전체 option object, data/id/coordinate와 child applicability를 첫 state change 전에 검증한다.
- Child action이 소유하는 scale, palette, aggregate, stack, layout, curve와 appearance vocabulary를 그대로 쓴다.
- Facade 전용 semantic schema, materialization config, renderer branch, rematerializer와 edit facade는 없다.
- 생성 후 편집은 `encodeX`, `editScale`, `editPointMark`, `editLegend` 같은 existing resource action이 맡는다.
- Child 실행 순서는 mark → position → grouping/appearance encoding → guides다.
- Optional child는 실제 option이 있을 때만 trace와 state에 나타난다.

## Non-goals

- Canvas 또는 source dataset 생성
- Title 자동 생성
- `editScatterPlot` 같은 aggregate edit API
- Binned heatmap, gradient fill, Polar facade 또는 새로운 geometry
- Facade 내부에서 field type이나 color intent를 추측하는 새 heuristic
- 기존 chart별 hidden guide/legend default 변경

## 테스트 matrix

각 facade는 다음을 공통 검증한다.

- shortest call과 explicit action chain의 semantic layer/scale/coordinate/guide 동등성
- complete `graphicSpec`, attachment order와 Browser Canvas call 동등성
- top-level facade trace와 실제 wrapped child hierarchy
- caller option/data ownership, earlier-program immutability와 atomic failure
- explicit/current/unique/ambiguous data, stable ID conflict, coordinate conflict
- `guides` omission/`{}`/`false`
- Canvas edit, scale edit와 mark-specific edit 이후 기존 owner rematerialization
- exact TypeScript, runtime registration, browser-safe export와 packed-package consumer
- 기존 approved primitive와 facade 결과의 same-run PNG pixel equality

Reference data는 Cars(scatter/line/histogram), Jobs(bar), Gapminder(heatmap)를 사용한다.

## 실행 순서

1. [STEP1](./STEP1.md) — exact contract와 proposal Gate
2. [STEP2](./STEP2.md) — shared facade infrastructure
3. [STEP3](./STEP3.md) — scatter와 line vertical slice
4. [STEP4](./STEP4.md) — bar와 histogram vertical slice
5. [STEP5](./STEP5.md) — pre-gridded heatmap vertical slice
6. [STEP6](./STEP6.md) — inventory, package와 closeout

## 승인 Gate

| Gate | 상태 | 승인 대상 | 승인 전 차단되는 작업 |
| --- | --- | --- | --- |
| P2-A | approved | 다섯 signature, 공통 inference/error/trace 계약 | 모든 facade source 구현 |
| P2-B | approved | scatter/line exact chain, primitive/facade PNG parity | bar/histogram 구현 |
| P2-C | approved | bar/histogram layout/bin parity | heatmap 구현 |
| P2-D | approved | pre-gridded heatmap과 optional text non-goal | Phase closeout |
| P2-Exit | approved | 선언·Current contract·package·누적 tests | Phase 3 |

모든 Gate는 hard pause다. P2-A는 2026-07-20 사용자 승인을 받았다.
P2-B는 2026-07-20 사용자 승인을 받았다.
P2-C는 2026-07-20 사용자 승인을 받았다.
P2-D는 2026-07-20 사용자 승인을 받았다.
P2-Exit closeout 구현, public docs 동기화와 누적 검증은 2026-07-20 완료했고 사용자 승인을 받았다.

## Exit 조건

- 다섯 facade가 Current public action으로 승격되고 Planned inventory에 남지 않는다.
- Facade와 explicit chain이 semantic/graphic/render 결과에서 동등하다.
- Renderer와 semantic schema에 facade-specific branch가 없다.
- Contract, unit, chart, Browser, Node PNG, package, coverage와 full suite가 통과한다.
- README, public docs, generated references와 canonical examples가 다섯 facade의 현재 계약을 설명하고 검증된다.
- 문서 배포는 수행하지 않고 Phase 15 release-readiness에서 같은 commit을 누적 재검증한다.
