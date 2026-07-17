# Gapminder Radial Bars

## 목적

Gapminder 2005의 여섯 cluster에서 두 국가씩 골라 life expectancy를 radial bar로 비교한다. Ordinal theta
band, quantitative radius, inner baseline, categorical cluster color와 outer labels를 검증한다.

## 최종 user-facing API

```javascript
chart()
  .createCanvas({
    width: 780,
    height: 640,
    margin: { top: 75, right: 190, bottom: 75, left: 75 }
  })
  .createData({ values: countryRows })
  .createArcMark({ innerRadius: 0.18, padAngle: 2, opacity: 0.94 })
  .encodeTheta({
    field: "country",
    fieldType: "nominal",
    scale: { domain: countryOrder }
  })
  .encodeR({
    field: "life_expect",
    scale: { domain: [45, 85], zero: false }
  })
  .encodeColor({ field: "cluster", fieldType: "nominal", palette: "tableau10" })
  .createGuides({
    axes: {
      theta: { title: { text: "Country" } },
      radius: {
        ticksAndLabels: { values: [50, 60, 70, 80] },
        title: { text: "Life expectancy", position: "inside" }
      }
    },
    grid: { theta: false, radial: { values: [50, 60, 70, 80] } },
    legend: { position: "right", title: "Cluster" }
  });
```

## Contract

- Country order는 Afghanistan, India, France, Germany, South Africa, Nigeria, Argentina, Canada,
  China, Japan, Egypt, Israel이다.
- 이 순서는 cluster 0~5에서 두 국가씩 연속으로 배치한다.
- 각 source row는 aggregate 없이 final sector 하나가 된다.
- Theta band는 country마다 동일하고 `padAngle`만 concrete sweep을 줄인다.
- Inner baseline은 `0.18 × availableRadius`, outer radius는 life expectancy `[45, 85]`를 그 baseline부터
  available outer edge까지 linear mapping한다.
- Cluster domain은 numeric first appearance 0, 1, 2, 3, 4, 5다.
