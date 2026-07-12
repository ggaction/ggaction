# Phase 3 — Step 11: `createGuides` 통합

## 목표

검증된 axes, grid, categorical legend action을 하나의 thin aggregate로 통합한다.

```javascript
.createGuides()
```

Histogram progression의 `.createGrid().createAxes().createLegend()`를 위 호출로
교체한다.

## 진행 상태

- [x] `grid` child option과 validation
- [x] Axes/grid/legend applicability 추론
- [x] Wrapped child 호출 순서 고정
- [x] Histogram progression 통합
- [x] 기존 line example의 grid opt-out
- [x] Aggregate trace와 child option forwarding test
- [x] 사용자 문서 갱신
- [x] 전체 테스트와 PNG 검증

## API

```javascript
createGuides({
  axes?,
  grid?,
  legend?
})
```

각 option은 생략, plain object, 또는 `false`다.

- 생략: semantic applicability가 있으면 선택
- `{}`: 선택하고 세부사항은 child가 추론
- `false`: 명시적으로 제외

## Applicability

- x 또는 y encoding이 있으면 axes
- Cartesian y encoding이 있으면 grid
- Line color/strokeDash 또는 bar color encoding이 있으면 legend
- Point legend는 아직 선택하지 않음

Grid 기본값은 horizontal on, vertical off다.

## Action 구조

```text
createGuides
├─ createAxes?
├─ createGrid?
└─ createLegend?
```

Axes를 먼저 생성하여 grid가 axis tick config를 재사용한다. 각 child의 resource
추론과 validation은 child action에 남긴다. Concrete rendering order는 graphic
placement에 의해 `grid → marks → axes → legend`를 유지한다.

## Progression 변경

Histogram:

```javascript
.createGuides()
```

기존 Phase 2 line example은 이전 PNG를 보존하기 위해 다음처럼 grid를 명시적으로
제외한다.

```javascript
.createGuides({
  axes: { y: { ticksAndLabels: { count: 6 } } },
  grid: false
})
```

## 제외 범위

- Chart title 통합
- Point legend
- Polar guides
- Multiple legend blocks

## 검증 결과

- 전체 unit/acceptance test 265개 통과
- PNG render test 8개 통과
- Histogram에서 `axes → grid → legend` 통합 결과 확인
- Phase 2 line chart의 기존 grid 없는 결과 보존 확인
