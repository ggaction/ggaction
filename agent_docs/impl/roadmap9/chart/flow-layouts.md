# Sankey DAG와 cyclic flow

## 진행 상태

- [x] STEP022 및 선행 graph/layout 계약과 현재 소유자 확인
- [x] 공개·저장·시각 결정의 기존 포괄 승인 재사용
- [x] 독립 수치·위상 실패 시험과 순수 계산
- [x] 공개 action과 현재 소비자 연결; 후행035/AT23/AT65는 아래 의무로 유지
- [ ] 타입·Current·문서·렌더·설치·실제 데이터 검증
- [ ] 검증된 checkpoint commit/push

기준은 graph layout source `cbcaaf991d2a99485651e785108f21a42acf5434`다.
원안은 `study/coverage-expansion-2026-10-27/roadmap/tasks/STEP-022-flow-layouts.ko.md`와
같은 roadmap의 `contracts/structure-recipes.ko.md`다. 이 문서는 구현 중인 계약이며 Current를 대신하지 않는다.

## 승인과 소유권

[AUTHORIZATION.json](../AUTHORIZATION.json)의 `remainingApproval`에 기록된
“야 남은거 다 승인할테니까 질문 하지 말고 끝까지 밀어” 승인을 이 공개 API·저장 구조·시각 결정에 적용한다.
승인은 시험 성공을 의미하지 않는다. primitive/public 실제 렌더와 수치 증거는 별도로 보존한다.
root는 graph plot과 최종 공통 graph/layout dispatcher 통합을 담당한다.
이 checkpoint는 flow 전용 grammar, materialization, actions, consumer를 소유한다.
기존 graph plot은 fixed/circular/force만 선택하고 flow plot은 dag/cyclic만 선택한다.

## 사용자가 작성하는 단계

`createData → createFlowData → layoutFlow → createFlowLinks + createFlowNodes`를 사용한다.
전용 Sankey constructor나 사용자의 row별 graphic loop는 추가하지 않는다.

- `createFlowData({id,nodes,edges,nodeKey,source,target,value,edgeKey?,attributes?,selfLoops?,balance?,maxNodes?,maxEdges?})`.
  node/edge dataset, typed key와 persisted occurrence identity는 관측 graph 소유자를 재사용한다.
  `directed:true`이고 `value`는 기존 graph weight field로 정규화한다. 음수·비유한 값은 거부한다.
  `balance` 기본 `allow`; `strict`는 유입과 유출 간선이 모두 있는 내부 노드의 유량 보존을 요구한다.
  source/sink의 순 유출입은 허용한다. 합산은 저장 edge 순서이며 상대 오차 `1e-12` 이내는 보존으로 판정한다.
- `editFlowData({target?,nodes?,edges?,definition?})`는 기존 flow 의미를 보존하고 빈 patch를 거부한다.
- `layoutFlow({id,graph?,method:'dag'|'cyclic',options?})`와 기존 `editLayout({target?,options})`를 사용한다.
- `createFlowNodes`/`editFlowNodes`는 node rect와 label, `createFlowLinks`/`editFlowLinks`는 닫힌 ribbon을 소유한다.
  둘은 exact layout ref와 같은 coordinate를 사용하므로 각 단계의 의미가 trace에 남는다.
  fill은 공통 FillPaint owner, 선택과 identity는 기존 resource-backed 정책을 사용한다.

## 계산 계약

layout options: `width:600`, `height:400`, `nodeWidth:16`, `nodePadding:8`,
`align:'justify'`, `order:'input'`, `iterations:6`, `laneGap:8`,
`orientation:'horizontal'`, graph의 `maxNodes/maxEdges:10000`을 기본값으로 저장한다.
`align`은 left/right/center/justify, `order`는 input/barycentric 또는 모든 node를 한 번씩
나열하는 typed key 배열이다. opaque graph token을 사전순으로 정렬하여 typed scalar 순서를
추측하는 key 모드는 만들지 않는다. 명시 key 배열은 공통 `encodeRowKey`만 사용한다.
width/height는 양의 유한 수, nodeWidth는 양수이며 진행 축의 크기 이하,
nodePadding/laneGap은 0 이상, iterations는 0 이상 1000 이하 정수다.
모든 실제 계산은 기존 누적 work budget을 적용한다.

