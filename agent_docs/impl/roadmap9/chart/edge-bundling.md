# Edge route와 네 가지 bundling

## 진행 상태

- [x] STEP036–041 및 선행 Graph/Layout/Calendar 계약 대조
- [x] 전체 잔여 승인 재사용 및 public/state/consumer 경계 구체화
- [x] 공통 입력·타입 순서·정규화·길이 재표본화·budget·완료 결과 private kernel
- [x] Hierarchical LCA + clamped B-spline private kernel
- [x] Force-directed compatibility + double buffer
- [x] Density field + vector advection
- [x] Edge-path Dijkstra + skip/lock
- [x] Full public actions·exact resource revision closure·prepared entry
- [x] 네 렌더러·scene·selection·inspection·codec·실제 데이터 소비자
- [ ] AT80/81/82의 session·animation·geo 교차 종료

## 승인과 기준

[AUTHORIZATION.json](../AUTHORIZATION.json)의 `remainingApproval`은 STEP077까지
남은 공개 API, 저장 구조, 아키텍처와 시각 결정을 명시 승인했다. 이 기록은 같은 범위를
구체화하며 승인을 재요청하지 않는다. 검증되지 않은 항목을 완료로 처리하지 않는다.
기준은 Calendar `c96637495`와 통합 `ff1ff820a`의 병합 `f0d674fe7`이다.
병합 관련 theme/Calendar/source resource/boundary/discovery 검사는 169/169 통과했다.

공개 연결의 구체화와 통합 기준은 [공개 연결 기록](edge-bundling-public.md)에 둔다.

## 최종 공개 계약

`bundleGraphEdges({ id, graph, layout, method, options, coordinateSpace })`는 명시 graph와
해당 graph의 fixed/circular/force node layout을 읽는다. `method`는 `hierarchical`,
`force-directed`, `density`, `edge-path` 네 값이며 입력 graph의 topology, direction,
weight, 원본 node 좌표를 바꾸지 않는다. Flow rectangle layout을 몰래 node layout으로
해석하지 않는다. 사용자 입력과 의미가 같을 때만 기존 unique selector 규칙을 적용한다.

저장 kind는 `edge-route`다. envelope `inputs`는 exact graph/layout revisions를 가지며
hierarchical 방법은 명시 hierarchy와 그 anchor layout refs도 가진다. `options`는 method,
coordinateSpace, 정규화한 사용자 의도를 보존하고 `result`는 `complete:true`, 원 graph edge
순서의 `routes`, 계산 diagnostics를 갖는다. 각 route는 `edgeKey/sourceKey/targetKey`,
`controlPoints`, canonical vector `commands`, bounds, provenance를 갖는다. 계산 결과와
옵션을 혼합하지 않는다. incomplete preview를 canonical resource로 저장하지 않는다.

공개 동기 action은 순수 계산→전체 후보 preflight→wrapped semantic primitive→필요한
consumer union materialization 순서다. 준비 경계는 exact original receiver, 입력 revision
vector, inputHash와 generation token에 묶고 abort/stale/late callback에서 쓰기를 거부한다.
캐시에는 graph/layout revision, method/version/options, coordinateSpace/viewport 및 asset
dependencies를 포함한다. 전역 mutable result 캐시를 추가하지 않는다.

## 공통 순수 owner

`grammar/graph/routes/budget.js`는 닫힌 limits와 native signal checkpoint를,
`common.js`는 normalized graph/positions/typed order 검증, long-axis frame 정규화와
완료 geometry 복원을, `polyline.js`는 finite arc length와 uniform resampling을 소유한다.
렌더러나 프로그램 쓰기/trace/host callback 저장은 없다. 참조 경로 제안 중 현재 기존
`materialization/graph/`와 `actions/graphs/` 소유자가 있으므로 신규 `materialization/graphs.js`
같은 중복 대형 소유자를 만들지 않는다.

`prepareRouteInput({model, positions, order:{nodes,edges}, limits}, signal?)`의 order arrays는
graph 원래 배열과 같은 순서의 raw typed keys다. source adapter가 원래 명시 keys를 읽고,
자동 occurrence/inferred key는 이미 해당 identity owner가 정한 stable 생성 key를 string
타입으로 전달한다. common owner는 opaque normalized graph key를 decode하지 않고 기존
`compareRowKeys`로 work buffer만 정렬한다. 결과는 원 graph 순서로 되돌린다.

공통 reference limits는 원안의 100000 nodes/1000000 edges/10000000 pairs/10000000
active samples를 상한으로 유지한다. 이보다 먼저 기존 전체 10000000 work guard에 걸릴 수
있으며 이는 처리량 보장이 아니다. `resource-limit`은 기존 오류 taxonomy를 재사용한다.
단계별 누적 work, candidate pairs와 peak active samples를 구분한다. 각 solver는 allocation
전에 active samples를 preflight하고 연산량을 별도 charge한다.

