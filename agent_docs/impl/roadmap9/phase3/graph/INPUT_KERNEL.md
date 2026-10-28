# 그래프 원본 열 연결

## 진행 상태

- [x] 관측 node/edge table의 명시 열·복합 key·attribute 연결
- [x] 여섯 추론 rule과 metric별 feature, candidate MST 연결
- [x] 원본 행 위치, persisted occurrence key와 추론 진단 보존
- [x] graph 105개, 신규 owner coverage 100/100/100, Node 20/24 각 9개 확인
- [ ] GraphResource·공개 action·revision·layout·plot consumer 연결

승인은 [남은 계획 전체 승인](../../AUTHORIZATION.json)의 범위를 재사용한다. 이 checkpoint는
private pure adapter다. 공개 action·타입·저장 schema는 아직 추가하지 않았으며 STEP-021/032
완료로 기록하지 않는다.

## 계산 경계

`src/grammar/graph/fields.js`는 descriptor를 먼저 검사한 원본 table에서 명시 열을 읽는다.
nodeKey/source/target/edgeKey는 단일 열 또는 중복 없는 복합 열이다. attributes는 명시 열 목록이며
기본 빈 목록이다. feature는 수치 열 배열, Jaccard의 `{set: field}`, great-circle의
`{longitude: field, latitude: field}`를 받는다. 원본 데이터와 반환된 내부 model은 독립적이다.

`input.js`는 기존 observed normalizer, neighbors, spanning, structural owner를 호출하고
그 결과를 한 graph model로 연결한다. 관측 parallel edge는 명시 edgeKey가 없으면 caller가
전달한 persisted row key를 occurrence identity로 사용한다. 배열 위치로 identity를 만들지 않는다.
node/edge sourceRows는 원본 table의 위치이며 inference edge는 두 endpoint 원본 위치를 보존한다.
Metric preparation, 제외 이유, exact/approximate search, component/cost의 기존 결과는
후속 리소스 owner가 저장·검증할 수 있도록 반환한다. 이 단계에서 state를 쓰지 않는다.

MST candidate는 이미 검증 가능한 undirected model을 받는다. 후보 node는 원본 node 집합에
속해야 하며, 간선 가중치 0을 유지한다. Candidate와 metric feature를 동시에 전달하거나
group/sequence에 metric 옵션을 전달하면 오류다. 중첩 options가 ruleId/metric 등의 상위 결정을
가리거나 null/undefined가 기본값으로 조용히 바뀌는 경로도 거부한다.

## 검증

첫 focused 실행은 null 기본값 처리 반례에서 6/7이었다. 해당 로그를 보존하고
null/undefined와 중첩 옵션 경계를 수정했다. 최종 graph 105개와 critical floor 16개가
통과했다. 새 두 owner는 lines/branches/functions 모두 100%다.
Node 20/24는 같은 입력 adapter 9개씩 통과했다. Literal oracle은 a=0,b=1,c=3,d=10의
kNN/radius/MST와 별도 group/sequence/Jaccard 결과이며, 복합 key·행 재정렬·source index·
empty/singleton·candidate forest·getter 미호출·limit 반례를 함께 검사한다.

Commands와 원시 로그·SHA-256, Node별 package 실측은
[evidence manifest](input-evidence/manifest.json)에 둔다. 전체 source coverage나 공개 소비자
완료를 주장하지 않으며 이전 kernel 및 이번 private adapter의 focused evidence다.
