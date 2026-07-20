# Step 1 — Exact contract와 independent oracle

## 진행 상태

- [x] `FillPaint` owner와 `LinearGradientPaint` exact normalized schema/validation table candidate
- [x] string fill compatibility와 별도 paint action을 만들지 않는 API boundary
- [x] categorical/quantitative x/y 및 deferred inference contract
- [x] density-profile requested/resolved provenance와 one-row-per-category schema
- [ ] independent gradient sampling/color interpolation oracle
- [ ] independent density/profile literal Cars vectors와 invariants
- [ ] normal/reversed value scale의 sample→pixel→stop offset oracle
- [ ] P6-A proposal inventory와 Current API non-leak contract

Production renderer나 public facade보다 먼저 의미, 경계값, ownership과 numeric target을 고정한다.

## 실행 순서

1. Solid string과 structured paint가 공유하는 `fill` value boundary를 정의한다.
2. `LinearGradientPaint`의 endpoint, stop, opacity, duplicate offset과 invalid value 표를 고정한다.
3. GradientPlot의 x/y role inference, density policy와 generated profile row schema를 고정한다.
4. Production helper를 호출하지 않는 density/color/stop oracle로 Cars의 literal expected vector를 만든다.
5. Planned inventory가 runtime/type/docs Current surface에 노출되지 않았음을 검증한다.

## 산출물과 완료 조건

- `FillPaint`는 property value이며 별도 action이 아니라는 exact contract
- Category당 `{ category, values, intensities, lower, upper, center }` 의미를 가진 namespaced profile row contract
- Normal/reversed quantitative range에서 같은 semantic density가 올바른 physical 방향으로 재현되는 literal oracle
- Empty, singleton, missing/non-finite measure, invalid bandwidth/extent/steps와 ambiguous role error table
- P6-A에서 검토할 parameter/default proposal이 source 구현보다 먼저 완성됨
