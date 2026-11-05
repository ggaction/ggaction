# Graph plot 명시 용량 제안 — 2026-11-05

## 진행 상태

- [x] 사용자 확인: "1,2,3 승인"(2026-11-05). [승인 기록](PUBLIC_APPROVAL_20261105_PERF.json)
- [ ] 구현·시험·route benchmark 10k 검증.

## 문제

`materialization/graph/plot.js`는 `node 수 × (label이 있으면 2, 없으면 1) + edge 수 × 2`가 기본 생성 상한 10,000을 넘으면 거부한다. 그래서 route benchmark의 edge 1만 개 사례(hierarchical, edge-path)가 `Graph plot graphic count must not exceed 10000`으로 실패한다.

## 제안

- `createGraphPlot`/`editGraphPlot`에 `maxItems?: number`를 둔다. 기본값은 지금과 같은 10,000이고, 명시하면 1..100,000의 safe integer를 받는다.
- 저장 위치는 graph plot config 한 곳이다.
- 위 graphic 수는 이 값으로 검사한다. 다른 한도(edge route work, 저장 용량, 재물질화 work)는 그대로다.
- 생략한 기존 program·저장 bytes·오류는 바뀌지 않는다. 같은 방식의 point `maxItems` 정책을 따른다.
