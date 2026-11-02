# 원 추론 성능 입력의 공개 worker 연결

## 진행 상태

- [x] 원15개 fixture의 전체 입력 hash·크기·원 k10·SLO 보존 확인
- [x] 기존 명시 maxEdges/execution과 실제 public inference executor에 연결
- [x] 시간 부가 envelope와 closed completion 분리, 오류·stale·cleanup 회귀33개
- [x] 고정 ed5f57d5 archive source-free Chromium DPR1/2에서6개 입력·8개 단계 기능 검증
- [x] 원10000노드·100000간선 전체 oracle·동기/worker 완전 resource hash 일치·초기 로딩 후 네트워크0
- [ ] 원 large10초 목표와 최종 P95/retained heap/100cycle qualification

이 변경은 측정 도구만 연결한다. 제품 runtime/types/package 입력은 바꾸지 않았고 canonical repack hash도 같다. 기존 기본 호출의 지원 한도를 올린 것으로 해석하지 않는다. 원 대규모 fixture에서 기존 명시 capacity/execution 정책을 선택하고, 새 공개 worker로 준비한 authentic 결과를 같은 native action에 적용한다. Source authoring과 독립 oracle 준비는 측정 밖에 둔다.

`workerMs`는 worker 시작·message copy·compute·main 검증을 포함한 public preparation 전체다. 계산만의 시간과 native 적용 시간은 별도 진단으로 남긴다. Host의 timing envelope를 벗겨 closed completion만 executor에 전달하며, 늦거나 손상된 결과·오류와 worker/listener cleanup을 검사한다. 동기 stage는 원 전체 호출을 그대로 측정한다.

동일 archive의 실제 Chromium 진단은 DPR1/2 각각100/1000/10000개 입력을 전부 처리했다. 모든 큰 입력에서100000간선의 pair/order/tie/weight/direction/source rows와 resource hash를 확인했다. Worker 준비는 단발21.0–22.1초로 기존10초 목표에 미달했다. 원 warmup5/measured30 설정을 바꾸지 않았으며 이번 실행은 별도 diagnostic 모드 warmup0/measured1이다. 이를 P95나 성능 자격으로 세지 않는다. 실행 중 장비 부하도 원 report에 기록했다.

Public API가 바뀌지 않아 문서와3Node 제품 설치 검사는 같은 runtime archive의 기존 worker 통합 증거를 재사용한다. 새로운 설치 sweep을 실행했다고 주장하지 않는다. 원본 도구·fixture·bundled worker·전체 실행 결과와 해시는 qualification.json과 gzip evidence가 소유한다.
