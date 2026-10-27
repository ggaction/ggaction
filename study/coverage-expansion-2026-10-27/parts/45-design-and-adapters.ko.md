## 9. 차트·디자인·데이터의 나머지 결손을 공통 기능으로 해결하기

이 장의 새 액션 이름은 설계 제안이다. GGA/USR native capability 원장과 부록 F가 실제 요구 범위이며, 아래 알고리즘은 그 요구를 어떻게 reusable action으로 낮출지 정한다. 이미 있는 통계·마크를 새로 만드는 대신 먼저 현재 계약의 옵션을 검증한다. 예를 들어 loess는 현재 `createRegressionData`와 `editRegressionData({method:'loess', ...})` 경로가 있으므로 이름 부재만 보고 신규 기능으로 분류하면 안 된다.

### 9.1 구조 데이터와 레이아웃 알고리즘

| 기능 | 제안 입력·출력 및 알고리즘 | 합격 불변식과 edge case |
|---|---|---|
| hierarchy data | group-field path 또는 id/parent-id를 명시. node key, parent key, depth, own/aggregate value, row lineage 생성 | cycle/orphan/duplicate ID 진단, null category, internal value 중복 합산 금지, sibling stable order |
| tidy tree | hierarchy → node x/y + edge path, 방향 LR/RL/TB/BT와 separation | 같은 입력에서 동일 좌표, 같은 depth 정렬, subtree overlap 없음, 긴 label과 single node |
| treemap | hierarchy + values → nested rects, squarify/원본 요구 알고리즘, padding/rounding/leaf depth | parent 내 containment, 면적 비례, zero/negative 처리, padding 후 음수 크기 없음 |
| Icicle/Sunburst 공통 partition | hierarchy → normalized interval+depth → Cartesian rect 또는 polar arc | 같은 node ID·집계·순서·선택; 상세 F.2–F.3 |
| graph inference | kNN/radius/similarity/MST/group/sequence → GraphResource | topology와 node layout 분리; 상세 F.6–F.7 |
| edge bundling | graph+node layout → edge routes: hierarchical/FDEB/KDE/edge-path | endpoint·edge ID·adjacency 보존; 상세 F.8–F.9 |
| graph | node/edge table 또는 source/target table → canonical graph | edge key, directed/undirected, parallel edge/self-loop/missing node 정책 |
| circular/force graph | graph → deterministic layout, force는 seed·iterations·정지 기준 고정 | 입력 행 순서 불필요 의존 없음, 빈/불연결 graph, coincident nodes, frame마다 의미 재생성 없음 |
| Sankey flow | directed weighted graph → columns/node boxes/link ribbons | node 유량과 link 폭 보존, source/sink, zero/negative, cycle 정책, stable edge order |
| density contour | 2D histogram 또는 KDE grid → threshold polygon set | 원본 estimator 구분, threshold 포함 규칙, marching-squares saddle 결정, disconnected islands·holes |
| calendar | date + value → week/day cells/month boundary | timezone/weekStart, leap day, 연말 주차, missing date, 날짜 중복 집계 |

이 기능들은 semantic layout resource를 만들어야 한다. 사용자에게 최종 좌표 배열을 계산하도록 요구하지 않는다. `createHierarchyData → layoutHierarchy → createRectMark/createArcMark/createNodeMark`처럼 데이터 구조, 배치, 시각화를 분리하고, 편의 facade는 이 액션을 호출한다. 표의 `layoutHierarchy/layoutGraph/layoutFlow/layoutCalendar`는 같은 제안을 가리키는 권장 도메인 이름이며 최종 이름은 카탈로그와 함께 고정한다.

Sankey는 DAG와 cyclic flow를 명시적인 native layout mode로 구분하고 cycle/negative/self-link 정책을 정의한다. DAG mode가 cycle을 거절하는 것은 정상 오류이며 cyclic mode를 지원한 것으로 표시하지 않는다. 최종 범위에는 cyclic 경로의 geometry·유량·hit 검증도 포함한다. graph의 adjacency 강조, tree의 탐색, treemap의 breadcrumb/깊이 제한은 자체 상태 계약으로 구현한다. self-link를 조용히 삭제하지 않고 명시 오류 또는 표시 정책을 사용한다.

### 9.2 범용 기하와 차트 facade

Pyramid(외부 Funnel의 이름만 변경)는 단계별 폭·간격·방향을 가진 trapezoid/segment다. KPI/Gauge 전용 기능은 제외한다. Bullet 표현은 기존 qualitative band·bar·target rule의 조합으로 만들고 전용 API를 추가하지 않는다. 나머지 candlestick은 OHLC body·wick, waterfall은 delta/subtotal/total와 connector라는 의미 단위로 만든다. 하나의 giant path로 합치면 각 부분 선택·편집·annotation이 불가능해지므로 role별 owner를 유지한다.

