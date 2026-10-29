# Edge route 공개 연결 구체안

## 진행 상태

- [x] 네 solver의 독립 계산 checkpoint `58738bbb3`
- [x] 현재 Graph/Layout/Plot/typed-binding/prepare 소유자 확인
- [x] 최종 통합 기준 afc4e34e6 병합 및 126개 회귀·7개 패키지 계약 검증
- [x] Private job/source adapter 및 solver 없는 완료 결과 검증
- [x] Public resource·수정·GraphPlot·source/layout/hierarchy closure
- [x] 저장 검증·Full/Basic·typed refs·removal·inspection
- [x] Worker/sync parity·token/abort/cache lifetime
- [x] 네 renderer·scene/hit/selection·실제 데이터·types/current/docs/installed

승인은 [AUTHORIZATION](../AUTHORIZATION.json)의 잔여 STEP077 전체 승인을 재사용한다.
아래 구체안의 공개 구현과 검증을 마쳤다. 계산 owner와 고정 수치는 [전체 구현 기록](edge-bundling.md)이
소유한다. 아래는 해당 계산을 사용자 API와 기존 소비자에 연결하기 위한 구체화다.

## API와 단일 의미 소유

- `bundleGraphEdges({id, graph?, layout?, method, options?, coordinateSpace?})`: Full-only
  생성이며 명시 id와 method를 요구한다. layout은 현재/유일 eligible graph layout을 기존
  selector로 찾는다. graph 생략은 이 layout의 exact graph를 뜻하며 명시 graph와 불일치는 오류다.
- `editEdgeRoute({target?, graph?, layout?, method?, options?, coordinateSpace?})`: 기존
  route를 current/unique 규칙으로 선택하고 nonempty patch만 허용한다. 동일 값의 명시 편집도
  revision을 올린다. 입력 바인딩을 바꾸려면 함께 유효한 graph/layout을 제공해야 한다.
- `createGraphPlot`/`editGraphPlot`의 `routes`는 resource ID이며 false는 기존 native edge
  geometry로 되돌린다. 생략은 생성 시 native, 편집 시 현재 binding 보존이다. 별도 mark family를
  만들지 않는다. Layer의 optional `graphBinding.routes`가 유일한 live route reference다.
- Method options는 공통 limits와 계산 owner의 정규화 값을 사용한다. HEB만 `hierarchy`,
  `hierarchyLayout`, `mapping:[{nodeKey,hierarchyKey}]`를 더 읽는다. 두 key는 원 typed key이며
  graph tuple 및 hierarchy scalar 규약을 각각 재사용한다. Source ID는 exact inputs로만 저장하고
  mapping·수치 intent만 resource options에 보관한다. Tree의 x/y 및 treemap의 명시 rectangle
  center가 anchor다. Partition interval은 물리 view가 없으므로 anchor로 추정하지 않는다.

`edge-route` envelope는 authored ownership, exact graph/layout refs(HEB는 hierarchy/anchor
layout 추가), 해석된 method/coordinateSpace/options, complete vector result와 provenance를
가진다. 중복 source ID, callback, signal, worker, queue, mutable field, partial preview는 저장하지
않는다. `coordinateSpace`는 기본 world이며 screen은 명시 viewport 의존성을 추가한다. 현재
GraphPlot 배치는 translation만 하므로 두 방식의 입력 anchor 수치는 같을 수 있으나 screen의
resize invalidation과 future geo projection 계약을 구분한다. Viewport 세부 입력과 Canvas
revision hook은 해당 기존 owner를 확인하여 같은 공개 checkpoint에서 확정한다.

## 저장 검증과 갱신

Restore는 solver를 실행하지 않는다. Closed envelope, exact refs와 source provenance,
입력 digest, method/version, route key/order/endpoint, finite vector/bounds/length, method별
provenance와 diagnostics를 검증한다. 결정적 digest는 정합성 확인이며 사용자 JSON의 계산을
암호학적으로 인증한다고 주장하지 않는다. Public creation/application만 private prepared
context를 통해 computed resource를 쓴다.

