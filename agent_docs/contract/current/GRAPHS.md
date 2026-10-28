# 그래프 데이터·배치·표시 계약

## `createGraphData`

- Signature: `createGraphData({ id, nodes, edges, nodeKey, source, target, edgeKey?, weight?, attributes?, directed?, selfLoops?, maxNodes?, maxEdges? })`.
- Full의 chart-authoring action이다. `nodes`와 `edges`는 명시 materialized dataset ID이며 같은 dataset을 두 역할에 사용할 수 있다. Logical derived owner ID는 기존 dataset selector로 현재 revision에 해석한다. Graph ID는 명시하며 같은 graph namespace의 중복 생성은 오류다.
- `nodeKey`, `source`, `target`, `edgeKey`는 열 이름 또는 중복 없는 1–64개 열 배열이다. 복합 열은 원본 typed tuple key를 만든다. Row key scalar 규칙을 사용하며 string/number의 같은 표시값을 합치지 않는다. 모든 node key는 유일하고 모든 endpoint는 존재하는 node를 참조해야 한다.
- `target`은 간선 종점 열이다. 이 생성 action은 unit-local이며 target 기반 scope dispatch를 지원하지 않는다. 각 child unit에서 생성한 뒤 composition에 넣는다. 수정 action의 `target`은 별도로 graph ID를 뜻한다.
- `edgeKey`가 없으면 edge dataset의 logical identity와 persisted row key로 parallel occurrence key를 만든다. 행 위치로 key를 만들지 않는다. 명시 edgeKey는 유일해야 한다. `weight`는 한 finite numeric 열이고 생략하면 1이다. 0과 음수 관측 가중치는 보존한다.
- `attributes`는 명시 node 열 목록이며 기본 빈 배열이다. 열은 존재해야 하고 값은 graph model의 plain immutable data다. 자동으로 모든 원본 열을 복사하지 않는다.
- `directed:false`, `selfLoops:false`, `maxNodes:10000`, `maxEdges:10000`가 기본이다. 두 limit은 positive safe integer이며 공통 work 한도도 적용한다. Self edge는 selfLoops:true일 때만 허용한다. 빈 node/edge table은 유효하며 endpoints 없는 edge는 오류다.
- 저장소는 authored `kind:graph`, revision0, algorithmVersion1을 가진다. `inputs`는 nodes-first 순서의 중복 없는 exact data refs다. `options.roles`의 nodes0/edges0-or-1이 역할을 가리키고 `options.definition`이 해석된 원본 열과 기본값을 보관한다.
- `result.model`은 nodes/edges/directed/selfLoops/adjacency를 가진 common model이다. 각 node의 sourceRows는 node table 위치, edge의 sourceRows는 edge table 위치다. `result.diagnostics`는 관측 graph에서 null이다. `provenance`는 observed origin과 node/edge 역할별 exact InputRowRef를 보관한다.
- Graphics를 만들지 않는다. `editSemantic`을 명시 child로 호출하고 immutable 상태를 반환한다. Codec 복원은 stored model의 구조·adjacency·source binding·provenance를 검증하며 inference나 layout을 실행하지 않는다. Basic은 생성과 graph snapshot 복원을 지원하지 않는다.

### Formal values — `createGraphData`

- Implemented: `createGraphData(options: CreateGraphDataOptions): ChartProgram`.
- Planned: 이 action의 추가 값 없음.
- Proposed (NOT IMPLEMENTED): implicit endpoint synthesis, automatic source loading.

### Value coverage — `createGraphData`

- ✅ Covered: typed/compound keys, parallel occurrence identity, explicit edge keys, zero weight, shared input roles, empty input, limits, immutable state and trace, source-backed snapshot restoration.
- Evidence: `test/unit/actions/data/observed-graph.test.js`, `test/unit/grammar/graph/input.test.js`, `test/contracts/observed-graph-types.test.js`.

## `editGraphData`

