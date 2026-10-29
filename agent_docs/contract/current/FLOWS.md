# 유량 데이터와 Sankey 배치

## 공통 계약

Full chart-authoring API다. `createFlowData → layoutFlow → createFlowLinks + createFlowNodes`로
의미, 배치, 노드·링크를 따로 작성한다. 두 mark는 같은 exact layout을 참조한다.
기존 observed graph의 typed key·source-row·revision·삭제 규약을 재사용한다.
Basic은 이 action들과 graph/layout snapshot 복원을 지원하지 않는다.
`hconcat`/`vconcat`과 exact child target 편집은 지원한다. node/edge 두 표를 함께
분할할 규칙이 없는 `facet`/`repeatCharts`는 명시 incompatible 오류로 원자적으로 거부한다.
Evidence: `test/unit/resources/flow-plots.test.js`.

기본 body/link/label 스타일은 [theme precedence](CORE.md#applytheme)를 따른다. 명시한 role과
typed-key style은 보존하고, theme 제거·codec·named highlight·글꼴 변경은 저장된 layout을
재계산하지 않는다. Evidence: `test/unit/actions/theme-flow.test.js`.

옵션은 닫힌 own-data record다. unknown key, accessor, 명시 undefined/null, 잘못된 값과
공통 generated-item/work 한도를 거부한다. 실패는 이전 program·입력·trace를 보존한다.
명시 ID가 우선이며 생략한 참조는 current eligible, 유일한 eligible 순으로 선택한다.
누락·복수 후보를 첫 항목 선택으로 해결하지 않는다.

## `createFlowData`

- Signature: `createFlowData({ id, nodes, edges, nodeKey, source, target, value, edgeKey?, attributes?, selfLoops?, balance?, maxNodes?, maxEdges? })`.
- id, node/edge materialized dataset ID, nodeKey/source/target 열, value 열은 필수다.
  `target`은 endpoint 열이므로 이 생성 action은 scoped-target dispatch를 하지 않는다.
- Key 열과 복합 열 배열, parallel occurrence identity, explicit edgeKey, attributes는
  [관측 그래프](GRAPHS.md#creategraphdata)와 같다. value는 finite nonnegative numeric 열이다.
  directed는 항상 true이며 공개 옵션이 아니다. zero edge와 고립 node를 보존한다.
- 기본 balance는 allow, selfLoops는 false, maxNodes/maxEdges는 각각10000이다.
  strict는 incoming/outgoing 간선이 모두 있는 내부 node에만 유량 보존을 요구한다.
  source/sink의 순 유출입은 허용한다. 오차는 `1e-12 × max(incoming,outgoing)` 이하다.
  합산은 edge 입력 순서이며 overflow를 거부한다.
- authored graph revision0을 저장한다. options.definition.weight에 value 열, directed:true를
  저장하고 options.flow.balance에 보존 정책을 둔다. result.diagnostics.flow.nodes는
  key/incoming/outgoing/throughput/imbalance를 가진다. throughput은 max(incoming,outgoing),
  imbalance는 incoming-outgoing이다. exact input refs와 observed provenance는 graph owner와 같다.
- Graphics는 만들지 않으며 editSemantic child가 저장을 소유한다.

### Formal values — `createFlowData`

- Implemented: `createFlowData(options: CreateFlowDataOptions): ChartProgram`.
- Planned: 추가 값 없음.
- Proposed (NOT IMPLEMENTED): automatic endpoint synthesis.

### Value coverage — `createFlowData`

- ✅ Covered: typed keys, parallel/zero/self-loop edges, strict internal balance, finite sums, empty inputs, immutable errors and Full boundary.
- Evidence: `test/unit/resources/flow-resources.test.js`, `test/unit/flow-layouts.test.js`, `test/contracts/flow-types.test.js`.

## `editFlowData`

- Signature: `editFlowData({ target?, nodes?, edges?, definition? })`.
- 기존 flow graph만 선택하며 definition은 생성 source definition의 partial patch다.
  생략한 node/edge role과 definition 값은 유지한다. 빈 수정은 오류다.
- graph revision을 1 올리고 모든 종속 layout 결과와 plot/label을 먼저 계산·검증한다.
  exact refs를 같은 primitive transition에 갱신한 뒤 각 node/link materializer를 한 번 호출한다.
  선택 identity와 highlight baseline도 갱신한다. 다른 graph의 layout은 그대로 공유한다.
- reviseData 및 computed/parameter revision의 graph owner는 flow이면 이 action을 호출한다.
  source가 한 dataset의 양 역할이면 한 번만 수정한다. invalid endpoint, negative/overflow,
  strict imbalance, DAG cycle, 사라진 label field 등은 전체 변경을 거부한다.
- removeResource의 graph/layout dependency 규약을 재사용하며 mark는 removeMark로 제거한다.

### Formal values — `editFlowData`

- Implemented: `editFlowData(options: TargetedOptions<EditFlowDataOptions>): ChartProgram`.
- Planned: 추가 값 없음.
- Proposed (NOT IMPLEMENTED): graph origin conversion.

### Value coverage — `editFlowData`

- ✅ Covered: role-preserving revisions, existing layout/mark closure, labels, scoped targets, immutable failure, restore then edit.
- Evidence: `test/unit/resources/flow-resources.test.js`, `test/unit/resources/flow-plots.test.js`, `test/contracts/flow-types.test.js`.

## `layoutFlow`

- Signature: `layoutFlow({ id, graph?, method, options? })`.
- method는 dag/cyclic다. directed이며 weight가 finite nonnegative인 graph를 소비한다.
  `layoutGraph`의 fixed/circular/force와 구분한다. 기존 topology와 edge를 삭제·추론하지 않는다.
- 기본 options는 width600, height400, nodeWidth16, nodePadding8, align:justify,
  order:input, iterations6, laneGap8, orientation:horizontal, maxNodes/maxEdges10000이다.
  width/height/nodeWidth는 positive finite이고 nodeWidth는 진행 축 이하이다.
  nodePadding/laneGap은 nonnegative finite, iterations는0–1000 정수다.
- align은 left/right/center/justify다. left는 longest-path rank, right는 sink distance를
  뒤집고 justify는 sink를 마지막 열로 옮긴다. center는 내부 longest rank를 보존하며
  source를 첫 consumer의 앞, sink를 마지막 열에 둔다.
- order는 input, barycentric 또는 모든 node를 정확히 한 번 덮는 typed RowKey 배열이다.
  input/명시 배열은 열 내 순서를 보존한다. barycentric는 정해진 iteration의 가중 중심 이동과
  overlap 해소를 수행하고 동점은 입력 순서다. private encoded key를 사용자가 추측할 필요가 없다.
- 한 공통 scale `k=min((crossExtent-gaps)/columnThroughput)`를 사용한다.
  모든 유량이0이면 k0이다. node thickness=throughput×k, edge thickness=value×k다.
  padding만으로 extent를 초과하거나 수치가 overflow하면 오류다.
- dag는 zero edge를 포함한 모든 cycle과 self-loop를 거부한다. cyclic은 SCC condensation의
  rank를 사용하며 같은 SCC edge를 feedback lane에, self-loop를 loop lane에 보존한다.
  edge key 순서의 상/하 교대 lane에 thickness+laneGap을 예약하고 전체 bounds에 포함한다.
- orientation vertical은 동일 결과의 축을 교환한다. lane의 center/sourceX/targetX는
  canonical horizontal frame 값이며 edge attachment와 bounds는 요청한 방향의 값이다.
- 저장 결과는 algorithm:sankey@1, nodes, edges, scale, columns, components, bounds다.
  node에는 totals·rect·rank·order, edge에는 value·thickness·source/target·route·lane이 있다.
  authored layout은 exact graph input 하나와 inferred sourceRows를 갖는다.
- 복원은 shape/defaults, source binding, 유량·순서·membership·rank·두께·attachment·lane·bounds를
  검증한다. placement/relaxation solver를 실행하거나 저장된 node 좌표를 덮어쓰지 않는다.
  수정은 [editLayout](LAYOUTS.md#editlayout)이 소유하며 기존 method를 바꾸지 않는다.

### Formal values — `layoutFlow`

- Implemented: `layoutFlow(options: TargetedOptions<LayoutFlowOptions>): ChartProgram`.
- Planned: 추가 값 없음.
- Proposed (NOT IMPLEMENTED): wall-clock convergence, automatic cycle breaking.

### Value coverage — `layoutFlow`

- ✅ Covered: literal conservation, all align/order modes, SCC/parallel/self-loop preservation, horizontal/vertical, zero/empty graphs, limits, deep DAG and corrupted restoration.
- Evidence: `test/unit/flow-layouts.test.js`, `test/unit/resources/flow-resources.test.js`, `test/contracts/flow-types.test.js`.

## `createFlowNodes`

- Signature: `createFlowNodes({ id?, layout?, coordinate?, clip?, nodes?, labels? })`.
- 기본 id는 유일할 때 flowNodes다. explicit/current/unique dag/cyclic layout을 선택한다.
  coordinate는 Cartesian만 허용하며 explicit/current/unique, 없으면 main을 생성한다.
  기존 main이 비호환이면 오류다. layout bounds를 coordinate frame에 균일 배율로 맞춘다.
- nodes는 fill:FillPaint, stroke:string, strokeWidth≥0, opacity∈[0,1]과 overrides를 받는다.
  기본은 #2563eb/#ffffff/1/1이다. overrides는 `{key:RowKey,...paint}`이며 생성 시 유일한
  기존 node key여야 한다. 원본 typed key를 공통 identity codec으로 해석한다.
- labels는 생략/false이면 비활성, `{}`이면 key label이다. content는 key/value/`{field}`이며
  value는 throughput이다. field는 node 원본 row에서 읽으며 없으면 오류다.
  fill:FillPaint, fontFamily, fontSize>0, fontWeight, offset:[x,y], overrides를 받는다.
  기본은 #0f172a/sans-serif/12/normal/[0,0]이다. label override는 key, text 및 label paint다.
- clip 기본 true다. node body는 rect, label은 text이며 exact layout resource lineage를 가진다.
  기본/override paint는 materializationConfigs, label 의미와 exact binding은 semanticSpec에 둔다.
  source revision으로 사라진 override key는 유지하되 orphan diagnostic으로 보고한다.
- materializeFlowNodes wrapped child가 concrete graphics를 만든다. Canvas/coordinate 수정은
  저장 layout identity를 바꾸지 않고 현재 frame에 rematerialize한다. Selection/highlight는
  원본 source rows와 final node item을 사용한다. opacity0은 유효하며 삭제로 취급하지 않는다.
  highlight의 stroke/strokeWidth는 body에만 적용하며 label에는 fill/opacity/offset을 적용한다.
- 위치와 두께는 layout 소유이므로 일반 x/y/size/offset encoding은 적용하지 않는다.
  appearance는 이 action의 typed overrides, 강조는 공통 selection/highlight를 사용한다.
  axis/legend를 자동 생성하지 않는다. 별도 일반 mark/guide와 composition할 수 있다.

### Formal values — `createFlowNodes`

- Implemented: `createFlowNodes(options?: TargetedOptions<FlowNodesOptions>): ChartProgram`.
- Planned: 추가 값 없음.
- Proposed (NOT IMPLEMENTED): automatic scale-driven flow geometry.

### Value coverage — `createFlowNodes`

- ✅ Covered: rect/label geometry, FillPaint, zero opacity, identity, selection, frame edits, removal and codec.
- Evidence: `test/unit/resources/flow-plots.test.js`, `test/contracts/flow-types.test.js`.

## `editFlowNodes`

- Signature: `editFlowNodes({ target?, layout?, coordinate?, clip?, nodes?, labels? })`.
- 기존 flow-node를 explicit/current/unique로 선택한다. 생략한 binding/style을 유지하며
  빈 수정은 거부한다. nodes와 labels의 style은 patch, overrides 배열은 전체 교체다.
  labels:false는 label 의미와 config를 함께 제거한다. 전체 preflight 후 같은 materializer를 호출한다.

### Formal values — `editFlowNodes`

- Implemented: `editFlowNodes(options: TargetedOptions<EditFlowNodesOptions>): ChartProgram`.
- Planned: 추가 값 없음.
- Proposed (NOT IMPLEMENTED): node identity edits through style.

### Value coverage — `editFlowNodes`

- ✅ Covered: style/label edits, preserved values, atomic invalid field, scoped target and changed layout.
- Evidence: `test/unit/resources/flow-plots.test.js`, `test/contracts/flow-types.test.js`.

## `createFlowLinks`

- Signature: `createFlowLinks({ id?, layout?, coordinate?, clip?, links? })`.
- 기본 id는 유일할 때 flowLinks다. layout/coordinate/clip은 createFlowNodes와 같다.
- links paint는 nodes와 같은 필드를 받으며 기본 #64748b/none/0/0.45다.
  link overrides는 graph에 명시 edgeKey 열이 있을 때만 허용한다.
  자동 occurrence identity를 원본 typed key로 오인하지 않는다. labels 옵션은 받지 않는다.
- forward edge는 닫힌 cubic ribbon, feedback/loop는 lane을 따라 닫힌 ribbon을 만든다.
  zero edge도 stable item으로 보존한다. materializeFlowLinks wrapped child가 geometry를 만든다.
  renderer는 결과 path만 읽으며 Canvas/SVG/PNG/PDF가 동일한 graphicSpec을 사용한다.
- selection item은 edge grain이고 source/target/value와 source rows, exact layout lineage를 보존한다.
  removal, Canvas/revision closure, style/config/codec 규칙은 nodes와 같다.

### Formal values — `createFlowLinks`

- Implemented: `createFlowLinks(options?: TargetedOptions<FlowLinksOptions>): ChartProgram`.
- Planned: 추가 값 없음.
- Proposed (NOT IMPLEMENTED): inferred edge values or automatic endpoint creation.

### Value coverage — `createFlowLinks`

- ✅ Covered: closed forward/cyclic ribbon, per-edge styles, exact identity, selection, shared frame and immutable lifecycle.
- Evidence: `test/unit/resources/flow-plots.test.js`, `test/contracts/flow-types.test.js`.

## `editFlowLinks`

- Signature: `editFlowLinks({ target?, layout?, coordinate?, clip?, links? })`.
- 기존 flow-link를 explicit/current/unique로 선택한다. 생략한 binding/style을 유지하고
  빈 수정은 거부한다. style은 patch, overrides는 전체 교체다. source/key/layout 부적합은
  primitive transition 전에 거부하며 기존 materializer로 정확히 한 번 다시 만든다.

### Formal values — `editFlowLinks`

- Implemented: `editFlowLinks(options: TargetedOptions<EditFlowLinksOptions>): ChartProgram`.
- Planned: 추가 값 없음.
- Proposed (NOT IMPLEMENTED): topology changes through style.

### Value coverage — `editFlowLinks`

- ✅ Covered: paint patch, edge-key requirements, scoped target, layout rebinding and immutable error.
- Evidence: `test/unit/resources/flow-plots.test.js`, `test/contracts/flow-types.test.js`.

## Resource plot appearance effects

The existing body and label style records accept optional `outline:MarkOutline|false` and `shadow:MarkShadow|false`, including keyed overrides. Reuse the closed values, defaults, glyph order, preparation, source-geometry hit boundary and backend behavior in [MARKS.md](MARKS.md#prepared-per-item-shadows). Create omission has no effect; edit omission preserves; false removes or suppresses inherited effect. Same-patch outline and stroke reject. Stored ordinary stroke remains available beneath an outline. Effects stay in the existing role appearance configuration; false is removed when constructing concrete graphics. Stored shadows require resolved offsets and blur radius. Per-item style changes retain layout resource identity, original source rows, selection keys and glyph roles. Tree links and graph edge/arrow components accept shadow; ordinary stroke owns their contour, with no outline option. Flow ribbons are filled bodies and support both effects.

Evidence: `test/unit/resources/resource-plot-effects.test.js`, `test/unit/resources/font-resource-labels.test.js`.
