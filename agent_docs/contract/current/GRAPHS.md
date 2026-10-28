# 관측 그래프 데이터 계약

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
- 연결된 graph layout의 결과를 먼저 계산·검증하고, exact graph/layout revision을 한 primitive transition에 함께 반영한다. 각 layout은 한 번 갱신하며 다른 graph의 layout은 공유를 유지한다. Fixed positions나 pinned/initial coverage를 깨뜨리는 source 변경은 전체적으로 거부한다. 이 저장 데이터 action은 graphics를 만들지 않는다.

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
