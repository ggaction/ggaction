# Roadmap 2 — Phase 7 Step 5: Horizontal Range Actions

## 목표

Approved Cars target를 `encodeXRange`와 horizontal `createErrorBand`로 재현한다.

## 진행 상태

- [x] Area-compatible `encodeX2` support
- [x] Atomic `encodeXRange → encodeX + encodeX2` hierarchy
- [x] Horizontal area path construction and validation
- [x] Horizontal statistical/explicit orientation inference
- [x] Shared coordinate/scale/group propagation
- [x] Cars primitive/public exact equality
- [x] X-range reassignment and Canvas/scale rematerialization
- [x] Ambiguity, invalid pair, sparse/empty group and immutability tests
- [x] Approved linear boundary stroke/width composition
- [x] STEP status, conceptual commit and push

## 완료 조건

Horizontal range는 별도 mark 없이 ordinary area + x/x2로 저장되고 Gate B primitive와 exact match한다.
