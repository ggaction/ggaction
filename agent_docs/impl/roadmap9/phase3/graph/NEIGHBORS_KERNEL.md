# Exact graph neighbors private checkpoint

## 진행 상태

- [x] 기존 다섯 metric/preprocessing에 연결한 exact kNN/radius/similarity
- [x] directed/union/mutual, typed-key tie, 포함 threshold, zero edge
- [x] empty/singleton/omission effectiveK0 및 finite work/output 한도
- [x] 독립100 fixtures, Node20·22·24 및 경계/package 검증
- [ ] source-field 및 normalized graph model/provenance adapter
- [ ] 공개 graph resource lifecycle·consumer/codec 통합과 STEP-030 종료

[원안](../../../../../study/coverage-expansion-2026-10-27/roadmap/tasks/STEP-030-graph-neighbors.ko.md)과
[전체 실행 승인](../../AUTHORIZATION.json)에 따른 독립 계산 단계다. 시각/API/schema를 추가하지 않는다.

`grammar/graph/neighbors.js`는 raw typed node key와 feature vectors에서 기존 preparation과 metric을
호출한다. 결과는 source index, stable typed edge identity, weight와 실제 preprocessing/omission 통계다.
최종 graph model이나 sourceRows를 임의 생성하지 않는다. kNN/radius weight는 distance,
similarity weight는 similarity다. 결과 pair 순서는 typed source/target 순서이며 caller input order가
달라도 stable edge key와 weight 순서를 보존한다. Runtime source/field 추출은 후행 adapter의 책임이다.

거리 동점은 typed key로만 나누며 k를 초과하여 tie를 보존하거나 조용히 clamp하지 않는다.
유효 node가0/1이면 effectiveK0, 그 외 k>=n은 오류다. Radius와 similarity threshold는 inclusive다.
Undirected union/mutual은 canonical pair를 한 번만 만들고 self edge는 항상 제외한다.
Same endpoints/rule/direction의 identity는 k 변경 후에도 유지한다. Missing node는 provenance에 남는다.

n² metric 비용, vector dimensions와 sort 비용을 pair allocation 전에 공통10,000,000 work 한도로
확인한다. Generated edge10,000을 초과하면 atomic error다. 이 구현은 brute-force exact이며
가속/approximate 검색, MST/group/sequence를 완료한 것으로 표기하지 않는다.

## 검증

전체graph27/27을 Node20/22/24에서 통과했다. 새10개 test는 수작업a0/b1/c3/d10의
k1 directed4/union3/mutual1과 radius2의2개 edge, duplicate zero edge, typed tie 및100개 seeded
8-node oracle fixtures를 검증한다. Independent oracle는 production module을 import하지 않는다.
Great-circle meters, negative cosine threshold, empty Jaccard, minmax·omission·immutable failure도 확인한다.
Source5개 각각100/100/100%, 기존 graph floor95/90/100을 유지했다. 경계40/40 통과했다.
추가 null-options 시험의 첫 실패는 shared ownRecord 오류 문구를 잘못 예상한 것으로, source 변경 없이
assertion을 실제 공통 계약에 맞췄고 실패 로그를 보존했다.

Package706entries, unpacked4,874,258bytes, Node20/24 packed1,050,369bytes에 맞춰
706/1,051,000/4,875,000 ceiling을 적용했다. 이전 한도 실패도 보존한다. 공개 entry import graph는
바꾸지 않아 앞선 metric checkpoint의 Full/Basic browser gzip526,996/304,841bytes 근거를 재사용한다.
원시 로그와 source hash는 [manifest](neighbors-evidence/manifest.json)에 있다.
