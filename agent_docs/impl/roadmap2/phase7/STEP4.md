# Roadmap 2 — Phase 7 Step 4: Cars Horizontal Primitive

## 목표

Cars string Year와 Acceleration을 사용해 raw horizontal x/x2 error-band target를 만들고 Gate B에서
orientation과 boundary appearance를 승인받는다.

## 진행 상태

- [x] Independent year-wise Acceleration mean/CI expected rows
- [x] ISO-like string temporal normalization evidence
- [x] Raw y + x/x2 area path geometry
- [x] Lower/upper boundary line geometry and order
- [x] Axes, vertical/horizontal grid policy and title
- [x] Variant manifest and exact future call chain
- [x] `cars-horizontal/primitive.png` and renderer checks
- [x] Gate B user confirmation
- [x] STEP status, conceptual commit and push

## Candidate visual contract

- x는 `Acceleration` year-wise mean의 95% CI lower/upper, y는 strict ISO-like `Year` temporal position이다.
- x domain은 `nice: true`, `zero: false`로 `[10, 20]`, y domain은 1970–1982로 결정한다.
- Quantitative interval axis를 읽기 쉽게 vertical grid만 켜고 horizontal grid는 만들지 않는다.
- Band는 `#4c78a8`, opacity `0.2`이고 lower/upper boundary는 `#355f8a`, width `1.5`다.
- Drawing order는 vertical grid → band → lower boundary → upper boundary → axes/title다.
- 1981 row가 없는 원본 Cars 순서를 시간순으로 normalize하되 보간하거나 새 row를 만들지 않는다.

## Gate B

Gapminder fixture나 vertical-path assumptions를 재사용하지 않은 Cars chart로 horizontal closure, time order,
CI width, boundary visibility와 margins를 확인한다. 승인 전에는 `encodeXRange` public flow를 만들지 않는다.

## 완료 조건

Cars expected rows가 finite ordered horizontal paths를 만들고 target visual이 승인된다.
