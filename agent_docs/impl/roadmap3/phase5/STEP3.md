# STEP 3 — Cars Origin Donut Primitive

## 진행 상태

- [x] USA, Europe, Japan count aggregation
- [x] Count-proportional contiguous theta partition
- [x] Shared inner radius and deterministic color order
- [x] Concrete categorical legend
- [x] Browser and high-DPI PNG rendering

Cars source의 first-appearance Origin order를 유지하고 count 합이 정확히 360도를 보존하도록 partition한다.
각 item은 같은 inner/outer radius를 가진 annular sector이며 renderer가 aggregate나 normalization을 수행하지 않는다.
