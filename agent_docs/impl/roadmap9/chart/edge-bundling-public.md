# Edge route 공개 연결 구체안

## 진행 상태

- [x] 네 solver의 독립 계산 checkpoint `58738bbb3`
- [x] 현재 Graph/Layout/Plot/typed-binding/prepare 소유자 확인
- [x] 최종 통합 기준 afc4e34e6 병합 및 126개 회귀·7개 패키지 계약 검증
- [ ] Public resource·수정·GraphPlot·source/layout/hierarchy closure
- [ ] 저장 검증·Full/Basic·typed refs·removal·inspection
- [ ] Worker/sync parity·token/abort/cache lifetime
- [ ] 네 renderer·scene/hit/selection·실제 데이터·types/current/docs/installed

승인은 [AUTHORIZATION](../AUTHORIZATION.json)의 잔여 STEP077 전체 승인을 재사용한다.
현재 Current 구현을 뜻하지 않는다. 계산 owner와 고정 수치는 [전체 구현 기록](edge-bundling.md)이
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
