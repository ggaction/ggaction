# Roadmap 2 — Phase 9 Step 2: Shared Selector Grammar

## 목표

All mark-selection actions가 공유할 pure normalized selector와 independent reference fixtures를 구현한다.

## 진행 상태

- [ ] Field/channel exclusive selector schema and immutable normalization
- [ ] `eq`, `neq`, `gt`, `gte`, `lt`, `lte`
- [ ] `oneOf` and inclusive/exclusive `range`
- [ ] Grouped/ungrouped `min`, `max`, positive `count`
- [ ] `ties: first | all`, deterministic group/item order
- [ ] Numeric/string compatibility, missing/mixed/empty behavior
- [ ] Invalid mode/operator/value preflight and caller-input ownership
- [ ] Independent numeric/string fixtures and invariants
- [ ] STEP status, conceptual commit and push

## 테스트 기준

Each accepted operator and boundary has direct tests; rank output is independent from production mark materializers.

## 완료 조건

One pure selector owner deterministically returns item keys and never inspects pixels, Canvas or renderer state.
