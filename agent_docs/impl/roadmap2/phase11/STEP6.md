# Roadmap 2 — Phase 11 Step 6: Composite Ownership and Rematerialization

## 목표

Error bar, error band, box plot와 regression component가 stable named ownership을 유지하고 every rematerialization이
tree placement를 보존하게 한다.

## 진행 상태

- [ ] Composite component ownership matrix without a new composite registry
- [ ] Error-bar main rule and cap attachment/order
- [ ] Error-band fill and optional boundary attachment/order
- [ ] Box, whisker, median and outlier attachment/order
- [ ] Regression band/line interleaving with the source point layer
- [ ] Highlight selected-last ordering inside the owning mark
- [ ] Canvas/scale/data/edit rematerialization attachment stability
- [ ] Subtree removal and stale-descendant cleanup
- [ ] Trace and immutability coverage
- [ ] STEP status, conceptual commit and push

## 완료 조건

Composite parts remain ordinary named graphics with explicit owners, and every edit preserves or deliberately removes
their subtree without stale nodes.
