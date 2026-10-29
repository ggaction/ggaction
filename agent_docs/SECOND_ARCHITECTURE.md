# `ggaction` Second Architecture

> 작업에 필요한 section만 빠르게 찾으려면
> [`architecture/README.md`](architecture/README.md)의 작업별 경로에서 시작한다. 이 파일은 현재
> macro-architecture의 canonical 원문으로 유지한다.

### Boolean filter 의존성

AST filter는 computed와 같은 closed v2 expression 및 exact parameter-reference 검증을
사용한다. 읽기 전용 `materialization/expressionInputs.js`가 action materialization과
editable restore에 schema/parameter 환경을 공급하며 restore는 predicate를 실행하지 않는다.
Parameter edit는 공통 dataset DAG와 기존 mark/scale/guide plan을 명시적으로 실행한다.
필터는 원본 행의 순서·식별자·lineage를 유지한다.

## 현재 구조 빠른 지도

이 지도는 현재 `package.json.exports`와 대응한다. 기본 authoring은 domain action →
semantic 상태 → 명시적 materialization → concrete graphicSpec 순서다. renderer는
완성된 graphicSpec만 읽는다. ChartProgram과 이전 revision은 immutable이다.
정확한 action 옵션은 [Current 계약](contract/README.md)과 선언이 소유한다.

| Module | Runtime owner | Declaration |
| --- | --- | --- |
| `ggaction` | `src/index.js` | `types/index.d.ts` |
| `ggaction/basic` | `src/basic.js` | `types/basic.d.ts` |
| `ggaction/extension` | `src/extension.js` | `types/extension.d.ts` |
| `ggaction/png` | `src/renderers/png.js` | `types/png.d.ts` |
| `ggaction/pdf` | `src/renderers/pdf.js` | `types/pdf.d.ts` |
| `ggaction/svg` | `src/renderers/svg.js` | `types/svg.d.ts` |
| `ggaction/diagnostics` | `src/diagnostics.js` | `types/diagnostics.d.ts` |
| `ggaction/persistence` | `src/persistence.js` | `types/persistence.d.ts` |
| `ggaction/accessibility` | `src/accessibility.js` | `types/accessibility.d.ts` |
| `ggaction/inspection` | `src/inspection.js` | `types/inspection.d.ts` |
| `ggaction/scene` | `src/scene.js` | `types/scene.d.ts` |
| `ggaction/graph` | `src/graph.js` | `types/graph.d.ts` |
| `ggaction/interaction` | `src/interaction.js` | `types/interaction.d.ts` |

`ggaction-mcp`는 별도의 Node stdio executable이며 chart code를 실행하지 않는다.
검증 수치·과거 bundle 예산은 [기준 commit의 보존 기록](architecture/history/202b7afd-second-architecture.md)에서 확인한다.
현재 한도는 package/consumer/search 검사의 상수와 현재 실행 결과가 기준이다.
아래 설명에 남은 과거 checkpoint 수치를 현재 제한으로 해석하지 않는다.

## 명시 asset preparation 경계

Image와 font의 bytes/hash/host callback 준비는 `resources/assetPreparation.js`가 공유하며,
abort와 callback lifetime은 core의 순수 host 경계가 소유한다. Image의 closed request와 embedded
payload/static SVG 검증은 grammar에 있어 persistence와 renderers가 loader를 import하지 않는다.
Full image resource preparation은 exact original receiver/token에 묶인 private WeakMap handle을
반환한다. 동기 wrapped create/replace action은 authored snapshot을 쓰고 image consumers를 명시적으로
materialize한다. Callback, decoder object, signal은 semantic/graphic state나 trace에 저장하지 않는다.

Image mark는 dataset 없는 단일 resource item이며 typed resource lineage를 사용한다. Shared selection
policy의 resourceBacked capability가 데이터 조회를 분리하고 existing selector/inspection/scene가 같은
concrete item을 소비한다. Image ref/alt는 semantic layer, fit/viewport/align/opacity/extra clip은 materialization
config, resolved rectangle/clip/embedded payload는 graphicSpec만 소유한다. Facet/repeat의 data anchor에는
image overlay를 포함하지 않으며 자식 plot마다 같은 resource 의미를 명시 rematerialize한다.

Canvas renderer preparation은 graphicSpec만 읽어 content hash별 decoded backend image를 private handle에
보유한다. SVG는 embedded data URI, PNG/PDF는 native byte decoder를 사용하며 renderer fetch는 없다.
Canvas scene preparation과 rendering은 하나의 concrete compiler를 공유한다. Mutable scene은 own-data
content digest가 바뀌면 새 compiled snapshot을 만들고 이전 preparation을 context 변경 전에 거부한다.
Font의 public resource 연결과 최종 export bundle은 별도 단계다. 정확 API와 한도는 Current 및 rendering
reference가 소유한다.

## Private builtin resource validation

Edge route의 공통 계산은 `grammar/graph/routes/`에 있다. 기존 graph model과 원 typed
key 순서, 명시 node anchor를 검증해 독립 work buffer를 만들고 완료 vector만 원 edge 순서로
반환한다. Full registry의 `edge-route` handler는 exact graph/layout/hierarchy refs와 완료
hash/shape/provenance를 검증하며 restore에서 solver를 실행하지 않는다. GraphPlot는 선택한
route의 원 edge identity를 유지하고 concrete path만 materialize한다. Renderer는 기존 path를
그대로 읽는다. 공개 API·수치 정책의 정본은 [Edge Routes](contract/current/EDGE_ROUTES.md)다.

`ggaction/graph`는 순수 job compute와 명시 executor/preparation을 제공한다. Executor 인스턴스만
bounded cache/worker/abort 수명을 소유하고 exact receiver/token의 private prepared handle을
동기 domain action이 소비한다. Callback이나 worker는 저장 상태·trace·renderer로 전달하지 않는다.
Graph/H/layout/data source revision은 final resource 후보를 먼저 검증한 뒤 소비 plot union을 한 번
materialize한다. Canvas의 Full-only resource revision adapter는 prospective plot bounds에 대한
screen routes를 먼저 검산하고 기존 private final-envelope proof로 새 refs를 원자적으로 적용한다.
Basic Canvas는 solver를 import하지 않는다. World routes의 결과는 Canvas 크기 변화에 유지한다.

아래 package 수치는 공개 연결 이전 private checkpoint의 보존 기록이다.
Theme 통합 기준과 이 private kernel의 합산 package는 927 entries/6,105,931 unpacked bytes,
Node20/22/24 packed 최대1,331,298 bytes다. 상한은927/1,332,000/6,106,000으로 최소 올림한다.
동일 tar의 합산 theme baseline bundle은 Full660,081/Basic369,582 gzip bytes로, 상한을
661,000/370,000으로 맞춘다. Route kernel은 아직 public entry에서 import되지 않는다.
Hierarchy bundling은 같은 private boundary에서 기존 hierarchy model·명시 node mapping·layout
anchor를 소비한다. `routes/spline.js`가 de Boor와 knot-span cubic 변환을 맡고 기존
`pathGeometry`의 convex-hull 분할에 호출별 point budget을 전달한다. Partial geometry는 완료
결과로 반환하지 않는다. 이후 HEB 합산 package는929 entries/6,117,831 unpacked bytes,
packed 최대1,334,664 bytes로 상한929/1,335,000/6,118,000을 적용한다.
Force compatibility와 고정 double-buffer schedule은 같은 private route owner에 추가됐다.
공개 entry import는 없으며 package만931 entries/6,126,103 unpacked/최대1,337,161 packed
bytes로 증가해 상한931/1,338,000/6,127,000을 적용한다. Browser bundle 입력은 이전 HEB와 같다.
Density 계산은 sparse field와 direction channels를 `routes/densityField.js`, 고정 iteration
및 point-buffer 수명을 `routes/density.js`가 소유한다. Dense grid 차분과 같은 값을 계산하고
완료 vector만 반환한다. 합산 package933 entries/6,135,655 unpacked/최대1,339,858 packed
bytes에 최소 상한933/1,340,000/6,136,000을 적용하며 public bundle 입력은 유지한다.
`routes/shortestPath.js`는 bounded Dijkstra와 full edge-key sequence tie를, `routes/edgePath.js`는
기하 cost 우선순위·skip/lock·stretch·convex corner smoothing을 소유한다. Semantic weight와
graph topology는 바꾸지 않는다. 이 두 owner를 포함한 package935 entries/6,145,064 unpacked/
최대1,342,662 packed bytes에 상한935/1,343,000/6,146,000을 적용한다.
Calendar/selection 통합 afc4e34e6 이후 동일 private route source의 합산 package는939 entries,
6,164,691 unpacked/최대1,347,343 packed bytes다. 상한939/1,348,000/6,165,000을 적용하며
통합 main의 Full663,000/Basic371,000 gzip 상한을 유지한다.

Route 공개 연결용 private job은 `grammar/graph/routes/job.js`가 exact revision vector와
해석된 intent, viewport, 입력·완료 해시를 결박한다. `materialization/graph/routeInput.js`는
source의 typed key 순위를 읽어 opaque normalized key를 해독하지 않고 worker 입력으로
내린다. `routes/result.js`와 `resultProvenance.js`는 solver 재실행 없이 완료 vector, 원 edge
순서, endpoint, bounds, method provenance/schedule을 검증한다. 이 private checkpoint 당시에는 public entry에서
도달하지 않았으며 네 solver 자체의 숫자 정책은 각 기존 owner를 공유한다. 이 private 추가의
package는944 entries,6,191,389 unpacked이며 Node20/24 packed1,354,281,
Node22 packed1,351,738 bytes다. 기존 공개 번들은 영향이 없어 합산 기준 증거를 재사용한다.

승인된 Full-only hierarchy/layout/image 연결을 위해 `materialization/resourceKinds.js`가 exact
program constructor별 검증 handler를 한 번 등록한다. 복사한 null-prototype record와 handler를
freeze하며 상위 constructor의 권한을 상속하지 않는다. Public plugin 또는 renderer registry가 아니다.
공통 resource owner는 envelope·typed refs·graph를 먼저 검사하고 등록 owner의 저장값 및 binding
검증만 호출한다. Plain preview는 원래 constructor를 명시하며, 미등록 class/Basic는 추가 kind를
거부한다. Persistence도 실제 복원 constructor의 같은 경계를 사용하고 계산을 실행하지 않는다.
Full assembly는 image, hierarchy, graph와 layout의 닫힌 handler를 등록하며 Basic에는 등록하지 않는다. `materialization/layoutState.js`는 단일 input.kind의 hierarchy/graph owner로 저장 검증을 전달한다. [구현 기록](impl/roadmap9/phase3/hierarchy/RESOURCE_KINDS.md)이 초기 승인·검증과 연결 경계를 보존한다. Contour는 같은 Full registry의 geometry handler를 사용한다.
`grammar/contour/`는 명시 grid 및 density와 결정적 level/band geometry를 계산하고,
`materialization/contour/state.js`는 동일한 bounded 계산으로 stored grid/source/holes 정합성만 검산한다.
결과를 복원 시 덮어쓰거나 graphic을 만들지 않는다. `actions/contours/`는 resource revision 후
shared scale union과 mark/guide closure를 명시 실행한다. `materialization/contour/plot.js`의
compound path는 기존 renderer의 유일한 입력이다. 정확한 값과 lifecycle은
[등고선 계약](contract/current/CONTOURS.md)이 소유한다.
Calendar의 civil-day cell 계산은 기존 날짜 파싱·시간대·day-domain owner를 재사용한다.
`grammar/gridBoundary.js`는 Contour와 Calendar month cell union의 공통 directed-edge
소거·ring 연결·hole 분류를 소유하며 pixel frame이나 프로그램 상태를 읽지 않는다.

이 owner1개를 더한 지원 Node20/22/24 staging은739entries, packed최대1,098,083,
unpacked5,056,470bytes여서 package 한도만739/1,099,000/5,057,000으로 최소 조정했다.
Full/Basic/SVG browser gzip최대535,560/313,517/8,185는 기존 한도 안이며 그대로 유지한다.

Typed layer binding의 닫힌 경로(`image`, `hierarchyBinding.layout`, `graphBinding.layout`)는
`core/resourceReferences.js`가 수집과 immutable rebind를 함께 소유한다. 공통 exact ref shape는
`core/resourceReference.js`에 두어 core 수집기와 grammar/materialization이 같은 kind vocabulary를
사용한다. Primitive resource replacement는 해당 리소스 revision과 live layer reference를 같은
semantic candidate에서 갱신하고, generic graph validation은 handler보다 먼저 exact kind/revision을
검사한다. 실제 그래픽 재생성은 계속 domain action의 책임이다. 삭제 계획은 live mark 참조가
남으면 거부하며, public cascade owner가 필요한 mark 제거를 명시적으로 먼저 수행한다.
Persistence는 이 typed reference도 공통 stored-resource selector로 확인한다.

의존 resource result를 함께 바꿔야 하는 쓰기는 private
`actions/primitives/preparedResourceContext.js`가 exact receiver와 exact primitive args에만
precomputed 결과를 결박한다. 중첩/실패/정상 종료마다 권한을 복원하거나 제거하며, primitive는
허용된 원인 관계와 options 불변·next revision vector를 검증한 최종 resource envelope만 적용한다.
DATA의 parameter→source 결과와 hierarchy/graph→layout 결과가 같은 경계를 공유하되 kind별 검증은
등록 validator에 남는다. `actions/data/resourceRevision.js`는 exact constructor별 한 번 등록한
도메인 갱신 함수로 data-backed resource의 재계산을 위임한다. 등록된 kind는 generic data-ref
치환에서 제외하고 같은 revision plan의 명시 domain action으로 갱신한다. Basic 또는 미등록 class는
등록 함수를 상속하지 않으며 자동 compiler나 public registry는 없다.


Typed binding checkpoint는 같은 staging을 Node20/22/24에서 측정해739entries,
packed최대1,098,660/unpacked5,059,006bytes다. 기존 packed 한도를 유지하고 unpacked 한도만
최소1,000byte 단위인5,060,000으로 조정했다. 동일 minified browser bytes의 최대gzip은
Full535,875/Basic313,870/SVG8,185로 기존 한도 안이다.

## Hierarchy normalization and explicit materialization

`grammar/hierarchy/normalize.js`는 명시 node records의 typed identity, parent/children topology,
iterative preorder/postorder와 세 가지 value aggregation을 한 번 검증하는 pure owner다.
기존 `core/itemIdentity`, own-data boundary, finite sum과 work limit을 재사용하며 source-row 참조를
자손별 복사로 증폭하지 않는다. `grammar/hierarchy/input.js`가 flat/nested/group-path 입력을 같은
경계로 낮추고, 입력 확장 비용도 공통 work 한도에 합산한다. `grammar/hierarchy/model.js`는
이 결과의 canonical preorder·reference·value 일관성을 검증하고 layout용 index를 만든다.
`grammar/hierarchy/tree.js`는 그 순서를 그대로 소비하여 persistent contour로 tidy 좌표를 계산하고,
가로 전치와 기존 polar owner를 통한 방사형 변환을 수행한다. Node size·gap·orientation은 명시 입력이다.
`grammar/hierarchy/partition.js`도 같은 model 경계를 소비하여 depth와 정규화 구간·reserved residual tail을 만든다.
계층의 합계와 prefix는 기존 numeric owner의 명시 compensated 정책을 공유하며 기존 호출 기본 계산은 유지한다.
`grammar/hierarchy/treemap.js`는 같은 model에서 slice-dice/squarify rectangle을 계산하고,
padding을 뺀 content와 own-value reserved rectangle을 분리해 보존한다.
`grammar/hierarchy/order.js`는 명시 input/value/key/field 순서를 공통 model에 반영한다. Key는 기존 typed
identity comparator, field는 기존 sort transform 정책을 재사용하며 원본 field 해결은 semantic caller의 책임이다.
`materialization/hierarchy/resources.js`는 입력 dataset의 exact revision과 실제 row membership을
hierarchy resource에 보존하고, layout resource는 정확히 하나의 hierarchy 입력을 참조한다.
`actions/hierarchy/resources.js`는 source 수정과 명시 layout 편집에서 필요한 수치 결과를 먼저
계산·검증하고 primitive를 통해 교체한다. `materialization/hierarchy/state.js`는 복원 시 저장된
topology·value·좌표·binding을 검사하며 layout 알고리즘을 다시 실행하지 않는다.
Tree/treemap facade는 `materialization/hierarchy/plot.js`의 concrete link/node/label 결과를
wrapped materialize action으로 기록한다. Renderer는 기존 path/circle/rect/text만 소비한다.
Node selection은 layout resource lineage와 실제 원본 row membership을 공유하고, label override는
typed node key에 결박되어 원본 노드가 사라질 때 orphan 진단을 남긴다. Data revision과 facet source
replacement는 같은 명시 hierarchy→layout→plot closure를 사용한다. 자세한 공개 계약은
[HIERARCHY](contract/current/HIERARCHY.md)가 소유한다.
상세 범위·후속 의무와 실측 package 증거는 [normalizer](impl/roadmap9/phase3/hierarchy/NORMALIZE_KERNEL.md)와
[input adapter](impl/roadmap9/phase3/hierarchy/INPUT_KERNEL.md), [tree 계산](impl/roadmap9/phase3/hierarchy/TREE_KERNEL.md),
[partition 계산](impl/roadmap9/phase3/hierarchy/PARTITION_KERNEL.md), [treemap 계산](impl/roadmap9/phase3/hierarchy/TREEMAP_KERNEL.md),
[sibling 정렬](impl/roadmap9/phase3/hierarchy/ORDER_KERNEL.md) 기록이 소유한다.
Inclusive model 검증은 normalizer가 저장한 차액 식을 그대로 검사하여 역연산 반올림으로 유효 값을 거부하지 않는다.
이 검증 보수의 package 실측4,908,179bytes가 기존 unpacked4,908,000을179bytes 초과해 최소1,000byte 단위
4,909,000으로 조정했다. Entry710/packed1,061,000와 browser 한도는 유지하며 상세 재현·검증은
[inclusive model 감사](impl/roadmap9/phase3/hierarchy/INCLUSIVE_VALIDATION.md)에 둔다.
이어진 own-data 경계 보수는 hierarchy의 required fields와 optional maxNodes/synthetic 읽기를 검사하고
필수 차원 배열의 arity를 descriptor 검사 전에 제한한다. Public/import/renderer 경계는 그대로이며
unpacked 실측4,909,964bytes에 맞춰 cap만4,910,000으로 조정했다.
[입력 검증 감사](impl/roadmap9/phase3/hierarchy/OWN_DATA_VALIDATION.md)가 반례와 coverage 증거를 소유한다.

## Private observed graph normalization

