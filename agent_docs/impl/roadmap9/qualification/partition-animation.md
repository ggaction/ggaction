# Partition typed animation 준비

## 진행 상태

- [x] 기존 bend/adapter/view와 private frame owner를 감사했다.
- [x] remainingApproval를 재사용하고 구체 입력·gap 계약을 기록했다.
- [x] typed 준비·복원·반복 샘플과 native frame 교차를 구현했다.
- [x] 수치·endpoint·현재 hit·지원 Node·owner coverage를 검증했다.
- [ ] source/evidence checkpoint를 push하고 최종 planner 의무를 인계한다.

## 승인 및 기존 owner

[기존 전체 승인](../AUTHORIZATION.json)의 remainingApproval를 재사용한다.
[계층 원안](../../../../study/coverage-expansion-2026-10-27/roadmap/contracts/hierarchy-partition.ko.md)과
[animation 원안](../../../../study/coverage-expansion-2026-10-27/roadmap/contracts/animation.ko.md)을 적용한다.
새 public export, semantic/ChartProgram schema, player API는 만들지 않는다.

partitionBend는 canonical (u,v,bend) 수학, partitionAdapter는 화면 basis/회전/방향,
partitionMapping은 native rectangle/sector/radius, partitionView는 focus interval을 소유한다.
기존 materialization/hierarchy/partitionFrames는 exact native endpoint·concrete paint·clip·
reduced-motion·현재 path hit를 이미 구현하지만 WeakMap plan은 직렬화할 수 없다.
새 grammar/hierarchy/partitionInterpolation은 이 수학을 재사용하는 typed state 검증과
보간만 담당하며 기존 frame sampler가 이를 소비한다.

## private 값 계약

Endpoint는 `{nodes,focusKey,bend,frame}`다. nodes는 bounded stable preorder의
`{key,parentKey,u0,u1,v0,v1,visible}`이며 parent/순서 topology와 전체 hidden node를 보존한다.
범위는 아직 CSS gap으로 줄이지 않은 normalized interval이다. frame은
`{origin:[x,y],angle,handedness,kernel,gap:[uPx,vPx]}`이고 kernel은 기존 bend의
width/height/innerRadius/outerRadius/radiusPolicy/sweep이다. 모든 값은 이미 해결된
plain data이며 원 hierarchy/partition resource를 바꾸거나 저장하지 않는다.

preparePartitionInterpolation은 `{kind:'partition',version:1,mode,from,to,reason?}`를
불변값으로 만든다. key/parent/순서 변경은 topology, visible 집합 변경은 visibility,
handedness 또는 radius policy 변경은 각 명시 reason으로 crossfade한다. 같은 topology와
visibility에서 raw interval·bend·크기·hole·center·CSS gap은 보간하고 angle은 기존
animation shortest-rotation owner를 사용한다. focusKey는 endpoint 의미이며 중간에는
from 값을 유지하고 t1에서 to 값을 그대로 반환한다. focus가 숨기는 node를 다른 node로
자동 치환하지 않는다.

samplePartitionInterpolation은 닫힌 version/shape, descriptor 및 정합성을 다시 검사한다.
중간 sample.state는 다음 prepare의 from으로 직접 사용할 수 있어 geometry를 역산하지
않고 재기준한다. incompatible 중간값은 한 state로 환원하지 않고 weighted capture의
후속 책임으로 남긴다. unknown/undefined/추가 key/잘못된 reason·mode는 거부한다.

## gap과 bounded 계산

기존 frame은 endpoint에서 inset된 경계를 역산 후 보간했다. 원안대로 raw normalized
경계를 bend한 뒤 현재 CSS gap을 적용하도록 단일 bend owner에서 수리한다. canonical
곡선의 현재 접선 길이와 깊이 위치를 기존 radius/bend 함수로 계산한다. equal-area의
중간 깊이 역해석은 고정 횟수 단조 이분법으로 한 owner에서만 수행한다. b0/b1의 native
rectangle/sector 수치와 비교하고, exact native graphic 반환은 기존 materializer가 유지한다.
node 수/문자열/샘플 point work는 기존 generated/work limit으로 사전 제한한다.

## 후속 책임

이 private typed 수학과 기존 per-mark frame adapter는 공개 animation planner 완료가 아니다.
최종 planner는 exact hierarchy/layout refs와 endpoint graphics/assets, same-family native
adapter, focus enter/exit, weighted crossfade, interruption, scene/current-frame hit, keyboard/
selection, four backends 및 offline envelope를 연결해야 한다. 전체 AT-65를 완료로 표시하지 않는다.


## 실행 결과

| 검사 | 결과 | 검증 범위 |
|---|---|---|
| Node20.20.2 /22.23.1 /24.22.1 | 각각37/37 | typed track, native frame, adapter/bend/mapping/view |
| 집중 source coverage |37/37,99.75/97.35/100 | 기존 hierarchy family95/90/100 floor 다섯 owner 모두 유지·통과 |
| 새 partitionInterpolation |100/100/100 | descriptor·version·closed shape·정합성·bounded deep preorder |
| 기존 partition 회귀 |24/24 | native plot, source revision, FillPaint, normalized layout |
| source/package/discovery |33/33 | 순환/import·공개 entry·named selector 경계 |
| canonical package contract |7/7 | 기존 staging/compaction 및 실제 package cap 검증 |

32개 compatible 일반 방향 조합의 literal endpoint, 반사 incompatibility, 같은 family의
size/hole/center/focus 변화, exact native b0/b1 및 reduced-motion, 현재 sample 재기준을
검증했다. 현재 곡선의 독립 arc/radial 거리로 gap을 비교했고 gap이 중간 셀을 소진하면
body와 label이 함께 사라지고 hit도 사라지는 것을 확인했다. 실제 source 재부모화는 같은
node key 집합을 유지해도 topology crossfade하며 focus visibility 변경과 구별된다.

첫17개 검사의1실패는 focus reason 기대값이 topology였던 기존 assertion이고 visibility로
갱신했다. 추가 native 검사의 coverage 첫 실행36개 중1실패는 새 fixture의 잘못된
reviseData target 옵션, 다음37개 중1실패는 labels.field 옵션이었다. 현재 계약의
source/id 및 labels.content로 fixture를 수리했고 최종37개는 전부 통과했다.
원 실패 로그와 수리 후 로그를 별도로 보존하며 최초 실행을 통과로 재분류하지 않는다.

동일 source staging의 package 실측은1,049entries/6,769,256unpackedbytes다.
Node22 packed1,486,310, Node20·24 packed1,489,945bytes이며 기존1,048entries/
packed1,489,000/unpacked6,763,000을 초과했다. 실제 측정 후 cap을1,049entries/
packed1,491,000/unpacked6,771,000으로만 조정하여 최소1,000bytes 여유를 뒀다.
측정 helper는 기존 runPack owner를 임시 module에서 호출하고 즉시 제거하며, production
cap 검증을 우회하지 않는다. 세 runtime/zlib 결과와 helper를 함께 보존한다.

이 checkpoint는 private source 검사이며 public installed consumer, 전수 release,
새 renderer 또는 전체 animation 완료를 주장하지 않는다. 새 공개 entry·타입·Current
계약이 없으므로 fake public API나 예제는 추가하지 않았다. Working candidate에서 실행한
입력을 source commit의 exact bytes와 대조하고 기존 verification-evidence owner로
hash를 확인하며 clean release receipt와 구분한다. 공통 realistic builder 변경은 없다.
