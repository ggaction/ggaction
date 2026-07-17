# STEP 1 — Phase Contract, Inventory and Chart Target

## 진행 상태

- [x] Phase 3 action/capability assignment 확인
- [x] Aggregate action hierarchy 확정
- [x] Semantic/config/graphic ownership 초안 확정
- [x] Canonical Cars Gate target 확정
- [x] Gate 전 public/runtime boundary 명시

Phase 3는 Polar axes, grids, their focused edits와 aggregate dispatch만 소유한다. Polar line, radar, arc와
composition은 이후 Phase 범위다.

`createAxes`의 Polar option keys는 `theta`와 `radius`, `createGrid`의 Polar geometry keys는 `theta`와
`radial`이다. Axis keys는 semantic channel을, grid keys는 concrete guide geometry를 나타낸다.
