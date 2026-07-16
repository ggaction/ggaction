# Roadmap 2 — Phase 8 Step 5: Horizontal Minmax Primitive

## 목표

Cars Origin × Horsepower를 사용해 raw horizontal minmax target를 만들고 Gate B에서 orientation, x/x2 body,
vertical median과 no-outlier policy를 승인받는다.

## 진행 상태

- [x] Independent category-wise min/median/q1/q3/max rows
- [x] Raw y + x/x2 box body geometry
- [x] Horizontal whiskers, vertical caps and median geometry
- [x] No outlier dataset/layer/graphic evidence
- [x] Axes, vertical grid and title composition
- [x] Variant manifest and exact future call chain
- [x] `cars-horizontal-minmax/primitive.png` and renderer checks
- [x] Gate B user confirmation
- [x] STEP status, conceptual commit and push

## Gate B

Horizontal orientation, observed min/max endpoints, component alignment, vertical grid와 minmax에서 optional outlier
resource가 전혀 생기지 않는지 확인한다.

## 완료 조건

Independent minmax rows가 finite ordered horizontal components를 만들고 target visual이 승인된다.
