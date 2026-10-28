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
