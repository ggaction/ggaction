# Phase 5 — Step 6: Regression Grammar

## 목표

Grouped linear OLS와 Student-t mean-response confidence interval을 계산하는 reusable
regression grammar 및 derived-data action을 구현한다.

## 진행 상태

- [ ] Regression option/field validation
- [ ] Grouped OLS calculation
- [ ] Student-t critical value calculation
- [ ] Mean-response confidence interval
- [ ] Observed unique x sampling
- [ ] Deterministic regression row schema
- [ ] `createRegressionData` wrapped action
- [ ] Degenerate group and ambiguity errors
- [ ] Statistical fixture equivalence tests
- [ ] Advanced data API documentation, commit, push

## 저장 결과

Regression dataset은 source, x, y, optional groupBy, method, confidence transform과 concrete
derived values를 저장한다. Source 및 filtered values는 immutable하게 유지한다.
