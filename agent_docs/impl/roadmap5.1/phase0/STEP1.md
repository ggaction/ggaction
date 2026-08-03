# STEP 1 — Fix the Multi-Legend Target Before Runtime Work

## 진행 상태

- [x] Per-family absolute anchor와 missing sibling-layout owner 확인
- [x] Existing Cars regression oracle가 `+8`/`+30` offset을 고정함을 확인
- [x] Multiple-owner tests가 addressability만 보고 geometry를 검증하지 않음을 확인
- [x] Actual Cars combined right-lane before/after target 작성
- [x] Categorical/size/opacity three-block before/after target 작성
- [x] Common title anchor, stable order, 24-pixel gap와 non-overlap assertion
- [x] Review PNG와 four-renderer artifact 생성
- [ ] Gate checkpoint commit/push

## Current root cause

- Categorical right layout starts at `plot.right + config.offset`, default `8`.
- Size, gradient, opacity와 stroke-width use independent `plot.right + 30` anchors.
- Every family starts from the plot top; only same-target categorical/size has a hard-coded y offset.
- `rematerializeLegend` invokes families independently and has no sibling occupied-bounds pass.

## Approved direction

사용자는 2026-08-03에 narrow pixel patch 대신 all same-edge multi-legend lane correction을 Phase 0에서
구체화하는 방향을 승인했다. Exact rendered target은 R51-P0-V에서 별도로 승인받는다.
