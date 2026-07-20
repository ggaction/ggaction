# Step 4 — `createGradientPlot`, `editGradientPlot`과 P6-B

## 진행 상태

- [x] stable owner와 deterministic generated IDs
- [x] create facade wrapped hierarchy와 optional guides/center
- [x] edit statistical revision과 appearance-only retention
- [x] palette/opacity intent에서 concrete `FillPaint`를 만드는 wrapped materializer
- [x] center disable/restore의 complete optional-resource lifecycle
- [x] strict runtime/type/package/action inventory parity
- [x] primitive/public semantic/graphic/order/Canvas-call exact parity
- [x] Browser Canvas와 high-resolution PNG
- [x] source/code/image를 포함한 P6-B package
- [ ] P6-B 사용자 승인

Facade는 profile 계산, position encoding, fill materialization 또는 guide validation을 복제하지 않고 각 wrapped
owner를 호출한다.

## 목표 wrapped hierarchy

```text
createGradientPlot
├─ createGradientProfileData
│  ├─ createDerivedData
│  └─ materializeGradientProfileData
├─ createRectMark
├─ encode categorical position
├─ encode quantitative lower/upper range
├─ materializeGradientPlotFill
├─ createRuleMark + position encodings (center enabled)
└─ createGuides (unless disabled)
```

```text
editGradientPlot
├─ createGradientProfileData(new revision; statistical edit only)
├─ rebindLayerData + releaseDerivedData(orphan only)
├─ reconcile optional center resource
└─ rematerialize body, paint, center, scales and guides
```

## P6-B review package

- Shortest, fully explicit, encoded-target inference와 deferred-encoding public call chains
- Create/edit state ownership, wrapped trace와 generated resource lifecycle
- Primitive/public semantic/graphic/order/Canvas-call exact parity
- Density revision, appearance-only revision retention와 center false→restore regression
- Browser Canvas/Node PNG source와 approved target image
- 승인 후에만 Step 5–6 consumer/closeout 범위를 시작한다.
