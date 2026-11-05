# Edge route resources

## `bundleGraphEdges`

- Signature: `bundleGraphEdges({ id, graph?, layout?, method, options?, coordinateSpace? })` 또는 `bundleGraphEdges({ prepared, requestToken })`.
- Full-only chart-authoring action이다. 명시 id와 method로 authored `edge-route` resource를 만들며 graph의 node/edge topology와 원 item key를 바꾸지 않는다. id는 기존 resource와 중복할 수 없다. layout은 explicit/current eligible/unique 순서의 fixed/circular/force graph layout이다. graph 생략은 layout의 exact input을 사용하고 명시 graph와 불일치·missing·ambiguity는 오류다.
- method는 hierarchical/force-directed/density/edge-path다. options는 own-data closed record이며 null/undefined/accessor/unknown은 거부한다. 각 method의 zeroLength는 point만 지원한다. Coincident endpoint는 동일 좌표 두 점과 zero-length 진단을 저장하며 junction이나 node를 합성하지 않는다. 빈 graph는 complete 빈 route를 저장한다.
- hierarchical: options.mapping은 모든 graph node의 원 typed nodeKey와 scalar hierarchyKey를 정확히 한 번 지정한다. options.hierarchy/hierarchyLayout은 explicit/current/unique tree 또는 treemap anchor resource를 선택한다. Tree x/y 또는 treemap rectangle center를 읽으며 mapped anchor는 graph layout 좌표와 같아야 한다. 별도 hierarchy layout을 암묵적으로 변경하지 않는다. strength 기본0.85, 범위[0,1]; tolerance 기본0.001 positive finite; maxSubdivisions 기본4096, 범위1–4096 integer다. LCA parent path를 chord와 strength로 혼합한 clamped uniform spline을 adaptive sampled M/L vector로 저장한다.
- force-directed: compatibilityThreshold 기본0.6, 범위[0,1]. Angle/scale/position/visibility compatibility와 결정적 six-cycle double-buffer 계산을 사용한다. Cycle internal samples1/2/4/8/16/32, step0.1·0.5^cycle, iterations60/40/27/18/12/8이다. 반대 directed edge는 compatibility0이며 undirected edge는 방향 correspondence를 맞춘다. Solver가 생성한 대칭·typed-order neighbor 쌍은 distance/attraction을 한 번 계산해 양쪽 force에 적용하며 각 edge의 누적 순서와 binary64 좌표를 유지한다. work diagnostics는 제거된 중복 계산을 반영하므로 resultHash도 이에 맞게 바뀔 수 있다. Candidate/sample/work 한도와 고정 반복은 그대로다. 이웃의 내부 저장 표현은 공개 결과에 포함하지 않으며, 저장 공간만 바꿀 때 기존 좌표·순서·provenance·진단값·resultHash를 보존한다.
- density: 고정256×256 density field, 20회 advection, bandwidth max(2/256,0.05·0.9^iteration), step0.005를 사용한다. Arc-length weighted density와 directed8channel을 사용하고 매 반복 boundary clamp·smooth·resample한다. 해당 고정 수치에 사용자 옵션을 추가하지 않는다. 내부 sample 저장 공간만 바꿀 때 각 weight/angle을 한 번 계산한 값과 scalar 누적·field 삽입 순서, signed zero·좌표·진단값·resultHash를 보존한다. 기존 sample/work guard와 보수적인 sample×24 및 live-sample 진단을 낮추지 않는다.
- edge-path: exponent 기본2 positive finite, maxStretch 기본2 finite≥1이다. 실제 graph adjacency의 typed-order deterministic shortest path를 사용하고 원 edge를 skip/lock한다. Stretch 이내 경로에 1/4 corner cut을 적용하며 없는 edge를 연결하거나 새 junction을 만들지 않는다. 탐색은 predecessor 상태를 한 번 보유하고 성공 경로와 정확한 cost 동률 비교에서만 경로 vector를 구성한다. Work/sample diagnostics는 실제 상태·비교·복원 비용을 반영하므로 같은 geometry/provenance에서도 구현 개선 뒤 값이 달라질 수 있다.
- 모든 method는 공통 normalized bounding frame에서 계산하고 최종 원 좌표로 복원한다. Signed zero를 포함한 원 node endpoint를 보존한다. execution 생략 시 limits의 maxNodes/maxEdges/maxCandidatePairs/maxSamples 기본 및 최대는100000/1000000/10000000/10000000이고 positive safe integer이며 더 낮출 수 있다. 공통 work budget과 route당30000 sampled command 한도도 적용한다. 한도 초과·overflow는 incomplete resource 없이 실패한다.
- coordinateSpace 기본world, screen은 현재 Canvas plot bounds를 exact job 입력으로 추가한다. 현재 GraphPlot은 layout을 translation하므로 동일 anchor 수치를 쓸 수 있다. World route는 Canvas resize에 revision이 바뀌지 않고, screen route는 새 plot bounds에서 모두 preflight한 후 다음 revision으로 한 번 갱신한다. Responsive solve와 exact plot의 guide margin 확장도 이 경계를 공유한다. 데이터와 viewport가 함께 변하면 source DAG와 독립 screen route를 하나의 후보 union으로 검증하여 각 route를 한 번 갱신하며, viewport만 바뀐 sibling의 options와 inputs는 유지한다.
- 저장 입력은 exact graph/layout refs이며 hierarchical만 exact hierarchy/anchor layout refs를 추가한다. options는 단일 해석된 수치 intent다. result는 viewport, inputHash/resultHash, complete:true, 원 edge 순서의 controlPoints/M/L commands/bounds/provenance 및 diagnostics다. Source rows는 graph와 optional hierarchy 원 참조다. Callback/worker/cache/promise/partial preview는 저장하지 않는다.
- Density 저장 diagnostics의 bandwidth는 유한 number만 허용한다. index0과 clamp floor는 exact, 나머지는 현재 공식 값에서 relative binary64 epsilon 이내(해당 schedule에서 인접1값)만 허용해 engine exponentiation의1ULP 차이를 수용한다. 저장 좌표·hash·algorithmVersion은 변경하지 않으며 engine 사이 solver 전체 bit 동일성을 보장하지 않는다.
- 저장 복원은 closed shape·refs·hash·endpoint·bounds·method provenance와 budget을 검사하며 solver를 실행하지 않는다. Hash는 정합성 digest이며 임의 JSON의 계산을 암호학적으로 인증하지 않는다. Renderer는 route resource를 읽지 않고 concrete path를 소비한다.
- `createGraphPlot({routes:id})`는 같은 graph/layout의 route를 선택한다. `editGraphPlot({routes:false})`는 native path로 복원한다. 생략은 생성에서 native, 편집에서 현재 binding을 보존한다. Node-radius trimming/arrow tangent는 concrete materializer가 맡으며 canonical route는 그대로다. Native parallelGap/loopRadius는 route를 해제했을 때 적용된다. Edge body/arrow는 route InputRef, node/label은 layout InputRef를 가지며 원 logical item key·row membership·topology를 유지한다.
- Graph/source/layout/hierarchy edit는 영향 resource DAG 전체와 소비 plot을 먼저 검사한 후 exact revision과 mark를 한 번씩 갱신한다. 실패는 old program/trace 불변이다. Restrict/cascade 제거는 live mark와 authored dependent resource를 자동으로 지우지 않는다. 먼저 plot binding 및 dependent resource를 명시 해제한다. Selection/highlight, inspection/sourceRefs, accessible export, scene, Canvas/SVG/PNG/PDF와 scoped concat을 공유한다.

