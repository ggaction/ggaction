# Roadmap 2 — Phase 7 Step 5: Horizontal Range Actions

## 목표

Approved Gapminder target를 `encodeXRange`와 horizontal `createErrorBand`로 재현한다.

## 진행 상태

- [ ] Area-compatible `encodeX2` support
- [ ] Atomic `encodeXRange → encodeX + encodeX2` hierarchy
- [ ] Horizontal area path construction and validation
- [ ] Horizontal statistical/explicit orientation inference
- [ ] Shared coordinate/scale/group propagation
- [ ] Gapminder primitive/public exact equality
- [ ] X-range reassignment, Canvas/scale/data rematerialization
- [ ] Ambiguity, invalid pair, sparse/empty group and immutability tests
- [ ] STEP status, conceptual commit and push

## 완료 조건

Horizontal range는 별도 mark 없이 ordinary area + x/x2로 저장되고 Gate B primitive와 exact match한다.

