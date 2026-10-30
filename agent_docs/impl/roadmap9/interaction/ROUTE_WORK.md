# Route 계산 비용과 bounded shortest-path 개선

## 진행 상태

- [x] 원래 4방법 × 3크기 12셀의 성공/명시 제한 분리
- [x] 실제 Chromium DPR1/2의 8성공·16제한과 P95/heap 증거 보존
- [x] 제한값·수학을 변경하지 않는 charge-site 진단
- [x] predecessor 상태 방식, 독립 oracle와 기존 출력 비교
- [x] 같은 archive 세 Node 및 문서·경계 검증 마감
- [x] 새 source의 실제 Chromium edge-path1k P95
- [ ] HEB 입력 준비 중복의 추가 검토
- [ ] Density/force의 나머지 크기 지원과 geographic GraphRoute 연결

승인은 [AUTHORIZATION](../AUTHORIZATION.json)의 remainingApproval을 재사용한다.
Parent는 2026-10-30 charge-site 결과를 읽고 predecessor 최소 개선을 진행하도록 명시했다.
공개 API/schema/types, solver 수학·기본값, 10M work/sample/pair guard는 바꾸지 않는다.
전체 AT82, large 지원, STEP077 완료가 아니다.

## 원래 12셀

원본 [Node 진단](route-size-preflight-evidence/summary.json)과
[실제 브라우저 측정](route-browser-evidence/summary.json)이 정본이다.
아래는 개선 **이전** 결과다. `work`는 elapsed time이 아니다. 실패는 부분 완료로 세지 않는다.

|방법|100 edges|1,000 edges|10,000 edges|
|---|---|---|---|
|hierarchical|완료, work126,909|완료, work1,147,485|work10,000,048 >10M|
|force-directed|완료, work1,894,670|work148,988,520 >10M|candidate pairs49,995,000 >10M|
|density|work10,000,024 >10M|work10,000,491 >10M|active samples13,400,000 >10M|
|edge-path|완료, work2,095,720|work10,001,510 >10M|work10,000,041 >10M|

Circle workload는 기존 `createGraphData`의 directed:false 기본값을 사용한다.
HEB는 별도 native star tree이며 10k에는 graph9,999 nodes + hierarchy root1개와
10,000 edges를 모두 유지한다. 어떤 edge도 sample/drop하지 않았다.

## 읽기 전용 비용 분해

`route-work-evidence/profile.json`은 source d15c2716c의 charge 호출 위치에 label만 붙인
Node loader 진단이다. 원 수치 계산, 각 charge와 guard는 그대로다. 진단 오버헤드가 있으므로
그 실행 시간을 성능으로 사용하지 않는다. `profiles`는 공개 action 준비, job 검증, kernel의
**별도 budget instance**다. 앞 단계 검증을 줄여도 마지막 kernel의 한도는 그대로다.
Force의 `pairs()` 내부 charge499,500은 site map 합계에 포함하지 않으며 실제 누적은
`rejected.acceptedBefore`에 포함돼 있다.

- Density100: iteration0의22,200 weighted samples 중17,417번째 splat에서 실패했다.
  `densityField.js`의 bounding-square grid visits만9,360,004 attempted work다.
  전체20회 중 첫 field도 끝나지 못하므로 외곽 circle 밖 zero cell 방문을 줄이는 개선만으로
  100개 성공을 약속할 수 없다. Grid256/8channels/bandwidth/smoothing/resampling을 그대로
  유지해야 하며 FFT·downsampling·iteration 축소를 동등 구현이라고 바꾸지 않는다.
- Force1k: 기본 입력652,020 + candidate pairs499,500 + pair math7,992,000 뒤
  exact six-cycle schedule139,845,000을 사전 검증하면서 실패한다. Pair attraction은 실제
  조밀한 계산이다. 공간 pruning은 compatibility0을 수학적으로 증명할 수 있는 경우에만
  검토할 수 있고, threshold/sample/iteration을 바꾸지 않는다.
- HEB10k: graph/hierarchy 검증·order 준비8,297,496 뒤6,688번째 spline의192 work에서
  실패한다. 다른 budget instance의 반복 검증 제거는 시간 최적화 후보지만 이 admission
  문제를 직접 해결하지 않는다. Authentic immutable preparation을 재사용해 같은 boundary를
  한 번만 검사할 수 있는지 별도 검토하며 외부/worker job을 신뢰했다고 가정하지 않는다.
