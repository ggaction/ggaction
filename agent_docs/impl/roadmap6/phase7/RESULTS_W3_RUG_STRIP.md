# Phase 7 W3 결과 — Rug와 Strip placement facade

## 결과

- Full 전용 `createRugPlot`과 `createStripPlot`을 추가했다. 두 액션은 chart 의미와 안전한 기본값을
  한 호출로 정하되, 실제 state는 기존 Tick/Point, position, scale, appearance, jitter와 guide owner가
  작성한다. Basic runtime/type에는 추가하지 않았다.
- `createRugPlot`은 x 또는 y measure를 정확히 하나 요구하고, x에는 top/bottom, y에는 left/right edge만
  허용한다. 반대 위치는 `[0, 1]` scale의 constant datum이라 source에 dummy field나 hidden data를 만들지
  않는다.
- `createStripPlot`은 단일 measure 또는 measure/category 쌍만 허용한다. 단일 measure는 반대 축의 0.5
  center datum을 쓰며, 두 위치는 quantitative/temporal과 nominal/ordinal 역할을 정확히 하나씩 가진다.
- Strip jitter는 measure가 아니라 category/constant slot만 움직인다. Category slot은 band 단위, constant
  slot은 pixel 단위이며 runtime과 TypeScript union 모두 잘못된 단위 조합을 거부한다. Seed/key는 기존
  deterministic jitter owner에 그대로 전달한다.

## 발견하고 수정한 설계 오류

- 승인 계약 초안은 x Rug Tick을 90도, y Rug Tick을 0도로 적었다. 독립 primitive 시각 동등성에서 이대로면
  x축 분포가 수평선, y축 분포가 수직선이 되어 Rug가 아닌 방향으로 그려짐을 확인했다. 기존 direct-degree
  Tick 계약에 맞춰 x Rug는 0도 세로선, y Rug는 90도 가로선으로 계약·구현·oracle을 함께 수정했다.
- 기존 Cars Rug는 `Baseline: 0`이라는 의미 없는 source field와 `[132,132]` range를 만들어 Tick 위치를
  흉내 냈다. 새 public program은 `edge:"bottom"`을 사용하고 source/reference에서 `Baseline`을 제거했다.
  Bottom은 실제 plot edge y=150이고 Tick 중심도 그 edge다.
- 기존 strip intent는 `createPointMark`만 제안한 뒤 `chart.strip.placement`를 미해결로 남겨 완성된 chart를
  만들지 못했다. Resolver를 `createStripPlot({x:"value"})`로 교체하고 `rug plot`도
  `createRugPlot({x:"value",edge:"bottom"})`으로 실행 가능하게 추가했다.
- 최초 Strip 타입은 runtime이 거부하는 constant-band와 category-pixel jitter 조합까지 허용했다. Position
  branch별 pixel/band jitter union으로 좁혀 잘못된 호출을 컴파일 단계에서도 막았다.

## 계층과 시각 동등성

- Rug trace는 `createRugPlot → createTickMark → measure position → constant position → encodeAngle`을,
  Strip trace는 `createStripPlot → createPointMark → encodeX/encodeY → radius/appearance? → jitter? → guides?`
  를 보존한다. Facade 전용 materializer나 renderer 분기는 없다.
- Point/Tick primary position에 datum을 허용하고 row materialization이 같은 normalized datum을 각 source row에
  반복하도록 lower owner를 확장했다. 이 계약은 source field 기반 position과 같은 scale/materialization
  경로를 쓰며 Rule/Rect/Text의 기존 datum 정책을 바꾸지 않는다.
- Cars Horsepower Rug와 Cars Origin/Gapminder Cluster jitter public program을 새 facade로 이전했다. Rug
  primitive는 승인된 새 plot-edge target을 직접 작성하고, Strip primitive는 기존 keyed jitter target을
  유지한다. Semantic/graphic state, draw order와 Canvas/SVG/PNG/PDF 결과가 public program과 일치한다.
- Primitive baselines에는 `createRugPlot`/`createStripPlot`이 없고 displayed call chain과 executable public
  trace에는 각각의 상위 facade가 직접 나타난다.

## Guide, theme, edit 경계

- Rug 기본 guide는 measure axis 하나만 확보한다. Constant anchor axis/grid와 legend 요청은 거부한다.
- Strip 기본 guide는 실제 field가 있는 axis만 확보하고 grid는 생략한다. Constant slot axis/grid는 거부하며
  color/size/shape appearance가 있을 때만 legend를 허용한다.
- Theme reconciliation은 Rug의 explicit `tick.stroke`와 Strip의 explicit `point.fill/stroke`를 caller
  override로 보존한다. Omitted appearance는 기존 theme token으로 재조정된다.
- Scale/Canvas/filter/removeJitter와 Tick/Point/appearance 편집은 기존 lower owner가 재물질화한다.

## 타입·발견성·검증

- Current contract, action index/catalog/card, intent taxonomy, task resolver, API/reference/search/LLM 문서와
  generated declarations를 214 actions에 맞춰 동기화했다. Public inventory는 208 actions, 7,577 option
  paths다. 전체 106 nested scale paths와 417 literals가 Rug x/y 및 Strip x/y/color/size/shape를 포함해
  실제 실행된다.
- `action-direct-polar-parts` 현실 lifecycle recipe가 Rug와 Strip을 직접 호출한다. Phase 7 strict 현실
  inventory 전체 감사는 W1–W3 schedule과 기존 direct-action deficit을 함께 닫는 X 작업에 남기며 여기서
  통과했다고 기록하지 않는다.
- 누적 normal suite **3,140/3,140**, browser **65/65**, render **208/208**가 통과했다. Coverage는 lines
  **95.45%**, branches **92.39%**, functions **98.91%**이며 critical floor 88개를 모두 통과했다.
- Installed package consumer는 Rug/Strip runtime, strict TypeScript의 방향·jitter unit union, Basic 부재,
  Node/SVG/PNG/PDF, browser bundle과 MCP를 통과했다. [artifact 원장](package-rug-strip-results.json)은
  476 entries, 558,691 packed bytes, 2,681,091 unpacked bytes, SHA-256
  `f118d415b7f0ad63c9d16bef0a319794ab8fd6f4dc638ebbc5df4af680050fbf`다.
- Browser gzip은 Full **282,553** / Basic **149,923** / SVG **6,437** bytes다. 새 source/type/card에 맞춰
  entry ceiling을 475→476, packed ceiling을 556,000→559,000, unpacked ceiling을 2,680,000→2,682,000,
  Full gzip ceiling을 282,000→283,000 bytes로 실제 증가량만큼 조정했다. Basic과 SVG ceiling은 유지했다.

## 다음 작업

- Phase 7 X에서 W1–W3의 strict realistic option/literal schedule과 기존 direct-action deficit을 전부 배정해
  현실 데이터 감사를 통과시킨다.
- X package에서 Phase 7 전체 migration, 문서, 패키지 원장과 remote commit 증거를 누적 검증한 뒤 Phase 7을
  닫는다.
