# Step 3 — Scatter와 line facade

## 진행 상태

- [x] `createScatterPlot` runtime/type/trace 구현
- [x] Cars shortest/optional encoding/guide opt-out 회귀
- [x] `createLinePlot` runtime/type/trace 구현
- [x] Cars direct/aggregate/group/color/dash 회귀
- [x] existing primitive와 Browser/PNG exact parity
- [x] P2-B review package
- [x] P2-B 사용자 승인

## 작업

두 facade는 point/line mark를 만든 뒤 existing encodings와 guides를 고정 순서로 호출한다. Action-order
independence, default point radius와 grouped line grain을 그대로 재사용하며 facade 내부 materializer는 만들지 않는다.