### Formal values — `bundleGraphEdges`

- Implemented: `bundleGraphEdges(options: TargetedOptions<BundleGraphEdgesOptions> | ApplyGraphEdgeRoutesOptions): ChartProgram`.
- Planned: 이 action의 추가 값 없음.
- Proposed (NOT IMPLEMENTED): implicit graph inference, arbitrary bundling callbacks.

### Value coverage — `bundleGraphEdges`

- ✅ Covered: 네 계산법·typed mapping·zero/empty/budget·저장 검증·Full/Basic·source 및 layout closure·worker authority·대표 primitive 출력.
- Evidence: `test/unit/grammar/graph/routes/`, `test/unit/resources/graph-routes.test.js`, `test/unit/resources/graph-route-lifecycle.test.js`, `test/unit/resources/graph-route-host.test.js`, `test/contracts/graph-route-types.test.js`, `test/charts/edge-routes/`.

## `editEdgeRoute`

- Signature: `editEdgeRoute({ target?, graph?, layout?, method?, options?, coordinateSpace? })` 또는 `editEdgeRoute({ prepared, requestToken })`.
- 기존 route를 explicit/current/unique 순서로 선택한다. Empty patch는 오류이며 options:{}만으로는 편집이 아니다. 같은 값의 명시 편집도 revision을1 올린다. Same-method options는 기존 값을 유지하며 지정한 필드만 patch하고 limits도 같은 방식으로 patch한다. Method 변경은 새 method의 defaults를 사용하며 hierarchical mapping 등 필수 입력을 다시 요구한다. Create의 validation과 consumer 계약을 공유한다.
- target은 scoped child를 지원한다. Prepared 적용은 준비한 정확한 unit program에만 가능하고 다른 authoring options와 섞지 않는다. 다른 receiver/token/operation, cloned handle, ABA 또는 abort는 상태 변경 전에 거부한다.

