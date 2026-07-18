# Gapminder Life Expectancy Heatmap

## 차트 목표

Selected Gapminder countries와 years의 `life_expect`를 discrete x/y rect cell과 continuous color로 표시한다.
Dense cell geometry, missing combinations, gradient legend와 optional text overlay를 검증한다.

## 최종 user-facing API

```javascript
chart()
  .createCanvas({
    width: 760,
    height: 440,
    margin: { top: 70, right: 120, bottom: 75, left: 110 }
  })
  .createData({ values: rows })
  .createRectMark()
  .encodeX({ field: "year", fieldType: "ordinal" })
  .encodeY({ field: "country", fieldType: "nominal" })
  .encodeColor({
    field: "life_expect",
    fieldType: "quantitative",
    scale: { type: "sequential", palette: "viridis" }
  })
  .createTextMark({
    fontSize: 10,
    fontWeight: 600,
    align: "center",
    baseline: "middle"
  })
  .encodeText({ field: "life_expect", format: ".0f" })
  .createGuides({
    axes: {
      x: { title: { text: "Year" } },
      y: { title: { text: "Country" } }
    },
    legend: { title: "Life expectancy" }
  })
  .createTitle({ text: "Life Expectancy over Time", align: "center" });
```

## Stored-result contract

- Rect layer는 data, Cartesian coordinate, x/y discrete encodings와 quantitative color encoding을 저장한다.
- 각 complete source row는 one final cell item이다. Missing x/y/color rows는 placeholder 없이 생략한다.
- Concrete rect는 resolved band bounds와 final fill을 저장한다.
- Labels는 별도 text layer이며 rect center에 붙고 rect graphic children에 숨기지 않는다. Omitted text fill은
  realized six-digit hex cell fill의 luminance를 기준으로 light/dark text를 결정한다.
- Selection/highlight는 row가 아니라 materialized rect cell identity를 사용한다.

Gate J-C는 cell spacing, color mapping, gradient legend와 optional text overlay를 승인한다.
