# Roadmap 2 — Phase 4 Step 3: Area and Regression Component Editing

## 목표

Gate A target을 `createAreaMark`/`createRegressionBand` outline과 stable component edit actions로 구현한다.

## 진행 상태

- [x] Shared area appearance validation/config
- [x] `createAreaMark`와 `createRegressionBand` outline
- [x] `editAreaMark` create/replace/remove outline
- [x] `editRegressionBand` wrapped area edit
- [x] `editRegressionLine` wrapped line edit
- [x] Target inference/ambiguity와 incompatible fill coverage
- [x] Earlier-program immutability와 trace hierarchy
- [x] Primitive/public exact equivalence와 user-facing PNG
- [x] Types, docs, contracts, commit와 push

Area curve는 shared vocabulary가 승인되어 있지만 area boundary geometry의 별도 primitive approval이 없으므로
remaining Planned parameter로 유지했다. Existing approved line curve는 `createRegressionLine`과
`editRegressionLine`에서 그대로 재사용한다.

## 완료 조건

Appearance edits preserve semantic bindings and rematerialize only affected component consumers.
