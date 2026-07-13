# Phase 5 — Step 3: Primitive Regression Scatterplot

## 목표

기존 stable actions와 low-level primitives로 완전한 목표 chart를 작성해 이후 public
actions의 graphical acceptance baseline으로 사용한다.

## 진행 상태

- [ ] Regression scatterplot values fixture의 concrete layout 확장
- [ ] Primitive semantic transform/layer/encoding contract
- [ ] Heterogeneous point children
- [ ] Origin별 closed confidence-band path
- [ ] Origin별 regression-line path
- [ ] Raw grid, axes, Origin/size legends
- [ ] Explicit graphical order
- [ ] Acceptance, immutability, graphicSpec-only rendering
- [ ] 2× PNG 직접 확인
- [ ] 전체 regression, commit, push

## Program 원칙

`createCanvas`, `createData`는 재사용한다. 아직 없는 behavior만 `editSemantic`,
`createGraphics`, `editGraphics`의 명시적인 단일 chain으로 작성한다. Primitive-specific
batching helper를 두지 않는다.
