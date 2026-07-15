# Roadmap 2 — Phase 4 Goal

## 목표

Cars density area와 regression scatterplot을 canonical baselines로 사용해 area/component editing, density
kernel·normalization·immutable reassignment, filter predicate modes, regression method와 prediction interval을
구현한다.

완전한 chart와 variant 계약은 다음 문서에서 관리한다.

- [`../chart/cars-density-area-variants.md`](../chart/cars-density-area-variants.md)
- [`../chart/cars-regression-scatterplot-variants.md`](../chart/cars-regression-scatterplot-variants.md)

## 진행 상태

- [x] Phase 4 범위, variant와 approval gate 설계
- [x] 두 canonical baseline audit와 Roadmap 2 gallery pair
- [x] Area outline/component edit primitive 승인과 public implementation
- [ ] Density kernel/normalization primitive 승인과 public implementation
- [ ] Filter predicate primitive 승인과 public implementation
- [ ] Regression method/interval primitive 승인과 public implementation
- [ ] Full parameter, numeric, failure, immutability와 rematerialization matrix
- [ ] Public docs, contract 승격과 Phase closeout

## 구현 범위

- `createAreaMark`/`createRegressionBand` outline과 `editAreaMark`
- `editRegressionBand`, `editRegressionLine`
- Density kernels: `gaussian | epanechnikov | uniform | triangular`
- Density normalization: `unit | count`
- `editDensity` immutable derived-data revision과 consumer rebind
- `filterData` comparison predicate와 inclusive/exclusive range
- Regression methods: `linear | polynomial | loess`
- Linear/polynomial `mean | prediction` interval과 optional band

Statistical choices and provenance are semantic state. Curve and area/component appearance are private graphical
materialization config. Renderer는 final path commands와 concrete appearance만 읽는다.

## 실행 순서

```text
STEP1   density/regression canonical baseline audit와 Phase contract
STEP2   area outline와 regression component edit primitives
  ↓ Gate A: appearance visual confirmation
STEP3   area outline와 component edit actions
STEP4   density kernel/normalization/edit primitives
  ↓ Gate B: density visual confirmation
STEP5   density vocabulary와 immutable editDensity
STEP6   comparison/range filter primitives
  ↓ Gate C: filter visual confirmation
STEP7   filter predicate modes
STEP8   polynomial/loess/prediction primitives
  ↓ Gate D: regression visual confirmation
STEP9   regression methods와 prediction interval
STEP10  integration, docs, contract promotion과 cleanup
```

Gate STEP은 raw primitive, independent target values, expanded user-facing chain metadata와 `primitive.png`만
만든다. 사용자 승인 전에는 해당 user-facing implementation이나 `user-facing.png`를 만들지 않는다.

## Visual variant와 machine coverage

Phase 4 gallery는 baseline 2개를 포함한 12개 variant를 목표로 한다.

- Density baseline 1개
- Density appearance 1개
- Density kernel/normalization/revision 3개
- Regression baseline 1개
- Regression component appearance 1개
- Filter comparison/range 2개
- Polynomial/LOESS/prediction interval 3개

모든 kernel/operator/method vocabulary, numeric boundaries와 mutually exclusive option은 exhaustive machine
coverage로 검증한다. Gallery에는 path geometry, magnitude, selected rows, fitted model 또는 component appearance가
실제로 달라지는 representative class만 둔다.

## 완료 조건

- 12개 primitive/public pair의 semantic/graphic/order/Canvas calls가 정확히 같다.
- Density와 regression numeric 결과는 production helper와 독립된 fixtures로 검증된다.
- Edit는 earlier program과 source/derived datasets를 변경하지 않고 deterministic revision/rebind를 수행한다.
- Affected scales, marks, axes, grids와 legends가 ordered materialization plan으로 완전히 갱신된다.
- Invalid vocabulary, incompatible options, ambiguous targets와 mid-plan failure가 atomic하다.
- Types, examples, tutorials, API/reference/LLM docs와 action catalog가 구현 상태와 일치한다.
- Unit, contract, chart, docs, coverage, render, desktop/mobile gallery와 remote CI가 통과한다.

## STEP 문서

- [`STEP1.md`](STEP1.md)
- [`STEP2.md`](STEP2.md)
- [`STEP3.md`](STEP3.md)
- [`STEP4.md`](STEP4.md)
- [`STEP5.md`](STEP5.md)
- [`STEP6.md`](STEP6.md)
- [`STEP7.md`](STEP7.md)
- [`STEP8.md`](STEP8.md)
- [`STEP9.md`](STEP9.md)
- [`STEP10.md`](STEP10.md)
