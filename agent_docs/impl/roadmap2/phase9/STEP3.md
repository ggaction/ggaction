# Roadmap 2 — Phase 9 Step 3: Mark-Item Resolver and Selection State

## 목표

Final semantic visual units를 stable selectable items로 해석하고 reusable selection resource를 저장한다.

## 진행 상태

- [ ] Canonical item key/member/value/graphic identity contract
- [ ] Point row-symbol resolver
- [ ] Histogram/aggregate/grouped/stacked/ranged bar-cell resolvers
- [ ] Line/area series-path resolver and unique-field policy
- [ ] Rule-line resolver
- [ ] Deterministic selection ID, `currentSelection` and immutable stored definition
- [ ] Empty/multiple/ambiguous selection behavior
- [ ] Re-resolution hook in mark rematerialization plans
- [ ] Selector and package-boundary contract tests
- [ ] STEP status, conceptual commit and push

## 경계

Resolvers consume semantic/materialization calculations, not concrete dimensions. Graphic child IDs are attachment
targets only after semantic selection has resolved.

## 완료 조건

Every implemented mark type exposes deterministic item keys and selection state survives an equivalent rematerialization.
