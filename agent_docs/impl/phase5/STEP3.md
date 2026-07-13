# Phase 5 — Step 3: Primitive Regression Scatterplot

## 목표

기존 stable actions와 low-level primitives로 완전한 목표 chart를 작성해 이후 public
actions의 graphical acceptance baseline으로 사용한다.

## 진행 상태

- [x] Regression scatterplot values fixture의 concrete layout 확장
- [x] Primitive semantic transform/layer/encoding contract
- [x] Heterogeneous point children
- [x] Origin별 closed confidence-band path
- [x] Origin별 regression-line path
- [x] Raw grid, axes, Origin/size legends
- [x] Explicit graphical order
- [x] Acceptance, immutability, graphicSpec-only rendering
- [x] 2× PNG 직접 확인
- [x] 전체 regression, commit, push

## Program 원칙

`createCanvas`, `createData`는 재사용한다. 아직 없는 behavior만 `editSemantic`,
`createGraphics`, `editGraphics`의 명시적인 단일 chain으로 작성한다. Primitive-specific
batching helper를 두지 않는다.

## Semantic 결과

- `cars`: immutable source 406행
- `selectedCars`: Japan/USA filter provenance와 materialized 333행
- `regressionData`: Origin별 linear regression provenance와 materialized 73행
- Layer: point, area confidence band, line regression
- Shared resources: x/y coordinate scales, Origin color, Acceleration size, Origin shape

## Graphical 결과

```text
canvas
→ horizontal grid 3
→ points 333 (circle 254 + square 79)
→ confidence bands 2
→ regression lines 2
→ x/y axes
→ Origin composite legend
→ Acceleration size legend
```

2× PNG는 `1520×960`이며, USA/Japan point와 line, 두 confidence band, 두 right-side
legend가 함께 보이는 것을 직접 확인했다.

## 검증 결과

- 일반/coverage test 330개가 통과했다.
- 기존 chart와 새 primitive chart를 포함한 high-resolution PNG regression 5개가
  통과했다.
- Primitive renderer는 `graphicSpec`만 전달해도 같은 333 points와 두 band를 그린다.
- Source cars, filtered rows, regression rows와 이전 `ChartProgram`의 불변성을 확인했다.