- Edge-path1k: 다섯 번째 candidate 탐색에서 full-prefix state push4,662,532와
  prefix array copy4,659,339가 전체 attempted work의 약93%를 차지한다.
  기존 비용은 긴 alternate path를 매 단계 새 두 array로 복사하는 실제 O(path²) 작업이다.

## 확정한 최소 변화

`grammar/graph/routes/shortestPath.js` 한 owner만 바꾼다. State는
`{node,cost,previous,edge,depth}`이며 predecessor를 공유한다. 원 heap/Dijkstra,
기하 비용, ordinal tie, skip/lock, source/target 처리, 원 edge order는 유지한다.
성공 경로만 최종 edges/nodes arrays로 복원하고, 정확히 같은 cost일 때만 전체 edge ordinal
sequence를 만들어 기존 사전순 비교를 한다. 부동소수 cost 덧셈 순서도 그대로다.

상태마다5 scalar/reference fields의 work를 한 번 계산한다. Sample bound에는 상태5칸과
heap/map/set의 참조3칸을 포함해 검색에서 **할당한 모든 상태**를 보수적으로 유지한다.
Stale state가 실제로 해제돼도 이 상한을 낮추지 않는다. 동률 scratch arrays와 결과 arrays는
보유 상태에 더해서 선검사한다. 비교/adjacency 방문/출력 array write도 각 work에 포함한다.
새 cache, private authority, global mutable state, 공개 옵션은 없다.

## 검증 계획과 첫 결과

- 작은 positive-cost graph48개를 priority queue 없는 exhaustive simple-path oracle와 비교.
  Literal weighted/tie 예시, adjacency 순서 반전, skip, source/target 부재를 포함한다.
- 기존 edge-path 삼각형·typed key·source permutation·skip/lock·zero/parallel·stale heap
  회귀를 보존. 별도20k chain,400-prefix tie, zero cycles, bounded samples/work/abort를 추가.
- 원 source에서 생성한 directed/undirected64개 결과와 변경 뒤 결과를 비교했다.
  `work`/`peakSamples`만 제외한 전체 routes/options/provenance/diagnostics가 byte-identical이다.
  기대 파일은 진단 증거이고 durable tests는 독립 oracle와 literal을 사용한다.
- 기존1k workload는 work9,684,020·peakSamples15,995로 완료했다. 모든1,000 original
  edge와 stretch fallback provenance를 보존한다. 이 단일 Node 실행은 새 browser SLO가 아니다.
- 누적 source92개 통과. 변경 owner98.77/97.96/100으로 기존95/90/100 floor를 유지한다.
  공개 설치 fixture는1k complete·원 endpoint·restore·원 program 불변과 기존 worker/renderer를
  같은 archive에서 확인한다. 패키지 측정·최초 실패는 final summary에 별도 기록한다.

## 최종 checkpoint 증거

Runtime source는 `c7892a9fe`, 원격 `codex/roadmap9-paints`에 고정했다.
같은 `d810aaf3…cfc7a0` archive에서 Node20/22/24 각각 공개4사례와6entry bundle을 통과했다.
Boundary/discovery43, source92×3Node, source-pin 문서31을 통과했고 생성 후 package SHA-256도
같았다. 최초 package/잘못된 coverage lookup 실패와 최종 검증을 함께 보존했다.

Chromium153·Apple M4·16GiB에서 다른 agent의 큰 검사가 끝난 뒤 DPR1/2 각각5회 warmup과
30회 측정을 실행했다. Edge-path1k bundling P95는 **856.5 / 896.1 ms**, worker compute는
241.1 / 250.1 ms다. Native materialization은39.6 / 40.0 ms, Canvas 명령7.2 / 5.3 ms,
SVG serialization+DOM8.3 / 6.4 ms다. Compositor paint 시간을 주장하지 않는다.
두 셀 모두 이 fixture의5,000 ms 기준 이내이고1,000개 원 edge를 유지했다. 초기 bundle 로드
후 offline이며 HTTP 요청0, 완료 worker/listener/timer/capture/callback-after-destroy 모두0이다.
Host lifecycle100/retained-heap은 변경되지 않은 이전 source의 측정으로 분리해 재사용한다.

이 결과는 새 source의 **추가2셀**이다. 이전 source의24셀(8성공/16제한)을 소급 수정하지
않는다. HEB10k, force/density 및 geographic binding은 후속이며 AT82 전체 통과가 아니다.
세부 수치·samples·환경·최초 실패와 해시는 [summary](route-work-evidence/summary.json)에 있다.