완료 owner는 원 endpoint와 다른 solver 출력을 거부하고, world 좌표로 복원한 끝점에는
원 좌표를 정확히 사용해 signed zero도 보존한다. 빈 graph 결과는 빈 routes이고 degenerate
bbox는 scale1이다. 원 bbox 범위나 복원 좌표가 finite 범위를 넘으면 조용히 clamp하지 않고
실패한다. self/zero route의 point fallback은 solver의 명시 정규화 옵션과 reason으로 기록한다.
공통 완료 helper에는 partial/preview 옵션이 없다.

## 소비자와 종료 의무

| 소비자 | 첫 공통 checkpoint | STEP036–041 공개 종료 |
| --- | --- | --- |
| graph/layout 입력 불변, typed work order | literal + malformed 검사 | 네 방법 × observed/inferred/direction |
| source/layout revision 및 removal | 공개 연결 전 미적용 | exact closure preflight, atomic failure, removal restrict/cascade |
| renderer/scene | 기존 canonical M/L geometry만 생성 | Canvas/SVG/PNG/PDF 동일 route, export parity |
| inspection/codec | resource 미등록 | exact refs, method/version/options/result 검증; solver 재실행 없음 |
| overlap hit/selection | 미연결 | 원 edge 후보 정렬, 선택만 temporary unbundle overlay, keyboard cycle |
| current frame/drag/animation | 미연결 | 끝점 frame anchor, interruption continuity; STEP065 owner와 통합 |
| geo | 미연결 | pixel spline/great-circle 구분, dateline split/projection clip; STEP042–046 연결 |
| async/cache | native abort 체크만 있음 | sync hash parity, token/stale/ABA, listener/buffer cleanup, AT82 |
| types/current/docs/installed | public export 추가 없음 | exact signatures와 사용례/4 methods를 함께 제공 |

원 수치·default는 [edge-bundling 계약](../../../../study/coverage-expansion-2026-10-27/roadmap/contracts/edge-bundling.ko.md)을
따른다. 첫 private checkpoint를 STEP036/AT75/AT82 전체 완료로 간주하지 않는다.

## 공통 kernel 검증

[고정 증거](edge-bundling-evidence/common/status.json): canonical unit capability selector 9/9,
같은 9개 검사의 native coverage에서 세 owner 모두100/100/100, source/discovery27/27,
package artifact 및 coverage policy14/14 통과. 기존 family 최소95/90/100을 새 owner에
자동 적용하며 global floor나 기존 override를 낮추지 않았다. 원본 실패는 fixture의 기존
graph field 이름·오류 metadata 읽기 및 capability 알파벳 순서였고 수정 전 로그도 보존했다.

Node20/22/24의 실제 npm child runtime을 명시하여 package를 측정했고, 동일 tar
`c1069ff55d185eff5e8e578cedd52d6e51b3f729612a7719c57d0e2ceec3f44a`에서 생성한 네 entry의
같은 minified bytes를 세 zlib로 압축했다. 합산 Theme 기준 크기 변경은 별도 상한 설명으로
구분한다. Private kernel은 어느 public entry에서도 아직 도달하지 않으며 API/type/Current
추가는 이 checkpoint의 범위가 아니다. 이후 공개 연결에서 실제 type/docs/renderer 소비자를
모두 연결하고 검증한다.

## Hierarchical 계산 checkpoint

`hierarchical.js`는 기존 hierarchy model 검증과 source adapter가 명시한 mapping/anchor를
사용한다. Graph의 모든 node를 정확히 한 번 mapping하고 hierarchy 내부 node를 포함한 모든
anchor를 제공해야 한다. Mapping한 endpoint anchor는 원 graph position과 같아야 한다.
서로 다른 root는 기존 hierarchy owner의 명시 synthetic root가 있을 때만 연결된다. Endpoint
평균으로 내부 anchor를 만들거나 별도 가짜 graph node를 만들지 않는다.

`strength` 기본.85, 범위0–1; `tolerance` 기본.001 normalized units의 양수 finite 값;
`maxSubdivisions` 기본4096, 1–4096 정수; `zeroLength`는 명시 정규화 값 `point`다.
조상 경로는 depth를 맞춰 LCA를 한 번만 포함하고, straightening한 controls를
`spline.js`에서 de Boor로 계산한다. 각 knot span을 끝값·미분값으로 cubic으로 정확히 바꾼
뒤 기존 path convex-hull 분할 owner를 호출한다. 저장 vector는 허용 오차 안의 polyline이며
원 endpoint는 정확히 보존한다. 부분 분할 진단이 있으면 canonical 완료 결과를 만들지 않는다.