### Formal values — `editEdgeRoute`

- Implemented: `editEdgeRoute(options: TargetedOptions<EditEdgeRouteOptions> | ApplyGraphEdgeRoutesOptions): ChartProgram`.
- Planned: 이 action의 추가 값 없음.
- Proposed (NOT IMPLEMENTED): implicit node-coordinate edits.

### Value coverage — `editEdgeRoute`

- ✅ Covered: method/options/limits edits, scoped receivers, shared consumers, atomic failures and offline restore.
- Evidence: `test/unit/resources/graph-routes.test.js`, `test/unit/resources/graph-route-lifecycle.test.js`, `test/unit/resources/graph-route-host.test.js`, `test/contracts/graph-route-types.test.js`.

## `applyGraphEdgeRoutesUpdate`

- Signature: `applyGraphEdgeRoutesUpdate({ prepared, requestToken })`.
- Full-only synchronous action. `prepareGraphEdgeRoutes(program,{kind:"update",edit:{action,args}},{requestToken,executor,deadlineMs,signal?})`가 원 completed unit receiver에서 준비한 authentic update handle만 받는다. 현재 `editLayout`, `editGraphData`, `editFlowData`, `editHierarchyData`, `editInferredGraphData`, `reviseData`, `editDerivedData`, `editParameter`, `editCanvas`, `fitCanvas`, `navigateProjection`, `applyDataUpdate`, `filterMarks`, `removeMarkFilter`의 원 native edit와 dependent candidate graph/layout/edge-route/Geo/resource plot consumer closure를 연결한다. 영향을 받는 route 중 explicit v2가 하나 이상이어야 한다. V1 dependent route는 기존 synchronous owner와 guard를 유지한다.
- 첫 await 전에 nested own-data edit args를 복사·동결한다. 유일한 예외는 `editInferredGraphData`의 원 inference registry가 검증한 frozen prepared handle identity이며, base/token/kind/signal을 원 owner에서 준비와 최종 적용 때 다시 검사한다. 외부 args record를 await 동안 보관하지 않는다. Constructor/native function/base/token/ref/revision/viewport/order를 원 private registry에 결박한다. 복제·위조 handle, 다른 receiver/token, overridden native/apply action, scoped composition은 거부한다. 저장 trace와 준비 plan 조회는 권한을 만들지 않는다.
- 모든 영향 v2 resource의 execution policy에 동일한 실제 work/pairs/live-buffer/peak-sample 합산을 대조한다. Packet maxBytes는 각 job/result owner가 검사한다. 이전 완료를 다음 job 동안 보유한 samples도 합산한다. 이 offset은 해당 job/completion의 private scope에만 적용하며 종료된 worker peak를 저장 resource 재검산에서 보유 결과에 다시 더하지 않는다. Prepare 전체의 validation/native plan/worker/실제 wrapped preflight/theme 비용을 누적하고 최종 apply는 그 누적값의 독립 copy에서 검산을 계속한다.
- `reviseData`, `editDerivedData`, `editParameter`, `editCanvas`, `fitCanvas`, `navigateProjection`, `applyDataUpdate`, `filterMarks`, `removeMarkFilter`는 bounded route가 하나의 동기 native 호출 깊은 곳에서 계산되므로 replay로 연결한다. 영향 범위는 파생 dataset의 source와 parameter 입력을 따라간다. `editCanvas`와 `fitCanvas`는 모든 screen-space route에서 시작한다. `fitCanvas`의 원 side 순서·quarter-pixel 탐색·probe cache·반복 상한은 그대로이고 probe마다 원 job을 replay한다. Probe의 broad catch는 일반 geometry 실패만 흡수한다. Route continuation 요청, replay 불일치, route ledger quota, deadline/abort, prepared invocation 밖의 bounded-route 요구 오류는 그대로 전파한다. Guide/responsive 단계가 요구하는 추가 viewport job도 같은 순서로 replay한다. `navigateProjection`은 canvas를 바꾸는 resize 연산만 screen-space route에 닿는다. `applyDataUpdate`는 원 data update registry가 검증한 frozen handle identity를 복사 없이 유지한다. 그 중첩 원 action은 exact invocation의 receiver를 대신해서만 같은 handle을 읽고, 직접 호출은 자기 receiver를 비교한다. `filterMarks`/`removeMarkFilter`는 명시 target의 graph layout에서 시작하므로 recompute 필터만 route job을 만든다. Viewport나 route가 움직이지 않는 편집은 직접 action을 쓰도록 거부한다. 같은 inputHash의 job은 같은 completion을 공유한다. 준비는 원 wrapped preflight를 실제로 실행하다가 기록된 completion이 없는 원 job에서 멈추고, 그 job을 worker로 계산한 뒤 preflight를 receiver에서 다시 실행한다. 각 실행은 실제 비용으로 합산하고, 버린 실행이 보유한 samples는 해제한다. `reviseData`의 행 namespace/identity는 준비 때 한 번 정해 같은 exact invocation 안의 native action만 읽는다. 파생 data와 parameter 개정의 identity는 원 행에서 결정적이다. 최종 적용의 미리보기·실제 두 pass는 각각 원 job을 끝까지 계산하고, 그 inputHash가 기록된 completion의 순서와 일치할 때만 원 completion validator에 공급한다. 누락·추가·순서 차이는 `stale-result`이고, native 단계가 그 오류를 자체 catch로 흡수하면 invocation을 완료하지 않는다.
- Async 준비 중 invocation scope는 열리지 않는다. 최종 sync action의 enter→native child→primitive/materializer→theme→result validation→exit 전체에서 exact plan(replay 연결은 순서 있는 completion 전체 pass)을 소비하고 finally scope를 복원한다. 실패 시 원 invoke error를 cleanup error가 대체하지 않는다. Candidate program을 재사용·반환하지 않는다. 원 signal 취소는 준비 완료 후 apply도 거부한다.
- Trace의 첫 child는 요청 action/요약 args와 정확히 일치한다. 후속 completion siblings는 authored-source 해석에서 제외하고 같은 native action 중복 child는 해석을 거부한다. 이 closed trace 해석은 저장 후 테마 inspection용 데이터이며 execution/prepare/resource write 권한이 아니다. 실행 중 theme metadata는 exact Full constructor와 현재 authentic prepared invocation에서만 native action을 읽는다.
- 최초 descriptor scan/clone의 acquisition 비용에는 별도 깊이·work·전체 heap 상계가 아직 없고 현재 ledger가 그 비용을 완전히 계량하지 않는다. Cycle은 원 clone owner가 첫 await 전에 거부한다.
- 현재 공개 update union은 completed unit의 `editLayout`, `editGraphData`, `editFlowData`, `editHierarchyData`, `editInferredGraphData`, `reviseData`, `editDerivedData`, `editParameter`, `editCanvas`, `fitCanvas`, `navigateProjection`, `applyDataUpdate`, `filterMarks`, `removeMarkFilter` 열네 action이다. Scoped/composition/facet receiver와 native completion이 추가 viewport route job을 요구하는 경로는 후속 의무다. 그런 추가 계산을 동기 fallback으로 실행하지 않는다. 간접 guide/encoding/mark/theme/composition update와 파생 alias의 공개 연결은 후속 의무다. 그래프/계층 자원의 native 편집 연결이 그 source revision 전체를 지원한다는 뜻은 아니다. Snapshot, clone, postMessage, geometry와 최종 materialization의 전체 100ms 상계도 미검증이다.

