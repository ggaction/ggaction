# Roadmap 2 — Phase 8 Step 3: Box Data and Ranged-Bar Foundations

## 목표

Approved vertical target에 필요한 immutable summary/outlier data, vertical ranged bar와 median span capability를
reusable boundaries로 구현한다.

## 진행 상태

- [x] Pure box summary/outlier grammar and deterministic output order
- [x] Internal wrapped summary/outlier derived-data actions and provenance
- [x] Bar-compatible `encodeY2` and atomic `encodeYRange`
- [x] Ranged-bar completeness policy and vertical rect materialization
- [x] Ranged `encodeBarWidth` support
- [x] Band-width-aware median rule materialization
- [x] Scale/Canvas/data rematerialization plans
- [x] Numeric, validation, ownership and immutability coverage
- [x] STEP status, conceptual commits and pushes

## 완료 조건

각 capability가 chart-specific compiler 없이 independent tests를 통과하고 incomplete intermediate state는 empty
graphics를 유지한다.
