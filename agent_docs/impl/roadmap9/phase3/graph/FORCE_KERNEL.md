# 결정적 force 배치

## 진행 상태

- [x] STEP-021 계약, 기존 graph model/fixed/circular 계산과 승인 확인
- [x] 정확한 반복식·고정 노드·컴포넌트 packing의 구체 결정
- [x] 독립 literal과 수치 불변 검증
- [x] 순수 kernel 구현 및 source/package 검증
- [ ] commit/push와 public GraphResource/NodeLayout 인계

남은 전체 설계 승인은 [AUTHORIZATION](../../AUTHORIZATION.json)의 사용자 지시를 적용한다.
기존 model은 topology의 단일 owner이며 force 계산은 edge를 추론하거나 추가하지 않는다.

## 계산 결정

Private `layoutGraphForce(model, options)`는 seed(uint32), iterations(0 이상 정수),
linkDistance, repulsion, collisionRadius, damping(0..1), center:[x,y], componentGap을
명시한다. 거리·힘·간격은 finite 비음수다. Optional initialPositions는 모든 opaque node key의
x/y를 정확히 한 번 포함하고 기존 fixed owner로 검증한다. Optional pinned는
`{key,fx,fy}` 배열로 완전 고정 위치를 지정하며 partial pin은 받지 않는다.

초기 좌표가 없으면 versioned uint32 PRNG의 동일 seed와 model 순서로 위치를 생성한다.
동일 weak component의 node pair마다 exact repulsion `repulsion/max(distance²,1)`과
collision push `max(0,2*collisionRadius-distance)/2`를 합산한다. 각 edge는 weight와 무관하게
`0.1*(distance-linkDistance)` spring을 적용한다. Weight0도 연결이다. Coincident pair는
stable node 순서의 +x 방향을 사용한다. 한 iteration의 모든 힘은 이전 좌표에서 구하고
`velocity=(velocity+force)*damping`, `position+=velocity`로 동시에 진행한다.
Pinned node는 매 반복 fx/fy와 zero velocity를 유지한다. Wall-clock 종료나 approximate solver는 없다.

각 unpinned component의 중심을 정렬하고 horizontal packing을 실행한다. Node collision radius를
포함한 bounds와 componentGap을 사용하며 zero-width component도 1 unit 슬롯을 가진다.
Pinned component는 절대 이동하지 않는다. Pinned component가 있으면 나머지는 그 오른쪽으로
배치한다. 서로 겹치도록 사용자가 고정한 pinned component를 임의 이동시키지 않는다.
모든 component에 pin이 없으면 전체 packed 폭을 center.x에, 각 component를 center.y에 맞춘다.
Empty는 nodes[], singleton은 center 또는 명시 pin이다. Options·algorithmVersion·packing 결과를
반환하며 source topology/adjacency/attributes를 두 번째 owner로 저장하지 않는다.

Work는 graph model 검증비용과 pair×iteration, edge×iteration, node/packing 비용을 allocation 전에
합산한다. Overflow와 한도 초과는 예외이며 입력은 불변이다. Full public action, 저장 schema,
source revision와 renderer 연결은 다음 통합 의무다.

## 검증 증거

[고정 로그와 manifest](force-evidence/manifest.json)에 원본, SHA와 입력 source를 보존한다.
Node22 graph 계산 시험69개가 통과했고 graph owner10개의 critical floor를 충족했다.
새 force owner는 lines/branches/functions100/100/100이다. Node20/24의 force+fixed/circular
시험16개씩도 통과했다. Source/package/discovery 경계33개, package artifact7개를 통과했다.
`node scripts/check-graph-layout-fixtures.js`는 기존3개와 force spring/pin/components3개를
포함한6개 fixture의 keyed coordinates와1e-12 tolerance diff를 기록한다.

Package는739entries, unpacked5,063,532bytes, Node20/24 packed1,100,823bytes다.
기존 entry738 한도 실패를 보존하고 entry739/packed1,101,000/unpacked5,064,000으로
최소 조정했다. Public import graph에 연결하지 않은 private kernel이라 browser 출력과
Full/Basic API 경계는 기존과 같다. Public action/codec/source revision/renderer 통합 및
STEP-021 전체 완료를 이 계산 checkpoint만으로 주장하지 않는다.
