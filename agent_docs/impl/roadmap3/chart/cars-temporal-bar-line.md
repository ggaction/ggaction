# Cars Temporal Bar and Line

## 목적

Cars의 연도별 평균 Acceleration을 bar와 line으로 겹쳐, 서로 다른 mark layout policy가 하나의 temporal x
scale과 quantitative y scale을 안전하게 공유하는지를 검증한다. 이는 별도 scale을 만들어 시각적으로 비슷하게
보이는 우회 예제가 아니라 shared semantic identity와 exact pixel alignment의 계약이다.

## Target user-facing API

```javascript
chart()
  .createCanvas({
    width: 720,
    height: 440,
    margin: { top: 64, right: 50, bottom: 64, left: 72 }
  })
  .createData({ values: rows })
  .createBarMark({ id: "bars", fill: "#bfdbfe" })
  .encodeX({ field: "Year", fieldType: "temporal" })
  .encodeY({ field: "Acceleration", aggregate: "mean" })
  .createLineMark({ id: "trend", stroke: "#1d4ed8", strokeWidth: 3 })
  .encodeY({
    target: "trend",
    field: "Acceleration",
    aggregate: "mean",
    scale: { id: "y" }
  })
  .createGuides({
    axes: {
      x: { title: { text: "Year" } },
      y: { title: { text: "Mean acceleration" } }
    },
    legend: false
  })
  .createTitle({
    text: "Average Acceleration by Model Year",
    subtitle: "Shared temporal scale for bars and trend"
  });
```

`createLineMark`는 current compatible layer에서 data, coordinate와 x encoding을 추론한다. 사용자는 trend의
aggregate y만 결정한다. Line을 위한 별도 `xLine` scale은 만들지 않는다.

## Stored semantic contract

- `bars.encoding.x.scale === "x"`
- `trend.encoding.x.scale === "x"`
- `bars.encoding.y.scale === "y"`
- `trend.encoding.y.scale === "y"`
- 두 y encoding은 `Acceleration`의 `mean` aggregate다.
- x scale은 `time`, y scale은 `linear`이며 각 guide는 하나뿐이다.
- Bar bandwidth는 `semanticSpec.scales`의 별도 scale이나 encoding이 아니라 bar materialization policy다.

## Concrete graphical contract

- 한 model year의 bar center와 line vertex x는 정확히 같다.
- Bar top과 line vertex y는 정확히 같다.
- Missing 1981 row를 합성하지 않으며 1980–1982 line segment는 실제 temporal 간격을 보존한다.
- Grid → bars → line → axes → title 순서가 concrete graphic hierarchy에 명시된다.
- Renderer는 aggregate, timestamp 또는 bandwidth를 다시 계산하지 않는다.

## Gate와 lifecycle

Gate K-A는 primitive image와 alignment contract를 승인한다. 승인 뒤 runtime, exact TypeScript, Current scale
contract, public docs와 primitive/public equivalence를 구현한다.
