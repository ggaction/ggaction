# Path query 중간 geometry 복사 제거 합산

Hit 판정에서 boolean/number로 즉시 소비하는 flattened geometry는 기존 calculateFlattenedPathCommands 결과를 동기적으로 읽는다. 공개 flatten 반환과 subdivision 오류 diagnostics는 기존 owned 경계를 유지한다. 수학·기본/명시 정책·query 방문과금·최종 shape/좌표·오류 순서는 바뀌지 않는다.

[합산 증거](geo-query-merged-evidence/qualification.json)는 path/shape/stroke/index/stream53회귀 및 package/source 경계, 동일 canonical archive의 Node20/22/24 runtime/types/문서/6bundle과 실제 Chromium DPR1·2를 보존한다. 이전합산 대비unpacked33bytes와Node24packed7bytes만실측cap에반영했다. 원 workload/guard/SLO는 그대로다.

Upstream의 원100k native/current 검산과 실패한 rebaseplan은 별도 기록이다. 재시작을 막는 global owned registry rehash,100cycle·전체P95와 최종 통합 의무는 미완료다. 동시에 다른 source검사가 실행된 중간 canonical 결과는 최종 장비성능 자격으로 세지 않는다.
