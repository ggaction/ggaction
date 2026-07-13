# Phase 5 — Step 9: Regression Scatterplot Guides

## 목표

Shared axes/grid, composite Origin legend, quantitative size legend를 `createGuides()`에
통합한다.

## 진행 상태

- [ ] Shared x/y axes deduplication
- [ ] Existing horizontal grid compatibility
- [ ] Point color+shape+line composite legend recipe
- [ ] Quantitative size legend values와 symbols
- [ ] Right-side multi-legend vertical layout
- [ ] Legend rematerialization after Canvas/scale edits
- [ ] `createLegend`/`createGuides` applicability
- [ ] Trace, shortest call, layout tests
- [ ] Legend/guide documentation
- [ ] Primitive equivalence, commit, push

## Legend 규칙

- 같은 Origin field를 사용하는 color, shape, line을 하나의 categorical legend로 합친다.
- Size는 Acceleration quantitative scale을 설명하는 별도 legend다.
- Fixed confidence-band color는 legend 대상이 아니다.
- Chart별 hidden default를 만들지 않고 기존 right placement를 사용한다.
