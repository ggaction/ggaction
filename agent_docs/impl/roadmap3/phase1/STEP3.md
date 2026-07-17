# STEP 3 — Focused Legend, Axis and Grid Primitive Variants

## 진행 상태

- [ ] Legend layout/labels/title/symbols/border target
- [ ] Whole x/y axis facade target
- [ ] Horizontal grid facade target
- [ ] Stable component identity와 plot/legend region 검증

## 구현

Regression scatterplot의 series/size legend를 왼쪽에 배치해 five focused legend actions를 한 target에서
보여준다. Mirrored Cars scatterplot으로 `editXAxis`, `editYAxis`와 `editGrid`가 existing leaf contract를
정확히 aggregate하는 final geometry를 고정한다.
