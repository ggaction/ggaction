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
- 기존 observed graph 중 flow 의미가 없는 graph만 수정한다. Flow는 [editFlowData](FLOWS.md#editflowdata)를 사용한다. 명시 target이 우선하며 생략하면 current eligible graph, 하나뿐인 eligible graph 순서로 찾고 ambiguity/missing은 오류다. Scoped target은 기존 Full action target 프로토콜을 따른다.
- `definition`은 생성 action의 source definition에 대한 nonempty partial patch다. Endpoint 열 `definition.target`과 수정 대상 `target`을 구분한다. `nodes`/`edges`를 생략하면 현재 exact input을 보존한다. 같은 값도 명시한 수정은 새 graph revision을 만든다.
- 전체 편집이 비어 있거나 undefined/null/unknown option, 잘못된 key/endpoint/weight/limit을 포함하면 거부한다. 정의의 ID나 graph origin은 바꾸지 않는다.
- 원본 table을 다시 읽어 graph model과 provenance를 만들고 revision을 1 올린다. 관측 explicit key 또는 살아 있는 persisted row key는 행 재정렬 후에도 유지한다. 원본 program, 입력, trace와 graphics는 불변이다.
- DATA의 `reviseData`와 derived revision 계획은 등록된 graph owner를 명시적으로 호출해 입력 역할을 새 dataset revision으로 갱신한다. 한 dataset이 nodes/edges를 함께 소유하면 graph revision은 한 번만 갱신한다. 유효하지 않은 endpoint/값을 만드는 source revision은 전체적으로 실패한다. 참조 중인 dataset 제거는 기존 restrict 정책으로 거부한다.
- 연결된 graph layout의 결과를 먼저 계산·검증하고, exact graph/layout revision을 한 primitive transition에 함께 반영한다. 각 layout은 한 번 갱신하며 다른 graph의 layout은 공유를 유지한다. Fixed/initial positions에 없는 새 node를 만드는 source 변경은 전체적으로 거부한다. 사라진 node의 기존 좌표와 pin은 아래 layout 계약대로 보존한다. 연결된 graph plot이 있으면 그 geometry와 label을 preflight하고 layout 반영 뒤 명시 materialize한다. Plot이 없으면 graphics는 그대로다.

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
- Source revision으로 사라진 node의 positions/initialPositions/pinned는 dormant intent로 저장하며 계산에서는 현재 typed key만 사용한다. 같은 key가 다시 나타나면 그 좌표를 재사용한다. Edit에서 생략한 배열은 dormant 항목을 보존하고, 명시적으로 교체한 배열은 현재 node만 허용하는 생성 규칙으로 검증한다. Empty graph도 intent를 보존한다. 저장 복원은 dormant 좌표도 unique/finite로 검증한다.
- maxNodes/maxEdges 기본은 각각10000이며 positive safe integer다. 공통 work 한도를 계산 전에 검사한다. 옵션은 닫힌 own-data record이며 accessors, unknown/null/undefined fields와 invalid coordinates는 오류다.
- 저장된 authored layout은 exact graph input 한 개, next revision, resolved options, concrete node 좌표, algorithm version, optional force packing과 exact source-row provenance를 가진다. Renderer와 Canvas를 호출하지 않는다. `editSemantic`을 명시 child로 호출한다.
- 공개 수정은 [editLayout](LAYOUTS.md#editlayout)이 소유한다. Graph/source revision은 연결된 layout을 명시적으로 다시 계산한다. 저장 복원은 exact node membership/order, fixed/circular coordinates, force pins/component membership/bounds와 provenance를 검증하며 force solver를 실행하지 않는다.

- Coordinate revision evidence: `test/unit/resources/graph-coordinate-revisions.test.js`.

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
- Position encoding/axes/scale legend는 stored layout에 적용되지 않는다. Graph facet/repeat는 아직 연결하지 않았다. Graph induced filtering은 [MARK_SELECTION](MARK_SELECTION.md#filtermarks)의 node recipe를 사용한다.

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

## `createInferredGraphData`

- Signature: `createInferredGraphData({ id, data?, nodeKey, ruleId, rule, features?, metric?, preprocess?, attributes?, options?, candidateGraph?, maxNodes?, maxEdges? })`.
- Full chart-authoring action이다. id/nodeKey/ruleId/rule은 필수이며 source key·attribute·한도·불변성은 관측 graph와 같은 owner를 사용한다. data는 explicit→current materialized→unique eligible 순서이며 ambiguity/missing은 오류다. Graphics 없이 `editSemantic` child로 graph를 저장한다.
- rule은 knn/radius/similarity/mst/group/sequence다. Numeric features는1–64개 field 배열, jaccard는 field 배열 또는 `{set}`, great-circle은 `[longitudeField,latitudeField]` 또는 `{longitude,latitude}`다. Metric은 euclidean/manhattan/cosine/jaccard/great-circle이며 preprocessing은 none(default)/standardize/minmax다. Standardize는 모집단 표준편차, minmax는 열 범위를 사용하고 constant column은0이다. Overflow를 피하기 위해 scale/center/spread 통계를 저장한다. Jaccard/great-circle은 preprocess:none만 허용한다.
- Metric options.missing은 error(default)/omit-node다. 누락은 null/undefined/NaN이며 invalid nonmissing 값은 omit-node여도 오류다. Cosine options.zeroVector는 error(default)/zero-similarity이며 다른 metric에서 금지된다. Jaccard는 typed scalar 집합으로 deduplicate하며 empty-empty1/empty-nonempty0이다. Cosine similarity 범위는[-1,1], Jaccard는[0,1]이며 distance는1−similarity다. Great-circle은 longitude wrap과 latitude[-90,90], 반경6,371,008.8m의 haversine 거리다.
- knn: options.k 기본1, positive safe integer이며 포함 node가2개 이상이면 k<n이다. 거리→typed key 순으로 정확히k개를 선택한다. symmetrize는 directed(default)/union/mutual이다. 빈/단일 node에서는 effectiveK0, self edge는 없다. 같은 점의0 weight를 보존한다.
- radius: options.radius는 필수 finite nonnegative이고 distance≤radius를 포함한다. similarity: options.threshold는 필수 metric domain 값이며 cosine/jaccard만 허용하고 similarity≥threshold를 포함한다. 두 rule의 directed 기본false이며 true는 양방향 간선을 만든다.
- mst: complete metric graph 또는 명시 candidateGraph를 선택한다. Candidate는 named undirected graph이며 같은 source typed node keys에 속해야 한다. 이 경로는 metric/features/preprocess를 금지한다. 모든 candidate weight는 nonnegative이고 self/parallel candidates는 결정적 Kruskal로 처리한다. Disconnected는 options.forest:true를 요구한다(default false). Candidate 없이 metric MST는 missing/zeroVector 정책을 공유한다.
- group: options.fields는 필수 field 배열이다. mode는 clique(default)/star, missing은 error(default)/omit-node/include다. Star는 각 비단일 group의 hubKey 또는 hubs:[{group,key}]를 명시해야 한다. 두 hub 표현은 동시에 쓸 수 없다. Metric/features/preprocess는 금지한다.
- sequence: options.orderField 필수, groupBy 기본[], lag 기본1 positive safe integer, missing은 error(default)/omit-node다. 같은 order 값은 typed key 순으로 정렬하며 i→i+lag directed edge를 만든다. options.maxGap은 optional finite nonnegative이며 numeric 또는 temporalUnit을 명시한 temporal order에만 적용한다. temporalUnit은 공통 temporal input unit을 따른다. Metric/features/preprocess는 금지한다.
- knn/radius의 options.search는 기본 exact brute-force다. `{mode:'exact',algorithm:'brute-force'|'kd-tree'|'grid'}`에서 kd-tree는 Euclidean/Manhattan8차원 이하 knn/radius, grid는3차원 이하 radius에만 허용한다. Grid radius0은 동일 좌표를 처리한다. Similarity는 brute-force만 사용한다.
- knn의 `{mode:'approximate',seed,...}`는 명시 uint32 seed 필수다. algorithm projection-forest, trees8(1–64), projections1, leafSize32(1–1024), searchLeaves16(1–1024), fallback error(default)/exact, minRecall0.95([0.95,1])다. Candidate exact rerank 및 min(n,1000) holdout의 brute-force recall을 기록하며 기준 미달은 오류다. 무음 approximate 전환은 없다.
- 저장 resource는 authored kind:graph, exact source data input0와 optional candidate graph input1, roles.nodes=roles.edges=0을 가진다. options.definition은 normalized authored intent다. model의 nodes/edges/adjacency만 topology를 소유한다. inferred edge key는 ruleId/direction/canonical typed endpoints이며 sourceRows는 두 endpoint의 원 row indices다.
- result.diagnostics는 resolved options, included/omitted rows, preprocessing statistics, search algorithm/version/seed/recall/work, MST cost/component를 저장한다. Prepared vectors와 edge 배열을 복제하지 않는다. provenance.origin은 inferred, sourceRows는 exact data revision의 node rows다. 저장 복원은 binding/identity/weights/diagnostics를 검사하며 search/MST/force solver를 실행하지 않는다. Basic은 이 resource를 지원하지 않는다.

### Formal values — `createInferredGraphData`

- Implemented: `createInferredGraphData(options: CreateInferredGraphDataOptions): ChartProgram`.
- Planned: 이 action의 추가 값 없음.
- Proposed (NOT IMPLEMENTED): implicit metric selection, silent approximation, imputation.

### Value coverage — `createInferredGraphData`

- ✅ Covered: six rules, empty/singleton and duplicate points, typed identity, missing policies and statistics, exact and seeded approximate search, candidate MST, source-bound restore and Full boundary.
- Evidence: `test/unit/actions/data/inferred-graph.test.js`, `test/unit/grammar/graph/input.test.js`, `test/unit/grammar/graph/neighbors.test.js`, `test/unit/grammar/graph/spanning.test.js`, `test/unit/grammar/graph/structural.test.js`, `test/unit/grammar/graph/search.test.js`, `test/unit/grammar/graph/approximate.test.js`, `test/contracts/inferred-graph-types.test.js`.

## `editInferredGraphData`

- Signature: `editInferredGraphData({ target?, data?, candidateGraph?, definition? })`.
- target은 explicit/current eligible/unique inferred graph이며 observed graph를 수정하지 않는다. Scoped child target을 지원한다. data와 candidateGraph를 생략하면 exact 입력을 보존한다. candidateGraph:null은 후보 입력을 제거한다. definition은 source definition partial patch이며 options를 지정하면 rule options 전체를 교체한다. rule을 바꿀 때는 nodeKey/attributes/limits만 이어받고 새 ruleId와 applicable intent를 받는다. 빈 편집과 explicit undefined/null definition, unknown/inapplicable options는 오류다.
- topology를 다시 계산하여 graph revision을1 올린다. 살아 있는 같은 ruleId/direction/endpoints의 edge key는 유지한다. Candidate graph를 소비하는 추론 graph chain과 각 layout/plot을 의존 순서대로 preflight하고 한 번씩 명시 갱신한다. Cyclic candidate refs와 실패하는 downstream geometry는 전체 편집을 거부한다.
- DATA revision의 전체 source replacement map은 exact graph action receiver의 private context에만 존재한다. Prepared primitive는 unique exact next graph/layout revisions, 유지된 options, 동적 dataset의 동일 logicalId와 later revision을 검사한다. 이 authority는 public option이나 저장 state가 아니다.
- Layout/Canvas/paint 수정은 graph topology를 보존한다. Logical node/edge item은 inferred origin/ruleId/rule/metric과 endpoint source rows를 inspection/accessibility에 노출한다. Mark filter의 induced-view는 원 topology를 보존한다. Explicit recompute는 아직 지원하지 않는다.

### Formal values — `editInferredGraphData`

- Implemented: `editInferredGraphData(options: TargetedOptions<EditInferredGraphDataOptions>): ChartProgram`.
- Planned: 이 action의 추가 값 없음.
- Proposed (NOT IMPLEMENTED): origin conversion, screen-coordinate inference.

### Value coverage — `editInferredGraphData`

- ✅ Covered: immutable rule edits, candidate chain/source closure, deduplicated graph/layout revisions, preserved endpoint identities, view-only topology preservation, atomic failures and editable restore.
- Evidence: `test/unit/actions/data/inferred-graph.test.js`, `test/unit/actions/data/inferred-graph-state.test.js`, `test/unit/core/graph-prepared-revisions.test.js`, `test/contracts/realistic-inferred-graphs.test.js`, `test/contracts/inferred-graph-types.test.js`.

## Resource plot appearance effects

The existing body and label style records accept optional `outline:MarkOutline|false` and `shadow:MarkShadow|false`, including keyed overrides. Reuse the closed values, defaults, glyph order, preparation, source-geometry hit boundary and backend behavior in [MARKS.md](MARKS.md#prepared-per-item-shadows). Create omission has no effect; edit omission preserves; false removes or suppresses inherited effect. Same-patch outline and stroke reject. Stored ordinary stroke remains available beneath an outline. Effects stay in the existing role appearance configuration; false is removed when constructing concrete graphics. Stored shadows require resolved offsets and blur radius. Per-item style changes retain layout resource identity, original source rows, selection keys and glyph roles. Tree links and graph edge/arrow components accept shadow; ordinary stroke owns their contour, with no outline option. Flow ribbons are filled bodies and support both effects.

Evidence: `test/unit/resources/resource-plot-effects.test.js`, `test/unit/resources/font-resource-labels.test.js`.
