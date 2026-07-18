# STEP 4 — Horizontal Grouped Bar Public Vertical Slice

## 진행 상태

- [x] Horizontal grouped bar materialization
- [x] `encodeColor({ layout: "group" })` orientation dispatch
- [x] Primitive/public semantic and pixel equivalence
- [x] Canvas, scale, data and guide rematerialization
- [x] Example, browser, PNG, TypeScript and public docs

Horizontal grouped bars는 x quantitative measure와 y discrete category를 사용한다. Color group field는 yOffset
field와 domain을 공유한다. Aggregate는 final `y × color` grain에서 계산하고 bar width는 resolved yOffset
bandwidth에 적용한다.
