# Roadmap 2 — Phase 7 Step 8: Regression Delegation

## 목표

Existing `createRegressionBand`를 regression-specific compatibility boundary로 유지하면서 generic
`createErrorBand` explicit mode에 graphical composition을 위임한다.

## 진행 상태

- [ ] Existing regression semantic/graphic/trace snapshot fixtures
- [ ] Regression result provenance and field inference preserved
- [ ] `createRegressionBand → createErrorBand(explicit)` wrapped hierarchy
- [ ] Existing area outline semantics preserved without generic boundaries
- [ ] Grouped/ungrouped, linear/polynomial/loess compatibility
- [ ] Band opacity/stroke/width/curve forwarding
- [ ] Drawing order, scale sharing and consumer-plan equality
- [ ] Earlier regression programs and caller rows immutable
- [ ] Focused and full regression visual regressions
- [ ] STEP status, conceptual commit and push

## 완료 조건

Delegation이 implementation duplication을 제거하지만 existing public regression output과 compatibility를 바꾸지 않는다.

