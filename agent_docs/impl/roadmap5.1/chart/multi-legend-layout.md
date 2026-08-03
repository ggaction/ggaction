# Multi-Legend Layout Comparison

## 차트 설명

두 visual variant가 current bug와 target behavior를 각각 before/after로 비교한다.

1. Actual Cars regression chart의 categorical `Origin`과 quantitative-size `Acceleration` block
2. Synthetic point chart의 categorical color, quantitative size와 field opacity 세 block

## 최종 사용자 API

새 action이나 option을 추가하지 않는다. Existing calls가 동일한 semantic state를 만들되 concrete legend
placement만 corrected lane layout으로 바뀐다.

```javascript
chart()
  .createCanvas({ width: 680, height: 460, margin: { top: 40, right: 240, bottom: 60, left: 60 } })
  .createData({ id: "rows", values })
  .createPointMark({ id: "points" })
  .encodeX({ field: "x" })
  .encodeY({ field: "y" })
  .encodeColor({ field: "group", fieldType: "nominal" })
  .encodeSize({ field: "amount" })
  .encodeOpacity({ field: "alpha" })
  .createLegend({ target: "points", channels: ["color"] })
  .createLegend({ target: "points", channels: ["size"], count: 3 })
  .createLegend({ target: "points", channels: ["opacity"], count: 3 });
```

## 중요 action hierarchy

```text
createLegend / editLegend / removeLegend / editCanvas
└─ rematerializeLegendLane
   ├─ resolve intrinsic block geometry
   ├─ order and place same-edge blocks
   └─ rematerialize each concrete legend family
```

Exact internal action naming은 implementation Phase에서 current trace vocabulary와 함께 확정한다. Phase 0은
ownership과 observable output만 승인하며 runtime action을 추가하지 않는다.

## Stored-result contract

- Existing semantic guide branches와 per-kind `guideConfigs.legend` meaning은 유지한다.
- Lane order는 owning layer declaration order와 stable family order에서 파생하며 별도 public semantic state를 만들지 않는다.
- Right-side multi-block titles share one content-start anchor.
- Block occupied bounds는 24 logical pixels 이상 떨어지고 겹치지 않는다.
- Earlier program과 caller-owned options/rows는 변하지 않는다.
- Canvas/SVG/PNG/PDF는 같은 final concrete coordinates와 drawing order를 소비한다.