`grammar/graph/normalize.js`는 명시 node/edge records의 raw typed key를 기존 identity owner로 한 번
정규화한다. Caller가 이미 보관한 occurrence key를 받으며 row index로 edge identity를 추정하지 않는다.
`grammar/graph/model.js`는 opaque node/edge key, endpoint·direction·origin·source membership과
bounded plain-data attributes를 검증하고 stable incoming/outgoing/weak-neighbor adjacency를 만든다.
Layout 소비자는 같은 model owner로 저장 adjacency의 일관성을 확인하며 topology를 다시 추론하지 않는다.
`grammar/graph/layout.js`는 opaque key에 명시한 fixed 좌표 또는 stable model 순서의 circular 좌표만 만든다.
Circular 계산은 기존 polarToCartesian의 clockwise degree owner를 사용하며 model과 layout work를 합산한다.
`grammar/graph/force.js`는 같은 model의 weak component를 읽어 seeded exact pair repulsion과 edge spring을
고정 횟수로 계산하며, pin을 보존하는 horizontal component packing을 수행한다. Public resource/action과
renderer는 다음 통합 경계다. 수치·검증·실측 package 경계는
[fixed/circular private checkpoint](impl/roadmap9/phase3/graph/LAYOUT_KERNEL.md)와
[force checkpoint](impl/roadmap9/phase3/graph/FORCE_KERNEL.md)가 소유한다.
`grammar/graph/fields.js`는 명시 열·복합 key·metric별 feature 읽기를,
`grammar/graph/input.js`는 관측 table과 여섯 inference rule을 동일한 model로 낮추는
순수 adapter를 소유한다. 관측 parallel edge는 caller가 전달한 persisted row key 또는
명시 edgeKey만 사용하며 행 위치는 lineage로만 남긴다. Inference owner의 진단·전처리·검색
증거를 그대로 반환하고 node/edge sourceRows는 원본 행 위치를 유지한다.
관측 입력은 Full의 `actions/graphs/resources.js`에서 명시 dataset selector와 결합한다.
`materialization/graph/resources.js`가 exact input 역할·model·row provenance를 만들고,
`materialization/graph/state.js`는 Full constructor에 등록되어 저장 구조와 실제 source binding을
검증한다. DATA revision owner는 등록된 graph 갱신 함수를 명시적으로 호출한다. Basic과 renderer는
graph resource를 읽지 않으며 automatic compiler는 없다. `createGraphData.target`은 endpoint 열이므로
기존 unit-local creation dispatch를 사용한다. 수정 target은 별도의 resource selector다.
Full의 graph layout과 plot은 같은 typed resource 경계를 사용한다. `actions/graphs/layouts.js`가 변경될 graph→inferred graph→layout→plot closure를 먼저 계산·검증한 뒤 wrapped semantic replacement와 plot materialization을 명시 호출한다.
`materialization/graph/geometry.js`는 finite cubic route·parallel offset·self-loop·endpoint trimming을, plot owner는 concrete circle/path/text·paint·source-row identity를 소유한다. 공통 selection policy는 node와 edge를 별도 logical item으로 유지하며 arrow/label을 같은 item에 결박한다. Renderer는 기존 concrete primitives만 읽는다. Inference는 Full의 `actions/graphs/inference.js`가 명시적으로 호출한다. 입력 dataset과 선택 candidate graph의 typed revision을 저장하며, source 갱신은 공통 resource DAG 순서로 각 graph/layout을 한 번씩 갱신한다.
`materialization/graph/inferredState.js`는 저장 model·source binding·진단의 정합성을 검사하며 pair search나 spanning solver를 재실행하지 않는다. Prepared resource context는 exact receiver/primitive argument에만 graph와 data-reference 교체 권한을 결박하고 작업 종료 때 제거한다.
정확한 공개·저장 계약은 [GRAPHS.md](contract/current/GRAPHS.md)가 소유한다.
상세 경계·남은 의무·실측 증거는 [graph model 기록](impl/roadmap9/phase3/graph/NORMALIZE_KERNEL.md)이 소유한다.

## Partition view, mapping and frame preparation

`grammar/hierarchy/partitionView.js`는 위의 model/partition owner를 명시 호출하여 focus 구간과 상대 depth view,
nearest surviving ancestor와 navigation metadata를 계산한다. Canonical key/value/interval owner를 복제하거나 원 hierarchy를 변경하지 않는다.
`partitionMapping.js`는 normalized cell을 Cartesian/polar geometry로 매핑하고 pixel gap과 radial policy를 소유한다.
`actions/hierarchy/partition.js`는 저장된 layout 결과에서 이 view를 투영하고,
`materialization/hierarchy/partitionPlot.js`는 기존 rect/path/text와 공통 FillPaint owner로 concrete 출력을 만든다.
Focus·root visibility는 semantic layer, mapping·paint는 materialization config에 남는다.
Source revision의 명시 hierarchy closure가 focus 복구와 selection pruning을 함께 사전 검증한다.
자세한 공개 계약은 [PARTITION](contract/current/PARTITION.md)이 소유한다.

`partitionBend.js`의 canonical 수치를 `partitionAdapter.js`가 screen orientation으로 변환한다.
Private `materialization/hierarchy/partitionFrames.js`는 native endpoint graphics를 그대로 보존하고,
compatible 중간 frame의 path와 같은 concrete path 기반 hit를 만든다. 퇴화하는 반사나 topology/appearance 변화는
이유를 기록한 crossfade를 사용한다. 새 공개 animation 상태·renderer 계산 경로는 없다.
AT65의 public planner/controller/player 연결은 [구현 기록](impl/roadmap9/chart/partition-plots.md)의 후행 의무다.

## 내부 expression kernel 경계

`grammar/expressionAst.js`는 versioned AST의 정규화·정적 검사·명시 dependency 추출,
`expressionFunctions.js`는 닫힌 standard@1 등록표·함수 계산, `expressionEvaluate.js`는
행별 지연 평가·진단, `expressionValues.js`는 타입·자원 한도를 소유한다.
모두 pure이며 명시 fields/parameters environment만 받아 immutable 결과를 반환한다.
`core/ownData.js`는 descriptor 검증을 공유하고 action summary는 getter를 호출하지 않는다.
`grammar/transformInput.js`는 dispatch 전 transform 배열 검증을 Full/Basic에서 공유하며
큰 transform policy 모듈을 Basic 입력 경계로 끌어오지 않는다.
이 pure kernel은 공개 computed v2, where filter, conditional encoding, parameter와 prepared data source의
명시 계산에서 재사용한다. 공개 연결과 저장 검증 경계는 아래 각 domain integration 절이 소유한다.
Renderer는 AST를 읽거나 평가하지 않으며 기존 computed v1의 의미와 명시 materialization을 유지한다.
상세 내부 계약은 [expression core](architecture/EXPRESSION_CORE.md), 공개 computed는
[CORE](contract/current/CORE.md), action trace는 [PRIMITIVES](contract/current/PRIMITIVES.md)가 소유한다.

## 공유 색상 계산 경계

`grammar/color.js`는 host-independent 색상 채널과 HSL 변환을 공유한다. Continuous scale은 기존
입력 정책을 명시적으로 사용하여 accepted syntax와 결과를 유지하고, 승인된 structured paint/effect
준비는 닫힌 RGBA parser를 사용한다. 새 parser는 아직 public fill/schema에 연결하지 않았으며 state,
resource 또는 renderer 경계는 그대로다. 정확한 내부 범위와 검증은
[paint 색상 준비](impl/roadmap9/phase4/paints/COLOR_FOUNDATION.md)에 기록한다.

## 내부 pattern kernel 경계

`grammar/patterns.js`는 닫힌 pattern 옵션과 phase/origin의 순수 정규화 및 bounded unit tile
geometry를 소유한다. Polygon/circle contour는 한 nonzero compound fill로 낮추도록 정의하며,
물리적 pitch 적용과 tile/mark clip, opacity 합성은 후속 materialization·renderer의 책임이다.
색 문자열의 검사는 기존 `grammar/paint.js`를 재사용한다. 현재 private kernel은 public paint,
stored graphic schema, action 또는 renderer에 연결하지 않았으며 별도 registry를 만들지 않는다.
숫자·방향·경계 증거는 capability test `test/unit/grammar/patterns.test.js`가 소유한다.

## 내부 graph metric 계산 경계

`grammar/graph/metricPolicy.js`는 metric과 입력 vector의 닫힌 정규형,
`metrics.js`는 거리·유사도 계산, `preprocess.js`는 결측 정책과 수치 전처리 통계,
`edgeIdentity.js`는 명시 rule/typed endpoint에서 inferred edge identity를 만드는 순수 owner다.
기존 typed item identity, descriptor 검사, finite sum과 자원 한도를 공유한다.
이 owner들은 명시 입력만 받고 frozen 결과를 반환하며, 공개 entry나 ChartProgram state,
materialization 또는 renderer에 연결하지 않았다. Field 추출은 위 input adapter가 소유하고 graph resource와 kNN/threshold
토폴로지의 공개 통합은 별도 domain owner의 남은 작업이다. `neighbors.js`는 정규화된 feature에서
kNN/radius/similarity의 exact pair를 고르고 raw source index와 stable endpoint identity를 반환한다.
`search.js`는 명시 exact KD-tree 또는 radius grid 후보만 줄이며 metric, typed tie와 edge ordering은
기존 owner를 공유한다. 계산량과 output 한도는 후보 탐색 중에도 누적 검사한다. 기본 brute-force를
유지하며 가속 경로를 명시한 경우에만 algorithm/version/실제 distance 횟수를 결과에 기록한다.
`approximate.js`는 명시 opt-in kNN의 seeded projection forest 후보를 기존 exact metric으로 재정렬하고,
같은 호출의 exhaustive holdout으로 recall을 측정한다. 명시 threshold 미달은 결과를 반환하지 않는다.
Candidate 부족 시 error/exact fallback 정책과 원본 source index, seed·resolved preset·후보 수를 보존한다.
`random.js`는 force layout과 search가 공유하는 고정 uint32 생성기이며 각 algorithm version은 각 owner에 남는다.
`spanning.js`는 같은 metric preparation으로 complete graph 또는 명시 weighted candidate에서
deterministic Kruskal tree/forest와 component/cost를 계산한다. `structural.js`는 같은 typed key와
grouping identity owner를 사용해 group clique/star 및 grouped sequence lag/maxGap 연결을 만든다.
Explicit hub와 missing 정책을 보존하며 metric을 요구하지 않는다. 원격 자원이나 layout을 해석하지 않는다.
공통 graph model이나 source row provenance를 중복 생성하지 않으며 domain adapter가 이를 연결한다. 검증 범위는
[metric kernel checkpoint](impl/roadmap9/phase3/graph/METRICS_KERNEL.md)에 기록한다.

## Pivot data lifecycle

