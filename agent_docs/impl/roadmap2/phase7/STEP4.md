# Roadmap 2 — Phase 7 Step 4: Cars Horizontal Primitive

## 목표

Cars string Year와 Acceleration을 사용해 raw horizontal x/x2 error-band target를 만들고 Gate B에서
orientation과 boundary appearance를 승인받는다.

## 진행 상태

- [ ] Independent year-wise Acceleration mean/CI expected rows
- [ ] ISO-like string temporal normalization evidence
- [ ] Raw y + x/x2 area path geometry
- [ ] Lower/upper boundary line geometry and order
- [ ] Axes, vertical/horizontal grid policy and title
- [ ] Variant manifest and exact future call chain
- [ ] `cars-horizontal/primitive.png` and renderer/browser checks
- [ ] Gate B user confirmation
- [ ] STEP status, conceptual commit and push

## Gate B

Gapminder fixture나 vertical-path assumptions를 재사용하지 않은 Cars chart로 horizontal closure, time order,
CI width, boundary visibility와 margins를 확인한다. 승인 전에는 `encodeXRange` public flow를 만들지 않는다.

## 완료 조건

Cars expected rows가 finite ordered horizontal paths를 만들고 target visual이 승인된다.
