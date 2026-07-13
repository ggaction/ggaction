# Phase 5 — Step 5: Point Appearance Encodings

## 목표

Point mark에 field-driven size/shape와 constant opacity를 적용하고 action call order와
무관하게 하나의 point materializer가 모든 encoding을 결합하도록 한다.

## 진행 상태

- [x] Unified `rematerializePointMark`
- [x] Quantitative `encodeSize`와 size scale
- [x] Nominal `encodeShape`와 shape scale
- [x] Constant graphical `encodeOpacity`
- [x] Circle/square equal-area materialization
- [x] Shared field domain과 automatic range resolution
- [x] Canvas/scale edit consumer rematerialization
- [x] Shortest valid call, order independence, trace tests
- [x] Mark/encoding/reference documentation
- [x] Primitive/action equivalence, commit, push

## 의미 경계

- Field-driven size와 shape는 `semanticSpec`에 저장한다.
- Constant opacity는 `graphicSpec`에만 저장한다.
- Resolved radius/width/height/type/opacity는 concrete graphical values다.
