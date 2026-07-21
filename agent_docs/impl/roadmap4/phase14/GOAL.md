# Roadmap 4 Phase 14 — Basic Chart facade consistency closeout

## 진행 상태

- [x] Phase 13 skip과 active Phase 없음 기준 확인
- [x] 8개 facade runtime/type/contract/example inventory 감사
- [x] Lifecycle 차이를 보존한 candidate parity matrix 작성
- [x] P14-A remote checkpoint 준비
- [x] P14-A 사용자 승인
- [x] Approved Box parity repairs 구현
- [x] Cross-facade edit handoff와 representative visual 검증
- [ ] P14-B 사용자 승인
- [ ] Current contract/docs/package와 cumulative closeout
- [ ] P14-Exit 사용자 승인

## 목표

새 chart type을 추가하지 않고 현재 8개 chart-authoring facade의 inference, defaults, option forwarding,
trace와 post-create edit handoff를 일관된 제품 계약으로 닫는다.

```text
createScatterPlot
createLinePlot
createBarPlot
createHistogram
createHeatmap
createGradientPlot
createBoxPlot
createParallelCoordinates
```

여섯 ordinary facade는 existing child actions로 편집하는 aggregate create-only lifecycle을 유지한다.
Gradient/Box plot은 generated data와 owned component를 가진 mutable composite이므로 각각
`editGradientPlot`/`editBoxPlot`을 유지한다. Signature를 기계적으로 통일하지 않고 shared behavior만 맞춘다.

## Candidate repairs

정확한 현황과 repair ID는 [`PARITY_MATRIX.json`](./PARITY_MATRIX.json)이 소유한다.

- `P14-R1`: `createBoxPlot` data inference를 explicit → source → current → unique로 완성한다.
- `P14-R2`: `createBoxPlot({ guides })`에 `false | CreateGuidesOptions`를 추가한다. 생략과 `false`는 기존처럼
  guide를 만들지 않고 명시적인 object만 applicable guide를 생성한다.
- `P14-R3`: omitted target이 여러 compatible source 사이에서 ambiguous하면 partial action 전에 명확히 오류낸다.
- `P14-R4`: public `BoxPlotOptions`를 다른 facade option type처럼 package root에서 export한다.

## 승인 Gate

| Gate | 상태 | 승인 대상 | 승인 전 차단되는 작업 |
| --- | --- | --- | --- |
| P14-A | approved | 8-facade matrix, lifecycle classes, P14-R1~R4와 non-goals | — |
| P14-B | ready-for-review | repaired runtime/types/trace, edit handoff matrix와 representative visual | public closeout |
| P14-Exit | planned | Current inventory/docs/package와 cumulative verification | Phase 15 |

모든 Gate는 hard pause다.

## 실행 순서

1. [STEP1](./STEP1.md) — inventory와 P14-A parity contract
2. [STEP2](./STEP2.md) — approved Box inference/guide repairs
3. [STEP3](./STEP3.md) — cross-facade edit handoff와 representative visual, P14-B
4. [STEP4](./STEP4.md) — Current docs/package/cumulative closeout와 P14-Exit

## Non-goals

- 새로운 chart facade 또는 semantic schema
- 모든 facade에 동일한 required fields나 nested option을 강제
- One-shot facade에 advanced child API 전체 복제
- Aggregate `editScatterPlot`/`editLinePlot`/`editBarPlot` 추가
- Existing canonical example의 시각 기본값 변경
