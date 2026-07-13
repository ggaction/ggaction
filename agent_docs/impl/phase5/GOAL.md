# Phase 5 Goal — Regression Scatterplot

## 목표

Cars dataset으로 filtered point layer, Origin별 linear regression line, 95% confidence
band를 겹친 regression scatterplot을 구현한다.

완전한 chart 계약은 다음 문서에서 관리한다.

- [`../chart/regression-scatterplot.md`](../chart/regression-scatterplot.md)

## 진행 상태

- [x] Chart contract와 Phase 실행 계획
- [x] Regression 통계와 primitive expected values
- [x] Heterogeneous point와 filled path graphical foundation
- [x] Primitive regression scatterplot baseline
- [x] Immutable derived-data filtering
- [x] Point size, shape, opacity encoding
- [x] Regression grammar와 derived values
- [x] Area mark와 ranged y encoding
- [x] `createRegression` aggregate action
- [x] Composite Origin legend와 size legend
- [x] Public vertical slice, documentation, regression cleanup

## 실행 순서

```text
STEP1  statistical contract fixture
STEP2  heterogeneous point + filled path foundation
STEP3  primitive baseline
STEP4  filterData
STEP5  point appearance encodings
STEP6  regression grammar
STEP7  area mark and ranged encoding
STEP8  createRegression
STEP9  guides
STEP10 public vertical slice and cleanup
```

## 완료 조건

- 최종 public chain이 chart contract와 일치한다.
- `createRegression()`의 shortest valid call이 x/y/groupBy를 안전하게 infer한다.
- Point, band, line이 shared x/y scales를 사용한다.
- Student-t 기반 mean-response 95% confidence interval이 deterministic하다.
- Primitive baseline과 public program의 `graphicSpec`, order, renderer calls가 같다.
- Browser, 2× PNG, acceptance, unit, docs, coverage regression이 모두 통과한다.
