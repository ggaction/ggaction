# Roadmap 2 — Phase 7 Step 6: Curve and Boundary Primitives

## 목표

Gapminder data로 curved area와 lower/upper boundary 조합을 raw primitives로 만들고 Gate C에서 style와 drawing order를
승인받는다.

## 진행 상태

- [ ] Representative non-linear area curve target
- [ ] Inherited boundary curve target
- [ ] Boundary curve override target
- [ ] Custom stroke/width/dash/opacity targets
- [ ] Band-before-lower-before-upper drawing order
- [ ] Variant manifest and exact future call chain
- [ ] `gapminder-curved-boundaries/primitive.png` and browser checks
- [ ] Gate C user confirmation
- [ ] STEP status, conceptual commit and push

## Gate C

Curve는 discrete interval points를 지나며 lower/upper paths가 band와 같은 grouping/order를 유지해야 한다.
Boundary는 fill을 가리지 않되 겹치는 series에서도 읽을 수 있어야 한다. 승인 전에는 area curve와 boundary
aggregate implementation을 완료하지 않는다.

## 완료 조건

Chosen curve/default inheritance/override와 boundary visual order가 승인된다.