### Formal values — `applyGraphEdgeRoutesUpdate`

- Implemented: `applyGraphEdgeRoutesUpdate(options: ApplyGraphEdgeRoutesUpdateOptions): ChartProgram` and `GraphEdgeRoutesUpdateRequest` with the closed five-action native resource union above.
- Planned: 승인된 나머지 native update union 연결.
- Proposed (NOT IMPLEMENTED): generic extension replay, persisted preparation authority.

### Value coverage — `applyGraphEdgeRoutesUpdate`

- ✅ Covered: original native layout/resource wrapper and candidate-DAG consumer order, immutable argument snapshot, authentic handles, cancellation, aggregate policies, trace inspection and declaration boundaries.
- Evidence: `test/unit/resources/graph-route-native-update.test.js`, `test/unit/resources/graph-route-request-ledger.test.js`, `test/unit/actions/theme-native-route-update.test.js`, `test/unit/core/action-invocation-scope.test.js`, `test/contracts/graph-route-types.test.js`.

## `ggaction/graph` host boundary

- `prepareGraphEdgeRoutes(program,{kind:'create'|'edit',...authoringOptions},{requestToken,signal?,executor?})`는 await 전에 own request/host와 exact Full unit receiver를 검사·snapshot한다. Opaque handle은 private authority에 original receiver/token/operation/signal을 결박하며 result 배열을 공개하지 않는다.
- `computeGraphEdgeRoutes(job,signal?)`는 worker로 전달받은 immutable structured-clone job을 공통 수치 owner로 계산한다. Job은 schemaVersion1, algorithmVersion, exact input vector, normalized intent/input, optional hierarchy, viewport 및 inputHash를 포함한다. 완료 envelope는 inputHash/resultHash/result다.
- `createGraphRouteExecutor({createWorker?})`의 compute(job,{signal?})는 완료 결과만 반환한다. createWorker 생략은 동기 owner를 사용한다. Host worker는 message/error event, postMessage, terminate를 제공한다. Request `{job}`, reply 완료 envelope이며 원 요청 job으로 다시 검사한다.
- Instance LRU는8entries/1000000 control+command samples, pending worker는8개다. 큰 단일 완료는 cache하지 않는다. evict(inputHash?)는 명시 제거/전체 비우기이며 dispose는 모든 pending·listeners·workers·cache를 해제하고 재사용을 거부한다. Abort/error/완료도 각 worker를 해제한다. Late callback은 무시한다. 전역 cache는 없다.
- Worker cache는 같은 inputHash를 새 prepare generation에 재사용할 수 있으나 이전 handle 권한을 재사용하지 않는다. Native AbortSignal만 지원하고 abort는 prepare/apply/compute에서 확인한다. V1은 별도 wall-clock termination 대신 bounded-work 실패와 명시 host cancellation을 쓴다.

