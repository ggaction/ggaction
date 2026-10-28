# 그래프 추론 공개 연결

## 진행 상태

- [x] 여섯 rule, metric/preprocess, exact/approximate 순수 kernel과 독립 oracle
- [x] 공개 API와 저장·수정 경계 구체화
- [x] createInferredGraphData / editInferredGraphData 연결
- [x] source/candidate graph revision→inference→layout→plot 원자적 갱신
- [ ] 저장 검증·선택·inspection·접근성·타입·설치·문서
- [ ] induced-view filter와 explicit recompute 소비자 통합

[전체 남은 결정 승인](../AUTHORIZATION.json)을 적용한다. 새 시각 도형은 추가하지 않으며 [graph-plots](graph-plots.md)의 승인된 node/edge/label 표시를 소비한다. 아래 기록은 구현 완료 증거를 대신하지 않는다.

## 공개 API

- `createInferredGraphData({id,data?,nodeKey,ruleId,rule,features?,metric?,preprocess?,attributes?,options?,candidateGraph?,maxNodes?,maxEdges?})`: Full 전용 graph resource를 만든다. id/nodeKey/ruleId/rule은 필수다. data는 explicit→current materialized dataset→unique eligible 순서로 선택하며 모호하면 오류다.
- `editInferredGraphData({target?,data?,candidateGraph?,definition?})`: 기존 inferred graph만 편집한다. definition은 source definition의 부분 교체이며 options 객체를 지정하면 해당 rule options 전체를 교체한다. 빈 patch와 explicit undefined는 오류다. candidateGraph:null은 candidate 입력을 제거하고, 이후 완전 metric MST에 필요한 features/metric을 같은 patch로 제공해야 한다. rule 변경은 이전 rule에만 적용되는 옵션을 제거한 완전 definition으로 전환할 수 있도록 `definition`이 rule을 포함할 때 기존 nodeKey/attributes/한도만 이어받고 나머지 rule intent를 새로 받는다.
- 여섯 rule과 수치·동점·한도 정책은 기존 순수 kernel owner를 재사용한다. `options.search`의 exact/approximate 선택은 명시적이며 자동 sampling은 없다.
- candidateGraph는 mst에만 적용한다. named graph의 exact input ref를 저장하고 directed candidate를 거부한다. source의 typed node key에 없는 candidate node는 오류다. candidate가 없는 source node는 forest 정책을 따른다. candidate graph의 revision도 소비자 추론을 갱신한다.

## 저장 계약

기존 kind:graph 및 common graph model을 유지한다. inputs[0]은 source dataset이며 roles.nodes와 roles.edges는 모두0이다. optional inputs[1]은 candidate graph다. options.definition은 normalized source intent만 저장한다. candidate identity는 input ref 한 곳이 소유한다.

result.model은 node/edge/adjacency의 유일한 저장 owner다. result.diagnostics는 kernel의 resolved options, preparation statistics·included/omitted source indices, search algorithm/seed/recall/work counts와 MST cost/components를 저장하되 edge 배열과 prepared vectors를 복제하지 않는다. provenance.origin은 inferred이며 source rows는 exact dataset revision과 원 row key를 보존한다. data를 바꾸어도 같은 typed endpoints/ruleId/direction의 edge identity는 유지한다.

복원은 source binding, typed key·row membership, edge identity·finite weight, diagnostics 구조와 resolved definition의 일관성을 검사한다. pair search·MST·force solver를 재실행하지 않는다. renderer는 graph resource를 읽지 않는다.

## 갱신과 원자성

후보 graph가 다른 inferred graph의 candidate가 되는 의존 관계를 허용한다. resource ref DAG에서 순환을 거부하며 graph→dependent inferred graphs→layouts→plots 순서로 전체 후보를 preflight한다. prepared replacement의 내부 허용 kind에 graph를 추가하되 caller가 임의 prepared result를 주입할 공개 경로는 만들지 않는다. 각 이전 ref에 대해 정확한 다음 revision 하나만 허용한다.

source feature와 rule/k/metric 수정은 topology를 갱신한다. layout edit, Canvas resize와 paint edit는 graph result를 보존한다. source 입력 둘 이상이 같은 action에서 바뀔 때 각 graph/layout/plot을 한 번만 갱신한다. 실패는 이전 program/state/trace를 보존한다.

## 후행 소비자

origin/rule/metric과 정확한 source rows를 inspection·logical items·accessible description에 연결한다. 현재 graph plot의 endpoint geometry와 renderer parity evidence를 재사용하고 inferred source를 넣은 별도 공개 사용 예를 검사한다. induced-view는 원 topology를 유지하고 양쪽 endpoint가 보이는 edge만 남겨야 한다. explicit recompute는 별도 inference revision을 만들며 orphan selection을 이웃 edge로 재할당하지 않는다. 이 filter 경계와 후행 controller event는 독립 consumer checkpoint에서 닫으며 현재 체크리스트에 남긴다.


## source 동결의 검증 범위

- 공개 lifecycle·저장 검증·private 갱신 context·기존 graph/layout consumer의 집중 검사64개 통과.
- 변경된 선언과 vocabulary/contract/source 경계까지 최종 source 검사43개 통과.
- 실제 dataset5종×knn/MST/sequence3종, canonical bounded runner15개 통과.
- 새 inference/state/context owner의 실행 줄·함수100%, inferred state branch93.23%; selector 포함 전체99.78/94.48/100.
- candidate 해제, rule 전환, typed tie와 missing, explicit star hub, negative cosine,
  geographic meter, exact/approximate counter·holdout·recall, source-chain 단일 revision을 검사했다.
- 원본 dataset의 immutable source row와 inspection/accessibility의 inferred origin/rule/metric을 유지한다.
- 전체 unit/contracts, 설치3Node, 최종 문서/공통 realistic 통합은 동결 뒤 qualification으로 남긴다.
  이 source checkpoint를 STEP-029–032 또는 전체 Roadmap9의 완료로 보고하지 않는다.
