# Route 준비의 메인 스레드 멈춤과 100ms 취소 — 2026-11-06

## 진행 상태

- [x] Benchmark에 준비 중 최장 host turn 간격(`prepareBlockingMs`)과 취소 시험(10회) 추가.
- [x] 원인 분석(Node, 실제 worker thread, CPU profile).
- [x] V2 준비 뒤쪽(route resource 조립·저장 graph 검증·consumer plan)을 host turn 사이 단계로 분할.
- [x] Chromium 재측정([분할 전](route-prepare-blocking-evidence/report-routes-before.json.gz), [분할 후](route-prepare-blocking-evidence/report-routes-staged.json.gz)).
- [x] Host turn 비용 축소(10ms마다 한 번) 후 재측정. [report](route-prepare-blocking-evidence/report-routes-sliced.json.gz)
- [x] Route bounds 비교: route마다 SHA-256 두 번 대신 네 필드를 숫자인지와 `Object.is`로 비교한다(같은 판정이고, 중첩 값의 getter를 실행하지 않는다).
- [x] 독립 검토(STEP-075) 지적 반영: archive 표기, 원인 귀속, 취소 측정 방식(아래 "검토 반영").
- [ ] 받은 completion 검사 turn, 첫 await 전 snapshot, V1·native update preflight는 여전히 크기에 비례한다(아래 "남은 한계").

## 왜 했나

계약 SLO는 bundling 취소 응답 100ms 이하다. 취소는 host turn 사이에서만 처리되므로 실제 응답 시간은 "준비 중 가장 긴 동기 구간 + 거부까지 걸린 시간"이다. 시험해 보니 `abort()` 뒤 거부 자체는 1ms 안이었다. 결정하는 것은 동기 구간이다.

첫 Chromium 측정(archive sha256 `5e3ec387…`, P95):

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

## Chromium (archive sha256 `28df132d…`, DPR1 / DPR2, P95)

| 경우 | bundling | 최장 동기 구간 | 판정 |
| --- | --- | --- | --- |
| 100 hierarchical·FD·edge-path | 49–133ms | 7–28ms | 통과 |
| 100 density(명시 예산) | 7,495 / 7,605ms | 126ms | 시간·취소 미달 |
| 1k hierarchical·edge-path | 349–518ms | 66–89ms | 통과 |
| 1k force-directed(명시 예산) | 4,218 / 4,238ms | 75 / 96ms | 시간·취소 통과(이전 동기 구간 327–337ms), 명시 예산 정책에서만 |
| 10k hierarchical·edge-path(V1) | 3,487–4,626ms | 671–688ms | 취소 미달 |

분할 뒤 total 시간이 늘었다(force-directed 1k 3.1 → 4.2초, density 100 5.7 → 7.5초). 브라우저는 `setTimeout(0)` turn을 최소 4ms로 늘리므로 단계마다 turn을 주면 대기 시간이 쌓인다. 그래서 단계 사이 abort·deadline 검사는 그대로 두고 host turn은 10ms 이상 일한 뒤에만 준다(`ROUTE_TURN_MS`).

## 10ms마다 host turn (archive sha256 `8f3fe1e1…`, DPR1 / DPR2, P95)

| 경우 | bundling | 최장 동기 구간 | 판정 |
| --- | --- | --- | --- |
| 100 hierarchical·FD·edge-path | 49–131ms | 7–29ms | 통과 |
| 100 density(명시 예산) | 4,345 / 4,620ms | 125 / 127ms | 시간·취소 미달 |
| 1k hierarchical·edge-path | 350–550ms | 67–89ms | 통과 |
| 1k force-directed(명시 예산) | **2,354 / 2,533ms** | 76 / **103ms** | DPR1 통과, DPR2 취소 3ms 초과 |
| 10k hierarchical·edge-path(V1) | 3,503–4,704ms | 671–683ms | 취소 미달 |

Turn 비용을 줄이자 total 시간이 분할 전보다도 줄었다(force-directed 1k 3.1 → 2.4초, density 100 5.7 → 4.3초).

Force-directed 1k의 최장 구간 중 가장 큰 부분은 받은 completion 검사 turn이다(Node profile: geometry 61ms 중 point·command마다 getter 없는 descriptor 검사 49ms, snapshot 13ms). 이 검사가 getter 0회와 snapshot 전 검사를 보장하므로 줄이지 않았다. 10ms 묶음은 그 앞뒤로 최대 약 10ms를 더할 수 있다: 분할 직후 DPR2 96ms(통과)가 묶음 뒤 103ms(미달)가 되었다. 공용 측정기는 독점 창이 아니었으므로(load average 2.5–5.6) 3ms 차이에는 잡음도 있다. 판정은 103ms 미달로 둔다.

Density 100의 최장 구간(약 125ms)도 받은 completion 검사 turn이다. Density route는 route마다 sample이 많아 point·command 형태 검사가 길다.

## AT-82 판정 요약

- Bundling 시간: hierarchical·edge-path 전 크기, force-directed 100 통과. Force-directed 1k는 명시 예산 정책에서만 통과한다(기본 정책은 work 1천만 초과로 명시 오류). Density 전 크기와 force-directed 10k는 원 알고리즘 비용으로 미달.
- 취소 100ms: 100·1k의 hierarchical·edge-path, force-directed 100, force-directed 1k DPR1 통과. Density 100(125ms), force-directed 1k DPR2(103ms), 10k(약 680ms) 미달.
- 10k의 원인은 V1만이 아니다. Benchmark 10k 행은 기본 정책(V1)이지만, Node에서 V2 10k도 받은 completion 검사 turn 317ms와 첫 snapshot 238ms로 미달이다. 원인 분류는 시간(route 수에 비례하는 한 turn 검사와 첫 await 전 snapshot)이다.

## 검토 반영 (STEP-075 독립 검토, 2026-11-06)

- Archive 표기: 이전에는 npm shasum(sha1)을 적었다. Report가 기록하는 archive sha256 앞자리로 고쳤다.
- 취소 측정: 이전 `acknowledgementMs`는 abort timer가 이미 실행된 뒤부터 쟀고, 판정은 P95 동기 구간에 더했다. 이제 timer의 예정 시각부터 거부까지 직접 재고, 판정은 그 최대값과 모든 표본의 최장 동기 구간 최대값 중 큰 값이다(`scripts/benchmarks/routes.browser.js`). 위 표의 판정은 이전 방식이며 다음 측정에서 새 방식으로 다시 낸다.
- Discovered action의 route policy는 이제 그 route job에 처음 닿는 순간부터 준비 중에도 적용한다(이전에는 준비가 끝난 뒤 대조).
- Ledger 부과 대조: 분할 전 commit `ccfac9c8f`와 저장 graph 검증·route 준비·적용의 ledger 진단(work·pairs·peak samples·peak buffer)이 edge-path·force-directed·density에서 같다([script](route-prepare-blocking-evidence/ledger-eq.mjs), [출력](route-prepare-blocking-evidence/ledger-eq-output.txt)).
- 시험: 받은 completion을 검사 단계 사이에서 바꿔도 검사한 snapshot이 결과로 남는다; route bounds의 중첩 getter를 실행하지 않는다; 10ms 묶음의 실행 순서를 고정한다.
