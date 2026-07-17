# Roadmap 3 Phase 2 — Polar Point Foundation

## 진행 상태

- [x] STEP 1 — Phase 계약, inventory와 chart target 확정
- [ ] STEP 2 — Deterministic Polar reference geometry
- [ ] STEP 3 — Primitive visual baselines
- [ ] STEP 4 — Gate C visual evidence와 사용자 승인
- [ ] STEP 5 — Pure Polar grammar
- [ ] STEP 6 — Polar semantic, scale와 coordinate policy
- [ ] STEP 7 — Point materialization과 rematerialization
- [ ] STEP 8 — `encodeTheta`, `encodeR`, `encodePointRadius`
- [ ] STEP 9 — Interaction, revision과 compatibility matrix
- [ ] STEP 10 — Types, docs, package와 Phase closeout

## 목표

Phase 2는 point mark를 Polar coordinate에 배치하는 첫 complete vertical slice를 만든다. Semantic position은
`theta`와 `radius`가 소유하고 concrete point graphic은 최종 Cartesian `x`/`y`만 저장한다. Renderer는 Polar
semantics를 해석하지 않는다.

Canonical Gate C chart는 [Cars Polar scatterplot](../chart/cars-polar-scatterplot.md)이며,
[Fashion t-SNE Polar points](../chart/fashion-tsne-polar-points.md)는 dense points, negative domain과 categorical
color coverage를 제공한다.

## Gate C

STEP 4에서 exact target call chain, primitive source, deterministic geometry assertions와 두 PNG를 함께
제시한다. 사용자 승인 전에는 Phase 2 public actions 또는 Polar runtime materialization을 구현하지 않는다.
