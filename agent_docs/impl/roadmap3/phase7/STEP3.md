# STEP 3 — Facet Layout, Headers and Parent Title

## 진행 상태

- [x] Omitted columns one-row layout
- [x] Explicit column wrapping과 row-major placement
- [x] Header concrete bounds
- [x] Parent title promotion reference
- [x] Gate target gap과 padding reference

Facet layout은 resolved value 순서를 유지하고 `ceil(valueCount / columns)` rows를 만든다. Header와 promoted
title의 concrete position은 materialization에서 결정하며 renderer가 text를 재배치하지 않는다.

Scatterplot은 `3 × 1`, histogram은 row-major `2 × 2` layout이며 마지막 slot은 비어 있다. Production의 full
align/padding validation은 Phase 6 grammar를 재사용하는 STEP 8에서 검증한다.