throughput은 `max(incoming,outgoing)`, imbalance는 `incoming-outgoing`이다.
overflow를 거부하며 zero edge와 고립 node를 그대로 보존한다.
모든 열에 동일한 `k=min((crossExtent-gaps)/sumThroughput)`를 적용한다.
모든 값이 0이면 k=0이며 division을 하지 않는다. 간격만으로 높이를 초과하면 명시 오류다.
node height와 edge thickness는 각각 throughput×k, value×k이다.

DAG rank는 longest path다. right는 sink까지의 longest path를 반대로 배치하고,
justify는 sink를 마지막 열로 옮긴다. center는 내부 node의 longest rank를 유지하되
source를 첫 소비자 바로 앞, sink를 마지막 열로 정렬한다.
input/명시 배열은 지정한 열 내 순서를 보존한다. barycentric는 고정 횟수의 가중 중심 이동 때
열 내 순서를 갱신하며 tie는 원래 node 순서다. 모두 매 pass overlap을 해소한다.
attachment는 반대 endpoint의 배치 순서와 edge key로 정렬하고 node 내에서 누적한다.

cyclic은 반복형 SCC 탐색으로 condensation DAG를 만든다. 같은 SCC의 간선은 모두
외부 feedback lane, self-loop는 loop lane으로 보존한다. edge key 순서로 상/하 lane을
교대로 배정하고 각 lane에 thickness+laneGap을 예약한다. 실제 bounds에 외부 lane을 포함한다.
dag에서 zero-value cycle도 오류다. orientation은 동일 계산 결과의 축을 교환하며 값을 바꾸지 않는다.

## 저장과 복원

flow data는 새 resource kind를 추가하지 않고 `graph`를 사용한다.
관측 graph의 `options.roles/definition`에 `options.flow={balance}`를 추가하고
`result.diagnostics.flow.nodes`에 key/incoming/outgoing/throughput/imbalance를 저장한다.
관측 graph와 inference의 기존 닫힌 schema는 그대로 보존한다.
layout은 `kind:'layout'`, 단일 exact graph InputRef, `options:{method,options}`를 공유한다.
result는 node rect/rank/order, edge attachment와 route, 공통 scale, SCC membership,
column membership와 bounds를 저장한다. sourceRows는 원 graph provenance를 보존한다.

복원 검증은 shape, 유량·비음수·membership·참조·두께·attachment containment·lane bounds와
resolved defaults를 확인한다. 배치 relaxation을 재실행하여 저장 결과를 덮어쓰지 않는다.
source revise/edit는 graph→flow layout→node/link/label→selection closure를 한 번 적용한다.
실패는 이전 program과 trace를 그대로 보존한다.

## 남은 통합 의무

root의 graph→layout→plot preflight와 flow dispatch를 최종 merge에서 함께 보존한다.
typed binding collector에 flow node/link의 exact layout 경로를 등록하고 closure에서 누락하지 않는다.
AT23 전체 종료는 후행 graph/edge 통합의 closureTask에 남긴다.
AT65 공개 animation planner/player는 후행 단계이며 현재 scene identity와 topology 구분을 유지한다.
공통 lifecycle recipe 영향 3파일은 root가 graph/paint/partition/flow를 합친 상태에서 검증한다.

STEP035의 graph/flow composition 소비자는 미완료 통합 의무다. 현재 hconcat/vconcat과
exact child 편집을 검증하며 자동 facet/repeat는 명시 incompatible 오류로 거부한다.
후행035에서는 node partition과 양 endpoint를 포함하는 edge 유도 또는 기존 포괄 승인에
포함되는 정확한 대안 정책을 구현·검증해야 한다. 이 checkpoint로 그 사용자 요구를 삭제하거나
전체 로드맵 완료를 주장하지 않는다.

## 현재 소비자 행렬

