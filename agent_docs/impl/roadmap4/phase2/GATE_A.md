# P2-A — Basic Chart facade contract

## 진행 상태

- [x] 다섯 facade 이름과 최소 required meaning
- [x] field shorthand와 existing option-object 경계
- [x] data/id/coordinate inference와 ambiguity error
- [x] guide default/disable semantics
- [x] exact wrapped child hierarchy
- [x] non-goals와 Gate 분할
- [x] 사용자 승인

Gate 상태: `approved` (2026-07-20)

## 승인 대상 API

```javascript
program.createScatterPlot({
  id?, data?, coordinate?, x, y, color?, size?, shape?, point?, guides?
});

program.createLinePlot({
  id?, data?, coordinate?, x, y, color?, groupBy?, strokeDash?, line?, guides?
});

program.createBarPlot({
  id?, data?, coordinate?, x, y, color?, width?, bar?, guides?
});

program.createHistogram({
  id?, data?, coordinate?, field,
  maxBins?, binStep?, binBoundaries?, stack?, xScale?, yScale?,
  color?, bar?, guides?
});

program.createHeatmap({
  id?, data?, coordinate?, x, y, color, rect?, guides?
});
```

`x`, `y`, `color`, `size`, `shape`는 가능한 곳에서 field string 또는 corresponding existing encoding
option object다. Mark appearance는 `point`, `line`, `bar`, `rect` 아래에 두어 field encoding과 충돌하지 않는다.
`strokeDash`는 named dash와 field 이름이 모두 string일 수 있으므로 existing `encodeStrokeDash` object만 받는다.

P2-D 구현 전 검토에서 required color와 constant `rect.fill`이 항상 충돌함을 확인했다. 사용자 승인에 따라
`rect`는 `opacity`, `stroke`, `strokeWidth`만 받도록 보정했고 color를 유일한 cell fill owner로 유지한다.

## 최소 호출

```javascript
program.createScatterPlot({ x: "Horsepower", y: "Miles_per_Gallon" });
program.createLinePlot({ x: "Year", y: "Acceleration" });
program.createBarPlot({
  x: { field: "year", fieldType: "ordinal" },
  y: { field: "perc", aggregate: "mean" }
});
program.createHistogram({ field: "Displacement" });
program.createHeatmap({
  x: { field: "year", fieldType: "ordinal" },
  y: { field: "country", fieldType: "nominal" },
  color: { field: "life_expect", fieldType: "quantitative" }
});
```

Canvas와 data는 선행 program에 존재해야 한다. Facade는 title을 만들지 않으며 omitted guides는 applicable
guide를 만든다.

## 승인 대상 hierarchy

```text
createScatterPlot
├─ createPointMark
├─ encodeX
├─ encodeY
├─ encodeColor? / encodeSize? / encodeShape?
└─ createGuides?

createLinePlot
├─ createLineMark
├─ encodeX
├─ encodeY
├─ encodeColor? / encodeGroup? / encodeStrokeDash?
└─ createGuides?

createBarPlot
├─ createBarMark
├─ encodeX
├─ encodeY
├─ encodeColor?
├─ encodeBarWidth?
└─ createGuides?

createHistogram
├─ createBarMark
├─ encodeHistogram
├─ encodeColor?
└─ createGuides?

createHeatmap
├─ createRectMark
├─ encodeX
├─ encodeY
├─ encodeColor
└─ createGuides?
```

## 승인 후

승인된 action을 Planned inventory로 승격하고 shared infrastructure를 구현한다. P2-B 전에는
bar/histogram과 heatmap public facade를 구현하지 않는다.
