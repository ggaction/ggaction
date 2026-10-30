# Edge route resources

## `bundleGraphEdges`

- Signature: `bundleGraphEdges({ id, graph?, layout?, method, options?, coordinateSpace? })` 또는 `bundleGraphEdges({ prepared, requestToken })`.
- Full-only chart-authoring action이다. 명시 id와 method로 authored `edge-route` resource를 만들며 graph의 node/edge topology와 원 item key를 바꾸지 않는다. id는 기존 resource와 중복할 수 없다. layout은 explicit/current eligible/unique 순서의 fixed/circular/force graph layout이다. graph 생략은 layout의 exact input을 사용하고 명시 graph와 불일치·missing·ambiguity는 오류다.
- method는 hierarchical/force-directed/density/edge-path다. options는 own-data closed record이며 null/undefined/accessor/unknown은 거부한다. 각 method의 zeroLength는 point만 지원한다. Coincident endpoint는 동일 좌표 두 점과 zero-length 진단을 저장하며 junction이나 node를 합성하지 않는다. 빈 graph는 complete 빈 route를 저장한다.
- hierarchical: options.mapping은 모든 graph node의 원 typed nodeKey와 scalar hierarchyKey를 정확히 한 번 지정한다. options.hierarchy/hierarchyLayout은 explicit/current/unique tree 또는 treemap anchor resource를 선택한다. Tree x/y 또는 treemap rectangle center를 읽으며 mapped anchor는 graph layout 좌표와 같아야 한다. 별도 hierarchy layout을 암묵적으로 변경하지 않는다. strength 기본0.85, 범위[0,1]; tolerance 기본0.001 positive finite; maxSubdivisions 기본4096, 범위1–4096 integer다. LCA parent path를 chord와 strength로 혼합한 clamped uniform spline을 adaptive sampled M/L vector로 저장한다.
- force-directed: compatibilityThreshold 기본0.6, 범위[0,1]. Angle/scale/position/visibility compatibility와 결정적 six-cycle double-buffer 계산을 사용한다. Cycle internal samples1/2/4/8/16/32, step0.1·0.5^cycle, iterations60/40/27/18/12/8이다. 반대 directed edge는 compatibility0이며 undirected edge는 방향 correspondence를 맞춘다.
- density: 고정256×256 density field, 20회 advection, bandwidth max(2/256,0.05·0.9^iteration), step0.005를 사용한다. Arc-length weighted density와 directed8channel을 사용하고 매 반복 boundary clamp·smooth·resample한다. 해당 고정 수치에 사용자 옵션을 추가하지 않는다.
- edge-path: exponent 기본2 positive finite, maxStretch 기본2 finite≥1이다. 실제 graph adjacency의 typed-order deterministic shortest path를 사용하고 원 edge를 skip/lock한다. Stretch 이내 경로에 1/4 corner cut을 적용하며 없는 edge를 연결하거나 새 junction을 만들지 않는다. 탐색은 predecessor 상태를 한 번 보유하고 성공 경로와 정확한 cost 동률 비교에서만 경로 vector를 구성한다. Work/sample diagnostics는 실제 상태·비교·복원 비용을 반영하므로 같은 geometry/provenance에서도 구현 개선 뒤 값이 달라질 수 있다.
- 모든 method는 공통 normalized bounding frame에서 계산하고 최종 원 좌표로 복원한다. Signed zero를 포함한 원 node endpoint를 보존한다. limits의 maxNodes/maxEdges/maxCandidatePairs/maxSamples 기본 및 최대는100000/1000000/10000000/10000000이고 positive safe integer이며 더 낮출 수 있다. 공통 work budget과 route당30000 sampled command 한도도 적용한다. 한도 초과·overflow는 incomplete resource 없이 실패한다.
- coordinateSpace 기본world, screen은 현재 Canvas plot bounds를 exact job 입력으로 추가한다. 현재 GraphPlot은 layout을 translation하므로 동일 anchor 수치를 쓸 수 있다. World route는 Canvas resize에 revision이 바뀌지 않고, screen route는 새 plot bounds에서 모두 preflight한 후 다음 revision으로 한 번 갱신한다. Responsive solve와 exact plot의 guide margin 확장도 이 경계를 공유한다. 데이터와 viewport가 함께 변하면 source DAG와 독립 screen route를 하나의 후보 union으로 검증하여 각 route를 한 번 갱신하며, viewport만 바뀐 sibling의 options와 inputs는 유지한다.
- 저장 입력은 exact graph/layout refs이며 hierarchical만 exact hierarchy/anchor layout refs를 추가한다. options는 단일 해석된 수치 intent다. result는 viewport, inputHash/resultHash, complete:true, 원 edge 순서의 controlPoints/M/L commands/bounds/provenance 및 diagnostics다. Source rows는 graph와 optional hierarchy 원 참조다. Callback/worker/cache/promise/partial preview는 저장하지 않는다.
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

## `ggaction/graph` host boundary

- `prepareGraphEdgeRoutes(program,{kind:'create'|'edit',...authoringOptions},{requestToken,signal?,executor?})`는 await 전에 own request/host와 exact Full unit receiver를 검사·snapshot한다. Opaque handle은 private authority에 original receiver/token/operation/signal을 결박하며 result 배열을 공개하지 않는다.
- `computeGraphEdgeRoutes(job,signal?)`는 worker로 전달받은 immutable structured-clone job을 공통 수치 owner로 계산한다. Job은 schemaVersion1, algorithmVersion, exact input vector, normalized intent/input, optional hierarchy, viewport 및 inputHash를 포함한다. 완료 envelope는 inputHash/resultHash/result다.
- `createGraphRouteExecutor({createWorker?})`의 compute(job,{signal?})는 완료 결과만 반환한다. createWorker 생략은 동기 owner를 사용한다. Host worker는 message/error event, postMessage, terminate를 제공한다. Request `{job}`, reply 완료 envelope이며 원 요청 job으로 다시 검사한다.
- Instance LRU는8entries/1000000 control+command samples, pending worker는8개다. 큰 단일 완료는 cache하지 않는다. evict(inputHash?)는 명시 제거/전체 비우기이며 dispose는 모든 pending·listeners·workers·cache를 해제하고 재사용을 거부한다. Abort/error/완료도 각 worker를 해제한다. Late callback은 무시한다. 전역 cache는 없다.
- Worker cache는 같은 inputHash를 새 prepare generation에 재사용할 수 있으나 이전 handle 권한을 재사용하지 않는다. Native AbortSignal만 지원하고 abort는 prepare/apply/compute에서 확인한다. 별도 wall-clock termination 대신 bounded-work 실패와 명시 host cancellation을 쓴다.
