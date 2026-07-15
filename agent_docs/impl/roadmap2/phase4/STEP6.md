# Roadmap 2 — Phase 4 Step 6: Filter Predicate Primitives

## 목표

Ordered comparison과 inclusive range filter의 selected rows, regression result와 final chart target을 independent
primitives로 고정한다.

## 진행 상태

- [x] Comparison-filter independent rows/models
- [x] Range-filter independent rows/models
- [x] Source order와 endpoint inclusion target
- [x] Empty/incompatible row policy target
- [x] Expanded target call-chain metadata
- [x] Browser와 2× primitive PNG 생성
- [ ] Gate C 사용자 visual confirmation
- [ ] Feedback, status, commit와 push

## Gate C 대상

- `comparison-filter`: `Horsepower >= 150`, 71 rows, USA 1개 group, regression result 15 rows.
- `range-filter`: inclusive `100 <= Displacement <= 300`, 205 rows, Europe/Japan/USA 순서,
  regression result 57 rows.
- 두 variant 모두 source order를 유지하고 ordered comparison에서 missing, non-finite 또는 다른 type의
  field value를 제외한다. Inclusive range는 실제 lower endpoint row를 포함한다.
- Primitive trace에는 향후 public `filterData` comparison/range call이 없으며, gallery metadata에만 목표
  user-facing chain을 표시한다.

## 완료 조건

두 selected-row sets와 resulting point/band/line geometry가 승인된다.
