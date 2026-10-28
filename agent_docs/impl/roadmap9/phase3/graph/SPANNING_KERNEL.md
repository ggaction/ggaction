# Deterministic spanning graph private checkpoint

## 진행 상태

- [x] 최소 실패 시험·독립 Prim 비용 oracle·literal MST cost10
- [x] Complete metric Kruskal과 explicit candidate forest, typed tie와 안정 identity
- [x] Node20/22/24·coverage·패키지/경계 검증 및 원시 실패 보존
- [ ] Group/sequence와 공개 graph resource lifecycle·revision·consumer/codec 통합
- [ ] STEP-031과 전체 Roadmap9 종료

[원안](../../../../../study/coverage-expansion-2026-10-27/roadmap/tasks/STEP-031-graph-rules.ko.md)의
순수 계산 부분이다. 공개 action, schema 또는 package entry를 추가하지 않는다.
`grammar/graph/spanning.js`의 `inferGraphMst`는 기존 feature preparation/metric owner를 쓰며
완전한 metric graph를 계산한다. `selectGraphSpanningForest`는 명시 sourceIndex/targetIndex/weight
candidate만 받아 Kruskal을 적용한다. 두 결과는 raw source index·stable typed edge identity,
component별 node index·cost를 반환하며 domain adapter가 graph model과 row lineage를 연결한다.
Candidate는 parallel/self를 허용하지만 결과에는 가장 싼 연결만 남고 self edge는 없다.
음수/비유한 weight는 입력 단계에서 거부하고, 연결되지 않은 candidate는 forest:true를 요구한다.
거리·canonical endpoint 순으로 선택해 입력 순서와 무관한 결과를 보존한다.

Complete pair allocation과 candidate sort 앞에 공통 work limit을 검사한다. Node10000 한도에서
selected edge는 최대9999개다. Cost overflow는 오류이며 이전 입력에 손대지 않는다.
노드 누락 정책의 원 source index·통계를 보존하며 null group 등의 다른 rule 정책을 추측하지 않는다.
상속 accessor를 읽지 않도록 옵션/candidate own-data를 검사한 뒤 null-prototype copy로 읽는다.

## 검증

그래프 전체36개(이번9개)가 Node20.20.2/22.23.1/24.22.1에서 모두 통과했다.
100개 seeded candidate fixture는 별도 Prim oracle의 비용·component와 일치한다.
Literal cost10, zero edge, disconnected/isolated/empty, typed key tie, parallel, source omission,
불변성, descriptor와 work/overflow 경계가 포함된다. Source6개 각각100/100/100이며 critical
floor95/90/100은 그대로다. Source/package/discovery 경계40/40도 통과했다.
최초 검증에서 normalized sum의 integer31→30.999999999999996와 error assertion 문구 실패를
확인했고 기존 stableFiniteSum owner 사용·실제 unknown-property 문구로 수정했다.

Package707entries, unpacked4,881,437, Node22 packed1,049,962 및 Node20/24 packed1,052,250이다.
관측 최대에 맞춰 caps707/1,053,000/4,882,000을 적용했으며 이전 ceiling 실패도 보존했다.
공개 import graph는 바뀌지 않아 기존 metric checkpoint의 Full/Basic gzip526,996/304,841을 재사용한다.
[원시 logs·hash·command](spanning-evidence/manifest.json)는 성공과 실패를 분리한다.
