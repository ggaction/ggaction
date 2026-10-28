# Observed graph private normalization

## 진행 상태

- [x] Raw typed node/endpoint key와 명시 edge identity 정규화
- [x] Node/edge/sourceRows/attributes/endpoint/origin 검증 공통 owner
- [x] Directed/undirected stable adjacency·parallel/self edge·zero weight 보존
- [x] 독립 literal·불변성·10,000 item·10M cumulative work·critical 검사
- [ ] Fixed/circular/seeded force와 pinning/component packing
- [ ] Public GraphResource 및 field adapter·revision·모든 consumer
- [ ] STEP-021·AT-23·STEP-077 전체 완료

계산 기반은 hierarchy visual review checkpoint `b8442cc1f40f2c76c5c16b708fef87176832d477`이다.
[기존 전체 범위 승인](../../AUTHORIZATION.json)과 parent의 STEP-021 private 계산 위임을 재사용한다.
이 checkpoint는 원 카드의 관측 topology 입력 경계이며 공개 resource schema나 action을 추가하지 않는다.
Root가 별도 branch에서 맡은 graph metric/preprocess/inferred edge identity를 중복 구현하지 않는다.

## 경계와 의미

`normalizeObservedGraph(nodes,edges,options)`는 이미 field를 해결한 명시 records만 받는다.
`directed`는 필수 boolean이며 `selfLoops`는 false, `maxNodes/maxEdges`는 각각10,000이 private 기본이다.
각 node는 raw `key`와 선택적 `sourceRows`, `attributes`; edge는 raw `sourceKey/targetKey`, 명시
`key` 또는 caller가 보관한 `occurrenceKey`, 선택적 finite `weight`, `sourceRows`를 받는다.

기존 `encodeRowKey`가 scalar/tuple type·delimiter·Date epoch·-0/0 정체성을 소유한다.
정규화 이후 token은 opaque string이며 새 parser로 decode하지 않는다. Explicit edge key도 같은
identity owner를 사용한다. Occurrence token은 별도 private namespace이며 새 row index로 생성하지 않는다.
현재 private 경계는 모든 edge에 명시 identity를 요구한다. 최종 public row adapter에서 keyless 단일 edge를
해결하는 정책·persisted occurrence allocation은 아직 미구현이며 이 제약을 public 지원이라고 주장하지 않는다.

입력 node/edge 순서를 유지한다. Source row 목록 기본은 각 입력 배열에서의 실제 index이며 명시 목록은
중복 없는 nonnegative safe integer다. 실제 dataset ref/revision과 row key lineage로 연결하는 일은 향후 action이 소유한다.
Weight 기본1,0과 유한 음수는 보존한다. 관측 graph 자체의 weight에 비음수 제약은 원 계약에 없으며
flow나 metric-specific 제약은 해당 downstream owner가 적용한다. Source attributes는 plain object/array와
기존 snapshot scalar를 그대로 복제하며 depth64·accessor/class/cycle·cumulative work 경계가 있다.
Date는 raw key에서는 epoch identity로 처리하지만 attributes의 class instance로는 받지 않는다.

`createGraphModel(nodes,edges,{directed,selfLoops,maxNodes?,maxEdges?},priorWork)`는 이미 encoded token인
공통 records를 검증하고 `{nodes,edges,directed,selfLoops,adjacency}`를 freeze한다. Edge의
`origin:'observed'`는 `ruleId:null`, `'inferred'`는 nonempty ruleId가 필요하다. 이 구분은 provenance 검증이며
추론을 실행하지 않는다. Inferred self edge는 항상 거부한다. Observed self edge만 `selfLoops:true`에서 허용한다.

`indexGraphModel(model,limits?)`는 같은 검증 owner로 기존 adjacency를 정확히 확인하고 local index와 work를 반환한다.
Node별 adjacency는 graph node 순서이며 각 incoming/outgoing edge key list는 edge 입력순을 따른다.
Undirected edge는 양 끝에서 incoming/outgoing을 제공한다. Weak `neighbors`는 방향과 무관하게 최초 연결 순서로
중복을 제거한다. Parallel edge들은 각자 남고 self edge는 각 list에 한 번만 남는다. Cycle/disconnected/isolated/empty
관측 graph는 허용하며 absent endpoint나 중복 identity를 임의 복구하지 않는다.

Raw normalization 비용을 model 검증에 넘겨 같은10M work에 합산한다. Node/edge 수는 dense descriptor를
읽기 전에, 큰 key·sourceRows·attribute array는 순회 전에 제한한다. 반환 결과와 caller 입력은 공유 mutable 경로가 없다.

## 독립 검증과 재현

`test/oracles/graph.js`가 token, node/edge sourceRows, weight0/-1, directed/undirected adjacency의 literal을 소유한다.
Production import가 없다. 테스트는 typed scalar/tuple 충돌, Date snapshot, parallel occurrence reorder,
self edge, orphan, cycle, input/attribute/option getter, invalid weight/sourceRows, deep/cyclic attributes,
empty/disconnected graph, 누적 work와 성공/실패 뒤 caller 불변성을 검사한다.

| 검사 | 결과 |
| --- | --- |
| Graph normalize/model focused Node coverage | 13 passed; 두 source 각각100/100/100 |
| 새 graph critical family | 95/90/100 유지·통과; 기존 family 변경 없음 |
| `node scripts/check-graph-fixtures.js` | 독립2개 fixture의 call/input/expected/actual/diff SHA |
| Discovery/source/package boundary 및 artifact contracts | 38 passed (`.artifacts/validation/graph-normalize/contracts.log`) |
| `npm run package:check` | 692 entries; 아래 실측 크기 통과 (`package-check.log`) |
| `npm run package:bundle` | Full/Basic installed build 통과; gzip510,644/287,809bytes 유지 (`bundle.log`) |

Source2개를 더한 실제 artifact는692 entries, packed1,030,782 / unpacked4,792,575bytes다.
기존690-entry cap 실패 로그를 보존했다. 새 제한은 실측 최소1,000byte 경계인1,031,000 /4,793,000이다.
Private owner는 public import graph에 연결되지 않으며 root의 combined integration에서는 다시 실측해야 한다.

## 남은 의무

Fixed/circular/force 수치 계산, seeded fixed iterations, fixed pinning과 component packing을 이어 검증한다.
Public create/edit/remove와 source field resolution, 실제 source revision/lineage, inspector/codec/scene,
selection/hit/accessibility/composition, renderer와 declarations/current/docs/package consumer는 미구현이다.
새 visual target은 primitive 검토를 먼저 준비한다. 이 기록은 STEP-021이나 전체77개 카드 완료가 아니다.
