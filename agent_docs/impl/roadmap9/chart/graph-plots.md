# 그래프 배치와 노드·간선 차트

## 진행 상태

- [x] 관측 그래프의 typed node/edge identity와 원본 table revision 계약
- [x] fixed/circular/seeded force 순수 kernel
- [x] layoutGraph와 공통 editLayout 및 저장 검증 (source 구현·focused 검증; 설치·문서 qualification 진행 중)
- [ ] 그래프 수정→layout→node/edge/label의 명시 materialization
- [ ] 네 renderer·선택·inspection·접근성·저장·패키지·문서 검증

[전체 승인](../AUTHORIZATION.json)의 남은 설계 결정 승인을 적용한다. STEP-021은 layout solver가 관계를 추론하지 않는 경계를 유지한다. STEP-029–032의 inference는 graph model을 생성하는 별도 도메인이다.

## 공개 배치 API

`layoutGraph({ id, graph?, method, options? })`의 method는 fixed/circular/force다. graph selector는 explicit→current eligible→unique 순서이며 모호하면 오류다. id는 필수이며 기존 layout ID를 덮지 않는다.

- fixed: `positions: [{ key, x, y }]`가 모든 node를 정확히 한 번 덮는다. key는 createGraphData의 원본 typed key다. 좌표는 유한수다.
- circular: center `[0,0]`, radius `100`, startAngle `0`을 기본으로 하며 기존 polar clockwise degree 의미(0은 위쪽)를 따른다. 0 nodes는 빈 결과, 1 node는 center다.
- force: seed `1`, iterations `300`, linkDistance `30`, repulsion `100`, collisionRadius `4`, damping `.9`, center `[0,0]`, componentGap `16`을 기본으로 저장한다. `initialPositions`는 fixed와 같은 완전 좌표 배열, `pinned: [{key,fx,fy}]`는 고정 subset이다. 모두 같은 원본 typed key다. 벽시계 종료나 edge inference를 사용하지 않는다.
- maxNodes/maxEdges는 기존 graph 한도 owner를 재사용한다. explicit undefined 및 지원하지 않는 옵션은 오류다.

`editLayout({ target?, options?, order? })`은 기존 이름을 공유한다. layout의 단일 input.kind가 hierarchy 또는 graph인지에 따라 소유 도메인으로 전달하며 graph에서 order는 오류다. method는 생성 시 결정되며 편집으로 바뀌지 않는다. options는 기존 intent에 부분 병합하고 빈 편집은 거부한다.

## 상태와 책임

layout resource는 기존 kind를 유지하며 정확히 하나의 graph InputRef를 저장한다. 새 discriminator를 추가하지 않는다. options에는 method와 정규화된 typed authoring intent, result에는 opaque node key와 finite x/y, force algorithm version·component packing 결과를 저장한다. provenance origin은 inferred이며 실제 graph source-row refs를 보존한다. 복원은 저장된 binding·숫자·node coverage·pin·packing의 일관성을 검사하고 force solver를 재실행하지 않는다.

Full의 layout validation을 `materialization/layoutState.js`가 input.kind에 따라 닫힌 두 owner로 전달한다. 공통 editLayout facade는 `actions/layouts/index.js`로 옮기고 hierarchy의 기존 편집·rematerialization body를 재사용한다. 그래프 action은 명시 graph→layout closure를 먼저 계산·preflight하고 prepared primitive replacement로 한 번에 반영한다. Renderer는 concrete graphic만 읽는다.

## 후행 그래프 표시

배치 resource를 소비하는 createGraphPlot/editGraphPlot은 node/edge/label 역할과 source lineage를 보존해야 한다. Shape style과 placement는 materialization config, source graph/layout binding은 semantic state에 둔다. Parallel edge와 self-loop를 삭제하거나 같은 item key로 합치지 않는다. 해당 facade의 세부 옵션·대표 primitive evidence는 공개 구현 전에 이 문서에서 확정하며 현재 코드 완료로 주장하지 않는다.

