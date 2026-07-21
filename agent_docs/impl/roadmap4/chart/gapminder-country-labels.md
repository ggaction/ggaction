# Gapminder 2005 Country Labels

## 차트 목적

2005년 18개 국가의 fertility와 life expectancy를 비교한다. 가까운 point가 많은 실제 분포에서 국가명이
서로 가리지 않도록 이동하고, 이동한 label은 optional leader로 원래 point와 연결한다. `United Kingdom`,
`United States`는 긴 문자열과 오른쪽 경계를 함께 검증한다.

## Candidate user-facing API

```javascript
chart()
  .createCanvas({
    width: 760,
    height: 520,
    margin: { top: 88, right: 38, bottom: 72, left: 76 }
  })
  .createData({ id: "countries2005", values: rows })
  .createPointMark({
    id: "countries",
    data: "countries2005",
    fill: "#2563eb",
    stroke: "#ffffff",
    strokeWidth: 0.8
  })
  .encodeX({
    target: "countries",
    field: "fertility",
    fieldType: "quantitative",
    scale: { domain: [1.2, 2.15], zero: false }
  })
  .encodeY({
    target: "countries",
    field: "life_expect",
    fieldType: "quantitative",
    scale: { domain: [77.2, 83], zero: false }
  })
  .createTextMark({
    id: "countryLabels",
    fontSize: 11,
    align: "left",
    baseline: "middle",
    dx: 7
  })
  .encodeText({ target: "countryLabels", field: "country" })
  .layoutLabels({
    target: "countryLabels",
    axis: "both",
    padding: 3,
    maxDisplacement: 64,
    bounds: "plot",
    leader: { stroke: "#94a3b8", strokeWidth: 0.8, opacity: 0.9 }
  })
  .createGuides({
    axes: {
      x: { title: { text: "Fertility" } },
      y: { title: { text: "Life expectancy" } }
    },
    grid: { horizontal: true, vertical: true },
    legend: false
  })
  .createTitle({
    text: "Fertility and Life Expectancy",
    subtitle: "Selected countries in 2005"
  });
```

## Stored-result contract

- Point and text semantic positions remain unchanged.
- The text layer's explicit stored `source` is the only source-mark relation used for leader origins.
- Layout policy and latest warning summary are graphical materialization config, not semantic encoding.
- Final text items and optional ordinary line collection are complete backend-neutral graphics.
- Renderer reads only `graphicSpec`; Browser Canvas and Node PNG share the same topology.

## Visual acceptance

- Every country remains readable and labels overlap substantially less than their semantic base positions.
- Every displacement is within 64 logical pixels and final ordinary labels remain inside plot bounds.
- Unmoved labels do not receive leaders. Displaced leaders start at their own point and end at the final label boundary.
- Grid, leaders, points, labels and axes draw in that order.

## Non-goals

- Labels for all Gapminder countries at once
- Interactive hover, dragging or zoom-responsive layout
- Axis/legend/title collision avoidance