Graph/source/layout/hierarchy 변경은 resource DAG에서 route 후보까지 먼저 계산하고 모든
GraphPlot 소비자를 최종 후보 상태로 preflight한다. 하나라도 실패하면 이전 program/trace는
변하지 않는다. Source union의 deferred final materialization과 GraphPlot recompute/view를
보존한다. Typed binding collector가 optional route binding을 한 번 수집하고 exact revision을
재결박한다. 제거는 기존 generic resource restrict/cascade 규칙을 사용하며 live mark와 retained
selection을 명시적으로 처리한다.

## 준비와 runtime 경계

Browser-safe `ggaction/graph` 진입점은 pure `computeGraphEdgeRoutes(job)`와
`prepareGraphEdgeRoutes(program,request,host)`를 분리한다. Frozen numeric job은 exact input
revision vector와 canonical encoded input hash를 포함한다. Sync와 worker는 같은 pure owner를
사용한다. 준비 handle은 private WeakMap에서 exact original receiver, operation, request token,
input hash, signal 및 완료 resource를 보유한다. Action apply에서 forged/stale/ABA/abort를 다시
검사한다. Request token은 generation을 구별하고 input hash의 재사용 여부와 혼합하지 않는다.

AT82의 cache와 worker listener/buffer lifetime은 전역 Map을 만들지 않고 명시 소유 runtime
instance에서 닫는다. Instance API의 최종 이름·worker factory/evict/dispose 세부사항은 기존
interaction owner와 대조하여 구현 전에 이 기록에 구체화한다. 단지 host가 cleanup할 것이라는
가정으로 해당 인수 시험을 완료 처리하지 않는다.

## 소비자 연결

GraphPlot의 edge body와 arrow는 같은 원 edge item key/row membership을 유지한다. Canonical
route는 node center anchor를 보존하고, 구체 출력의 node-radius trimming/arrow 방향은 기존
geometry owner에서 맡는다. Canonical result를 고치지 않는다. Native self-loop/parallelGap
의미와 route point fallback은 명확히 구분한다. Renderer는 기존 concrete path만 읽는다.

Overlap hit는 정렬된 원 edge candidates를 반환하고 temporary unbundle은 scene/presentation
상태만 바꾼다. Keyboard cycle, current-frame endpoint attachment와 interrupted transition은
기존 session/frame 및 STEP065 owner와 교차 검증한다. Geo pixel spline/great-circle/dateline
차이는 후속 STEP042–046에서 같은 resource를 소비해 닫으며 미완료로 추적한다.


## Session owner 연계 확인

STEP057–060 담당자의 29ac233c5 checkpoint는 nearest 및 clip/current-frame을 포함한다.
Frame 연결은 `session.dispatch({type:'frame',scene,version,generation})`를 사용하며 scene의
known node key/type/topology를 유지해야 한다. 최신 frame만 hit/nearest에 사용하고 stale
generation은 거부한다. Overlap candidate 목록은 보존된다. Route 공개 resource 이후 이
기존 경계를 소비하며 별도 session/controller를 복제하지 않는다. 해당 checkpoint는 현재
기준 main afc4e34e6에 아직 포함됐다고 주장하지 않는다.

## Private job 검증 checkpoint

`routeInput`은 observed explicit key를 원 typed 비교로 정렬하고 occurrence는 source logicalId와
persisted rowKey로 정렬한다. Inferred edge는 ruleId·direction·typed endpoint rank 순서를
사용한다. 이 순위를 숫자 vector로 전달해 normalized key를 해독하지 않는다. Tree/treemap
anchor는 기존 결과에서만 읽는다. Job은 exact graph/layout/hierarchy revision, 해석된 옵션,
viewport와 signed zero를 입력 hash에 포함한다. 완료 결과는 기존 solver의 schedule 정책을
공유하며 M/L finite command, 원 edge 순서, exact endpoint, bounds, 실제 parent/edge path,
길이, lock/skip 이력과 hash를 검증한다. Partial/forged/stale/descriptor 입력을 거부한다.