- Signature: `editGraphData({ target?, nodes?, edges?, definition? })`.
- 기존 observed graph만 수정한다. 명시 target이 우선하며 생략하면 current eligible graph, 하나뿐인 eligible graph 순서로 찾고 ambiguity/missing은 오류다. Scoped target은 기존 Full action target 프로토콜을 따른다.
- `definition`은 생성 action의 source definition에 대한 nonempty partial patch다. Endpoint 열 `definition.target`과 수정 대상 `target`을 구분한다. `nodes`/`edges`를 생략하면 현재 exact input을 보존한다. 같은 값도 명시한 수정은 새 graph revision을 만든다.
- 전체 편집이 비어 있거나 undefined/null/unknown option, 잘못된 key/endpoint/weight/limit을 포함하면 거부한다. 정의의 ID나 graph origin은 바꾸지 않는다.
- 원본 table을 다시 읽어 graph model과 provenance를 만들고 revision을 1 올린다. 관측 explicit key 또는 살아 있는 persisted row key는 행 재정렬 후에도 유지한다. 원본 program, 입력, trace와 graphics는 불변이다.
- DATA의 `reviseData`와 derived revision 계획은 등록된 graph owner를 명시적으로 호출해 입력 역할을 새 dataset revision으로 갱신한다. 한 dataset이 nodes/edges를 함께 소유하면 graph revision은 한 번만 갱신한다. 유효하지 않은 endpoint/값을 만드는 source revision은 전체적으로 실패한다. 참조 중인 dataset 제거는 기존 restrict 정책으로 거부한다.
- 연결된 graph layout의 결과를 먼저 계산·검증하고, exact graph/layout revision을 한 primitive transition에 함께 반영한다. 각 layout은 한 번 갱신하며 다른 graph의 layout은 공유를 유지한다. Fixed positions나 pinned/initial coverage를 깨뜨리는 source 변경은 전체적으로 거부한다. 연결된 graph plot이 있으면 그 geometry와 label을 preflight하고 layout 반영 뒤 명시 materialize한다. Plot이 없으면 graphics는 그대로다.

### Formal values — `editGraphData`

- Implemented: `editGraphData(options: TargetedOptions<EditGraphDataOptions>): ChartProgram`.
- Planned: 이 action의 추가 값 없음.
- Proposed (NOT IMPLEMENTED): origin conversion, force/cascade edits, implicit missing-node creation.

### Value coverage — `editGraphData`

- ✅ Covered: explicit/current/unique/ambiguous target, node and edge input revisions, immutable failures, typed endpoint field edits, old/new identity and provenance, restore then edit.
- Evidence: `test/unit/actions/data/observed-graph.test.js`, `test/contracts/observed-graph-types.test.js`.

## `layoutGraph`

