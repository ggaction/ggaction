# Graph plot 명시 용량 제안 — 2026-11-05

## 진행 상태

- [x] 사용자 확인: "1,2,3 승인"(2026-11-05). [승인 기록](PUBLIC_APPROVAL_20261105_PERF.json)
- [x] 구현·시험·설치본 검증(archive `47a959f0…`). [증거](graph-plot-capacity-evidence/)
- [x] route benchmark 10k 측정. [report](graph-plot-capacity-evidence/report-routes.json.gz)

## 문제

`materialization/graph/plot.js`는 `node 수 × (label이 있으면 2, 없으면 1) + edge 수 × 2`가 기본 생성 상한 10,000을 넘으면 거부한다. 그래서 route benchmark의 edge 1만 개 사례(hierarchical, edge-path)가 `Graph plot graphic count must not exceed 10000`으로 실패한다.

## 제안

- `createGraphPlot`/`editGraphPlot`에 `maxItems?: number`를 둔다. 기본값은 지금과 같은 10,000이고, 명시하면 1..100,000의 safe integer를 받는다.
- 저장 위치는 graph plot config 한 곳이다.
- 위 graphic 수는 이 값으로 검사한다. 다른 한도(edge route work, 저장 용량, 재물질화 work)는 그대로다.
- 생략한 기존 program·저장 bytes·오류는 바뀌지 않는다. 같은 방식의 point `maxItems` 정책을 따른다.

## 구현 결과 (2026-11-05)

- `maxItems`는 graph plot config에만 저장한다. 생략하면 저장하지 않으며 기존 bytes·오류가 그대로다.
- 같은 한도를 네 곳이 함께 쓴다: plot graphic 수 검사, edge geometry 검사, concrete collection 길이(`resolveGraphicItemCapacity`가 graph owner의 저장 값을 읽음), 저장본 재검증. 변조된 저장본의 범위 밖 값·작은 값은 거부된다.
- Animation·presentation 경로는 기본 한도를 유지한다. 1만 개를 넘는 graph의 animation은 명시적으로 거부된다.
- Route benchmark는 graphic 수가 1만을 넘는 경우에만 정확한 `2 × (node + edge)`를 명시한다.
- 시험: `test/unit/grammar/graph/plot-capacity.test.js`(기본 한도, 범위 오류, 편집, 저장 왕복·변조 거부, stored route, composition).
- 설치본 검증: coverage 97.45/95.6/99.33%(critical floor 786), browser 531/531, render 513/513, Node20/22/24 consumer 통과. 크기 상한은 Node20/24 최댓값으로 갱신했다.

## Route benchmark (archive `47a959f0…`)

`node scripts/benchmark-native.js --workload=routes`, Chromium, DPR 1/2. Edge 1만 개 hierarchical·edge-path가 graphic 수 오류 없이 측정되고 SLO를 통과한다.

| 사례 | DPR1 bundling / materialize P95 | DPR2 bundling / materialize P95 |
| --- | --- | --- |
| 10k hierarchical | 6,954 / 384 ms | 6,868 / 371 ms |
| 10k edge-path | 5,273 / 339 ms | 5,312 / 344 ms |

남은 실패는 density(100·1k·10k)와 force-directed(1k·10k)의 명시 오류다. `Route work`, `Route candidate pairs`, `Route active samples`가 1천만 작업 한도를 넘는다. 이 한도는 route 알고리즘의 기존 작업 예산이며 이번 변경과 무관하다. 한도를 바꾸지 않는다. 이 사례들은 bounded worker 경로나 알고리즘 비용 축소가 있어야 측정할 수 있다.