## 노드·간선 표시 세부안

남은 계획 일괄 승인(AUTHORIZATION.json)에 따라 아래 구체안을 적용한다. public 연결 전에 같은 geometry의 primitive PNG와 수치 fixture를 기록하고 renderer 일치를 검증한다.

- `createGraphPlot({id?,layout?,origin?,clip?,nodes?,edges?,labels?})`, `editGraphPlot({target?,layout?,origin?,clip?,nodes?,edges?,labels?})`를 Full에 추가한다. 기본 역할 ID는 graphPlot이며 두 번째 그래프는 명시 ID가 필요하다. layout은 graph를 입력으로 갖는 current/unique resource에서만 추론한다.
- mark type은 graph, layer의 graphBinding.layout은 exact InputRef다. graphLabels에 label 의미만 저장하고 graphPlot materialization config가 paint·placement를 소유한다. renderer는 collection의 circle/path/text만 소비한다.
- origin 기본 auto는 node bounds를 plot frame 중앙으로 이동하며 scale이나 topology를 바꾸지 않는다. 명시 [x,y]는 plot-relative translation이다. clip 기본 false다.
- nodes 기본 radius6, fill#2563eb, stroke#ffffff, strokeWidth1, opacity1이다. fill은 현재 FillPaint다. nodes.overrides는 원 typed node key와 같은 style subset이다. 존재하지 않거나 중복된 초기 target은 거부하고 이후 topology 변경으로 사라진 target은 orphan-style diagnostic으로 남긴다.
- edges 기본 stroke#94a3b8, strokeWidth1.5, opacity1, parallelGap16, loopRadius20, arrowSize8이다. arrows 기본 auto는 graph.directed를 따른다. false는 명시 생략이다. 병렬 간선은 endpoint pair별 원 순서에 따라 좌우 cubic으로 나누며 self-loop는 별도 cubic loop를 남긴다. 간선 identity와 adjacency는 절대 합치지 않는다. arrow는 edge의 같은 logical item에 속하는 별도 graphic role이다.
- labels 기본 false, `{}`는 node key label을 활성화한다. labels.field는 graph에 보존된 attribute를 고르며 없는 attribute 이름은 거부한다. null/undefined attribute는 빈 문자열, scalar는 문자열로 표시하고 object/array는 오류다. 색·폰트·offset과 key/text overrides를 편집할 수 있다.
- logical node/edge items는 공통 getMarkItems/selectMarks/highlight/scene/hit owner를 사용한다. fields의 kind/key/sourceKey/targetKey/weight/origin/directed는 graph 의미이며 node attribute는 `attribute:<name>`로 노출해 원 attribute 이름과 metadata 충돌을 방지한다. 원 행 membership은 role별 exact dataset을 유지한다.
- 그래프·layout 편집과 source revision은 전체 plot candidate를 먼저 검사하고 node/edge/label/arrow를 한 번 재물질화한다. Canvas resize는 placement만 바꾸고 graph/layout result를 재계산하지 않는다. removeResource cascade, removeMark, scoped composition, 저장·복원, inspection·접근성·selection 및 네 renderer를 모두 검사한다.

이 세부안 기록만으로 공개 plot이나 STEP-021이 완료된 것은 아니다. graph filter의 induced-view, P2 paint 소비자, animation/controller와 후행 inference/bundling 연결도 전체 roadmap 의무로 유지한다.

Graph 강조는 기존 stroke 계열 정책을 따른다. color/stroke는 node 외곽·edge 경로·arrow fill을 같은 색으로 바꾸며 label paint는 보존한다. opacity/offset은 같은 logical item의 label/arrow에도 적용한다. fill/shape/size는 거부하며 node 자체 fill 변경은 editGraphPlot.nodes가 소유한다.

Graph highlight는 node circle과 edge path에 공통 적용되는 stroke/color, strokeWidth, opacity, offset만 지원한다. strokeDash/fontSize/fill/shape/size는 명시 거부한다. Label paint와 typography는 보존한다.