`grammar/pivot.js`는 명시 typed columns와 group tuple을 받아 수치 cell을 계산하는 pure owner다.
열 추론은 별도 normalize 호출에서 끝나고 derive는 저장할 정규형만 소비한다. Shared own-data validation,
typed scalar identity, finite aggregate와 generated/work limit 정책을 재사용한다. Full의 `createPivotData`가
관측 columns를 한 번 정규화하고 `createDerivedData`→`materializePivotData` child로 계산을 명시 호출한다.
`editPivotData`는 기존 immutable revision plan과 typed-column output role을 사용한다. Group row grain과
실제 source row lineage, 빈 numeric schema를 기존 dataset owner가 저장한다. Facet은 source partition을
재계산하며 repeat의 statistical restriction은 유지한다. Basic은 direct/generic pivot 모두 지원하지 않는다.
Persistence는 저장 정의/source schema/lineage를 검증하고 rows/graphics를 재계산하지 않고 복원한다.
새 state/resource/renderer 종류는 없다. 정확한 공개 계약은 [CORE](contract/current/CORE.md#createpivotdata),
검증과 통합 범위는 [public checkpoint](impl/roadmap9/phase3/statistics/PIVOT_PUBLIC.md)가 소유한다.
아래 수치는 [private 준비 checkpoint](impl/roadmap9/phase3/statistics/PIVOT_KERNEL.md)의 보존 기록이다.

이 독립 checkpoint는 기준 `8685719f`에 private module 한 개를 더한다. Node22.23.1/npm10.9.8의 공식
staging 실측은 679entries, 1,011,694packed, 4,719,770unpacked bytes다. 이전 678entries 및
1,010,000/4,713,000bytes 한도는 통과하지 못했다. 모듈 수와 최소1,000bytes 올림에 맞춰
679entries 및 1,012,000/4,720,000bytes로만 변경했다. Full/Basic gzip은 기존과 같은
507,597/285,702bytes로 508,000/286,000 한도를 유지한다. 이 수치는 해당 기준 branch의 측정이며
다른 통합 checkpoint의 누적 한도를 대체하지 않는다.

Public action owner 한 개와 declarations/descriptors를 연결한 독립 branch 실측은683entries,
1,015,469packed/4,735,980unpacked bytes다. 이전682/1,014,000/4,727,000을 초과해
683/1,016,000/4,736,000으로 최소 조정한다. 설치 Full gzip509,064는508,000을 초과해510,000으로
올리고 Basic285,851 및 SVG는 기존286,000/25,000 한도를 유지한다. 정확 action2개와 설명을 더한
search index857,741bytes는857,000을 초과해858,000으로만 조정한다. 모든 값은 main 통합 때 재측정한다.

## LOESS local quadratic integration

`grammar/regression/localQuadratic.js`는 이미 선택한 이웃의 x/y와 최종 weight만 받아 local quadratic
prediction을 계산한다. Coordinate/response/weight scale을 정규화하고 singular local design은 동일 이웃의
weighted constant mean으로 처리한다. 이웃 선택과 all-zero robust weight fallback은 기존 LOESS owner에 남는다.
기존 polynomial의 partial-pivot linear solve와1e-12 rank 판정을 `regression/linearSystem.js`로 옮겨 공유하며,
polynomial의 오류와 연산 순서 및 기존 LOESS local-linear 코드는 유지한다. 기존 공통 regression parameter
owner가 공개 degree1/2를 정규화하며 기존 fit/robust/prediction 경로에서 degree2만 quadratic kernel로 dispatch한다.
이웃 수는 fit과 work preflight가 같은 policy를 소비하고 모든 group의 추가 계산을 누적한다.
새 action, materialization owner 또는 renderer 분기는 없다. 정확한 동작은 Current CORE와 STATISTICS가 소유한다.
Private 준비 재현은 [private checkpoint](impl/roadmap9/phase3/statistics/LOCAL_QUADRATIC.md),
공개 lifecycle 검증과 남은 범위는 [public checkpoint](impl/roadmap9/phase3/statistics/LOESS_PUBLIC.md)가 기록한다.

Pivot 준비 이후 private math owner2개를 더한 당시 Node22.23.1/npm10.9.8 staging 실측은681entries,
1,012,717packed, 4,722,952unpacked bytes다. 이전679entries/1,012,000/4,720,000 한도를 넘으므로
최소681entries/1,013,000/4,723,000으로 변경했다. Full gzip507,618, Basic285,702bytes는 기존
508,000/286,000 한도를 유지한다. 이 역시 독립 branch의 누적 측정이며 main 통합 시 다시 실측한다.

공개 LOESS degree2 연결 뒤 동일 branch의 실측은683entries, 1,015,796packed/4,737,028unpacked bytes다.
기존683entries와1,016,000packed 한도를 유지하며 unpacked만4,736,000을 넘어서4,738,000으로 최소 조정했다.
설치 Full/Basic/SVG gzip509,588/285,851/8,111과 search857,752bytes는 기존 한도 안이다.
이 값도 main의 다른 승인 변경을 통합한 뒤 누적 실측을 대체하지 않는다.

## Civil-day completion integration

`grammar/calendarDay.js`는 명시 day/start/end/timeZone을 받아 inclusive civil-day domain을 만드는 pure owner다.
Strict lexical guard 뒤 기존 `parseTimeValue`로 Gregorian 날짜를 검증하고 `setUTCDate`로 civil date를 증가시킨다.
각 IANA 경계는 기존 `resolveCalendarBoundary`와 `calendarParts`를 재사용한다. Day instant에 고정24시간을
더하지 않으며 존재하지 않는 civil date는 오류다. 기존 resolver의 probe 범위와 간격에 이름을 붙여 최대
roundtrip 작업량50을 같은 owner에서 공유한다. General time-unit의 연산과 결과는 바꾸지 않았다.
새 domain은 최대10,000일이며 Intl 작업과 output allocation 전에 공통 generated/work 한도를 확인한다.
Full의 기존 complete transform이 이 owner의 domain과 count/work estimate를 소비한다.
Values/sequence/calendar의 authored domain은 기존 transform 한 곳에 저장하며 expanded domain은 저장하지 않는다.
기존 explicit data materializer와 row lineage가 각각 pure completion을 호출하므로 calendar work preflight는
두 계산과 입력 검증·group/output cells의 누적 비용을 예약한다. Generic primitive에 새 계산을 넣지 않는다.
Schema owner는 빈 grouped 결과에도 numeric key와 fill/members fields를 유지한다. Renderer와 resource/state 경계는 그대로다.
정확한 공개 계약은 [Current CORE](contract/current/CORE.md#createcompletedata), 초기 pure 검증은
[private checkpoint](impl/roadmap9/phase3/calendar/CALENDAR_DAY_KERNEL.md), 공개 lifecycle과 남은 범위는
[public checkpoint](impl/roadmap9/phase3/calendar/CALENDAR_PUBLIC.md)가 소유한다.

새 pure module 한 개를 더한 Node22.23.1/npm10.9.8 공식 staging 실측은682entries,
1,013,735packed, 4,726,245unpacked bytes다. 이전681entries/1,013,000/4,723,000을 초과해
최소682entries/1,014,000/4,727,000으로만 변경했다. 이 수치는 독립 branch의 누적 측정이며
main integration의 package 증거를 대체하지 않는다. 설치 Full/Basic gzip507,597/285,702bytes는
기존508,000/286,000 한도 안이다.

공개 calendar 연결의 Node22.23.1/npm10.9.8 누적 실측은683entries/1,016,672packed/4,741,042unpacked bytes다.
기존 entry cap683은 유지하고 byte caps만1,017,000/4,742,000으로 올렸다. Full/Basic gzip510,544/287,705는
최소1,000byte 경계511,000/288,000으로 갱신했다. Basic 증가는 shared lineage import graph 비용이며
Basic의 direct/generic complete 미지원 경계를 바꾸지 않는다. Search858,646bytes는859,000 cap으로 갱신했다.

## 범례 항목 이동 소유권

범례 항목의 독립 이동 의도는 기존 `guideConfigs.legend`가 소유하고,
`grammar/legendItemsOffset.js`가 검증한다. `materialization/legendItemsOffset.js`는
guide 배치 전에 이동 전 concrete 상태를 복구하고, 최종 배치 뒤 항목 paint에만 이동을
적용한다. 복구용 `materializationConfigs.legendItemsPaint`는 파생 상태이며,
공유 범례의 배치 기준과 최종 occupied bounds를 분리하여 제목 위치를 보존한다.
Renderer는 기존 concrete graphics만 소비한다. 정확한 공개 계약은
[Legend and title](contract/current/LEGEND_AND_TITLE.md)이 소유한다.
독립 grammar/materialization module 2개에 맞춰 package entry 한도만 647에서 649로
변경하고 byte 한도는 유지한다.

## 범례 요약 행 정책

`grammar/legendOverflow.js`가 categorical/size authoring과 저장 복원의 overflow 검증을
공유한다. 기존 categorical materializer가 표시 domain view에만 선택적 summary sample을
포함하며 원래 scale/data/domain을 유지한다. Renderer와 저장 상태 소유권은 바뀌지 않는다.
정확한 공개 계약은 [Legend and title](contract/current/LEGEND_AND_TITLE.md)이 소유한다.

## Content facet 배치 소유권

`core/facetAxisPolicy.js`가 생성·편집·저장 복원에서 공유하는 channel 정책을 검증한다.
`materialization/facetContentBounds.js`는 실제 retained graphic을 측정하고 기존 순수
content-flow layout kernel에 전달한다. 공통 bottom footer는 부모 Canvas에 materialize하여
child viewport clipping과 분리한다. Renderer와 semantic/graphic 경계는 유지한다.
공개 옵션은 [composition 계약](contract/current/COMPOSITION.md)이 소유한다.

Facet의 가로·세로 간격은 기존 `compositionSpec.gap` 한 곳에 숫자 또는 닫힌 `{x,y}`로
보존한다. 순수 `core/facetGap.js`가 생성·편집·grid/content 배치·저장 복원의 검증을
공유하며, 각 materializer는 해결된 축별 간격을 사용한다. Concat은 숫자 계약을 유지하고
renderer/state 경계는 바뀌지 않는다. 정확한 값 계약은 current COMPOSITION이 소유한다.

## 문서의 위치

> 과거 checkpoint 수치 포함. 현재 한도는 실행 검사에서 확인한다.

승인된 Cartesian guide dash는 순수 `grammar/guideDash.js`가 uniform pattern과 typed
override map의 검증·정규화를 소유한다. 기존 tick/grid action이 값별 concrete line paint를
명시적으로 materialize하며 renderer/state boundary는 바뀌지 않는다. 이 shared module로
package entry 한도는567→568이다. Staging compaction 후 실제797471packed/
3911785unpacked bytes이며 packed798000 한도는 유지한다. Unpacked3908000을 초과해
기존 최소1000bytes 단위 정책으로3912000으로만 조정했다. 이전 entry/unpacked
한도를 통과했다고 보고하지 않는다. 정확한 옵션은 current AXES/GRID 계약이 소유한다.
검색 payload는 typed dash 옵션과 공개 예제를 모두 유지한814283bytes로 기존814000을
초과하여 공유 search 한도만815000으로 갱신했다. 이전 search 한도 통과를 주장하지 않는다.

> 과거 checkpoint 수치 포함. 현재 한도는 실행 검사에서 확인한다.

승인된 Cartesian frame은 기존 guideConfigs.axis의 frame.offset 한 곳이 소유하며,
coordinateBounds의 axis 전용 resolver가 perpendicular plot frame을 해결한다. Marks와
grids는 원래 plot bounds를 소비한다. 순수 axisTextPlacement grammar가 local align/baseline,
signed title offset과 multiline 배치를 검증하고 기존 textLines materializer를 재사용한다.
새 module1개로 entry569, 실제798803packed/3918633unpacked bytes여서 최소1000bytes 단위
한도를799000/3919000으로 조정했다. 검색815236bytes는816000한도로 갱신하며 payload를
줄이지 않는다. 설치 consumer Basic gzip190093bytes가190000을 초과하여191000으로만
조정하고 Full393000/SVG25000은 유지한다. 이전 한도를 통과했다고 보고하지 않는다.
최종 compact action-card median은 승인된 축 옵션을 유지한1865bytes여서 기존1856을9bytes
초과한다. 해당 regression ceiling만 실측1865로 갱신하고 최대3360한도(실측3358)는 유지한다.

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

명시적 axis `format:"ticks"`는 기존 순수 tick grammar가 settled values별 fixed precision을 계산하고 기존 guide action이 문자열을 materialize한다. 저장 owner는 기존 axis label config이며 schema/renderer 경계는 바꾸지 않는다. 정확한 값·한도·재물질화는 current `AXES.md`가 소유한다.

## 핵심 결론

Gradient strip도 기존 rect completeness policy와 동일한 외형 materialization owner를 사용한다.
색상/불투명도/테두리는 canonical mark config와 encoding에서 읽고, facet plan이 해결한 scale은
다시 추론하지 않는다. 독립 density guide는 기존 gradientPlot.guides.legend가 소유하며 hue channel의
semantic legend slot을 점유하지 않는다. Side legend lane 이후 wrapped density guide materializer로
배치한다. Statistical reference는 source position scale을 재사용하여 순환 재계산을 막는다.
정확한 동작은 current/GRADIENT_PLOTS.md와 MARKS.md 계약 및 회귀 테스트가 소유한다.

> 과거 checkpoint 수치 포함. 현재 한도는 실행 검사에서 확인한다.

Point jitter의 `channel: "both"`도 기존 jitter policy 한 곳이 소유한다. 기존 단일 축 grammar를 x/y 각각 호출하고, 같은 wrapped point materializer가 두 concrete 좌표를 함께 갱신한다. Both의 resolved metadata만 축별 resolution을 `axes.x/y`로 묶으며 renderer나 semantic state 경계는 바뀌지 않는다.
Both와 아래 compact action vocabulary를 포함한 package entry는591이며 실측847924packed/4099551unpacked bytes다. 기존847000/4094000을 초과하여 최소1000bytes 단위인848000/4100000으로만 갱신한다.

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

Standalone Cartesian axis는 기존 guide.axis의 scale/coordinate binding을 data 없는 소비자로 사용한다.
Mark consumer 배열에 가짜 layer나 dataset을 넣지 않는다. Scale preview와 Canvas/coordinate/scale
rematerialization plan이 이 binding을 읽어 명시 domain·coordinate bounds로 축을 갱신한다.

Axis 전용 typography는 기존 theme frame의 partial token을 사용한다. 초기 축 layout 전에
active font 기본값을 읽고, theme 변경 시 기존 guide config와 concrete text bounds를 함께
갱신한다. Facet 초기 header 스타일은 기존 header config에 정규화하며 editor와 같은 검증을 사용한다.
Global typography의 role 기본값은 기존 family defaults와 wrapped Text 생성 의도에서 읽는다. Theme frame과
authored override 수집을 계속 재사용하며 별도 복원 snapshot이나 provenance history를 저장하지 않는다.

> 과거 checkpoint 수치 포함. 현재 한도는 실행 검사에서 확인한다.

병렬 배열 expansion은 기존 derived-data 계층을 사용한다. 순수 `grammar/flatten.js`가
index-aligned row/null padding과 한도를 소유하고, wrapped creator/materializer가 정규화한
`flatten` 정의·typed schema lineage·immutable values를 기존 dataset에 저장한다. Full의
derived revision/replay와 statistical facet topology가 같은 registry를 소비한다. Basic은
생성·materialization만 추가하며 편집 surface는 늘리지 않는다. Renderer와 자동 compiler
경계는 변하지 않는다. 정확한 공개 계약은 `contract/current/CORE.md`가 소유한다. 새 grammar/action module2개로
package entry는602→604다. 마지막 grammar 검증을 포함한 staging unpacked4129044bytes는
4129000을44bytes 초과하여 기존 최소1000단위 정책으로4130000까지 조정했다. Packed의
853242bytes 측정은854000, search의837668bytes 측정은838000한도로만 반영하며 이전
한도 통과를 주장하지 않는다. 정확한 최종 수치와 browser gzip은 설치 consumer evidence가
소유한다. Full gzip423024와 Basic209555bytes는 각각 이전 한도423000/209000을
24/555bytes 초과해 최소1000단위424000/210000으로 조정했다. SVG25000은 유지한다.

> 과거 checkpoint 수치 포함. 현재 한도는 실행 검사에서 확인한다.

Named-dataset lookup은 기존 derived-data 계층의 첫 명시적 이중 입력이다.
`core/datasetReferences.js`가 primary source와 lookup.data의 canonical reference path를 한 번
소유하고 resource cleanup/revision/persistence가 공유한다. `grammar/datasetDependencies.js`는
기존 unary DFS 순서를 보존하는 stable topological descendant 순서와 양쪽 ancestor 순서를
계산한다. `grammar/lookup.js`는 row-preserving typed key 계산과 한도를 소유한다.
wrapped data action은 두 schema/values를 preflight하고 기존 semantic primitive를 명시적으로
호출한다. typed schema는 양쪽 입력 lineage를 기록한다. Facet은 primary만 분할하고 reference
표는 보존하며, repeat는 직접 materialized lookup의 encoding만 바꾸도록 제한적으로 허용한다.
기존 semantic/graphic 분리, renderer와 자동 compiler 부재는 바뀌지 않는다. 정확한 값 계약은
`contract/current/CORE.md`가 소유한다. 새 shared reference/grammar/action module4개로
entry605→609다. Staging 실측861631packed/4160293unpacked bytes와 search846355bytes를
기존 최소1000단위862000/4161000/847000으로만 반영한다. 이전 한도 통과를 주장하지 않는다.
Full427506/Basic215605gzip bytes를 최소1000단위428000/216000으로 반영하며 SVG25000은 유지한다.
최종 archive와 browser gzip은 설치 consumer evidence가 소유한다.

> 과거 checkpoint 수치 포함. 현재 한도는 실행 검사에서 확인한다.

역할별 facet field title은 기존 `materializationConfigs.facets[id].headers` 소유자에
보존한다. 순수 `layout/facetHeaderTitles.js`가 전체 점유 plot 정렬과 기존 외곽 예약의
중복 제거를 소유한다. 기존 header materializer가 category 뒤 제목 text를 같은 collection에
명시적으로 추가하고 최종 facet materializer가 보존 text 충돌을 검사한다. renderer와
semantic 데이터 경계는 바뀌지 않는다. 정확한 옵션은 current COMPOSITION 계약이 소유한다.
새 순수 layout module 한 개로 entry609→610이다. Package staging4167062unpacked bytes와
863468packed bytes, search847333bytes, Full428792gzip bytes가 이전 한도를 초과했다.
기존 최소1000단위 정책으로4168000/864000/848000/429000으로만 조정하며 Basic216000,
SVG25000은 유지한다. 이전 한도 통과를 주장하지 않으며 최종 archive는 패키지 evidence가 소유한다.

> 과거 checkpoint 수치 포함. 현재 한도는 실행 검사에서 확인한다.

외형 encoding의 mark 지원 범위는 `core/vocabulary.js`가 소유하며 실제 action과 inspection이 함께 사용한다. Facet source action descriptor는 기존 retained semantic/config를 복원하여 기존 wrapped mark/guide materializer와 facet derivation을 호출한다. 새 renderer나 별도 source-state 복제본을 추가하지 않는다. 기존 vocabulary owner를 재사용하여 package entry는591을 유지한다. Rect 외형과 facet source action/inspection 확장의 실측846294packed/4093902unpacked bytes에 따라 최소1000byte 단위 ceiling을847000/4094000으로 갱신했다.
Facet source의 공개 action allowlist는 action-card 원본에서 생성한 `core/vocabulary.js`의 함수명 목록만 소비한다. 상세 inspection metadata는 inspection entry에 남겨 전체 authoring bundle에 불필요한 parameter table이 들어가지 않는다. Boundary 계약은 기존 계층 의존성을 유지하고 두 목록의 일치를 검사한다.
같은 Node23.5.0 환경에서 이전 HEAD의 설치 consumer gzip은 Full431416/Basic213742 bytes로 기존417000/205000 한도를 이미 초과했다. 현재는 Full421644/Basic213862 bytes이며 Full은9772bytes 감소했다. 실측을 숨기지 않고 해당 한도를 최소1000bytes 단위422000/214000으로 갱신하고 SVG25000은 유지한다.

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
├─ ggaction/persistence — immutable snapshot save/restore
├─ ggaction/accessibility — visual data for accessible host output
├─ ggaction/inspection — read-only program inspection
├─ ggaction/diagnostics — structured error details
├─ ggaction/scene — read-only scenes and native Canvas drawing
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

Basic의 기존 encoding 재할당은 같은 타입의 scale에 한해 Full과 같은 wrapped editScale owner를
내부 dispatch로 재사용한다. Public editor method를 등록하지 않고, 이미 존재하는 editScale op만
Basic의 builtin trace 목록에 기록해 저장을 완결한다. 타입 전환 경계·저장 format·기존 Full 복원은
바뀌지 않는다. 정확한 조건과 값은 Current ENCODINGS/CORE 계약이 소유한다.

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

> 과거 checkpoint 수치 포함. 현재 한도는 실행 검사에서 확인한다.

Editable snapshot v4는 v3의 tagged array codec을 유지하며 32개 이상 array의 exact tagged content를 intern하여 facet child마다
같은 원본 행을 반복 저장하지 않는다. 이전 array만 참조하는 DAG이며 cycle/forward reference는
거부한다. Decode한 fresh plain graph를 한 번 소유하여 child constructor가 immutable source를
공유한다. 기존 semantic/graphic/reference validator를 유지하며 v1/v2/v3를 먼저 원래 형식으로 검증한 뒤 identity·lineage·resource를 이관한다. 저장된 그래픽을 재생성하지 않는다.
Facet은 기존100-child 전용 ceiling 대신 공통 generated-item/work budget을 적용한다.

### `ggaction/accessibility`

`src/accessibility.js`의 read-only `ggaction/accessibility` entry는 기존 final-item selection adapter 및 pure path series 계산을 사용하여 시각적 grain의 데이터를 반환한다. Renderer나 DOM을 실행하지 않고 원본 행을 최종 표로 대체하지 않는다. 안정적인 composite owner 관계는 `src/selectors/markOwners.js`를 mark removal과 공유한다. 결과의 정확한 schema와 제한은 [Rendering](../docs/api/rendering.md#accessible-data-alternatives)이 소유한다.

### `ggaction/inspection`

`src/inspection.js`의 browser-safe read-only entry는 저장된 dataset schema, action의 정적 적용 가능성, 두 프로그램의 resource 변화, materialized graphic의 구조와 가시 후보를 조회한다. 조회는 action을 실행하거나 program, trace, context를 바꾸지 않는다. 계산이나 pixel 확인을 수행하지 않은 검사는 `not_run`, 알 수 없는 extension 의미는 `unverified`, 지원하지 않는 concrete owner는 partial coverage로 반환한다.

### `ggaction/graph`

명시적 executor 수명 안에서 bounded graph edge route job을 계산하고 immutable receiver에 적용할 준비를 제공한다.
Worker 결과와 저장 route는 같은 exact ref·hash·결과 validator를 거치며 renderer는 완성된 concrete path만 읽는다.
정확한 공개 계약은 [EDGE_ROUTES.md](contract/current/EDGE_ROUTES.md)가 소유한다.

### `ggaction/interaction`

Browser-safe controller entry는 materialized scene의 hit geometry와 명시적인 host event binding을 사용한다. Full/Basic authoring을 import하거나 저장 의미를 변경하지 않는다. 정확한 공개 계약은 [Interaction](../docs/api/interaction.md)이 소유한다.

### `ggaction/scene`

Browser-safe read-only transition scenes consume materialized item identity metadata and concrete drawing values solely from graphicSpec. Domain mark materializers explicitly persist this metadata through primitives; the exact public scene contract is documented in [Rendering](../docs/api/rendering.md#transition-scenes).

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
src/persistence.js       ↔ types/persistence.d.ts
src/accessibility.js     ↔ types/accessibility.d.ts
src/diagnostics.js       ↔ types/diagnostics.d.ts
src/scene.js             ↔ types/scene.d.ts
ChartProgram contract    ↔ types/program.d.ts
src/mcp/cli.js           ↔ package `ggaction-mcp` executable
```

`package.json`의 export map, JavaScript export, declaration, package-boundary test는 하나의
public contract로 함께 관리한다. MCP executable은 module export map에 추가하지 않으며 Node-only dependency graph를
browser-safe entry에 연결하지 않는다.

Static built-in `action(...)` declaration에만 pure-call annotation을 둔다. Factory가 만드는 WeakMap key/value는 반환 wrapper를 사용하지 않으면 관찰 불가능하며, 해당 wrapper를 제거할 때만 함께 버릴 수 있다. Extension 사용자의 `action()` 호출과 등록 함수에는 annotation을 붙이지 않아 metadata validation과 prototype registration을 보존한다. Basic entry에서 등록하지 않은 sibling action의 dependency를 bundle에서 제거한다.

Package staging은 task resolver와 scale definition/color/quantitative transform, polar/arc geometry 및 Canvas/facet/guide layout 모듈을 기존 esbuild 정책으로 compact한다.
Repository 원본과 module 경로/export는 유지하고, packed math equivalence와 artifact size를 검사한다.

> 과거 checkpoint 수치 포함. 현재 한도는 실행 검사에서 확인한다.

The approved wedge and arrow shapes reuse the existing named point-shape grammar,
concrete path materializer, shape scales, legends and renderers. They introduce no new state
owner or primitive. The complete installed artifact measured 3,909,563 unpacked bytes,
exceeding the prior 3,908,000 ceiling; its narrow ceiling becomes 3,910,000. Entry count,
packed bytes, browser budgets and all existing tests remain unchanged. This is measured
feature growth, not a claim that the previous unpacked limit passed.

> 과거 checkpoint 수치 포함. 현재 한도는 실행 검사에서 확인한다.

Canvas no-paint uses the existing shared fill owner to translate the concrete `"none"`
sentinel into a transparent backend color for fill, stroke, text and backgrounds. It neither
changes stored graphics nor introduces semantic inference. Unpacked size is 3,910,160 bytes,
so only its ceiling grows from 3,910,000 to 3,911,000; all other limits remain unchanged.

> 과거 checkpoint 수치 포함. 현재 한도는 실행 검사에서 확인한다.

Continuous-size display maps reuse the existing block override owner and typed display-label
grammar. A numeric-only guard is shared by edits and saved-state validation; materialization
omits empty text items while retaining every sample glyph. No new state owner is introduced.
Measured unpacked size is 3,911,967 bytes, so only that ceiling changes from 3,911,000 to
3,912,000; entry, packed and browser budgets remain unchanged.

> 과거 checkpoint 수치 포함. 현재 한도는 실행 검사에서 확인한다.

Dashed legend borders add two private owners: pure even-array grammar and a shared stable-ID
rect/closed-path frame materializer. Existing family rematerializers and lane placement explicitly
invoke the same owner; renderers keep consuming concrete path commands. A nonempty pattern is one
closed path with a continuous dash phase. Default solid rects and their output remain unchanged.
Measured artifact growth is 569 entries / 798,338 packed / 3,914,211 unpacked bytes. The narrow
ceilings become 569 / 799,000 / 3,915,000, keeping browser limits unchanged. Search is 815,026 bytes;
its independent ceiling becomes 816,000. These are growth adjustments, not previous-limit passes.

범주형 점선의 explicit unknown 문서 추가 후 search-index는838,297bytes이며 최소1000단위
839,000bytes로 상한을 조정한다. 실제 지원 설명을 삭제하지 않으며 이전838,000bytes
통과로 보고하지 않는다. 기존 aligned expansion 후보에서 측정한 Full423,024/Basic209,555
bytes에 따라 이미 설정된424,000/210,000bytes executable 상한과 아래 표·README를 동기화한다.

> 과거 checkpoint 수치 포함. 현재 한도는 실행 검사에서 확인한다.

독립 Text 숫자 오프셋은 기존 encoding, 순수 Text grammar와 Text materializer를 재사용한다. 새 상태 owner나 renderer boundary는 없으며, 실측 Full gzip424768bytes에 따라 한도만425000으로 보정한다. Basic214000/SVG25000은 유지한다.

### Browser bundle regression ceilings

Production Vite consumer의 minimal build는 다음 gzip upper bound를 넘지 않아야 한다.

| Entry | Current gzip ceiling |
| --- | --- |
| `ggaction` | 681,000 bytes |
| `ggaction/basic` | 372,000 bytes |
| `ggaction/svg` | 25,000 bytes |
| `ggaction/graph` | 43,000 bytes |
| `ggaction/interaction` | 83,000 bytes |


이 값은 current executable regression ceiling이며 측정 결과 자체가 아니다. Canonical numeric owner는
`scripts/browser-bundle-size.js`이고 package consumer와 documentation contract가 같은 값을 검증한다.
Gzip 크기는 같은 minified bytes라도 Node가 포함한 zlib 버전에 따라 달라질 수 있으므로 지원하는
Node 20·22·24 matrix의 최댓값을 포함해야 한다.

2026-10-25 옵션 감사 수정의 동일 staged-package/Vite 비교에서 기존 HEAD
`aa8f1e28`는 Full476,183/Basic241,647gzip bytes로 이전 상한을 이미 초과했다.
최종 path-layer 색상·Area opacity 수정까지 포함한 Node 23.5.0 실측은
Full 481,383 / Basic 244,242 bytes이며 기준 commit 대비 순증은 5,200 / 2,595 bytes다.
추가 module은 Full의 Area 정렬 정책·complete-case 데이터 소유자, Basic의 Area
정렬 정책이며 Node/MCP/knowledge 경계 유입은 없다. 같은 minified 결과를
Node 20.20.2·22.23.4·24.22.1의 zlib로 압축한 최댓값 481,548 / 244,737 bytes를
기준으로 당시 상한을 조정했다. 이후 checkpoint의 상한은 아래 현재 측정 기록을 따른다.
SVG는 Node 23에서 7,566 bytes, 지원 Node matrix에서 7,578 bytes로
25,000 상한을 유지한다. 이전 상한을 통과했다고 보고하지 않는다.

2026-10-27 identity·lineage·selection resource 통합의 installed-package 측정은
Node 22.23.2에서 Full 506,776 / Basic 285,190 / SVG 7,827 gzip bytes다.
이번 통합의 현재 상한은 위 표와 canonical numeric owner에 기록한다.

> 과거 checkpoint 수치 포함. 현재 한도는 실행 검사에서 확인한다.

2026-10-16 승인 기능 5개와 기존 corner 범례 occupied-bounds 수정의 통합 checkpoint는 두 shared grammar module을 합쳐565entries다. 통합 packed 실측793,051bytes가793,000bytes를 초과하여 기존 최소1,000bytes 갱신 정책에 따라 packed 한도만794,000bytes로 조정한다. Unpacked3,900,000bytes 및 browser Full390,000/Basic189,000/SVG25,000bytes 한도는 유지한다. 개별 feature checkpoint의 측정은 각 기록의 독립 기준선이며, 통합 결과가 이전 packed 한도를 통과했다고 보고하지 않는다.

> 과거 checkpoint 수치 포함. 현재 한도는 실행 검사에서 확인한다.

The subsequently approved top-title alignment checkpoint keeps the same state
owners and explicit materialization flow. One shared pure title-style grammar
module owns its closed alignment enum/reset policy and saved-state validation.
The canonical artifact now measures 566 entries, 794210 packed bytes and 3899166
unpacked bytes: entry and packed ceilings become 566 and 795000, while the
3900000 unpacked ceiling stays unchanged. Installed minimal browser measurements
are 390419 Full / 189139 Basic / 7176 SVG gzip bytes, so the existing 1000-byte budget
step yields 391000 / 190000 and retains 25000 for SVG. The generated search payload
measures 813061 bytes; its independent cap becomes 814000. These are measured
feature growth adjustments, not claims of passing the previous limits.

> 과거 checkpoint 수치 포함. 현재 한도는 실행 검사에서 확인한다.

기존 facet 제목의 위치·경계 수정과 plot 기준 공유 guide 배치 수정은 명시적
composition materializer와 불변 자식 snapshot을 유지한다. 후자는 비공개 배치
소유자 하나를 추가한다. 패키지 측정값은 파일 567개, 압축 795791바이트,
압축 해제 3904102바이트이며, 측정에 따른 상한은 567 / 796000 / 3905000이다.
설치한 브라우저 bundle의 gzip 크기는 Full 391525 / Basic 189258 / SVG 7176바이트다.
Full 상한만 392000으로 조정하고 Basic190000과 SVG25000은 유지한다.
이는 실제 증가량을 반영한 조정이며, 이전 상한을 통과했다고 주장하지 않는다.

## 실행 계약의 위치

line facade의 실행 불가능한 horizontal bandPosition 선언을 수정하고 공개 문서를
동기화한 Node24.21.0/npm11.19.0 패키지는 798,062바이트다. 이 선언 수정분을
포함하도록 압축 상한만 다음 1,000바이트 단계인 799,000으로 조정한다.

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

`semanticSpec.resources`의 persistent-selection은 predicate, stable row-key 또는 logical item-key 집합을 소유한다. `selections`는 target mark, grain/projection, exact resource ref와 composite sourceSelection 관계를 저장한다. Selector source는 서로 겹치지 않는 세 namespace다. `field`는 item member data의 unique 값,
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
   Omitted anchor는 기존 row-preserving inference를 유지한다. 명시한 공통 materialized fold snapshot은 그 뒤에 cell filter를 붙이는 경계로 허용하며 원래 wide source와 fold 정의/전체 행은 보존한다. Fold를 row-preserving으로 재분류하거나 새 저장 alias를 만들지 않는다.
2. Child별 partition과 canonical transform replay, layer 및 private owner reference rebind를 wrapped action으로 실행한다.
3. 모든 candidate의 semantic scale intent를 비교해 shared/independent domain을 확정한다.
4. Child-local coordinate range로 mark, guide, label, selection/highlight와 style을 materialize한다.
5. Parent가 child snapshot, edge guides/shared legends, headers와 title을 배치한다.

Domain을 공유해도 coordinate frame과 range를 parent 값으로 덮지 않는다. Empty child는 incomplete scale inference를 허용하는 핑계가 아니다. Guide promotion은 실제 recipe와 represented scales의 compatibility를 검증한다. Explicit child guide 승격과 legacy categorical fallback은 다른 경로다.

Retained source는 재생 가능한 원본이며 child의 final graphics를 원본으로 역추론하지 않는다. Source나 facet policy 편집은 전체 candidate와 ancestor layout을 검증한 뒤 원자적으로 교체한다. Exact topology와 source/field/guide 지원 범위는 [COMPOSITION](contract/current/COMPOSITION.md)이 소유한다.

Standalone derived-data lifecycle도 requested transform과 materialized revision을 분리한다. `materializationConfigs.data`가 logical owner를 current snapshot에 연결하고 dataset source/layer data는 실제 snapshot ID를 저장한다. Pure transform registry가 requested extractor, normalizer, materializer, output role과 replay policy를 제공한다. Revision planner는 deterministic DAG를 따라 새 snapshot과 reference transition을 계획하고 wrapped action이 실행한다. Chart 내부 transform은 standalone registry에 중복 등록하지 않고 해당 chart owner가 lifecycle을 소유한다.

원본 revision은 같은 DAG planner에 새 immutable source snapshot을 시작점으로 제공한다. Reference transition은 shared typed reference collector가 소유하므로 data ID와 mark ID가 같은 문자열이어도 namespace를 혼동하지 않는다. 모든 candidate의 rematerialization과 stored selection compatibility를 검증한 뒤 wrapped transaction을 반환한다. Retained facet/repeat는 갱신된 unit template에서 저장된 composition recipe를 다시 적용한다.

Automatic statistical parameter의 요청과 계산값은 서로 다른 provenance다. Replay는 이전 계산값을 자동 정책으로 오인하지 않고 새 rows에서 다시 계산한다. Field output 이름을 바꾸는 revision은 semantic role에 따라 encoding과 selection/jitter binding도 함께 옮긴다. 제거되는 output을 참조하는 consumer는 전환 전체를 거부한다. Exact lifecycle은 [CORE](contract/current/CORE.md), 통계별 provenance는 [STATISTICS](contract/current/STATISTICS.md)가 소유한다.

## 행 identity 계산 경계

`core/itemIdentity.js`는 typed scalar/tuple의 동등성·순서, 명시적인 행 대응에 따른 token 배정,
source identity 검증의 순수 owner다. Namespace를 인자로 받고 UUID·program·trace·renderer에 접근하지 않는다.
Action 경계가 생성 namespace를 준비하고 kernel이 source snapshot identity를 계산한다.
`grammar/rowLineage.js`는 transform별 최종 행 grain과 기여 행 공유 table을 계산한다.
`materialization/resourceState.js`는 typed resource 검증·dependency DAG·prepared result 검사를, `selectors/resources.js`는 exact identity lookup을 소유한다.
`materialization/markOutput.js`는 final item resolver의 key·topology·lineage ref를 wrapped graphic primitive로 저장한다.
통계 reference의 값과 lineage는 `materialization/statisticalPopulation.js`의 같은 population boundary를 사용한다.
공개 옵션과 저장 형식의 현재 지원 범위는 [CORE](contract/current/CORE.md)가 소유한다.

## Parameter와 computed 입력 경계

`semanticSpec.resources`의 authored parameter가 scalar 값과 revision을 소유한다.
`grammar/parameter.js`와 expression grammar는 명시 값을 받아 순수 검증·계산하며,
`actions/data/computedBinding.js`가 현재 parameter를 exact revision vector에 바인딩한다.
`materialization/expressionInputs.js`는 공통 schema와 exact resource lookup을 사용해 저장된
computed 입력을 검증한다. Persistence는 이 read-only validator를 재사용하고 AST를 재평가하지 않는다.
Named lookup 자체는 계속 `selectors/resources.js`가 소유한다.

Parameter domain action은 해당 parameter를 읽는 모든 computed snapshot을 root로 모은 뒤 기존
dataset DAG의 합집합을 한 번 순회한다. 합류점은 모든 입력 revision 이후 한 번만 materialize하며,
기존 data revision owner가 layer·scale·guide·selection을 갱신한다. Primitive resource write는
계산식을 평가하지 않는다. Facet/repeat 편집은 retained source의 revision을 composition recipe에
다시 적용하고 concat은 명시 child scope를 따른다. 구체적인 lifecycle은 [CORE](contract/current/CORE.md)가 소유한다.

입력 자료의 순수 파싱·request proof·retained payload 검증은 `grammar/dataSource*.js`가,
명시 host callback을 호출하는 비동기 준비는 `resources/resolveData.js`와 `dataUpdate*.js`가 소유한다.
공개 prepare helper는 payload를 opaque handle의 private evidence로 보관하고,
`actions/data/sourcePlan.js`가 고정한 source/computed union을 `applyDataUpdate`가 기존 domain actions로 적용한다.
Live source intent와 current output은 typed data-source resource, 당시 실제 수신 자료는 immutable dataset receipt가 소유한다.
`materialization/dataSourceState.js`는 이 둘의 read-only 일관성을 검증하며 persistence도 같은 검증을 사용한다.
Restore는 URL AST·host callback을 실행하지 않는다. Basic은 공통 create 경계만 import한다.

`core/action.js`의 transient source-identity와 exact-argument summary context는 wrapped invocation에만 유효하다.
Prepared action이 clone 이전 receiver를 검증할 수 있게 하고 source primitive가 payload를 semantic state에만 보존하도록 한다.
어느 context도 program property·codec state·public extension hook이 아니다. Renderer의 graphic-only 경계는 유지한다.
구체적인 source/host/receipt 계약은 [CORE의 applyDataUpdate](contract/current/CORE.md#applydataupdate)가 소유한다.

## Immutability와 ownership

`ChartProgram`은 생성이 끝나면 freeze된다. 모든 public action과 internal wrapped
action은 기존 instance를 바꾸지 않고 새로운 instance를 반환한다.

Named dataset, layer, scale, coordinate의 exact ID lookup은 `selectors/`만 소유한다.
Independent layer/adjacent creation plans live in `actions/composition/layerPlan.js` and `materialization/adjacentSource.js`; pure role inference lives in `grammar/plotComposition.js`, and read-only original field/measurement lookup lives in `selectors/plotComposition.js`.
`selectors/graphicCapacity.js`는 semantic point owner와 retained child namespace identity를
추적한다. namespace encoding도 이 순수 selector owner가 소유하며 composition materializer는
이를 재사용한다. 수치 한도 검증은 core validation에 남고 persistence는 materializer를 호출하지 않는다.
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

`materialization/typography.js`는 측정 profile 변경과 theme font 변경의 공통 text-owner rematerialization 경계다. 기존 text mark, resource-backed tree/treemap/graph label, guide, legend, title의 wrapped domain action을 순서대로 실행하고 final guide collision을 검증한다. Composition은 child snapshot을 먼저 갱신하고 parent header/shared guide/placement를 재계산한다. Exact 공개 계약은 [CORE](contract/current/CORE.md#applytextmetrics)가 소유한다. Resource-backed label은 저장된 layout을 소비하는 기존 materializer만 호출하며 layout solver를 다시 실행하지 않는다. Renderer는 profile을 읽지 않고 이미 배치된 text graphics만 그린다.

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

명시적인 guide underlay는 기존 frame/Canvas config에서만 intent를 소유한다. 순수 draw-order 계산을
internal wrapped materializer가 호출하고 `editGraphics`의 exact children-permutation 편집으로
반영한다. Graphic ID/content/object 선언 순서를 재생성하지 않으며 renderer는 여전히 concrete tree만
읽는다. Policy가 없는 기존 authoring 경로에는 이 reconciliation을 추가하지 않는다. 정확한 API는
[축 계약](contract/current/AXES.md#cartesian-axis-underlays), [Canvas 계약](contract/current/CORE.md),
[primitive 계약](contract/current/PRIMITIVES.md#editgraphics)이 소유한다.

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
Shared point-shape grammar가 fourteen named shapes와 explicit simple polygons의 validation 및
area/radius-normalized geometry를 한 번 소유한다.
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

Named non-Canvas owner는 optional resolved rectangle/path `clip`를 가질 수 있다. 같은 parent frame에서 전체 items/subtree의 보이는 영역만 제한하며 좌표/identity를 재작성하지 않는다. Request는 canonical mark config가, rectangle은 owning materializer가, drawing은 graphic-only renderer가 각각 소유한다. 자기/조상 clip의 교집합은 공통 visible-bounds/isolated-paint 경로가 적용한다. 정확한 API는 [mark clipping](contract/current/MARKS.md#shared-cartesian-plot-clipping)과 [primitive editor](contract/current/PRIMITIVES.md#editgraphics)에 둔다.

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

### Reusable linear fit statistics

승인된 linear statistics 기능은 fit dataset별 compact cache를
`materializationConfigs.regressionFits[fitId]` 한 곳에 둔다. 기존 fit grammar가 계산한
모델에서 observation count·coefficients·scaled SSE/SST를 추출하며 raw rows나 full
model/prediction arrays를 복제하지 않는다. 기존 semanticSpec/graphicSpec/fit trace는
유지하고 editable snapshot bytes만 cache로 늘어날 수 있다.

`regressionStatistics`는 fit을 source로 참조하는 독립 derived dataset이다. 같은
typed schema·transform topology·DAG planner가 fit→statistics→annotation 순서를
소유한다. Chart-owned regression editor도 dependent statistics가 있으면 그 planner를
재사용한다. 새 renderer나 자동 semantic compiler는 없다. 이전 snapshot은 cache 없이
로드하고 첫 명시 statistics 요청만 wrapped fit materialization으로 cache를 복원한다.
Full-state validation은 cache owner·version·group/order/count·finite coefficient를 검증하고,
domain remove/release는 fit cache를 함께 정리한다. 정확한 공개 계약은 CORE가 소유한다.

> 과거 checkpoint 수치 포함. 현재 한도는 실행 검사에서 확인한다.

이 checkpoint의 macOS/Node22.23.1/npm10.9.8 실제 artifact는569entries,
packed802,032/unpacked3,935,479바이트다. 새 grammar/action 두 모듈과 타입·machine metadata
증가를 반영해 entry569, packed803,000, unpacked3,936,000으로 최소 단위 갱신한다.
Search payload816,102바이트는 기존814,000을 초과하여817,000으로 조정했다.
설치 Full bundle 최종394,855 gzip바이트를 측정하여 Full 한도만395,000으로
갱신했고 Basic191,000/SVG25,000은 유지한다. 이전 한도 통과나 지원 Node 간
압축 동일성을 주장하지 않으며 최종 통합에서 다시 측정한다.

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

Dataset, layer, scale, coordinate를 ID로 찾는 규칙은 `src/selectors/`가 소유한다. Cartesian axis resource도
`selectors/axes.js`가 canonical/unique/explicit selection, binding과 physical-side occupancy를
소유한다. 의미 identity(channel/position/scale/coordinate/title)는 semantic guide map, appearance와
standalone/frame intent는 같은 ID의 guide config에 한 번만 저장한다. Concrete native IDs와
consumer iteration은 같은 owner registry를 사용하며 data/scale/Canvas/theme/facet/persistence가
canonical x/y 두 개만 가정하지 않는다. Exact API는 [AXES](contract/current/AXES.md)가 소유한다.

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
- Continuous legend ramp의 선택적 body opacity는 replayable gradient config 한 곳에 저장한다. `grammar/legendGradient.js`가 생성·편집·저장의 closed 수치 검증을 공유하며 기존 domain materializer가 strip opacity를 명시적으로 갱신한다. Legacy 생략값은1이고 renderer는 concrete paint와 opacity만 읽는다. 정확한 공개 계약은 Current LEGEND_AND_TITLE이 소유한다.
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

연속형 color의 gradient strip과 sampled point 표현은 같은 `guideConfigs.legend.gradient` 소유자를
사용한다. 선택적 `representation` discriminator가 concrete recipe를 고르며 생략한 이전 저장 상태는
기존 gradient다. Symbols mode의 exact/auto sampling과 point recipe는 그 config에만 저장하고,
semantic color scale/domain/data는 바꾸지 않는다. 기존 continuous consumer mapper로 sample paint를
계산한 뒤 domain action이 strips/ticks 또는 symbols를 명시적으로 materialize한다. 표현 전환은
그 표현 전용 graphics만 reconcile하며 target-owned group과 공통 스타일을 보존한다.
Renderer는 representation을 해석하지 않고 완성된 concrete primitives만 읽는다.

Family action은 scale/content/appearance를 검증하고 intrinsic concrete recipe를 만든다. `layout/legendItems.js`는 실제 sample stroke/path bounds와 formatted text를 측정해 공통 occupied item slot을 계산한다. Size/interval/stroke-width는 categorical symbol implementation을 복제하지 않고 같은 layout owner에 자기 recipe를 제공한다.

선택적 content spacing의 검증·reset은 `grammar/legendSpacing.js`가, 이미 측정한 concrete row/title bounds의 순수 이동 계산은 `layout/legendSpacing.js`가 소유한다. Family config에는 선택적 numeric authoring intent만 저장하고 계산된 row geometry나 renderer 전용 상태를 저장하지 않는다. Item 공통 경로와 opacity/gradient 경로는 같은 순수 계산을 호출하며 기존 wrapped materialization이 결과를 적용한다. 정확한 지원 범위·기본값·전환은 [현재 범례 계약](contract/current/LEGEND_AND_TITLE.md)을 따른다.

`layout/legendLane.js`는 family-independent concrete block을 edge별로 배치한다. Wrapped side/horizontal lane owner만 그 계산 결과를 graphics에 적용한다. Border와 title을 포함한 occupied bounds로 최종 Canvas/guide collision을 검증한다. Multi-block packaging과 single-block alignment를 혼동하지 않는다. Legacy-bottom은 별도 명시된 placement 계약이며 option 존재 여부로 추측하지 않는다.

Opt-in 다중 블록 배치와 자유 좌표는 `materializationConfigs.guides.legendGroups[target]`이 소유한다.
이 map의 placement와 blockLayout이 그룹의 유일한 effective anchor/packing intent이며 멤버 목록은 현재 target의
legend config에서 도출한다. 기존 family config는 항목·스타일·legacy 배치 intent를 유지하고,
`materialization/legendGroups.js`가 그룹 상태를 읽어 임시 intrinsic frame을 투영한다. 이 투영값을 저장하거나
renderer에 의미 상태를 전달하지 않는다. 모든 family가 concrete block을 만든 뒤 기존 guide transaction이
wrapped `rematerializeLegendGroups`를 명시적으로 호출한다. 순수 `layout/legendGroup.js`는 stroke·text·border를
포함한 occupied 사각형을 packing하고 전체 그룹의 위치를 계산한다. 새 필드 없는 비그룹 경로는 기존 lane을
그대로 사용한다. 그룹 상태의 closed schema는 `grammar/legendGroups.js`가 authoring과 persistence에 공유하며,
target map key는 기존 resource reference collector에 mark reference로 등록한다. Shared facet/repeat는 retained
source의 그룹 정책을 검증·승격하고 composed plot bounds에서 같은 occupied placement를 적용한다.
정확한 옵션·전환·공간 부족 계약은 [LEGEND_AND_TITLE](contract/current/LEGEND_AND_TITLE.md)이 소유한다.

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

Resource-backed graph/tree/treemap의 역할별 기본값은 grammar plot owner가 하나만 정의한다.
Theme는 이 기본값과 authored override를 구분하고 기존 plot materializer를 통해 body/link/label을
갱신한다. 마지막 frame 제거는 해당 family 기본값을 복원한다. 저장된 graph/hierarchy/layout 계산은
다시 실행하지 않으며 named highlight는 새 baseline에서 기존 selection owner가 다시 적용한다.

Theme 정의 정규화는 `actions/theme/definition.js`에서 core own-data·paint grammar를 재사용한다.
`theme/defaults.js`는 공유 token/default 값만 소유한다. Optional categorical palette는 자동 appearance scale의
resolved range와 기존 mark/legend materializer를 갱신한다. Pattern palette는 final item의 typed category와
기존 fill materializer를 사용하며 scalar scale range에 구조화 paint를 저장하지 않는다.
Semantic spec, position scale, 통계 row, grouping, domain과 item identity는 동일하게 유지한다.
Inspection은 같은 theme override/reset owner에서 winning source를 읽으며 별도 persisted history를 추가하지 않는다.
권한을 입증하지 못한 legacy/extension 값은 unknown이다. Explicit local style은 값이 preset 또는 library default와 같더라도 action
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
- 기본 Text는 native PDF text operator로 남는다. Structured Text paint와 isolated-glyph
  opacity 처리의 bounded texture 예외는 current/MARKS.md의 shared structured fill이 소유한다.
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
`materialization/scales/consumers/`는 실제 consumer discovery와 family dispatch를 소유한다. Facet guide는
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
Legend grammar와 facet guide scaffolding은 prefix family로 새 모듈에도 자동 적용한다.
새 결합/축/용량 정책과 facet parent 소유권의 핵심 owner에는 더 엄격한 별도 floor를
적용한다. 결합 sample의 연결 순서와 잘못된 물리 면적, 중복 point ownership은 독립
정책 회귀로 검증하며 global/기존 critical floor를 낮추지 않는다.
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
Unit guide transaction은 sibling materialization 완료 뒤 side lane을 명시적으로 최종 배치하고 그 다음 title 및 충돌 검사를 수행한다. Composition의 shared-guide 배치는 composition owner에 남으며 unit action을 호출하지 않는다.
세부 sizing/충돌 계약은 Current CORE와 AXES, LEGEND_AND_TITLE이 소유한다.

### Precomputed box summary provenance

Box facade의 explicit summary mapping은 기존 boxSummary derived-data owner를 사용한다.
`method:precomputed`는 다섯 field의 값과 category identity를 검증하여 canonical summary columns로
복사하며 quantile/fence/count를 새로 추정하지 않는다. 기존 raw method:linear 경로는 유지한다.
Source revision과 facet replay는 같은 transform validator/materializer를 사용한다. 픽셀 body 폭과
median 폭은 기존 mark config에 남고 Rule median은 concrete body center와 owner width intent를 읽는다.
Whisker cap/style은 기존 ErrorBar editor가 생성/제거와 rematerialization을 소유한다.

Categorical legend overflow는 기존 full domain/config를 보존하고 materialization 직전에
visible prefix와 hidden count를 derive한다. Symbol은 prefix만, labels/layout은 summary까지
소비한다. Plot corner anchor는 measured painted bounds를 plot 내부로 이동하며 outer lane을
사용하지 않는다. Raw Cartesian singleton line은 source identity와 scale domain을 유지하는
M-only path다. Shared graphic schema가 이를 허용하며 renderer는 별도 의미 추론을 하지 않는다.

> 과거 checkpoint 수치 포함. 현재 한도는 실행 검사에서 확인한다.

Opt-in plot border intent는 기존 materializationConfigs.canvas.plotBorder가 소유한다. Canvas domain action은 wrapped rematerializePlotBorder를 명시적으로 호출하며 기존 layout dependency plan이 Canvas/guide sizing replay에 이를 포함한다. 기존 rect schema/renderer만 소비하고 compiler나 새 backend state를 추가하지 않는다. 선은 plot 안쪽이며 ordinary mark placement는 frame 앞을 사용하여 axes 아래의 frame 순서를 보존한다.
Plot border 전용 wrapped-action module 1개 추가로 packed entry 실측555가 기존554한도를 초과하므로 entries 한도만555로 조정한다. Byte 한도는 유지한다.
Plot border 포함 packed 실측780,011bytes와 검색 payload810,074bytes가 기존780,000/810,000한도를 넘었다. 각각782,000/811,000bytes로 좁게 조정하며 unpacked byte 및 SVG 한도는 유지한다.

> 과거 checkpoint 수치 포함. 현재 한도는 실행 검사에서 확인한다.

승인된 그룹 범례 배치에 authoring preflight, closed grammar, pure packing, materialization owner의 runtime module4개가 추가되어 packed entry 한도를555에서559로 조정한다. 새4module과 변경된lane/edit에 기존 staging compaction을 적용한 뒤 packed 실측784,495bytes가 기존782,000bytes를 초과하여 한도를787,000bytes로 조정한다. Unpacked3,900,000bytes 한도는 유지하며 이전 entry/packed 한도 통과로 보고하지 않는다.

> 과거 checkpoint 수치 포함. 현재 한도는 실행 검사에서 확인한다.

승인된 연속형 color symbols 표현은 기존 gradient owner와 renderer primitive를 재사용하며 전용 materializer module1개를 추가한다. Packed entry 한도는559에서560으로 조정한다. 부모80bf checkpoint의 browser gzip Full385,362/Basic185,627bytes 대비 현재 source 실측 Full387,449/Basic186,810bytes로 기존386,000/186,000bytes를 초과하여388,000/187,000bytes로 좁게 조정한다. SVG7,161bytes와25,000bytes 한도는 유지하며 이전 한도 통과로 보고하지 않는다.

> 과거 checkpoint 수치 포함. 현재 한도는 실행 검사에서 확인한다.

범례 title의 명시적 hard break는 기존 concrete text `lines`를 재사용한다. 기존 text-mark line resolver를 `core/textMetrics.js`로 옮기고 grammar가 같은 함수를 재수출하여 layout→grammar 역방향 의존과 별도 줄바꿈 정책을 피한다. Title block 측정은 `layout/legendText.js`, optional `lines`의 불변 materialization/reconciliation은 `materialization/legendText.js`가 각각 소유한다. 새 공개 API·state schema·renderer newline 추론 없이 두 shared responsibility를 추가하므로 packed entry 한도를560에서562로 조정한다. 기존 staging compaction을 두 owner에 적용한 packed 최종 실측790,694bytes는 이전790,000bytes를 초과한다. 기존 최소1,000bytes 단위 정책에 따라 packed 한도를791,000bytes로만 조정하며 unpacked 실측3,885,070bytes와3,900,000bytes 한도는 유지한다. 이전 entry/packed 한도 통과로 보고하지 않는다.

동일 title의 single-line concrete graphics는 변경 직전 commit과11범례 family×4edge의44경우에서 정확히 일치했다. Multiline 회귀는11family×4edge의 ordered lines, SVG/Canvas, blank/CRLF/CR, creation/edit convergence, persistence, immutable overflow를 검증한다. Unit2,966/2,966, contracts532/532, docs120/120, 마지막 boundary/package/bundle-truth focused15/15와 installed public basic/full consumer를 통과했다. 기존 lane의 private `inferredOffset` marker assertion도 현재 persisted grammar와 동기화했다.

> 과거 checkpoint 수치 포함. 현재 한도는 실행 검사에서 확인한다.

기존 categorical `labelMap`의 빈 표시 문자열은 category/symbol/item slot을 보존하며 concrete text item만 생략한다. 기존 categorical materializer와 lane owner가 빈 label collection을 처리하므로 새 module, state owner, renderer inference는 없다. Title 빈 줄 수정과 이 복원을 포함한 packed 최종 실측791,041bytes가791,000bytes 한도를 초과하여 기존 최소1,000bytes 단위 정책으로 packed 한도만792,000bytes로 조정한다. Entry562와 unpacked3,886,248bytes는 기존562/3,900,000 한도 내이며 browser/SVG 한도는 유지한다. 이전 packed 한도 통과로 보고하지 않는다.

### 축 title hard break의 concrete line 소유권

> 과거 checkpoint 수치 포함. 현재 한도는 실행 검사에서 확인한다.

기존 축 title 문자열의 명시적 hard break는 같은 core line resolver와 concrete text `lines`를 재사용한다. 축 title domain action은 기존 위치·회전·원자적 bounds 검증을 유지하며, optional derived line property의 추가·제거는 `materialization/textLines.js`가 소유한다. 기존 범례 materializer도 이 좁은 helper를 호출하므로 action 계층의 직접 graphicSpec 복제나 renderer newline 추론을 추가하지 않는다. 새 공개 API나 persisted schema는 없다. 새 private module 하나에 따라 package entry 한도만562에서563으로 조정한다. Packed 실측791,403bytes와 unpacked3,887,466bytes는 기존792,000/3,900,000bytes 한도 안에 있으며 browser/SVG 한도는 유지한다. 이전 entry 한도 통과로 보고하지 않는다.

> 과거 checkpoint 수치 포함. 현재 한도는 실행 검사에서 확인한다.

승인된 computed getPath/replaceLiteral은 기존 순수 computed owner에서 검증·평가하고 기존 derived-data/schema/persistence 흐름을 그대로 재사용한다. Path command ceiling은 기존 pathCommands owner의 단일 상수/검증 helper가 소유하고 line/curve/area와 concrete validation이 함께 사용한다. Generic generated-item10,000 한도는 유지한다. 새 module/entry 없이 packed 실측792,129bytes가792,000bytes를 초과하여 기존 최소1,000bytes 갱신 정책으로 packed 예산만793,000bytes로 조정한다. Entry563와 unpacked3,900,000bytes 예산은 유지하며 이전 packed 예산 통과로 보고하지 않는다.

### Area fallback fill uses the existing paint grammar

> 과거 checkpoint 수치 포함. 현재 한도는 실행 검사에서 확인한다.

Approved area fallback fills reuse `FillPaint` on the existing area mark configuration and concrete path properties. `grammar/areaPaint.js` owns the shared action/import compatibility guard: a structured fill cannot implicitly become a solid outline. Area, density, violin and error-band facades forward the same value; categorical swatches inherit it only without a data-driven color encoding. Renderers and persisted schema remain unchanged. The private validator adds one packed entry (563→564). Measured packed791,934bytes/unpacked3,889,220bytes remain within792,000/3,900,000bytes; the installed full browser gzip389,164bytes exceeds389,000, so only that limit increases to390,000bytes. Basic189,000 and SVG25,000 limits remain unchanged. These measurements do not claim the previous entry/full-browser limits passed.
승인된 연속 범례 body opacity는 creation/edit/persistence가 공유하는 closed grammar owner `grammar/legendGradient.js` 하나를 추가한다. 이에 따른 packed entry 한도는563에서564로만 조정한다. 최종 실측564entries·packed791,661bytes·unpacked3,888,408bytes는 기존792,000/3,900,000bytes 안에 있다. Browser gzip Full388,931bytes·Basic188,433bytes와 기존389,000/189,000bytes, SVG25,000bytes 한도는 유지한다. 생략 시 default graphic/SVG24경우의 byte identity와 명시적0/.7/1의 body-only materialization을 검증하며 renderer 추론은 추가하지 않는다.

> 과거 checkpoint 수치 포함. 현재 한도는 실행 검사에서 확인한다.

Corner item block은 기존 layout owner가 실제 title/item bounds와12px gap으로 측정한다. Group materialization의 ephemeral corner 의도를 같은 owner에 전달하며 state/schema나 renderer owner를 추가하지 않는다. 외부 SIDE의 fixed20/52 anchors는24조합에서 byte-identical이다. 이 수정 뒤 installed Full gzip389,027bytes가389,000 한도를27bytes 초과하므로 기존 최소1,000bytes 단위 정책에 따라 Full 한도만390,000으로 조정한다. Basic189,000/SVG25,000 및 package564entries/792,000packed/3,900,000unpacked 한도는 유지한다.

### 첫 네 기능 통합의 검색 측정

### 열네 승인 기능의 누적 통합 측정

### Point-owned graphic capacity

> 과거 checkpoint 수치 포함. 현재 한도는 실행 검사에서 확인한다.

Point 생성·편집과 editable persistence는 selector가 증명한 semantic point/selected values/graphic
ID·type 소유권을 공통 core guard에 전달한다. Namespace가 적용된 composition snapshot은 실제
retained child owner까지 추적하며 별도 bypass state를 저장하지 않는다. 일반 generated-item/work
및 graphic-only structural validation 경계는 바꾸지 않았다. 정확한 수치는 MARKS/PRIMITIVES가 소유한다.
Node22.23.1/npm10.9.8/macOS canonical artifact 실측은570entries, packed803124, unpacked3939523이다.
승인된 유한 기능 증가에 따라 entries570/packed804000/unpacked3940000으로 최소 상향했다.
Browser gzip Full395462는396000으로 상향하고 Basic190821/SVG7176은 기존191000/25000을 유지한다.



> 과거 checkpoint 수치 포함. 현재 한도는 실행 검사에서 확인한다.

Named Cartesian axes는 기존 source boundary를 유지하는 selector owner 하나를 더한다. Native ID
resolver는 `selectors/axes.js`가 소유하고 materialization은 이를 재수출하므로 persistence가
materialization layer에 역방향 의존하지 않는다. 기존 package staging compaction을 새 selector에
적용한 실측은570entries,805115packed,3948224unpacked bytes다. 기존 최소1000bytes 정책에 따라
한도를570/806000/3949000으로 좁게 갱신하고 이전569/799000/3919000 통과로 보고하지 않는다.
전체 승인 옵션을 보존한 search816932bytes는817000으로, action-card median1896bytes는1896으로
갱신한다. Card max3358은3360 한도 안이다. Installed consumer의 actual gzip은 Full396214/Basic193136bytes이므로 최소1000bytes 단위로397000/194000으로만 조정한다. SVG25000은 유지한다.



### Gradient direction and bottom title checkpoint

This checkpoint measures 569 entries / 799,016 packed bytes / 3,917,456
unpacked bytes. Entry count stays 569; packed/unpacked limits become
800,000 / 3,918,000 bytes. Search remains below 816,000 bytes and browser
budgets remain unchanged. The previous package limits were exceeded, not passed.

### Local legend block placement checkpoint

> 과거 checkpoint 수치 포함. 현재 한도는 실행 검사에서 확인한다.

Local placement reuses blockOverrides[key].position and transient intrinsic
frames, so no renderer/semantic placement field is added. Unit inherited/local
blocks partition before packing, use full occupied bounds, and reject collisions.
The complete editLegend card is 3,617 bytes, within its 3,620 ceiling. Package
measurement is 569 entries / 800,270 packed / 3,922,635 unpacked bytes after layout-validation preservation; limits
move only to 801,000 / 3,923,000 bytes. Facet parent-union normalization is a
coordinated #206 integration seam; no override keeps the existing promotion path.
The installed Full browser bundle measured393,508 gzip bytes, above393,000;
its ceiling is394,000. Basic also measured190,409 above190,000 and moves to191,000; SVG stays25,000.



축·범례 기능 통합에서는 descriptor validation과 block key/query를 pure
`grammar/legendBlocks.js`로, local position query를 기존 `grammar/legendGroups.js`로
모았다. 기존 actions/materialization 경로는 재수출하여 downstream 소유자의 이동을
강요하지 않는다. Persistence는 이 grammar를 읽으므로 actions/materialization import를
허용하도록 경계를 넓히지 않는다. 범용 immutable graphic-edit loop는
`core/graphicProperties.js`가 소유하고 primitive helper도 재수출한다. 실제 편집은 여전히
public editGraphics primitive를 호출하며 직접 state clone/mutation을 추가하지 않는다.

The opt-in `size-shape` combination reuses the categorical series owner and its
ordered typed domain. `grammar/legendCombinations.js` owns the pure mapping
eligibility and physical-area mapping used by action resolution and snapshot
validation; actions alone create/revise the owner. Explicit group placement is
retained through split/recombine, while independent color stays a separate
block. Pure block descriptors/local placement queries and graphic-property loops
are shared with the axes checkpoint without persistence depending on actions or
materialization.

### 단일 glyph source의 명시적인 합성

Bar editor의 optional semantic mark.blend 한 곳이 per-bar difference 의도를 소유한다.
기존 materializer는 rect/path item에만 concrete blend를 명시적으로 물질화한다.
Renderer는 이 concrete property만 소비하며 의미를 해석하지 않는다. SVG는 한 element의
fill+stroke와 root isolation을 사용한다. Canvas의 private isolated owner는 기존 pure
graphicBounds로 visible stroke bounds를 구하고 전체 capability/자원 preflight 후
한 transparent surface를 재사용한다. Glyph source를 opacity1로 그린 뒤 destination에
mark opacity와 difference를 한 번 적용한다. 공유 raster limits는 private limits owner다.
DOM/Offscreen/native 동형 constructor와 Node PNG/PDF가 전달한 private createCanvas를
사용하며 native import가 browser entry에 유입되지 않는다. Surface/plan은 ephemeral이고
프로그램 저장 모양에는 backend object가 없다. PDF의 해당 glyph source만 raster다.
독립 PDF8bit검사는 Poppler를 쓰며 renderer CI/release job에서 decoder를 설치한다.


축·범례 기능 통합에서는 descriptor validation과 block key/query를 pure
`grammar/legendBlocks.js`로, local position query를 기존 `grammar/legendGroups.js`로
모았다. 기존 actions/materialization 경로는 재수출하여 downstream 소유자의 이동을
강요하지 않는다. Persistence는 이 grammar를 읽으므로 actions/materialization import를
허용하도록 경계를 넓히지 않는다. 범용 immutable graphic-edit loop는
`core/graphicProperties.js`가 소유하고 primitive helper도 재수출한다. 실제 편집은 여전히
public editGraphics primitive를 호출하며 직접 state clone/mutation을 추가하지 않는다.


### Facet parent의 native shared 범례

Parent 선언/편집의 canonical intent는 `compositionSpec.facet.guides.legend` 한 곳에 둔다.
False/shared 문자열은 기존 의미를 유지하고 새 객체는 private closed tagged block normal form으로
정규화한다. 각 block은 기존 unit config/inference flags와 semantic guide 의미를 재사용한다.
`materialization/facetGuides/owner.js`가 retained source의 transient intrinsic 측정과 shared scale/recipe
검증을, `ownerLayout.js`가 final inner-plot union의 inherited/local partition과 실제 경계를 소유한다.
Child Canvas/margin은 바꾸지 않고 transient flag는 반환 parent/context나 저장 state에 남지 않는다.
Parent native guide configs와 fully concrete graphics는 파생 결과이며 renderer는 새 해석을 하지 않는다.
Unit scope인 createLegend는 그대로이며 기존 edit/focused/block/remove만 parent router를 소비한다.
Theme는 derived config를 recolor한 동일 transaction에서 parent canonical appearance를 갱신하므로
다음 reflow가 자동 색상/font 변경을 되돌리지 않는다. Source replay는 public 선언에 internal tag를
넘기지 않고 기존 child 생성 뒤 parent intent를 다시 연결한다. Exact API는 Current COMPOSITION과
LEGEND_AND_TITLE에서만 정의한다. Source layer 경계를 완화하지 않는다.

부모 범례 배치는 `materialization/graphicTranslation.js`의 동일한 primitive 이동 owner를
사용한다. Collection은 자손을 이동하고 nested Canvas는 자신의 local frame만 이동하므로
clip 내부 glyph를 두 번 이동하지 않는다. 이 규칙은 unit lane과 facet parent가 공유한다.

### 기존 Canvas 수정 및 실데이터 facade 검증 동기화

### 승인 기능23개 누적 검색

회귀 통계·named axes·shared 순수 query·범례 세부 옵션과 막대 합성을 합친 공개 검색은
822975bytes다. 옵션/예제/enum을 줄이지 않고 공유 상한만 최소1000bytes 단위823000으로
갱신한다. source-boundaries30개와 누적 unit3198개는 현재 통합 소스에서 통과했다.

같은 누적 Node24.21.0/npm11.19.0 staged package는579entries, packed821063,
unpacked4009853bytes다. 각 branch 단독 예산 통과와 구분하여 누적 예산을 실제 entry579,
packed822000/unpacked4010000으로만 갱신한다. 이전574/810000/3965000은 통과하지 않았다.



Size-shape 통합 뒤 검색은823539bytes이며 최종 공개 옵션을 유지한 채824000으로만
갱신한다. 범례 새 public 흐름·독립 Chromium·bar stable pair의 결합6검사가 통과했다.

### Explicit whole-glyph normal opacity

The approved normal concrete marker shares the existing bounded isolated-glyph
allocation owner with difference, while preserving the omitted renderer path.
Only explicit recipe-layer opacity lowers to normal; legacy block patches and
fallback numbers do not infer a marker. Normal source attenuation uses one
native destination-in mask before source-over at alpha1. Source arc/transform/
mask and target composition capabilities are checked before destination changes.
The pure `grammar/legendOpacity.js` validator is shared by creation/edit/import.
No source surface or backend state enters stored graphical or semantic data.

명시적 whole-glyph opacity 결합 검색은824703bytes이며825000으로만 갱신한다.

### Facet parent를 포함한26기능 통합 측정

> 과거 checkpoint 수치 포함. 현재 한도는 실행 검사에서 확인한다.

통합 `08329df4`와 ordinal range validator복원 뒤 macOS/Node22.23.1/npm10.9.8 실제 installed
artifact는587entries/829705packed/4048931unpackedbytes다. Node24의831438packed측정과 함께
기존587/832000/4049000 package한도 안이다. 실제 browser gzip은 Full409512/Basic199726/SVG7325다.
승인된 기능 증가분의 최소1000bytes정책으로 Full410000/Basic200000만 갱신하고 SVG25000과
다른 global test/coverage 기준은 유지한다. 이전405000/198000 한도는 실패했으며 그 성공으로
보고하지 않는다. 숫자 변경은 새로운 renderer/state 경계를 추가하지 않는다.
### Sample-window concrete materialization

> 과거 checkpoint 수치 포함. 현재 한도는 실행 검사에서 확인한다.

Point-bearing legend clipHeight is one stored block option. The materializer
wraps each complete sample in a transparent nested Canvas and retains generated
glyph IDs and physical geometry. Pure visible bounds intersect nested frames;
root overflow remains observable. Unit and parent placement share the pure
graphicTranslation owner rather than translating nested descendants twice.
Actual full option inventories measure createLegend3507/editLegend3838bytes;
only those card ceilings rise to3510/3840bytes. No options/enums or coverage
thresholds are removed.

> 과거 checkpoint 수치 포함. 현재 한도는 실행 검사에서 확인한다.

Sample-window artifact measured581entries/815276packed/3982153unpacked;
ceilings581/815500/3983000 reflect only the three policy/materialization owners.
Search820275bytes uses820500bytes, preserving the complete option inventory.


### Parent sample-window identity and replay integration

부모 범례와 일반 child composition은 기존 graphic namespace owner를 재사용하여
clip Canvas와 그 glyph를 공개 primitive의 기존 valid-ID 정책에 맞게 생성한다.
공개 ID 정규식과 state schema는 확장하지 않는다. 복원 scaffold는 저장된 block별
channels/combine/representation/명시 symbol을 사용하며 window는 각 원래 config의
최종 materialization에서만 적용한다. 이로써 gradient strip에 형제 size의 window가
전파되지 않는다. 미지정12사례는 이전 JSON/SVG/전체RGBA와 정확히 동일하다.

> 과거 checkpoint 수치 포함. 현재 한도는 실행 검사에서 확인한다.

macOS/Node22.23.1/npm10.9.8의 통합 staged artifact는589entries/833342packed/
4061404unpacked bytes다. clip의 새 grammar/materialization2모듈을 포함해 허용entries는
589로, 크기 한도는 다음 최소1000bytes인834000/4062000으로 조정한다.
기존832000/4049000 한도 통과로 보고하지 않으며 browser/global coverage 기준은 유지한다.

히트맵의 기존 title:false/named-axis 동작 복원과 통합 release notes를 포함한 Node22
staged artifact는4063287unpacked bytes로 측정됐다. 기존4062000 검사는 실패했으므로
다음 최소1000bytes 단계4064000으로만 올린다. Node24.19.0의 동일 staged 입력은
835531packed bytes로 기존834000을 초과하여 다음 단계836000만 적용한다.
entries589, browser 및 전체 기능/coverage 기준은 유지한다.

### Named-shape canonical example discovery budget

### Complete feature integration measurements

28개 기능과 named-shapes 예제를 합친 compact search는829294bytes로 측정됐다.
기존829000검사2개는 실패하여 항목 삭제 없이 다음 최소1000bytes인830000만 적용한다.
정량 color-size 결합의 grammar/materialization2모듈을 통합해 package entries는591이다.
최종 packed/unpacked 및 browser 측정은 같은 통합 입력으로 재검증한다.

Node24.19.0 통합 staged 입력은840502packed/4082583unpackedbytes로 측정됐다.
기존836000/4064000 검사가 실패하여 최소1000bytes 단계841000/4083000만 적용한다.
591개 entry와 모든 기존 옵션·데이터·coverage 기준은 유지한다.


### Legend appearance canonical example discovery budget

최종 parent-guide 통합의 Node24.19.0 staged packed 크기는841241bytes로 기존841000을
넘었다. 동일 소스의 Node22 측정은839439packed/4085322unpackedbytes다. packed만
다음 최소1000bytes 단계842000으로 갱신하며 entries591·unpacked4086000은 유지한다.
### Facade capability declaration checkpoint

최종 facade별 유효 범례 선언을 모두 검색에 포함한 version0.0.19 payload는832118bytes다.
정확한 published-release fingerprint로도 기존831000을 초과해 docs2검사가 실패했다.
옵션·값·문서를 삭제하지 않고 다음 최소1000bytes 단계833000만 적용한다.

### Cartesian owner clipping measurement checkpoint

> 과거 checkpoint 수치 포함. 현재 한도는 실행 검사에서 확인한다.

기존 API에 optional boolean과 concrete owner rectangle을 추가하면서 resource selector·rectangle schema·materialization의 세 owner가 package entries591→594가 되었다. Node22.23.1/npm10.9.8 staged 실측은 packed843921/unpacked4095633bytes로 기존842000/4087000과 entries591을 초과한다. 실제 기존 검사 실패를 보존하고 entries594 및 최소1000byte 단계844000/4096000으로만 조정한다. Node24 protected-release 크기는 다음 정기 배포에서 반드시 다시 측정하며 이번 수치를 Node24 통과로 주장하지 않는다.

Compact card는 clip option을 실제 노출하는 createMarkLabels3420/createAnnotation3414/createRegressionPlot3370bytes가 기존3360을 초과한다. 해당 세 cap만 최소10byte 단위3420/3420/3370으로 갱신하고 default3360과 legend3530/3860, median1896은 유지한다. Validator와 contract test는 한 budget owner를 참조하며 option 또는 supported value를 삭제하지 않았다. ReferenceBand와 Polar/Radar/Parallel의 상속 타입에 Cartesian clip이 잘못 유입되지 않도록 명시적으로 제외했다.

### Facet top margin sharing

Facet의 opt-in topLane 정책은 compositionSpec 한 곳에 저장한다. Pure layout이 기존 top margin과
예약량을 계산하고 materialization이 final graphic-tree text bounds를 수집하여 pure collision 검사에
전달한다. 기존 explicit wrapped rematerialization과 renderer의 concrete-only 경계는 유지한다.
정확한 동작은 current/COMPOSITION.md의 Shared facet top lane이 소유한다.

같은 qualification에서 이미 허용된 concrete text:""를 renderer의 추가 non-empty 검사가 거부하는
불일치를 찾았다. Canvas/SVG가 기존 concrete value validator를 직접 재사용하도록 복원했다.
새 schema나 renderer semantic inference는 없다. 수정된 staged unpacked4115014bytes가 이전4115000을
14bytes 넘었으므로 해당 실패를 보존하고 최소다음1000byte 단계4116000만 적용한다.

### Explicit guide underlay budgets

> 과거 checkpoint 수치 포함. 현재 한도는 실행 검사에서 확인한다.

Draw-order 계산/materializer/wrapped action과 grid resource selector의 네 owner를 추가해 package
entries는602가 되었다. Node22.23.1 staged 실측851052packed/4124450unpackedbytes는 이전
849000/4116000을 초과한다. 실제 실패를 보존하고 entries602와 최소1000byte 단계852000/4125000만
적용한다. Installed browser consumer의 Full421169/Basic207723gzip도 이전420000/207000을 넘었다.
기존 실패를 보존하고 해당 cap만422000/208000으로 올린다. SVG25000과 data/path/그림/수치/coverage
기준은 그대로다. Node24 protected-release 수치는 다음 정기 배포에서 별도로 다시 측정한다.

### Inferred side legend axis clearance

기존 guide resource resolver와 side lane materializer가 같은 edge axis의 occupied extent 뒤에
기존 family gap을 적용한다. 기존 guide-layout transaction은 관련 side-axis 변경·제거 때
wrapped legend materialization을 먼저 재생해 이전 translation을 누적하지 않는다. 새 state,
cache, public action/type 또는 renderer/package ownership 경계는 없고 stored offset과
inferredOffset의 기존 소유권을 유지한다. 정확한 inference는 current/LEGEND_AND_TITLE.md가 소유한다.

### Categorical line fallback measurement checkpoint

> 과거 checkpoint 수치 포함. 현재 한도는 실행 검사에서 확인한다.

행 단위 categorical Cartesian Line의 explicit-domain unknown 색상도 기존 scale/color consumer 정책과
pathSeries grouping owner를 재사용한다. Missing/null key는 계산용 identity에서만 구분하고 semantic/raw
state에 sentinel을 추가하지 않는다. State·renderer·package 경계는 바꾸지 않는다. 실제 설치 Full gzip
422002bytes가422000을 초과하여 최소1000byte 경계423000으로만 갱신한다. Basic208440≤209000과
SVG25000, package·coverage·pixel 오차 한도는 유지한다. 자세한 동작은 Current CORE/ENCODINGS/MARKS,
검증 기록은 `impl/categorical-line-unknown/PROPOSAL.md`를 따른다.

### Explicit facet header rotation

회전 의도는 기존 facet headers의 common/row/column 설정 한 곳에만 저장한다. 생성·편집은 기존
rotation grammar로 단위를 정규화한다. 순수 `grammar/facetHeaders.js`가 저장된 유한 radians 검증을
소유하고 materializer와 persistence가 공유하므로 import 검증은 materialization에 의존하지 않는다.
기존 concrete text와 rotated bounds를 재사용하며 renderer와 public export 경계는 바뀌지 않는다.
외곽 회전 헤더 예약은 이미 있는 child margin을 한 번만 계산하고, 내부 간격과 실제 bounds 검사는 유지한다.
정확한 공개 계약은 Current COMPOSITION의 facet headers가 소유한다.

> 과거 checkpoint 수치 포함. 현재 한도는 실행 검사에서 확인한다.

새 pure validator 한 모듈로 package entries604→605다. Node22.23.1/npm10.9.8 official staging 실측은
packed856430/unpacked4139194bytes로 기존856000/4137000을 초과했다. 실제 실패를 보존하고 각각 최소
다음1000byte 경계857000/4140000으로만 갱신한다. 새 grammar에도 기존 공식 staging compaction을 적용한다.
Browser Full/Basic/SVG, coverage, 데이터, 수치·그림 오차 한도는 유지한다. Node24 protected-release 측정은
다음 정기1413-family 공개 배포에서 별도로 확인한다.

### Content-bounds facet flow kernel checkpoint

순수 `layout/facetContentFlow.js`는 전달된 cell bounds에서 독립 행/열 origin과
shared footer의 마지막 논리 column owner 및 공통 trailing edge를 계산한다.
아직 action/materialization에 연결하지 않았으므로 public API, canonical state,
renderer와 기존 출력 경계는 바뀌지 않는다. 남은 연결과 native 측정 결정은
`impl/facet-content-flow/PROPOSAL.md`가 기록하며 Current 지원으로 주장하지 않는다.


### Native facet content measurement preparation

기존 facet materializer에 내부 측정 단계를 준비했다. 실제 guide 적용과 동일한 ownership
planner로 제거할 axis component와 승격할 legend를 구분하고, 유지할 child graph와 개별 cell
header를 기존 concrete bounds/clip/text-metric owner로 측정한다. Shared bottom axis는 별도
footer 범위로 분리한다. Owner offset과 clip은 collection마다 한 번 계산해 item 수에 비례해
순회한다. 새 spacing/anchor API, 저장 상태, renderer 또는 자동 materialization 경계는 없다.
Public content layout 연결과 channel별 axis 정책은 아직 미구현이며
`impl/facet-content-flow/PROPOSAL.md`가 남은 범위를 기록한다.

### Explicit simple polygon point shapes

공유 `grammar/pointPolygon.js`가 닫힌 vertex schema, 단순성·유한 범위 검증,
불변 canonical copy와 raw area를 소유한다. `pointShapes.js`는 기존 named shape와
명시적 polygon에 같은 concrete closed-path 생성·회전·extent 규칙을 적용한다.
정규화 의도는 constant mark config 또는 semantic shape scale 한 곳에 보존하며,
renderer는 이전과 같은 concrete path만 읽는다. 자동 named range는 바꾸지 않는다.
Point materializer와 polygon highlight 교체는 기존 공통 work limit으로 할당 전
command work를 검사한다. 정확한 공개 계약은 Current MARKS/ENCODINGS/MARK_SELECTION이 소유한다.

> 과거 checkpoint 수치 포함. 현재 한도는 실행 검사에서 확인한다.

새 grammar module로 실측613entries가 이전612를 초과해613만 적용한다. Actual
packed870658bytes는870000을 넘어서 최소 다음1000byte 경계871000을 적용했다.
Unpacked4188709는4191000이내이므로 유지했다. 후속 highlight preflight까지 포함한
installed bundle은 Full433179/Basic219107gzip bytes여서 각각434000/220000으로만
올린다. SVG25000 한도는 그대로다. Search index850818bytes도 기존850000을 넘어서
851000으로만 올렸다. 실패 로그와 최종 측정은 `impl/polygon-point-shapes/EVIDENCE.json`에
기록한다. 수치·그림 오차나 데이터 한도는 바꾸지 않았으며 이 측정은 로컬 Node22 staging이다.
새 공개 registry 버전·Node24 protected release·번역 runtime 활성화는 별도 검증 사항이다.


### Fixed/field appearance integration measurement

> 과거 checkpoint 수치 포함. 현재 한도는 실행 검사에서 확인한다.

사용자 요청의 고정값/필드 전환은 기존 materialization config·semantic encoding·scale resource
owner를 재사용한다. 별도 상태 schema나 렌더러 경계를 추가하지 않는다. macOS/Node23.5.0/
npm11.18.0 staged package 실측은591entries/843246packed/4088383unpacked bytes다.
기존842000/4087000 검사는 실패했으며, 내용을 줄이지 않고 다음 최소1000bytes 단위인
844000/4089000으로만 올린다. Entries591과 browser/search/coverage 기준은 유지한다.


### Native correctness integration package measurement

> 과거 checkpoint 수치 포함. 현재 한도는 실행 검사에서 확인한다.

2026-10-20 composite Box filtering, facet derived-data/guide replay, sparse Area, and
source-facing Horizon/ECDF guides add required runtime behavior. Installed consumer
measurements on Node23.5.0 are Full423043 / Basic214385 gzip bytes, compared with the
previous recorded421644 /213862. The existing422000 /214000 checks failed and are
not reported as passing. The minimum1000-byte ceilings become Full424000 /Basic215000;
SVG25000 and package entry/packed/unpacked limits remain unchanged. Final identical
facet guide reuse avoids rebuilding completed panels without changing exports or
explicit guide creation semantics. This is a measured correctness-feature allowance,
not a bundle optimization claim.

## 읽기 전용 전환 장면과 외부 재생기

사용자가 2026-10-22 승인한 분리 구조에 따라 `ggaction/scene`의
`createTransitionScene(program)`은 버전 1 장면 계약을 제공한다. 기존 selection의
멤버 정보를 도형 대응 키로 투영하고, renderer 내부 공유 SVG serialization은
완성된 graphicSpec과 불투명 키만 읽는다. scene은 직렬화 가능한 읽기 전용 파생물이며
semanticSpec, graphicSpec, trace 또는 저장 스키마에 animation 상태를 추가하지 않는다.
범위와 제한은 docs/api/rendering.md의 Transition scenes가 소유한다.
별도 `@ggaction/transition` 패키지가 장면 비교, 브라우저 재생, interruption을 소유한다.


### Combined release integration

The release integration retains both independently developed action families and the translation fixes. Native line color fallback and density split grouping share one path-series owner with explicit scale and grouping inputs. Inferred side legend reflow compares current axis ink and retains grouped block offsets; explicit placement stays authored. Facet content anchors retain their concrete content boundary, while rotation, field titles and the shared top lane retain their dedicated layout owners. Source editing carries the existing canonical header configuration into the first rebuild instead of materializing a temporary default header recipe.

The extracted SVG serializer preserves concrete clipping, multiline text and default SVG output; the separate read-only scene entry reuses it. Named semantic layer lookup remains in the shared selector. Public declarations, current contracts, compact action data, documentation generation and tests describe the combined surface.

2026-10-22 사용자가 `createTransitionScene(program, {format: "canvas"})`와
`renderTransitionScene(scene, context, {pixelRatio})` 공개 계약을 명시적으로 승인했다.
기존 version 1 SVG 계약은 유지한다. Version 2는 동일한 불투명 correspondence key와
순서·offset·clip을 갖고 SVG 대신 이미 materialize된 concrete properties를 보존한다.
두 형식은 `renderers/transitionScene.js`의 순회 한 곳을 공유한다. Canvas adapter는
이 장면을 temporary graphicSpec으로 배치해 기존 native renderer를 호출한다.
시간·보간·중단은 별도 transition 패키지 책임이며 semanticSpec, action trace나 project
저장 schema를 변경하지 않는다. 정확한 계약은 docs/api/rendering.md가 소유한다.

### Cartesian title label-relative offset measurement

Cartesian 제목은 기존 `guideConfigs.axis[id].title.offset` 한 곳에 숫자 또는 닫힌
`{from:"labels",gap}` 의도를 저장한다. 기존 guide materializer가 같은 owner의 실제
레이블 bounds로 local numeric geometry만 계산하며 renderer나 추가 저장 owner는 없다.
Whole-axis edit의 형제 교체 scope는 materialization owner의 private context에서만 유지한다.
정확한 계약은 Current AXES와 공개 axes 문서가 소유한다.

macOS/Node22.23.1 installed canonical consumer의 Full452644/Basic231356gzip bytes가
기존452000/231000을 초과했다. 이전 실패는 구현 검증 기록에 보존하고 기존1000byte
최소 단위에 따라453000/232000으로만 갱신한다. SVG25000, package624entries 및
902000packed/4272000unpacked, storage quota, coverage, 오류·수치·픽셀 기준은 유지한다.
이 수치는 새 registry 배포나 활성 번역 runtime 채택의 증거가 아니다.

같은 canonical source의 Node24.22.1 실제 archive는903474bytes로 기존902000을
초과했다. Node22.23.1 archive901292bytes와624개 entry의 path/content SHA/size/mode/type/link를
비교해 차이0을 확인했다. 두 archive bytes·SHA는 다르므로 같은 archive로 주장하지 않는다.
이 별도 측정 검토 뒤 packed 한도만 최소1000byte 단계904000으로 갱신한다.
624entries/4272000unpacked 및 위의 나머지 기준은 유지한다.

### Prospective guide sibling validation

기존 generic materialization planner는 normalized/dedup plan과 다음 step index를 실행 중
private context로만 노출한다. Guide resource owner가 기존 axis selector로 같은 owner의
실제 미래 title leaf를 확인하면 이전 numeric title과의 중간 충돌만 미룬다. Title leaf와
outer guide transaction의 최종 geometry/Canvas/collision 검사는 유지한다. Immutable step
반환·중첩 실행은 이전 context scope를 복원하고 실패 branch는 이전 program을 바꾸지 않는다.
새 공개 옵션·저장 owner·renderer 의미 해석은 없다. 정확한 동작은 Current CORE가 소유한다.

Node24.22.1 실제 installed consumer에서 Full453148/Basic232016gzip bytes가 직전
453000/232000을148/16bytes 초과했다. 필요한 owner 검증과 final collision 검사는 줄이지 않고
별도 측정 검토 후 기존1000byte 최소 단계454000/233000으로만 갱신한다. Canonical table과
README도 같은 값을 명시하며 보호 documentation-truth test는 바꾸지 않는다. SVG25000,
package624entries/904000packed/4272000unpacked, storage·수치·픽셀·오류·coverage 기준은 유지한다.


Whole-axis edit도 기존 prospective planner를 연속된 wrapped leaf edit 구간에 재사용한다.
기존 removal 순서는 유지하며 numeric 제목과 레이블이 같은 새 axis frame으로 이동한 최종
형제 상태를 검증한다. Planner context는 반환 시 복원되고 실제 최종 충돌·focused label-only
충돌은 계속 거절한다. 정확한 aggregate 동작은 Current AXES가 소유한다.

공식 package staging은 기존 JavaScript compaction 대상에 complete-axis edit owner를 포함한다.
원본 파일과 공개 action 이름·저장 schema·파일 allowlist는 유지한다. 앞선 실제 CI의
904236packed 초과 실패를 보존하고, Node22.23.1 canonical staged 실측은624entries,
901255packed/4262868unpacked bytes다. 기존904000/4272000 및 browser·storage·수치·기하·coverage
한도는 모두 유지한다. 설치한 package의 whole-axis 이동·복원·persistence·실제 충돌 거절을
기존 공개 API consumer case에서 함께 검증한다. 이 로컬 측정은 새 registry 배포나 Node24
전체 검증을 대신하지 않는다.

### Linked layers and explicitly targeted composition edits

결과 추종 overlay는 `layer.derivedBindings.overlay`에 독립 source mark 참조와 정책을 보유한다.
source mark materialization 및 dependency planner가 명시적으로 overlay materializer를 실행한다.
`layer.source`의 소유 자식 관계와 혼용하지 않는다. Renderer는 기존 line/point graphic만 소비한다.

Concat의 `compositionSpec.share`와 `align: "plot"`은 부모가 소유한다. canonical child의 authored
scale/domain/Canvas는 보존하고 부모 materializer가 공유 domain과 정렬된 render snapshot을 파생한다.
source child/spec identity WeakMap은 최적화일 뿐 영속 상태나 전역 자동 compiler가 아니다.
Concat 범례 수집은 `compositionSpec.legends`가 소유하고 materializer의 단일 collection plan이
visible block, canonical edit target, 제거할 snapshot root와 parent frame을 함께 결정한다.
별개 의미의 범례는 합치지 않고 바깥 lane에 배치하며, 공유 color의 호환 설명만 중복 제거한다.
Scoped dispatcher와 앱 direct editor는 같은 plan을 사용해 숨겨진 child 사본의 공간 검사를 제외한다.
기본값·옵션·복원 계약은 COMPOSITION.md가 소유한다.
Full action wrapper의 명시적 target selector dispatcher는 같은 native action을 immutable 후보들에
적용한 다음 변경된 조상 snapshots를 한 번 갱신한다. 사용자가 요청한 target dispatch에만 동작한다.


## Immutable composition snapshot transfer

2026-10-25 전체 감사 개선·필요 API 사전 승인에 따라, composition/facet materializer는 이미 materialize된 child snapshot을 내부 concrete transfer에서 한 번의 immutable map copy로 붙인다. Domain materialization action은 계속 trace에 남으며 semantic compiler를 추가하지 않는다. Named subtree cleanup은 공개 editGraphics의 atomic ID-array removal을 사용한다. 의미·좌표·그리기 순서·snapshot namespace는 그대로이며 renderer는 여전히 graphicSpec만 소비한다. 개별 property의 무의미한 재입력과 facet guide별 전체 map 복사를 제거한다.

## Guide 표시 상태 (2026-10-25)

사용자가 전체·부분 guide `visible` API 제안을 “이 API로 진행”으로 승인했다.
축·범례의 `guideConfigs` visibility와 grid.visible이 표시 의도를 보존한다.
기존 guide layout transaction은 상대 anchor 계산 전에 이전 visibility paint를 복원하고,
완료된 guide 그래픽에만 opacity mask를 적용한다. 원래 opacity는 materializationConfigs의
guideVisibilityPaint에 guide owner/item ID로 보존하여 임의 색·선 굵기를 손실하지 않는다.
Parallel은 기존 차원별 materializer에서 동일 intent를 item paint로 해결한다.
Renderer는 변경하지 않고 완성된 graphicSpec만 소비한다. 표시 토글은 공간을 재배치하지 않는다.
공개 계약과 검증은 current AXES/GRID/LEGEND_AND_TITLE 및 guide-visibility.test.js가 소유한다.
새 공개 옵션을 유지한 editLegend compact card의 실측 4446 bytes를 위해 해당 단일 한도만
4400에서4446으로 조정했다. 기존 한도를 통과했다고 보고하지 않는다.
새 materialization module 1개로 package entry 한도를646에서647로만 늘렸다.
패키지 크기 한도는 변경하지 않았고 package artifact 검사를 통과했다.


### 복합 sample 범례의 기존 owner 확장

`grammar/colorSizeLegend.js`가 continuous 두 채널과 interval hue/size + ordinal shape의
binding/대표값 validation을 소유한다. 기존 `legend.colorSize` owner에 선택적 shape binding과
hue channel을 기록하고, `legendBlocks`/facet/encoding removal은 같은 channel/scale descriptor를
사용한다. Glyph는 기존 Point materializer와 concrete bounds를 공유하며 renderer 경계는 변하지 않는다.

공통 tagged value encoding은 `core/valueEncoding.js`가 소유하고 persistence codec과 item/resource digest가 재사용한다.
복원 검증은 읽기 전용 `materialization/resourceState.js`를 호출하며, action 실행이나 그래픽 재계산을 하지 않는다.

### 복합 경로의 공통 geometry owner

`grammar/pathTopology.js`는 command shape·전체 한도·subpath topology를 소유한다.
`grammar/pathGeometry.js`는 기존 exact cubic extrema와 adaptive flatten·arc·winding·distance를
소유하고 bounds와 clip이 이를 공유한다. `pathCommands.js`는 공개 grammar 검증과 legacy 저장
검증을 분리한다. Renderer는 materialized commands와 fill rule만 소비하고 scene은 같은 clip을
전달한다. 정확한 값과 호환성은 [PRIMITIVES](contract/current/PRIMITIVES.md)와
[저장 및 scene 계약](contract/current/PRIMITIVES.md#compound-path-persistence-and-scenes)에 둔다.

복합 geometry의 새 private module로 entry 실측은672이며 기존671을 초과한다.
최종 계측은 Node22.23.1/npm10에서 packed1,002,150bytes, unpacked4,683,082bytes다.
같은 source의 CI Node20/22 Linux·macOS 압축 실측은1,004,363bytes, Windows는1,004,352bytes다.
이전 packed1,001,000/unpacked4,669,000 한도 실패를 보존하고 entry672,
packed1,005,000/unpacked4,684,000으로 지원 환경의 실측을 포함하는 최소 천 byte 단위만 조정한다.
로컬 압축값만으로 정한1,003,000 한도는 CI에서 실패했으며 해당 실패는
[CI run40576335578](https://github.com/ggaction/ggaction/actions/runs/40576335578)에 보존한다.
Installed Full browser gzip은 Node24 CI에서507,419bytes로 기존507,000 한도를 초과하여
508,000으로만 조정한다. Basic286,000/SVG25,000 한도는 유지한다. 해당 기능·타입 consumer들은
통과했으며 크기 실패는 [CI run40578989389](https://github.com/ggaction/ggaction/actions/runs/40578989389)에 보존한다.
일반·수치·pixel·coverage 검사는 완화하지 않는다.

Parameter/computed v2 통합의 동일 staged artifact는 Node 20.20.2·22.23.2·24.22.1에서
685 entries, packed 1,025,570/unpacked 4,771,436 bytes였다. 같은 minified browser bytes의
최대 gzip은 Full 516,039, Basic 297,089, SVG 8,130 bytes다. 실제 증가분을 반영해
최소 1,000 bytes 단위 package/browser ceiling을 갱신했다. Basic은 생성 경로만 추가하고
parameter revision planner를 import하지 않는다. 이전 Node22 compressor 차이로 인한
기존 ceiling 실패도 이 지원 matrix 측정으로 해결했다.

### 조건부 인코딩과 명시적인 소비자 갱신

조건부 position·text·appearance는 `layer.conditionals[channel]` 한 곳에 branch intent와 exact
parameter/selection refs를 보존한다. 일반 encoding/config에 otherwise를 복제하지 않는다.
기존 encoder의 deferred normalization을 재사용하고, topology와 final item grain을 검증한
뒤 domain action이 scale/mark/guide materialization을 명시 호출한다. Selection property로
연결된 mark dependency는 cycle을 거부하고 정렬된 영향 closure로 갱신한다. Facet scale
collector와 resource reference collector는 비활성 branch도 live consumer로 취급한다.
Point glyph의 geometry 이전 mapping과 나머지 appearance의 기존 mark output 단계는
같은 first-match grammar를 사용한다. Selection은 chosen raw channel value를 검사하고
실제 그래픽 identity로 drawing-order 변경에 대응한다. Renderer 경계는 변하지 않는다.
정확한 지원 채널, 단일 binding 범례와 empty-domain 규칙은 current/ENCODINGS가 소유한다.


위치의 pure 허용 정책은 `grammar/positionPolicies`가 한 번 소유하고 action preview와
stored branch 검증이 같은 정책을 사용한다. `materialization/positionPolicy`는 program의
명시적인 mark 설정을 pure 정책에 전달하는 경계다. Primitive renderer는 조건식을 읽지 않는다.
Native item/vertex 계산이 각 branch 값을 검증한 뒤 선택된 값을 기존 stack·radial·path 계산에
공급한다. 라벨과 overlay는 그 item에 선택된 binding의 일시적인 view를 사용하며, 이 view를
새 semantic state나 graphic state로 저장하지 않는다. Source-label·interval bounds·point layout의
selection 의존성까지 scale 계산 전에 순환을 검사한다. 정확한 조건부 채널/원점/단위/오류와
진단 의미는 [ENCODINGS](contract/current/ENCODINGS.md)와 [MARKS](contract/current/MARKS.md)가 소유한다.
### Structured paint materialization and Text output

Paint normalization은 grammar/paint.js, 공통 색상은 grammar/color.js가 소유한다. Mark/guide domain
materializer가 pattern 기준점과 Text fillBounds를 명시적으로 계산하여 concrete graphic에 저장하며,
renderer는 semantic coordinate나 text width를 재추론하지 않는다. Pattern foreground의 공통 bounded
geometry를 Canvas/SVG가 공유하고 여러 alpha layer는 기존 isolated glyph owner로 한 번 감쇠한다.
Native radial output은 affine frame을 실제 fill까지 유지한다. Text는 concrete bounds로 bounded
paint texture를 준비하고 기존 native glyph에 적용한다. Native glyph overhang 때문에 gradient texture는
viewport의 역회전 범위를 덮으며 glyph shape를 bounds rectangle으로 바꾸지 않는다. SVG text는 vector
paint resource를 소비한다. 정확한 값/제한/출력 차이는 current/MARKS.md의 shared structured fill이 소유한다.

### Font identity와 explicit measured typography

Font authoring은 다른 retained asset과 동일하게 host 준비와 동기 immutable commit을 나눈다.
Full registry의 font resource는 source identity와 bytes만 소유한다. Exact text metric profile은
명시 font refs와 byte/provider identity를 가진 별도 materialization policy이며, 기존 schema 1
estimate 의미를 바꾸지 않는다. Host 준비는 기존 typography rematerialization을 bounded private
candidate에서 실행해 필요한 width query closure를 수집하고, 누락 측정은 오류로 유지한다.
원래 receiver/token에 적용하는 domain action만 resource/profile/graphics를 함께 바꾼다.

Text의 기존 domain owners가 공통 materialization/textFont를 호출해 concrete Text에 실제 font
payload를 붙인다. Renderer는 semantic resource나 measurement profile을 읽지 않는다. Browser
Canvas/scene은 ephemeral registration handle, SVG는 embedded font 정의, PNG/PDF는 native
registration lease로 같은 bytes를 소비한다. Native engine이 같은 bytes의 여러 alias를 공유하므로
library adapter는 content별 참조 수를 유지해 마지막 출력이 끝날 때 해제한다. 실제 glyph alpha
준비 역시 공통 concrete Text renderer를 사용하고 bounds rectangle을 glyph로 대체하지 않는다. 일반 Canvas와 native PNG/PDF의
unbound text는 renderer/text의 공통 대체 글꼴 순서를 사용한다. Native adapter는 설치된
family로 필터링하며, exact font binding의 준비된 별칭은 이 경로를 우회한다.
이 정책은 concrete text나 semantic layout을 다시 계산하지 않는다.
정확한 public shape/상한/오류/생활주기는 [CORE](contract/current/CORE.md)와 rendering 문서가 소유한다.

## Graph layout ownership

`actions/graphs/layouts.js`는 명시 graph layout 계산과 graph revision의 dependent layout closure를 소유한다. `actions/layouts/index.js`의 공통 editLayout은 source domain의 편집 body로 전달한다. Pure fixed/circular/force kernel은 topology를 보존하며, `materialization/graph/layoutResource.js`가 exact graph input과 resolved intent·결과를 저장한다. 복원 validator는 stored coordinates·node membership·pins·component bounds와 provenance만 검사하며 force solver를 재실행하지 않는다. Source revision은 계산한 모든 layout 결과를 기존 prepared primitive 경계로 원자적으로 교체한다. 정확 API는 [GRAPHS](contract/current/GRAPHS.md)와 [LAYOUTS](contract/current/LAYOUTS.md)가 소유한다.

Graph plot의 필터는 기존 mark appearance config의 view recipe를 명시적으로 소비한다.
`actions/data/graphFilter`가 완전 후보를 preflight한 뒤 기존 wrapped graph materializer를 호출하고,
`materialization/graph/view`가 원래 node·edge geometry에서 induced subset을 선택한다. 공통
item selector 검증은 `selection/itemSelection`이 소유한다. Graph/layout resource와 renderer 경계는
유지하며 정확한 재평가·제거 계약은 [MARK_SELECTION](contract/current/MARK_SELECTION.md)이 소유한다.

공개 graph layout 추가 뒤 Node20 실측은803entries/1,183,611packed/5,437,539unpacked bytes다.
최소 한도는803/1,184,000/5,438,000으로 조정했다. Full gzip590,274는591,000으로만
변경하고 Basic342,113은343,000 한도 안이다. Search900,853bytes는901,000 한도로 반영한다.
이전 한도 통과로 보고하지 않는다.
### Pre-fill outline ownership

외곽선 요청은 기존 mark appearance config 한 곳에 저장하고 `grammar/markOutline.js`가 닫힌 값을 검증한다.
각 domain materializer가 호출하는 기존 final mark-output 단계에서 concrete outline을 명시적으로 적용한다.
일반 stroke 값은 복원을 위해 유지하며 renderer가 outline 우선순위와 contour→fill 순서를 소비한다.
Selection의 명시적인 stroke highlight만 일시적으로 outline을 제거한다. Point packing/jitter는 동일한
가시 edge 폭을 배치 전에 사용하고, 범례·라벨은 완성된 owner에서 경계를 읽는다. Text는 기존 glyph
line/origin을 유지하며 partial opacity isolation은 visible frame 안의 실제 글자를 보존한다. 공유 image
schema나 새 semantic compiler를 도입하지 않는다. 정확한 공개 계약과 소비자 차이는
[MARKS](contract/current/MARKS.md#pre-fill-outlines-and-halos)가 소유한다.

이 outline checkpoint의 runtime owner2개로 packed entries761→763을 실측했다. Canonical staging 최대값은
Node20/24 packed1,131,929, unpacked5,212,872bytes이며 한도는763/1,132,000/5,213,000으로 최소 조정한다.
지원 Node의 설치 bundle 최대 실측 Full556,491/Basic333,073bytes에 따라 한도는557,000/334,000이다.
SVG25,000은 유지하며 기존 한도의 최초 실패와 실제 소비 archive는
[OUTLINE](impl/roadmap9/phase4/paints/OUTLINE.md)에 보존한다.

Outline과 image/H 통합(기준 `02e2f63ef`)은 양쪽 owner를 유지한다. 같은 chart에 hierarchy resource,
outline mark, retained image를 두고 source revision·codec·prepared image stale preflight·Canvas scene을
교차 검증한다. 합산 canonical packed entry794, Node20 packed1,177,323/unpacked5,410,308bytes에 맞춰
한도는794/1,178,000/5,411,000이다. 합산 Full gzip581,143은 기존581,000을143bytes 초과하여582,000만
허용하고 Basic342,894/SVG는 기존343,000/25,000 안에 있다. 개별 기능의 이전 측정을 합산 결과로 대신하지 않는다.

통합 search-index 실측896,003bytes는 이전896,000을3bytes 초과한다. 현재 모든 페이지/액션을 유지하며
공유 canonical search cap만 최소1000단위897,000으로 조정한다. 최초 source2개 및 built 링크 검사 실패와
해당 입력 수정 뒤 재검증 결과는 outline 통합 evidence가 보존한다.

GraphPlot 입력 layout의 닫힌 method vocabulary는 core/vocabulary.js 한 곳이 소유한다. Graph selector와 grammar normalizer가 이를 함께 읽으며 selector는 layout 계산기를 import하지 않는다.
Node20 canonical graph-plot staging810entries, packed1,193,083/unpacked5,488,863bytes에 맞춰 package cap810/1,194,000/5,489,000으로 최소 조정한다.


null/default 및 복원 limit 검증을 보강한 최종 graph-layout source는 Node20에서
1,183,749packed/5,438,055unpacked bytes다. Packed 한도는 유지하고 unpacked만5,439,000으로
최소 조정한다. 이전5,438,000 한도 초과55bytes를 통과로 표시하지 않는다.

동일 final archive의 Node20 browser 실측은 Full590,307/Basic342,113bytes이며 두 기존 한도591,000/343,000 안이다.

GraphPlot와 outline을 합친 source7659f0f7f archive의 Node20 bundle은 Full595,806/Basic345,437bytes다. 기존591,000/343,000 한도를 초과하여 실제값 기준 최소596,000/346,000으로 조정하고 README와 현재 표를 동기화했다.


### Exact font and resource-backed label integration

Font와 GraphPlot의 결합에서 tree/treemap/graph label의 concrete Text도 기존 font binder를
호출한다. 공통 typography rematerialization은 저장된 layout resource를 소비하는 domain
materializer만 실행하며 layout/force 계산은 재실행하지 않는다. Font 교체·제거·codec와
Canvas/SVG/PNG/PDF/scene 교차는 `font-resource-labels.test.js`가 소유한다.
Node20/22 canonical staging은 동일821 entries/5,551,125 unpacked bytes이며 packed 최대값은
1,208,302 bytes였다. 통합 한도는 최소821/1,209,000/5,552,000으로 조정한다. Node20 browser
gzip Full600,160/Basic348,432 bytes에 따라601,000/349,000만 적용하고 SVG25,000과
수치·coverage 한도는 유지한다. 초기 한도 초과를 integration evidence에 보존한다.
### 그래프 추론 공개 연결의 package 경계

관측 graph와 같은 model로 연결한 여섯 inference rule, exact/approximate search, 저장 검증과
source/candidate revision closure가 Full bundle에 포함된다. Node20 실측은 Full612,463/Basic345,748gzip bytes다.
Full 한도를596,000에서613,000으로 최소 조정하며 Basic346,000과 SVG25,000은 유지한다.
패키지 실측814entries/unpacked5,535,332bytes이며 packed는 Node22 1,200,162,
Node20 1,203,209bytes다. 이 실측에 맞춰814/1,204,000/5,536,000 한도를 적용한다. Basic은 inference action과 resource를 등록하지 않는다.

### Shared per-item blend materialization

기존 semantic mark.blend owner를 9개 일반 mark에 공유한다. 각 domain action이 명시적으로 pure capability
검증과 semantic write를 수행하고 기존 final mark-output 단계가 concrete mode를 적용·제거한다.
Bar geometry owner의 중복 blend 처리는 제거한다. Renderer는 같은 concrete glyph를 소비하며 circle/line/text도
기존 isolated glyph owner 및 SVG serializer를 사용한다. 별도 compiler/group transaction/registry를 추가하지 않는다.
정확한 값·상속 소비자·렌더링 경계는 [MARKS](contract/current/MARKS.md#per-item-blend-modes)에 둔다.

### Explicit prepared per-glyph effects

Shadow intent는 기존 mark appearance에 한 번 저장하고 final mark-output에서 명시적으로 concrete 값으로 만든다.
동기 Canvas/SVG는 exact graphic identity·digest·density에 묶인 private 준비 handle을 소비한다. Native PNG/PDF는
같은 준비 owner를 호출한다. 실제 glyph RGBA와 공통 pure blur/composite를 거친 image payload는 ephemeral하며
program이나 codec에 backend 객체를 넣지 않는다. Text ink 측정은 기존 font/line/origin을 바꾸지 않는 준비 단계이고,
layout reflow나 semantic compilation이 아니다. 준비된 exact font와 실제 glyph drawer를 재사용한다.
공통 bounds owner는 occupied effect 범위를 별도로 계산하며 selection/hit은 원래 source geometry를 유지한다.
정확한 지원·수명·한도는 [MARKS](contract/current/MARKS.md#prepared-per-item-shadows)가 소유한다.

Shadow source checkpoint의 실측은815 entries / unpacked5,516,118 bytes이며 packed는 Node22의1,198,723과
Node20·24의1,201,262 bytes이다. 동일 내부 파일의 압축 차이를 반영해 cap은815/1,202,000/5,517,000이다.
동일 Node22 archive의 minimal installed Vite는 Node22에서 Full585,965/Basic346,504/SVG20,051gzip,
Node20에서586,754/347,170/20,191gzip bytes로 측정되어 각각587,000/348,000/25,000 cap을 사용한다.
Exact support와 lifecycle은 Current에, 최초실패와
최종 고정 archive의 Node별 qualification은 paints/shadow-evidence에 분리 기록한다.


### Private hit 좌표 계산 경계

`grammar/hitCoordinates.js`는 explicit client point/rect와 root·child affine matrix를 받아
CSS-local→geometry-local 좌표를 계산하는 private 순수 owner다. DOM/DPR/semantic resource를
읽거나 program·trace를 변경하지 않는다. Singular/overflow/empty viewport는 no-hit diagnostic이며
모든 입력과 최대1024 child work를 계산 전에 검증한다. Existing pathGeometry/graphicClip/graphicTree와
scene identity 소유권은 유지된다. 공개 interaction entry와 exact geometry/index/frame 소비자는
아직 연결되지 않았으며 [private 범위 기록](impl/roadmap9/interaction/STEP047.md)이 잔여 의무를 구분한다.

Private 좌표 owner 한 파일을 추가한 뒤 packed content는816entries/5,520,464unpacked bytes,
Node22 packed1,200,158/Node20·24 packed1,202,819bytes였다. Package cap을816/1,203,000/5,521,000으로
최소 갱신했다. Full/Basic/SVG import graph에는 새 owner가 아직 없으므로 browser bundle 한도와 지원 계약은 같다.


Private hit 도형 계산은 `grammar/hitStroke.js`가 local painted stroke, `grammar/hitShapes.js`가 explicit
CSS transform·clip·opacity와 filled geometry 판정을 소유한다. 기존 pathGeometry/strokeStyle owner를
재사용하며 semantic state나 renderer를 읽지 않는다. Text는 explicit resolved line boxes, Image는
viewport로 제한하고 scene adapter/index/frame은 후속 경계다. 자세한 범위는 같은 STEP047 기록에 둔다.
두 파일을 추가한 package는818 entries/5,541,801unpacked, packed 최대1,208,456bytes로 측정했으며
cap을818/1,209,000/5,542,000으로 최소 갱신했다. Public entry와 browser import graph는 변하지 않는다.


`grammar/hitIndex.js`는 현재 owned CanvasScene identity와 명시 node/semantic mapping을 결합하는 private
순수 공간 인덱스다. BVH broad phase와 기존 hitShapes narrow phase를 분리하고 누적 work를 제한한다.
Row/resource lineage는 입력의 exact ref를 보존하며 의미 중복만 합친다. Renderer/semantic state/codec에는
새 저장 값을 추가하지 않는다. Guide materializer와 public runtime 연결은 [STEP048](impl/roadmap9/interaction/STEP048.md)에 남긴다.
실측819 entries/5,552,006unpacked/최대1,210,811packed bytes에 cap819/1,211,000/5,553,000을 적용했다.
### Flow data and layout ownership

Flow는 observed graph의 exact source identity와 resource revision을 재사용한다. 순수
`grammar/flow`가 conservation·SCC·배치를 계산하고 `materialization/flow`가 저장 결과 검증과
concrete node/ribbon 생성을 소유한다. `actions/flow`는 graph→layout→mark/label/selection
closure를 preflight하고 wrapped materialization을 호출한다. Renderer는 최종 graphicSpec만
읽는다. 정확한 공개 계약은 [FLOWS.md](contract/current/FLOWS.md)가 소유한다.

Flow 공개 확장으로 package entry는819, Node20/24 packed 최대1,200,981bytes,
unpacked5,522,719bytes로 측정되어 한도를819/1,201,000/5,523,000으로 최소 단위 갱신했다.
동일 minified JS의 Node20/22/24 gzip을 비교해 Full 최대601,073, Basic344,083bytes를
확인하고 한도를602,000/345,000으로 갱신했다. SVG25,000과 기존 coverage floor는 유지한다.
Flow 두 문서 및7action의 검색 색인은913,578bytes여서914,000으로 갱신했다.

### Resource role effects and image source masks

Graph/H/Partition/Flow의 기존 role appearance config가 outline/shadow intent를 단독 소유한다.
공통 pure effect 정규화와 concrete false 제거를 재사용하지만 각 domain materializer가 명시적으로
실행한다. Layout 계산이나 semantic compiler를 추가하지 않는다. Image shadow preparation은
한도 검증 후 exact source payload를 기존 image decoder로 읽고 실제 alpha를 같은 glyph 합성기에
넘긴다. 준비된 pixel mask는 ephemeral하며 image resource·원래 item identity·hit geometry를 바꾸지 않는다.

### Integrated resource effect consumer budget

The combined inference, Flow, prepared glyph shadows and P2 resource/image consumer source
contains 863 published entries. Canonical staging measured 1,258,299 packed and 5,801,784
unpacked bytes on Node20/22/24 before the equal-length README ceiling correction.
The installed archive measured Full634,881/Basic359,550/SVG20,196 gzip bytes on Node20
and Full633,808/Basic358,837/SVG20,055 on Node22. The current budgets therefore become
863 entries, packed1,259,000/unpacked5,802,000 and Full635,000/Basic360,000/SVG25,000.
These retain every module and public option; the final fixed archive receives installed
consumer qualification separately from this measurement.


Private hit index를 resource effects 공개 baseline f1800607d와 통합한 package는867 entries,
unpacked5,837,672/packed Node22 1,267,560 및 Node20/24 1,270,493bytes다. 한도는867/1,271,000/5,838,000이다.
Private hit owner는 Full/Basic/SVG public import에 들어가지 않으므로 기존 public bundle 경계는 유지한다.


### Private current-frame lifecycle

`interaction/hitFrame.js`는 외부 sampler가 제공한 explicit scene/entries/version을 받아 현재 index를 소유한다.
새 순수 index 준비가 끝난 뒤 한 번에 교체하고 늦은 version은 폐기한다. Dispose는 현재 참조를 해제한다.
Program/trace/codec와 renderer는 바꾸지 않으며 DOM/event/RAF를 만들지 않는다. Exact public interaction 및
035/guide/animation 소비자 경계는 [STEP049](impl/roadmap9/interaction/STEP049.md)의 잔여 의무로 유지한다.
이 source 추가 후 package868entries/5,840,161unpacked/최대1,271,149packed bytes에 cap868/1,272,000/5,841,000을 쓴다.

실제 마크 hit 연결은 `sceneSnapshot.js`가 기존 scene의 onNode association을 ephemeral하게 보유하고,
`interaction/hitProgram.js`가 이미 materialized된 item identity와 exact child namespace를 읽는 방식이다.
Semantic grouping이나 materialization을 다시 실행하지 않는다. `interaction/hitConcrete.js`는 기존
Text metrics의 줄별 영역과 path/stroke/clip owner를 재사용하여 같은 scene의 geometry를 준비한다.
Public scene schema와 renderer 입력은 유지하며 가이드와 공개 session은 후속 연결이다.
[Adapter 기록](impl/roadmap9/interaction/ADAPTER.md)이 현재 범위와 남은 소비자를 구분한다.
이 concrete adapter checkpoint의 package는871entries/5,849,189unpacked, Node22 1,270,580packed,
Node20/24 1,273,444packed bytes다. Cap은871/1,274,000/5,850,000으로 최소 조정했다.
Public Full/Basic/SVG import graph에는 private hit owner가 없으며 CanvasScene은 기존 version2 shape를 유지한다.

통합 graph view·theme·actual hit adapter는876entries/5,868,706unpacked, Node20packed1,278,262bytes다.
현재 cap은876/1,279,000/5,869,000이며 설치 bundle Node20Full637,955/Basic362,086gzip에
638,000/363,000 cap을 적용한다. Private hit adapter는 공개 interaction API의 완료를 뜻하지 않는다.


### Graph selection과 명시 재추론 경계

Graph view의 filter/restore wrapped owner는 Full graph registration에 속한다. 공통
`filterMarks`는 lightweight selector로 graph mark를 판별하고 이 owner에 dispatch한다.
따라서 Basic은 graph inference/layout kernel을 filtering import로 끌어오지 않는다.
재추론의 선택 intent는 기존 graphPlot.view에 단독 저장하고, private graphSubset transform은
기존 immutable derived-data identity/lineage/revision owner를 재사용한다. 원본 topology를
기준으로 선택한 typed key를 저장하며 graph→layout→consumer closure의 순수 prepared plan을
검증한 뒤 명시 child action으로 commit한다. Renderer는 기존 concrete graphicSpec만 읽는다.
Exact option과 source/replace/remove 의미는 MARK_SELECTION current contract가 소유한다.

Graph recompute의6개 작은 owner로 package882entries/5,885,200unpacked/Node22packed1,279,959bytes를 측정했다.
현재 packagecap은882/1,283,000/5,886,000, Fullbundle640,278gzip측정에641,000cap을 적용한다.

### Contour integration on the shared resource boundary

Contour의 `geometry` resource는 grid/density 계산·bounded stored-result 검증을 domain owner에
두고, 기존 exact ref registry와 data revision hook을 재사용한다. 동일 source의 geometry 후보를
전부 preflight한 뒤 shared scales/marks/guides union을 한 번 materialize한다. Path의 FillPaint와
outline/shadow는 공통 효과 owner를 사용하며 renderer는 concrete graphicSpec만 읽는다.
정확한 공개 계약은 [CONTOURS](contract/current/CONTOURS.md)가 소유한다.

main f1800607d 통합의 실제 package 880 entries, Node20/24 packed1,276,997 /
unpacked5,875,172 bytes와 같은 minified bytes의 gzip Full643,501 / Basic361,202 / SVG20,196을
기준으로 한도를 880 / packed1,278,000 / unpacked5,876,000 및 Full644,000 / Basic362,000으로
갱신한다. Packed 한도는 측정값의 1,000-byte 경계가 3 bytes밖에 남지 않아 다음 1,000-byte
경계를 사용하며 최종 tar에서 다시 검증한다. SVG25,000 및 source coverage floors는 유지한다.
### Public inspection session boundary

공개 `src/interaction.js`와 `types/interaction.d.ts`의
`ggaction/interaction`은 Full/Basic authoring import와 분리된 browser-safe controller entry다.
`interaction/session.js`가 DOM listener와 transient inspect/current-frame lifetime을 소유하며,
program action/selection/history를 만들지 않는다. `sceneFrame.js`는 host가 전달한 concrete frame을
bounded own-data snapshot으로 고정한 뒤 기존 renderer scene validation을 재사용한다.
기존 scene/source identity로 metadata를 연결하고 version/generation 교체를 원자적으로 수행한다.

`hitGuides.js`/`hitLegends.js`는 가이드 정책의 raw typed values와 실제 physical item 대응만 읽는다.
기존 pure tick/sample/layout resolver를 명시적으로 재사용하며 wrapped action을 실행하지 않는다.
축 표시 문자열·줄 그룹은 `grammar/axisFormat.js`와 `materialization/axisLabelText.js`가 생성과
검사의 공통 소유자다. Legend clip의 물리 그룹도 기존 `materialization/legendClip.js`가 소유한다.
Renderer는 기존 graphicSpec만 읽고 public scene schema/codec는 바뀌지 않는다.
정확한 command/return/event/지원 범위는 [INTERACTION.md](contract/current/INTERACTION.md)가 소유한다.
050 이후 편집 제스처·selection orphan/history 및 035 추가 composition 소비자는 후속 의무다.

독립 interaction bundle은 Node22 81,727, Node20/24 82,299 gzip bytes로 실측되어 한도83,000을
추가했다. Full635,000/Basic360,000/SVG25,000 한도는 그대로 통과한다. Package는879entries,
README 진입점 추가 전 최대1,281,005packed/5,879,334unpacked bytes에 최소1,000bytes
올림을 적용하여879/1,282,000/5,880,000으로 조정했다. 동일 고정 archive의 실제 후속 bytes와
Node별 설치 근거는 interaction 공개 체크포인트 기록이 소유한다.
공개 inspection API/recipe와 entry reference를 포함한 search index는945,337bytes로 기존941,000을
넘어 최소1,000bytes 올림946,000으로 조정했다. 검색 내용이나 기능을 제외하지 않았다.


### Logical item selection의 집합 연산과 scoped identity

`grammar/selectionSet.js`가 immutable key 집합의 normalize/replace/add/toggle/subtract/intersect와
누적 key 작업 한도를 소유한다. 기존 `grammar/markSelection.js`의 final-grain 평가를 모든 selection,
filter, labels, conditional 소비자가 공유한다. `actions/selection/resources.js`는 logical item set을
기존 persistent-selection resource에 명시 저장하고, action editor가 기존 dependent rematerialization을
실행한다. 새 자동 compiler나 renderer 상태는 추가하지 않는다.

`grammar/schemas/graphicIdentity.js`가 composition namespace의 추가와 제거를 함께 소유한다.
`actions/composition/targets.js`는 선택 관련 scoped action의 inspected key를 명시 childPath에 맞춰
child-local identity로 바꾼다. Child resource는 local key만 저장하며 부모 graphic snapshot은 기존
namespace를 재적용한다. 정확한 옵션/빈 집합/숨긴 키 정책은
[Mark selection](contract/current/MARK_SELECTION.md#logical-item-selection-and-set-updates)이 소유한다.

### Resource·guide·inspection 통합 검증

Contour·graph recompute·guide geometry·public inspection을 같은 source에 통합했다.
Node20 설치 minimal bundle Full649,557/Basic364,927gzip 실측에 ceiling650,000/365,000을 적용하고
SVG25,000/interaction83,000은 유지한다. Package907entries/5,994,134unpacked,
Node20packed1,307,688bytes에 ceiling907/1,308,000/5,995,000을 적용한다.
Public docs search955,504bytes는 ceiling956,000으로 최소 올림했다. Runtime owner 경계는 각 Current 계약을 따른다.

### Ordered range 계산 owner

`grammar/orderedRange.js`는 data filter와 final-item mark selector의 숫자·문자열 endpoint 검증 및 포함 판정을 함께 소유한다.
Mark selector는 기존 normalized inclusive 저장 형태를 보존하고 새로운 개별 endpoint 표기만 정규화한다.
Resource lifecycle과 materializer는 그대로이며 정확한 공개 범위 옵션은 MARK_SELECTION과 data filter Current 계약을 따른다.


### 최종 항목 AST 선택과 매개변수 폐쇄

`grammar/selectionExpression.js`는 이름 있는 선택의 AST를 기존 predicate evaluator에 위임하고,
최종 item.fields에서 참조된 필드만 bounded row로 만든다. 원본 행을 임의로 대신 평가하지 않는다.
`materialization/selection/expression.js`는 명시 parameter resource를 resolve하며, exact refs는 기존
persistent-selection.inputs 한 곳에 저장된다. 일반 inline selector의 owner와 저장 계약은 그대로 유지한다.

기존 resource primitive가 parameter revision을 selection resource/config로 전파하고, parameter domain action이
조건부 입력 재결합→데이터 revision→의존 순서의 mark/label/highlight materialization을 명시 호출한다.
시각 소비자가 없는 selection도 최종 predicate를 검사한다. 이 마지막 검사만 Full의 기존 final-item resolver가
필요하므로 Full assembly에서 constructor별 private resolver를 한 번 등록한다. Map의 handler는 frozen이고
검증 중 교체·상속 fallback·외부 plugin API가 없다. Basic parameter entry가 Full mark policy를 import하지 않는다.
정확한 값·제한·저장 형태와 지원은 [expression selection](contract/current/MARK_SELECTION.md#expression-selection)이 소유한다.

### Calendar and source resource union

`grammar/calendar/`가 명시 civil-date 집계와 grid cell/month boundary를 계산하고
`materialization/calendar/`가 exact source 검산과 concrete day/label 출력을 소유한다.
`actions/data/resourcePlan.js`는 Full source revision의 typed resource DAG를 기존 family factories로
한 번 계산하고 모든 후보를 preflight한다. 기존 private primitive authority에 exact data revision vector를
결박하여 독립 roots와 dependent layouts를 함께 교체한다. Native와 resource 소비자의 합집합은
기존 materialization planner가 scale→mark→guide 순서로 한 번 실행한다. Facet projection의 별도
logical dataset 경로 및 명시 graph edit/recompute의 prepared 계획은 그대로 유지한다. 새 pending
state·저장 callback·renderer semantic 해석은 없다. Calendar theme는 기존 resource role owner를
사용하며 정확 API와 defaults는 [CALENDAR](contract/current/CALENDAR.md)가 소유한다.

Calendar 통합 실측은920entries/6,061,365unpacked bytes이며 Node20/24 packed 최대1,319,887bytes다.
한도는920/1,320,000/6,062,000으로 최소 올림한다. 동일 minified JS의 Node20/22/24 gzip에서
Full 최대658,183/Basic367,366bytes를 확인해659,000/368,000으로 갱신하고 SVG25,000 및
interaction83,000은 유지한다. Search963,468bytes는964,000으로 올림하며 기존 global/critical
coverage floor는 유지한다. 정확 고정 archive와 최종 검증은 Calendar evidence가 소유한다.
