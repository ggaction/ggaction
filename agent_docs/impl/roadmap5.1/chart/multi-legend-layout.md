# Multi-Legend Layout Comparison

## 차트 설명

두 visual variant가 current bug와 target behavior를 각각 before/after로 비교한다.

1. Actual Cars regression chart의 categorical `Origin`과 quantitative-size `Acceleration` block
2. 392-row Cars scatterplot의 categorical color, quantitative size와 field opacity 세 block

## 최종 사용자 API

새 action이나 option을 추가하지 않는다. Existing calls가 동일한 semantic state를 만들되 concrete legend
placement만 corrected lane layout으로 바뀐다.

```javascript
chart()
  .createCanvas({ width: 760, height: 480, margin: { top: 40, right: 240, bottom: 60, left: 70 } })
  .createData({ id: "cars", values: rows })
  .createPointMark({ id: "points" })
  .encodeX({ field: "Displacement" })
  .encodeY({ field: "Miles_per_Gallon" })
  .encodeColor({ field: "Origin", fieldType: "nominal" })
  .encodeSize({ field: "Horsepower" })
  .encodeOpacity({ field: "Acceleration" })
  .createGuides({
    axes: {
      x: { title: { text: "Displacement" } },
      y: { title: { text: "Miles per Gallon" } }
    },
    legend: false
  })
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
- All symbol kinds share one center column and all labels share one start column 28 logical pixels after it.
- Right/left block occupied bounds와 colliding top/bottom rows는 24 logical pixels 이상 떨어지고 겹치지 않는다.
- Top/bottom multi-legend는 plot left부터 stable order로 24 pixels 간격을 두고 이어지며, 남은 plot width가
  부족할 때만 다음 outward row로 넘어간다.
- 같은 row의 title baseline과 graphical-element start는 일치하며 둘 사이 간격은 12 logical pixels다.
- Top/bottom gradient와 opacity label은 graphical element 아래에 놓인다.
- Earlier program과 caller-owned options/rows는 변하지 않는다.
- Canvas/SVG/PNG/PDF는 같은 final concrete coordinates와 drawing order를 소비한다.