ridgeline은 shared x와 density amplitude, row baseline offset, overlap/clip/labels의 조합이다. streamgraph는 단순 centered stack과 wiggle baseline이 다르므로 원본에서 사용한 baseline 알고리즘과 irregular x spacing을 검증한다. ranged dot·range area·error band는 endpoint 순서와 범위 교차, missing 처리, uncertainty 의미를 분리한다. 원본이 가진 상·하한을 새로 계산한 confidence interval로 바꾸면 안 된다.

Table/Bar Table/Sparkline은 좌표축 차트만큼 명시적인 cell layout이 필요하다. column width, 숫자 정렬, header/row separators, format, row limit, clipped value 표시, inline sparkline의 공통 x와 독립 y, 조건부 bar/color를 cell resource에 둔다. cell과 row/column header의 의미를 접근성 table과 hit target에 전달한다. 수백 개 독립 text의 수동 x/y 지정은 정상 최종 recipe가 아니다.

### 9.3 아직 없는 image·trail·paint 계약

native image mark는 현재 concrete primitive 목록에 없으며 image asset resource + image semantic mark + renderer serialization이 필요하다. URL, hash, dimensions, preserve-aspect/fit, opacity, clip, cross-origin/export policy를 가진다. loader는 browser와 Node에서 달라도 resolved asset의 의미는 같아야 한다. 외부 SVG image는 sanitize/지원 요소를 검증하고 embedded script/external reference를 실행하지 않는다. 이것은 실제 image asset을 표현하는 기능이며 차트 전체를 screenshot으로 바꾸는 허용이 아니다.

trail은 선의 vertex마다 size가 바뀌는 의미를 가진다. 일정 strokeWidth line으로 대체하지 않는다. centerline + width samples → join/cap이 있는 ribbon geometry로 materialize하고, break/curve/ordering/size interpolation, zero width, 급격한 turn, hit와 bounds를 검증한다.

native 디자인의 texture는 named paint resource로 처리한다. solid/diagonal/antidiagonal/horizontal/vertical/cross/dots의 pitch, stroke, phase, local/global coordinate, alpha, background를 정의한다. SVG pattern/Canvas pattern/PDF vector tiling 또는 동등한 결정적 geometry를 생성한다. 현재 linear gradient만으로 radial gradient·pattern·image fill을 지원한다고 할 수 없다. 원본에서 실제 사용한 radial gradient, 그림자, halo, outline, blend와 필요한 paint 종류는 별도 인벤토리 행으로 추가한다. 모든 renderer에 없는 paint를 조용히 단색으로 바꾸지 않는다.

### 9.4 데이터·통계·표현식의 정확성

기존 summary/bin/bin2d/stack/window/fold/flatten/lookup/impute/regression/density/ECDF/timeUnit을 우선 재사용한다. native aggregate 계약에서 sample/population variance, quantile interpolation, inclusive bin edge, null/NaN 처리, sort stability, frame bounds, density normalization, regression weighting/span/bandwidth를 명시하고 검사한다. pivot은 row/column grain, generated field collision, missing cell, duplicate aggregation을 가진 native transform으로 보강한다. transform 순서를 임의로 교환하지 않는다.

계산 표현식 확장은 현재 AST가 수용하는 연산만을 기준으로 한다. 예를 들어 현재 timeUnit action의 여러 단위와 computed `datePart`의 year 전용 계약은 다르다. native trig/date/string/conditional 함수는 실제 AST node/function을 추가해 처리하고 action trace와 오류 source pointer를 보존한다. formatter와 데이터 transform을 섞지 않는다. `"1"`, `1`, `null`, `""`, missing, boolean의 동등성·정렬·형변환은 자체 타입 계약으로 고정한다.

named/inline/URL/relative dataset, CSV/JSON format, parse directives, field escaping, dotted literal field와 nested field path, parameter-dependent data source를 구분한다. remote data는 재현 manifest에서 hash를 고정한다. 데이터·schema·binding은 자체 명시 입력으로 검증한다. 합성 fixture는 native 연산의 정확성·경계·성능을 확인하며 외부 원본의 번역 성공을 주장하지 않는다.

### 9.5 디자인 우선순위·폰트·레이아웃

디자인 우선순위의 권장 규칙은 ggaction 기본값 < chart family 기본값 < theme < plot/mark style < explicit channel/mark/guide 값 < named interaction overlay다. 이는 ggaction 자체 설계 제안이며 외부 dialect나 adapter의 precedence에 맞추지 않는다. `undefined`, omitted, `null`, `false`, `0`을 합치면 축/범례 숨김, baseline, padding이 틀어진다. 최종 resolved value와 출처를 inspection에서 볼 수 있게 한다.

