# STEP 2 — Mark and Scale Symmetry Primitive Variants

## 진행 상태

- [ ] Point create appearance와 palette edit target
- [ ] Bar create appearance target
- [ ] Line create/edit constant appearance target
- [ ] Primitive state, render order와 PNG 검증

## 구현

Cars scatterplot, Jobs grouped bar와 scale-free Cars line을 사용한다. Appearance는 graphical config이며
field-driven color와 constant fill/stroke conflict를 target call chain에서 피한다. `editScale({ palette })`는
existing nested `range.palette` 결과와 같은 semantic range를 목표로 한다.
