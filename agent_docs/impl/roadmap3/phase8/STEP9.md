# STEP 9 — Outer Axes and Shared Gradient Primitive

## 진행 상태

- [x] Outer-axis primitive
- [x] Shared gradient legend primitive
- [x] Incomplete last-row placement
- [x] Parent guide bounds and layout
- [x] Browser Canvas and high-DPI PNG

Gapminder target에 `guides: { axes: "outer", legend: "shared" }`를 적용한 primitive를 작성한다. Parent legend
uses the approved continuous-color recipe and actual concrete bounds. Hidden interior guides leave no semantic,
config, graphic or attachment fragments in the displayed child snapshot.