native theme은 팔레트만이 아니라 headline/deck/axis/value/annotation typography, structure, geometry, facet, layout, annotation, furniture, texture, interaction policy를 포함한다. 자체 token schema와 chart별 override 우선순위를 정하고 검증한다. 외부14개 테마와의 매핑은 요구하지 않는다. 작은 화면에서 label wrap→skip→rotate 순서, minimum plot size, overflow, legend collect, footer/source note가 결정적으로 작동해야 한다. 텍스트 측정은 실제 renderer가 선택한 font/hash/fallback을 사용한다. font load 뒤 layout revision을 갱신하되 stale request가 새 차트를 덮지 않는다.

composition에는 canvas bounds, content bounds, plot bounds, guide bounds를 구분한 계약이 필요하다. 분리된 panel의 shared/independent scale, nested facet, 같은 frame의 shared Y와 단일 Y guide, top/bottom lane, full-bounds packing, header baseline, footer axis, empty cell, variable row height, responsive container를 각각 검증한다. 고정 margin을 원본보다 크게 바꿔 오류만 피하면 visual-qualified가 아니다.

여러 행의 facet, 긴 label, 공유 footer, 가변 row height를 가진 합성 fixture로 공통 배치를 검사한다. 과거 외부 원본의 fidelity 사례는 참고할 수 있지만 특정 source ID의 번역·픽셀 재현이 이 작업의 완료 조건은 아니다. tolerance를 키워 shared alignment 오류를 숨기지 않는다.

## 10. ggaction 자체 설계의 결정 원칙과 공개 계약

### 10.1 외부 정합성·통합·번역은 이번 목표에서 제외

Flint adapter, upstream prepare API, mount/React/MCP/Python 연결, 외부 template·theme·preset·update-op parity를 구현하지 않는다. chart-llm 및 기타 외부 chart spec의 parser/normalizer/translator, 파일별 source fidelity qualification도 별도 프로젝트다. 외부 저장소 변경이나 테스트 실행을 ggaction release의 선행 조건으로 삼지 않는다. 과거 상세안은 [철회 기록](evidence/withdrawn-external-design.ko.md)에 남긴다.

기능의 범위는 축소하지 않는다. native 데이터·통계·복합 geometry·paint·가이드·조합·구조형 chart·geo·hit·interaction·animation·저장·export·접근성·성능을 GGA-01–10과 USR-01–22로 추적하되 USR-03/04는 이번 의무에서 제외한다. 외부에서 본 아이디어는 이 계약을 개선하는 참고이며, 외부 속성이 존재한다는 이유만으로 core 옵션을 추가하지 않는다.

### 10.2 설계 판단의 우선순위

1. 데이터 의미·수학적 정확성·일관된 identity와 lineage.
2. 기존 immutable ChartProgram, 추적 가능한 작은 액션, 명시적 materialization, renderer-neutral graphicSpec의 경계.
3. 조합 가능성, 읽고 수정하기 쉬운 API, 결정적 저장·복원과 inspectability.
4. 실제 조작·접근성·성능·취소·자원 관리 및 SVG/Canvas/export 일관성.
5. 구현·타입·스키마·문서·agent 지원의 동일한 계약.

이 기준을 충족하면 외부 API 이름·기본값·event ordering·시각적 결과와 달라도 된다. 구현자가 외부 호환을 위해 core에 compatibility branch를 추가하지 않도록 dependency와 release gate에서 검사한다. 향후 외부 adapter가 필요하면 별도 프로젝트가 native public API를 소비하도록 한다.

### 10.3 공개 API와 resource의 책임

순수 action은 data/resource/semantic intent를 입력받아 새 program과 trace를 만든다. data inference는 topology, layout은 배치, routing은 edge 경로를 담당한다. concrete graphics는 explicit materialization에서 생성하며 renderer는 semanticSpec를 해석하지 않는다. controller는 사용자 입력과 session lifecycle, animation player는 clock과 presentation frame을 담당한다.

public action 옵션은 자체 catalog/types/schema로 정의한다. 필요한 경우 여러 native 기능이 공유하는 공통 계약을 추가하고, 특정 외부 JSON을 통째로 받는 opaque escape API를 만들지 않는다. capability 조회는 action 존재 여부뿐 아니라 option+coordinate+renderer+interaction 조합의 검증 증거를 반환한다.

### 10.4 기본값·변경·오류의 관리

