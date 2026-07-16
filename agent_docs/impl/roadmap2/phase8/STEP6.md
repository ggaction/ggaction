# Roadmap 2 — Phase 8 Step 6: Horizontal Range and Minmax Actions

## 목표

Approved Gate B를 horizontal ranged bar와 minmax `createBoxPlot` flow로 재현한다.

## 진행 상태

- [x] Bar-compatible `encodeX2` and atomic `encodeXRange`
- [x] Horizontal ranged-bar rectangle materialization
- [x] Orientation inference and compatible scale propagation
- [x] Minmax summary provenance and outlier omission
- [x] Horizontal median span and explicit error-bar composition
- [x] Gate B primitive/public exact equality
- [x] Range/width/scale/Canvas rematerialization
- [x] Invalid orientation, empty data and immutability coverage
- [x] STEP status, conceptual commits and pushes

## 완료 조건

Horizontal box body는 ordinary bar + x/x2로 저장되고 minmax는 placeholder outlier state 없이 Gate B와 exact match한다.
