# Phase 5 — Step 8: createRegression

## 목표

Target point layer에서 x/y/groupBy와 resource를 infer해 regression data, band, line을
한 번에 완성하는 atomic `createRegression` action을 구현한다.

## 진행 상태

- [ ] Target/x/y/groupBy inference
- [ ] Explicit option precedence와 ambiguity errors
- [ ] Shared dataset/coordinate/scale resolution
- [ ] `createRegressionBand`
- [ ] `createRegressionLine`
- [ ] Thin aggregate `createRegression`
- [ ] Explicit points → bands → lines graphical order
- [ ] Canvas/scale rematerialization integration
- [ ] Shortest valid call과 full trace tests
- [ ] Public regression API documentation, commit, push

## Action hierarchy

```text
createRegression
├─ createRegressionData
├─ createRegressionBand
│  ├─ createAreaMark
│  ├─ encodeX
│  ├─ encodeYRange
│  ├─ encodeGroup
│  └─ rematerializeAreaMark
└─ createRegressionLine
   ├─ createLineMark
   ├─ encodeX
   ├─ encodeY
   ├─ encodeColor
   ├─ encodeGroup
   └─ rematerializeLineMark
```
