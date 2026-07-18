# STEP 4 — Scatterplot Facet Primitive

## 진행 상태

- [x] Three Origin cells와 shared x/y domains
- [x] Per-cell point items와 guides
- [x] Parent title와 headers
- [x] Shared Cylinders color domain과 parent legend
- [x] Explicit extension primitive chain

Cars `Horsepower` × `Miles_per_Gallon`을 USA, Europe, Japan 순으로 한 줄에 배치한다. 모든 cell은 같은
domain과 local range를 사용하며 guide는 cell마다 그린다.

Gate canvas는 `932 × 282`, child Canvas는 `250 × 230`이며 shared nice position domains는 Horsepower
`[40, 250]`, MPG `[0, 50]`이다. Cylinders domain `[8, 4, 6, 3, 5]`와 `reds` range도 모든 cell이 공유한다.
