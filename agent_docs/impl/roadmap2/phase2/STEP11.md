# Roadmap 2 — Phase 2 Step 11: Top and Bottom Composite Legends

## 목표

Gate D의 primitive를 generic categorical legend layout과 symbol recipes로 재현한다.

## 진행 상태

- [x] Composite symbol layer bounds calculation
- [x] Top/bottom item-grid placement
- [x] `direction`, `columns`, `align`, `titlePosition`
- [x] Labels/title style, item gap와 border
- [x] Line+point와 color+shape compatibility
- [x] Domain/order와 declared symbol-layer order preservation
- [x] Canvas/scale/shape/size rematerialization
- [x] Margin/overlap validation과 atomic failure
- [x] Top/bottom approved primitive/public pairs
- [x] Types/docs/current contract/catalog, commits와 push

## 구현 결과

- Top과 explicit-grid bottom은 하나의 deterministic row/column 계산을 공유한다.
- Composite line/point는 item-local anchor와 선언된 layer order를 유지한다.
- `createLegend({ position: "bottom" })`만 사용한 기존 차트는 compact single-row layout을 유지한다.
  Grid 관련 옵션을 하나라도 명시하면 reserved-margin grid를 사용한다.
- Approved top/bottom public programs는 primitive의 semantic state, concrete graphics, order와 Canvas calls에
  정확히 일치한다.
- Right-side default와 기존 histogram의 compact bottom 결과는 바뀌지 않는다.

## 완료 조건

두 approved pair와 exhaustive layout/rematerialization coverage가 통과하며 right-side default는 바뀌지 않는다.
