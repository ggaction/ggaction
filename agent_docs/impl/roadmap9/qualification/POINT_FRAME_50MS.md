# Point 100k full frame 50ms

## 진행 상태

- [x] Format6 sampler의 남은 비용 귀속.
- [x] Compiler의 owned run key 구조 검사와 tuple 중복 검사 재사용.
- [x] 정본 points workload의 100k class를 문서화된 format6 batch 경로로 측정.
- [x] 정본 benchmark 전 크기 통과(archive `bc7633b5…`).

## 귀속

[소유권 표식](OWNED_MARK_DECISION.md) 뒤에도 format6 100k 첫 sample은 93–99ms였다. Profile의 상위는 `canvasScene` compiler였다. `ownDataProperties` 15ms는 매 frame 같은 owned key 배열(prepare 때 만든 동결 배열)의 `ownArray` 재검사였고, `concreteEntries` 11.7ms는 매 frame 10만 개 key를 `Set`에 넣는 run 간 중복 검사였다.

## 수리 (`src/renderers/canvasScene.js`)

1. Owned 배열은 동결된 정확한 값이므로 한 번 통과한 구조 검사는 이후에도 같다. `checkedOwnedRunKeys`는 owned key 배열만 기록한다. Caller 배열은 매번 검사한다. 행 수 일치 검사는 매번 한다.
2. `uniqueKeyTuples`는 [column 검토](circle-column-proof-review.md)가 정한 keyspace cache 조건을 따른다. 모든 entry와 node가 owned이고 run key 배열이 1의 검사를 통과했을 때만 사전 조회한다. 전체 tuple(run key 배열 identity와 single key 문자열)이 정확히 같을 때만 run 간 중복 검사를 생략한다. 빗나가면 처음부터 원 경로로 검사하고, 끝까지 통과한 tuple만 anchor당 한 slot에 기록한다. 같은 anchor의 다른 tuple은 다시 검사한다.

반례는 `test/unit/renderers/circle-batch.test.js`의 `owned run checks are reused only for exact owned keys and whole key tuples`에 있다(같은 anchor의 다른 tuple 중복, caller 배열 accessor·중복, caller scene, 행 수 불일치).

## 정본 workload

`scripts/benchmarks/workloads.browser.js`의 points full-frame은 100k class에서 명시 `formatVersion: 6`을 쓴다. [계약](../../../contract/current/ANIMATION.md#명시-format6와-완성된-batch-frame)상 format6은 완성된 batch frame을 고르는 문서화된 대규모 경로다. Batch 끝점은 원 graphic 객체가 아니라 완성된 frame이므로, 기존 끝점 identity 검사 대신 양 끝 frame의 100,000 좌표와 null decision을 전수 검산한다. 중간 frame은 모든 행의 `cartesian-point` decision과 좌표를 검산한다. 1k·10k는 기존 경로 그대로다.

## 결과

Node 반복 sample(35회 중 앞 5회 제외, 3회 반복): format6 중앙값 38.9–39.7ms, p95 40.6–41.8ms. 같은 조건의 v4(점별 node) 경로는 중앙값 약 406ms, p95 약 612ms로 대규모 실시간 경로가 아니다.

정본 `benchmark-native.js --workload=points`(Chromium, 5 warmup + 30 측정, 종료코드 0):

| 크기 | full frame DPR1 / DPR2 (기준) | hit DPR1 / DPR2 (기준) |
| --- | --- | --- |
| 1k | 3.5 / 3.2 (16.7) | 0.1 / 0.2 (8) |
| 10k | 27.9 / 25.4 (33) | 0.1 / 0.1 (12) |
| 100k | 20.5 / 19.3 (50) | 0.3 / 0.4 (20) |

같은 source의 전체 coverage(일반 10544/10544) 97.42/95.68/99.36%, critical floor 785, browser 529/529, render 513/513, 같은 archive Node20/22/24 설치 소비자 통과. 사용자 GUI 앱이 켜진 상태의 측정이므로 최종 exclusive 창에서 다시 잰다. Canonical memory 100cycle은 별도다.
