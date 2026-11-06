# Route 준비의 메인 스레드 멈춤과 100ms 취소 — 2026-11-06

## 진행 상태

- [x] Benchmark에 준비 중 최장 host turn 간격(`prepareBlockingMs`)과 취소 시험(10회) 추가.
- [x] 원인 분석(Node, 실제 worker thread, CPU profile).
- [x] V2 준비 뒤쪽(route resource 조립·저장 graph 검증·consumer plan)을 host turn 사이 단계로 분할.
- [x] Chromium 재측정.
- [ ] 받은 completion 검사 turn, 첫 await 전 snapshot, V1·native update preflight는 여전히 크기에 비례한다(아래 "남은 한계").

## 왜 했나

계약 SLO는 bundling 취소 응답 100ms 이하다. 취소는 host turn 사이에서만 처리되므로 실제 응답 시간은 "준비 중 가장 긴 동기 구간 + 거부까지 걸린 시간"이다. 시험해 보니 `abort()` 뒤 거부 자체는 1ms 안이었다. 결정하는 것은 동기 구간이다.

첫 Chromium 측정(archive `40c3527d…`, P95):

| 경우 | 최장 동기 구간 |
| --- | --- |
| 100 hierarchical·FD·edge-path | 7–28ms |
| 1k hierarchical·edge-path | 67–88ms |
| 100 density(명시 예산) | 332–335ms |
| 1k force-directed(명시 예산) | 327–337ms |
| 10k hierarchical·edge-path(V1) | 671–688ms |

## 원인 (Node, 실제 worker thread)

10k edge-path V2에서 worker 완료 뒤 한 번에 2.0초가 동기로 돌았다.

- `completedEdgeRouteResource`가 결과를 동기로 다시 검산(약 350ms).
- `planEdgeRouteApplication` 안의 `prepareGeoResourceRevisions`와 `validateResourceGraph`가 각각 저장 graph 전체를 검증(각 약 800ms). 그 대부분은 edge-route binding 검증이 route job을 다시 만들고(입력 hash) 결과를 다시 검산(결과 hash)하는 비용이다.

## 바꾼 것

결과·순서·ledger 부과는 같고, 사이에 host turn만 넣었다.

- `validateResourceGraphStages`(`materialization/resourceState.js`): 같은 검사를 같은 순서로 하며 resource마다 멈춘다. Handler가 `validateBindingsStages`를 가지면 그것을 쓴다. 동기 `validateResourceGraph`는 같은 stages를 한 번에 소비한다.
- Builtin resource handler는 선택적으로 `validateBindingsStages`를 가질 수 있다(`resourceKinds.js`). 키는 정확히 2개 또는 3개이고 함수여야 한다.
- Edge-route binding(`graph/routeState.js`): V2는 job 재구성(`edgeRouteJobStages`)과 결과 검산(`validateRouteResultStages`)을 단계로 하고, 큰 provenance digest 두 개 사이에도 멈춘다. 오류와 순서는 그대로다(viewport 불일치는 digest 전에 같은 오류).
- Route geometry 검사(`routes/result.js`): 256 route 또는 32,768 sample마다 멈춘다. 단, route가 이미 deep-owned일 때만이다. Worker에서 받은 completion은 getter를 실행하지 않는 형태 검사와 snapshot을 한 turn에 끝낸다("suspension 전 snapshot" 계약과 getter 0회 시험 유지).
- `completedEdgeRouteResourceStages`, `prepareGeoResourceRevisionsStages`, `planEdgeRouteApplicationStages`. 등록 planner는 stages 형태이고 V2 create/edit 준비가 host turn 사이로 소비한다. 동기 경로는 같은 stages를 한 번에 소비한다.

## 대조

- 기준 commit `ccfac9c8f`와 저장 program bytes 동일(density·force-directed·edge-path, route 결과 hash 포함).
- Route 시험 167개, builtin resource 시험, 새 시험 2개: staged binding 순서·turn 수와 동기 소비 동일; 받은 completion은 owned copy보다 turn이 적음(geometry 중간 멈춤 없음).

## 결과 (Node, 실제 worker thread, 최장 동기 구간)

| 경우 | 전 | 후 |
| --- | --- | --- |
| 10k edge-path V2 | 2,040ms | 317ms(받은 completion 검사 turn), 첫 snapshot 238ms |
| 1k force-directed V2 | 377ms | 106ms |
| 100 density V2 | 456ms | 173ms |
| 10k edge-path V1 | 912ms | 912ms(V1은 동기 설계 유지) |

## 남은 한계

- 받은 completion: getter 없는 형태 검사가 snapshot보다 먼저여야 하고 snapshot은 suspension 전이어야 한다. 이 둘을 같이 지키면 그 turn은 route 수에 비례한다. 줄이려면 "검사한 route를 그 turn에 복사하고 이후 변경은 결과 hash로 거부"하는 방식으로 계약을 바꿔야 하므로 이번에는 하지 않았다.
- 첫 await 전 snapshot(저장 graph 검증 포함): 인자 snapshot 계약과 오류 순서 때문에 동기다.
- V1 경로와 native update의 원 action preflight는 동기 설계다.