`pathGeometry.flattenPathCommands`의 호출별 `maxPoints`는 기본1,000,000을 유지한다.
Line/close/new subpath/cubic 모두 이 한도를 검사하며 정확히 한도인 결과는 허용한다.
HEB의4096 subdivision은 해당 method의 sampled geometry에만 적용한다. 공통 vector는 기존
30,000 path command 한도를, hierarchy control polygon은 총sample guard를 사용하므로
strength0에서5000-depth ancestry를 정확한 직선으로 만들 때 provenance를 잃지 않는다.

독립 Cox-de Boor basis oracle와 literal midpoint를 de Boor 구현의 비교 기준으로 사용한다.
5-node 경유 경로, 같은 subtree, strength0/1, forest/self/empty, 키 순서 변경, 좌표 이동·배율,
정규화 tolerance, 빠진 내부 anchor, 타입/getter, budget/abort 및 deep ancestry를 검증한다.
공개 resource/codec/worker/renderer 연결은 위 소비자 표의 열린 의무 그대로다.

[고정 검증 증거](edge-bundling-evidence/hierarchical/status.json): route canonical unit17/17,
route+path coverage25/25(새 route5owner100/100/100, 기존 pathGeometry92.28/91.30/100),
architecture/discovery/policy34/34, 기존 hit/compound path 소비자36/36, package7/7 통과.
동일 tar의 네 entry를 세 Node/zlib에서 비교했으며 Full660,081/Basic369,582/SVG20,196/
interaction82,859 gzip bytes로 기존 상한 안이다. Full coverage/전체 renderer suite 완료를
뜻하지 않으며 public checkpoint에서 필요한 해당 검증을 계속한다.


## Force-directed 계산 checkpoint

`compatibility.js`는 원 endpoint의 angle/scale/position/양방향 visibility를 계산한다.
`forceDirected.js`는 typed-key 순서의 compatibility graph, arc-length 재표본화, 고정
6-cycle/165-iteration schedule 및 old/new buffer를 소유한다. 원안 K=.1, step=.1×.5^c,
internal samples=2^c를 그대로 쓰며 사용자 tuning 값으로 늘리지 않는다. Authorable 옵션은
`compatibilityThreshold`(기본.6, 0–1)와 `zeroLength:'point'`다. Threshold0에서도 실제
compatibility0인 pair를 만들지 않는다. Directed 반대 방향을 제외하고 undirected 반대
방향은 sample 대응만 역전한다. 정규화 길이≤1e-9는 계산에서 제외하되 원 endpoint를
유지하며 exact0과 below-epsilon을 provenance reason으로 구분한다.

고정 schedule의 전체 sample peak와 pair별 attraction 작업량을 mutable buffer 할당 전에
계산한다. 매 iteration은 이전 buffer만 읽고 새 points를 만들며 displacement .1 cap 횟수를
diagnostics에 기록한다. 정상 route를 임의 cubic으로 압축하지 않는다. Literal10/11 compatibility,
9/100 first-step displacement, spring.198, same-point0 및 simultaneous 대칭성을 검증한다.

[고정 검증 증거](edge-bundling-evidence/force-directed/status.json): canonical unit26/26,
동일26개 coverage에서 route7owner 모두100/100/100, boundaries/discovery/policy34/34,
package7/7 통과. 기존95/90/100 floor와 모든 global floor는 유지한다. 새2개 private module은
어느 public entry에서도 import되지 않아 HEB의 동일 bundle 증거를 재사용한다. 실제 패키지
staging은 세 Node에서 재측정했고 entries931/unpacked6,126,103/packed최대1,337,161bytes다.
Public resource/worker/renderer/codec 연결은 아직 위 표의 열린 의무다.

## Density 계산 구체화

고정256² grid와20회 bandwidth/step schedule은 원안대로 두고 별도 tuning 옵션을 늘리지
않는다. Arc-length half-neighbor weight와 tangent를 가진 samples가 compact radial kernel을
splat한다. Directed tangent는8 circular channels에 선형 분배하며 query 방향의 각 이웃
channel(-1/0/+1) 합을 같은 선형 비중으로 읽는다. 반대 방향 channel은 섞지 않는다.
Grid는 normalized unit의 등방성 square다. 각 iteration의 old route 중심에 변 길이를
max(1, width, height)로 맞춘 뒤 현재 bandwidth halo를 더한다. 짧은 축을 늘려 동일한
정규화 거리에서 x/y sampling 간격을 유지하고, 퇴화한 수평 route에도 zero-height grid를 만들지 않는다.

