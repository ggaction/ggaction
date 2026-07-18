# STEP 5 — Histogram Facet Primitive

## 진행 상태

- [x] Shared global bin boundaries
- [x] Shared y count domain
- [x] `columns: 2` wrapping
- [x] Parent title와 headers
- [x] Explicit extension primitive chain

Cars `Displacement` histogram을 Origin별로 분리한다. Bin boundaries는 모든 cell이 공유하고 y domain은
cell별 count 결과의 union에서 결정한다. 세 번째 cell은 두 번째 row의 첫 column에 온다.

Gate canvas는 `606 × 578`, child Canvas는 `280 × 240`이다. Eight shared bins cover `[50, 500]`; shared y
domain is `[0, 60]`. Zero-count bins remain absent rather than becoming placeholder rectangles.