- Signature: `layoutGraph({ id, graph?, method, options? })`.
- Full chart-authoring action이다. id는 명시하며 layout namespace의 기존 ID를 덮지 않는다. graph는 explicit/current eligible/unique 순으로 찾고 ambiguity/missing은 오류다. Graph topology를 변경하거나 관계를 추론하지 않는다.
- method는 fixed/circular/force다. fixed의 positions는 `{key,x,y}` 배열이며 모든 node를 정확히 한 번 덮는다. key는 원본 typed RowKey이며 compound tuple도 허용한다. x/y는 finite다.
- circular 기본은 center `[0,0]`, radius `100`, startAngle `0`이다. Radius는 nonnegative finite, angle은 finite degree이며 0은 위쪽, 양수는 시계 방향이다. Empty graph는 빈 결과, single node 또는 radius0은 center에 배치한다.
- force 기본은 seed1, iterations300, linkDistance30, repulsion100, collisionRadius4, damping0.9, center `[0,0]`, componentGap16, pinned `[]`다. Seed는 uint32, iterations는 nonnegative safe integer, 나머지 숫자는 finite nonnegative이며 damping은 1 이하다. initialPositions는 optional complete `{key,x,y}` 배열이고 pinned는 unique existing key의 `{key,fx,fy}` subset이다. Pins는 packing 뒤에도 exact 좌표를 유지한다. Disconnected components는 저장된 horizontal packing 정책으로 배치한다.
- maxNodes/maxEdges 기본은 각각10000이며 positive safe integer다. 공통 work 한도를 계산 전에 검사한다. 옵션은 닫힌 own-data record이며 accessors, unknown/null/undefined fields와 invalid coordinates는 오류다.
- 저장된 authored layout은 exact graph input 한 개, next revision, resolved options, concrete node 좌표, algorithm version, optional force packing과 exact source-row provenance를 가진다. Renderer와 Canvas를 호출하지 않는다. `editSemantic`을 명시 child로 호출한다.
- 공개 수정은 [editLayout](LAYOUTS.md#editlayout)이 소유한다. Graph/source revision은 연결된 layout을 명시적으로 다시 계산한다. 저장 복원은 exact node membership/order, fixed/circular coordinates, force pins/component membership/bounds와 provenance를 검증하며 force solver를 실행하지 않는다.

### Formal values — `layoutGraph`

- Implemented: `layoutGraph(options: TargetedOptions<LayoutGraphOptions>): ChartProgram`.
- Planned: 이 action의 추가 값 없음.
- Proposed (NOT IMPLEMENTED): wall-clock simulation, implicit edge inference.

### Value coverage — `layoutGraph`

- ✅ Covered: all three methods, typed positions, deterministic force, pins, empty and singleton graphs, independent layout revisions, atomic source changes, codec validation and Full boundary.
- Evidence: `test/unit/resources/graph-layouts.test.js`, `test/unit/resources/graph-layout-state.test.js`, `test/unit/grammar/graph/layout-options.test.js`, `test/unit/grammar/graph-force.test.js`, `test/contracts/observed-graph-types.test.js`.

## `createGraphPlot`

- Signature: `createGraphPlot({ id?, layout?, origin?, clip?, nodes?, edges?, labels? })`.
- Full chart-authoring action이다. 첫 생략 ID는 graphPlot이며 추가 plot은 명시 ID를 요구한다. layout은 explicit/current eligible/unique 순서로 graph input 한 개를 가진 layout만 고르고 missing/ambiguity는 오류다.
- origin:auto는 저장된 node bounds를 plot 중앙으로 이동한다. 명시 [x,y]는 plot-relative translation이다. 좌표를 scale하거나 solver를 실행하지 않는다. clip 기본 false다.
- nodes 기본 radius6/fill#2563eb/stroke#ffffff/strokeWidth1/opacity1. overrides는 원 typed RowKey와 같은 style subset의 배열이다. fill은 shared FillPaint를 허용한다. radius/폭은 nonnegative finite, opacity는 unit interval이다.
- edges 기본 stroke#94a3b8/strokeWidth1.5/opacity1/parallelGap16/loopRadius20/arrowSize8/arrows:auto다. auto는 graph.directed를 따르고 true/false는 표시를 명시한다. 모든 길이는 nonnegative finite다. Endpoint pair의 원 순서로 병렬 cubic 경로를 나누고 self-loop/coincident endpoint도 별도 경로로 보존한다. Arrow는 같은 edge logical item의 별도 graphic role이다.
- labels 기본 false, {}는 원 key 표시다. field는 명시 보존된 node attribute여야 하며 scalar를 String으로 표시한다. null/undefined는 빈 문자열, object/array는 오류다. 기본 fill#0f172a/fontSize12/fontFamily sans-serif/fontWeight normal/offset[0,14]. overrides는 typed key/text/label paint를 허용한다.
- 초기 override key는 기존 node이며 유일해야 한다. 배열은 교체 의미다. 이후 사라진 key는 orphan-style 진단과 dormant intent로 유지하며 동일 key가 돌아올 때만 재사용한다.
- layer는 mark.type:graph, exact graphBinding.layout, graphLabels 의미를 저장한다. materializationConfigs.marks[id].graphPlot이 paint·placement를 소유한다. Wrapped editSemantic 세 단계와 materializeGraphPlot이 concrete collection에 edge body/arrow, node body, node label 순으로 기록한다.
- Logical selection은 node와 edge 각각 한 항목이며 role별 exact 원본 row membership을 가진다. fields.kind/key/origin과 node degree/incoming/outgoing, edge sourceKey/targetKey/weight/directed/ruleId를 노출한다. Node attributes는 attribute:<name>를 사용해 metadata와 충돌하지 않는다.
- Highlight는 stroke 계열 color/stroke/strokeWidth/opacity/offset을 지원한다. Node border와 edge path/arrow fill을 함께 강조하고 label paint를 보존한다. Node label·edge arrow는 opacity/offset/dim/order에서 같은 항목을 따른다. fill/shape/size/fontSize/strokeDash는 거부한다.
- Source/graph/layout revision은 모든 plot의 결과를 먼저 검사하고 exact revision 갱신 뒤 명시 재물질화한다. 실패는 원 program/trace를 보존한다. Canvas edit는 placement만 갱신하며 stored solver result는 공유한다. Concat scoped edit를 지원한다.
- removeMark가 binding을 해제한다. removeResource의 restrict/cascade 모두 live mark는 먼저 제거해야 한다. Codec은 저장 config·binding·label 의미를 검증하며 force solver를 재실행하지 않는다. Inspector와 accessible export는 logical node/edge를 세고 scene은 같은 concrete identity를 보존한다. Canvas/SVG/PNG/PDF는 graph 의미를 해석하지 않는다.
- Position encoding/axes/scale legend는 stored layout에 적용되지 않는다. Graph facet/repeat와 induced filtering은 이 공개 plot에 아직 연결하지 않았다.

### Formal values — `createGraphPlot`

- Implemented: `createGraphPlot(options?: TargetedOptions<GraphPlotOptions>): ChartProgram`.
- Planned: graph facet/filter 및 후행 paint/controller 통합은 별도 소비자 범위다.
- Proposed (NOT IMPLEMENTED): implicit coordinate-to-edge inference.

### Value coverage — `createGraphPlot`

- ✅ Covered: directed/parallel/self-loop primitive pairs, immutable typed membership, labels, source revisions, codec, scene, accessibility and scoped composition.
- Evidence: `test/charts/graph-plots/`, `test/unit/resources/graph-plots.test.js`.

## `editGraphPlot`

- Signature: `editGraphPlot({ target?, layout?, origin?, clip?, nodes?, edges?, labels? })`.
- 기존 graph plot에 nonempty partial patch를 적용한다. target은 explicit/current eligible/unique 순서이며 scoped target도 허용한다. 생략은 보존, override 배열은 교체, labels:false는 의미와 paint를 함께 제거한다. labels:{}는 key label을 다시 켠다.
- 새 binding은 graph layout이어야 한다. 기본값·검증·consumer는 createGraphPlot과 같다. 동일 값의 명시 편집도 재물질화하며 layout numeric intent는 바꾸지 않는다. Unknown/null/undefined, 잘못된 key/paint/label은 상태 변경 전에 거절한다.

### Formal values — `editGraphPlot`

- Implemented: `editGraphPlot(options: TargetedOptions<EditGraphPlotOptions>): ChartProgram`.
- Planned: 이 action의 추가 값 없음.
- Proposed (NOT IMPLEMENTED): implicit topology edits through appearance.

### Value coverage — `editGraphPlot`

- ✅ Covered: appearance/labels/binding, source reordering, dormant overrides, immutable failure, scoped target, removal and restore.
- Evidence: `test/unit/resources/graph-plots.test.js`.