theme/scale/selection/animation/inference/bundling 기본값은 native intent와 독립 oracle로 선택한다. 모든 값의 단위·범위·null/omitted 의미·우선순위·version을 문서화한다. 변경 시 explicit migration 또는 versioned resource를 사용하고 기존 snapshot의 의미를 조용히 바꾸지 않는다. 실패는 정확한 owner/option/constraint를 돌려주고, 임의의 external fallback을 성공으로 표시하지 않는다.

## 11. 자체 fixture와 검증 파이프라인

### 11.1 입력의 의미를 통제할 수 있는 fixture

각 native capability에 작은 수작업 예제, 경계·오류 예제, 실제 규모 예제, 조합 예제를 둔다. data·asset·font·locale·timezone·viewport를 고정하고 예상 숫자·bounds·state transition·중간 animation frame을 독립적으로 정의한다. 외부 논문·수학 reference는 알고리즘 oracle로 사용할 수 있으나 외부 chart engine이 있어야 시험을 실행할 수 있는 구조는 피한다.

### 11.2 기능별 수직 검증

`native requirement → public action/resource → validation → explicit materialization → render/hit → interaction/time → save/load/edit → export/package`로 연결한다. geometry snapshot 하나나 API 이름 등록만으로 완료하지 않는다. renderer 간 같은 semantic geometry, 입력 중 취소, revise/resize 뒤 identity, dispose 뒤 자원 해제를 함께 확인한다.

### 11.3 조합과 표현력

partition 직교/극좌표, inferred graph+layout+bundling, geo+camera+selection+animation, facet+filter+shared guides처럼 기능을 조합한 fixture를 필수로 둔다. 한 기능이 다른 기능의 상태나 자원을 임의로 변경하면 실패다. KPI/Gauge 제외, 단일 Y, 전용 Marginal/Bullet/Combo API 없음도 native 생성·수정·복원 경로에서 검증한다.

### 11.4 외부 자료의 위치

Flint 874개 관찰 요구와 코퍼스 1,405종 feature는 reference-only 원장으로 보존한다. active 작업·인수 시험·완료 분모는 없다. 원본 번역률, 차트 이름 수, 외부 엔진 픽셀 일치율을 이번 구현의 성공 지표로 사용하지 않는다. 나중에 번역 프로젝트가 이 자료를 재사용할 수 있지만 현재의 core 설계 결정을 제약하지 않는다.

## 12. 사람과 agent가 같은 지원 상태를 읽게 만들기

새 기능의 문서는 도메인 개념 → 최소 실행 예제 → 조합 예제 → edit/resize/serialize 예제 → 제한·오류 → 검증된 native 조합 사례 순으로 작성한다. 현재 지원과 계획을 한 표에서 구분하고, `compatibility.json`에 feature/version/renderer/fixture/evidence를 저장해 human docs와 LLM 문서를 같이 생성한다. 계획 중인 API를 current action catalog에 implemented로 넣지 않는다.

action card에는 intent, owner/resource, prerequisites, required/optional options, defaults, mutually-exclusive options, pure/runtime 구분, serialization, materialization invalidation, identity 영향, interaction/animation 가능 여부, executable examples와 negative cases가 있어야 한다. geo/animation의 경우 렌더링 없이 의미만 저장한 상태와 실제 화면·상호작용까지 가능한 상태를 구분한다.

agent가 지원 여부를 물으면 API 이름의 존재뿐 아니라 해당 option+coordinate+renderer+interaction 조합의 evidence를 돌려준다. 모르는 조합은 `unqualified`로 답하고 근거 없는 조합을 만들어 내지 않는다. requirement와 fixture ID는 사람 보고서, JSON, CI 결과, issue/PR 설명에서 동일하게 사용한다. core 계약의 변경이 문서·types·MCP/LLM artifact에 반영되지 않으면 release gate가 실패하게 한다.


### 12.1 개정 범위를 문서와 agent 출력에 유지

Icicle/Sunburst는 같은 partition card의 coordinate 예제로 설명한다. UpSet 전용 문서는 후속 설계 기록에만 남긴다. inference와 layout·bundling은 각각 독립 card다. 네 bundling method와 여섯 inference rule의 옵션·오류·provenance·검증 상태를 모두 표기한다. Marginal/Bullet/Combo는 조합 recipe 검색어로만 노출하며 전용 API처럼 소개하지 않는다. Pyramid의 외부 Funnel alias와 원본 인구 피라미드의 구분을 mapping 카드에 명시한다. KPI/Gauge 전용 지원은 제외 상태, dual-Y는 금지 상태를 문서화하고 agent가 이를 구현 추천으로 재도입하지 않게 한다.
