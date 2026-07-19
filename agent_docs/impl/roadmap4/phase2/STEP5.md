# Step 5 — Pre-gridded heatmap facade

## 진행 상태

- [x] `createHeatmap` runtime/type/trace 구현
- [x] pre-gridded x/y cell과 quantitative/categorical color 회귀
- [x] missing combination omission과 scale/Canvas rematerialization
- [x] shortest facade primitive 작성·render
- [x] facade/primitive Browser/PNG exact parity
- [x] P2-D review package와 사용자 승인

## 작업

Phase 2 heatmap은 이미 row마다 x/y/color가 있는 pre-gridded data만 받는다. Text label은 자동 생성하지 않으며
필요하면 facade 뒤에 `createTextMark().encodeText()`를 체이닝한다. 2D binning은 Phase 5가 소유한다.

`color`는 각 cell fill의 유일한 semantic owner다. 따라서 facade의 `rect` option은 `opacity`, `stroke`,
`strokeWidth`만 받으며 constant `fill`은 거부한다. 구현과 누적 검증은 완료했고 2026-07-20 P2-D 승인을 받았다.