Geographic and planar route maps use Full `createGeoRouteData`/`editGeoRouteData`
to retain the existing sampled route in a GeometryData resource, then native
`createGeoLineMark` consumes it. [Geometry contracts](GEOMETRY.md#creategeoroutedata)
own explicit coordinate interpretation, source rows and revision closure.

## Paired analytical consumers

네 route method의 field encoding·scale·guide 비교는 원 edge source를 명시적으로 공유한
별도 native analytical child로 구성한다. Route child는 graph/layout/route의 실제 위치·경로·
stroke와 native GraphPlot 범례 지원 범위를 유지한다. Analytical child의 `encodeColor`,
`editScale`, axis/legend 편집은 route resource, geometry, identity, 참조를 바꾸지 않는다.
같은 row key만으로 두 child를 자동 갱신하지 않으며 `reviseData`의 명시 두 child target으로
각 source revision을 갱신한다. Hierarchical의 별도 hierarchy/anchor source는 영향이 없으면
기존 revision을 보존한다. 이는 route geometry가 Cartesian field/scale로 결정된다는 의미가 아니다.
예제와 검증: `examples/edge-routes/comparison.js`, `test/unit/resources/edge-route-composition.test.js`,
`test/browser/edge-route-composition.browser.js`, `test/charts/edge-routes/methods.test.js`,
`test/charts/edge-routes/backends.render.js`.


## 명시 bounded route v2

- `options.execution`이 있으면 exact closed own record `{policy:"bounded-route@1",maxWork,maxCandidatePairs,maxSamples,maxBufferBytes,maxBytes}`를 요구한다. 다섯 수치는 모두 필수 positive safe integer이고 기본값 없다. 최대는 순서대로8,000,000,000 / 50,000,000 / 16,777,216 / 134,217,728 / 134,217,728이다. `options.limits`에는 기존 maxNodes/maxEdges만 허용한다. V2 job input에는 중복 limits를 저장하지 않는다.
- V2 저장 resource algorithmVersion은 문자열"2", job/completion schemaVersion은 숫자2다. 해당 조합은 기존 Full exact registered edge-route handler만 검증한다. Basic·미등록 constructor·다른 kind version2·execution 없는 version2·v2 execution을 가진 version1은 거부한다. 일반 registry/version compatibility 옵션은 없다.
- `computeGraphEdgeRoutesAsync(job:GraphRouteJobV2,signal?)`는 명시 v2 worker entry다. 기존 sync entry는 v1만 받으며 원 byte/hash/getter/error 순서·guard는 유지한다. V2도 원 네 solver·field방문·반복·geometry·typed순서·endpoint·provenance를 사용한다. Worker diagnostics.work는 worker job validation과 solver의 실제 원 work 합계이며 peakBufferBytes를 추가한다.
- V2 `prepareGraphEdgeRoutes` host는 authentic createWorker executor와 deadlineMs를 필수로 받는다. deadlineMs는1–30000 positive safe integer이며 기본값 없다. Entry 시각부터 native snapshot, worker, result 검증, consumer plan 준비 완료까지 계산하며 실제 macrotask 사이와 동기 단계 뒤에 abort/deadline을 검산한다. 긴 snapshot/BigInt/widekeys/postMessage/solver/최종 materialization은 선점되지 않으며100ms 주장을 하지 않는다.
- Executor의 v2 요청은 한 건만 허용하며 기존 v1 pending과 상호 배타적이다. 진입 시 기존 cache를 비우고 v2 결과는 cache하지 않는다. Worker 생성·post·message·정리 실패, 취소, deadline, dispose는 terminal1회와 resource/handle게시0을 지킨다. Late/duplicate packet은 data getter를 읽기 전에 무시한다. 모든 worker/listener/timer/hash scratch는 종료 경계에서 정리한다.
- Native body/result는 첫 await 이전 own-data strict validation과 deep-owned snapshot을 확보한다. Canonical tagged writer/SHA는 원 owner를 쓰며 UTF-16 key 순서, hole/undefined, -0/BigInt escape를 보존한다. maxBytes는 hash 입력뿐 아니라 inputHash/resultHash/header를 포함한 각각의 전체 encoded packet을 제한한다. 검산 뒤 원 validatedJobs와 prepared WeakMap만 등록한다.
- 단일 요청 work/pairs는 실제 원 charge를 합산한다. 초기 저장 검증, native job 준비, worker job+solver, host completion, resource assembly, geo/graph closure preflight와 최종 primitive binding 검산을 포함한다. 복사된 완료를 재검증할 때 이미 계산한 worker work를 중복 charge하지 않으며 검증 자체 비용은 추가한다. maxSamples는 원 counting의 peak, maxBufferBytes는 live typed buffer/hash scratch 예약량이며 전체 heap 측정이 아니다. 할당 전 예약하고 finally 반환한다.
- Full exact constructor에 한 번 연결된 private native planner가 기존 geo/graph consumer preflight와 wrapped materialization operation plan을 준비한다. graph package는 Full assembly/registrar/renderer를 import하지 않는다. Planner lookup은 proof가 아니며 original prepared WeakMap에 exact base/constructor/kind/token/signal/resource/plan과 누적 accounting snapshot을 보관한다.
- Final facade는 original signal과 exact base/constructor/kind/token을 검사하고 준비 누적값에서 ledger를 이어받아 기존 preparedResourceContext·editSemantic·wrapped materialization children을 실행한다. Candidate program을 그대로 반환하지 않는다. 동일 immutable base에서 handle을 재사용하는 독립 적용은 같은 준비 누적값에서 시작하며 이전 적용 비용을 섞지 않는다. 최종 theme/action-completion 경계는 기존 wrapper가 소유한다.
- V2 raw synchronous create/edit/recompute는 prepare를 요구하는 오류다. Same-method prepared edit는 execution을 보존하고 method 변경은 명시 execution을 요구한다. 현재 v2 경로는 unit create/edit와 위의 다섯 native resource update이며 나머지 source/viewport/fit native update union은 후속 의무다. 이 미구현 한계를 자동 동기 fallback으로 숨기지 않는다. Offline restore와 기존 concrete renderer 소비는 지원한다.
- 증거: `test/unit/resources/graph-route-bounded.test.js`, `test/unit/grammar/graph/routes/execution.test.js`, `test/contracts/graph-route-types.test.js` 및 package/browser 계약.
