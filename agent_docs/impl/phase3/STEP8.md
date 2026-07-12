# Phase 3 — Step 8: Histogram Axes

## 목표

`carsHistogramActions`의 raw axis semantic/graphics 작성을 다음 aggregate action으로
교체한다.

```javascript
.createAxes()
```

## 진행 상태

- [x] Histogram shortest-call axis contract test
- [x] Binned x encoding에서 bin-boundary tick 추론
- [x] Count y scale과 일치하는 nice tick 생성
- [x] Scale, coordinate, axis title 자동 추론 검증
- [x] Actions progression의 raw axis 코드 제거
- [x] Canvas/margin 변경 rematerialization 검증
- [x] Primitive progression과 렌더 결과 비교
- [x] 사용자 문서 갱신
- [x] 전체 테스트와 PNG 검증

## 기본 추론

완성된 histogram에서 `createAxes()`는 저장된 semantic state만 읽는다.

```javascript
{
  x: {
    scale: "x",
    coordinate: "main",
    title: "Displacement"
  },
  y: {
    scale: "y",
    coordinate: "main",
    title: "count(Displacement)"
  }
}
```

- x축 tick은 binned x encoding의 실제 bin boundaries를 사용한다.
- y축 tick은 resolved count scale domain에 맞는 nice values를 사용한다.
- Explicit `ticksAndLabels.count` 또는 `values`가 있으면 그 값이 추론보다 우선한다.
- Guide action은 coordinate를 생성하거나 encoding을 보정하지 않는다.

## Action 구조

```text
createAxes
├─ createXAxis
│  ├─ createXAxisLine
│  ├─ createXAxisTicksAndLabels
│  └─ createXAxisTitle
└─ createYAxis
   ├─ createYAxisLine
   ├─ createYAxisTicksAndLabels
   └─ createYAxisTitle
```

`createAxes`는 선택과 호출 순서만 담당한다. Bin tick inference는 실제 tick을
소유하는 lower-level axis tick action에서 수행한다.

## Progression 변경

`carsHistogramActions`에서 axis 관련 raw `editSemantic`, `createGraphics`,
`editGraphics` 호출을 제거하고 `.createAxes()`를 호출한다. 아직 action으로
교체하지 않은 grid, legend, title primitive 코드는 유지한다.

## 제외 범위

- Grid action
- Histogram legend action
- Chart title action
- Polar axis
- Top/right axis position

## 검증 결과

- Unit/acceptance test 251개 통과
- PNG render test 8개 통과
- `cars-histogram-actions.png`에서 bin boundary x ticks와 count y ticks 확인
- Primitive와 action progression의 semantic, graphic, Canvas calls 일치
