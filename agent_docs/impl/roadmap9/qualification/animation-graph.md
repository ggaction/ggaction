# Graph node와 route typed 전환 연결

## 진행 상태

- [x] 원안 animation의 graph node·bundled edge 의무와 기존 owner를 대조했다.
- [x] remainingApproval를 재사용하고 source 소유와 구체안을 기록했다.
- [x] 실제 graph/layout/route 준비값을 native endpoint와 교차검증한다.
- [x] 기존 route·edge geometry 계산으로 중간 frame을 생성한다.
- [x] private 재기준·strict export/restore·현재 concrete hit·네 renderer를 검증한다.
- [ ] 공개 animation entry와 합친 동일 tar 소비자 및 session hit/retention을 검증한다.

## 범위와 승인

[기존 잔여 승인](../AUTHORIZATION.json)의 remainingApproval 안에서
[animation 원안](../../../../study/coverage-expansion-2026-10-27/roadmap/contracts/animation.ko.md)의
stable node key, fixed endpoint, normalized arc-length route, 현재 anchor 보정 의무를 구현한다.
Point 안정 source69cb70d0c/evidence d5cd6a0fb를 별도 branch에 보존한다.
새 branch는 codex/roadmap9-animation-graph이며 기존 공개 entry/Current 소유자는 offline 담당이다.
이 문서는 아직 구현된 Current 계약이 아니다.

## 기존 계산 소유자

- selectors/graphs.resolveGraphLayerResources: exact graph/layout/data 참조.
- materialization/graph/plot.resolveGraphPlot: resolved layout→origin→현재 native item/geometry.
- grammar/graph/itemIdentity.graphItemKey: 원 node/edge key와 역할.
- materialization/graph/geometry: ordinary parallel/loop edge 및 arrow 계산.
- materialization/graph/routeGeometry: stored center route의 radius inset 및 arrow 계산.
- grammar/animation/routes: 공통 arc-length grid와 현재 source/target anchor 보정, collapse/stretch 판정.
- grammar/animation/values: finite numeric·size 보간.

위 수식을 복제하거나 tick마다 graph inference/layout/route solver를 실행하지 않는다.
원 endpoint의 key·role·topology·lineage를 정확히 유지하며 데이터 row index는 대응 근거가 아니다.

## 준비와 샘플 구체안

Native adapter는 scope별 graph layer를 한 번 resolve하여 graph/layout/route의 exact refs,
stable model node/edge keys, 완료 layout 위치, resolved origin, 반지름과 edge geometry 옵션을
닫힌 값으로 준비한다. 원본 graph/data 의미를 pixel에서 역산하지 않는다. 필요한 origin은
이미 계산된 resolveGraphPlot의 transient 결과를 재사용한다. body/arrow/label item 연결은
기존 graphicIdentity로 검증하며 direct primitive edit는 명시 incompatibility로 남긴다.

같은 node는 저장된 layout 위치와 origin을 보간한다. Ordinary edge는 현재 node 위치와
반지름에 기존 geometry owner를 적용하며 parallel/loop 관계 변화는 topology 판정에 포함한다.
Stored route는 완료 center points를 기존 arc-length kernel에 넣고 현재 node center에 정확히
고정한 뒤, 기존 inset/arrow owner를 사용한다. Arrow는 별도 임의 path morph를 하지 않는다.
Route collapse/stretch/clip 문제는 이유가 있는 weighted crossfade다. 구조가 달라진 edge를
다른 edge로 대응시키거나 arbitrary commands 개수를 맞추지 않는다.

현재 point positions와 달리 graph는 layer 단위 공유 anchor가 필요하다. 따라서 graph prepared
state는 node마다 전체 model을 복제하지 않고 scope별 한 번만 보관하고 track은 group/key/role만
참조한다. Export는 이 값과 완료 endpoint payload를 보관하며 restore는 inference 없이 같은
closed schema와 endpoint geometry 정합성을 검증한다. Kernel manifest는 실제 graph/route
계산 version을 명시한다. 현재 point-only manifest와 같은 version을 임의로 재해석하지 않는다.

## 후속 경계

새 graph current state를 authentic frame에 보관하는 위치는 root frameProvenance owner와
조율한 후 그 owner를 확장한다. 별도 callback이나 전역 pending 상태는 만들지 않는다.
현재 captured frame 객체의 과거 plan 참조 수명 및 offline scoped hit 주소 의무도 계속 유지한다.
Graph typed 구현만으로 partition/geo/Cartesian rule·rect·line·area·polar·guide 의무가 끝나지 않는다.
중간 node anchor·route 연결 numeric oracle, public source revise/layout edit, nested composition,
restore corruption, 현재 hit, 네 backend와 동일 tar 소비자 증거를 구분하여 닫는다.

## 구현 경계와 확인

`groups`는 각 scoped owner의 raw layout/route 의미를 한 번 보유하고 `items`는
scene node 순서의 group/key/kind/role 참조다. node와 edge의 같은 key는 kind로 구분하고,
동일 child program을 여러 composition namespace에 놓아도 각 scope를 따로 준비한다.
현재 graph frame은 이 벡터를 그대로 재기준하며 restore는 저장된 endpoint와 native
forward geometry를 검증한다. `completed-graph-layout@1`과
`anchored-arc-length-route@1`을 실제 payload manifest에 명시한다.

동일 경로의 uniform resampling이 원 모서리를 자르던 결함을 수리했다. 같은 raw 경로와
현재 anchor가 같으면 원 centerline을 유지한다. 완전히 같은 graph 의미와 concrete node만
exact로 취급하므로 stationary collapsed loop도 원본 그대로이며, 픽셀만 같고 raw layout과
origin이 다르면 여전히 typed 의미를 보간한다. 이 exact 검사와 parallel ordering 비교는 group pair당 한 번 계산하며
전체 group/route 및 frame work는 기존 10M 한도를 유지한다.

최종 source 후보에서 canonical 관련172개, animation coverage122개가 통과했다.
집중 coverage는 line100/branch97.26/function100이며 모든 기존95/90/100 floor를 유지했다.
초기 stationary122개 중120개 통과 결과는 Canvas background decision과 resolved margin을
반영하지 않은 신규 fixture 기대값2개였고, 수정 후122개 모두 통과했다. 그 전 원 stationary
self-loop 실패와 실제 route 수리는 원본 로그로 구분하여 보존한다.

네 renderer 증거는 actual graph body/label/edge/arrow의 native와 재기준 프레임, ordinary와
stored route를 사용한다. Exact endpoint PNG, 중간 literal pixel과 vector PDF, browser
Canvas/SVG DPR1/2를 확인한다. 현재 hit 검사는 실제 중간 concrete shape 위치를 확인하며
public session adapter의 graph scope/retention integration이 완료됐다는 뜻은 아니다.

### 최종 합산으로 남기는 의무

- 공개 caf731f73의 entry/Current/type/offline envelope와 합산하고 graph 지원 문구 및 같은 tar
  Node20/22/24 소비자를 확인한다. 이 branch의 Node별 검사는 source import이며 설치검사가 아니다.
- computed 담당의 flat frame provenance 수리를 합쳐 원 graph groups/items를 단일 보존하고
  repeated interruption의 이전 plan 보유를 제거한다. Root session hit와 offline scoped hit를 확인한다.
- Root partition, 별도 담당 Cartesian rule/rect/line/area 및 나머지 Geo/polar/guide typed kernel을
  연결한다. 현재 fallback은 그 compatible-family 의무를 면제하지 않는다.
- 최종 공통 corpus와 release qualification은 root가 합산 candidate에서 실행한다.