희소 Map은 실제 기여한 grid cell만 보관한다. 중앙 차분(경계는 편측 차분)을 필요한 grid
node에서 평가한 뒤 bilinear 보간하므로 전수 field/gradient 배열과 같은 CPU 정의다.
Allocation 및 splat rectangle 작업량을 사전 검사하며 field와 sample buffers는 결과에
저장하지 않는다. 초기 route는 첫 bandwidth spacing으로 먼저 재표본화하고, 각 iteration은
old field→동시 advection→[1,2,1]/4 smoothing→endpoint 재고정→현재 spacing 재표본화한다.
Zero-length는 weight0인 exact point route이며 canonical result에 명시 reason을 남긴다.


Density의 authorable 옵션은 `zeroLength:'point'`이며 다른 수치들은 `density-v1`의 고정
정의다. Field와 transient point buffers의 동시 peak 및 누적 splat 작업을 사전에 검사한다.
명시 sample limit, work limit, nonfinite field/gradient 또는 abort는 완료 결과를 반환하지 않는다.
Scalar kernel1/.5625/0, 도함수-1.5, 독립 dense8×8 모든 cell·border 차분, bilinear,
방향 wrap/interpolation, arc-length mass, simultaneous advection/smoothing과 exact endpoints를
검증했다. Internal point는 계산한 gradient를 그대로 따르며 직선으로 보이도록 숨은 보정을 하지 않는다.

[고정 검증 증거](edge-bundling-evidence/density/status.json): canonical route34/34,
동일34개 coverage의9개 route owner 모두100/100/100, architecture/discovery/policy34/34,
package7/7 통과. 최초2개 fixture 실패는 circular floating fraction을 exact.5로 비교한 조건과
endpoints를 넘어 모든 internal sample의 y=0을 요구한 과도한 조건이었다. 원본 로그를 보존하고
원 계약의 허용 오차 및 endpoint 보존으로 고쳤다. 기존 floor는 낮추지 않았다.
세 Node의 실제 package는933 entries/6,135,655 unpacked/최대1,339,858 packed bytes이고
새 private owner만 추가돼 기존 HEB bundle 입력과 증거는 그대로 유효하다.

## Edge-path 계산 구체화

`exponent`는 기본2의 양수 finite, `maxStretch`는 기본2의1 이상 finite이며 `zeroLength`는
`point`다. 원 normalized geometric length의 지수만 cost로 쓰고 semantic weight를 읽지 않는다.
Descending cost 다음 raw typed edge-key 순서로 candidate를 처리한다. Dijkstra의 동일 cost는
전체 경유 edge-key sequence의 사전순으로 결정하며 zero-cost cycle은 settled node를 재방문하지
않는다. Skip/lock은 호출별 private 배열이고 성공한 path의 실제 graph edges만 lock한다.

원 anchor chain은 controlPoints와 provenance에 보존한다. Vector는 endpoint를 고정한 .25
convex corner cut 한 번을 적용한다. Convex triangle inequality로 길이가 늘지 않는 방식이며
실제 pre/post 길이를 모두 검사한다. 수치 초과가 있으면 smoothing을0으로 줄여 원 polyline을
쓴다. Graph node를 추가하거나 숨은 shortcut을 만들지 않는다. Cost/길이 overflow, queue 또는
output sample/work 초과는 완료 결과를 반환하지 않는다.


[Edge-path 고정 증거](edge-bundling-evidence/edge-path/status.json): canonical unit41/41,
같은41개 coverage에서11개 route owner가 기존95/90/100 floor를 모두 통과했다.
`edgePath.js`는100/100/100, `shortestPath.js`는98.41/92.31/100이며 나머지는100/100/100이다.
Boundary/discovery/policy34/34, package7/7도 통과했다. 삼각형 literal의 경유 node와
2√2 원 path 길이, stretch1.2 거절, 반대 방향, typed-key tie, stale queue, zero-cost cycle,
parallel/self/empty, semantic weight 무관성, budget/abort/overflow를 검증했다. 실제 부동소수점
collinear 사례에서 smoothing 후 길이의 작은 초과를 발견하고 원 anchor polyline으로 되돌리는
회귀도 고정했다. Package는935 entries/6,145,064 unpacked/최대1,342,662 packed bytes다.
새 owner만 추가되어 HEB의 public bundle 증거는 그대로 유효하며 전체 공개 소비자 검증은
다음 체크포인트에 남아 있다. 네 알고리즘의 계산이 끝난 것을 STEP036–041 전체 완료로 보지 않는다.


## 공개 연결 검증 완료

공개 source `a491a8b8e`와 후속 test/documentation 수리 결과는 [공개 연결 기록](edge-bundling-public.md#공개-checkpoint-최종-검증) 및 그 증거 정본에서 소유한다. 최초 전체 결과와 수리 owning checks를 구분했고 package input은 동일하다. AT80/81/82 교차 종료와 Geo042–046 의무는 위 checklist에서 열어 둔다.
