# STEP 4 — Scatterplot Facet Primitive

## 진행 상태

- [x] Three Origin cells와 shared x/y domains
- [x] Per-cell point items와 guides
- [x] Parent title와 headers
- [x] Explicit extension primitive chain

Cars `Horsepower` × `Miles_per_Gallon`을 USA, Europe, Japan 순으로 한 줄에 배치한다. 모든 cell은 같은
domain과 local range를 사용하며 guide는 cell마다 그린다.

Gate canvas는 `782 × 282`, child Canvas는 `250 × 230`이며 shared domains는 Horsepower `[46, 230]`, MPG
`[9, 46.6]`이다.
