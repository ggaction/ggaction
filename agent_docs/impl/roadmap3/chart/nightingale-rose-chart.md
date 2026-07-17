# Nightingale Rose Chart

## 목적

April부터 March까지 월별 사망 원인 세 범주의 값을 equal-angle Polar sector로 비교한다. Ordinal theta band,
quantitative radial extent, overlaid color series와 deterministic drawing order를 검증한다.

Reference data는 [Nightingale's Rose Chart with D3-EZ](https://observablehq.com/@jamesleesaunders/nightingales-rose-chart-with-d3-ez)의
공개 notebook 값과 category/color order를 사용한다. Repository fixture는 ordinary scalar field encoding을 위해
동일 값을 36개의 `{ month, cause, value }` long-form row로 저장한다.

## 최종 user-facing API

```javascript
chart()
  .createCanvas({
    width: 780,
    height: 640,
    margin: { top: 80, right: 210, bottom: 80, left: 80 }
  })
  .createData({ values: nightingale })
  .createArcMark({ padAngle: 1, opacity: 0.9 })
  .encodeTheta({
    field: "month",
    fieldType: "ordinal",
    scale: { domain: monthOrder }
  })
  .encodeR({ field: "value", scale: { domain: [0, 6.5], zero: true } })
  .encodeColor({
    field: "cause",
    layout: "overlay",
    scale: {
      domain: causeOrder,
      range: ["#599ad3", "#727272", "#f1595f"]
    }
  })
  .createGuides({
    axes: {
      theta: { title: false },
      radius: { ticksAndLabels: { values: [0, 2, 4, 6] }, title: false }
    },
    grid: { theta: false, radial: { values: [2, 4, 6] } },
    legend: { position: "right", title: "Cause" }
  });
```

## Contract

- Month domain은 April, May, June, July, August, September, October, November, December, January,
  February, March다.
- Cause domain과 color는 Zymotic Diseases `#599ad3`, Other Causes `#727272`, Wounds & Injuries
  `#f1595f` 순서다.
- 12개 month band는 30도씩 동일하며 April band의 center가 0도다.
- Cause sector는 stack하지 않고 모두 radius 0에서 시작한다.
- Zero-valued sector는 fabricated path를 만들지 않고 concrete item에서 생략한다.
- 같은 month 안에서 outer radius descending으로 그린다. Equal radius는 cause domain order를 stable tie-break로 쓴다.
- Radius는 `[0, 6.5]`의 linear mapping이다. Area-aware square-root mapping은 별도 variant로 남긴다.
