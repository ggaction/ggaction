# Roadmap 2 — Phase 4 Step 9: Regression Methods and Prediction Interval

## 목표

Polynomial/LOESS fitting, prediction interval과 optional regression band를 public regression hierarchy에 구현한다.

## 진행 상태

- [x] Shared method/parameter validation
- [x] Stable polynomial least-squares grammar
- [x] Deterministic LOESS grammar
- [x] Mean/prediction interval calculation
- [x] `createRegressionData` provenance
- [x] `createRegression` band policy와 forwarding
- [x] Singular/minimum-row/boundary/invalid coverage
- [x] Primitive/public equivalence와 user-facing PNG
- [x] Types, docs, contracts, commit와 push

## 구현 결과

- Polynomial은 normalized x basis에서 stable least squares를 계산하고 raw-x coefficient를 model result에
  보존한다. Degree 기본값은 `2`이며 degree `1`은 linear fit과 수치적으로 일치한다.
- LOESS는 span 기본값 `0.75`, tricube weight, local-linear fit과 source-order distance tie를 사용한다.
  Confidence/interval과 band object는 허용하지 않으며 trace에는 data와 line child만 남는다.
- Linear/polynomial은 mean/prediction interval을 지원하며 `band: false`로 band child를 생략할 수 있다.
- 세 승인 variant는 primitive/public semantic, graphic, order, Canvas calls와 2× PNG pixel이 일치한다.

## 검증

- `npm test`: 705 passed
- `npm run test:render`: 230 passed, 46 gallery variants
- `npm run test:coverage`: line 94.95%, branch 90.93%, functions 98.47%

## 완료 조건

Method-specific parameters, band policy and result provenance are exact, atomic and trace-visible.
