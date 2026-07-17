# STEP 3 — Primitive Polar Guide Baseline

## 진행 상태

- [ ] Existing Polar point foundation
- [ ] Theta spokes and radial circle paths before points
- [ ] Outer theta axis and right-facing radial axis
- [ ] Concrete ticks, labels and inferred titles
- [ ] Browser and high-DPI PNG rendering

Primitive program은 완료된 Polar point action을 재사용할 수 있다. 그러나 모든 Phase 3 guide는
`createGraphics`와 `editGraphics`만으로 작성하며 미래 Polar guide action을 호출하지 않는다.