| 소비자 | 구현과 증거 |
| --- | --- |
| Source/typed refs | observed graph의 node/edge key와 row provenance 재사용; resource/revision 및 malformed restore 검사 |
| Raw/computed/parameter | prepared raw→computed→flow graph→layout→nodes/links/labels/highlight, parameter negative atomic failure (`flow-consumers.test.js`) |
| Layout edit | fixed method의 옵션 patch, 공통 k·SCC·lane 검증, 두 mark를 한 번씩 rematerialize (`flow-plots.test.js`) |
| Appearance | shared FillPaint 및 typed overrides, opacity0, source-field labels; geometry encodings는 layout 소유로 incompatible |
| Guides | 일반 field/scale axis/legend는 적용되지 않음; node/edge value와 source fields는 inspection/accessibility로 제공 |
| Selection/inspection | node/link final grain, exact source rows와 resource lineage, labels 포함 highlight, orphan style·zero flags |
| Composition | hconcat/vconcat과 exact child edits 지원; facet/repeat atomic incompatible, STEP035 의무 유지 |
| Canvas/SVG/PNG/PDF | DAG/vertical/cyclic/cyclic-vertical의 independent primitive/public exact 결과; browser DPR1/2 |
| Scene/persistence | 두 scene 형식·graphic-only snapshots·offline fresh-process source revision; AT65 player는 후행 의무 |
| Full/Basic/types | Full7actions, Basic 노출 없음; typed union·잘못된 method/options static 거부 |
| Actual data | pinned5datasets×dag/vertical/cyclic3recipes, 각7action direct trace 및 source value/identity checks |
| Font/typography | 기준 branch에 후행 font profile 없음; 통합 시 `materialization/flow/plot.js`의 label에 공통 exact font binder와 typography rematerialization 연결 의무 유지 |
| P2 outline/blend/shadow | 현재 기준 branch에는 미포함; root의 paint 통합 때 공통 owner와 Flow body/label consumer 결합 의무 유지 |

고정 레이아웃/패키지/문서 결과의 성공 여부는 실제 명령 receipt를 확인한 뒤 최종 기록한다.

## Highlight label 정확성 보완

최종검증 중 H 소비자 교차에서 발견한 body stroke가 Text에 전달되는 오류를 Flow에서도
재현했다. root가 최소 correctness 수리와 새 tar 재검증을 승인했다. GraphPlot의 기존
`transformHighlightChild` hook을 동일하게 재사용하고 label의 stroke/strokeWidth 제외는
`materialization/selection/path.js`의 `transformLabeledPathHighlightChild` 한 owner로 둔다.
body의 stroke, 공통 fill/opacity/offset, revision/codec 재실행과 이전 입력 불변을 검증한다.
이 수리 전 tar/evidence는 별도 보존하며 최종 tar 및 결과와 혼동하지 않는다.

## 검증 중간 기록

- 새 순수/상태/공개 소비자 focused coverage는100/96.54/100이며 신규 고위험 owner의
  기존 family floor95/90/100을 모두 통과했다. 기준을 낮추지 않았다.
- 전체 render301/301, 전체 browser323/323, Flow browser4/4(DPR1/2), actual-data16/16 통과.
- 수정 후 focused contracts46/46 및 discovery16/16 통과. 최초 실패 로그는 보존한다.
- docs source의 최초5실패는 search ceiling, changelog, tutorial catalog, 아직 미커밋인
  example source link였다. 수정·source commit 뒤 source170/170, built155pages/1328artifacts,
  desktop search 및 전체문서320/390/768px 검증을 통과했다.
- 최초 고정 tar `e15568d1c389c9181254e2865b0104ce91e83eb8f5fb2736ec6783696190c7bf`의
  Node20/22/24 각212runtime+74tutorial+7qualification 통과. 추가 shared Flow 타입 fixture도
  3Node에서 통과했다. 이 tar는 위 label 수리 전 결과이며 새 tar와 구분한다.
- label 수리 후 selection/Flow75/75, boundary/types12/12, docs source170/170 통과.
  새 packed 최대1,201,119/unpacked5,523,241bytes,819entries에 최소1000byte ceiling을 적용했다.
- canonical full coverage와 label 수리 이후 고정 tar3Node·최종 문서 검증은 실행 대기/진행 중이다.
  이 중간 source checkpoint를 전체 종료나 STEP077 완료 증거로 사용하지 않는다.
