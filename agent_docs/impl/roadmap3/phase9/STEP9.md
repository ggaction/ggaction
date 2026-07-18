# STEP 9 — Rect Mark and Heatmap Public Vertical Slice

## 진행 상태

- [x] Semantic rect mark and completeness policy
- [x] `createRectMark` and `editRectMark`
- [x] Two-discrete and ranged position materialization
- [x] Selection/highlight at final cell grain
- [x] Primitive/public pair, browser, PNG, types and docs

Rect는 bar와 별도 semantic recipe다. Existing scale mapping과 concrete rect schema를 재사용하되 aggregation, baseline,
stack 또는 grouped-bar width policy를 암묵적으로 적용하지 않는다.