집중 계산·source adapter52개가 통과했고 16개 owner는 기존 family floor
95% lines/90% branches/100% functions를 모두 유지했다. 결과 검증은 solver를 재실행하지
않는다. 직접 공개 action과 executor가 아직 없으므로 이 checkpoint를 STEP036–041 완료로
간주하지 않는다. 상세 로그는 `edge-bundling-evidence/job/`에 보존한다.

## 실행·화면 수명 구체화

`createGraphRouteExecutor({createWorker?})`는 명시 instance를 반환한다. `compute(job,{signal?})`,
`evict(inputHash?)`, `dispose()`만 가지며 전역 cache는 없다. 완료 cache는 LRU 최대8개와
총1,000,000 control/command samples를 동시에 지킨다. 큰 한 결과는 계산하지만 cache하지
않는다. Worker 요청은 최대8개이며 요청마다 host가 만든 독립 worker를 소유한다. 요청은
`{job}`이고 응답은 `computeGraphEdgeRoutes(job)`의 완료 envelope다. Sync와 worker는
같은 job/result validator를 쓴다. 완료·오류·abort·dispose에서 listener를 떼고 worker를
종료한다. Dispose는 cache와 모든 pending 참조를 해제하며 이후 compute를 거부한다.
Cache hit는 새 prepare generation에 사용할 수 있으나 이전 handle의 receiver/token 권한을
승계하지 않는다. Request token은 worker 메시지 내용 대신 해당 요청의 private closure와
prepare handle에 결박하므로 같은 input hash의 이전 세대 응답도 새 세대를 적용할 수 없다.

`prepareGraphEdgeRoutes(program,{kind:'create'|'edit',...authoringOptions},
{requestToken,signal?,executor?})`는 정확한 Full unit receiver와 원 요청을 정규화한 뒤 await한다.
Executor 생략은 같은 synchronous 계산 owner를 사용한다. 반환 handle은
`bundleGraphEdges({prepared,requestToken})` 또는 `editEdgeRoute({prepared,requestToken})`에
적용하며 다른 authoring options를 섞지 않는다. Forged/다른 receiver/ABA/operation/token 및
abort를 apply에서 다시 검사한다. Handle에는 callback·worker·result 배열이 노출되지 않는다.

Screen route의 viewport는 Canvas plot bounds다. GraphPlot은 현재 node layout을 translation만
하므로 canonical route는 같은 layout 좌표로 저장하고, viewport는 화면 수명의 exact 입력으로
묶는다. `editCanvas`가 바꾸려는 Canvas 후보에서 screen route를 모두 먼저 계산·검증한다.
Full-only Canvas prepare/apply owner는 기존 data revision 등록 패턴을 따르며 Basic에 route
solver를 import하지 않는다. Private final-resource context는 이 경우에만 여러 독립 screen
route의 **기존 동일 options/inputs + 다음 revision + 변경된 viewport**를 원자적으로 적용한다.
기존 Canvas materialization plan은 최종 후보 뒤 각 mark를 한 번만 그린다. World route는
resize해도 revision을 올리지 않는다. Generic primitive가 임의의 다른 resource 결과를 이
권한으로 교체할 수 없도록 exact receiver·args와 전체 invalidated screen 집합을 검증한다.


## 공개 source 검증 후보

네 방법 × observed/inferred × directed/undirected의 공개16셀과 hierarchy/source/layout
갱신, exact restore, immutable 실패, Canvas screen union 및 실제 Worker parity를 구현했다.
Canonical `all capability:edge-routes`는77/77 통과했고 집중73개 coverage에서 새 high-risk
owner의 기존 family floor95/90/100을 유지했다. Browser DPR1/2에서 실제 Worker와
Canvas/SVG primitive parity2/2, PNG/PDF primitive2/2, 설치용 별도 프로세스+네 renderer
consumer3/3의 source smoke가 통과했다. 전체 coverage·문서·최종 tar 설치는 아직 검증 중이다.

