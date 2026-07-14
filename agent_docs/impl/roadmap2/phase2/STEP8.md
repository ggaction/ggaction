# Roadmap 2 — Phase 2 Step 8: Scalar Aggregate Vocabulary

## 목표

Current mean/count grammar를 accepted scalar aggregate vocabulary로 확장하고 line/bar consumer가 같은 pure
calculation과 validity policy를 사용하게 한다.

## 진행 상태

- [ ] `sum | median | min | max`
- [ ] `distinct | valid | missing`
- [ ] `variance | varianceP | stdev | stdevP | stderr`
- [ ] `q1 | q3 | ciLower | ciUpper`
- [ ] Finite/nominal compatibility와 missing-value rules
- [ ] Empty/singleton/insufficient-sample omission policy
- [ ] Final visual grain별 line/bar aggregation
- [ ] Inferred/custom axis title policy
- [ ] Scale/line/bar/axis/grid rematerialization
- [ ] Aggregate replacement immutability와 atomic failure
- [ ] Median/dispersion approved primitive/public pairs
- [ ] Types/docs/current contract/catalog, commits와 push

## 완료 조건

모든 scalar operation의 representative, boundary와 invalid fixtures가 통과하고 approved median/dispersion
pair가 exact equivalence를 가진다.
