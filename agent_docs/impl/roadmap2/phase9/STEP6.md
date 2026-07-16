# Roadmap 2 — Phase 9 Step 6: Longest Histogram Bar Primitive

## 목표

Final histogram count grain에서 maximum y bar 하나를 raw primitives로 강조하고 Gate B에서 승인받는다.

## 진행 상태

- [ ] Independent bin/count rows and unique longest-bar key
- [ ] Proof that selection uses semantic count, not concrete pixel height
- [ ] Approved fill/stroke/opacity and selected-last order
- [ ] Remaining bars, grids, axes and title unchanged
- [ ] Primitive program, reference values, manifest and future call chain
- [ ] Browser and `primitive.png` checks
- [ ] Gate B user confirmation
- [ ] STEP status, conceptual commit and push

## Gate B

Confirm one longest rect is emphasized without changing bin boundaries, counts, scales or neighboring bars.

## 완료 조건

The target bar remains identical under a Canvas-only resize while its concrete geometry rematerializes.