실제 TT5종은32개 source rows 전부를 범주별 observed membership 집계에 기여시키며,
각3방법에서 weight 합계·기여수·source 수정·codec·selection을 확인했다(5/5).
처음32개 개별 긴 edge를 density에 넣은 실행은 기존10M work guard에 걸렸다. 한도를
높이거나 row witness를 생략하지 않고, 공개 summary provenance를 가진 범주 집계로 바꾸었다.
Direct lifecycle recipe의 edgeKey는 기존 원본 id를 명시해 독립 authoring마다 새로 생기는
allocation namespace가 수치 job hash를 달리하는 의도된 의미와 replay fixture를 분리한다.
Occurrence-key 입력의 원자성·identity 회귀는 별도 unit에서 그대로 유지한다.

고정 후보 package의 실측은957entries/6,240,953unpacked, Node22 packed1,363,181,
Node20/24 packed1,365,952bytes다. 최소 상한957/1,366,000/6,241,000을 적용한다.
동일 minified chunks를 각Node zlib로 압축한 최대는 Full680,570, Basic371,470,
SVG20,196, interaction82,867, graph42,269bytes다. Full681,000/Basic372,000/graph43,000으로
최소1000byte 올림하고 기존SVG25,000/interaction83,000을 유지한다. Basic 증가는 공통
Canvas/typed-reference 경계이며 route solver/host import 제외 계약이 통과했다.
Search index는973,565bytes여서974,000 상한으로 최소 올림한다.

최종 통합에서 parent가 실행할 공통3파일은 `realistic-lifecycle-factor-effects.test.js`,
`realistic-scenario-generator.test.js`, `realistic-scenario-generation-isolation.test.js`다.
AT80 keyboard/temporary unbundle, AT81 animation interrupt/geo clip, AT82 단계별 SLO는
각 후행 closure owner와 합산 검증이 필요하며 이 source 후보로 전체 인수 시험을 닫지 않는다.


## 공개 checkpoint 최종 검증

Runtime source는 `a491a8b8e`이며 이후 수리는 test/inventory/내부 계약 분류·문서뿐이다.
[검증 정본](edge-bundling-evidence/public/status.json)에 원본 실패와 수리 결과를 함께 보존했다.
전체 coverage 최초 실행은8,123중8,113 통과, global96.73/94.74/99.10이다. 실패10개는
신규 route의 catalog/목록·primitive 파일·문서 entry·exact lineage 기대값·shard timing 누락이다.
Owning32개 중31개가 회복됐고, 이때 잘못 쓴 contour fixture 경로를 고쳐 해당6개도 통과했다.
Runtime 수정은 없으며 전체 검사를 한 번에 모두 통과했다고 보고하지 않는다.

현재 critical469개 중468개는 원본 전체 보고서에서 통과했다. 전체 실행 시작 뒤 추가한
Canvas registration 경계는 별도19개 검사에서100/100/100을 확인했다. 새 Canvas/route selector도
기존 family95/90/100을 적용했고 어떤 기존 floor도 낮추지 않았다.

동일 tar `07070a83f1d44ea1a31a42f033dd7f8a91b56c8cb1c036c170f08693303c31a0`로
Node20.20.2/22.23.1/24.22.1 각각243 runtime·87 tutorials·9 qualification 모두 통과했다.
Canonical staged minification/JSON 형식으로957개 입력을 대조해 현재와 차이가0임을 확인했다.
문서183/183, built168pages/1,448machine artifacts,320/390/768px 실제 브라우저 검증도 통과했다.
AT80/81/82의 남은 session·animation·geo·SLO 통합은 STEP070 closure/074 qualification에
계속 연결하며, 공통 realistic3파일은 parent의 합산 통합에서 한 번 실행한다.
